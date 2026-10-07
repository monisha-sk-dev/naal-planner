"use client";

import { useEffect, useRef, useState } from "react";
import { buildTimeline, fmtDur, fmtTime, parseNotes, toggleNoteCheck, type Task } from "@naal/shared";

const pillHeight = (dur: number) => Math.max(56, Math.min(170, dur * 1.1));

export default function Timeline({
  tasks,
  date,
  nowMin,
  onOpen,
  onToggle,
  onAddAt,
  onNotes,
  onMove,
}: {
  tasks: Task[];
  date: string;
  nowMin: number | null;
  onOpen: (t: Task) => void;
  onToggle: (t: Task) => void;
  onAddAt: (start: number) => void;
  onNotes: (t: Task, notes: string) => void;
  onMove: (t: Task, start: number, before?: Task) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const items = buildTimeline(tasks, date, nowMin);
  const dragged = tasks.find((t) => t.id === dragId) ?? null;

  // auto-scroll the page (or its scroll container) when dragging near the top/bottom edge
  useEffect(() => {
    if (!dragId) return;
    let y = -1;
    let raf = 0;
    const scroller = (): HTMLElement | null => {
      for (let el = listRef.current?.parentElement ?? null; el; el = el.parentElement) {
        const o = getComputedStyle(el).overflowY;
        if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight) return el;
      }
      return null;
    };
    const onOver = (e: DragEvent) => { y = e.clientY; };
    const tick = () => {
      const el = scroller();
      const top = el ? el.getBoundingClientRect().top : 0;
      const bottom = el ? el.getBoundingClientRect().bottom : window.innerHeight;
      const zone = 90;
      let dy = 0;
      if (y >= 0 && y < top + zone) dy = -Math.ceil(((top + zone - y) / zone) * 18);
      else if (y > bottom - zone) dy = Math.ceil(((y - (bottom - zone)) / zone) * 18);
      if (dy) (el ?? window).scrollBy(0, dy);
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("dragover", onOver);
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener("dragover", onOver); cancelAnimationFrame(raf); };
  }, [dragId]);

  const dropProps = (key: string, onDrop: (t: Task, frac: number) => void) => ({
    onDragOver: (e: React.DragEvent) => { if (dragged) { e.preventDefault(); setOverKey(key); } },
    onDragLeave: () => setOverKey((k) => (k === key ? null : k)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragged) {
        const r = e.currentTarget.getBoundingClientRect();
        onDrop(dragged, r.height ? Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) : 0);
      }
      setDragId(null);
      setOverKey(null);
    },
  });

  if (!items.some((i) => i.kind === "task")) {
    return (
      <div className="empty">
        <p>Nothing planned for this day.</p>
        <button className="btn primary" onClick={() => onAddAt(9 * 60)}>Plan your first task</button>
      </div>
    );
  }

  return (
    <ol className="timeline" ref={listRef}>
      {items.map((item, i) => {
        if (item.kind === "now") {
          return (
            <li key={`now-${i}`} className="row now-row" aria-label="Current time">
              <span className="time now-time">{fmtTime(item.min)}</span>
              <span className="rail"><span className="now-dot" /></span>
              <span className="now-line" />
            </li>
          );
        }

        if (item.kind === "gap") {
          return (
            <li
              key={`gap-${item.start}`}
              className={`row gap-row${overKey === `gap-${item.start}` ? " drop-over" : ""}`}
              {...dropProps(`gap-${item.start}`, (t, frac) => {
                // pick the exact time by where you drop inside the free slot (15-min steps)
                const room = Math.max(0, item.end - item.start - t.duration);
                onMove(t, item.start + Math.min(room, Math.round((frac * (item.end - item.start)) / 15) * 15));
              })}
            >
              <span className="time" />
              <span className="rail dashed" />
              <button className="gap" onClick={() => onAddAt(item.start)}>
                {item.now !== null && <span className="now-pip">Now · </span>}
                {fmtDur(item.end - item.start)} free — add a task
              </button>
            </li>
          );
        }

        const { task, start, end, done, progress } = item;
        const h = pillHeight(task.duration);
        return (
          <li
            key={task.id}
            className={`row task-row${done ? " done" : ""}${progress !== null ? " active" : ""}${dragId === task.id ? " dragging" : ""}${overKey === task.id && dragId !== task.id ? " drop-over" : ""}`}
            draggable
            onDragStart={(e) => { setDragId(task.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", task.id); }}
            onDragEnd={() => { setDragId(null); setOverKey(null); }}
            {...dropProps(task.id, (t, frac) => {
              if (t.id === task.id) return;
              // upper half: go before this task (it shifts later); lower half: go right after it
              if (frac < 0.5) onMove(t, start, task);
              else onMove(t, end);
            })}
          >
            <span className="time">
              {fmtTime(start)}
              <small>{fmtTime(end)}</small>
            </span>
            <span className="rail">
              <span
                className="pill"
                style={{ height: h, ["--c" as string]: task.color }}
                aria-hidden
              >
                {progress !== null && <span className="pill-fill" style={{ height: `${progress * 100}%` }} />}
                <span className="pill-emoji">{task.emoji}</span>
              </span>
            </span>
            <div
              className="task-body"
              role="button"
              tabIndex={0}
              onClick={() => onOpen(task)}
              onKeyDown={(e) => e.target === e.currentTarget && (e.key === "Enter" || e.key === " ") && onOpen(task)}
              style={{ minHeight: h }}
            >
              <span className="task-meta">
                {fmtTime(start)} – {fmtTime(end)} ({fmtDur(task.duration)})
                {task.repeat !== "none" && " · ↻"}
              </span>
              <span className="task-title">{task.title || "Untitled"}</span>
              {task.notes && (
                <span className="task-notes">
                  {parseNotes(task.notes).map((l, li) => (
                    <span key={li} className={`note-line${l.highlight ? " hl" : ""}${l.checked ? " checked" : ""}`}>
                      {l.kind === "check" && (
                        <button
                          type="button"
                          className={`note-box${l.checked ? " on" : ""}`}
                          role="checkbox"
                          aria-checked={l.checked}
                          aria-label={l.text}
                          onClick={(e) => { e.stopPropagation(); onNotes(task, toggleNoteCheck(task.notes, li)); }}
                        >
                          {l.checked ? "✓" : ""}
                        </button>
                      )}
                      {l.kind === "point" && <span className="note-bullet">•</span>}
                      <span className="note-text">{l.text}</span>
                    </span>
                  ))}
                </span>
              )}
            </div>
            <button
              className={`check${done ? " on" : ""}`}
              style={{ ["--c" as string]: task.color }}
              onClick={() => onToggle(task)}
              aria-label={done ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
              aria-pressed={done}
            >
              {done ? "✓" : ""}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

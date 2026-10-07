"use client";

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
}: {
  tasks: Task[];
  date: string;
  nowMin: number | null;
  onOpen: (t: Task) => void;
  onToggle: (t: Task) => void;
  onAddAt: (start: number) => void;
  onNotes: (t: Task, notes: string) => void;
}) {
  const items = buildTimeline(tasks, date, nowMin);

  if (!items.some((i) => i.kind === "task")) {
    return (
      <div className="empty">
        <p>Nothing planned for this day.</p>
        <button className="btn primary" onClick={() => onAddAt(9 * 60)}>Plan your first task</button>
      </div>
    );
  }

  return (
    <ol className="timeline">
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
            <li key={`gap-${item.start}`} className="row gap-row">
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
          <li key={task.id} className={`row task-row${done ? " done" : ""}${progress !== null ? " active" : ""}`}>
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

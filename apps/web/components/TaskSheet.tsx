"use client";

import { useEffect, useState } from "react";
import {
  addDays,
  COLORS,
  DURATIONS,
  EMOJIS,
  fmtDur,
  fromHHMM,
  REPEAT_LABELS,
  todayStr,
  toHHMM,
  type Repeat,
  type Task,
} from "@naal/shared";

export default function TaskSheet({
  task,
  isNew,
  viewDate,
  onSave,
  onDelete,
  onSkipDay,
  onClose,
}: {
  task: Task;
  isNew: boolean;
  viewDate: string;
  onSave: (t: Task) => void;
  onDelete: (t: Task) => void;
  onSkipDay: (t: Task) => void;
  onClose: () => void;
}) {
  const [t, setT] = useState<Task>(task);
  const [showEmoji, setShowEmoji] = useState(false);
  const set = (p: Partial<Task>) => setT((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    onSave({ ...t, title: t.title.trim() || "Untitled" });
  };

  const today = todayStr();
  const dateChoice = t.date === null ? "inbox" : t.date;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal aria-label={isNew ? "New task" : "Edit task"} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-title-row">
          <button
            className="emoji-btn"
            style={{ ["--c" as string]: t.color }}
            onClick={() => setShowEmoji((s) => !s)}
            aria-label="Choose icon"
          >
            {t.emoji}
          </button>
          <input
            className="title-input"
            autoFocus={isNew}
            placeholder="What's the task?"
            value={t.title}
            onChange={(e) => set({ title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </div>

        {showEmoji && (
          <div className="emoji-grid">
            {EMOJIS.map((em) => (
              <button key={em} className={em === t.emoji ? "on" : ""} onClick={() => { set({ emoji: em }); setShowEmoji(false); }}>
                {em}
              </button>
            ))}
          </div>
        )}

        <div className="field">
          <span className="field-label">Colour</span>
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                className={`swatch${c.hex === t.color ? " on" : ""}`}
                style={{ background: c.hex }}
                onClick={() => set({ color: c.hex })}
                aria-label={c.name}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">When</span>
          <div className="chips">
            <button className={dateChoice === "inbox" ? "chip on" : "chip"} onClick={() => set({ date: null, repeat: "none" })}>Inbox</button>
            <button className={dateChoice === today ? "chip on" : "chip"} onClick={() => set({ date: today })}>Today</button>
            <button className={dateChoice === addDays(today, 1) ? "chip on" : "chip"} onClick={() => set({ date: addDays(today, 1) })}>Tomorrow</button>
            <input
              type="date"
              className="chip-input"
              value={t.date ?? ""}
              onChange={(e) => set({ date: e.target.value || viewDate })}
              aria-label="Pick a date"
            />
          </div>
        </div>

        {t.date !== null && (
          <>
            <div className="field">
              <span className="field-label">Time</span>
              <div className="chips">
                <button className={t.start === null ? "chip on" : "chip"} onClick={() => set({ start: null })}>Anytime</button>
                <input
                  type="time"
                  className="chip-input"
                  value={t.start === null ? "" : toHHMM(t.start)}
                  onChange={(e) => e.target.value && set({ start: fromHHMM(e.target.value) })}
                  aria-label="Start time"
                />
              </div>
            </div>

            {t.start !== null && (
              <div className="field">
                <span className="field-label">Duration</span>
                <div className="chips">
                  {DURATIONS.map((d) => (
                    <button key={d} className={t.duration === d ? "chip on" : "chip"} onClick={() => set({ duration: d })}>
                      {fmtDur(d)}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={5}
                    max={720}
                    step={5}
                    className="chip-input num"
                    value={t.duration}
                    onChange={(e) => set({ duration: Math.max(5, Math.min(720, Number(e.target.value) || 5)) })}
                    aria-label="Duration in minutes"
                  />
                  <span className="muted small">min</span>
                </div>
              </div>
            )}

            <div className="field">
              <span className="field-label">Repeat</span>
              <div className="chips">
                {(Object.keys(REPEAT_LABELS) as Repeat[]).map((r) => (
                  <button key={r} className={t.repeat === r ? "chip on" : "chip"} onClick={() => set({ repeat: r })}>
                    {REPEAT_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="field">
          <span className="field-label">Notes</span>
          <textarea rows={3} placeholder="Add details…" value={t.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>

        <div className="sheet-actions">
          {!isNew && (
            <div className="delete-group">
              {task.repeat !== "none" && (
                <button className="btn ghost danger" onClick={() => onSkipDay(task)}>Delete this day</button>
              )}
              <button className="btn ghost danger" onClick={() => onDelete(task)}>
                {task.repeat !== "none" ? "Delete all" : "Delete"}
              </button>
            </div>
          )}
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>{isNew ? "Add task" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { dayTitle, learnedPatch, learningLog, type Task } from "@naal/shared";

export default function Learnings({
  tasks,
  onClose,
  onSave,
  onPickDay,
}: {
  tasks: Task[];
  onClose: () => void;
  onSave: (t: Task) => void;
  onPickDay: (d: string) => void;
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ id: string; date: string; text: string } | null>(null);
  const log = useMemo(() => learningLog(tasks), [tasks]);
  const needle = q.trim().toLowerCase();
  const shown = needle ? log.filter((e) => (e.text + " " + e.task.title).toLowerCase().includes(needle)) : log;

  const commit = () => {
    if (!editing) return;
    const task = tasks.find((t) => t.id === editing.id);
    if (task) onSave({ ...task, ...learnedPatch(task, editing.date, editing.text) });
    setEditing(null);
  };

  return (
    <div className="report">
      <header className="report-top">
        <div className="top-row">
          <h1 className="date-big">Learnings</h1>
          <button className="chip" onClick={onClose}>← Planner</button>
        </div>
        <input className="chip-input" placeholder="Search what I learned…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search learnings" />
      </header>

      {shown.length === 0 ? (
        <p className="muted center">
          {log.length === 0 ? "Nothing yet. Finish a Learn task and note what you learned." : "No match."}
        </p>
      ) : (
        <ul className="learn-list">
          {shown.map((e) => {
            const isEd = editing?.id === e.task.id && editing.date === e.date;
            return (
              <li key={e.task.id + e.date} className="learn-item" style={{ ["--c" as string]: e.task.color }}>
                <div className="learn-head">
                  <button className="link" onClick={() => onPickDay(e.date)}>{dayTitle(e.date)}</button>
                  <span className="muted small">{e.task.emoji} {e.task.title}</span>
                </div>
                {isEd ? (
                  <>
                    <textarea className="learned-input" rows={3} autoFocus value={editing.text} onChange={(ev) => setEditing({ ...editing, text: ev.target.value })} />
                    <div className="chips">
                      <button className="btn primary" onClick={commit}>Save</button>
                      <button className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <p className="learn-text" onClick={() => setEditing({ id: e.task.id, date: e.date, text: e.text })} title="Click to edit">{e.text}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

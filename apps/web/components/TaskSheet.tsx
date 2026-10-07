"use client";

import { useEffect, useState } from "react";
import {
  addDays,
  COLORS,
  MAX_CATEGORIES,
  DURATIONS,
  EMOJI_GROUPS,
  fmtDur,
  fromHHMM,
  parseNotes,
  REPEAT_LABELS,
  serializeNotes,
  todayStr,
  toHHMM,
  type Category,
  type NoteKind,
  type NoteLine,
  type Repeat,
  type Task,
} from "@naal/shared";

export default function TaskSheet({
  task,
  isNew,
  viewDate,
  cats,
  onSave,
  onDelete,
  onSkipDay,
  onClose,
}: {
  task: Task;
  isNew: boolean;
  viewDate: string;
  cats: {
    categories: Category[];
    add: (name: string, color: string) => Category;
    update: (id: string, patch: Partial<Omit<Category, "id">>) => void;
    remove: (id: string) => void;
  };
  onSave: (t: Task) => void;
  onDelete: (t: Task) => void;
  onSkipDay: (t: Task) => void;
  onClose: () => void;
}) {
  const [t, setT] = useState<Task>(task);
  const [showEmoji, setShowEmoji] = useState(false);
  const set = (p: Partial<Task>) => setT((prev) => ({ ...prev, ...p }));
  // null = closed; id null = creating a new category
  const [catForm, setCatForm] = useState<{ id: string | null; name: string; color: string } | null>(null);
  const current = cats.categories.find((c) => c.id === t.categoryId);

  const pickCategory = (c: Category | null) => {
    setCatForm(null);
    set(c ? { categoryId: c.id, color: c.color } : { categoryId: null });
  };
  const saveCategory = () => {
    if (!catForm || !catForm.name.trim()) return;
    if (catForm.id === null) {
      const c = cats.add(catForm.name, catForm.color);
      set({ categoryId: c.id, color: c.color });
    } else {
      cats.update(catForm.id, { name: catForm.name.trim(), color: catForm.color });
      if (t.categoryId === catForm.id) set({ color: catForm.color });
    }
    setCatForm(null);
  };
  const deleteCategory = () => {
    if (!catForm?.id || !window.confirm("Delete this category? Its tasks become Uncategorised.")) return;
    cats.remove(catForm.id);
    if (t.categoryId === catForm.id) set({ categoryId: null });
    setCatForm(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const noteLines = parseNotes(t.notes);
  const setLines = (lines: NoteLine[]) => set({ notes: serializeNotes(lines) });
  const patchLine = (i: number, p: Partial<NoteLine>) => setLines(noteLines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const addLine = (kind: NoteKind) => setLines([...noteLines, { kind, checked: false, highlight: false, text: "" }]);

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
          <div className="emoji-picker">
            {EMOJI_GROUPS.map((g) => (
              <div key={g.name}>
                <div className="emoji-group-label">{g.name}</div>
                <div className="emoji-grid">
                  {g.emojis.map((em) => (
                    <button key={em} className={em === t.emoji ? "on" : ""} onClick={() => { set({ emoji: em }); setShowEmoji(false); }}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="field">
          <span className="field-label">Category</span>
          <div className="chips">
            {cats.categories.map((c) => (
              <button key={c.id} className={c.id === t.categoryId ? "chip on" : "chip"} onClick={() => pickCategory(c)}>
                <span className="cat-dot" style={{ background: c.color }} /> {c.name}
              </button>
            ))}
            {current && (
              <button className="chip small" onClick={() => setCatForm({ id: current.id, name: current.name, color: current.color })}>✎ Edit</button>
            )}
            {cats.categories.length < MAX_CATEGORIES && (
              <button
                className="chip small"
                onClick={() => setCatForm({ id: null, name: "", color: COLORS.find((c) => !cats.categories.some((k) => k.color === c.hex))?.hex ?? COLORS[0].hex })}
              >
                ＋ New
              </button>
            )}
          </div>
          {catForm && (
            <div className="cat-form">
              <input
                className="chip-input"
                autoFocus
                placeholder="Category name (e.g. Extra)"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && saveCategory()}
              />
              <div className="swatches">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    className={`swatch${c.hex === catForm.color ? " on" : ""}`}
                    style={{ background: c.hex }}
                    onClick={() => setCatForm({ ...catForm, color: c.hex })}
                    aria-label={c.name}
                  />
                ))}
              </div>
              <div className="chips">
                <button className="btn primary" onClick={saveCategory}>{catForm.id === null ? "Add category" : "Save category"}</button>
                <button className="btn ghost" onClick={() => setCatForm(null)}>Cancel</button>
                {catForm.id !== null && <button className="btn ghost danger" onClick={deleteCategory}>Delete</button>}
              </div>
            </div>
          )}
        </div>

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
          <div className="note-ed">
            {noteLines.map((l, i) => (
              <div key={i} className={`note-ed-row${l.highlight ? " hl" : ""}${l.checked ? " checked" : ""}`}>
                {l.kind === "check" && (
                  <button type="button" className={`mini${l.checked ? " on" : ""}`} onClick={() => patchLine(i, { checked: !l.checked })} aria-label="Done" aria-pressed={l.checked}>
                    {l.checked ? "✓" : ""}
                  </button>
                )}
                {l.kind === "point" && <span className="note-bullet">•</span>}
                <input
                  type="text"
                  autoFocus={i === noteLines.length - 1 && l.text === ""}
                  placeholder={l.kind === "check" ? "To-do item" : l.kind === "point" ? "Point" : "Note"}
                  value={l.text}
                  onChange={(e) => patchLine(i, { text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      setLines([...noteLines.slice(0, i + 1), { ...l, checked: false, highlight: false, text: "" }, ...noteLines.slice(i + 1)]);
                    }
                    if (e.key === "Backspace" && l.text === "") {
                      e.preventDefault();
                      setLines(noteLines.filter((_, j) => j !== i));
                    }
                  }}
                />
                <button type="button" className={`mini hlbtn${l.highlight ? " on" : ""}`} onClick={() => patchLine(i, { highlight: !l.highlight })} aria-label="Highlight" aria-pressed={l.highlight}>
                  ✎
                </button>
                <button type="button" className="mini" onClick={() => setLines(noteLines.filter((_, j) => j !== i))} aria-label="Remove line">×</button>
              </div>
            ))}
            <div className="chips">
              <button type="button" className="chip small" onClick={() => addLine("check")}>☑ Checklist item</button>
              <button type="button" className="chip small" onClick={() => addLine("point")}>• Point</button>
              <button type="button" className="chip small" onClick={() => addLine("text")}>¶ Text</button>
            </div>
          </div>
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

"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, type User } from "firebase/auth";
import {
  addDays,
  dayProgress,
  dayTitle,
  isDoneOn,
  monthLabel,
  newTask,
  nowMinutes,
  tasksOn,
  todayStr,
  useNow,
  useTasks,
  type Task,
} from "@naal/shared";
import { getFirebase } from "@/lib/firebase";
import WeekStrip from "./WeekStrip";
import MonthCalendar from "./MonthCalendar";
import Timeline from "./Timeline";
import TaskSheet from "./TaskSheet";

export default function Planner({ user }: { user: User }) {
  const { db, auth } = getFirebase();
  const { tasks, loading, error, save, remove, toggleDone, skipDay } = useTasks(db, user.uid);
  const now = useNow();
  const [date, setDate] = useState(todayStr());
  const [tab, setTab] = useState<"day" | "inbox">("day");
  const [editing, setEditing] = useState<{ task: Task; isNew: boolean } | null>(null);
  const [showMonth, setShowMonth] = useState(false);

  const isToday = date === todayStr();
  const anytime = tasksOn(tasks, date).filter((t) => t.start === null);
  const inbox = tasks.filter((t) => t.date === null).sort((a, b) => b.createdAt - a.createdAt);
  const progress = dayProgress(tasks, date);

  const openNew = (p: Partial<Task> = {}) => {
    const start = isToday ? Math.ceil((nowMinutes() + 1) / 15) * 15 : 9 * 60;
    setEditing({ task: newTask({ date, start: Math.min(start, 23 * 60), ...p }), isNew: true });
  };

  // keyboard shortcut: N = new task
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing || (e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "n") { e.preventDefault(); openNew(); }
      if (e.key === "ArrowLeft") setDate((d) => addDays(d, -1));
      if (e.key === "ArrowRight") setDate((d) => addDays(d, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // swipe left/right on the timeline to change day (phones)
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) setDate((d) => addDays(d, dx < 0 ? 1 : -1));
    touch.current = null;
  };

  const inboxList = (
    <section className="inbox">
      <div className="section-head">
        <h2>Inbox</h2>
        <button className="icon-btn" onClick={() => openNew({ date: null })} aria-label="Add to inbox">＋</button>
      </div>
      {inbox.length === 0 ? (
        <p className="muted small">Park ideas here and give them a time later.</p>
      ) : (
        <ul className="inbox-list">
          {inbox.map((t) => (
            <li key={t.id}>
              <button className="inbox-item" onClick={() => setEditing({ task: t, isNew: false })}>
                <span className="mini-pill" style={{ ["--c" as string]: t.color }}>{t.emoji}</span>
                <span>{t.title}</span>
              </button>
              <button className="chip small" onClick={() => save({ ...t, date, start: t.start ?? 9 * 60 })}>
                Plan for {isToday ? "today" : dayTitle(date).toLowerCase()}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="" className="brand-mark" />
          Naal
        </div>
        <MonthCalendar date={date} tasks={tasks} onPick={setDate} />
        {inboxList}
        <div className="account">
          <span className="muted small">{user.email}</span>
          <button className="link" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div className="top-row">
            <button className="date-title" onClick={() => setShowMonth((s) => !s)} aria-expanded={showMonth}>
              <span className="date-big">{dayTitle(date)}</span>
              <span className="muted small">{monthLabel(date)} ▾</span>
            </button>
            <div className="top-actions">
              {!isToday && <button className="chip" onClick={() => setDate(todayStr())}>Today</button>}
              <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">‹</button>
              <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">›</button>
            </div>
          </div>
          {showMonth && (
            <div className="month-pop">
              <MonthCalendar date={date} tasks={tasks} onPick={(d) => { setDate(d); setShowMonth(false); }} />
            </div>
          )}
          <WeekStrip date={date} tasks={tasks} onPick={setDate} />
          {progress !== null && (
            <div className="progress" aria-label={`${Math.round(progress * 100)}% done`}>
              <span style={{ width: `${progress * 100}%` }} />
            </div>
          )}
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "day"} onClick={() => setTab("day")}>Timeline</button>
            <button role="tab" aria-selected={tab === "inbox"} onClick={() => setTab("inbox")}>
              Inbox{inbox.length ? ` (${inbox.length})` : ""}
            </button>
          </div>
        </header>

        {error && <p className="error banner">Sync problem: {error}</p>}

        <div className={`day-view${tab === "inbox" ? " hide-mobile" : ""}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {anytime.length > 0 && (
            <section className="anytime">
              <h2 className="muted small">Anytime</h2>
              <div className="anytime-list">
                {anytime.map((t) => (
                  <div key={t.id} className={`anytime-item${isDoneOn(t, date) ? " done" : ""}`}>
                    <button className="anytime-open" onClick={() => setEditing({ task: t, isNew: false })}>
                      <span className="mini-pill" style={{ ["--c" as string]: t.color }}>{t.emoji}</span>
                      {t.title}
                    </button>
                    <button
                      className={`check small${isDoneOn(t, date) ? " on" : ""}`}
                      style={{ ["--c" as string]: t.color }}
                      onClick={() => toggleDone(t, date)}
                      aria-label={`Toggle ${t.title}`}
                    >
                      {isDoneOn(t, date) ? "✓" : ""}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
          {loading && tasks.length === 0 ? (
            <p className="muted center">Loading your day…</p>
          ) : (
            <Timeline
              tasks={tasks}
              date={date}
              nowMin={isToday ? now : null}
              onOpen={(t) => setEditing({ task: t, isNew: false })}
              onToggle={(t) => toggleDone(t, date)}
              onAddAt={(start) => openNew({ start })}
            />
          )}
        </div>

        <div className={`mobile-inbox${tab === "inbox" ? "" : " hide-mobile"}`}>{inboxList}</div>

        <button className="fab" onClick={() => openNew()} aria-label="Add task">＋</button>
      </main>

      {editing && (
        <TaskSheet
          key={editing.task.id}
          task={editing.task}
          isNew={editing.isNew}
          viewDate={date}
          onClose={() => setEditing(null)}
          onSave={(t) => { save(t); setEditing(null); }}
          onDelete={(t) => { remove(t.id); setEditing(null); }}
          onSkipDay={(t) => { skipDay(t, date); setEditing(null); }}
        />
      )}
    </div>
  );
}

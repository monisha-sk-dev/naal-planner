"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut, type User } from "firebase/auth";
import {
  addDays,
  dayProgress,
  fullDayStreak,
  dayTitle,
  isDoneOn,
  learnedKey,
  monthLabel,
  newTask,
  nowMinutes,
  moveToTomorrowPatch,
  overdueTasks,
  tasksOn,
  toggleDonePatch,
  todayStr,
  unfinishedTasks,
  useCategories,
  useNow,
  useTasks,
  type Task,
} from "@naal/shared";
import { getFirebase } from "@/lib/firebase";
import WeekStrip from "./WeekStrip";
import MonthCalendar from "./MonthCalendar";
import Timeline from "./Timeline";
import TaskSheet from "./TaskSheet";
import ThemeToggle from "./ThemeToggle";
import Report from "./Report";
import Learnings from "./Learnings";
import Celebration from "./Celebration";
import Welcome from "./Welcome";
import Toast, { type ToastData } from "./Toast";
import { useReminders } from "@/lib/useReminders";

export default function Planner({ user }: { user: User }) {
  const { db, auth } = getFirebase();
  const { tasks, loading, error, save, remove, toggleDone, skipDay } = useTasks(db, user.uid);
  const cats = useCategories(db, user.uid);
  const now = useNow();
  const [date, setDate] = useState(todayStr());
  const [tab, setTab] = useState<"day" | "inbox">("day");
  const [editing, setEditing] = useState<{ task: Task; isNew: boolean; focusLearned?: boolean } | null>(null);
  const [showLearnings, setShowLearnings] = useState(false);
  const [showMonth, setShowMonth] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const reminders = useReminders(tasks);
  const closeToast = useCallback(() => setToast(null), []);
  const showToast = (message: string, onUndo?: () => void) => setToast({ id: Date.now(), message, onUndo });

  const isToday = date === todayStr();
  const anytime = tasksOn(tasks, date).filter((t) => t.start === null);
  const inbox = tasks.filter((t) => t.date === null).sort((a, b) => b.createdAt - a.createdAt);
  const progress = dayProgress(tasks, date);
  const { streak, todayDone } = fullDayStreak(tasks);
  const unfinished = unfinishedTasks(tasks, now);

  // finishing a Learn task with no note yet -> ask what was learned
  const toggleWithLearn = (t: Task) => {
    const wasDone = isDoneOn(t, date);
    toggleDone(t, date);
    if (!wasDone && t.categoryId === "learn" && !t.learned[learnedKey(t, date)]?.trim()) {
      setEditing({ task: { ...t, ...toggleDonePatch(t, date) }, isNew: false, focusLearned: true });
    }
  };

  const moveAllToTomorrow = () => {
    const before = unfinished;
    before.forEach((t) => save({ ...t, ...moveToTomorrowPatch() }));
    showToast(`Moved ${before.length} task${before.length > 1 ? "s" : ""} to tomorrow`, () => before.forEach((t) => save(t)));
  };

  // unfinished tasks from earlier days roll over to today automatically
  const rolled = useRef(new Set<string>());
  useEffect(() => {
    if (loading) return;
    const late = overdueTasks(tasks).filter((t) => !rolled.current.has(t.id));
    if (!late.length) return;
    late.forEach((t) => rolled.current.add(t.id));
    late.forEach((t) => save({ ...t, date: todayStr() }));
    showToast(`Moved ${late.length} unfinished task${late.length > 1 ? "s" : ""} to today`, () => late.forEach((t) => save(t)));
  });

  // daily motivation: once per day, when the app is opened
  const welcomeChecked = useRef(false);
  useEffect(() => {
    if (loading || welcomeChecked.current) return;
    welcomeChecked.current = true;
    try {
      if (localStorage.getItem("welcome") !== todayStr()) {
        localStorage.setItem("welcome", todayStr());
        setWelcome(true);
      }
    } catch {}
  }, [loading]);

  // celebrate once when today flips to fully done (not on first load)
  const wasDone = useRef<boolean | null>(null);
  useEffect(() => {
    if (loading) return;
    if (wasDone.current === false && todayDone) setCelebrate(true);
    wasDone.current = todayDone;
  }, [todayDone, loading]);
  const todayTasks = tasksOn(tasks, todayStr()).filter((t) => isDoneOn(t, todayStr()));

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
        {showLearnings ? (
          <Learnings tasks={tasks} onClose={() => setShowLearnings(false)} onSave={save} onPickDay={(d) => { setDate(d); setShowLearnings(false); }} />
        ) : showReport ? (
          <Report tasks={tasks} categories={cats.categories} onClose={() => setShowReport(false)} onPickDay={(d) => { setDate(d); setShowReport(false); }} />
        ) : (
        <>
        <header className="top">
          <div className="top-row">
            <button className="date-title" onClick={() => setShowMonth((s) => !s)} aria-expanded={showMonth}>
              <span className="date-big">{dayTitle(date)}</span>
              <span className="muted small">{monthLabel(date)} ▾</span>
            </button>
            <div className="top-actions">
              {streak > 0 && <button className="chip streak-chip" onClick={() => todayDone && setCelebrate(true)} title="Full-day streak">🔥 {streak}</button>}
              {reminders.supported && (
                <button className={`chip${reminders.enabled ? " on" : ""}`} onClick={reminders.toggle} title="Reminders 10 min before tasks" aria-pressed={reminders.enabled}>
                  {reminders.enabled ? "🔔" : "🔕"}
                </button>
              )}
              <button className="chip" onClick={() => setShowLearnings(true)}>🧠 Learnings</button>
              <button className="chip" onClick={() => setShowReport(true)}>📊 Reports</button>
              <button className="chip" onClick={() => setWelcome(true)} title="Motivation & my quotes" aria-label="Motivation">💬</button>
              <ThemeToggle />
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

        {unfinished.length > 0 && (
          <div className="unfinished">
            <span className="small">⏳ {unfinished.length} unfinished task{unfinished.length > 1 ? "s" : ""}</span>
            <button className="chip small" onClick={moveAllToTomorrow}>Move to tomorrow</button>
          </div>
        )}

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
                      onClick={() => toggleWithLearn(t)}
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
              onToggle={toggleWithLearn}
              onAddAt={(start) => openNew({ start })}
              onNotes={(t, notes) => save({ ...t, notes })}
              onMove={(t, start, before) => {
                const s = Math.max(0, Math.min(start, 24 * 60 - t.duration));
                save({ ...t, start: s });
                // dropped on another task: push that one to follow right after
                if (before) save({ ...before, start: Math.min(s + t.duration, 24 * 60 - before.duration) });
              }}
            />
          )}
        </div>

        <div className={`mobile-inbox${tab === "inbox" ? "" : " hide-mobile"}`}>{inboxList}</div>

        <button className="fab" onClick={() => openNew()} aria-label="Add task">＋</button>
        </>
        )}
      </main>

      {welcome && !celebrate && (
        <Welcome name={user.displayName?.split(" ")[0] ?? ""} planned={tasksOn(tasks, todayStr()).length} streak={streak} onClose={() => setWelcome(false)} />
      )}
      {celebrate && (
        <Celebration
          streak={streak}
          done={todayTasks.length}
          minutes={todayTasks.reduce((n, t) => n + t.duration, 0)}
          onClose={() => setCelebrate(false)}
        />
      )}

      {toast && <Toast toast={toast} onClose={closeToast} />}

      {editing && (
        <TaskSheet
          key={editing.task.id}
          task={editing.task}
          isNew={editing.isNew}
          viewDate={date}
          focusLearned={editing.focusLearned}
          cats={cats}
          onClose={() => setEditing(null)}
          onSave={(t) => { save(t); setEditing(null); }}
          onDelete={(t) => { remove(t.id); setEditing(null); showToast(`Deleted “${t.title}”`, () => save(t)); }}
          onSkipDay={(t) => { skipDay(t, date); setEditing(null); showToast(`Removed “${t.title}” for this day`, () => save(t)); }}
        />
      )}
    </div>
  );
}

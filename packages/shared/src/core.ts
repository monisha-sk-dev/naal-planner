// Core planner logic shared by the web (Next.js) and mobile (Expo) apps.

export type Repeat = "none" | "daily" | "weekdays" | "weekly";

export interface Task {
  id: string;
  title: string;
  emoji: string;
  color: string;
  /** YYYY-MM-DD, or null = Inbox (not scheduled yet) */
  date: string | null;
  /** minutes from midnight, or null = "anytime" that day */
  start: number | null;
  /** minutes */
  duration: number;
  repeat: Repeat;
  notes: string;
  /** used when repeat === "none" */
  done: boolean;
  /** used for repeating tasks: dates on which it was completed */
  doneDates: string[];
  /** repeating tasks: dates removed with "delete only this day" */
  skipDates: string[];
  createdAt: number;
  updatedAt: number;
}

export const COLORS = [
  { name: "Marigold", hex: "#E8A33D" },
  { name: "Leaf", hex: "#4FA36C" },
  { name: "Lotus", hex: "#E0678F" },
  { name: "Peacock", hex: "#2C8CB0" },
  { name: "Kumkum", hex: "#D5534B" },
  { name: "Violet", hex: "#8466CC" },
  { name: "Slate", hex: "#72809A" },
];

export const EMOJIS = [
  "🌅", "☕", "🍳", "🚿", "🧘", "🏃", "🚴", "🏋️",
  "💼", "💻", "📞", "📧", "📝", "📚", "🎓", "🧠",
  "🛒", "🍽️", "🥗", "💊", "🧹", "👕", "🚗", "🚌",
  "👨‍👩‍👧", "❤️", "🎉", "🎮", "🎬", "🎵", "🌳", "🛕",
  "💰", "✈️", "🐶", "🌙", "😴", "⭐", "✅", "📌",
];

export const DURATIONS = [15, 30, 45, 60, 90, 120];

export const REPEAT_LABELS: Record<Repeat, string> = {
  none: "Once",
  daily: "Every day",
  weekdays: "Weekdays",
  weekly: "Every week",
};

// ---------- ids ----------
export function uid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ---------- dates ----------
const pad = (n: number) => String(n).padStart(2, "0");

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(): string {
  return ymd(new Date());
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** 7 dates of the week (Monday first) containing `s` */
export function weekOf(s: string): string[] {
  const d = parseYmd(s);
  const offset = (d.getDay() + 6) % 7; // Mon = 0
  const monday = addDays(s, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** 6x7 grid of dates for the month containing `s` (Monday first) */
export function monthGrid(s: string): string[] {
  const d = parseYmd(s);
  const first = ymd(new Date(d.getFullYear(), d.getMonth(), 1));
  return Array.from({ length: 42 }, (_, i) => addDays(weekOf(first)[0], i));
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const dayShort = (s: string) => DAYS[parseYmd(s).getDay()];
export const monthLabel = (s: string) => {
  const d = parseYmd(s);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export function dayTitle(s: string): string {
  const t = todayStr();
  if (s === t) return "Today";
  if (s === addDays(t, 1)) return "Tomorrow";
  if (s === addDays(t, -1)) return "Yesterday";
  const d = parseYmd(s);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(mm)} ${h < 12 ? "AM" : "PM"}`;
}

export function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** "HH:MM" <-> minutes (for <input type="time">) */
export const toHHMM = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
export const fromHHMM = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + (m || 0);
};

// ---------- recurrence ----------
export function occursOn(t: Task, date: string): boolean {
  if (!t.date) return false;
  if (t.repeat === "none") return t.date === date;
  if (date < t.date || t.skipDates.includes(date)) return false;
  const dow = parseYmd(date).getDay();
  switch (t.repeat) {
    case "daily":
      return true;
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "weekly":
      return dow === parseYmd(t.date).getDay();
  }
}

export function isDoneOn(t: Task, date: string): boolean {
  return t.repeat === "none" ? t.done : t.doneDates.includes(date);
}

/** Returns the changed fields to toggle completion for `date` */
export function toggleDonePatch(t: Task, date: string): Partial<Task> {
  if (t.repeat === "none") return { done: !t.done };
  const set = new Set(t.doneDates);
  if (set.has(date)) set.delete(date);
  else set.add(date);
  // keep the array from growing forever: last 400 entries
  return { doneDates: Array.from(set).sort().slice(-400) };
}

export function tasksOn(tasks: Task[], date: string): Task[] {
  return tasks.filter((t) => occursOn(t, date));
}

export function newTask(p: Partial<Task> = {}): Task {
  const now = Date.now();
  return {
    id: uid(),
    title: "",
    emoji: "📌",
    color: COLORS[0].hex,
    date: todayStr(),
    start: 9 * 60,
    duration: 30,
    repeat: "none",
    notes: "",
    done: false,
    doneDates: [],
    skipDates: [],
    createdAt: now,
    updatedAt: now,
    ...p,
  };
}

/** Fills in missing fields (older docs) so the UI never sees undefined */
export function normalizeTask(id: string, raw: Record<string, unknown>): Task {
  return { ...newTask(), ...(raw as Partial<Task>), id };
}

// ---------- timeline ----------
export type TimelineItem =
  | { kind: "task"; task: Task; start: number; end: number; done: boolean; progress: number | null }
  | { kind: "gap"; start: number; end: number; now: number | null }
  | { kind: "now"; min: number };

/**
 * Builds the day's timeline: timed tasks in order, "free time" gaps
 * of 15+ minutes between them, and the current-time marker.
 * Pass nowMin = null for days other than today.
 */
export function buildTimeline(tasks: Task[], date: string, nowMin: number | null): TimelineItem[] {
  const timed = tasksOn(tasks, date)
    .filter((t) => t.start !== null)
    .sort((a, b) => a.start! - b.start! || a.createdAt - b.createdAt);

  const items: TimelineItem[] = [];
  let prevEnd: number | null = null;

  for (const t of timed) {
    const start = t.start!;
    const end = start + t.duration;
    if (prevEnd !== null && start - prevEnd >= 15) {
      items.push({ kind: "gap", start: prevEnd, end: start, now: null });
    }
    const progress =
      nowMin !== null && nowMin >= start && nowMin < end ? (nowMin - start) / t.duration : null;
    items.push({ kind: "task", task: t, start, end, done: isDoneOn(t, date), progress });
    prevEnd = prevEnd === null ? end : Math.max(prevEnd, end);
  }

  if (nowMin === null) return items;

  // Current time already shown as a task's progress?
  if (items.some((i) => i.kind === "task" && i.progress !== null)) return items;

  // Inside a free-time gap?
  const gap = items.find((i) => i.kind === "gap" && nowMin >= i.start && nowMin < i.end);
  if (gap && gap.kind === "gap") {
    gap.now = nowMin;
    return items;
  }

  // Otherwise place a standalone marker before the first later task
  const idx = items.findIndex((i) => i.kind === "task" && i.start > nowMin);
  const marker: TimelineItem = { kind: "now", min: nowMin };
  if (idx === -1) items.push(marker);
  else items.splice(idx, 0, marker);
  return items;
}

/** Share of the day's tasks completed, 0..1 (null when nothing planned) */
export function dayProgress(tasks: Task[], date: string): number | null {
  const list = tasksOn(tasks, date);
  if (!list.length) return null;
  return list.filter((t) => isDoneOn(t, date)).length / list.length;
}

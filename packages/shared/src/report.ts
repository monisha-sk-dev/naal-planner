// Weekly / monthly report maths, shared by the web (Next.js) and mobile (Expo) apps.
import { addDays, isDoneOn, occursOn, parseYmd, todayStr, weekOf, ymd, type Category, type Task } from "./core";

export type ReportKind = "week" | "month";

export interface DayStat {
  date: string;
  planned: number;
  done: number;
  /** 0..1, or null when nothing was planned */
  pct: number | null;
  /** after today: shown in the chart but left out of the totals */
  future: boolean;
}

export interface TaskStat {
  key: string;
  title: string;
  emoji: string;
  color: string;
  planned: number;
  done: number;
}

export interface Report {
  kind: ReportKind;
  start: string;
  end: string;
  days: DayStat[];
  planned: number;
  done: number;
  /** 0..1, or null when nothing was planned */
  pct: number | null;
  plannedMin: number;
  doneMin: number;
  upcoming: number;
  byTask: TaskStat[];
  /** time done per category (plus "Uncategorised"), largest first */
  byCategory: { id: string; name: string; color: string; minutes: number }[];
  bestDay: DayStat | null;
  /** days in a row (ending today, or at the end of a past period) with at least one task done */
  streak: number;
  longestStreak: number;
  /** tasks that were planned in the period and not completed */
  missed: { task: Task; date: string }[];
  /** only for months: completion per week row */
  weeks: { start: string; pct: number | null }[];
}

export function periodRange(kind: ReportKind, anchor: string): { start: string; end: string } {
  if (kind === "week") {
    const w = weekOf(anchor);
    return { start: w[0], end: w[6] };
  }
  const d = parseYmd(anchor);
  return {
    start: ymd(new Date(d.getFullYear(), d.getMonth(), 1)),
    end: ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}

/** The same kind of period, `n` steps away (negative = earlier) */
export function shiftPeriod(kind: ReportKind, anchor: string, n: number): string {
  if (kind === "week") return addDays(anchor, 7 * n);
  const d = parseYmd(anchor);
  return ymd(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export const UNCATEGORISED = { id: "none", name: "Uncategorised", color: "#72809A" };

export function buildReport(tasks: Task[], kind: ReportKind, anchor: string, categories: Category[] = []): Report {
  const { start, end } = periodRange(kind, anchor);
  const today = todayStr();
  const days: DayStat[] = [];
  const byTask = new Map<string, TaskStat>();
  const byCat = new Map<string, number>();
  const missed: Report["missed"] = [];
  let plannedMin = 0;
  let doneMin = 0;

  for (let date = start; date <= end; date = addDays(date, 1)) {
    const future = date > today;
    const list = tasks.filter((t) => occursOn(t, date));
    let done = 0;
    for (const t of list) {
      const d = isDoneOn(t, date);
      if (future) continue;
      if (d) {
        done++;
        doneMin += t.duration;
        const cid = categories.some((c) => c.id === t.categoryId) ? t.categoryId! : UNCATEGORISED.id;
        byCat.set(cid, (byCat.get(cid) ?? 0) + t.duration);
      } else if (date < today) {
        missed.push({ task: t, date });
      }
      plannedMin += t.duration;
      const s = byTask.get(t.id) ?? { key: t.id, title: t.title, emoji: t.emoji, color: t.color, planned: 0, done: 0 };
      s.planned++;
      if (d) s.done++;
      byTask.set(t.id, s);
    }
    days.push({
      date,
      planned: list.length,
      done,
      pct: list.length ? done / list.length : null,
      future,
    });
  }

  const past = days.filter((d) => !d.future);
  const planned = past.reduce((n, d) => n + d.planned, 0);
  const done = past.reduce((n, d) => n + d.done, 0);

  // streaks: a day counts when at least one task was done
  let streak = 0;
  let longestStreak = 0;
  let run = 0;
  for (const d of past) {
    run = d.done > 0 ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }
  for (let i = past.length - 1; i >= 0; i--) {
    // today may still be in progress, so an empty today doesn't break the streak
    if (past[i].done > 0) streak++;
    else if (!(past[i].date === today && i === past.length - 1)) break;
  }

  const rated = past.filter((d) => d.pct !== null && d.planned >= 1);
  const bestDay = rated.length
    ? rated.reduce((b, d) => (d.pct! > b.pct! || (d.pct === b.pct && d.done > b.done) ? d : b))
    : null;

  const weeks: Report["weeks"] = [];
  if (kind === "month") {
    for (let ws = weekOf(start)[0]; ws <= end; ws = addDays(ws, 7)) {
      const inWeek = past.filter((d) => d.date >= ws && d.date < addDays(ws, 7));
      const p = inWeek.reduce((n, d) => n + d.planned, 0);
      weeks.push({ start: ws, pct: p ? inWeek.reduce((n, d) => n + d.done, 0) / p : null });
    }
  }

  return {
    kind,
    start,
    end,
    days,
    planned,
    done,
    pct: planned ? done / planned : null,
    plannedMin,
    doneMin,
    upcoming: days.filter((d) => d.future).reduce((n, d) => n + d.planned, 0),
    byTask: [...byTask.values()].sort((a, b) => b.planned - a.planned || b.done - a.done).slice(0, 8),
    byCategory: [...byCat.entries()]
      .map(([id, minutes]) => ({ ...(categories.find((c) => c.id === id) ?? UNCATEGORISED), minutes }))
      .sort((a, b) => b.minutes - a.minutes),
    bestDay,
    streak,
    longestStreak,
    missed: missed.slice(-10).reverse(),
    weeks,
  };
}

export const pctLabel = (p: number | null) => (p === null ? "–" : `${Math.round(p * 100)}%`);

/** "+12%" / "-5%" / null when there is nothing to compare */
export function deltaLabel(cur: number | null, prev: number | null): string | null {
  if (cur === null || prev === null) return null;
  const d = Math.round((cur - prev) * 100);
  return `${d > 0 ? "+" : ""}${d}%`;
}

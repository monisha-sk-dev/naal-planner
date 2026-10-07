// Task reminders and "unfinished tasks" helpers, shared by web and mobile.
import { addDays, fmtTime, isDoneOn, occursOn, parseYmd, todayStr, type Task } from "./core";

export const REMINDER_LEAD_MIN = 10;

export interface Reminder {
  /** stable key: task + date, so a reminder fires only once */
  key: string;
  title: string;
  body: string;
  at: Date;
}

/** Reminders (REMINDER_LEAD_MIN before start) for timed, unfinished tasks in [fromDate, fromDate + days) */
export function reminderPlan(tasks: Task[], fromDate = todayStr(), days = 1, lead = REMINDER_LEAD_MIN): Reminder[] {
  const out: Reminder[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(fromDate, i);
    for (const t of tasks) {
      if (t.start === null || !occursOn(t, date) || isDoneOn(t, date)) continue;
      const at = parseYmd(date);
      at.setMinutes(t.start - lead);
      out.push({
        key: `${t.id}:${date}`,
        title: `${t.emoji} ${t.title}`,
        body: lead > 0 ? `Starts in ${lead} min · ${fmtTime(t.start)}` : `Starting now · ${fmtTime(t.start)}`,
        at,
      });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * One-off tasks that were planned but not finished: from earlier days, or
 * today and already past their end time. (Repeating tasks come back by themselves.)
 */
export function unfinishedTasks(tasks: Task[], nowMin: number, today = todayStr()): Task[] {
  return tasks
    .filter(
      (t) =>
        t.repeat === "none" &&
        t.date !== null &&
        !t.done &&
        (t.date < today || (t.date === today && t.start !== null && t.start + t.duration <= nowMin))
    )
    .sort((a, b) => a.date!.localeCompare(b.date!) || (a.start ?? 0) - (b.start ?? 0));
}

/** One-off tasks from earlier days that were never finished: these roll over to today automatically. */
export function overdueTasks(tasks: Task[], today = todayStr()): Task[] {
  return tasks.filter((t) => t.repeat === "none" && t.date !== null && t.date < today && !t.done);
}

/** Patch that moves a one-off task to tomorrow */
export const moveToTomorrowPatch = (today = todayStr()): Partial<Task> => ({ date: addDays(today, 1) });

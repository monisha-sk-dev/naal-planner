// "Full day complete" streaks and celebration copy, shared by web and mobile.
import { addDays, dayProgress, todayStr, type Task } from "./core";

/** A day counts when it had tasks planned and every one of them is done */
export const isFullDay = (tasks: Task[], date: string) => dayProgress(tasks, date) === 1;

/**
 * Consecutive full days ending today. If today isn't finished yet the streak
 * is counted up to yesterday, so it only breaks once today is over.
 */
export function fullDayStreak(tasks: Task[], from = todayStr()): { streak: number; todayDone: boolean } {
  const todayDone = isFullDay(tasks, from);
  let streak = 0;
  for (let d = todayDone ? from : addDays(from, -1), i = 0; i < 400 && isFullDay(tasks, d); i++, d = addDays(d, -1)) streak++;
  return { streak, todayDone };
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

export function streakBadge(streak: number): string | null {
  if (streak >= 30) return "🥇 Gold";
  if (streak >= 14) return "🥈 Silver";
  if (streak >= 3) return "🥉 Bronze";
  return null;
}

const LINES = [
  "Nethu vida innaiku better. Keep going! 💪",
  "Semma! Plan pannadhu ellam mudichitta 🎯",
  "Oru naal, oru win. Nalla thoongu 😴",
  "Discipline-ku salute! 🙌",
  "Innaiku nee jeichiten! ✨",
];

export function celebrationLine(streak: number): string {
  if (STREAK_MILESTONES.includes(streak)) return `${streak}-day streak! Unstoppable 🚀`;
  return LINES[streak % LINES.length];
}

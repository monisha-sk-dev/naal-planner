"use client";

import { dayShort, parseYmd, tasksOn, todayStr, weekOf, type Task } from "@naal/shared";

export default function WeekStrip({
  date,
  tasks,
  onPick,
}: {
  date: string;
  tasks: Task[];
  onPick: (d: string) => void;
}) {
  const today = todayStr();
  return (
    <div className="week" role="tablist" aria-label="Days of this week">
      {weekOf(date).map((d) => {
        const dots = tasksOn(tasks, d).slice(0, 4);
        return (
          <button
            key={d}
            role="tab"
            aria-selected={d === date}
            className={`week-day${d === date ? " selected" : ""}${d === today ? " today" : ""}`}
            onClick={() => onPick(d)}
          >
            <span className="week-name">{dayShort(d)}</span>
            <span className="week-num">{parseYmd(d).getDate()}</span>
            <span className="week-dots">
              {dots.map((t) => (
                <i key={t.id} style={{ background: t.color }} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

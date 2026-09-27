"use client";

import { addDays, monthGrid, monthLabel, parseYmd, tasksOn, todayStr, type Task } from "@naal/shared";

export default function MonthCalendar({
  date,
  tasks,
  onPick,
}: {
  date: string;
  tasks: Task[];
  onPick: (d: string) => void;
}) {
  const month = parseYmd(date).getMonth();
  const today = todayStr();
  const shiftMonth = (n: number) => {
    const d = parseYmd(date);
    const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
    onPick(addDays(`${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-01`, 0));
  };
  return (
    <div className="month">
      <div className="month-head">
        <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
        <strong>{monthLabel(date)}</strong>
        <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
      </div>
      <div className="month-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
          <span key={i} className="month-dow">{l}</span>
        ))}
        {monthGrid(date).map((d) => {
          const has = tasksOn(tasks, d).length > 0;
          const out = parseYmd(d).getMonth() !== month;
          return (
            <button
              key={d}
              onClick={() => onPick(d)}
              className={`month-cell${d === date ? " selected" : ""}${d === today ? " today" : ""}${out ? " out" : ""}`}
            >
              {parseYmd(d).getDate()}
              {has && <i />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

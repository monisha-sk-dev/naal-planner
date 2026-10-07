"use client";

import { useMemo, useState } from "react";
import {
  buildReport,
  dayShort,
  deltaLabel,
  fmtDur,
  monthLabel,
  parseYmd,
  pctLabel,
  shiftPeriod,
  todayStr,
  type Category,
  type ReportKind,
  type Task,
} from "@naal/shared";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (s: string) => `${parseYmd(s).getDate()} ${MON[parseYmd(s).getMonth()]}`;

export default function Report({
  tasks,
  categories,
  onClose,
  onPickDay,
}: {
  tasks: Task[];
  categories: Category[];
  onClose: () => void;
  onPickDay: (d: string) => void;
}) {
  const [kind, setKind] = useState<ReportKind>("week");
  const [anchor, setAnchor] = useState(todayStr());
  const r = useMemo(() => buildReport(tasks, kind, anchor, categories), [tasks, kind, anchor, categories]);
  const prev = useMemo(() => buildReport(tasks, kind, shiftPeriod(kind, anchor, -1), categories), [tasks, kind, anchor, categories]);
  const delta = deltaLabel(r.pct, prev.pct);
  const title = kind === "week" ? `${short(r.start)} – ${short(r.end)}` : monthLabel(anchor);
  const totalMin = r.byCategory.reduce((n, c) => n + c.minutes, 0);
  const circ = 2 * Math.PI * 42;

  return (
    <div className="report">
      <header className="report-top">
        <div className="top-row">
          <h1 className="date-big">{kind === "week" ? "Weekly" : "Monthly"} report</h1>
          <button className="chip" onClick={onClose}>← Planner</button>
        </div>
        <div className="top-row">
          <div className="seg" role="tablist">
            {(["week", "month"] as const).map((k) => (
              <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}>
                {k === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
          <div className="top-actions">
            <button className="icon-btn" onClick={() => setAnchor(shiftPeriod(kind, anchor, -1))} aria-label="Previous">‹</button>
            <strong className="report-range">{title}</strong>
            <button className="icon-btn" onClick={() => setAnchor(shiftPeriod(kind, anchor, 1))} aria-label="Next">›</button>
          </div>
        </div>
      </header>

      {r.planned === 0 && r.upcoming === 0 ? (
        <p className="muted center">Nothing was planned in this {kind}.</p>
      ) : (
        <>
          <section className="report-hero">
            <svg viewBox="0 0 100 100" className="ring" aria-label={`${pctLabel(r.pct)} complete`}>
              <circle cx="50" cy="50" r="42" className="ring-bg" />
              <circle
                cx="50" cy="50" r="42" className="ring-fg"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - (r.pct ?? 0))}
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="56" textAnchor="middle" className="ring-text">{pctLabel(r.pct)}</text>
            </svg>
            <div className="stats">
              <div><b>{r.done}</b><span>of {r.planned} done</span></div>
              <div><b>{fmtDur(r.doneMin)}</b><span>of {fmtDur(r.plannedMin)} planned</span></div>
              <div><b>{r.streak}🔥</b><span>day streak · best {r.longestStreak}</span></div>
              <div>
                <b>{delta ?? "–"}</b>
                <span>vs last {kind}</span>
              </div>
            </div>
          </section>

          <section className="report-card">
            <h2>{kind === "week" ? "Daily completion" : "Calendar heatmap"}</h2>
            {kind === "week" ? (
              <div className="bars">
                {r.days.map((d) => (
                  <button key={d.date} className="bar-col" onClick={() => onPickDay(d.date)} title={`${short(d.date)}: ${d.done}/${d.planned}`}>
                    <span className="bar-track">
                      <span className={`bar-fill${d.future ? " future" : ""}`} style={{ height: `${Math.max(d.pct ?? 0, d.planned ? 0.04 : 0) * 100}%` }} />
                    </span>
                    <small>{dayShort(d.date).slice(0, 1)}</small>
                    <small className="muted">{d.planned ? `${d.done}/${d.planned}` : "·"}</small>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="heat">
                  {r.days.map((d, i) => (
                    <button
                      key={d.date}
                      className={`heat-cell${d.future ? " future" : ""}`}
                      style={{
                        gridColumnStart: i === 0 ? ((parseYmd(d.date).getDay() + 6) % 7) + 1 : undefined,
                        ["--a" as string]: d.pct === null ? 0 : 0.18 + d.pct * 0.82,
                      }}
                      onClick={() => onPickDay(d.date)}
                      title={`${short(d.date)}: ${d.done}/${d.planned}`}
                    >
                      {parseYmd(d.date).getDate()}
                    </button>
                  ))}
                </div>
                <h3 className="muted small">Week by week</h3>
                <div className="trend">
                  {r.weeks.map((w) => (
                    <div key={w.start} className="trend-row">
                      <span className="small">{short(w.start)}</span>
                      <span className="bar-h"><span style={{ width: `${(w.pct ?? 0) * 100}%` }} /></span>
                      <span className="small">{pctLabel(w.pct)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {r.bestDay && (
              <p className="muted small">
                Best day: <b>{short(r.bestDay.date)}</b> ({r.bestDay.done}/{r.bestDay.planned})
              </p>
            )}
          </section>

          {r.byTask.length > 0 && (
            <section className="report-card">
              <h2>Tasks &amp; habits</h2>
              <ul className="habit-list">
                {r.byTask.map((t) => (
                  <li key={t.key}>
                    <span className="mini-pill" style={{ ["--c" as string]: t.color }}>{t.emoji}</span>
                    <span className="habit-name">{t.title}</span>
                    <span className="bar-h" style={{ ["--c" as string]: t.color }}>
                      <span style={{ width: `${(t.done / t.planned) * 100}%`, background: t.color }} />
                    </span>
                    <span className="small">{t.done}/{t.planned}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {totalMin > 0 && (
            <section className="report-card">
              <h2>Time split</h2>
              <div className="split">
                {r.byCategory.map((c) => (
                  <span key={c.id} style={{ flexGrow: c.minutes, background: c.color }} title={`${c.name}: ${fmtDur(c.minutes)}`} />
                ))}
              </div>
              <ul className="habit-list">
                {r.byCategory.map((c) => (
                  <li key={c.id}>
                    <span className="mini-pill" style={{ ["--c" as string]: c.color }} />
                    <span className="habit-name">{c.name}</span>
                    <span className="small">{fmtDur(c.minutes)} · {Math.round((c.minutes / totalMin) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r.missed.length > 0 && (
            <section className="report-card">
              <h2>Missed</h2>
              <ul className="habit-list">
                {r.missed.map((m) => (
                  <li key={m.task.id + m.date}>
                    <span className="mini-pill" style={{ ["--c" as string]: m.task.color }}>{m.task.emoji}</span>
                    <span className="habit-name">{m.task.title}</span>
                    <button className="chip small" onClick={() => onPickDay(m.date)}>{short(m.date)}</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { celebrationLine, streakBadge, fmtDur } from "@naal/shared";

const COLORS = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#b5abff", "#f08a6e"];

export default function Celebration({
  streak,
  done,
  minutes,
  onClose,
}: {
  streak: number;
  done: number;
  minutes: number;
  onClose: () => void;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.8,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 360,
      })),
    [],
  );
  const badge = streakBadge(streak);

  return (
    <div className="celebrate" role="dialog" aria-label="Day complete" onClick={onClose}>
      {pieces.map((p, i) => (
        <i
          key={i}
          className="confetti"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }}
        />
      ))}
      <div className="celebrate-card" onClick={(e) => e.stopPropagation()}>
        <div className="celebrate-emoji">🎉</div>
        <h2>Day Complete!</h2>
        <p className="muted">{celebrationLine(streak)}</p>
        <div className="celebrate-stats">
          <span><b>{done}</b> tasks done</span>
          {minutes > 0 && <span><b>{fmtDur(minutes)}</b> focused</span>}
        </div>
        <div className="streak-big">🔥 {streak}-day streak</div>
        {badge && <div className="badge">{badge}</div>}
        <button className="chip" onClick={onClose}>Nice! 🙌</button>
      </div>
    </div>
  );
}

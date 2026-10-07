"use client";

import { useState } from "react";
import { dailyQuote, greeting, parseQuotes, todayStr } from "@naal/shared";

const KEY = "quotes";

function load(): string[] {
  try {
    return parseQuotes(localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export default function Welcome({ name, planned, streak, onClose }: { name: string; planned: number; streak: number; onClose: () => void }) {
  const [quotes, setQuotes] = useState<string[]>(load);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const save = (next: string[]) => {
    setQuotes(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };
  const add = () => {
    const q = draft.trim();
    if (!q) return;
    save([...quotes, q]);
    setDraft("");
  };

  return (
    <div className="celebrate" role="dialog" aria-label="Daily motivation" onClick={onClose}>
      <div className="celebrate-card" onClick={(e) => e.stopPropagation()}>
        <div className="celebrate-emoji">🌅</div>
        <h2>{greeting(new Date().getHours())}{name ? `, ${name}` : ""}!</h2>
        <p className="muted">{dailyQuote(todayStr(), quotes)}</p>
        <div className="celebrate-stats">
          <span><b>{planned}</b> tasks today</span>
          {streak > 0 && <span><b>🔥 {streak}</b> day streak</span>}
        </div>
        {editing && (
          <div style={{ display: "grid", gap: 6, textAlign: "left" }}>
            {quotes.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.85rem" }}>
                <span style={{ flex: 1 }}>{q}</span>
                <button className="chip small" onClick={() => save(quotes.filter((_, j) => j !== i))} aria-label="Delete quote">✕</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6 }}>
              <input
                className="chip-input"
                style={{ flex: 1 }}
                value={draft}
                maxLength={200}
                placeholder="Your own quote..."
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
              />
              <button className="chip small" onClick={add}>Add</button>
            </div>
          </div>
        )}
        <button className="chip small" onClick={() => setEditing((v) => !v)}>{editing ? "Done" : "✍️ My quotes"}</button>
        <button className="chip" onClick={onClose}>Let&apos;s go 💪</button>
      </div>
    </div>
  );
}

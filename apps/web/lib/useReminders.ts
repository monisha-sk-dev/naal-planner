"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reminderPlan, type Task } from "@naal/shared";

const KEY = "reminders";

/** Browser notifications 10 min before a task starts (works while Naal is open in a tab). */
export function useReminders(tasks: Task[]) {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [enabled, setEnabled] = useState(false);
  const fired = useRef(new Set<string>());
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    if (!supported) return;
    try {
      setEnabled(localStorage.getItem(KEY) === "on" && Notification.permission === "granted");
    } catch {}
  }, [supported]);

  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const now = Date.now();
      for (const r of reminderPlan(tasksRef.current)) {
        const t = r.at.getTime();
        // due, but not older than 5 min (e.g. laptop was asleep)
        if (t <= now && now - t < 5 * 60_000 && !fired.current.has(r.key)) {
          fired.current.add(r.key);
          new Notification(r.title, { body: r.body, icon: "/logo.png", tag: r.key });
        }
      }
    };
    check();
    const id = setInterval(check, 20_000);
    return () => clearInterval(id);
  }, [enabled]);

  const toggle = useCallback(async () => {
    if (!supported) return alert("This browser doesn't support notifications.");
    if (enabled) {
      setEnabled(false);
      try { localStorage.setItem(KEY, "off"); } catch {}
      return;
    }
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") return alert("Notifications are blocked. Allow them in your browser's site settings.");
    setEnabled(true);
    try { localStorage.setItem(KEY, "on"); } catch {}
  }, [supported, enabled]);

  return { supported, enabled, toggle };
}

// Firestore sync + React hooks, shared by both apps.
// Data lives at: users/{uid}/tasks/{taskId}
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { DEFAULT_CATEGORIES, newTask, normalizeTask, nowMinutes, toggleDonePatch, uid as newId, type Category, type Task } from "./core";

const tasksCol = (db: Firestore, uid: string) => collection(db, "users", uid, "tasks");

export function useTasks(db: Firestore | null, uid: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !uid) {
      setTasks([]);
      return;
    }
    setLoading(true);
    let seeded = false;
    const unsub = onSnapshot(
      tasksCol(db, uid),
      (snap) => {
        const list = snap.docs.map((d) => normalizeTask(d.id, d.data()));
        setTasks(list);
        setLoading(false);
        setError(null);
        // First run on a brand-new account: add wake-up and bedtime anchors
        if (!seeded && snap.empty && !snap.metadata.fromCache) {
          seeded = true;
          const today = new Date();
          const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          const anchors = [
            newTask({ title: "Rise and shine", emoji: "🌅", color: "#E8A33D", date, start: 6 * 60 + 30, duration: 15, repeat: "daily" }),
            newTask({ title: "Wind down", emoji: "🌙", color: "#8466CC", date, start: 22 * 60 + 30, duration: 15, repeat: "daily" }),
          ];
          anchors.forEach((t) => setDoc(doc(tasksCol(db, uid), t.id), t));
        }
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [db, uid]);

  const api = useMemo(() => {
    const save = async (t: Task) => {
      if (!db || !uid) return;
      const next = { ...t, updatedAt: Date.now() };
      // optimistic update; Firestore also updates its local cache instantly
      setTasks((prev) => {
        const i = prev.findIndex((p) => p.id === t.id);
        if (i === -1) return [...prev, next];
        const copy = prev.slice();
        copy[i] = next;
        return copy;
      });
      await setDoc(doc(tasksCol(db, uid), t.id), next);
    };
    const remove = async (id: string) => {
      if (!db || !uid) return;
      setTasks((prev) => prev.filter((p) => p.id !== id));
      await deleteDoc(doc(tasksCol(db, uid), id));
    };
    const toggleDone = (t: Task, date: string) => save({ ...t, ...toggleDonePatch(t, date) });
    const skipDay = (t: Task, date: string) =>
      save({ ...t, skipDates: Array.from(new Set([...t.skipDates, date])).sort() });
    return { save, remove, toggleDone, skipDay };
  }, [db, uid]);

  return { tasks, loading, error, ...api };
}

/**
 * User-defined categories, stored as one doc: users/{uid}/meta/categories.
 * Until the user edits them, the defaults (Learn, Work) are shown.
 */
export function useCategories(db: Firestore | null, uid: string | null) {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    if (!db || !uid) {
      setCategories(DEFAULT_CATEGORIES);
      return;
    }
    return onSnapshot(
      doc(db, "users", uid, "meta", "categories"),
      (snap) => {
        const list = snap.data()?.list as Category[] | undefined;
        setCategories(Array.isArray(list) ? list : DEFAULT_CATEGORIES);
      },
      () => {}
    );
  }, [db, uid]);

  const api = useMemo(() => {
    const write = async (list: Category[]) => {
      if (!db || !uid) return;
      setCategories(list);
      await setDoc(doc(db, "users", uid, "meta", "categories"), { list });
    };
    return {
      add: (name: string, color: string): Category => {
        const c = { id: newId(), name: name.trim(), color };
        write([...categories, c]);
        return c;
      },
      update: (id: string, patch: Partial<Omit<Category, "id">>) =>
        write(categories.map((c) => (c.id === id ? { ...c, ...patch } : c))),
      // tasks keep the dead id and simply show up as "Uncategorised"
      remove: (id: string) => write(categories.filter((c) => c.id !== id)),
    };
  }, [db, uid, categories]);

  return { categories, ...api };
}

/** Current minute of the day, refreshed every 30 seconds */
export function useNow(): number {
  const [now, setNow] = useState(nowMinutes());
  useEffect(() => {
    const id = setInterval(() => setNow(nowMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

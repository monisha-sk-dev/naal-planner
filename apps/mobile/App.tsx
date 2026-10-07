import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  addDays,
  dayProgress,
  fullDayStreak,
  dayTitle,
  isDoneOn,
  monthLabel,
  newTask,
  nowMinutes,
  parseYmd,
  tasksOn,
  todayStr,
  useNow,
  useCategories,
  useTasks,
  ymd,
  type Task,
} from "@naal/shared";
import { auth, db } from "./lib/firebase";
import { tint, useTheme } from "./lib/theme";
import AuthScreen from "./components/AuthScreen";
import WeekStrip from "./components/WeekStrip";
import Timeline from "./components/Timeline";
import TaskSheet from "./components/TaskSheet";
import Report from "./components/Report";
import Celebration from "./components/Celebration";

export default function App() {
  const c = useTheme();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {user === undefined ? (
        <View style={[s.center, { backgroundColor: c.bg }]}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : user ? (
        <Planner user={user} />
      ) : (
        <AuthScreen />
      )}
    </SafeAreaProvider>
  );
}

function Planner({ user }: { user: User }) {
  const c = useTheme();
  const { tasks, loading, error, save, remove, toggleDone, skipDay } = useTasks(db, user.uid);
  const cats = useCategories(db, user.uid);
  const now = useNow();
  const [date, setDate] = useState(todayStr());
  const [tab, setTab] = useState<"day" | "inbox">("day");
  const [editing, setEditing] = useState<{ task: Task; isNew: boolean } | null>(null);
  const [pickDate, setPickDate] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const isToday = date === todayStr();
  const anytime = tasksOn(tasks, date).filter((t) => t.start === null);
  const inbox = tasks.filter((t) => t.date === null).sort((a, b) => b.createdAt - a.createdAt);
  const progress = dayProgress(tasks, date);
  const { streak, todayDone } = fullDayStreak(tasks);

  // celebrate once when today flips to fully done (not on first load)
  const wasDone = useRef<boolean | null>(null);
  useEffect(() => {
    if (loading) return;
    if (wasDone.current === false && todayDone) setCelebrate(true);
    wasDone.current = todayDone;
  }, [todayDone, loading]);
  const doneToday = tasksOn(tasks, todayStr()).filter((t) => isDoneOn(t, todayStr()));

  const openNew = (p: Partial<Task> = {}) => {
    const start = isToday ? Math.ceil((nowMinutes() + 1) / 15) * 15 : 9 * 60;
    setEditing({ task: newTask({ date, start: Math.min(start, 23 * 60), ...p }), isNew: true });
  };

  const menu = () =>
    Alert.alert("Naal", user.email ?? "", [
      { text: "Close", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut(auth) },
    ]);

  if (showReport) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "left", "right"]}>
        <Report
          tasks={tasks}
          categories={cats.categories}
          onClose={() => setShowReport(false)}
          onPickDay={(d) => {
            setDate(d);
            setTab("day");
            setShowReport(false);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "left", "right"]}>
      {celebrate && (
        <Celebration streak={streak} done={doneToday.length} minutes={doneToday.reduce((n, t) => n + t.duration, 0)} onClose={() => setCelebrate(false)} />
      )}
      <View style={s.header}>
        <View style={s.topRow}>
          <Pressable onPress={() => setPickDate(true)} accessibilityLabel="Pick a date">
            <Text style={[s.dateBig, { color: c.ink }]}>{dayTitle(date)}</Text>
            <Text style={{ color: c.muted, fontSize: 13 }}>{monthLabel(date)} ▾</Text>
          </Pressable>
          <View style={s.topActions}>
            {!isToday && (
              <Pressable onPress={() => setDate(todayStr())} style={[s.chip, { borderColor: c.line, backgroundColor: c.surface }]}>
                <Text style={{ color: c.ink }}>Today</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setDate(addDays(date, -1))} style={[s.icon, { borderColor: c.line, backgroundColor: c.surface }]} accessibilityLabel="Previous day">
              <Text style={[s.iconText, { color: c.ink }]}>‹</Text>
            </Pressable>
            <Pressable onPress={() => setDate(addDays(date, 1))} style={[s.icon, { borderColor: c.line, backgroundColor: c.surface }]} accessibilityLabel="Next day">
              <Text style={[s.iconText, { color: c.ink }]}>›</Text>
            </Pressable>
            {streak > 0 && (
              <Pressable onPress={() => todayDone && setCelebrate(true)} style={[s.chip, { borderColor: c.line, backgroundColor: c.surface }]} accessibilityLabel={`${streak} day streak`}>
                <Text style={{ color: c.ink, fontWeight: "700" }}>🔥 {streak}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setShowReport(true)} style={[s.icon, { borderColor: c.line, backgroundColor: c.surface }]} accessibilityLabel="Reports">
              <Text>📊</Text>
            </Pressable>
            <Pressable onPress={menu} style={[s.icon, { borderColor: c.line, backgroundColor: c.surface }]} accessibilityLabel="Account">
              <Text style={{ color: c.ink }}>⋯</Text>
            </Pressable>
          </View>
        </View>

        <WeekStrip date={date} tasks={tasks} onPick={setDate} />

        {progress !== null && (
          <View style={[s.progress, { backgroundColor: c.line }]}>
            <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: c.accent }} />
          </View>
        )}

        <View style={[s.tabs, { borderColor: c.line }]}>
          {(["day", "inbox"] as const).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[s.tab, tab === k && { borderColor: c.ink }]}>
              <Text style={{ color: tab === k ? c.ink : c.muted, fontWeight: "700" }}>
                {k === "day" ? "Timeline" : `Inbox${inbox.length ? ` (${inbox.length})` : ""}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error && <Text style={{ color: c.danger, paddingHorizontal: 20 }}>Sync problem: {error}</Text>}

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {tab === "day" ? (
          <>
            {anytime.length > 0 && (
              <View style={s.anytime}>
                <Text style={{ color: c.muted, fontWeight: "700", fontSize: 13 }}>Anytime</Text>
                {anytime.map((t) => {
                  const done = isDoneOn(t, date);
                  return (
                    <View key={t.id} style={[s.anyItem, { backgroundColor: c.surface, borderColor: c.line }]}>
                      <Pressable style={s.anyOpen} onPress={() => setEditing({ task: t, isNew: false })}>
                        <View style={[s.mini, { backgroundColor: tint(t.color, 0.25) }]}>
                          <Text>{t.emoji}</Text>
                        </View>
                        <Text style={{ color: done ? c.muted : c.ink, fontWeight: "700", textDecorationLine: done ? "line-through" : "none" }}>
                          {t.title}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => toggleDone(t, date)}
                        style={[s.check, { borderColor: t.color, backgroundColor: done ? t.color : "transparent" }]}
                      >
                        {done && <Text style={{ color: "#fff", fontWeight: "900" }}>✓</Text>}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
            {loading && tasks.length === 0 ? (
              <Text style={{ color: c.muted, textAlign: "center", marginTop: 40 }}>Loading your day…</Text>
            ) : (
              <Timeline
                tasks={tasks}
                date={date}
                nowMin={isToday ? now : null}
                onOpen={(t) => setEditing({ task: t, isNew: false })}
                onToggle={(t) => toggleDone(t, date)}
                onAddAt={(start) => openNew({ start })}
                onNotes={(t, notes) => save({ ...t, notes })}
              />
            )}
          </>
        ) : (
          <View style={s.inbox}>
            {inbox.length === 0 ? (
              <Text style={{ color: c.muted }}>Park ideas here and give them a time later.</Text>
            ) : (
              inbox.map((t) => (
                <View key={t.id} style={[s.inboxItem, { backgroundColor: c.surface, borderColor: c.line }]}>
                  <Pressable style={s.anyOpen} onPress={() => setEditing({ task: t, isNew: false })}>
                    <View style={[s.mini, { backgroundColor: tint(t.color, 0.25) }]}>
                      <Text>{t.emoji}</Text>
                    </View>
                    <Text style={{ color: c.ink, fontWeight: "700", flexShrink: 1 }}>{t.title}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => save({ ...t, date, start: t.start ?? 9 * 60 })}
                    style={[s.chip, { borderColor: c.line }]}
                  >
                    <Text style={{ color: c.ink, fontSize: 12 }}>Plan for {isToday ? "today" : dayTitle(date)}</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => openNew(tab === "inbox" ? { date: null } : {})}
        style={[s.fab, { backgroundColor: c.accent }]}
        accessibilityLabel="Add task"
      >
        <Text style={s.fabText}>＋</Text>
      </Pressable>

      {pickDate && (
        <DateTimePicker
          value={parseYmd(date)}
          mode="date"
          onChange={(e, d) => {
            setPickDate(false);
            if (e.type === "set" && d) setDate(ymd(d));
          }}
        />
      )}

      {editing && (
        <TaskSheet
          key={editing.task.id}
          task={editing.task}
          isNew={editing.isNew}
          cats={cats}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            save(t);
            setEditing(null);
          }}
          onDelete={(t) => {
            remove(t.id);
            setEditing(null);
          }}
          onSkipDay={(t) => {
            skipDay(t, date);
            setEditing(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateBig: { fontSize: 30, fontWeight: "800", letterSpacing: -0.3 },
  topActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  icon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 22, lineHeight: 24 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  progress: { height: 4, borderRadius: 2, overflow: "hidden" },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderColor: "transparent", marginBottom: -1 },
  anytime: { paddingHorizontal: 16, paddingTop: 16, gap: 6 },
  anyItem: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 6 },
  anyOpen: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  mini: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  inbox: { padding: 16, gap: 8 },
  inboxItem: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8, alignItems: "flex-start" },
  fab: {
    position: "absolute", right: 20, bottom: 32, width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center", elevation: 6,
  },
  fabText: { fontSize: 30, color: "#FFFFFF", lineHeight: 34 },
});

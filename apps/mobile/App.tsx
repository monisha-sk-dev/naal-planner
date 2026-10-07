import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
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
  learnedKey,
  monthLabel,
  newTask,
  nowMinutes,
  moveToTomorrowPatch,
  overdueTasks,
  parseYmd,
  tasksOn,
  toggleDonePatch,
  todayStr,
  unfinishedTasks,
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
import Learnings from "./components/Learnings";
import Celebration from "./components/Celebration";
import Welcome from "./components/Welcome";
import Toast, { type ToastData } from "./components/Toast";
import MenuSheet, { type MenuItem } from "./components/MenuSheet";
import { useReminders } from "./lib/reminders";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [editing, setEditing] = useState<{ task: Task; isNew: boolean; focusLearned?: boolean } | null>(null);
  const [showLearnings, setShowLearnings] = useState(false);
  const [pickDate, setPickDate] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const reminders = useReminders(tasks);
  const closeToast = useCallback(() => setToast(null), []);
  const showToast = (message: string, onUndo?: () => void) => setToast({ id: Date.now(), message, onUndo });

  const isToday = date === todayStr();
  const anytime = tasksOn(tasks, date).filter((t) => t.start === null);
  const inbox = tasks.filter((t) => t.date === null).sort((a, b) => b.createdAt - a.createdAt);
  const progress = dayProgress(tasks, date);
  const { streak, todayDone } = fullDayStreak(tasks);
  const unfinished = unfinishedTasks(tasks, now);

  const moveAllToTomorrow = () => {
    const before = unfinished;
    before.forEach((t) => save({ ...t, ...moveToTomorrowPatch() }));
    showToast(`Moved ${before.length} task${before.length > 1 ? "s" : ""} to tomorrow`, () => before.forEach((t) => save(t)));
  };

  const toggleReminders = async () => {
    const r = await reminders.toggle();
    if (r === null) Alert.alert("Notifications are off", "Allow notifications for Naal in your phone settings to get reminders.");
    else showToast(r ? "Reminders on · 10 min before each task" : "Reminders off");
  };

  // unfinished tasks from earlier days roll over to today automatically
  const rolled = useRef(new Set<string>());
  useEffect(() => {
    if (loading) return;
    const late = overdueTasks(tasks).filter((t) => !rolled.current.has(t.id));
    if (!late.length) return;
    late.forEach((t) => rolled.current.add(t.id));
    late.forEach((t) => save({ ...t, date: todayStr() }));
    showToast(`Moved ${late.length} unfinished task${late.length > 1 ? "s" : ""} to today`, () => late.forEach((t) => save(t)));
  });

  // daily motivation: once per day, when the app is opened
  const welcomeChecked = useRef(false);
  useEffect(() => {
    if (loading || welcomeChecked.current) return;
    welcomeChecked.current = true;
    AsyncStorage.getItem("welcome")
      .then((v) => {
        if (v === todayStr()) return;
        setWelcome(true);
        return AsyncStorage.setItem("welcome", todayStr());
      })
      .catch(() => {});
  }, [loading]);

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

  const menuItems: MenuItem[] = [
    { icon: "bulb-outline", label: "Learnings", hint: "What you've picked up", onPress: () => setShowLearnings(true) },
    { icon: "stats-chart-outline", label: "Reports", hint: "Time spent by category", onPress: () => setShowReport(true) },
    { icon: "chatbubble-ellipses-outline", label: "Daily motivation", onPress: () => setWelcome(true) },
    {
      icon: reminders.enabled ? "notifications" : "notifications-off-outline",
      label: reminders.enabled ? "Reminders on" : "Reminders off",
      hint: "10 min before each task",
      onPress: toggleReminders,
    },
    { icon: "log-out-outline", label: "Sign out", danger: true, onPress: () => signOut(auth) },
  ];

  // finishing a Learn task with no note yet -> ask what was learned
  const toggleWithLearn = (t: Task) => {
    const wasDone = isDoneOn(t, date);
    toggleDone(t, date);
    if (!wasDone && t.categoryId === "learn" && !t.learned[learnedKey(t, date)]?.trim()) {
      setEditing({ task: { ...t, ...toggleDonePatch(t, date) }, isNew: false, focusLearned: true });
    }
  };

  if (showLearnings) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "left", "right"]}>
        <Learnings
          tasks={tasks}
          onClose={() => setShowLearnings(false)}
          onSave={save}
          onPickDay={(d) => {
            setDate(d);
            setTab("day");
            setShowLearnings(false);
          }}
        />
      </SafeAreaView>
    );
  }

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
      {welcome && !celebrate && (
        <Welcome name={user.displayName?.split(" ")[0] ?? ""} planned={tasksOn(tasks, todayStr()).length} streak={streak} onClose={() => setWelcome(false)} />
      )}
      {celebrate && (
        <Celebration streak={streak} done={doneToday.length} minutes={doneToday.reduce((n, t) => n + t.duration, 0)} onClose={() => setCelebrate(false)} />
      )}
      <View style={s.header}>
        <View style={s.topRow}>
          <Pressable onPress={() => setPickDate(true)} accessibilityLabel="Pick a date" style={{ flexShrink: 1 }}>
            <Text style={[s.dateBig, { color: c.ink }]} numberOfLines={1}>{dayTitle(date)}</Text>
            <View style={s.subRow}>
              <Text style={{ color: c.muted, fontSize: 13 }}>{monthLabel(date)} ▾</Text>
              {streak > 0 && (
                <Pressable
                  onPress={() => todayDone && setCelebrate(true)}
                  style={[s.streak, { backgroundColor: tint(c.secondary, 0.16) }]}
                  accessibilityLabel={`${streak} day streak`}
                >
                  <Ionicons name="flame" size={13} color={c.secondary} />
                  <Text style={{ color: c.secondary, fontWeight: "800", fontSize: 12 }}>{streak}</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
          <View style={s.topActions}>
            {!isToday && (
              <Pressable onPress={() => setDate(todayStr())} style={[s.todayChip, { backgroundColor: c.accent }]}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Today</Text>
              </Pressable>
            )}
            <View style={[s.navGroup, { backgroundColor: c.surface }]}>
              <Pressable onPress={() => setDate(addDays(date, -1))} style={s.navBtn} accessibilityLabel="Previous day" hitSlop={6}>
                <Ionicons name="chevron-back" size={20} color={c.ink} />
              </Pressable>
              <View style={[s.navDivider, { backgroundColor: c.line }]} />
              <Pressable onPress={() => setDate(addDays(date, 1))} style={s.navBtn} accessibilityLabel="Next day" hitSlop={6}>
                <Ionicons name="chevron-forward" size={20} color={c.ink} />
              </Pressable>
            </View>
            <Pressable onPress={() => setShowMenu(true)} style={[s.icon, { backgroundColor: c.surface }]} accessibilityLabel="Menu">
              <Ionicons name="ellipsis-horizontal" size={20} color={c.ink} />
            </Pressable>
          </View>
        </View>

        <WeekStrip date={date} tasks={tasks} onPick={setDate} />

        {progress !== null && (
          <View style={s.progressRow}>
            <View style={[s.progress, { backgroundColor: c.line }]}>
              <View style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 3, backgroundColor: progress >= 1 ? c.tertiary : c.accent }} />
            </View>
            <Text style={{ color: c.muted, fontSize: 12, fontWeight: "700", width: 36, textAlign: "right" }}>{Math.round(progress * 100)}%</Text>
          </View>
        )}

        <View style={[s.tabs, { backgroundColor: tint(c.muted, 0.14) }]}>
          {(["day", "inbox"] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              style={[s.tab, tab === k && [s.tabOn, { backgroundColor: c.surface }]]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === k }}
            >
              <Text style={{ color: tab === k ? c.ink : c.muted, fontWeight: "700", fontSize: 14 }}>
                {k === "day" ? "Timeline" : `Inbox${inbox.length ? ` · ${inbox.length}` : ""}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error && <Text style={{ color: c.danger, paddingHorizontal: 20 }}>Sync problem: {error}</Text>}

      {unfinished.length > 0 && (
        <View style={[s.unfinished, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={{ color: c.ink, fontSize: 13, fontWeight: "600" }}><Ionicons name="time-outline" size={14} color={c.secondary} />  {unfinished.length} unfinished task{unfinished.length > 1 ? "s" : ""}</Text>
          <Pressable onPress={moveAllToTomorrow} style={[s.chip, { borderColor: c.line }]}>
            <Text style={{ color: c.ink, fontSize: 12, fontWeight: "700" }}>Move to tomorrow</Text>
          </Pressable>
        </View>
      )}

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
                        onPress={() => toggleWithLearn(t)}
                        style={[s.check, { borderColor: t.color, backgroundColor: done ? t.color : "transparent" }]}
                      >
                        {done && <Ionicons name="checkmark" size={16} color="#fff" />}
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
                onToggle={toggleWithLearn}
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
        <Ionicons name="add" size={32} color="#fff" />
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

      {toast && <Toast toast={toast} onClose={closeToast} />}

      {showMenu && <MenuSheet title="Naal" subtitle={user.email ?? undefined} items={menuItems} onClose={() => setShowMenu(false)} />}

      {editing && (
        <TaskSheet
          key={editing.task.id}
          task={editing.task}
          isNew={editing.isNew}
          viewDate={date}
          focusLearned={editing.focusLearned}
          cats={cats}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            save(t);
            setEditing(null);
          }}
          onDelete={(t) => {
            remove(t.id);
            setEditing(null);
            showToast(`Deleted “${t.title}”`, () => save(t));
          }}
          onSkipDay={(t) => {
            skipDay(t, date);
            setEditing(null);
            showToast(`Removed “${t.title}” for this day`, () => save(t));
          }}
        />
      )}
    </SafeAreaView>
  );
}

const softShadow = { shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 };

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 16, paddingTop: 10, gap: 14 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  dateBig: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  streak: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  topActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", ...softShadow },
  iconText: { fontSize: 24, lineHeight: 26 },
  navGroup: { flexDirection: "row", alignItems: "center", borderRadius: 20, height: 40, ...softShadow },
  navBtn: { width: 38, height: 40, alignItems: "center", justifyContent: "center" },
  navDivider: { width: 1, height: 18 },
  todayChip: { borderRadius: 999, paddingHorizontal: 14, height: 40, alignItems: "center", justifyContent: "center" },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progress: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  tabs: { flexDirection: "row", borderRadius: 14, padding: 3 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 11 },
  tabOn: { ...softShadow },
  unfinished: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderRadius: 14 },
  anytime: { paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  anyItem: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 8, paddingRight: 12, ...softShadow },
  anyOpen: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  mini: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  inbox: { padding: 16, gap: 10 },
  inboxItem: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10, alignItems: "flex-start", ...softShadow },
  fab: {
    position: "absolute", right: 20, bottom: 32, width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center", elevation: 8,
    shadowColor: "#2F285B", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  fabText: { fontSize: 30, color: "#FFFFFF", lineHeight: 34 },
});

import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reminderPlan, todayStr, type Task } from "@naal/shared";

const KEY = "reminders";
// iOS keeps at most 64 pending local notifications
const MAX_SCHEDULED = 60;

// Android Expo Go (SDK 53+) throws as soon as expo-notifications is imported, so only load it in a dev/production build.
const supported = !(Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);
const Notifications: typeof import("expo-notifications") | null = supported ? require("expo-notifications") : null;

Notifications?.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

async function ensurePermission(): Promise<boolean> {
  if (!Notifications) return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Local notifications 10 min before tasks, rescheduled for the next 7 days whenever tasks change. */
export function useReminders(tasks: Task[]) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!Notifications) return;
    AsyncStorage.getItem(KEY)
      .then(async (v) => setEnabled(v === "on" && (await Notifications.getPermissionsAsync()).granted))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Notifications && Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("reminders", {
        name: "Task reminders",
        importance: Notifications.AndroidImportance.HIGH,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!Notifications) return;
    let cancelled = false;
    (async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!enabled || cancelled) return;
      const upcoming = reminderPlan(tasks, todayStr(), 7)
        .filter((r) => r.at.getTime() > Date.now() + 5_000)
        .slice(0, MAX_SCHEDULED);
      for (const r of upcoming) {
        if (cancelled) return;
        await Notifications.scheduleNotificationAsync({
          content: { title: r.title, body: r.body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: "reminders" },
        });
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tasks, enabled]);

  /** true = turned on, false = turned off, null = permission blocked */
  const toggle = useCallback(async () => {
    if (enabled) {
      setEnabled(false);
      await AsyncStorage.setItem(KEY, "off").catch(() => {});
      return false;
    }
    if (!(await ensurePermission())) return null;
    setEnabled(true);
    await AsyncStorage.setItem(KEY, "on").catch(() => {});
    return true;
  }, [enabled]);

  return { enabled, toggle };
}

import { useSyncExternalStore } from "react";
import { Appearance, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const light = {
  bg: "#EEF0F4",
  surface: "#FFFFFF",
  ink: "#1B2230",
  muted: "#687286",
  line: "#D9DDE5",
  accent: "#2F285B",
  secondary: "#D87057",
  tertiary: "#5C9079",
  danger: "#C9443B",
};
const dark: typeof light = {
  bg: "#16181D",
  surface: "#1F2229",
  ink: "#ECEEF2",
  muted: "#9AA2B1",
  line: "#2E323B",
  accent: "#7A6FB5",
  secondary: "#D87057",
  tertiary: "#5C9079",
  danger: "#EF7066",
};

export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === "dark" ? dark : light);

export type ThemePref = "system" | "light" | "dark";
const KEY = "themePref";
let pref: ThemePref = "system";
const listeners = new Set<() => void>();

// Appearance.setColorScheme also restyles native bits (date pickers, status bar, alerts)
const apply = (p: ThemePref) => Appearance.setColorScheme(p === "system" ? "unspecified" : p);

AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v !== "light" && v !== "dark") return;
    pref = v;
    apply(v);
    listeners.forEach((l) => l());
  })
  .catch(() => {});

export const setThemePref = (p: ThemePref) => {
  pref = p;
  apply(p);
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, p).catch(() => {});
};

export const useThemePref = (): ThemePref =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => pref,
  );

/** hex colour with alpha, e.g. tint("#2F285B", 0.25) */
export const tint = (hex: string, alpha: number) =>
  hex + Math.round(alpha * 255).toString(16).padStart(2, "0");

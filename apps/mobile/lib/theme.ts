import { useColorScheme } from "react-native";

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

/** hex colour with alpha, e.g. tint("#2F285B", 0.25) */
export const tint = (hex: string, alpha: number) =>
  hex + Math.round(alpha * 255).toString(16).padStart(2, "0");

// Motivation shown when the app is opened (once a day), shared by web and mobile.
import { parseYmd } from "./core";
import { LIBRARY_QUOTES } from "./quotesLibrary";

const QUOTES = [
  "Chinna chinna steps dhaan perusa vetri-ku vazhi. 🌱",
  "Innaiku seiyyura oru velai, naalaiku nee-ku nandri solluvaan. 🙏",
  "Perfect-ah irukkanum nu illa, start pannu, adhu podhum. 🚀",
  "Discipline = motivation illaadha naal-layum seiyyaradhu. 💪",
  "Nee padikkura ovvoru page-um un future-ku oru investment. 📚",
  "Thoongi ezhundhirichu oru task mudichaa, naal semma start! ☀️",
  "Oru naal-la ellam mudiyaadhu, aana oru naal-la edhaavadhu mudiyum. ✅",
  "Kashtama irukkura naal-la seiyyura velai dhaan unnai valarkkum. 🌳",
  "Compare pannaadha, nethu nee-oda innaiku nee-a compare pannu. 🪞",
  "Plan pannunavan thorkka maatan. 🎯",
  "Konjam konjam-aa, aana daily. Adhu dhaan secret. 🔑",
  "Time-ai nee control pannalana, time unnai control pannum. ⏰",
  "Unnala mudiyum. Neeye adhai innum nambala, avlo dhaan. ✨",
  "Rest edu, aana quit pannaadha. 🌙",
  "Ippo seiyyaradhu naalaiku easy-ya irukkum. 🧠",
];

export function greeting(hour: number): string {
  if (hour < 5) return "Late night? Take care";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

/** Safely read the user's own quotes from their stored JSON string */
export function parseQuotes(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.filter((q): q is string => typeof q === "string" && q.trim() !== "") : [];
  } catch {
    return [];
  }
}

/** Same quote all day, a different one tomorrow. The user's own quotes join the rotation. */
export function dailyQuote(date: string, custom: string[] = []): string {
  const d = parseYmd(date);
  const dayNumber = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  const pool = [...custom, ...QUOTES, ...LIBRARY_QUOTES];
  return pool[dayNumber % pool.length];
}

import { Pressable, StyleSheet, Text, View } from "react-native";
import { dayShort, parseYmd, tasksOn, todayStr, weekOf, type Task } from "@naal/shared";
import { useTheme } from "../lib/theme";

export default function WeekStrip({ date, tasks, onPick }: { date: string; tasks: Task[]; onPick: (d: string) => void }) {
  const c = useTheme();
  const today = todayStr();
  return (
    <View style={s.row}>
      {weekOf(date).map((d) => {
        const selected = d === date;
        const isToday = d === today;
        return (
          <Pressable
            key={d}
            onPress={() => onPick(d)}
            style={[
              s.day,
              { backgroundColor: selected ? c.accent : c.surface },
              isToday && !selected && { borderColor: c.accent, borderWidth: 1.5 },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[s.name, { color: selected ? "#FFFFFFB3" : c.muted }]}>{dayShort(d)}</Text>
            <Text style={[s.num, { color: selected ? "#fff" : isToday ? c.accent : c.ink }]}>{parseYmd(d).getDate()}</Text>
            <View style={s.dots}>
              {tasksOn(tasks, d)
                .slice(0, 3)
                .map((t) => (
                  <View key={t.id} style={[s.dot, { backgroundColor: selected ? "#fff" : t.color }]} />
                ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  day: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 16, gap: 3, borderWidth: 1.5, borderColor: "transparent" },
  name: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  num: { fontSize: 18, fontWeight: "800" },
  dots: { flexDirection: "row", gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

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
        return (
          <Pressable
            key={d}
            onPress={() => onPick(d)}
            style={[s.day, selected && { backgroundColor: c.ink }]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[s.name, { color: selected ? c.bg : c.muted }]}>{dayShort(d)}</Text>
            <Text style={[s.num, { color: d === today ? c.accent : selected ? c.bg : c.ink }]}>
              {parseYmd(d).getDate()}
            </Text>
            <View style={s.dots}>
              {tasksOn(tasks, d)
                .slice(0, 4)
                .map((t) => (
                  <View key={t.id} style={[s.dot, { backgroundColor: t.color }]} />
                ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 4 },
  day: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 14, gap: 2 },
  name: { fontSize: 12 },
  num: { fontSize: 17, fontWeight: "800" },
  dots: { flexDirection: "row", gap: 2, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

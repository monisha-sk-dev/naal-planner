import { Pressable, StyleSheet, Text, View } from "react-native";
import { buildTimeline, fmtDur, fmtTime, parseNotes, toggleNoteCheck, type Task } from "@naal/shared";
import { tint, useTheme } from "../lib/theme";

const pillHeight = (dur: number) => Math.max(56, Math.min(170, dur * 1.1));

export default function Timeline({
  tasks,
  date,
  nowMin,
  onOpen,
  onToggle,
  onAddAt,
  onNotes,
}: {
  tasks: Task[];
  date: string;
  nowMin: number | null;
  onOpen: (t: Task) => void;
  onToggle: (t: Task) => void;
  onAddAt: (start: number) => void;
  onNotes: (t: Task, notes: string) => void;
}) {
  const c = useTheme();
  const items = buildTimeline(tasks, date, nowMin);

  if (!items.some((i) => i.kind === "task")) {
    return (
      <View style={s.empty}>
        <Text style={{ color: c.muted }}>Nothing planned for this day.</Text>
        <Pressable style={[s.btn, { backgroundColor: c.ink }]} onPress={() => onAddAt(9 * 60)}>
          <Text style={{ color: c.bg, fontWeight: "700" }}>Plan your first task</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.list}>
      {items.map((item, i) => {
        if (item.kind === "now") {
          return (
            <View key={`now-${i}`} style={[s.row, { alignItems: "center", minHeight: 24 }]}>
              <Text style={[s.time, { color: c.danger, fontWeight: "700", paddingTop: 0 }]}>{fmtTime(item.min)}</Text>
              <View style={s.rail}>
                <View style={[s.line, { backgroundColor: c.line }]} />
                <View style={[s.nowDot, { backgroundColor: c.danger }]} />
              </View>
              <View style={[s.nowLine, { backgroundColor: c.danger }]} />
            </View>
          );
        }

        if (item.kind === "gap") {
          return (
            <View key={`gap-${item.start}`} style={[s.row, { minHeight: 52 }]}>
              <View style={s.timeCol} />
              <View style={s.rail}>
                <View style={[s.line, s.dashed, { borderColor: c.line }]} />
              </View>
              <Pressable style={s.gap} onPress={() => onAddAt(item.start)}>
                <Text style={{ color: c.muted, fontSize: 13 }}>
                  {item.now !== null && <Text style={{ color: c.danger, fontWeight: "700" }}>Now · </Text>}
                  {fmtDur(item.end - item.start)} free — add a task
                </Text>
              </Pressable>
            </View>
          );
        }

        const { task, start, end, done, progress } = item;
        const h = pillHeight(task.duration);
        return (
          <View key={task.id} style={[s.row, { marginVertical: 6 }]}>
            <View style={s.timeCol}>
              <Text style={[s.time, { color: c.muted }]}>{fmtTime(start)}</Text>
              <Text style={[s.timeEnd, { color: c.muted }]}>{fmtTime(end)}</Text>
            </View>
            <View style={s.rail}>
              <View style={[s.line, { backgroundColor: c.line }]} />
              <View
                style={[
                  s.pill,
                  {
                    height: h,
                    borderColor: task.color,
                    backgroundColor: done ? task.color : tint(task.color, 0.25),
                  },
                  progress !== null && { shadowColor: task.color, elevation: 6 },
                ]}
              >
                {progress !== null && (
                  <View style={[s.fill, { height: `${progress * 100}%`, backgroundColor: tint(task.color, 0.6) }]} />
                )}
                <Text style={s.emoji}>{task.emoji}</Text>
              </View>
            </View>
            <Pressable style={[s.body, { minHeight: h }]} onPress={() => onOpen(task)}>
              <Text style={{ color: c.muted, fontSize: 12 }}>
                {fmtTime(start)} – {fmtTime(end)} ({fmtDur(task.duration)}){task.repeat !== "none" ? " · ↻" : ""}
              </Text>
              <Text
                style={[
                  s.title,
                  { color: done ? c.muted : c.ink, textDecorationLine: done ? "line-through" : "none" },
                ]}
              >
                {task.title || "Untitled"}
              </Text>
              {parseNotes(task.notes).map((l, li) => (
                <View key={li} style={s.noteLine}>
                  {l.kind === "check" && (
                    <Pressable
                      onPress={() => onNotes(task, toggleNoteCheck(task.notes, li))}
                      hitSlop={8}
                      style={[s.noteBox, { borderColor: c.muted }, l.checked && { backgroundColor: c.ink, borderColor: c.ink }]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: l.checked }}
                      accessibilityLabel={l.text}
                    >
                      {l.checked && <Text style={{ color: c.bg, fontSize: 11, fontWeight: "900" }}>✓</Text>}
                    </Pressable>
                  )}
                  {l.kind === "point" && <Text style={{ color: c.muted, width: 18, textAlign: "center" }}>•</Text>}
                  <Text
                    style={[
                      { color: c.muted, fontSize: 13, flexShrink: 1 },
                      l.checked && { textDecorationLine: "line-through", opacity: 0.7 },
                      l.highlight && { backgroundColor: "#FFE98A", color: "#1B2230" },
                    ]}
                  >
                    {l.text}
                  </Text>
                </View>
              ))}
            </Pressable>
            <Pressable
              onPress={() => onToggle(task)}
              hitSlop={10}
              style={[s.check, { borderColor: task.color, backgroundColor: done ? task.color : "transparent" }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={task.title}
            >
              {done && <Text style={s.tick}>✓</Text>}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 16 },
  row: { flexDirection: "row", alignItems: "stretch" },
  timeCol: { width: 62, justifyContent: "space-between", paddingVertical: 6 },
  time: { width: 62, fontSize: 12, paddingTop: 6 },
  timeEnd: { fontSize: 11, opacity: 0.7 },
  rail: { width: 60, alignItems: "center", justifyContent: "center" },
  line: { position: "absolute", top: 0, bottom: 0, width: 2 },
  dashed: { width: 0, borderLeftWidth: 2, borderStyle: "dashed", backgroundColor: "transparent" },
  pill: { width: 48, borderRadius: 24, borderWidth: 2, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  fill: { position: "absolute", top: 0, left: 0, right: 0 },
  emoji: { fontSize: 22 },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: 8, gap: 2 },
  title: { fontSize: 16, fontWeight: "700" },
  check: { alignSelf: "center", width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center", marginLeft: 6 },
  noteLine: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  noteBox: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  tick: { color: "#fff", fontWeight: "900" },
  gap: { flex: 1, justifyContent: "center", paddingHorizontal: 8 },
  nowDot: { width: 12, height: 12, borderRadius: 6 },
  nowLine: { flex: 1, height: 2, borderRadius: 1 },
  empty: { alignItems: "center", gap: 12, paddingVertical: 64 },
  btn: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 },
});

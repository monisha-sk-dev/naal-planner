import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { dayTitle, learnedPatch, learningLog, type Task } from "@naal/shared";
import { useTheme } from "../lib/theme";

export default function Learnings({
  tasks,
  onClose,
  onSave,
  onPickDay,
}: {
  tasks: Task[];
  onClose: () => void;
  onSave: (t: Task) => void;
  onPickDay: (d: string) => void;
}) {
  const c = useTheme();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ id: string; date: string; text: string } | null>(null);
  const log = useMemo(() => learningLog(tasks), [tasks]);
  const needle = q.trim().toLowerCase();
  const shown = needle ? log.filter((e) => (e.text + " " + e.task.title).toLowerCase().includes(needle)) : log;

  const commit = () => {
    if (!editing) return;
    const task = tasks.find((t) => t.id === editing.id);
    if (task) onSave({ ...task, ...learnedPatch(task, editing.date, editing.text) });
    setEditing(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.head}>
        <Text style={[s.title, { color: c.ink }]}>Learnings</Text>
        <Pressable onPress={onClose} style={[s.chip, { borderColor: c.line, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", gap: 2 }]}>
          <Ionicons name="chevron-back" size={16} color={c.ink} />
          <Text style={{ color: c.ink, fontWeight: "600" }}>Planner</Text>
        </Pressable>
      </View>
      <TextInput
        style={[s.search, { borderColor: c.line, backgroundColor: c.surface, color: c.ink }]}
        placeholder="Search what I learned…"
        placeholderTextColor={c.muted}
        value={q}
        onChangeText={setQ}
      />
      <ScrollView contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">
        {shown.length === 0 && (
          <Text style={{ color: c.muted, textAlign: "center", marginTop: 24 }}>
            {log.length === 0 ? "Nothing yet. Finish a Learn task and note what you learned." : "No match."}
          </Text>
        )}
        {shown.map((e) => {
          const isEd = editing?.id === e.task.id && editing.date === e.date;
          return (
            <View key={e.task.id + e.date} style={[s.item, { backgroundColor: c.surface, borderLeftColor: e.task.color }]}>
              <View style={s.itemHead}>
                <Pressable onPress={() => onPickDay(e.date)}>
                  <Text style={{ color: c.accent, fontWeight: "700" }}>{dayTitle(e.date)}</Text>
                </Pressable>
                <Text style={{ color: c.muted, fontSize: 12 }}>{e.task.emoji} {e.task.title}</Text>
              </View>
              {isEd ? (
                <>
                  <TextInput
                    style={[s.input, { borderColor: c.line, backgroundColor: c.bg, color: c.ink }]}
                    multiline
                    autoFocus
                    value={editing.text}
                    onChangeText={(v) => setEditing({ ...editing, text: v })}
                  />
                  <View style={s.row}>
                    <Pressable onPress={commit} style={[s.btn, { backgroundColor: c.ink }]}>
                      <Text style={{ color: c.bg, fontWeight: "700" }}>Save</Text>
                    </Pressable>
                    <Pressable onPress={() => setEditing(null)} style={[s.btn, { borderColor: c.line, borderWidth: 1 }]}>
                      <Text style={{ color: c.ink, fontWeight: "700" }}>Cancel</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable onPress={() => setEditing({ id: e.task.id, date: e.date, text: e.text })}>
                  <Text style={{ color: c.ink, marginTop: 6 }}>{e.text}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  title: { fontSize: 24, fontWeight: "800" },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  search: { borderWidth: 1, borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 9 },
  list: { padding: 16, gap: 12 },
  item: { borderLeftWidth: 4, borderRadius: 12, padding: 12 },
  itemHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, minHeight: 72, marginTop: 8, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  btn: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
});

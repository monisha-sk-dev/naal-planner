import { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  addDays,
  COLORS,
  dayTitle,
  DURATIONS,
  EMOJIS,
  fmtDur,
  fmtTime,
  parseYmd,
  REPEAT_LABELS,
  todayStr,
  ymd,
  type Repeat,
  type Task,
} from "@naal/shared";
import { tint, useTheme } from "../lib/theme";

type Props = {
  task: Task;
  isNew: boolean;
  onSave: (t: Task) => void;
  onDelete: (t: Task) => void;
  onSkipDay: (t: Task) => void;
  onClose: () => void;
};

export default function TaskSheet({ task, isNew, onSave, onDelete, onSkipDay, onClose }: Props) {
  const c = useTheme();
  const [t, setT] = useState<Task>(task);
  const [showEmoji, setShowEmoji] = useState(false);
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const set = (p: Partial<Task>) => setT((prev) => ({ ...prev, ...p }));
  const today = todayStr();

  const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={[s.chip, { borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface }]}
    >
      <Text style={{ color: on ? c.bg : c.ink, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );

  const onPicked = (e: DateTimePickerEvent, value?: Date) => {
    const which = picker;
    setPicker(null);
    if (e.type !== "set" || !value) return;
    if (which === "date") set({ date: ymd(value) });
    if (which === "time") set({ start: value.getHours() * 60 + value.getMinutes() });
  };

  const pickerValue = () => {
    const d = t.date ? parseYmd(t.date) : new Date();
    if (picker === "time") d.setHours(Math.floor((t.start ?? 540) / 60), (t.start ?? 540) % 60);
    return d;
  };

  const confirmDelete = () => {
    if (task.repeat === "none") {
      Alert.alert("Delete task?", task.title, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(task) },
      ]);
    } else {
      Alert.alert("Delete repeating task", task.title, [
        { text: "Cancel", style: "cancel" },
        { text: "Only this day", onPress: () => onSkipDay(task) },
        { text: "All days", style: "destructive", onPress: () => onDelete(task) },
      ]);
    }
  };

  const label = (text: string) => <Text style={[s.label, { color: c.muted }]}>{text}</Text>;
  const customDate = t.date && t.date !== today && t.date !== addDays(today, 1);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior="padding" style={[s.sheet, { backgroundColor: c.surface }]}>
        <View style={[s.grip, { backgroundColor: c.line }]} />
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.titleRow}>
            <Pressable
              onPress={() => setShowEmoji((v) => !v)}
              style={[s.emojiBtn, { borderColor: t.color, backgroundColor: tint(t.color, 0.25) }]}
              accessibilityLabel="Choose icon"
            >
              <Text style={{ fontSize: 28 }}>{t.emoji}</Text>
            </Pressable>
            <TextInput
              style={[s.titleInput, { color: c.ink }]}
              placeholder="What's the task?"
              placeholderTextColor={c.muted}
              value={t.title}
              autoFocus={isNew}
              onChangeText={(title) => set({ title })}
            />
          </View>

          {showEmoji && (
            <View style={s.emojiGrid}>
              {EMOJIS.map((em) => (
                <Pressable
                  key={em}
                  style={[s.emojiCell, em === t.emoji && { backgroundColor: c.bg }]}
                  onPress={() => {
                    set({ emoji: em });
                    setShowEmoji(false);
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{em}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {label("Colour")}
          <View style={s.row}>
            {COLORS.map((col) => (
              <Pressable
                key={col.hex}
                onPress={() => set({ color: col.hex })}
                accessibilityLabel={col.name}
                style={[s.swatch, { backgroundColor: col.hex }, col.hex === t.color && { borderWidth: 3, borderColor: c.ink }]}
              />
            ))}
          </View>

          {label("When")}
          <View style={s.wrap}>
            <Chip label="Inbox" on={t.date === null} onPress={() => set({ date: null, repeat: "none" })} />
            <Chip label="Today" on={t.date === today} onPress={() => set({ date: today })} />
            <Chip label="Tomorrow" on={t.date === addDays(today, 1)} onPress={() => set({ date: addDays(today, 1) })} />
            <Chip label={customDate ? dayTitle(t.date!) : "Pick date…"} on={!!customDate} onPress={() => setPicker("date")} />
          </View>

          {t.date !== null && (
            <>
              {label("Time")}
              <View style={s.wrap}>
                <Chip label="Anytime" on={t.start === null} onPress={() => set({ start: null })} />
                <Chip label={t.start === null ? "Set time…" : fmtTime(t.start)} on={t.start !== null} onPress={() => setPicker("time")} />
              </View>

              {t.start !== null && (
                <>
                  {label("Duration")}
                  <View style={s.wrap}>
                    {DURATIONS.map((d) => (
                      <Chip key={d} label={fmtDur(d)} on={t.duration === d} onPress={() => set({ duration: d })} />
                    ))}
                    <TextInput
                      style={[s.num, { borderColor: c.line, color: c.ink }]}
                      keyboardType="number-pad"
                      value={String(t.duration)}
                      onChangeText={(v) => set({ duration: Math.max(5, Math.min(720, Number(v) || 5)) })}
                      accessibilityLabel="Duration in minutes"
                    />
                    <Text style={{ color: c.muted }}>min</Text>
                  </View>
                </>
              )}

              {label("Repeat")}
              <View style={s.wrap}>
                {(Object.keys(REPEAT_LABELS) as Repeat[]).map((r) => (
                  <Chip key={r} label={REPEAT_LABELS[r]} on={t.repeat === r} onPress={() => set({ repeat: r })} />
                ))}
              </View>
            </>
          )}

          {label("Notes")}
          <TextInput
            style={[s.notes, { borderColor: c.line, backgroundColor: c.bg, color: c.ink }]}
            multiline
            placeholder="Add details…"
            placeholderTextColor={c.muted}
            value={t.notes}
            onChangeText={(notes) => set({ notes })}
          />

          <View style={s.actions}>
            {!isNew && (
              <Pressable onPress={confirmDelete} style={[s.btn, { borderColor: c.line, borderWidth: 1, marginRight: "auto" }]}>
                <Text style={{ color: c.danger, fontWeight: "700" }}>Delete</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={[s.btn, { borderColor: c.line, borderWidth: 1 }]}>
              <Text style={{ color: c.ink, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onSave({ ...t, title: t.title.trim() || "Untitled" })} style={[s.btn, { backgroundColor: c.ink }]}>
              <Text style={{ color: c.bg, fontWeight: "700" }}>{isNew ? "Add task" : "Save"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {picker && <DateTimePicker value={pickerValue()} mode={picker} is24Hour={false} onChange={onPicked} />}
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(10,12,16,0.45)" },
  sheet: { maxHeight: "90%", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  grip: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10 },
  content: { padding: 20, gap: 10, paddingBottom: 36 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emojiBtn: { width: 56, height: 56, borderRadius: 18, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  titleInput: { flex: 1, fontSize: 22, fontWeight: "800" },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap" },
  emojiCell: { width: "12.5%", alignItems: "center", paddingVertical: 6, borderRadius: 10 },
  label: { fontSize: 13, fontWeight: "700", marginTop: 6 },
  row: { flexDirection: "row", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  num: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, minWidth: 60, textAlign: "center" },
  notes: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 12 },
  btn: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 },
});

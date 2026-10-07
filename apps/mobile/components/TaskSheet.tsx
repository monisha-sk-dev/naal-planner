import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  addDays,
  COLORS,
  MAX_CATEGORIES,
  dayTitle,
  DURATIONS,
  EMOJI_GROUPS,
  fmtDur,
  fmtTime,
  learnedKey,
  learnedPatch,
  parseNotes,
  parseYmd,
  REPEAT_LABELS,
  serializeNotes,
  todayStr,
  ymd,
  type Category,
  type NoteKind,
  type NoteLine,
  type Repeat,
  type Task,
} from "@naal/shared";
import { tint, useTheme } from "../lib/theme";

type Props = {
  task: Task;
  isNew: boolean;
  viewDate: string;
  /** open onto the "what I learned" box (after completing a Learn task) */
  focusLearned?: boolean;
  cats: {
    categories: Category[];
    add: (name: string, color: string) => Category;
    update: (id: string, patch: Partial<Omit<Category, "id">>) => void;
    remove: (id: string) => void;
  };
  onSave: (t: Task) => void;
  onDelete: (t: Task) => void;
  onSkipDay: (t: Task) => void;
  onClose: () => void;
};

export default function TaskSheet({ task, isNew, viewDate, focusLearned, cats, onSave, onDelete, onSkipDay, onClose }: Props) {
  const c = useTheme();
  const [t, setT] = useState<Task>(task);
  const [showEmoji, setShowEmoji] = useState(false);
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const set = (p: Partial<Task>) => setT((prev) => ({ ...prev, ...p }));
  const today = todayStr();
  // null = closed; id null = creating a new category
  const [catForm, setCatForm] = useState<{ id: string | null; name: string; color: string } | null>(null);
  const current = cats.categories.find((k) => k.id === t.categoryId);

  const pickCategory = (k: Category) => {
    setCatForm(null);
    set({ categoryId: k.id, color: k.color });
  };
  const saveCategory = () => {
    if (!catForm || !catForm.name.trim()) return;
    if (catForm.id === null) {
      const k = cats.add(catForm.name, catForm.color);
      set({ categoryId: k.id, color: k.color });
    } else {
      cats.update(catForm.id, { name: catForm.name.trim(), color: catForm.color });
      if (t.categoryId === catForm.id) set({ color: catForm.color });
    }
    setCatForm(null);
  };
  const deleteCategory = () => {
    const id = catForm?.id;
    if (!id) return;
    Alert.alert("Delete category?", "Its tasks become Uncategorised.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          cats.remove(id);
          if (t.categoryId === id) set({ categoryId: null });
          setCatForm(null);
        },
      },
    ]);
  };

  const learnKey = learnedKey(t, viewDate);
  const showLearned = t.categoryId === "learn" || Object.keys(t.learned).length > 0;
  const noteLines = parseNotes(t.notes);
  const setLines = (lines: NoteLine[]) => set({ notes: serializeNotes(lines) });
  const patchLine = (i: number, p: Partial<NoteLine>) => setLines(noteLines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const addLine = (kind: NoteKind) => setLines([...noteLines, { kind, checked: false, highlight: false, text: "" }]);

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
            <View>
              {EMOJI_GROUPS.map((g) => (
                <View key={g.name}>
                  <Text style={[s.emojiGroupLabel, { color: c.muted }]}>{g.name.toUpperCase()}</Text>
                  <View style={s.emojiGrid}>
                    {g.emojis.map((em) => (
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
                </View>
              ))}
            </View>
          )}

          {label("Category")}
          <View style={s.wrap}>
            {cats.categories.map((k) => (
              <Chip key={k.id} label={k.name} on={k.id === t.categoryId} onPress={() => pickCategory(k)} />
            ))}
            {current && (
              <Chip label="✎ Edit" on={false} onPress={() => setCatForm({ id: current.id, name: current.name, color: current.color })} />
            )}
            {cats.categories.length < MAX_CATEGORIES && (
              <Chip
                label="＋ New"
                on={false}
                onPress={() =>
                  setCatForm({ id: null, name: "", color: COLORS.find((x) => !cats.categories.some((k) => k.color === x.hex))?.hex ?? COLORS[0].hex })
                }
              />
            )}
          </View>
          {catForm && (
            <View style={[s.catForm, { borderColor: c.line }]}>
              <TextInput
                autoFocus
                placeholder="Category name (e.g. Extra)"
                placeholderTextColor={c.muted}
                value={catForm.name}
                onChangeText={(name) => setCatForm({ ...catForm, name })}
                style={{ color: c.ink, borderColor: c.line, borderWidth: 1, borderRadius: 10, padding: 10 }}
              />
              <View style={s.row}>
                {COLORS.map((col) => (
                  <Pressable
                    key={col.hex}
                    onPress={() => setCatForm({ ...catForm, color: col.hex })}
                    accessibilityLabel={col.name}
                    style={[s.swatch, { backgroundColor: col.hex }, col.hex === catForm.color && { borderWidth: 3, borderColor: c.ink }]}
                  />
                ))}
              </View>
              <View style={s.wrap}>
                <Chip label={catForm.id === null ? "Add category" : "Save category"} on onPress={saveCategory} />
                <Chip label="Cancel" on={false} onPress={() => setCatForm(null)} />
                {catForm.id !== null && <Chip label="Delete" on={false} onPress={deleteCategory} />}
              </View>
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
          {noteLines.map((l, i) => (
            <View key={i} style={s.noteRow}>
              {l.kind === "check" && (
                <Pressable
                  onPress={() => patchLine(i, { checked: !l.checked })}
                  hitSlop={6}
                  style={[s.mini, { borderColor: c.line }, l.checked && { backgroundColor: c.ink, borderColor: c.ink }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: l.checked }}
                >
                  {l.checked && <Ionicons name="checkmark" size={14} color={c.bg} />}
                </Pressable>
              )}
              {l.kind === "point" && <Text style={{ color: c.muted, width: 20, textAlign: "center" }}>•</Text>}
              <TextInput
                style={[
                  s.noteInput,
                  { borderColor: c.line, backgroundColor: l.highlight ? "#FFE98A" : c.bg, color: l.highlight ? "#1B2230" : c.ink },
                  l.checked && { textDecorationLine: "line-through", opacity: 0.7 },
                ]}
                placeholder={l.kind === "check" ? "To-do item" : l.kind === "point" ? "Point" : "Note"}
                placeholderTextColor={c.muted}
                value={l.text}
                autoFocus={i === noteLines.length - 1 && l.text === ""}
                onChangeText={(text) => patchLine(i, { text: text.replace(/\n/g, " ") })}
                onSubmitEditing={() => setLines([...noteLines.slice(0, i + 1), { ...l, checked: false, highlight: false, text: "" }, ...noteLines.slice(i + 1)])}
                blurOnSubmit={false}
              />
              <Pressable
                onPress={() => patchLine(i, { highlight: !l.highlight })}
                style={[s.mini, { borderColor: c.line }, l.highlight && { backgroundColor: "#FFE98A", borderColor: "#E8C84A" }]}
                accessibilityLabel="Highlight"
              >
                <Ionicons name="color-wand-outline" size={15} color={l.highlight ? "#1B2230" : c.ink} />
              </Pressable>
              <Pressable onPress={() => setLines(noteLines.filter((_, j) => j !== i))} style={[s.mini, { borderColor: c.line }]} accessibilityLabel="Remove line">
                <Ionicons name="close" size={16} color={c.ink} />
              </Pressable>
            </View>
          ))}
          <View style={s.wrap}>
            <Chip label="☑ Checklist item" on={false} onPress={() => addLine("check")} />
            <Chip label="• Point" on={false} onPress={() => addLine("point")} />
            <Chip label="¶ Text" on={false} onPress={() => addLine("text")} />
          </View>

          {showLearned && (
            <>
              {label(`What I learned${t.repeat !== "none" ? ` (${dayTitle(learnKey)})` : ""}`)}
              <TextInput
                style={[s.learned, { borderColor: c.line, backgroundColor: c.bg, color: c.ink }]}
                multiline
                autoFocus={focusLearned}
                placeholder="Oru line-la: indha session-la enna katruken?"
                placeholderTextColor={c.muted}
                value={t.learned[learnKey] ?? ""}
                onChangeText={(v) => set(learnedPatch(t, learnKey, v))}
              />
            </>
          )}

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
  emojiGroupLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 8, marginBottom: 2 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap" },
  emojiCell: { width: "12.5%", alignItems: "center", paddingVertical: 6, borderRadius: 10 },
  label: { fontSize: 13, fontWeight: "700", marginTop: 6 },
  row: { flexDirection: "row", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  catForm: { gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 8 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  num: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, minWidth: 60, textAlign: "center" },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  noteInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  learned: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minHeight: 72, textAlignVertical: "top" },
  mini: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 12 },
  btn: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 },
});

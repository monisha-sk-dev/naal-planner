import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { dailyQuote, greeting, parseQuotes, todayStr } from "@naal/shared";
import { useTheme } from "../lib/theme";

export default function Welcome({ name, planned, streak, onClose }: { name: string; planned: number; streak: number; onClose: () => void }) {
  const c = useTheme();
  const [quotes, setQuotes] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("quotes").then((v) => setQuotes(parseQuotes(v))).catch(() => {});
  }, []);

  const save = (next: string[]) => {
    setQuotes(next);
    AsyncStorage.setItem("quotes", JSON.stringify(next)).catch(() => {});
  };
  const add = () => {
    const q = draft.trim();
    if (!q) return;
    save([...quotes, q]);
    setDraft("");
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={{ fontSize: 52 }}>🌅</Text>
          <Text style={[s.title, { color: c.ink }]}>
            {greeting(new Date().getHours())}
            {name ? `, ${name}` : ""}!
          </Text>
          <Text style={{ color: c.muted, textAlign: "center", fontSize: 15 }}>{dailyQuote(todayStr(), quotes)}</Text>
          <View style={s.stats}>
            <Text style={{ color: c.ink }}><Text style={{ fontWeight: "800" }}>{planned}</Text> tasks today</Text>
            {streak > 0 && <Text style={{ color: c.ink }}><Ionicons name="flame" size={14} color={c.secondary} /> <Text style={{ fontWeight: "800" }}>{streak}</Text> day streak</Text>}
          </View>
          {editing && (
            <View style={{ alignSelf: "stretch", gap: 6 }}>
              {quotes.map((q, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ flex: 1, color: c.ink, fontSize: 13 }}>{q}</Text>
                  <Pressable onPress={() => save(quotes.filter((_, j) => j !== i))} accessibilityLabel="Delete quote">
                    <Ionicons name="close" size={16} color={c.muted} />
                  </Pressable>
                </View>
              ))}
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={add}
                  maxLength={200}
                  placeholder="Your own quote..."
                  placeholderTextColor={c.muted}
                  style={{ flex: 1, borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 10, color: c.ink }}
                />
                <Pressable onPress={add} style={[s.btn, { backgroundColor: c.accent, marginTop: 0 }]}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Add</Text>
                </Pressable>
              </View>
            </View>
          )}
          <Pressable onPress={() => setEditing((v) => !v)}>
            <Text style={{ color: c.accent, fontWeight: "600" }}>{editing ? "Done" : "✍️ My quotes"}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={[s.btn, { backgroundColor: c.accent }]}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Let's go 💪</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(10,8,25,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderWidth: 1, borderRadius: 20, padding: 28, alignItems: "center", gap: 10, width: "100%", maxWidth: 340 },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  stats: { flexDirection: "row", gap: 16 },
  btn: { borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10, marginTop: 6 },
});

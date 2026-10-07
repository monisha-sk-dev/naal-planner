import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { setThemePref, tint, useTheme, useThemePref, type ThemePref } from "../lib/theme";

const MODES: { key: ThemePref; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: "light", icon: "sunny", label: "Light" },
  { key: "dark", icon: "moon", label: "Dark" },
  { key: "system", icon: "phone-portrait-outline", label: "Auto" },
];

export type MenuItem = { icon: keyof typeof Ionicons.glyphMap; label: string; hint?: string; danger?: boolean; onPress: () => void };

export default function MenuSheet({
  title,
  subtitle,
  items,
  onClose,
}: {
  title: string;
  subtitle?: string;
  items: MenuItem[];
  onClose: () => void;
}) {
  const c = useTheme();
  const pref = useThemePref();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={[s.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
          <View style={[s.grab, { backgroundColor: c.line }]} />
          <Text style={[s.title, { color: c.ink }]}>{title}</Text>
          {!!subtitle && <Text style={[s.sub, { color: c.muted }]}>{subtitle}</Text>}
          <Text style={[s.section, { color: c.muted }]}>APPEARANCE</Text>
          <View style={[s.seg, { backgroundColor: c.bg }]}>
            {MODES.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => setThemePref(m.key)}
                style={[s.segItem, pref === m.key && { backgroundColor: c.surface, borderColor: c.line, borderWidth: 1 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: pref === m.key }}
              >
                <Ionicons name={m.icon} size={16} color={pref === m.key ? c.accent : c.muted} />
                <Text style={{ color: pref === m.key ? c.ink : c.muted, fontWeight: "700", fontSize: 13 }}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.list}>
            {items.map((it) => (
              <Pressable
                key={it.label}
                onPress={() => {
                  onClose();
                  it.onPress();
                }}
                style={({ pressed }) => [s.item, pressed && { backgroundColor: c.bg }]}
              >
                <View style={[s.iconBox, { backgroundColor: tint(it.danger ? c.danger : c.accent, 0.14) }]}>
                  <Ionicons name={it.icon} size={20} color={it.danger ? c.danger : c.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: it.danger ? c.danger : c.ink }]}>{it.label}</Text>
                  {!!it.hint && <Text style={{ color: c.muted, fontSize: 12 }}>{it.hint}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(10,12,18,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 },
  grab: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  title: { fontSize: 18, fontWeight: "800", paddingHorizontal: 4 },
  sub: { fontSize: 13, paddingHorizontal: 4, marginTop: 2 },
  section: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginTop: 16, paddingHorizontal: 4 },
  seg: { flexDirection: "row", borderRadius: 14, padding: 3, marginTop: 8 },
  segItem: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: "transparent" },
  list: { marginTop: 12, gap: 2 },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 20 },
  label: { fontSize: 16, fontWeight: "600" },
});

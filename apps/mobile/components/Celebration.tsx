import { useEffect, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { celebrationLine, fmtDur, streakBadge } from "@naal/shared";
import { useTheme } from "../lib/theme";

const COLORS = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#b5abff", "#f08a6e"];
const H = Dimensions.get("window").height;

function Piece({ left, delay, dur, color }: { left: number; delay: number; dur: number; color: string }) {
  const y = useRef(new Animated.Value(-20)).current;
  useEffect(() => {
    Animated.timing(y, { toValue: H + 20, duration: dur, delay, easing: Easing.linear, useNativeDriver: true }).start();
  }, [y, dur, delay]);
  const rot = y.interpolate({ inputRange: [0, H], outputRange: ["0deg", "720deg"] });
  return (
    <Animated.View
      style={{ position: "absolute", left: `${left}%`, width: 9, height: 14, borderRadius: 2, backgroundColor: color, transform: [{ translateY: y }, { rotate: rot }] }}
    />
  );
}

export default function Celebration({ streak, done, minutes, onClose }: { streak: number; done: number; minutes: number; onClose: () => void }) {
  const c = useTheme();
  const pieces = useMemo(
    () => Array.from({ length: 50 }, (_, i) => ({ left: Math.random() * 96, delay: Math.random() * 800, dur: 2200 + Math.random() * 1800, color: COLORS[i % COLORS.length] })),
    [],
  );
  const scale = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  }, [scale]);
  const badge = streakBadge(streak);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        {pieces.map((p, i) => (
          <Piece key={i} {...p} />
        ))}
        <Animated.View style={[s.card, { backgroundColor: c.surface, borderColor: c.line, transform: [{ scale }] }]}>
          <Text style={{ fontSize: 52 }}>🎉</Text>
          <Text style={[s.title, { color: c.ink }]}>Day Complete!</Text>
          <Text style={{ color: c.muted, textAlign: "center" }}>{celebrationLine(streak)}</Text>
          <View style={s.stats}>
            <Text style={{ color: c.ink }}><Text style={{ fontWeight: "800" }}>{done}</Text> tasks done</Text>
            {minutes > 0 && <Text style={{ color: c.ink }}><Text style={{ fontWeight: "800" }}>{fmtDur(minutes)}</Text> focused</Text>}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="flame" size={24} color={c.secondary} />
            <Text style={[s.streak, { color: c.ink }]}>{streak}-day streak</Text>
          </View>
          {badge && <Text style={{ color: c.ink, fontWeight: "700" }}>{badge}</Text>}
          <Pressable onPress={onClose} style={[s.btn, { backgroundColor: c.accent }]}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Nice! 🙌</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(10,8,25,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderWidth: 1, borderRadius: 20, padding: 28, alignItems: "center", gap: 10, width: "100%", maxWidth: 340 },
  title: { fontSize: 26, fontWeight: "800" },
  stats: { flexDirection: "row", gap: 16 },
  streak: { fontSize: 20, fontWeight: "800" },
  btn: { borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10, marginTop: 6 },
});

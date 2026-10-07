import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";

export interface ToastData {
  id: number;
  message: string;
  onUndo?: () => void;
}

export default function Toast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  const c = useTheme();
  useEffect(() => {
    const id = setTimeout(onClose, 6000);
    return () => clearTimeout(id);
  }, [toast.id, onClose]);

  return (
    <View style={[s.toast, { backgroundColor: c.ink }]}>
      <Text style={{ color: c.bg, flexShrink: 1 }}>{toast.message}</Text>
      {toast.onUndo && (
        <Pressable
          onPress={() => {
            toast.onUndo!();
            onClose();
          }}
          hitSlop={10}
        >
          <Text style={{ color: c.bg, fontWeight: "800", textDecorationLine: "underline" }}>Undo</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  toast: {
    position: "absolute", left: 16, right: 96, bottom: 40, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, elevation: 8,
  },
});

import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useTheme } from "../lib/theme";

export default function AuthScreen() {
  const c = useTheme();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "in") await signInWithEmailAndPassword(auth, email.trim(), password);
      else await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(
        code.includes("invalid-credential") || code.includes("wrong-password")
          ? "Email or password is incorrect."
          : code.includes("email-already-in-use")
          ? "An account with this email already exists. Sign in instead."
          : code.includes("weak-password")
          ? "Use a password with at least 6 characters."
          : "Couldn't sign in. Check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const input = [s.input, { borderColor: c.line, backgroundColor: c.bg, color: c.ink }];

  return (
    <KeyboardAvoidingView behavior="padding" style={[s.wrap, { backgroundColor: c.bg }]}>
      <View style={[s.card, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Text style={s.mark}>🌅</Text>
        <Text style={[s.h1, { color: c.ink }]}>Naal</Text>
        <Text style={{ color: c.muted }}>
          Your day, on one timeline. Use the same account on your computer to stay in sync.
        </Text>
        <TextInput
          style={input}
          placeholder="Email"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={input}
          placeholder="Password"
          placeholderTextColor={c.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
        />
        {error && <Text style={{ color: c.danger }}>{error}</Text>}
        <Pressable style={[s.btn, { backgroundColor: c.ink }]} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={c.bg} />
          ) : (
            <Text style={[s.btnText, { color: c.bg }]}>{mode === "in" ? "Sign in" : "Create account"}</Text>
          )}
        </Pressable>
        <Pressable onPress={() => setMode(mode === "in" ? "up" : "in")}>
          <Text style={{ color: c.muted, textDecorationLine: "underline", textAlign: "center" }}>
            {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24 },
  card: { borderRadius: 24, borderWidth: 1, padding: 24, gap: 14 },
  mark: { fontSize: 40 },
  h1: { fontSize: 34, fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  btn: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  btnText: { fontWeight: "700", fontSize: 16 },
});

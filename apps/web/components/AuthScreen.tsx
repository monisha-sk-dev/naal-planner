"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { getFirebase } from "@/lib/firebase";

export default function AuthScreen() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { auth } = getFirebase();
    run(() =>
      mode === "in"
        ? signInWithEmailAndPassword(auth, email, password)
        : createUserWithEmailAndPassword(auth, email, password)
    );
  };

  return (
    <main className="auth">
      <div className="auth-card">
        <img className="auth-mark" src="/logo.png" alt="Naal" />
        <h1>Naal</h1>
        <p className="muted">Your day, on one timeline. Sign in to sync your phone and computer.</p>

        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn primary" disabled={busy}>
            {mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          className="btn ghost"
          disabled={busy}
          onClick={() => run(() => signInWithPopup(getFirebase().auth, new GoogleAuthProvider()))}
        >
          Continue with Google
        </button>

        <button className="link" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}

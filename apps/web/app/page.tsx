"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebase } from "@/lib/firebase";
import AuthScreen from "@/components/AuthScreen";
import Planner from "@/components/Planner";

export default function Home() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const { auth } = getFirebase();
    return onAuthStateChanged(auth, setUser);
  }, []);

  if (user === undefined)
    return (
      <div className="splash">
        <img src="/logo.png" alt="Naal" style={{ width: 72, height: 72, objectFit: "contain" }} />
      </div>
    );
  if (!user) return <AuthScreen />;
  return <Planner user={user} />;
}

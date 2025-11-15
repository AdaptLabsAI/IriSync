"use client";

import React, { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
};

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    try {
      const auth = getFirebaseAuth();

      unsub = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      });
    } catch (err) {
      console.error("[AuthProvider] Failed to initialize Firebase Auth:", err);
      setError(
        "Firebase authentication is temporarily unavailable. Please try again later."
      );
      setLoading(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  if (error) {
    // You can keep your existing error UI, just make sure it's not
    // hardcoding a lie about "missing env vars" anymore.
    return (
      <div className="p-4 text-sm text-red-500">
        <p>Firebase Authentication Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
} 
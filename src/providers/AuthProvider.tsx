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
    // In development, still render children even with Firebase errors
    // The FirebaseConfigWarning component will show the appropriate message
    console.warn("[AuthProvider] Firebase error, but continuing to render:", error);
    return (
      <AuthContext.Provider value={{ user: null, loading: false }}>
        {children}
      </AuthContext.Provider>
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
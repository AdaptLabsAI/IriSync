"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function getFirebaseClientConfig(): FirebaseClientConfig {
  // IMPORTANT: Next.js replaces these at build time. In production they
  // must come from Vercel project env vars.
  const config: Partial<FirebaseClientConfig> = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missing = Object.entries(config).filter(([, v]) => !v);

  if (missing.length > 0) {
    // These keys are *public* Firebase client keys, so logging their presence
    // (not values) in the browser is safe.
    console.error("[Firebase] Missing NEXT_PUBLIC_* env vars:", {
      missing: missing.map(([k]) => k),
      // NOTE: you can temporarily log the raw values during debugging,
      // but remove that once things work.
    });

    throw new Error(
      "[Firebase] Client configuration is incomplete. Check NEXT_PUBLIC_FIREBASE_* env vars in Vercel."
    );
  }

  return config as FirebaseClientConfig;
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

/**
 * Returns a singleton Firebase App for client-side usage.
 * This must only be imported from client components.
 */
export function getFirebaseClientApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error(
      "[Firebase] getFirebaseClientApp() was called on the server. Import and use it only in client components."
    );
  }

  if (!firebaseApp) {
    const config = getFirebaseClientConfig();

    // Avoid "Firebase App named '[DEFAULT]' already exists" errors.
    firebaseApp = getApps().length ? getApp() : initializeApp(config);
  }

  return firebaseApp;
}

/**
 * Returns a singleton Firebase Auth instance.
 */
export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseClientApp());
  }
  return firebaseAuth;
}

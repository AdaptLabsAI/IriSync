import type { FirebaseOptions } from 'firebase/app';

type FirebaseClientEnvKey =
  | 'NEXT_PUBLIC_FIREBASE_API_KEY'
  | 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'
  | 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  | 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
  | 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  | 'NEXT_PUBLIC_FIREBASE_APP_ID'
  | 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'
  | 'NEXT_PUBLIC_FIREBASE_DATABASE_URL';

function readClientEnv(key: FirebaseClientEnvKey): string | undefined {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[firebaseConfig] Missing environment variable: ${key}`);
    }
    return undefined;
  }

  return value;
}

export const firebaseConfig: FirebaseOptions = {
  apiKey: readClientEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: readClientEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: readClientEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: readClientEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readClientEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readClientEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  measurementId: readClientEnv('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'),
  databaseURL: readClientEnv('NEXT_PUBLIC_FIREBASE_DATABASE_URL'),
};

export function isFirebaseConfigComplete(): boolean {
  return (
    typeof firebaseConfig.apiKey === 'string' &&
    typeof firebaseConfig.authDomain === 'string' &&
    typeof firebaseConfig.projectId === 'string' &&
    typeof firebaseConfig.appId === 'string'
  );
}

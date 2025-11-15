/**
 * Firebase Client Configuration
 * 
 * Reads Firebase configuration from environment variables provided by the hosting platform.
 * In development: Uses .env.local
 * In production: Uses environment variables from Vercel project settings (or other hosting platform)
 * 
 * Required environment variables (must be set in hosting platform):
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * 
 * Optional:
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID (treated as string to avoid scientific notation)
 * - NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
 * - NEXT_PUBLIC_FIREBASE_DATABASE_URL
 */

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
  // Read from process.env - Next.js will inline these at build time for NEXT_PUBLIC_ vars
  const value = process.env[key];

  if (!value || value.trim() === '') {
    return undefined;
  }

  // Return as string - important for messagingSenderId to avoid scientific notation
  return String(value);
}

export const firebaseConfig: FirebaseOptions = {
  apiKey: readClientEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: readClientEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: readClientEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: readClientEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  // Ensure messagingSenderId is treated as string (could be large number like 554117967400)
  messagingSenderId: readClientEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readClientEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  measurementId: readClientEnv('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'),
  databaseURL: readClientEnv('NEXT_PUBLIC_FIREBASE_DATABASE_URL'),
};

/**
 * Check if required Firebase configuration is present
 * Only checks for the minimum required fields to initialize Firebase
 * 
 * Required fields per Firebase documentation:
 * - apiKey: API key for Firebase project
 * - authDomain: Auth domain for Firebase Authentication
 * - projectId: Project identifier
 * - appId: App identifier
 */
export function isFirebaseConfigComplete(): boolean {
  const hasRequiredFields = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
  
  // Additional validation: ensure these are actual strings, not just truthy
  if (hasRequiredFields) {
    const allStrings = 
      typeof firebaseConfig.apiKey === 'string' &&
      typeof firebaseConfig.authDomain === 'string' &&
      typeof firebaseConfig.projectId === 'string' &&
      typeof firebaseConfig.appId === 'string';
    
    return allStrings;
  }
  
  return false;
}

/**
 * Get detailed debug info about which Firebase config values are missing
 * For development/debugging only - does not expose actual values
 */
export function getFirebaseConfigDebugInfo(): { 
  isComplete: boolean;
  missing: string[];
  present: string[];
  values?: Record<string, any>;
} {
  const required = {
    'NEXT_PUBLIC_FIREBASE_API_KEY': firebaseConfig.apiKey,
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': firebaseConfig.authDomain,
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID': firebaseConfig.projectId,
    'NEXT_PUBLIC_FIREBASE_APP_ID': firebaseConfig.appId,
  };

  const missing: string[] = [];
  const present: string[] = [];

  Object.entries(required).forEach(([key, value]) => {
    if (value && typeof value === 'string' && value.trim() !== '') {
      present.push(key);
    } else {
      missing.push(key);
    }
  });

  // Include actual config object structure for debugging (not values)
  const values = process.env.NODE_ENV !== 'production' ? {
    apiKey: firebaseConfig.apiKey ? `${String(firebaseConfig.apiKey).substring(0, 10)}...` : undefined,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    appId: firebaseConfig.appId ? `${String(firebaseConfig.appId).substring(0, 15)}...` : undefined,
  } : undefined;

  return {
    isComplete: missing.length === 0,
    missing,
    present,
    values,
  };
}

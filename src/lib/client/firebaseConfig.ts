/**
 * Firebase Client Configuration
 * 
 * CRITICAL: This module reads Firebase configuration from environment variables ONLY.
 * NO hardcoded configuration is allowed.
 * 
 * WHY ENVIRONMENT VARIABLES:
 * - Keeps secrets out of source code (security best practice)
 * - Allows different configs per environment (dev/staging/prod)
 * - Set in hosting platform (e.g., Vercel project settings)
 * 
 * NEVER use hardcoded Firebase config like the Firebase quickstart example:
 *   const firebaseConfig = {
 *     apiKey: "AIza...",        // WRONG - never hardcode
 *     authDomain: "...",          // WRONG - never hardcode
 *     projectId: "...",           // WRONG - never hardcode
 *     ...
 *   };
 * 
 * Instead, ALWAYS read from environment variables as shown below.
 * 
 * ENVIRONMENT VARIABLES:
 * In development: Set in .env.local file
 * In production: Set in hosting platform (e.g., Vercel project settings)
 * 
 * Required environment variables (must be set in hosting platform):
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * 
 * Optional but recommended:
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID (MUST be string: "554117967400", NOT 5.54118E+11)
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

/**
 * Read environment variable and ensure it's returned as a string
 * 
 * IMPORTANT for messagingSenderId:
 * Firebase messaging sender IDs can be large numbers like 554117967400.
 * JavaScript may convert these to scientific notation (5.54118E+11) if not treated as strings.
 * Always ensure these are stored as strings in your environment variables: "554117967400"
 */
function readClientEnv(key: FirebaseClientEnvKey): string | undefined {
  // Read from process.env - Next.js will inline these at build time for NEXT_PUBLIC_ vars
  const value = process.env[key];

  if (!value || value.trim() === '') {
    return undefined;
  }

  // Convert to string - important for messagingSenderId to avoid scientific notation
  const stringValue = String(value);

  // Special validation for messagingSenderId
  if (key === 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') {
    // Check for scientific notation (E or e)
    if (/[eE]/.test(stringValue)) {
      console.error('⚠️  WARNING: Firebase messaging sender ID contains scientific notation!');
      console.error('   Current value:', stringValue);
      console.error('   Expected format: "554117967400" (as a string in quotes)');
      console.error('   Fix: In your hosting platform, ensure NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is wrapped in quotes');
    }
  }

  return stringValue;
}

/**
 * Firebase client configuration built from environment variables
 * This is the ONLY place where Firebase config should be assembled
 * 
 * DO NOT create additional firebaseConfig objects elsewhere in the codebase
 * Import this config from here when needed
 */
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
      typeof firebaseConfig.appId === 'string' &&
      firebaseConfig.apiKey.trim().length > 0 &&
      firebaseConfig.authDomain.trim().length > 0 &&
      firebaseConfig.projectId.trim().length > 0 &&
      firebaseConfig.appId.trim().length > 0;

    return allStrings;
  }

  return false;
}

/**
 * Alias for isFirebaseConfigComplete for better semantic clarity
 * Use this in user-facing code to check if Firebase is ready to use
 * 
 * @returns {boolean} True if Firebase is fully configured, false otherwise
 */
export function isFirebaseConfigured(): boolean {
  return isFirebaseConfigComplete();
}

/**
 * Get detailed debug info about which Firebase config values are missing
 * For development/debugging only - does not expose actual values in production
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

  // Include actual config object structure for debugging (not full values in production)
  const values =
    process.env.NODE_ENV !== 'production'
      ? {
          apiKey: firebaseConfig.apiKey
            ? `${String(firebaseConfig.apiKey).substring(0, 10)}...`
            : undefined,
          authDomain: firebaseConfig.authDomain,
          projectId: firebaseConfig.projectId,
          appId: firebaseConfig.appId
            ? `${String(firebaseConfig.appId).substring(0, 15)}...`
            : undefined,
        }
      : undefined;

  return {
    isComplete: missing.length === 0,
    missing,
    present,
    values,
  };
}

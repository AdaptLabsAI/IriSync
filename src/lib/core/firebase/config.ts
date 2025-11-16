/**
 * Firebase Configuration
 * 
 * Centralizes all Firebase configuration to avoid duplicate declarations and errors.
 * Provides typed interfaces and handles environment variables with fallbacks.
 * 
 * IMPORTANT: This is a wrapper that re-exports from the client config.
 * DO NOT create additional firebaseConfig objects here.
 * 
 * Environment variables are expected to come from:
 * - Development: .env.local file
 * - Production: Hosting platform's environment variables (e.g., Vercel project settings)
 * 
 * WHY WE USE ENVIRONMENT VARIABLES:
 * - Security: Keeps secrets out of source code
 * - Flexibility: Different configs for dev/staging/prod
 * - Best practice: Never hardcode Firebase config
 * 
 * NEVER hardcode Firebase config like:
 *   const firebaseConfig = {
 *     apiKey: "AIza...",  // WRONG
 *     authDomain: "...",  // WRONG
 *     ...
 *   };
 */

import { FirebaseOptions } from 'firebase/app';
import {
  firebaseConfig as clientFirebaseConfig,
  isFirebaseConfigComplete,
} from '@/lib/client/firebaseConfig';
import { hasValidFirebaseClientEnv, logFirebaseConfigStatus } from './health';

/**
 * Firebase client configuration - re-exported from client config
 * Uses environment variables only, never hardcoded values
 */
export const firebaseConfig: FirebaseOptions = clientFirebaseConfig;

/**
 * Firebase admin configuration
 */
export const firebaseAdminConfig = {
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  projectId:
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

/**
 * Get debug info about current Firebase configuration
 * Does not expose actual secret values - only reports presence/absence
 */
export function getFirebaseConfigDebugInfo(): Record<string, string> {
  return {
    apiKey: firebaseConfig.apiKey ? 'Set' : 'Not set',
    authDomain: firebaseConfig.authDomain ? 'Set' : 'Not set',
    projectId: firebaseConfig.projectId ? 'Set' : 'Not set',
    storageBucket: firebaseConfig.storageBucket ? 'Set' : 'Not set',
    databaseURL: firebaseConfig.databaseURL ? 'Set' : 'Not set',
    messagingSenderId: firebaseConfig.messagingSenderId ? 'Set' : 'Not set',
    appId: firebaseConfig.appId ? 'Set' : 'Not set',
    measurementId: firebaseConfig.measurementId ? 'Set' : 'Not set',
  };
}

/**
 * Check if Firebase config appears to be valid
 * Uses the centralized health check
 */
export function isFirebaseConfigValid(): boolean {
  return hasValidFirebaseClientEnv();
}

/**
 * Debug log Firebase configuration to console in development
 * Safe for production - does not log secret values
 */
export function logFirebaseConfig(): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.log('Firebase config status:', getFirebaseConfigDebugInfo());
    if (!isFirebaseConfigValid()) {
      console.warn('Firebase configuration is incomplete. Check environment variables.');
      logFirebaseConfigStatus('Firebase Config');
    }
  }
}

/**
 * Re-export Firebase client instances
 * These are initialized in the client module and should only be used client-side
 */
export { auth, firestore, storage } from './client';

// For backward compatibility, export app as well
export { default as app } from './client'; 
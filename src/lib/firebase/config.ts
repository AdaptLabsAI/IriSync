/**
 * Firebase Configuration
 * 
 * Centralizes all Firebase configuration to avoid duplicate declarations and errors.
 * Provides typed interfaces and handles environment variables with fallbacks.
 */

import { FirebaseOptions } from 'firebase/app';

/**
 * Firebase client configuration - enforcing environment variable usage
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

/**
 * Firebase admin configuration
 */
export const firebaseAdminConfig = {
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
};

/**
 * Get debug info about current Firebase configuration
 */
export function getFirebaseConfigDebugInfo(): Record<string, string> {
  return {
    apiKey: firebaseConfig.apiKey ? (
      (firebaseConfig.apiKey as string).startsWith('AIza') ? 'Valid API Key' : 'Invalid API Key'
    ) : 'Not set',
    authDomain: firebaseConfig.authDomain as string || 'Not set',
    projectId: firebaseConfig.projectId as string || 'Not set',
    storageBucket: firebaseConfig.storageBucket as string || 'Not set',
    messagingSenderId: firebaseConfig.messagingSenderId as string || 'Not set',
    appId: firebaseConfig.appId as string || 'Not set',
    measurementId: (firebaseConfig.measurementId as string) || 'Not set'
  };
}

/**
 * Check if Firebase config appears to be valid
 */
export function isFirebaseConfigValid(): boolean {
  return !!(
    firebaseConfig.apiKey && 
    (firebaseConfig.apiKey as string).startsWith('AIza') &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

/**
 * Debug log Firebase configuration to console in development
 */
export function logFirebaseConfig(): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.log('Firebase config:', getFirebaseConfigDebugInfo());
    if (!isFirebaseConfigValid()) {
      console.error('Firebase configuration is incomplete or invalid. Please check your environment variables.');
    }
  }
} 
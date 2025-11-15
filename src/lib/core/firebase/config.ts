/**
 * Firebase Configuration
 * 
 * Centralizes all Firebase configuration to avoid duplicate declarations and errors.
 * Provides typed interfaces and handles environment variables with fallbacks.
 * 
 * Environment variables are expected to come from:
 * - Development: .env.local file
 * - Production: Hosting platform's environment variables (e.g., Vercel project settings)
 */

import { FirebaseOptions } from 'firebase/app';
import { firebaseConfig as clientFirebaseConfig, isFirebaseConfigComplete } from '@/lib/client/firebaseConfig';

/**
 * Firebase client configuration - enforcing environment variable usage
 */
export const firebaseConfig: FirebaseOptions = clientFirebaseConfig;

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
 * Does not expose actual secret values
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
    measurementId: firebaseConfig.measurementId ? 'Set' : 'Not set'
  };
}

/**
 * Check if Firebase config appears to be valid
 * Only checks if required fields are present, not their format
 */
export function isFirebaseConfigValid(): boolean {
  return isFirebaseConfigComplete();
}

/**
 * Debug log Firebase configuration to console in development
 */
export function logFirebaseConfig(): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.log('Firebase config status:', getFirebaseConfigDebugInfo());
    if (!isFirebaseConfigValid()) {
      console.warn('Firebase configuration is incomplete. Check environment variables.');
    }
  }
} 
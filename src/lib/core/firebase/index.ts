import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

import {
  firebaseConfig,
  getFirebaseConfigDebugInfo,
  isFirebaseConfigValid
} from './config';

/**
 * Check if we're in a build environment where Firebase may not be available
 */
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

/**
 * Log sanitized configuration details in development to help with troubleshooting
 */
if (process.env.NODE_ENV !== 'production' && !isBuildTime) {
  if (typeof window !== 'undefined') {
    console.log('Firebase config used:', getFirebaseConfigDebugInfo());
  } else if (!isFirebaseConfigValid()) {
    console.warn(
      'Firebase configuration appears incomplete. Please verify your environment variables.'
    );
  }
}

let app: any = null;
let firestore: any = null;
let auth: any = null;
let storage: any = null;

/**
 * Initialize Firebase only if not in build phase and config is valid
 */
if (!isBuildTime && isFirebaseConfigValid()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firestore = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    // Don't throw during initialization - let routes handle the error
  }
} else {
  console.warn('Skipping Firebase initialization - build time or invalid config');
}

// Alias for compatibility with files expecting 'db'
const db = firestore;

/**
 * Export Firebase services
 */
export { app, firestore, auth, storage, db };

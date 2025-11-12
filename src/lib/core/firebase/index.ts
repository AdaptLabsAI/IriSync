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
 * Log sanitized configuration details in development to help with troubleshooting
 */
if (process.env.NODE_ENV !== 'production') {
  if (typeof window !== 'undefined') {
    console.log('Firebase config used:', getFirebaseConfigDebugInfo());
  } else if (!isFirebaseConfigValid()) {
    console.warn(
      'Firebase configuration appears incomplete. Please verify your environment variables.'
    );
  }
}

/**
 * Initialize Firebase or return the existing instance
 */
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const firestore = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Alias for compatibility with files expecting 'db'
const db = firestore;

/**
 * Export Firebase services
 */
export { app, firestore, auth, storage, db };

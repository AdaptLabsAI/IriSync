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

let _app: any = null;
let _firestore: any = null;
let _auth: any = null;
let _storage: any = null;
let _initialized = false;

/**
 * Initialize Firebase only if not in build phase and config is valid (lazy)
 */
const initializeFirebase = () => {
  if (_initialized || isBuildTime || !isFirebaseConfigValid()) {
    return;
  }

  _initialized = true;

  try {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    _firestore = getFirestore(_app);
    _auth = getAuth(_app);
    _storage = getStorage(_app);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    // Don't throw during initialization - let routes handle the error
  }
};

// Export Firebase services as lazy getters
export const getFirebaseApp = () => {
  if (!_app) initializeFirebase();
  return _app;
};

export const getFirebaseFirestore = () => {
  if (!_firestore) initializeFirebase();
  return _firestore;
};

export const getFirebaseAuth = () => {
  if (!_auth) initializeFirebase();
  return _auth;
};

export const getFirebaseStorage = () => {
  if (!_storage) initializeFirebase();
  return _storage;
};

// For backward compatibility, export constants (but they'll be null during build)
export const app = null;
export const firestore = null;
export const auth = null;
export const storage = null;
export const db = null; // Alias for compatibility with files expecting 'db'

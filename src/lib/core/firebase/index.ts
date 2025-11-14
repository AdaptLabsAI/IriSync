/**
 * Firebase Client SDK Initialization
 * 
 * Simple lazy initialization - Firebase is only initialized when first accessed at RUNTIME.
 * During build, none of this code executes.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

import {
  firebaseConfig,
  isFirebaseConfigValid
} from './config';

// Cached instances - initialized on first access
let _app: FirebaseApp | null = null;
let _firestore: Firestore | null = null;
let _auth: Auth | null = null;
let _storage: FirebaseStorage | null = null;
let _initialized = false;

/**
 * Check if we're in build phase
 */
const isBuildPhase = (): boolean => {
  return process.env.NEXT_PHASE === 'phase-production-build' ||
         process.env.IS_BUILD_PHASE === 'true' ||
         !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
         process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'build-placeholder';
};

/**
 * Initialize Firebase (called lazily on first access)
 */
const initializeFirebase = () => {
  // Skip during build phase
  if (isBuildPhase()) {
    return;
  }
  
  // Skip if already initialized
  if (_initialized) {
    return;
  }
  
  // Skip if config is invalid (e.g., during build with placeholder values)
  if (!isFirebaseConfigValid()) {
    console.warn('Skipping Firebase initialization - invalid configuration');
    return;
  }

  try {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    _firestore = getFirestore(_app);
    _auth = getAuth(_app);
    _storage = getStorage(_app);
    _initialized = true;

    if (process.env.NODE_ENV === 'development') {
      console.log('Firebase initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
};

/**
 * Get Firestore instance - initializes Firebase on first call
 */
export const getFirestoreInstance = (): Firestore => {
  if (isBuildPhase()) {
    throw new Error('Firebase cannot be accessed during build phase');
  }
  if (!_firestore) {
    initializeFirebase();
  }
  if (!_firestore) {
    throw new Error('Firestore not initialized - check Firebase configuration');
  }
  return _firestore;
};

/**
 * Get Auth instance - initializes Firebase on first call
 */
export const getAuthInstance = (): Auth => {
  if (!_auth) {
    initializeFirebase();
  }
  if (!_auth) {
    throw new Error('Auth not initialized - check Firebase configuration');
  }
  return _auth;
};

/**
 * Get Storage instance - initializes Firebase on first call
 */
export const getStorageInstance = (): FirebaseStorage => {
  if (!_storage) {
    initializeFirebase();
  }
  if (!_storage) {
    throw new Error('Storage not initialized - check Firebase configuration');
  }
  return _storage;
};

/**
 * Get App instance - initializes Firebase on first call
 */
export const getAppInstance = (): FirebaseApp => {
  if (!_app) {
    initializeFirebase();
  }
  if (!_app) {
    throw new Error('Firebase App not initialized - check Firebase configuration');
  }
  return _app;
};

/**
 * For backward compatibility - lazy getter properties
 * These use Proxies but safely handle build-time access
 */
export const firestore = new Proxy({} as Firestore, {
  get(target, prop) {
    // During build, return undefined for any property access
    // This prevents the proxy from trying to initialize Firebase
    if (isBuildPhase()) {
      return undefined;
    }
    const instance = getFirestoreInstance();
    return instance[prop as keyof Firestore];
  }
});

export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    if (isBuildPhase()) {
      return undefined;
    }
    const instance = getAuthInstance();
    return instance[prop as keyof Auth];
  }
});

export const storage = new Proxy({} as FirebaseStorage, {
  get(target, prop) {
    if (isBuildPhase()) {
      return undefined;
    }
    const instance = getStorageInstance();
    return instance[prop as keyof FirebaseStorage];
  }
});

export const app = new Proxy({} as FirebaseApp, {
  get(target, prop) {
    if (isBuildPhase()) {
      return undefined;
    }
    const instance = getAppInstance();
    return instance[prop as keyof FirebaseApp];
  }
});

// Alias for backward compatibility
export const db = firestore;

// Named exports for async getters
export const getFirebaseApp = getAppInstance;
export const getFirebaseFirestore = getFirestoreInstance;
export const getFirebaseAuth = getAuthInstance;
export const getFirebaseStorage = getStorageInstance;

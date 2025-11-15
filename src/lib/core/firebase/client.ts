/**
 * Firebase Client SDK Initialization
 * 
 * IMPORTANT: This module initializes Firebase for CLIENT-SIDE use only.
 * 
 * WHY NO 'use client' DIRECTIVE:
 * - The 'use client' directive causes this to be evaluated during SSR
 * - Firebase client SDK should ONLY run in the browser
 * - We use typeof window !== 'undefined' checks instead
 * 
 * ENVIRONMENT VARIABLES:
 * All configuration comes from environment variables (NEVER hardcoded):
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN  
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID (must be string: "554117967400")
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * 
 * WHY ENVIRONMENT VARIABLES:
 * - Keeps secrets out of source code
 * - Allows different configs per environment (dev/staging/prod)
 * - Set in hosting platform (e.g., Vercel project settings)
 * 
 * NEVER use hardcoded config like:
 *   const firebaseConfig = {
 *     apiKey: "AIza...",  // WRONG - never hardcode
 *     authDomain: "...",
 *     ...
 *   };
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { hasValidFirebaseClientEnv, logFirebaseConfigStatus } from './health';

// Cached instances - only initialize once
let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let initialized = false;

/**
 * Initialize Firebase client SDK
 * Only runs in browser (client-side), never on server
 * 
 * @returns {boolean} True if initialization succeeded, false otherwise
 */
function initializeFirebaseClient(): boolean {
  // Guard: Only initialize in browser
  if (typeof window === 'undefined') {
    return false;
  }

  // Guard: Only initialize once
  if (initialized) {
    return app !== null;
  }

  initialized = true;

  try {
    // Validate environment variables are present
    if (!hasValidFirebaseClientEnv()) {
      logFirebaseConfigStatus('Firebase Client');
      console.error('Firebase will not be initialized due to missing configuration.');
      return false;
    }

    // Initialize Firebase app (or get existing instance)
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    if (process.env.NODE_ENV !== 'production') {
      console.log('✓ Firebase client initialized successfully');
    }

    // Initialize Firestore
    firestore = getFirestore(app);

    // Initialize Auth
    auth = getAuth(app);

    // Set persistence to local (browser) to keep the user logged in
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('✓ Firebase Auth persistence set to LOCAL');
        }
      })
      .catch((error) => {
        console.error('Error setting auth persistence:', error);
      });

    // Initialize Storage
    storage = getStorage(app);

    // Connect to Auth Emulator in development if enabled
    if (
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' &&
      process.env.NODE_ENV !== 'production'
    ) {
      const authEmulatorHost =
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
      connectAuthEmulator(auth, `http://${authEmulatorHost}`);
      console.log('Connected to Firebase Auth Emulator');
    }

    return true;
  } catch (error) {
    console.error('Error initializing Firebase client:', error);
    
    // Log helpful error message
    if (error instanceof Error) {
      console.error('Firebase initialization failed:', error.message);
      
      // Check for specific Firebase errors
      if (error.message.includes('API key')) {
        console.error('→ Check NEXT_PUBLIC_FIREBASE_API_KEY environment variable');
      } else if (error.message.includes('app identifier')) {
        console.error('→ Check NEXT_PUBLIC_FIREBASE_APP_ID environment variable');
      } else if (error.message.includes('project')) {
        console.error('→ Check NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable');
      }
    }

    // Set to null on error
    app = null;
    firestore = null;
    auth = null;
    storage = null;

    return false;
  }
}

/**
 * Get Firebase app instance
 * Initializes Firebase on first call if not already initialized
 * 
 * @returns {FirebaseApp | null} Firebase app instance or null if not available
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!app && !initialized) {
    initializeFirebaseClient();
  }
  return app;
}

/**
 * Get Firestore instance
 * @returns {Firestore | null} Firestore instance or null if not available
 */
export function getFirebaseFirestore(): Firestore | null {
  if (!firestore && !initialized) {
    initializeFirebaseClient();
  }
  return firestore;
}

/**
 * Get Auth instance
 * @returns {Auth | null} Auth instance or null if not available
 */
export function getFirebaseAuth(): Auth | null {
  if (!auth && !initialized) {
    initializeFirebaseClient();
  }
  return auth;
}

/**
 * Get Storage instance
 * @returns {FirebaseStorage | null} Storage instance or null if not available
 */
export function getFirebaseStorage(): FirebaseStorage | null {
  if (!storage && !initialized) {
    initializeFirebaseClient();
  }
  return storage;
}

// Export instances directly for convenience
// These will be null until first access triggers initialization
export { firestore, auth, storage };
export default app;

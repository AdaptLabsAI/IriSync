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
 * WHY FIREBASE CLIENT CANNOT BE USED ON THE SERVER:
 * - Firebase Client SDK is designed for browser environments only
 * - It relies on browser APIs (localStorage, IndexedDB, etc.)
 * - Using it during SSR will cause initialization errors and hydration mismatches
 * - For server-side operations, use Firebase Admin SDK instead
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
 * WHY WE BASE CONFIG PURELY ON NEXT_PUBLIC_FIREBASE_* ENV VARS:
 * - Next.js inlines NEXT_PUBLIC_* variables at build time for client-side access
 * - These are the ONLY env vars accessible in the browser
 * - Non-NEXT_PUBLIC_* vars are server-side only and won't work for client SDK
 * - Keeps secrets out of source code
 * - Allows different configs per environment (dev/staging/prod)
 * - Set in hosting platform (e.g., Vercel project settings)
 * 
 * WHY THE OLD FIREBASE QUICKSTART SNIPPET WITH HARDCODED CONFIG MUST NOT BE USED:
 * - Hardcoding config exposes secrets in source code (security risk)
 * - Makes it impossible to have different configs per environment
 * - Goes against modern security best practices
 * - Environment variables are the standard approach for 12-factor apps
 * 
 * ERROR TYPES:
 * - FIREBASE_CLIENT_CONFIG_INCOMPLETE: Required env vars are missing
 * - FIREBASE_CLIENT_USED_ON_SERVER: Client SDK called during SSR (developer error)
 */

/**
 * Custom error class for Firebase client configuration issues
 */
export class FirebaseClientError extends Error {
  public readonly code: string;
  
  constructor(code: 'FIREBASE_CLIENT_CONFIG_INCOMPLETE' | 'FIREBASE_CLIENT_USED_ON_SERVER', message: string) {
    super(message);
    this.name = 'FirebaseClientError';
    this.code = code;
  }
}

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
let configWarningLogged = false; // Track if we've already logged the warning

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
 * Get Firebase app instance (legacy - returns null on failure)
 * Initializes Firebase on first call if not already initialized
 * 
 * @deprecated Use getFirebaseClientApp() instead for better error handling
 * @returns {FirebaseApp | null} Firebase app instance or null if not available
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!app && !initialized) {
    initializeFirebaseClient();
  }
  return app;
}

/**
 * Check if Firebase is properly configured
 * Simple boolean check - safe to call anywhere
 * 
 * @returns {boolean} True if all required Firebase env vars are set
 */
export function isFirebaseConfigured(): boolean {
  return hasValidFirebaseClientEnv();
}

/**
 * Get Firebase Client App instance with proper error handling
 * 
 * IMPORTANT: This function MUST only be called in client-side code (browser).
 * Never call this during server-side rendering (SSR) or in server components.
 * 
 * Behavior:
 * - In development: Logs warning once if config is missing, returns null
 * - In production: Returns null silently if config is missing (no throwing, no logging)
 * - On server: Returns null (SSR safety)
 * 
 * @returns {FirebaseApp | null} Firebase app instance or null if not available
 */
export function getFirebaseClientApp(): FirebaseApp | null {
  // Guard: Detect SSR/server-side usage - return null instead of throwing
  if (typeof window === 'undefined') {
    return null;
  }

  // Check configuration before initialization
  if (!hasValidFirebaseClientEnv()) {
    // In development, warn once
    if (process.env.NODE_ENV !== 'production' && !configWarningLogged) {
      console.warn('⚠️  Firebase is not configured. Please check environment variables.');
      logFirebaseConfigStatus('getFirebaseClientApp');
      configWarningLogged = true;
    }
    // In production, silently return null
    return null;
  }

  // Initialize if needed
  if (!app && !initialized) {
    const success = initializeFirebaseClient();
    if (!success || !app) {
      return null;
    }
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
 * Get Auth instance (legacy - returns null on failure)
 * @deprecated Use getFirebaseClientAuth() instead for better error handling
 * @returns {Auth | null} Auth instance or null if not available
 */
export function getFirebaseAuth(): Auth | null {
  if (!auth && !initialized) {
    initializeFirebaseClient();
  }
  return auth;
}

/**
 * Get Firebase Client Auth instance with proper error handling
 * 
 * IMPORTANT: This function MUST only be called in client-side code (browser).
 * Never call this during server-side rendering (SSR) or in server components.
 * 
 * Usage:
 * - Only call in "use client" components
 * - Only call in client-side effects (useEffect)
 * - Only call in event handlers (onClick, onSubmit, etc.)
 * - NEVER call in server components or during SSR
 * 
 * @throws {FirebaseClientError} FIREBASE_CLIENT_USED_ON_SERVER if called on server
 * @throws {FirebaseClientError} FIREBASE_CLIENT_CONFIG_INCOMPLETE if config is missing
 * @returns {Auth} Firebase Auth instance
 */
export function getFirebaseClientAuth(): Auth {
  // Guard: Detect SSR/server-side usage (developer error)
  if (typeof window === 'undefined') {
    throw new FirebaseClientError(
      'FIREBASE_CLIENT_USED_ON_SERVER',
      'Firebase Client Auth cannot be used on the server. This function was called during server-side rendering. ' +
      'Only call Firebase auth functions in "use client" components or client-side effects. ' +
      'For server-side auth operations, use Firebase Admin SDK instead.'
    );
  }

  // Ensure app is initialized first
  const firebaseApp = getFirebaseClientApp();

  // Initialize auth if needed
  if (!auth && !initialized) {
    initializeFirebaseClient();
  }

  if (!auth) {
    throw new FirebaseClientError(
      'FIREBASE_CLIENT_CONFIG_INCOMPLETE',
      'Firebase Auth is not initialized. This may indicate a configuration problem.'
    );
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

/**
 * Firebase Client SDK Initialization
 * 
 * Safe initialization with mock-first approach:
 * - Mock by default to prevent build errors
 * - Only use real Firebase when we're certain we're in runtime
 * - Dynamic imports recommended in API routes for extra safety
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

import {
  firebaseConfig,
  isFirebaseConfigValid
} from './config';

/**
 * Super-safe mock that won't throw if someone calls methods during build
 * This allows modules to be imported without crashing during static analysis
 */
const createMockDocRef = () => ({
  get: async () => ({ exists: false, data: () => null }),
  set: async (_data: any) => {},
  update: async (_data: any) => {},
  delete: async () => {},
  id: 'mock-doc-id',
});

const createMockQuery = (): any => ({
  where: () => createMockQuery(),
  limit: () => createMockQuery(),
  orderBy: () => createMockQuery(),
  startAfter: () => createMockQuery(),
  get: async () => ({ empty: true, docs: [], size: 0 }),
});

const createMockCollectionRef = (): any => ({
  doc: (_id?: string) => createMockDocRef(),
  where: () => createMockQuery(),
  limit: () => createMockQuery(),
  orderBy: () => createMockQuery(),
  startAfter: () => createMockQuery(),
  get: async () => ({ empty: true, docs: [], size: 0 }),
  add: async (_data: any) => createMockDocRef(),
});

const createMockFirestore = (): any => {
  const mockInstance = {
    // Core Firestore properties that modular SDK checks
    type: 'firestore',
    app: null,
    _databaseId: { projectId: 'mock-project', database: '(default)' },
    _settings: {},
    
    // Core methods
    collection: (_name: string) => createMockCollectionRef(),
    doc: (_path: string) => createMockDocRef(),
    runTransaction: async (updateFunction: any) => {
      return updateFunction({
        get: async () => ({ exists: false, data: () => null }),
        set: () => {},
        update: () => {},
        delete: () => {},
      });
    },
    batch: () => ({
      set: () => {},
      update: () => {},
      delete: () => {},
      commit: async () => {},
    }),
    
    // Additional properties the modular SDK might check
    _authCredentials: {},
    _appCheckCredentials: {},
    _queue: { enqueue: () => Promise.resolve() },
    _persistenceKey: '(mock)',
  };
  
  // Make it somewhat prototype-compatible by setting constructor name
  Object.defineProperty(mockInstance, 'constructor', {
    value: { name: 'Firestore' },
    writable: false
  });
  
  return mockInstance;
};

const createMockAuth = (): any => ({
  currentUser: null,
  onAuthStateChanged: () => () => {},
  signInWithEmailAndPassword: async () => ({ user: null }),
  signOut: async () => {},
  createUserWithEmailAndPassword: async () => ({ user: null }),
});

const createMockStorage = (): any => ({
  ref: (_path?: string) => ({
    put: async () => ({ ref: { getDownloadURL: async () => '' } }),
    putString: async () => ({ ref: { getDownloadURL: async () => '' } }),
    delete: async () => {},
    getDownloadURL: async () => '',
  }),
});

// Cached instances
let _app: FirebaseApp | null = null;
let _firestore: Firestore | any = null;
let _auth: Auth | any = null;
let _storage: FirebaseStorage | any = null;
let _initialized = false;
let _useMock = true; // Default to mock

/**
 * Check if we're in a real runtime environment (not build/static analysis)
 * Only return true if we're absolutely certain we're in runtime
 */
const isRuntimeEnvironment = (): boolean => {
  try {
    // Client-side is always runtime
    if (typeof window !== 'undefined') {
      return true;
    }
    
    // Server-side: check for actual runtime indicators
    const isNodeRuntime = process.env.NEXT_RUNTIME === 'nodejs';
    const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge';
    
    // Additional check: if we're in a build phase, definitely not runtime
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' ||
                        process.env.IS_BUILD_PHASE === 'true';
    
    if (isBuildPhase) {
      return false;
    }
    
    // Must have valid config to use real Firebase
    const hasValidConfig = isFirebaseConfigValid();
    
    // Only return true if we have clear runtime indicators AND valid config
    return (isNodeRuntime || isEdgeRuntime) && hasValidConfig;
  } catch {
    // If anything fails, assume not runtime (safe default)
    return false;
  }
};

/**
 * Initialize Firebase (called lazily on first access)
 * Only initializes real Firebase if we're certain we're in runtime
 */
const initializeFirebase = () => {
  // Skip if already initialized
  if (_initialized) {
    return;
  }
  
  _initialized = true;
  
  // Check if we should use real Firebase
  if (!isRuntimeEnvironment()) {
    // Use mock - safe for build/static analysis
    _useMock = true;
    _firestore = createMockFirestore();
    _auth = createMockAuth();
    _storage = createMockStorage();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Firebase: Using mock (build/static analysis mode)');
    }
    return;
  }

  try {
    // Initialize real Firebase
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    _firestore = getFirestore(_app);
    _auth = getAuth(_app);
    _storage = getStorage(_app);
    _useMock = false;

    if (process.env.NODE_ENV === 'development') {
      console.log('Firebase: Initialized successfully (runtime mode)');
    }
  } catch (error) {
    console.error('Error initializing Firebase, falling back to mock:', error);
    // Fall back to mock if initialization fails
    _useMock = true;
    _firestore = createMockFirestore();
    _auth = createMockAuth();
    _storage = createMockStorage();
  }
};

/**
 * Safe getter that always returns a valid Firestore instance (real or mock)
 * Never returns undefined - prevents "Cannot read properties of undefined" errors
 */
const getFirestoreInstance = (): Firestore | any => {
  if (!_firestore) {
    initializeFirebase();
  }
  // Triple-check: always return something, never undefined
  if (!_firestore) {
    console.warn('Firebase: getFirestoreInstance returned null, creating emergency mock');
    return createMockFirestore();
  }
  return _firestore;
};

/**
 * Safe getter for Auth instance
 */
const getAuthInstance = (): Auth | any => {
  if (!_auth) {
    initializeFirebase();
  }
  return _auth || createMockAuth();
};

/**
 * Safe getter for Storage instance
 */
const getStorageInstance = (): FirebaseStorage | any => {
  if (!_storage) {
    initializeFirebase();
  }
  return _storage || createMockStorage();
};

/**
 * Safe getter for App instance
 */
const getAppInstance = (): FirebaseApp | null => {
  if (!_app && !_initialized) {
    initializeFirebase();
  }
  return _app;
};

// Initialize immediately to ensure mock is available
initializeFirebase();

/**
 * Direct exports - always return valid instances (real or mock)
 * These are safe to use at any time, including during build
 */
export const firestore = new Proxy({} as Firestore, {
  get(target, prop) {
    const instance = getFirestoreInstance();
    if (!instance) {
      console.error('Firebase Proxy: instance is null/undefined');
      const emergency = createMockFirestore();
      return emergency[prop as keyof typeof emergency];
    }
    return instance[prop as keyof typeof instance];
  }
});

export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    const instance = getAuthInstance();
    if (!instance) {
      const emergency = createMockAuth();
      return emergency[prop as keyof typeof emergency];
    }
    return instance[prop as keyof typeof instance];
  }
});

export const storage = new Proxy({} as FirebaseStorage, {
  get(target, prop) {
    const instance = getStorageInstance();
    if (!instance) {
      const emergency = createMockStorage();
      return emergency[prop as keyof typeof emergency];
    }
    return instance[prop as keyof typeof instance];
  }
});

export const app = new Proxy({} as FirebaseApp, {
  get(target, prop) {
    const instance = getAppInstance();
    if (!instance) {
      // During build, return undefined for app properties
      return undefined;
    }
    return instance[prop as keyof FirebaseApp];
  }
});

// Alias for backward compatibility
export const db = firestore;

// Named exports for explicit getters
export const getFirebaseApp = getAppInstance;
export const getFirebaseFirestore = getFirestoreInstance;
export const getFirebaseAuth = getAuthInstance;
export const getFirebaseStorage = getStorageInstance;

// Export utility to check if we're using mock
export const isUsingMock = () => _useMock;

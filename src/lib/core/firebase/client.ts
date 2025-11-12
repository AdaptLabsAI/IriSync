'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig, logFirebaseConfig, isFirebaseConfigValid } from './config';

// Log the configuration for debugging
logFirebaseConfig();

let app: FirebaseApp;
let firestore: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

/**
 * Initialize Firebase for client-side use
 * This file should only be imported in client components
 */
try {
  console.log('Initializing Firebase client...');
  
  // Check if environment variables are properly set
  if (!isFirebaseConfigValid()) {
    console.error('Firebase configuration is not valid. Please check your environment variables.');
    console.error('Required: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID');
    console.error('Current config:', {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'set' : 'not set',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'set' : 'not set',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'set' : 'not set',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'set' : 'not set'
    });
  }
  
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  console.log('Firebase app initialized successfully');
  
  firestore = getFirestore(app);
  auth = getAuth(app);
  
  // Set persistence to local (browser) to keep the user logged in
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log('Firebase Auth persistence set to LOCAL');
    })
    .catch((error) => {
      console.error('Error setting auth persistence:', error);
    });
  
  storage = getStorage(app);
  
  // Connect to Auth Emulator in development mode if enabled
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' && process.env.NODE_ENV !== 'production') {
    const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
    connectAuthEmulator(auth, `http://${authEmulatorHost}`);
    console.log('Connected to Firebase Auth Emulator');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // Create placeholders to prevent app from crashing
  app = null as unknown as FirebaseApp;
  firestore = null as unknown as Firestore;
  auth = null as unknown as Auth;
  storage = null as unknown as FirebaseStorage;
}

export { firestore, auth, storage };
export default app;

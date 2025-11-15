'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig, logFirebaseConfig, isFirebaseConfigValid } from './config';
import { getFirebaseConfigDebugInfo } from '@/lib/client/firebaseConfig';

// Log the configuration for debugging
logFirebaseConfig();

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

/**
 * Initialize Firebase for client-side use
 * This file should only be imported in client components
 */
try {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Initializing Firebase client...');
  }
  
  // Check if environment variables are properly set
  if (!isFirebaseConfigValid()) {
    const debugInfo = getFirebaseConfigDebugInfo();
    console.error('Firebase configuration is incomplete.');
    console.error('Missing environment variables:', debugInfo.missing);
    console.error('Present environment variables:', debugInfo.present);
    
    // Don't throw in production - let the app handle it gracefully
    if (process.env.NODE_ENV === 'production') {
      console.error('Firebase will not be initialized. Features requiring Firebase will be unavailable.');
    } else {
      console.error('Please check your .env.local file and ensure all required variables are set.');
    }
  } else {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Firebase app initialized successfully');
    }
    
    firestore = getFirestore(app);
    auth = getAuth(app);
    
    // Set persistence to local (browser) to keep the user logged in
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Firebase Auth persistence set to LOCAL');
        }
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
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // Set to null so we can check for availability
  app = null;
  firestore = null;
  auth = null;
  storage = null;
}

export { firestore, auth, storage };
export default app;

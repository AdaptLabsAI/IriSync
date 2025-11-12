import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

/**
 * Firebase configuration
 * All values should be provided in environment variables
 * Fallback values are provided from environment.md for development
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDlBDjRu1H4jJrMs4SrX8_jf4Ct7c4NyXs',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'irisai-c83a1.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'irisai-c83a1',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'irisai-c83a1.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '232183317678',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:232183317678:web:d74ca5697898ee1b7c193f',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-0VTK29PTKM'
};

// Debug log to help troubleshoot Firebase initialization issues
if (typeof window !== 'undefined') {
  console.log('Firebase config used:', {
    apiKey: firebaseConfig.apiKey ? 'Set' : 'Not set',
    authDomain: firebaseConfig.authDomain ? 'Set' : 'Not set',
    projectId: firebaseConfig.projectId ? 'Set' : 'Not set',
    storageBucket: firebaseConfig.storageBucket ? 'Set' : 'Not set',
    messagingSenderId: firebaseConfig.messagingSenderId ? 'Set' : 'Not set',
    appId: firebaseConfig.appId ? 'Set' : 'Not set',
    measurementId: firebaseConfig.measurementId ? 'Set' : 'Not set'
  });
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
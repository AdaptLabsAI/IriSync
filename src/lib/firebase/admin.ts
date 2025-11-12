import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import * as admin from 'firebase-admin';

// Get Firebase configuration from environment variables
// Important: Logging variable presence for debugging
console.log('Loading Firebase Admin SDK with these environment values:');
console.log(`FIREBASE_ADMIN_PROJECT_ID: ${process.env.FIREBASE_ADMIN_PROJECT_ID ? 'present' : 'missing'}`);
console.log(`NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'present' : 'missing'}`);
console.log(`FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? 'present' : 'missing'}`);

// Initialize Firebase Admin if not already initialized
const initializeFirebaseAdmin = () => {
  try {
    // Skip initialization if already initialized
    if (getApps().length > 0) {
      return;
    }
    
    // Use project ID from either admin or public variable
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || 
                      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
                      process.env.FIREBASE_PROJECT_ID;
    
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 
                        process.env.FIREBASE_CLIENT_EMAIL;
    
    // Safely replace newlines in private key if it exists
    let privateKey: string | undefined;
    const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    if (rawPrivateKey) {
      privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    }
      
    const storageBucket = process.env.FIREBASE_ADMIN_STORAGE_BUCKET || 
                          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
                          process.env.FIREBASE_STORAGE_BUCKET;
    
    // Log configuration for debugging (without exposing sensitive data)
    console.log('Firebase Admin configuration:', {
      projectId: projectId || 'not set',
      clientEmail: clientEmail ? 'set' : 'not set',
      privateKey: privateKey ? `set (length: ${privateKey.length})` : 'not set',
      storageBucket: storageBucket || 'not set'
    });

    // Check if all required environment variables are present
    if (!projectId || !clientEmail || !privateKey) {
      console.error('Missing required Firebase Admin environment variables:',
        {
          projectIdMissing: !projectId,
          clientEmailMissing: !clientEmail,
          privateKeyMissing: !privateKey
        }
      );
      throw new Error('Firebase Admin SDK is missing required environment variables');
    }
    
    // Initialize app with credentials
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Failed to initialize Firebase Admin SDK');
  }
};

// Initialize on module load
initializeFirebaseAdmin();

// Export Firestore service with error handling
export const getFirestore = () => {
  try {
    return getAdminFirestore();
  } catch (error) {
    console.error('Error accessing Firestore admin:', error);
    throw new Error('Firestore admin is not available');
  }
};

// Export Auth service with error handling
export const getAuth = () => {
  try {
    return getAdminAuth();
  } catch (error) {
    console.error('Error accessing Auth admin:', error);
    throw new Error('Auth admin is not available');
  }
};

// Export Storage service with error handling
export const getStorage = () => {
  try {
    return getAdminStorage();
  } catch (error) {
    console.error('Error accessing Storage admin:', error);
    throw new Error('Storage admin is not available');
  }
};

// Firestore field value helpers
export const serverTimestamp = () => FieldValue.serverTimestamp();
export const timestamp = (date: Date) => Timestamp.fromDate(date);
export const increment = (amount: number) => FieldValue.increment(amount);
export const arrayUnion = (...elements: any[]) => FieldValue.arrayUnion(...elements);
export const arrayRemove = (...elements: any[]) => FieldValue.arrayRemove(...elements);
export const deleteField = () => FieldValue.delete();

// Batch processing helper
export const createBatch = () => {
  try {
    return getAdminFirestore().batch();
  } catch (error) {
    console.error('Error creating Firestore batch:', error);
    throw new Error('Failed to create Firestore batch');
  }
};

// Transaction helper
export const runTransaction = async (updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<any>) => {
  try {
    return await getAdminFirestore().runTransaction(updateFunction);
  } catch (error) {
    console.error('Error running Firestore transaction:', error);
    throw new Error('Failed to run Firestore transaction');
  }
};

// Document and collection reference helpers
export const doc = (path: string) => {
  try {
    return getAdminFirestore().doc(path);
  } catch (error) {
    console.error(`Error creating document reference for path ${path}:`, error);
    throw new Error(`Failed to create document reference for path ${path}`);
  }
};

export const collection = (path: string) => {
  try {
    return getAdminFirestore().collection(path);
  } catch (error) {
    console.error(`Error creating collection reference for path ${path}:`, error);
    throw new Error(`Failed to create collection reference for path ${path}`);
  }
};

// Pre-initialized instances for convenience
export const firestore = getFirestore();
export const auth = getAuth();
export const storage = getStorage();

// Export the full admin object for advanced use cases
export const firebaseAdmin = admin;
export default admin;
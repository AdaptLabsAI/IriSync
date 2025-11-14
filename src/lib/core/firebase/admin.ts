import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import * as admin from 'firebase-admin';

type ServiceAccount = {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
};

/**
 * Check if we're in a build environment where Firebase may not be available
 */
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                    (process.env.NODE_ENV === 'production' && !process.env.FIREBASE_ADMIN_PROJECT_ID && !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const stripWrappingQuotes = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
};

const normalizePrivateKey = (key?: string) => {
  if (!key) {
    return undefined;
  }

  return stripWrappingQuotes(key)?.replace(/\\n/g, '\n');
};

const parseServiceAccountJson = (): ServiceAccount | undefined => {
  const raw =
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_ADMIN_CREDENTIALS;

  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  } catch (error) {
    console.error('Failed to parse Firebase Admin service account JSON', error);
    return undefined;
  }
};

const decodeBase64PrivateKey = () => {
  const base64Value =
    stripWrappingQuotes(process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64) ||
    stripWrappingQuotes(process.env.FIREBASE_PRIVATE_KEY_BASE64);

  if (!base64Value) {
    return undefined;
  }

  try {
    return Buffer.from(base64Value, 'base64').toString('utf8');
  } catch (error) {
    console.error('Failed to decode Firebase Admin private key from base64', error);
    return undefined;
  }
};

const resolveFirebaseAdminConfig = () => {
  const serviceAccount = parseServiceAccountJson();

  const projectId =
    stripWrappingQuotes(process.env.FIREBASE_ADMIN_PROJECT_ID) ||
    stripWrappingQuotes(process.env.FIREBASE_PROJECT_ID) ||
    stripWrappingQuotes(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) ||
    stripWrappingQuotes(process.env.GOOGLE_CLOUD_PROJECT) ||
    stripWrappingQuotes(process.env.GCLOUD_PROJECT) ||
    serviceAccount?.projectId;

  const clientEmail =
    stripWrappingQuotes(process.env.FIREBASE_ADMIN_CLIENT_EMAIL) ||
    stripWrappingQuotes(process.env.FIREBASE_CLIENT_EMAIL) ||
    serviceAccount?.clientEmail;

  let privateKey =
    normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY) ||
    normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY) ||
    serviceAccount?.privateKey;

  if (!privateKey) {
    privateKey = decodeBase64PrivateKey() || serviceAccount?.privateKey;
  }

  if (privateKey) {
    privateKey = normalizePrivateKey(privateKey);
  }

  const storageBucket =
    stripWrappingQuotes(process.env.FIREBASE_ADMIN_STORAGE_BUCKET) ||
    stripWrappingQuotes(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) ||
    stripWrappingQuotes(process.env.FIREBASE_STORAGE_BUCKET);

  return {
    projectId,
    clientEmail,
    privateKey,
    storageBucket,
  };
};

const logFirebaseConfigState = () => {
  const { projectId, clientEmail, privateKey } = resolveFirebaseAdminConfig();

  console.log('Loading Firebase Admin SDK with these environment values:');
  console.log(`Project ID present: ${projectId ? 'yes' : 'no'}`);
  console.log(`Client email present: ${clientEmail ? 'yes' : 'no'}`);
  console.log(`Private key present: ${privateKey ? 'yes' : 'no'}`);
};

// Track initialization state
let initializationAttempted = false;
let initializationSuccess = false;

// Initialize Firebase Admin if not already initialized
const initializeFirebaseAdmin = () => {
  // Skip if we're in build time
  if (isBuildTime) {
    console.warn('Skipping Firebase Admin initialization - build time or missing required env vars');
    return;
  }

  // Skip if already attempted
  if (initializationAttempted) {
    return;
  }

  initializationAttempted = true;
  logFirebaseConfigState();

  try {
    // Skip initialization if already initialized
    if (getApps().length > 0) {
      initializationSuccess = true;
      return;
    }

    const { projectId, clientEmail, privateKey, storageBucket } = resolveFirebaseAdminConfig();

    // Log configuration for debugging (without exposing sensitive data)
    console.log('Firebase Admin configuration:', {
      projectId: projectId || 'not set',
      clientEmail: clientEmail ? 'set' : 'not set',
      privateKey: privateKey ? `set (length: ${privateKey.length})` : 'not set',
      storageBucket: storageBucket || 'not set',
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
      console.warn('Firebase Admin SDK will not be available - required environment variables are missing');
      return; // Don't throw during initialization
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
    
    initializationSuccess = true;
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    console.warn('Firebase Admin SDK will not be available');
    // Don't throw - let the app handle missing Firebase gracefully
  }
};

// Initialize on module load (will skip during build)
initializeFirebaseAdmin();

// Export Firestore service with error handling
export const getFirestore = () => {
  if (!initializationSuccess) {
    throw new Error('Firebase Admin is not initialized. Please check your environment variables.');
  }
  try {
    return getAdminFirestore();
  } catch (error) {
    console.error('Error accessing Firestore admin:', error);
    throw new Error('Firestore admin is not available');
  }
};

// Export Auth service with error handling
export const getAuth = () => {
  if (!initializationSuccess) {
    throw new Error('Firebase Admin is not initialized. Please check your environment variables.');
  }
  try {
    return getAdminAuth();
  } catch (error) {
    console.error('Error accessing Auth admin:', error);
    throw new Error('Auth admin is not available');
  }
};

// Export Storage service with error handling
export const getStorage = () => {
  if (!initializationSuccess) {
    throw new Error('Firebase Admin is not initialized. Please check your environment variables.');
  }
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
  if (!initializationSuccess) {
    throw new Error('Firebase Admin is not initialized. Please check your environment variables.');
  }
  try {
    return getAdminFirestore().batch();
  } catch (error) {
    console.error('Error creating Firestore batch:', error);
    throw new Error('Failed to create Firestore batch');
  }
};

// Transaction helper
export const runTransaction = async (updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<any>) => {
  if (!initializationSuccess) {
    throw new Error('Firebase Admin is not initialized. Please check your environment variables.');
  }
  try {
    return await getAdminFirestore().runTransaction(updateFunction);
  } catch (error) {
    console.error('Error running Firestore transaction:', error);
    throw new Error('Failed to run Firestore transaction');
  }
};

// Document and collection reference helpers
export const doc = (path: string) => {
  if (!initializationSuccess) {
    throw new Error('Firebase Admin is not initialized. Please check your environment variables.');
  }
  try {
    return getAdminFirestore().doc(path);
  } catch (error) {
    console.error(`Error creating document reference for path ${path}:`, error);
    throw new Error(`Failed to create document reference for path ${path}`);
  }
};

export const collection = (path: string) => {
  if (!initializationSuccess) {
    throw new Error('Firebase Admin is not initialized. Please check your environment variables.');
  }
  try {
    return getAdminFirestore().collection(path);
  } catch (error) {
    console.error(`Error creating collection reference for path ${path}:`, error);
    throw new Error(`Failed to create collection reference for path ${path}`);
  }
};

// Lazy-initialized instances for convenience (will be initialized on first access)
// These should not be accessed during module load - only at runtime
// Note: These are not truly lazy in this form, so we export null during build
export const firestore = null;
export const auth = null;
export const storage = null;

// Export the full admin object for advanced use cases
export const firebaseAdmin = admin;
export default admin;
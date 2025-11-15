import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from '../logging/logger';

/**
 * Check if we're in a build environment
 */
const isBuildTime = 
  process.env.NEXT_PHASE === 'phase-production-build' || 
  process.env.IS_BUILD_PHASE === 'true';

/**
 * Initialize Firebase Admin SDK if it hasn't been initialized yet
 */
function initializeFirebaseAdmin() {
  // Skip if we're in build time
  if (isBuildTime) {
    return;
  }
  
  try {
    if (getApps().length === 0) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : undefined;

      initializeApp({
        credential: serviceAccount 
          ? cert(serviceAccount) 
          : undefined,
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
  } catch (error) {
    logger.error('Error initializing Firebase Admin SDK', { error });
    // Don't throw during initialization, let functions handle it
  }
}

/**
 * Get Firestore instance
 */
export function getFirestoreDb(): Firestore {
  // During build, return a mock Firestore instance
  if (isBuildTime) {
    const mockCollection: any = {
      add: async () => ({ id: 'mock-id' }),
      doc: () => mockDoc,
      get: async () => ({ empty: true, docs: [], size: 0, forEach: () => {} }),
      where: () => mockCollection,
      orderBy: () => mockCollection,
      limit: () => mockCollection,
    };
    const mockDoc: any = {
      get: async () => ({ exists: false, data: () => null, id: 'mock-id' }),
      set: async () => {},
      update: async () => {},
      delete: async () => {},
      id: 'mock-doc-id',
    };
    const mockFirestore: any = {
      collection: () => mockCollection,
      doc: () => mockDoc,
      batch: () => ({
        set: () => {},
        update: () => {},
        delete: () => {},
        commit: async () => {},
      }),
      runTransaction: async (callback: any) => {
        return callback({
          get: async () => ({ exists: false, data: () => null }),
          set: () => {},
          update: () => {},
          delete: () => {},
        });
      },
    };
    return mockFirestore as any;
  }
  
  try {
    initializeFirebaseAdmin();
    return getFirestore();
  } catch (error) {
    logger.error('Error getting Firestore instance', { error });
    throw new Error('Failed to get Firestore instance');
  }
}

// Lazy initialization - only get db when actually used, not at module load time
let _db: Firestore | null = null;
export const db = new Proxy({} as Firestore, {
  get(target, prop) {
    if (!_db) {
      _db = getFirestoreDb();
    }
    return (_db as any)[prop];
  }
});

/**
 * Firestore Document Reference type
 */
export type DocRef = FirebaseFirestore.DocumentReference;

/**
 * Firestore Collection Reference type
 */
export type CollectionRef = FirebaseFirestore.CollectionReference;

/**
 * Firestore Query type
 */
export type Query = FirebaseFirestore.Query;

/**
 * Firestore Timestamp type
 */
export { Timestamp };

/**
 * Firestore FieldValue type for server timestamps, increments, etc.
 */
export { FieldValue };

/**
 * Convert Firestore document to a typed object with ID
 */
export function convertDoc<T>(doc: FirebaseFirestore.DocumentSnapshot): T & { id: string } | null {
  if (!doc.exists) {
    return null;
  }
  
  return {
    id: doc.id,
    ...doc.data(),
  } as T & { id: string };
}

/**
 * Convert Firestore query snapshot to an array of typed objects with IDs
 */
export function convertDocs<T>(
  snapshot: FirebaseFirestore.QuerySnapshot
): Array<T & { id: string }> {
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as T & { id: string }));
}

/**
 * Create a document in Firestore
 */
export async function createDoc<T extends Record<string, any>>(
  collection: string, 
  data: T, 
  id?: string
): Promise<string> {
  try {
    const db = getFirestoreDb();
    const collectionRef = db.collection(collection);
    
    // If ID is provided, set the document with that ID
    if (id) {
      await collectionRef.doc(id).set(data);
      return id;
    }
    
    // Otherwise, add a new document with auto-generated ID
    const docRef = await collectionRef.add(data);
    return docRef.id;
  } catch (error) {
    logger.error('Error creating Firestore document', { collection, error });
    throw new Error('Failed to create document in Firestore');
  }
}

/**
 * Update a document in Firestore
 */
export async function updateDoc<T>(
  collection: string, 
  id: string, 
  data: Partial<T>
): Promise<void> {
  try {
    const db = getFirestoreDb();
    await db.collection(collection).doc(id).update(data);
  } catch (error) {
    logger.error('Error updating Firestore document', { collection, id, error });
    throw new Error('Failed to update document in Firestore');
  }
}

/**
 * Delete a document from Firestore
 */
export async function deleteDoc(
  collection: string, 
  id: string
): Promise<void> {
  try {
    const db = getFirestoreDb();
    await db.collection(collection).doc(id).delete();
  } catch (error) {
    logger.error('Error deleting Firestore document', { collection, id, error });
    throw new Error('Failed to delete document from Firestore');
  }
}

/**
 * Get a document from Firestore
 */
export async function getDoc<T>(
  collection: string, 
  id: string
): Promise<T & { id: string } | null> {
  try {
    const db = getFirestoreDb();
    const docSnapshot = await db.collection(collection).doc(id).get();
    return convertDoc<T>(docSnapshot);
  } catch (error) {
    logger.error('Error getting Firestore document', { collection, id, error });
    throw new Error('Failed to get document from Firestore');
  }
}

/**
 * Query documents from Firestore
 */
export async function queryDocs<T>(
  collection: string,
  constraints: Array<{
    field: string;
    operator: FirebaseFirestore.WhereFilterOp;
    value: any;
  }>,
  orderBy?: { field: string; direction: 'asc' | 'desc' },
  limit?: number
): Promise<Array<T & { id: string }>> {
  try {
    const db = getFirestoreDb();
    let query = db.collection(collection) as FirebaseFirestore.Query;
    
    // Apply where clauses
    constraints.forEach(constraint => {
      query = query.where(constraint.field, constraint.operator, constraint.value);
    });
    
    // Apply order by if specified
    if (orderBy) {
      query = query.orderBy(orderBy.field, orderBy.direction);
    }
    
    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }
    
    const querySnapshot = await query.get();
    return convertDocs<T>(querySnapshot);
  } catch (error) {
    logger.error('Error querying Firestore documents', { collection, error });
    throw new Error('Failed to query documents from Firestore');
  }
} 
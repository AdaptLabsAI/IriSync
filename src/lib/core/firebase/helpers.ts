/**
 * Firebase Firestore Helpers
 *
 * Utility functions to safely access Firestore with null checks
 */

import { getFirebaseFirestore } from './index';
import { Firestore } from 'firebase/firestore';

/**
 * Get Firestore instance or throw error if not configured
 *
 * Use this in services and library code where Firestore is required
 */
export function requireFirestore(): Firestore {
  const firestore = getFirebaseFirestore();
  if (!firestore) {
    throw new Error('Firestore not configured');
  }
  return firestore;
}

/**
 * Get Firestore instance or return null if not configured
 *
 * Use this in UI components and pages where Firestore may be optional
 */
export function getFirestore(): Firestore | null {
  return getFirebaseFirestore();
}

/**
 * Execute a Firestore operation with automatic null check
 *
 * @example
 * const posts = await withFirestore(async (db) => {
 *   const ref = collection(db, 'posts');
 *   return await getDocs(ref);
 * });
 */
export async function withFirestore<T>(
  operation: (firestore: Firestore) => Promise<T>
): Promise<T> {
  const firestore = requireFirestore();
  return await operation(firestore);
}

/**
 * Execute a Firestore operation with error handling
 *
 * @example
 * const result = await safeFirestoreOp(async (db) => {
 *   return await getDoc(doc(db, 'users', userId));
 * }, null); // Returns null on error
 */
export async function safeFirestoreOp<T>(
  operation: (firestore: Firestore) => Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      console.warn('Firestore not configured');
      return defaultValue;
    }
    return await operation(firestore);
  } catch (error) {
    console.error('Firestore operation failed:', error);
    return defaultValue;
  }
}

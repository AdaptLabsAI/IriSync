/**
 * Firebase Client SDK - Main Entry Point
 * 
 * This file re-exports from the centralized Firebase client initialization.
 * 
 * IMPORTANT: Firebase initialization is now centralized in client.ts
 * This file exists for backward compatibility with existing imports.
 * 
 * For new code, prefer importing directly from './client' for clarity.
 */

export {
  getFirebaseApp,
  getFirebaseClientApp,
  getFirebaseFirestore,
  getFirebaseAuth,
  getFirebaseClientAuth,
  getFirebaseStorage,
  FirebaseClientError,
  firestore,
  auth,
  storage,
} from './client';

export { default as app } from './client';

// Alias for backward compatibility
export { firestore as db } from './client';

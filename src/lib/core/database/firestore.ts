// Firestore helper utilities
export * from '../firebase/admin';
export { firestore as db } from '../firebase/admin';

// Helper functions for common Firestore operations
export async function getDoc(docRef: FirebaseFirestore.DocumentReference) {
  const snapshot = await docRef.get();
  return snapshot;
}

export async function updateDoc(docRef: FirebaseFirestore.DocumentReference, data: any) {
  await docRef.update(data);
}

export async function queryDocs(query: FirebaseFirestore.Query) {
  const snapshot = await query.get();
  return snapshot;
}

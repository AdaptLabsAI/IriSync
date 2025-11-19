import { getAuth, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';

/**
 * Validates that a user has a profile in Firestore.
 * This function now only checks for existence and logs warnings.
 * User creation should be handled by the centralized UserService.
 */
export async function ensureUserProfile(userAuth: User): Promise<boolean> {
  try {
    if (!firestore) {
      console.error('Firestore is not initialized');
      return false;
    }
    
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const userRef = doc(firestore, 'users', userAuth.uid);
    const userSnapshot = await getDoc(userRef);
    
    // If user document doesn't exist, log a warning instead of creating
    if (!userSnapshot.exists()) {
      console.warn(`User profile not found for ${userAuth.uid}. This should have been created during registration.`);
      
      // Return false to indicate the profile doesn't exist
      // The calling code should handle this by redirecting to registration or using UserService
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating user profile:', error);
    return false;
  }
}

/**
 * Gets a user's profile data from Firestore
 */
export async function getUserProfile(userId: string) {
  try {
    if (!firestore) {
      throw new Error('Firestore is not initialized');
    }
    
    const userRef = doc(firestore, 'users', userId);
    const userSnapshot = await getDoc(userRef);
    
    if (userSnapshot.exists()) {
      return {
        uid: userId,
        ...userSnapshot.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Updates a user's profile in Firestore
 */
export async function updateUserProfile(userId: string, profileData: any) {
  try {
    if (!firestore) {
      throw new Error('Firestore is not initialized');
    }
    
    const userRef = doc(firestore, 'users', userId);
    
    await setDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
} 
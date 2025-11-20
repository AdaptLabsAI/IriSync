'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  UserCredential,
  updateProfile
} from 'firebase/auth';
import { auth, getFirebaseFirestore } from '@/lib/core/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Register a new user with Firebase Authentication using email and password
 * @param email User's email
 * @param password User's password
 * @param firstName User's first name
 * @param lastName User's last name
 * @param additionalData Additional user data to store in Firestore
 * @returns Promise with user credentials
 */
export const registerWithEmailAndPassword = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  additionalData: Record<string, any> = {}
): Promise<UserCredential> => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update the user profile
    await updateProfile(userCredential.user, {
      displayName: `${firstName} ${lastName}`
    });

    // Create user document in Firestore
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Database not configured');

    await setDoc(doc(firestore, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      firstName,
      lastName,
      email,
      name: `${firstName} ${lastName}`,
      role: 'user',
      provider: 'credentials',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      termsAccepted: additionalData.acceptTerms || true,
      subscriptionTier: additionalData.subscriptionTier || null,
      subscriptionStatus: 'pending_setup',
      tokenBalance: 0, // No free tokens
      storageUsed: 0,
      storageQuota: 0, // No storage without subscription
      businessType: additionalData.businessType || 'individual',
      companyName: additionalData.companyName || '',
      companySize: additionalData.companySize || 'N/A',
      lastLogin: serverTimestamp(),
      requiresSubscription: true // Flag to indicate subscription is required
    });

    // Create user settings
    await setDoc(doc(firestore, 'userSettings', userCredential.user.uid), {
      userId: userCredential.user.uid,
      theme: 'light',
      emailNotifications: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return userCredential;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Sign in with email and password using Firebase Authentication
 * @param email User's email
 * @param password User's password
 * @returns Promise with user credentials
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign in with Google using Firebase Authentication
 * @returns Promise with user credentials
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    // Check if this is a new user (first login)
    // We can determine this by checking if the creation time is close to the current time
    const isNewUser = 
      new Date().getTime() - new Date(userCredential.user.metadata.creationTime || 0).getTime() < 10000;
    
    if (isNewUser) {
      // Create or update user document in Firestore
      const firestore = getFirebaseFirestore();
      if (!firestore) throw new Error('Database not configured');

      await setDoc(doc(firestore, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: userCredential.user.displayName,
        firstName: userCredential.user.displayName?.split(' ')[0] || '',
        lastName: userCredential.user.displayName?.split(' ').slice(1).join(' ') || '',
        image: userCredential.user.photoURL,
        role: 'user',
        provider: 'google',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        termsAccepted: true,
        subscriptionTier: null,
        subscriptionStatus: 'pending_setup',
        tokenBalance: 0, // No free tokens
        storageUsed: 0,
        storageQuota: 0, // No storage without subscription
        lastLogin: serverTimestamp(),
        requiresSubscription: true // Flag to indicate subscription is required
      }, { merge: true });
      
      // Create user settings if it's a new user
      await setDoc(doc(firestore, 'userSettings', userCredential.user.uid), {
        userId: userCredential.user.uid,
        theme: 'light',
        emailNotifications: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    
    return userCredential;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

/**
 * Send password reset email using Firebase Authentication
 * @param email User's email
 * @returns Promise
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    return await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

/**
 * Sign out the current user from Firebase Authentication
 * @returns Promise
 */
export const signOut = async (): Promise<void> => {
  try {
    return await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Get the current authenticated user
 * @returns Current user or null if not authenticated
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Error handling helper for Firebase Authentication errors
 * @param error Firebase authentication error
 * @returns User-friendly error message
 */
export const getFirebaseErrorMessage = (error: any): string => {
  const errorCode = error.code;
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already in use by another account.';
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters with a mix of letters, numbers, and symbols.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed login attempts. Try again later or reset your password.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed. Contact support.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing the sign-in process.';
    default:
      return 'An error occurred during authentication. Try again.';
  }
}; 
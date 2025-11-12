'use client';

import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseResetPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification as firebaseSendEmailVerification,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  User,
  UserCredential,
  applyActionCode,
  confirmPasswordReset
} from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase/client';
import { doc, setDoc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { sendWelcomeEmail, sendPasswordResetEmail, sendEmail } from '@/lib/notifications/email';

/**
 * Custom email verification template data
 */
interface EmailVerificationData {
  displayName: string;
  verificationLink: string;
}

/**
 * Send a custom email verification message using our email templates
 * @param user The Firebase user to send verification to
 * @returns Promise with success status
 */
async function sendCustomEmailVerification(user: User): Promise<boolean> {
  try {
    // First, get the Firebase verification token
    await firebaseSendEmailVerification(user);
    
    // However, we'll intercept the email process and send our own custom template
    // Firebase Admin SDK (server-side) would be used to generate a custom action link
    // For client-side, we need to request our API to do this for us
    
    const response = await fetch('/api/auth/email-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Email verification API error:', errorData);
      throw new Error(errorData.error || 'Failed to send custom verification email');
    }
    
    return true;
  } catch (error) {
    console.error('Email verification error:', error);
    return false;
  }
}

/**
 * Register a new user with email/password
 * Uses Firebase for authentication but our custom email templates
 */
export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  additionalData: Record<string, any> = {}
): Promise<{success: boolean; user?: User; error?: string}> {
  try {
    // Create user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update user profile with display name
    const displayName = `${firstName} ${lastName}`;
    await updateProfile(user, { displayName });
    
    // Create user document in Firestore
    await setDoc(doc(firestore, 'users', user.uid), {
      uid: user.uid,
      firstName,
      lastName,
      email,
      name: displayName,
      role: 'user',
      provider: 'credentials',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      termsAccepted: additionalData.acceptTerms || true,
      subscriptionTier: additionalData.subscriptionTier || 'free',
      subscriptionStatus: additionalData.subscriptionTier ? 'pending' : 'active',
      tokenBalance: additionalData.tokenBalance || 100,
      storageUsed: 0,
      storageQuota: additionalData.storageQuota || 104857600, // 100MB default
      businessType: additionalData.businessType || 'individual',
      companyName: additionalData.companyName || '',
      companySize: additionalData.companySize || 'N/A',
      lastLogin: serverTimestamp(),
      emailVerified: false,
    });
    
    // Create user settings
    await setDoc(doc(firestore, 'userSettings', user.uid), {
      userId: user.uid,
      theme: 'light',
      emailNotifications: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Send custom email verification
    const verificationSent = await sendCustomEmailVerification(user);
    
    if (!verificationSent) {
      console.warn('Failed to send verification email, but user was created successfully');
    }
    
    // Send welcome email
    await sendWelcomeEmail(email, displayName);
    
    return { success: true, user };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { 
      success: false, 
      error: getFirebaseErrorMessage(error)
    };
  }
}

/**
 * Login with email/password
 * Uses Firebase Authentication
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<{success: boolean; user?: User; error?: string}> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update the user's last login time in Firestore
    const userRef = doc(firestore, 'users', userCredential.user.uid);
    await updateDoc(userRef, {
      lastLogin: serverTimestamp()
    });
    
    // Set a session cookie for middleware to detect
    const idToken = await userCredential.user.getIdToken();
    document.cookie = `firebase-session-token=${idToken}; path=/; max-age=86400; SameSite=Strict; Secure`;
    
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: getFirebaseErrorMessage(error)
    };
  }
}

/**
 * Sign in with Google
 * Uses Firebase Authentication but adds our custom data
 */
export async function loginWithGoogle(): Promise<{success: boolean; user?: User; error?: string}> {
  try {
    const provider = new GoogleAuthProvider();
    
    // Add scopes to request
    provider.addScope('profile');
    provider.addScope('email');
    
    // Set custom parameters for the auth provider
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    
    // Check if this is a new user (first login)
    // We need to check Firestore too because the metadata might not be accurate
    // if the user was deleted and recreated
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    const isNewUser = !userDoc.exists();
    
    if (isNewUser) {
      // Parse name components from display name
      const firstName = user.displayName?.split(' ')[0] || '';
      const lastName = user.displayName?.split(' ').slice(1).join(' ') || '';
      
      // Create or update user document in Firestore
      await setDoc(doc(firestore, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        firstName,
        lastName,
        image: user.photoURL,
        role: 'user',
        provider: 'google',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        termsAccepted: true,
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        tokenBalance: 100,
        storageUsed: 0,
        storageQuota: 104857600, // 100MB
        lastLogin: serverTimestamp(),
        emailVerified: user.emailVerified,
      }, { merge: true });
      
      // Create user settings if it's a new user
      await setDoc(doc(firestore, 'userSettings', user.uid), {
        userId: user.uid,
        theme: 'light',
        emailNotifications: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      // Send welcome email for new Google users
      if (user.email) {
        await sendWelcomeEmail(user.email, user.displayName || 'User');
      }
    } else {
      // Update last login time for existing users
      await updateDoc(userDocRef, {
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emailVerified: user.emailVerified
      });
    }
    
    // Set a session cookie for middleware to detect
    const idToken = await user.getIdToken();
    document.cookie = `firebase-session-token=${idToken}; path=/; max-age=86400; SameSite=Strict; Secure`;
    
    return { success: true, user };
  } catch (error: any) {
    console.error('Google login error:', error);
    
    // Check for specific Google Auth errors
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      return { 
        success: false, 
        error: 'Sign-in was cancelled. Please try again.'
      };
    }
    
    if (error.code === 'auth/popup-blocked') {
      return { 
        success: false, 
        error: 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.'
      };
    }
    
    if (error.code === 'auth/unauthorized-domain') {
      return { 
        success: false, 
        error: 'This domain is not authorized for Google authentication. Please contact support.'
      };
    }
    
    return { 
      success: false, 
      error: getFirebaseErrorMessage(error)
    };
  }
}

/**
 * Send a password reset email using our custom templates
 */
export async function sendPasswordResetRequest(email: string): Promise<{success: boolean; error?: string}> {
  try {
    // First use Firebase to handle the authentication part
    await firebaseResetPassword(auth, email);
    
    // Then, request our API to send a custom email with our template
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(data.error || 'Failed to send password reset email');
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return { 
      success: false, 
      error: getFirebaseErrorMessage(error)
    };
  }
}

/**
 * Complete password reset with the code from email
 */
export async function completePasswordReset(code: string, newPassword: string): Promise<{success: boolean; error?: string}> {
  try {
    await confirmPasswordReset(auth, code, newPassword);
    return { success: true };
  } catch (error: any) {
    console.error('Password reset completion error:', error);
    return { 
      success: false, 
      error: getFirebaseErrorMessage(error) 
    };
  }
}

/**
 * Verify email with the code from the verification email
 */
export async function verifyEmail(code: string): Promise<{success: boolean; error?: string}> {
  try {
    await applyActionCode(auth, code);
    
    // Also update the user document in Firestore
    if (auth.currentUser) {
      const userRef = doc(firestore, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        emailVerified: true,
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Email verification error:', error);
    return { 
      success: false, 
      error: getFirebaseErrorMessage(error)
    };
  }
}

/**
 * Resend verification email to current user
 */
export async function resendVerificationEmail(): Promise<{success: boolean; error?: string}> {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    
    if (user.emailVerified) {
      throw new Error('Email is already verified');
    }
    
    const verificationSent = await sendCustomEmailVerification(user);
    
    if (!verificationSent) {
      throw new Error('Failed to send verification email');
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Resend verification error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to resend verification email'
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<boolean> {
  try {
    await firebaseSignOut(auth);
    return true;
  } catch (error) {
    console.error('Sign out error:', error);
    return false;
  }
}

/**
 * Get user-friendly error messages for Firebase errors
 */
export function getFirebaseErrorMessage(error: any): string {
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
    case 'auth/expired-action-code':
      return 'This link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'This link is invalid. It may have been used already or was incorrectly formatted.';
    case 'auth/invalid-credential':
      return 'The provided credential is invalid or has expired.';
    case 'auth/invalid-verification-code':
      return 'The verification code is invalid.';
    case 'auth/missing-verification-code':
      return 'The verification code is missing.';
    case 'auth/quota-exceeded':
      return 'Operation quota exceeded. Please try again later.';
    case 'auth/requires-recent-login':
      return 'This operation requires a recent login. Please log out and log back in.';
    default:
      if (error?.message) {
        return error.message;
      }
      return 'An error occurred during authentication. Try again.';
  }
} 
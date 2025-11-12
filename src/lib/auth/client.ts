import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/core/firebase/client';
import { getSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

/**
 * Sign in a user with email and password
 * This will use Firebase Auth directly and then sync with our session
 */
export async function signIn(email: string, password: string) {
  try {
    // First, sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Get the ID token
    const idToken = await userCredential.user.getIdToken();
    
    // Call our API to sync the session
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      // If API call fails, sign out from Firebase and throw error
      await firebaseSignOut(auth);
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to sign in');
    }
    
    // Also sign in with NextAuth to sync sessions
    await nextAuthSignIn('credentials', {
      email,
      password,
      redirect: false,
    });
    
    // Ensure the user has a Firestore document
    await ensureUserDocument();
    
    return await response.json();
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Register a new user
 */
export async function register(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  companySize: string;
  acceptTerms: boolean;
}) {
  try {
    // Call our API to register the user
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to register');
    }
    
    const data = await response.json();
    
    // If registration was successful, also sign in with NextAuth
    if (data.success) {
      await nextAuthSignIn('credentials', {
        email: userData.email,
        password: userData.password,
        redirect: false,
      });
    }
    
    // Ensure the user has a Firestore document
    await ensureUserDocument();
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Sign out the user from both Firebase Auth and NextAuth
 */
export async function signOut() {
  try {
    // Sign out from Firebase Auth
    await firebaseSignOut(auth);
    
    // Call our API to clear the session
    await fetch('/api/auth/logout', {
      method: 'POST',
    });
    
    // Also sign out from NextAuth
    await nextAuthSignOut({ redirect: false });
    
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Ensure the current user has a Firestore document
 */
export async function ensureUserDocument(forceUpdate = false) {
  try {
    // Only attempt if there is a signed-in user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }
    
    // Call our API to ensure user document exists
    const response = await fetch('/api/auth/ensure-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await currentUser.getIdToken()}`
      },
      body: JSON.stringify({
        forceUpdate
      })
    });
    
    if (!response.ok) {
      console.error('Failed to ensure user document:', await response.text());
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error ensuring user document:', error);
    return null;
  }
}

/**
 * Request a password reset
 */
export async function requestPasswordReset(email: string) {
  try {
    // Use Firebase Auth's built-in password reset function
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/auth/login`,
      handleCodeInApp: false,
    });
    
    // Also notify our API for logging purposes
    await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    return {
      success: true,
      message: 'If your email is registered, you will receive a password reset link'
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    // Don't expose the error details to maintain security
    return {
      success: true,
      message: 'If your email is registered, you will receive a password reset link'
    };
  }
}

/**
 * Get the current user from both session sources
 */
export async function getCurrentUser() {
  try {
    // Try to get the NextAuth session
    const session = await getSession();
    
    if (session?.user) {
      return session.user;
    }
    
    // If no NextAuth session, try Firebase Auth
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      // Get user data from our API
      const response = await fetch('/api/settings/profile', {
        headers: {
          Authorization: `Bearer ${await currentUser.getIdToken()}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
} 
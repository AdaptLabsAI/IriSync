'use client';

import { getAuth, signInWithPopup, GoogleAuthProvider, Auth } from 'firebase/auth';
import { FirebaseApp } from 'firebase/app';
import app from '@/lib/core/firebase/client';
import { firebaseConfig, isFirebaseConfigValid, getFirebaseConfigDebugInfo } from '@/lib/core/firebase/config';

/**
 * Debug Google Authentication configuration
 * This function will test the Google authentication flow and report detailed errors
 */
export async function debugGoogleAuth(): Promise<{
  success: boolean;
  message: string;
  error?: any;
  config?: any;
}> {
  try {
    // Log the Firebase configuration (without sensitive info)
    const safeConfig = getFirebaseConfigDebugInfo();
    console.log('Firebase configuration:', safeConfig);
    
    // Create a Google provider
    const provider = new GoogleAuthProvider();
    
    // Add required scopes
    provider.addScope('profile');
    provider.addScope('email');
    
    // Get auth instance
    const auth: Auth = getAuth(app as FirebaseApp);
    
    // Check if auth domain is properly set
    if (!auth.app.options.authDomain || auth.app.options.authDomain.includes('firebaseapp.com')) {
      console.log('Auth domain checks:', {
        authDomain: auth.app.options.authDomain,
        isConfigured: !!auth.app.options.authDomain,
      });
    }
    
    // Attempt to sign in
    console.log('Attempting Google sign-in...');
    await signInWithPopup(auth, provider);
    
    // If we get here, authentication was successful
    return {
      success: true,
      message: 'Google authentication successful',
      config: safeConfig
    };
  } catch (error: any) {
    console.error('Google auth debug error:', error);
    
    // Determine error type and give helpful message
    let message = 'Unknown error';
    
    if (error.code === 'auth/unauthorized-domain') {
      message = 'The domain is not authorized in the Firebase Console. Add your domain in the Firebase Authentication settings.';
    } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      message = 'The sign-in popup was closed before authentication could complete.';
    } else if (error.code === 'auth/popup-blocked') {
      message = 'The sign-in popup was blocked by the browser.';
    } else if (error.code === 'auth/operation-not-allowed') {
      message = 'Google sign-in is not enabled in the Firebase Console. Enable it in the Authentication settings.';
    } else if (error.code === 'auth/internal-error') {
      message = 'An internal error occurred. Check the Firebase configuration.';
    }
    
    return {
      success: false,
      message,
      error: {
        code: error.code,
        message: error.message,
      },
      config: getFirebaseConfigDebugInfo()
    };
  }
}

/**
 * Get Firebase authentication status including config issues
 */
export function getFirebaseAuthDiagnostics(): {
  configured: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check if Firebase is properly configured
  if (!firebaseConfig.apiKey || (firebaseConfig.apiKey as string).includes('dummy')) {
    issues.push('Firebase API Key is missing or using a dummy value');
  }
  
  if (!firebaseConfig.authDomain || (firebaseConfig.authDomain as string).includes('example')) {
    issues.push('Firebase Auth Domain is missing or using a default value');
  }
  
  if (!firebaseConfig.projectId || (firebaseConfig.projectId as string).includes('dummy')) {
    issues.push('Firebase Project ID is missing or using a dummy value');
  }
  
  // Check if authentication domain matches the current domain
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  if (currentDomain && !currentDomain.includes('localhost') && firebaseConfig.authDomain && !(firebaseConfig.authDomain as string).includes(currentDomain)) {
    issues.push(`Current domain (${currentDomain}) is not authorized in Firebase. Add it to Firebase Console.`);
  }
  
  return {
    configured: isFirebaseConfigValid(),
    issues
  };
} 
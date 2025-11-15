'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/core/firebase/client';
import { hasValidFirebaseClientEnv, logFirebaseConfigStatus } from '@/lib/core/firebase/health';
import { useRouter, usePathname } from 'next/navigation';
import { ensureUserProfile } from '@/lib/features/auth/userProfile';

// Define the Auth context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  loading: true,
  error: null
};

// Create context
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider props
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip if not in browser (SSR)
    if (typeof window === 'undefined') {
      return;
    }

    // IMPORTANT: Only check for Firebase configuration issues when env vars are actually missing
    // This prevents false positives where Firebase is working fine but the check fails
    if (!hasValidFirebaseClientEnv()) {
      const errorMsg = 'Firebase authentication is not available';
      console.error('Firebase auth cannot initialize - required environment variables are missing');
      logFirebaseConfigStatus('AuthProvider');
      
      setError(errorMsg);
      setLoading(false);
      return;
    }

    // Try to get Firebase Auth instance
    // This will trigger initialization if not already done
    const auth = getFirebaseAuth();

    // If auth is still null after trying to initialize, there's a real problem
    if (!auth) {
      const errorMsg = 'Firebase authentication failed to initialize';
      console.error('Firebase auth is not initialized despite valid configuration');
      console.error('This may indicate a Firebase initialization error - check browser console for details');
      
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      // Listen for authentication state changes
      // NOTE: This callback handles AUTHENTICATION events (login, logout)
      // It does NOT indicate configuration problems - those are caught above
      const unsubscribe = onAuthStateChanged(
        auth,
        async (authUser) => {
          if (authUser) {
            // Ensure user has a profile in Firestore
            try {
              await ensureUserProfile(authUser);
            } catch (profileError) {
              console.error('Error ensuring user profile:', profileError);
              // Continue with authentication even if profile creation fails
              // This is NOT a configuration error - just a profile sync issue
            }
          }

          setUser(authUser);
          setLoading(false);
        },
        (authError) => {
          // This callback handles authentication state change errors
          // These are NOT configuration errors - they're runtime auth errors
          console.error('Auth state change error:', authError);
          
          // Don't set the configuration error state for auth errors
          // Just log them and set loading to false
          // The user can still use the app, they just might need to sign in again
          console.warn('Authentication state listener encountered an error, but this is not a configuration issue');
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (error) {
      // This catches errors in setting up the listener
      // Could be a real configuration issue
      console.error('Failed to setup auth state listener:', error);
      
      // Check if this is a Firebase initialization error
      if (error instanceof Error && 
          (error.message.includes('Firebase') || 
           error.message.includes('auth') ||
           error.message.includes('initialize'))) {
        setError('Firebase authentication setup failed');
      }
      
      setLoading(false);
      return () => {}; // Return empty cleanup function
    }
  }, []);

  // Redirect based on auth state and current path
  useEffect(() => {
    if (!loading && !error) {
      // Update path check to work with route groups
      // The pattern /(auth)/login becomes /login in the pathname
      const isAuthPage = 
        pathname === '/login' || 
        pathname === '/register' || 
        pathname === '/reset-password' ||
        pathname === '/resend-verification' ||
        pathname === '/verify-email';
      
      // If user is authenticated and on an auth page, redirect to dashboard
      if (user && isAuthPage) {
        router.push('/dashboard');
      }
      
      // If user is not authenticated and on a protected page, redirect to login
      const isProtectedPage = 
        pathname?.startsWith('/dashboard') || 
        pathname?.startsWith('/admin') ||
        pathname?.startsWith('/settings');
      
      if (!user && isProtectedPage) {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname || '/dashboard')}`);
      }
    }
  }, [user, loading, pathname, router, error]);

  // Provide the auth context value
  const contextValue = {
    user,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
} 
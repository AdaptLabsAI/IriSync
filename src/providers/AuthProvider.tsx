'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/core/firebase/client';
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
    // Check if auth is available
    if (!auth) {
      const errorMsg = 'Firebase authentication is not available';
      console.error('Firebase auth is not initialized - check your environment variables');
      
      // In production, log details server-side but show generic message to user
      if (process.env.NODE_ENV === 'production') {
        console.error('Check that all required NEXT_PUBLIC_FIREBASE_* environment variables are set in your hosting platform.');
      } else {
        console.error('Check that all required NEXT_PUBLIC_FIREBASE_* environment variables are set in your .env.local file.');
        console.error('Required: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID');
      }
      
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      // Listen for authentication state changes
      const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        if (authUser) {
          // Ensure user has a profile in Firestore
          try {
            await ensureUserProfile(authUser);
          } catch (profileError) {
            console.error('Error ensuring user profile:', profileError);
            // Continue with authentication even if profile creation fails
          }
        }
        
        setUser(authUser);
        setLoading(false);
      }, (error) => {
        console.error('Auth state change error:', error);
        setError('Authentication error: ' + error.message);
        setLoading(false);
      });
      
      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error('Failed to setup auth state listener:', error);
      setError('Authentication setup failed');
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
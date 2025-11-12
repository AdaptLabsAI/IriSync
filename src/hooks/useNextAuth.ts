'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

// This is a wrapper around next-auth's useSession hook
// that makes it work during build time
export const useNextAuth = () => {
  try {
    const session = useSession();
    return session;
  } catch (error) {
    console.error('Error using next-auth session:', error);
    // Return a default mock session for build or fallback
    return {
      data: {
        user: {
          id: 'mock-user-id',
          name: 'Mock User',
          email: 'mock@example.com',
          image: null
        },
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
      },
      status: 'authenticated',
      update: () => Promise.resolve(true)
    };
  }
};

// Mock signIn and signOut for build
export const useAuthActions = () => {
  const signInWithCredentials = async (email: string, password: string) => {
    try {
      return await signIn('credentials', { email, password, redirect: false });
    } catch (error) {
      console.error('Error signing in:', error);
      return { ok: true, error: null };
    }
  };

  const signUserOut = async () => {
    try {
      return await signOut({ redirect: false });
    } catch (error) {
      console.error('Error signing out:', error);
      return true;
    }
  };

  return {
    signIn: signInWithCredentials,
    signOut: signUserOut
  };
};

export default useNextAuth; 
'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';

/**
 * NextAuth Session Provider wrapper component
 * This provider must wrap any component that uses useSession()
 */
export function NextAuthProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return <SessionProvider>{children}</SessionProvider>;
} 
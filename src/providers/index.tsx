'use client';

import React from 'react';
import { AuthProvider } from './AuthProvider';
import { NextAuthProvider } from './NextAuthProvider';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <NextAuthProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </NextAuthProvider>
  );
};

export * from './AuthProvider'; 
import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication | IriSync',
  description: 'Secure authentication for IriSync platform',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simple pass-through layout - each auth page controls its own layout
  return <>{children}</>;
} 
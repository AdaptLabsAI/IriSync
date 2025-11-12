import React from 'react';
import type { Metadata } from 'next';
import AdminLayoutClient from './AdminLayoutClient';

export const metadata: Metadata = {
  title: {
    template: '%s | IriSync Admin',
    default: 'Admin Dashboard | IriSync',
  },
  description: 'Admin panel for IriSync platform management',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
} 
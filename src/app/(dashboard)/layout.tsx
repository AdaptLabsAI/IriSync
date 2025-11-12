import React from 'react';
import type { Metadata } from 'next';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { TeamProvider } from '@/context/TeamContext';

export const metadata: Metadata = {
  title: {
    template: '%s | IriSync Dashboard',
    default: 'Dashboard | IriSync',
  },
  description: 'Manage your social media content, analytics, and AI tools',
};

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TeamProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </TeamProvider>
  );
}

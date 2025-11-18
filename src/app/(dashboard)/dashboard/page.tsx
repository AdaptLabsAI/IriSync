"use client";

import React, { useState, useEffect } from 'react';
import DashboardContent from '@/components/dashboard/DashboardContent';
import NoConnectionsState from '@/components/dashboard/NoConnectionsState';
import LoadingState from '@/components/dashboard/LoadingState';

export default function DashboardPage() {
  const [hasConnections, setHasConnections] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkPlatformConnections() {
      try {
        const response = await fetch('/api/platforms/status');

        if (!response.ok) {
          throw new Error('Failed to check platform connections');
        }

        const data = await response.json();
        setHasConnections(data.hasAnyConnection || false);
      } catch (err) {
        console.error('Error checking platform connections:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Default to showing content if there's an error checking
        setHasConnections(true);
      } finally {
        setLoading(false);
      }
    }

    checkPlatformConnections();
  }, []);

  // Show loading state while checking connections
  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  // Show no connections state if no platforms are connected
  if (!hasConnections && !error) {
    return (
      <NoConnectionsState
        title="Connect Your Social Media Accounts"
        description="To view your dashboard stats and manage your content, please connect at least one social media platform."
        showPlatformIcons={true}
      />
    );
  }

  // Show actual dashboard content when platforms are connected
  return <DashboardContent />;
}

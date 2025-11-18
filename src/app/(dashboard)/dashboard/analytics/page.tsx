"use client";

import React, { useState, useEffect } from 'react';
import AnalyticsContent from '@/components/dashboard/AnalyticsContent';
import NoConnectionsState from '@/components/dashboard/NoConnectionsState';
import LoadingState from '@/components/dashboard/LoadingState';

export default function AnalyticsPage() {
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
    return <LoadingState message="Loading analytics..." />;
  }

  // Show no connections state if no platforms are connected
  if (!hasConnections && !error) {
    return (
      <NoConnectionsState
        title="Connect Platforms to View Analytics"
        description="Analytics data is available once you connect your social media accounts. Connect at least one platform to start tracking your performance metrics."
        showPlatformIcons={true}
      />
    );
  }

  // Show actual analytics content when platforms are connected
  return <AnalyticsContent />;
}

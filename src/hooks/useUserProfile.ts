'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  organizationRole?: string;
  organizationSubscriptionTier?: string;
  createdAt: string;
  updatedAt: string;
}

export function useUserProfile() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (status === 'loading') return;
      
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user profile data
        const response = await fetch('/api/settings/profile');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        
        const data = await response.json();
        setProfile(data.profile);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [session, status]);

  return { profile, loading, error };
} 
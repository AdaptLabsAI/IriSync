import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';

interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  seats: number;
  logoUrl?: string;
}

interface OrganizationHook {
  organization: Organization | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useOrganization(): OrganizationHook {
  const { data: session } = useSession();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganization = async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use organization-centric approach: get current organization from user's API
      // This will use currentOrganizationId or personalOrganizationId internally
      const response = await axios.get('/api/organizations/current');
      setOrganization(response.data.data);
      
      // Fallback check for deprecated organizationId in session
      if (!response.data.data && session.user && 'organizationId' in session.user) {
        console.warn('Using deprecated session.user.organizationId field');
        const orgId = session.user.organizationId as string;
        
        if (orgId) {
          const fallbackResponse = await axios.get(`/api/organizations/${orgId}`);
          setOrganization(fallbackResponse.data.data);
          return;
        }
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch organization'));
      
      // Set a default organization as fallback
      if (session?.user?.id) {
        setOrganization({
          id: 'default',
          name: 'My Organization',
          ownerId: session.user.id as string,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          seats: 1
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, [session]);

  return {
    organization,
    isLoading,
    error,
    refetch: fetchOrganization
  };
} 
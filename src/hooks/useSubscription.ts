import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { useOrganization } from './useOrganization';

interface Subscription {
  id: string;
  tier: 'creator' | 'influencer' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: string;
  currentPeriodStart: string;
  createdAt: string;
  updatedAt: string;
  price: number;
  interval: 'month' | 'year';
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionHook {
  subscription: Subscription | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): SubscriptionHook {
  const { data: session } = useSession();
  const { organization } = useOrganization();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = async () => {
    if (!session || !organization) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/subscription/current?organizationId=${organization.id}`);
      setSubscription(response.data.data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch subscription'));
      
      // Set a default subscription as fallback
      setSubscription({
        id: 'default',
        tier: 'creator',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodStart: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        price: 59,
        interval: 'month',
        cancelAtPeriodEnd: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [session, organization]);

  return {
    subscription,
    isLoading,
    error,
    refetch: fetchSubscription
  };
} 
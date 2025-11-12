import { useSession } from 'next-auth/react';

type SubscriptionTier = 'creator' | 'influencer' | 'enterprise' | 'all';

/**
 * Hook to check if a user has access to a feature based on their subscription tier
 * @param requiredTier The minimum tier required to access the feature
 * @returns Whether the user has access to the feature
 */
export function useFeatureAccess(requiredTier: SubscriptionTier): boolean {
  const { data: session } = useSession();
  
  if (!session?.user) return false;
  if (requiredTier === 'all') return true;
  
  // Get the user's subscription tier from their session
  // This would come from your auth provider (e.g. NextAuth.js)
  const userTier = (session.user as any).subscriptionTier || 'creator';
  
  // Define tier hierarchy
  const tierLevels: Record<string, number> = {
    'creator': 1,
    'influencer': 2,
    'enterprise': 3
  };
  
  const userTierLevel = tierLevels[userTier] || 0;
  const requiredTierLevel = tierLevels[requiredTier] || 0;
  
  // User has access if their tier level is greater than or equal to the required tier level
  return userTierLevel >= requiredTierLevel;
} 
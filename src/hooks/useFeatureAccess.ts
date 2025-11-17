import { useState, useEffect } from 'react';
import { getFirebaseClientAuth } from '@/lib/core/firebase/client';
import { getFirebaseFirestore } from '@/lib/core/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export type SubscriptionTier = 'trial' | 'creator' | 'influencer' | 'enterprise' | 'admin';

// Define tier hierarchy
const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  trial: 2,       // Trial has influencer-level features
  creator: 1,
  influencer: 2,
  enterprise: 3,
  admin: 4
};

// Feature access matrix - maps features to minimum required tier
const FEATURE_ACCESS: Record<string, SubscriptionTier> = {
  // Basic features (all tiers)
  'basic_scheduling': 'creator',
  'basic_analytics': 'creator',
  'basic_content_generation': 'creator',
  'basic_hashtag_suggestions': 'creator',

  // Influencer features
  'advanced_scheduling': 'influencer',
  'video_scheduling': 'influencer',
  'bulk_scheduling': 'influencer',
  'custom_branded_urls': 'influencer',
  'workflow_approval': 'influencer',
  'competitor_benchmarking': 'influencer',
  'custom_reports': 'influencer',
  'link_tracking': 'influencer',
  'custom_dashboard': 'influencer',
  'social_listening': 'influencer',
  'sentiment_analysis': 'influencer',

  // Enterprise features
  'smart_replies': 'enterprise',
  'brand_recognition': 'enterprise',
  'advanced_listening': 'enterprise',
  'team_management': 'enterprise',
  'role_based_access': 'enterprise',
  'audit_logs': 'enterprise',
  'sso': 'enterprise',
  'api_access': 'enterprise',
  'dedicated_support': 'enterprise',
  'unlimited_seats': 'enterprise',

  // Admin features
  'admin_dashboard': 'admin',
  'system_config': 'admin',
  'user_management': 'admin',
};

interface FeatureAccessReturn {
  hasAccess: boolean;
  isLoading: boolean;
  currentTier: SubscriptionTier | null;
  requiredTier: SubscriptionTier | null;
  upgradeMessage?: string;
}

/**
 * Hook to check if a user has access to a specific feature based on their subscription tier
 * @param feature The feature to check access for
 * @returns Object with access status, loading state, and tier information
 */
export function useFeatureAccess(feature: string): FeatureAccessReturn {
  const [currentTier, setCurrentTier] = useState<SubscriptionTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseClientAuth();
    const firestore = getFirebaseFirestore();

    if (!auth || !firestore) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentTier(null);
        setIsLoading(false);
        return;
      }

      try {
        // Get user document to find subscription tier
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));

        if (!userDoc.exists()) {
          setCurrentTier(null);
          setIsLoading(false);
          return;
        }

        const userData = userDoc.data();

        // Check organization-level tier first
        if (userData.currentOrganizationId) {
          const orgDoc = await getDoc(doc(firestore, 'organizations', userData.currentOrganizationId));

          if (orgDoc.exists()) {
            const orgData = orgDoc.data();
            const tier = orgData.billing?.subscriptionTier as SubscriptionTier;

            if (tier) {
              setCurrentTier(tier);
              setIsLoading(false);
              return;
            }
          }
        }

        // Fallback to user-level tier
        const tier = (userData.subscriptionTier || 'creator') as SubscriptionTier;
        setCurrentTier(tier);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching subscription tier:', error);
        setCurrentTier('creator'); // Safe fallback
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const requiredTier = FEATURE_ACCESS[feature];

  // If feature not in access matrix, allow by default
  if (!requiredTier) {
    return {
      hasAccess: true,
      isLoading,
      currentTier,
      requiredTier: null,
    };
  }

  const hasAccess = currentTier ? TIER_HIERARCHY[currentTier] >= TIER_HIERARCHY[requiredTier] : false;

  let upgradeMessage: string | undefined;
  if (!hasAccess && currentTier) {
    upgradeMessage = `Upgrade to ${requiredTier} to unlock this feature`;
  }

  return {
    hasAccess,
    isLoading,
    currentTier,
    requiredTier,
    upgradeMessage,
  };
}

/**
 * Hook to check if a user has a specific subscription tier or higher
 * @param minTier The minimum tier required
 * @returns Whether the user has the required tier
 */
export function useHasTier(minTier: SubscriptionTier): boolean {
  const [currentTier, setCurrentTier] = useState<SubscriptionTier | null>(null);

  useEffect(() => {
    const auth = getFirebaseClientAuth();
    const firestore = getFirebaseFirestore();

    if (!auth || !firestore) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentTier(null);
        return;
      }

      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));

        if (!userDoc.exists()) {
          setCurrentTier(null);
          return;
        }

        const userData = userDoc.data();

        // Check organization-level tier first
        if (userData.currentOrganizationId) {
          const orgDoc = await getDoc(doc(firestore, 'organizations', userData.currentOrganizationId));

          if (orgDoc.exists()) {
            const orgData = orgDoc.data();
            const tier = orgData.billing?.subscriptionTier as SubscriptionTier;

            if (tier) {
              setCurrentTier(tier);
              return;
            }
          }
        }

        // Fallback to user-level tier
        const tier = (userData.subscriptionTier || 'creator') as SubscriptionTier;
        setCurrentTier(tier);
      } catch (error) {
        console.error('Error fetching subscription tier:', error);
        setCurrentTier('creator');
      }
    });

    return () => unsubscribe();
  }, []);

  return currentTier ? TIER_HIERARCHY[currentTier] >= TIER_HIERARCHY[minTier] : false;
} 
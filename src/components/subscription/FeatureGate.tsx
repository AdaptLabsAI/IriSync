import React from 'react';
import Link from 'next/link';

export type SubscriptionTier = 'trial' | 'creator' | 'influencer' | 'enterprise' | 'admin';

interface FeatureGateProps {
  feature: string;
  subscriptionTier: SubscriptionTier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

// Define tier hierarchy for easier comparison
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

/**
 * FeatureGate component for controlling access to features based on subscription tier
 *
 * Usage:
 * ```tsx
 * <FeatureGate feature="advanced_scheduling" subscriptionTier={userTier} showUpgradePrompt>
 *   <AdvancedScheduler />
 * </FeatureGate>
 * ```
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  subscriptionTier,
  children,
  fallback,
  showUpgradePrompt = true
}) => {
  const requiredTier = FEATURE_ACCESS[feature];

  // If feature not defined in access matrix, allow access by default
  if (!requiredTier) {
    console.warn(`Feature "${feature}" not found in access matrix. Allowing access by default.`);
    return <>{children}</>;
  }

  const hasAccess = TIER_HIERARCHY[subscriptionTier] >= TIER_HIERARCHY[requiredTier];

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show custom fallback or upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
        <div className="max-w-sm mx-auto">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Feature Locked</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upgrade to <span className="font-semibold capitalize">{requiredTier}</span> to unlock this feature.
          </p>
          <div className="mt-6">
            <Link
              href="/features"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              View Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default FeatureGate; 
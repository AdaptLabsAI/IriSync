import { SubscriptionTier, TierLimits, TIER_CONFIGS, UserSubscription } from '@/types/subscription';

/**
 * Check if a user has access to a specific feature
 */
export function hasFeatureAccess(
  userTier: SubscriptionTier,
  feature: keyof TierLimits
): boolean {
  const tierConfig = TIER_CONFIGS[userTier];
  if (!tierConfig) return false;

  const featureValue = tierConfig[feature];

  // Boolean features
  if (typeof featureValue === 'boolean') {
    return featureValue;
  }

  // Numeric/unlimited features (treat as accessible if > 0 or unlimited)
  if (featureValue === 'unlimited' || (typeof featureValue === 'number' && featureValue > 0)) {
    return true;
  }

  return false;
}

/**
 * Get the limit value for a specific feature
 */
export function getFeatureLimit(
  userTier: SubscriptionTier,
  feature: keyof TierLimits
): number | 'unlimited' | boolean {
  const tierConfig = TIER_CONFIGS[userTier];
  if (!tierConfig) return false;

  return tierConfig[feature];
}

/**
 * Check if user's trial has expired
 */
export function isTrialExpired(subscription: UserSubscription): boolean {
  if (subscription.tier !== 'trial') return false;
  if (!subscription.trialEndsAt) return false;

  return new Date() > new Date(subscription.trialEndsAt);
}

/**
 * Check if user can access premium features
 */
export function canAccessPremiumFeatures(subscription: UserSubscription): boolean {
  // Admin always has access
  if (subscription.tier === 'admin') return true;

  // Trial users have access if trial is active
  if (subscription.tier === 'trial') {
    return !isTrialExpired(subscription) && subscription.status === 'trialing';
  }

  // Paid tiers have access if subscription is active
  return ['active', 'trialing'].includes(subscription.status);
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    trial: 'Free Trial',
    creator: 'Creator',
    influencer: 'Influencer',
    enterprise: 'Enterprise',
    admin: 'Admin',
  };
  return names[tier] || tier;
}

/**
 * Check if a feature should be locked for a user
 */
export function isFeatureLocked(
  userTier: SubscriptionTier,
  userSubscription: UserSubscription,
  feature: keyof TierLimits
): boolean {
  // Admin is never locked
  if (userTier === 'admin') return false;

  // Check if trial expired
  if (userTier === 'trial' && isTrialExpired(userSubscription)) {
    return !hasFeatureAccess('creator', feature); // Fall back to creator limits
  }

  // Check tier access
  return !hasFeatureAccess(userTier, feature);
}

/**
 * Get upgrade message for locked feature
 */
export function getUpgradeMessage(
  currentTier: SubscriptionTier,
  feature: keyof TierLimits
): string {
  // Find the minimum tier that has this feature
  const tiers: SubscriptionTier[] = ['creator', 'influencer', 'enterprise'];

  for (const tier of tiers) {
    if (hasFeatureAccess(tier, feature)) {
      return `Upgrade to ${getTierDisplayName(tier)} to unlock this feature`;
    }
  }

  return 'Upgrade your plan to unlock this feature';
}

import { firestore } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SubscriptionTier, SubscriptionTierValues } from '../models/User';
import { SubscriptionTier as BaseSubscriptionTier } from './models/subscription';

/**
 * Get a user's current subscription tier from their organization
 * @param userId User ID
 * @returns Subscription tier
 */
export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  try {
    // Get user document
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Check current organization first
    if (userData.currentOrganizationId) {
      const orgDoc = await getDoc(doc(firestore, 'organizations', userData.currentOrganizationId));
      
      if (orgDoc.exists()) {
        const orgData = orgDoc.data();
        
        if (orgData.billing?.subscriptionTier) {
          return orgData.billing.subscriptionTier as SubscriptionTier;
        }
      }
    }
    
    // Check personal organization next
    if (userData.personalOrganizationId) {
      const orgDoc = await getDoc(doc(firestore, 'organizations', userData.personalOrganizationId));
      
      if (orgDoc.exists()) {
        const orgData = orgDoc.data();
        
        if (orgData.billing?.subscriptionTier) {
          return orgData.billing.subscriptionTier as SubscriptionTier;
        }
      }
    }
    
    // Fallback to deprecated user-level field for backward compatibility
    if (userData.subscriptionTier && Object.values(BaseSubscriptionTier).includes(userData.subscriptionTier)) {
      console.warn('Using deprecated user.subscriptionTier field', { userId });
      return userData.subscriptionTier as SubscriptionTier;
    }
    
    // Default to no subscription
    return SubscriptionTierValues.NONE;
  } catch (error) {
    console.error('Error getting user subscription tier:', error);
    return SubscriptionTierValues.NONE;
  }
}

/**
 * Check if a user's subscription is active through their organization
 * @param userId User ID
 * @returns Boolean indicating if subscription is active
 */
export async function isSubscriptionActive(userId: string): Promise<boolean> {
  try {
    // Get user document
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    
    // Check current organization first
    if (userData.currentOrganizationId) {
      const orgDoc = await getDoc(doc(firestore, 'organizations', userData.currentOrganizationId));
      
      if (orgDoc.exists()) {
        const orgData = orgDoc.data();
        
        if (
          orgData.billing?.subscriptionTier && 
          Object.values(BaseSubscriptionTier).includes(orgData.billing.subscriptionTier) &&
          orgData.billing.subscriptionTier !== SubscriptionTierValues.NONE &&
          orgData.billing.status === 'active'
        ) {
          return true;
        }
      }
    }
    
    // Check personal organization next
    if (userData.personalOrganizationId) {
      const orgDoc = await getDoc(doc(firestore, 'organizations', userData.personalOrganizationId));
      
      if (orgDoc.exists()) {
        const orgData = orgDoc.data();
        
        if (
          orgData.billing?.subscriptionTier && 
          Object.values(BaseSubscriptionTier).includes(orgData.billing.subscriptionTier) &&
          orgData.billing.subscriptionTier !== SubscriptionTierValues.NONE &&
          orgData.billing.status === 'active'
        ) {
          return true;
        }
      }
    }
    
    // Fallback to deprecated user-level fields for backward compatibility
    if (
      userData.subscriptionTier && 
      Object.values(BaseSubscriptionTier).includes(userData.subscriptionTier) &&
      userData.subscriptionTier !== SubscriptionTierValues.NONE &&
      userData.subscriptionStatus === 'active'
    ) {
      console.warn('Using deprecated user subscription fields', { userId });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Get pricing for a subscription tier
 * @param tier Subscription tier
 * @param seats Number of seats (for Enterprise tier)
 * @returns Price in USD
 */
export function getPricingForTier(tier: SubscriptionTier, seats: number = 1): number {
  switch (tier) {
    case BaseSubscriptionTier.CREATOR:
      return 80; // $80 per month
    case BaseSubscriptionTier.INFLUENCER:
      return 200; // $200 per month
    case BaseSubscriptionTier.ENTERPRISE:
      // Base price is $250 per seat for the first 5 seats
      // Additional seats are $150 each
      const baseCost = 250 * 5; // $1,250 for 5 seats
      const additionalSeats = Math.max(0, seats - 5);
      const additionalCost = additionalSeats * 150;
      return baseCost + additionalCost;
    default:
      return 0;
  }
}

/**
 * Get token allocation for a subscription tier
 * @param tier Subscription tier
 * @param seats Number of seats (for all tiers)
 * @returns Number of tokens allocated
 */
export function getTokenAllocationForTier(tier: SubscriptionTier, seats: number = 1): number {
  switch (tier) {
    case BaseSubscriptionTier.CREATOR:
      // Creator tier: 100 tokens per seat, max 3 seats
      const creatorSeats = Math.min(seats, 3); // Enforce max seats limit
      return 100 * creatorSeats;
    case BaseSubscriptionTier.INFLUENCER:
      // Influencer tier: 500 tokens per seat, max 10 seats
      const influencerSeats = Math.min(seats, 10); // Enforce max seats limit
      return 500 * influencerSeats;
    case BaseSubscriptionTier.ENTERPRISE:
      // Enterprise tier: 5,000 base tokens for 5 seats, plus 500 per additional seat
      return 5000 + (seats > 5 ? (seats - 5) * 500 : 0);
    default:
      return 0;
  }
}

/**
 * Check if a feature is available for a subscription tier
 * @param feature Feature name
 * @param tier Subscription tier
 * @returns Boolean indicating if feature is available
 */
export function isFeatureAvailable(feature: string, tier: SubscriptionTier): boolean {
  // Define features available for each tier
  const tierFeatures: Record<SubscriptionTier, string[]> = {
    [BaseSubscriptionTier.CREATOR]: [
      'basic_scheduling',
      'basic_analytics',
      'basic_content_generation',
      'basic_hashtag_suggestions'
    ],
    [BaseSubscriptionTier.INFLUENCER]: [
      'basic_scheduling',
      'basic_analytics',
      'basic_content_generation',
      'basic_hashtag_suggestions',
      'advanced_scheduling',
      'video_scheduling',
      'bulk_scheduling',
      'custom_branded_urls',
      'workflow_approval',
      'competitor_benchmarking',
      'custom_reports',
      'link_tracking',
      'custom_dashboard',
      'social_listening',
      'sentiment_analysis'
    ],
    [BaseSubscriptionTier.ENTERPRISE]: [
      'basic_scheduling',
      'basic_analytics',
      'basic_content_generation',
      'basic_hashtag_suggestions',
      'advanced_scheduling',
      'video_scheduling',
      'bulk_scheduling',
      'custom_branded_urls',
      'workflow_approval',
      'competitor_benchmarking',
      'custom_reports',
      'link_tracking',
      'custom_dashboard',
      'social_listening',
      'sentiment_analysis',
      'smart_replies',
      'brand_recognition',
      'advanced_listening',
      'team_management',
      'role_based_access',
      'audit_logs',
      'sso',
      'api_access',
      'dedicated_support'
    ],
    [SubscriptionTierValues.NONE]: []
  };
  
  return tierFeatures[tier]?.includes(feature) || false;
}

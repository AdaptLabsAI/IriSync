/**
 * Subscription utility functions
 */

import { logger } from '../core/logging/logger';
import { formatCurrency } from '../../utils/formatting';

/**
 * Subscription tier levels
 */
export enum SubscriptionTier {
  CREATOR = 'creator',
  INFLUENCER = 'influencer',
  ENTERPRISE = 'enterprise',
}

/**
 * Subscription pricing information
 */
export interface SubscriptionPrice {
  monthly: number;
  annual: number;
  setup?: number;
  additionalSeat?: number;
}

/**
 * Feature availability by tier
 */
export interface TierFeatures {
  socialAccounts: number | 'unlimited';
  users: number | 'unlimited';
  draftSchedulePublish: boolean;
  unifiedInbox: boolean;
  aiContentGeneration: number | 'unlimited' | false;
  imageEditingTools: boolean;
  videoScheduling: boolean;
  bulkScheduling: boolean;
  customBrandedUrls: boolean;
  approvalWorkflows: boolean;
  analytics: 'basic' | 'advanced' | 'custom' | false;
  competitorBenchmarking: number | false;
  customReports: boolean;
  linkTracking: boolean;
  customDashboard: boolean;
  smartReplies: boolean;
  brandRecognition: boolean;
  socialListening: 'basic' | 'advanced' | false;
  sentimentAnalysis: boolean;
  alertsNotifications: boolean;
  accessPermissions: boolean;
  teamOrganization: boolean;
  customUserRoles: boolean;
  dataExport: boolean;
  adManagement: boolean;
  supportLevel: 'chat' | 'email' | 'priority' | 'custom';
}

/**
 * Subscription plan details
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
  pricing: SubscriptionPrice;
  features: TierFeatures;
  isPopular?: boolean;
  isCustom?: boolean;
}

/**
 * Subscription plans configuration
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'creator',
    name: 'Creator',
    description: 'Perfect for individual creators and small businesses',
    tier: SubscriptionTier.CREATOR,
    pricing: {
      monthly: 80,
      annual: 768, // Save ~$192/year (20% off)
    },
    features: {
      socialAccounts: 5,
      users: 1,
      draftSchedulePublish: true,
      unifiedInbox: true,
      aiContentGeneration: 100,
      imageEditingTools: true,
      videoScheduling: false,
      bulkScheduling: false,
      customBrandedUrls: false,
      approvalWorkflows: false,
      analytics: 'basic',
      competitorBenchmarking: 5,
      customReports: false,
      linkTracking: false,
      customDashboard: false,
      smartReplies: false,
      brandRecognition: false,
      socialListening: false,
      sentimentAnalysis: false,
      alertsNotifications: true,
      accessPermissions: false,
      teamOrganization: false,
      customUserRoles: false,
      dataExport: false,
      adManagement: false,
      supportLevel: 'chat',
    },
  },
  {
    id: 'influencer',
    name: 'Influencer',
    description: 'Ideal for growing influencers and marketing teams',
    tier: SubscriptionTier.INFLUENCER,
    pricing: {
      monthly: 200,
      annual: 1920, // Save ~$480/year (20% off)
    },
    isPopular: true,
    features: {
      socialAccounts: 'unlimited',
      users: 1,
      draftSchedulePublish: true,
      unifiedInbox: true,
      aiContentGeneration: 500,
      imageEditingTools: true,
      videoScheduling: true,
      bulkScheduling: true,
      customBrandedUrls: true,
      approvalWorkflows: true,
      analytics: 'advanced',
      competitorBenchmarking: 10,
      customReports: true,
      linkTracking: true,
      customDashboard: true,
      smartReplies: false,
      brandRecognition: false,
      socialListening: 'basic',
      sentimentAnalysis: true,
      alertsNotifications: true,
      accessPermissions: true,
      teamOrganization: true,
      customUserRoles: true,
      dataExport: true,
      adManagement: true,
      supportLevel: 'priority',
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solution for large organizations - pricing starts at $1,250/month for 5 seats',
    tier: SubscriptionTier.ENTERPRISE,
    pricing: {
      monthly: 0, // Custom quotes only
      annual: 0, // Custom quotes only
      setup: 0, // No setup fee
    },
    isCustom: true,
    features: {
      socialAccounts: 'unlimited',
      users: 5, // Minimum 5 seats, unlimited additional seats at $150 each
      draftSchedulePublish: true,
      unifiedInbox: true,
      aiContentGeneration: 'unlimited',
      imageEditingTools: true,
      videoScheduling: true,
      bulkScheduling: true,
      customBrandedUrls: true,
      approvalWorkflows: true,
      analytics: 'custom',
      competitorBenchmarking: 20,
      customReports: true,
      linkTracking: true,
      customDashboard: true,
      smartReplies: true,
      brandRecognition: true,
      socialListening: 'advanced',
      sentimentAnalysis: true,
      alertsNotifications: true,
      accessPermissions: true,
      teamOrganization: true,
      customUserRoles: true,
      dataExport: true,
      adManagement: true,
      supportLevel: 'custom',
    },
  },
];

/**
 * Check if a feature is available for a given subscription tier
 * @param tier The subscription tier to check
 * @param featureName The name of the feature to check
 * @returns Boolean indicating whether the feature is available
 */
export function hasFeatureAccess(
  tier: SubscriptionTier | string, 
  featureName: keyof TierFeatures
): boolean {
  try {
    // Find the plan for the given tier
    const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
    if (!plan) {
      logger.warn(`Unknown subscription tier: ${tier}`);
      return false;
    }

    const featureValue = plan.features[featureName];

    // Boolean features
    if (typeof featureValue === 'boolean') {
      return featureValue;
    }
    
    // Numeric limits (> 0 means access)
    if (typeof featureValue === 'number') {
      return featureValue > 0;
    }
    
    // String-based features (not false means access)
    if (typeof featureValue === 'string') {
      return true; // Any string value means the feature is available
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking feature access', { tier, featureName, error });
    return false;
  }
}

/**
 * Get formatted pricing for a subscription plan
 * @param planId The ID of the plan
 * @returns Formatted pricing information
 */
export function getPlanPricing(planId: string): string {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  
  if (!plan) {
    logger.warn('Plan not found for pricing calculation', { planId });
    return '';
  }
  
  if (plan.isCustom && plan.pricing.monthly === 0) {
    return 'Custom pricing';
  }
  
  return formatCurrency(plan.pricing.monthly) + '/month';
}

/**
 * Get subscription tier for a user
 * @param userId The user ID to get subscription tier for  
 * @returns The subscription tier
 */
export async function getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  try {
    // Import here to avoid circular dependencies
    const { firestore } = await import('../core/firebase');
    const { doc, getDoc } = await import('firebase/firestore');
    
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Use organization-centric approach
      const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;
      
      if (organizationId) {
        const orgDoc = await getDoc(doc(firestore, 'organizations', organizationId));
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          if (orgData.billing?.subscriptionTier) {
            return orgData.billing.subscriptionTier as SubscriptionTier;
          }
        }
      }
      
      // Fallback to deprecated user-level subscription
      if (userData.subscriptionTier) {
        logger.warn('Using deprecated user.subscriptionTier field', { userId });
        return userData.subscriptionTier;
      }
    }
    
    return SubscriptionTier.CREATOR;
  } catch (error) {
    logger.error('Error getting subscription tier', { error, userId });
    return SubscriptionTier.CREATOR;
  }
} 
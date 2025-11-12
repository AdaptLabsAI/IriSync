import { firestore } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { logger } from '../logging/logger';
import { firebaseAdmin } from '../firebase/admin';
import { database as prisma } from '../database';

/**
 * Supported feature keys for subscription validation
 */
export type FeatureKey = 
  | 'ai-content-generation'
  | 'ai-content-analysis'
  | 'ai-schedule-optimization'
  | 'ai-response-assistant'
  | 'rag-document-processing'
  | 'rag-search'
  | 'rag-generate'
  | 'bulk-scheduling'
  | 'video-scheduling'
  | 'custom-reports'
  | 'competitor-benchmarking'
  | 'custom-branding'
  | 'advanced-analytics'
  | 'team-collaboration';

/**
 * Subscription tiers for the application
 */
export enum SubscriptionTier {
  CREATOR = 'creator',
  INFLUENCER = 'influencer',
  ENTERPRISE = 'enterprise',
  TRIAL_CREATOR = 'trial_creator',
  TRIAL_INFLUENCER = 'trial_influencer'
}

/**
 * Feature access matrix by subscription tier
 */
const featureAccess: Record<SubscriptionTier, Record<FeatureKey, boolean>> = {
  [SubscriptionTier.CREATOR]: {
    'ai-content-generation': true,
    'ai-content-analysis': true,
    'ai-schedule-optimization': true,
    'ai-response-assistant': true,
    'rag-document-processing': false,
    'rag-search': false,
    'rag-generate': false,
    'bulk-scheduling': false,
    'video-scheduling': false,
    'custom-reports': false,
    'competitor-benchmarking': true,
    'custom-branding': false,
    'advanced-analytics': false,
    'team-collaboration': false
  },
  [SubscriptionTier.INFLUENCER]: {
    'ai-content-generation': true,
    'ai-content-analysis': true,
    'ai-schedule-optimization': true,
    'ai-response-assistant': true,
    'rag-document-processing': true,
    'rag-search': true,
    'rag-generate': true,
    'bulk-scheduling': true,
    'video-scheduling': true,
    'custom-reports': true,
    'competitor-benchmarking': true,
    'custom-branding': true,
    'advanced-analytics': true,
    'team-collaboration': true
  },
  [SubscriptionTier.ENTERPRISE]: {
    'ai-content-generation': true,
    'ai-content-analysis': true,
    'ai-schedule-optimization': true,
    'ai-response-assistant': true,
    'rag-document-processing': true,
    'rag-search': true,
    'rag-generate': true,
    'bulk-scheduling': true,
    'video-scheduling': true,
    'custom-reports': true,
    'competitor-benchmarking': true,
    'custom-branding': true,
    'advanced-analytics': true,
    'team-collaboration': true
  },
  // Trial users get access to features of the tier they're trialing
  [SubscriptionTier.TRIAL_CREATOR]: {
    'ai-content-generation': true,
    'ai-content-analysis': true,
    'ai-schedule-optimization': true,
    'ai-response-assistant': true,
    'rag-document-processing': false,
    'rag-search': false,
    'rag-generate': false,
    'bulk-scheduling': false,
    'video-scheduling': false,
    'custom-reports': false,
    'competitor-benchmarking': true,
    'custom-branding': false,
    'advanced-analytics': false,
    'team-collaboration': false
  },
  [SubscriptionTier.TRIAL_INFLUENCER]: {
    'ai-content-generation': true,
    'ai-content-analysis': true,
    'ai-schedule-optimization': true,
    'ai-response-assistant': true,
    'rag-document-processing': true,
    'rag-search': true,
    'rag-generate': true,
    'bulk-scheduling': true,
    'video-scheduling': true,
    'custom-reports': true, 
    'competitor-benchmarking': true,
    'custom-branding': true,
    'advanced-analytics': true,
    'team-collaboration': true
  }
};

/**
 * Get user subscription tier from Firestore
 * @param userId User ID to check
 * @returns Promise with user subscription tier
 * @throws Error if user has no valid subscription
 */
export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  try {
    // Get user document from Firestore
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (!userDoc.exists()) {
      logger.warn(`User document not found for subscription validation: ${userId}`);
      throw new Error('User not found. A paid subscription is required to access features.');
    }
    
    const userData = userDoc.data();
    const subscription = userData.subscription;
    
    // Check if user has a valid subscription
    if (!subscription || !subscription.tier) {
      throw new Error('No active subscription found. Please upgrade to Creator, Influencer, or Enterprise tier.');
    }
    
    // Check if subscription is active or trialing
    if (subscription.status !== 'active') {
      if (subscription.status === 'trialing') {
        // Map to trial version of the tier they're trialing
        if (subscription.tier === SubscriptionTier.CREATOR) {
          return SubscriptionTier.TRIAL_CREATOR;
        } else if (subscription.tier === SubscriptionTier.INFLUENCER) {
          return SubscriptionTier.TRIAL_INFLUENCER;
        }
        // We don't allow trials of enterprise tier
        throw new Error('Enterprise tier trials are not available. Please contact sales.');
      }
      throw new Error('Subscription is not active. Please renew your subscription to continue using features.');
    }
    
    // Return subscription tier
    return subscription.tier as SubscriptionTier;
  } catch (error) {
    logger.error(`Error getting user subscription tier: ${error instanceof Error ? error.message : String(error)}`, {
      userId,
      error: error instanceof Error ? error.stack : undefined
    });
    
    // Re-throw subscription-related errors
    if (error instanceof Error && error.message.includes('subscription')) {
      throw error;
    }
    
    // Throw error for other issues
    throw new Error('Unable to verify subscription. Please contact support if this issue persists.');
  }
}

/**
 * Validates if a user has access to a specific feature based on their subscription
 * @param userId User ID to check subscription for
 * @param featureKey The feature key to validate access for
 * @returns Boolean indicating if user has access
 */
export async function validateSubscription(
  userId: string,
  featureKey: string
): Promise<boolean> {
  try {
    // Get user with their subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscription: {
          select: {
            planId: true,
            status: true,
            features: true
          }
        }
      }
    });

    // No subscription or inactive subscription
    if (!user?.subscription || user.subscription.status !== 'active') {
      return false;
    }
    
    // Check if feature is available in plan features
    const hasFeature = user.subscription.features?.includes(featureKey);
    
    return !!hasFeature;
  } catch (error) {
    logger.error('Error validating subscription', {
      userId,
      featureKey,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Fail closed - deny access on error
    return false;
  }
}

/**
 * Get all features available to a user based on their subscription
 * @param userId User ID to check
 * @returns Promise with list of available features
 */
export async function getAvailableFeatures(userId: string): Promise<FeatureKey[]> {
  const tier = await getUserSubscriptionTier(userId);
  
  // Get all features available for this tier
  const availableFeatures: FeatureKey[] = [];
  
  for (const [feature, hasAccess] of Object.entries(featureAccess[tier])) {
    if (hasAccess) {
      availableFeatures.push(feature as FeatureKey);
    }
  }
  
  return availableFeatures;
}

/**
 * Check if subscription has expired or is about to expire
 * @param userId User ID to check
 * @returns Promise with expiration status
 */
export async function checkSubscriptionExpiration(userId: string): Promise<{
  isExpired: boolean;
  daysRemaining: number | null;
}> {
  try {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (!userDoc.exists()) {
      return { isExpired: true, daysRemaining: null };
    }
    
    const userData = userDoc.data();
    const subscription = userData.subscription;
    
    // Check if user has a subscription
    if (!subscription) {
      return { isExpired: true, daysRemaining: null };
    }
    
    // Get expiration date
    const expirationDate = subscription.currentPeriodEnd?.toDate();
    
    if (!expirationDate) {
      return { isExpired: true, daysRemaining: null };
    }
    
    // Calculate days remaining
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      isExpired: daysRemaining <= 0,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0
    };
  } catch (error) {
    logger.error(`Error checking subscription expiration: ${error instanceof Error ? error.message : String(error)}`, {
      userId,
      error: error instanceof Error ? error.stack : undefined
    });
    
    // Default values in case of error
    return { isExpired: false, daysRemaining: null };
  }
} 
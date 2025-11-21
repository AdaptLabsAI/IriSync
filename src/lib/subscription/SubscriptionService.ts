import { getFirebaseFirestore } from '../core/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc, runTransaction } from 'firebase/firestore';
import { SubscriptionTier, SubscriptionStatus, SubscriptionData, TierFeatures } from './models/subscription';
import { NextResponse } from 'next/server';

/**
 * Usage data interface for tracking feature usage
 */
export interface UsageData {
  connect_accounts: number;
  post_scheduling: number;
  team_members: number;
  ai_content_generation: number;
  ai_caption_writing: number;
  ai_hashtag_suggestions: number;
  ai_image_generation: number;
}

/**
 * Subscription service for managing user subscriptions and feature access
 */
class SubscriptionService {
  /**
   * Get a user's subscription data
   */
  async getSubscription(userId: string): Promise<SubscriptionData | null> {
    try {
      // Get user document to find their organization
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const userData = userDoc.data();
      const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;
      
      if (!organizationId) {
        return null;
      }
      
      // Get organization's subscription
      const orgDoc = await getDoc(doc(firestore, 'organizations', organizationId));
      
      if (!orgDoc.exists()) {
        return null;
      }
      
      const orgData = orgDoc.data();
      const billing = orgData.billing;
      
      if (!billing || !billing.subscriptionTier) {
        return null;
      }
      
      // Return subscription data
      return {
        id: billing.stripeSubscriptionId || organizationId,
        userId,
        organizationId,
        tier: billing.subscriptionTier as SubscriptionTier,
        status: billing.status as SubscriptionStatus || SubscriptionStatus.ACTIVE,
        stripeCustomerId: billing.stripeCustomerId,
        stripeSubscriptionId: billing.stripeSubscriptionId,
        currentPeriodStart: billing.currentPeriodStart?.toDate() || new Date(),
        currentPeriodEnd: billing.currentPeriodEnd?.toDate() || new Date(),
        cancelAtPeriodEnd: billing.cancelAtPeriodEnd || false,
        trialEndsAt: billing.trialEndsAt?.toDate(),
        createdAt: orgData.createdAt?.toDate() || new Date(),
        updatedAt: orgData.updatedAt?.toDate() || new Date(),
        features: this.getTierFeatures(billing.subscriptionTier as SubscriptionTier),
        metadata: billing.metadata || {}
      };
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }
  
  /**
   * Get features for a subscription tier
   */
  getTierFeatures(tier: SubscriptionTier): TierFeatures {
    switch (tier) {
      case SubscriptionTier.CREATOR:
        return {
          maxAccounts: 5,
          maxScheduledPosts: 100,
          maxTeamMembers: 3,
          hasVideoPosting: false,
          hasBulkScheduling: false,
          hasCustomBranding: false,
          hasAIContentTools: true,
          hasAdvancedAnalytics: false,
          hasCustomerSupport: true,
          supportLevel: 'basic'
        };
      
      case SubscriptionTier.INFLUENCER:
        return {
          maxAccounts: -1, // Unlimited
          maxScheduledPosts: 500,
          maxTeamMembers: 10,
          hasVideoPosting: true,
          hasBulkScheduling: true,
          hasCustomBranding: false,
          hasAIContentTools: true,
          hasAdvancedAnalytics: true,
          hasCustomerSupport: true,
          supportLevel: 'priority'
        };
      
      case SubscriptionTier.ENTERPRISE:
        return {
          maxAccounts: -1, // Unlimited
          maxScheduledPosts: -1, // Unlimited
          maxTeamMembers: -1, // Unlimited
          hasVideoPosting: true,
          hasBulkScheduling: true,
          hasCustomBranding: true,
          hasAIContentTools: true,
          hasAdvancedAnalytics: true,
          hasCustomerSupport: true,
          supportLevel: 'dedicated'
        };
      
      default:
        return {
          maxAccounts: 0,
          maxScheduledPosts: 0,
          maxTeamMembers: 0,
          hasVideoPosting: false,
          hasBulkScheduling: false,
          hasCustomBranding: false,
          hasAIContentTools: false,
          hasAdvancedAnalytics: false,
          hasCustomerSupport: false,
          supportLevel: 'basic'
        };
    }
  }
  
  /**
   * Check if user is within usage limits for a feature
   */
  async checkUsageLimits(userId: string, usageType: keyof UsageData): Promise<boolean> {
    try {
      const subscription = await this.getSubscription(userId);
      
      if (!subscription) {
        return false;
      }
      
      // Get current usage (this would typically come from a usage tracking collection)
      const currentUsage = await this.getCurrentUsage(userId, usageType);
      
      // Get limits for the tier
      const features = subscription.features;
      
      switch (usageType) {
        case 'connect_accounts':
          return features.maxAccounts === -1 || currentUsage < features.maxAccounts;
        
        case 'post_scheduling':
          return features.maxScheduledPosts === -1 || currentUsage < features.maxScheduledPosts;
        
        case 'team_members':
          return features.maxTeamMembers === -1 || currentUsage < features.maxTeamMembers;
        
        case 'ai_content_generation':
        case 'ai_caption_writing':
        case 'ai_hashtag_suggestions':
        case 'ai_image_generation':
          return features.hasAIContentTools;
        
        default:
          return true;
      }
    } catch (error) {
      console.error('Error checking usage limits:', error);
      return false;
    }
  }
  
  /**
   * Get current usage for a user and feature type
   */
  private async getCurrentUsage(userId: string, usageType: keyof UsageData): Promise<number> {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        throw new Error('Database not configured');
      }
      // Get user's organization for proper billing context
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;

      if (!organizationId) {
        throw new Error('No organization found for user');
      }

      // Get usage from dedicated usage tracking collection
      const usageDoc = await getDoc(doc(firestore, 'organizationUsage', organizationId));
      
      if (!usageDoc.exists()) {
        // Initialize usage tracking for new organization
        await this.initializeUsageTracking(organizationId);
        return 0;
      }
      
      const usageData = usageDoc.data();
      const currentPeriod = this.getCurrentBillingPeriod();
      
      // Get usage for current billing period
      const periodUsage = usageData.periods?.[currentPeriod];
      if (!periodUsage) {
        return 0;
      }
      
      return periodUsage[usageType] || 0;
    } catch (error) {
      console.error('Error getting current usage:', error);
      throw error;
    }
  }

  /**
   * Initialize usage tracking for an organization
   */
  private async initializeUsageTracking(organizationId: string): Promise<void> {
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      throw new Error('Database not configured');
    }
    const currentPeriod = this.getCurrentBillingPeriod();

    await setDoc(doc(firestore, 'organizationUsage', organizationId), {
      organizationId,
      periods: {
        [currentPeriod]: {
          connect_accounts: 0,
          post_scheduling: 0,
          team_members: 0,
          ai_content_generation: 0,
          ai_caption_writing: 0,
          ai_hashtag_suggestions: 0,
          ai_image_generation: 0
        }
      },
      lastUpdated: new Date(),
      createdAt: new Date()
    });
  }

  /**
   * Get current billing period (YYYY-MM format)
   */
  private getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Increment usage for a specific feature
   */
  async incrementUsage(
    organizationId: string,
    usageType: keyof UsageData,
    amount: number = 1
  ): Promise<void> {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        throw new Error('Database not configured');
      }
      const currentPeriod = this.getCurrentBillingPeriod();
      const usageRef = doc(firestore, 'organizationUsage', organizationId);

      // Use Firestore transaction for atomic updates
      await runTransaction(firestore, async (transaction) => {
        const usageDoc = await transaction.get(usageRef);
        
        if (!usageDoc.exists()) {
          // Initialize if doesn't exist
          transaction.set(usageRef, {
            organizationId,
            periods: {
              [currentPeriod]: {
                connect_accounts: usageType === 'connect_accounts' ? amount : 0,
                post_scheduling: usageType === 'post_scheduling' ? amount : 0,
                team_members: usageType === 'team_members' ? amount : 0,
                ai_content_generation: usageType === 'ai_content_generation' ? amount : 0,
                ai_caption_writing: usageType === 'ai_caption_writing' ? amount : 0,
                ai_hashtag_suggestions: usageType === 'ai_hashtag_suggestions' ? amount : 0,
                ai_image_generation: usageType === 'ai_image_generation' ? amount : 0
              }
            },
            lastUpdated: new Date(),
            createdAt: new Date()
          });
        } else {
          const data = usageDoc.data();
          const periods = data.periods || {};
          const currentPeriodData = periods[currentPeriod] || {};
          
          // Increment the specific usage type
          currentPeriodData[usageType] = (currentPeriodData[usageType] || 0) + amount;
          periods[currentPeriod] = currentPeriodData;
          
          transaction.update(usageRef, {
            periods,
            lastUpdated: new Date()
          });
        }
      });
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics for an organization
   */
  async getUsageStats(organizationId: string): Promise<UsageData> {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        throw new Error('Database not configured');
      }
      const currentPeriod = this.getCurrentBillingPeriod();
      const usageDoc = await getDoc(doc(firestore, 'organizationUsage', organizationId));
      
      if (!usageDoc.exists()) {
        return {
          connect_accounts: 0,
          post_scheduling: 0,
          team_members: 0,
          ai_content_generation: 0,
          ai_caption_writing: 0,
          ai_hashtag_suggestions: 0,
          ai_image_generation: 0
        };
      }
      
      const data = usageDoc.data();
      const periodUsage = data.periods?.[currentPeriod] || {};
      
      return {
        connect_accounts: periodUsage.connect_accounts || 0,
        post_scheduling: periodUsage.post_scheduling || 0,
        team_members: periodUsage.team_members || 0,
        ai_content_generation: periodUsage.ai_content_generation || 0,
        ai_caption_writing: periodUsage.ai_caption_writing || 0,
        ai_hashtag_suggestions: periodUsage.ai_hashtag_suggestions || 0,
        ai_image_generation: periodUsage.ai_image_generation || 0
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      throw error;
    }
  }
}

// Export types
export type { SubscriptionTier, TierFeatures };

// Export singleton instance
const subscriptionService = new SubscriptionService();
export default subscriptionService; 
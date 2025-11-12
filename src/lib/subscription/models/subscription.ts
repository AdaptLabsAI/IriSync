/**
 * Subscription model definitions
 */

/**
 * Subscription tier options
 */
export enum SubscriptionTier {
  CREATOR = 'creator',
  INFLUENCER = 'influencer',
  ENTERPRISE = 'enterprise'
}

/**
 * Subscription status options
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete'
}

/**
 * Tier features definition
 */
export interface TierFeatures {
  maxAccounts: number;
  maxScheduledPosts: number;
  maxTeamMembers: number;
  hasVideoPosting: boolean;
  hasBulkScheduling: boolean;
  hasCustomBranding: boolean;
  hasAIContentTools: boolean;
  hasAdvancedAnalytics: boolean;
  hasCustomerSupport: boolean;
  supportLevel: 'basic' | 'priority' | 'dedicated';
}

/**
 * Subscription data model
 */
export interface SubscriptionData {
  id: string;
  userId: string;
  organizationId?: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  features: TierFeatures;
  metadata?: Record<string, any>;
}

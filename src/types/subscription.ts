// User subscription tiers
export type SubscriptionTier = 'trial' | 'creator' | 'influencer' | 'enterprise' | 'admin';

// Subscription status
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid';

// User subscription interface
export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  trialEndsAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Feature limits by tier
export interface TierLimits {
  socialAccounts: number | 'unlimited';
  userSeats: number | 'unlimited';
  aiGenerationsPerMonth: number | 'unlimited';
  videoScheduling: boolean;
  bulkScheduling: boolean;
  customBrandedUrls: boolean;
  postApprovalWorkflows: boolean;
  competitorBenchmarking: number;
  customReports: boolean;
  linkTracking: boolean;
  customDashboard: boolean;
  smartReplies: boolean;
  brandRecognition: boolean;
  socialListening: boolean;
  advancedListening: boolean;
  sentimentAnalysis: boolean;
  customUserRoles: boolean;
  dedicatedAccountManager: boolean;
  prioritySupport: boolean;
}

// Tier configurations
export const TIER_CONFIGS: Record<SubscriptionTier, TierLimits> = {
  trial: {
    socialAccounts: 5,
    userSeats: 1,
    aiGenerationsPerMonth: 500, // Full influencer features during trial
    videoScheduling: true,
    bulkScheduling: true,
    customBrandedUrls: true,
    postApprovalWorkflows: true,
    competitorBenchmarking: 10,
    customReports: true,
    linkTracking: true,
    customDashboard: true,
    smartReplies: false,
    brandRecognition: false,
    socialListening: false,
    advancedListening: false,
    sentimentAnalysis: false,
    customUserRoles: false,
    dedicatedAccountManager: false,
    prioritySupport: false,
  },
  creator: {
    socialAccounts: 5,
    userSeats: 1,
    aiGenerationsPerMonth: 100,
    videoScheduling: false,
    bulkScheduling: false,
    customBrandedUrls: false,
    postApprovalWorkflows: false,
    competitorBenchmarking: 0,
    customReports: false,
    linkTracking: false,
    customDashboard: false,
    smartReplies: false,
    brandRecognition: false,
    socialListening: false,
    advancedListening: false,
    sentimentAnalysis: false,
    customUserRoles: false,
    dedicatedAccountManager: false,
    prioritySupport: false,
  },
  influencer: {
    socialAccounts: 'unlimited',
    userSeats: 1,
    aiGenerationsPerMonth: 500,
    videoScheduling: true,
    bulkScheduling: true,
    customBrandedUrls: true,
    postApprovalWorkflows: true,
    competitorBenchmarking: 10,
    customReports: true,
    linkTracking: true,
    customDashboard: true,
    smartReplies: false,
    brandRecognition: false,
    socialListening: false,
    advancedListening: false,
    sentimentAnalysis: false,
    customUserRoles: false,
    dedicatedAccountManager: false,
    prioritySupport: false,
  },
  enterprise: {
    socialAccounts: 'unlimited',
    userSeats: 'unlimited',
    aiGenerationsPerMonth: 'unlimited',
    videoScheduling: true,
    bulkScheduling: true,
    customBrandedUrls: true,
    postApprovalWorkflows: true,
    competitorBenchmarking: 20,
    customReports: true,
    linkTracking: true,
    customDashboard: true,
    smartReplies: true,
    brandRecognition: true,
    socialListening: true,
    advancedListening: true,
    sentimentAnalysis: true,
    customUserRoles: true,
    dedicatedAccountManager: true,
    prioritySupport: true,
  },
  admin: {
    socialAccounts: 'unlimited',
    userSeats: 'unlimited',
    aiGenerationsPerMonth: 'unlimited',
    videoScheduling: true,
    bulkScheduling: true,
    customBrandedUrls: true,
    postApprovalWorkflows: true,
    competitorBenchmarking: 'unlimited' as any,
    customReports: true,
    linkTracking: true,
    customDashboard: true,
    smartReplies: true,
    brandRecognition: true,
    socialListening: true,
    advancedListening: true,
    sentimentAnalysis: true,
    customUserRoles: true,
    dedicatedAccountManager: true,
    prioritySupport: true,
  },
};

// Trial configuration
export const TRIAL_CONFIG = {
  durationDays: 7,
  tier: 'trial' as SubscriptionTier,
  defaultUpgradeTier: 'creator' as SubscriptionTier,
  requiresBillingInfo: true,
};

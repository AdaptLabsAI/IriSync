/**
 * Token management types for AI usage
 */

/**
 * Subscription tier token limits configuration
 */
export enum SubscriptionTier {
  CREATOR = 'creator',
  INFLUENCER = 'influencer',
  ENTERPRISE = 'enterprise'
}

/**
 * Token limits by subscription tier
 */
export const TIER_TOKEN_LIMITS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.CREATOR]: 100,
  [SubscriptionTier.INFLUENCER]: 500,
  [SubscriptionTier.ENTERPRISE]: 5000 // Base tokens for minimum 5 seats (1000 per seat)
};

/**
 * Additional tokens per enterprise seat beyond the initial 5
 */
export const ENTERPRISE_TOKENS_PER_ADDITIONAL_SEAT = 500;

/**
 * Subscription pricing by tier (monthly in USD)
 */
export const TIER_PRICING: Record<Exclude<SubscriptionTier, SubscriptionTier.ENTERPRISE>, number> = {
  [SubscriptionTier.CREATOR]: 80, // $80/month
  [SubscriptionTier.INFLUENCER]: 200 // $200/month
};

/**
 * Enterprise pricing
 */
export const ENTERPRISE_PRICING = {
  BASE_PRICE: 250 * 5, // $250 per seat for minimum 5 seats
  ADDITIONAL_SEAT_PRICE: 150 // $150 for each additional seat
};

/**
 * Usage notification thresholds (percentage of total)
 */
export const TOKEN_USAGE_NOTIFICATION_THRESHOLDS = [75, 90, 100];

/**
 * Token usage record for analytics and tracking
 */
export interface TokenUsageRecord {
  userId: string;
  timestamp: Date;
  taskType: string;
  tokensUsed: number;
  remainingTokens: number;
  provider: string;
  model: string;
  operation: string;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * Token balance for a user
 */
export interface TokenBalance {
  userId: string;
  totalTokens: number;
  usedTokens: number;
  remainingTokens: number;
  lastResetDate: Date;
  nextResetDate: Date;
  additionalTokensPurchased: number;
}

/**
 * Token purchase transaction
 */
export interface TokenPurchaseTransaction {
  transactionId: string;
  userId: string;
  timestamp: Date;
  tokenAmount: number;
  cost: number;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed';
  stripePaymentId?: string;
}

/**
 * Token usage notification record
 */
export interface TokenUsageNotification {
  userId: string;
  timestamp: Date;
  thresholdPercentage: number;
  tokenBalance: TokenBalance;
  notificationSent: boolean;
  notificationMethod: 'email' | 'in-app' | 'both';
}

import { SubscriptionTier } from '../../subscription/models/subscription';

/**
 * Interface representing a user's token balance
 */
export interface TokenBalance {
  /**
   * Unique identifier for the token balance record
   */
  id?: string;
  
  /**
   * User ID associated with this token balance
   */
  userId: string;
  
  /**
   * Organization ID (optional)
   */
  organizationId?: string;
  
  /**
   * Number of tokens currently available for use
   */
  available: number;
  
  /**
   * Number of tokens used in the current period
   */
  used: number;
  
  /**
   * Total number of tokens allocated for the current period
   */
  total: number;
  
  /**
   * Maximum number of tokens allowed for this user
   */
  limit: number;
  
  /**
   * Date when tokens will reset (typically start of next billing period)
   */
  nextResetDate: Date;
  
  /**
   * Subscription tier associated with this token balance
   */
  subscriptionTier?: SubscriptionTier;
  
  /**
   * Whether this account is exempt from token limits (admin or special case)
   */
  unlimitedAccess?: boolean;
  
  /**
   * Timestamp of last update to this balance
   */
  lastUpdated: Date;
  
  /**
   * Timestamp of when the account was created
   */
  createdAt: Date;
  
  /**
   * Flag indicating if the user has been notified of low balance
   */
  lowBalanceNotified?: boolean;
  
  /**
   * Flag indicating if the user has been notified of depleted balance
   */
  depletedBalanceNotified?: boolean;
}

/**
 * Interface for a snapshot of token usage
 */
export interface TokenUsageSnapshot {
  /**
   * User ID
   */
  userId: string;
  
  /**
   * Organization ID
   */
  organizationId?: string;
  
  /**
   * Total tokens used
   */
  used: number;
  
  /**
   * Tokens used by task type
   */
  byTaskType: Record<string, number>;
  
  /**
   * Tokens used by provider
   */
  byProvider: Record<string, number>;
  
  /**
   * Timestamp of snapshot creation
   */
  timestamp: Date;
  
  /**
   * Period this snapshot represents
   */
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  
  /**
   * Date period started (e.g., start of month)
   */
  periodStart: Date;
  
  /**
   * Date period ends (e.g., end of month)
   */
  periodEnd: Date;
}

/**
 * Monthly token limits by subscription tier
 */
export const MONTHLY_TOKEN_LIMITS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.CREATOR]: 100,     // As per Iris Dev Plan
  [SubscriptionTier.INFLUENCER]: 500,  // As per Iris Dev Plan
  [SubscriptionTier.ENTERPRISE]: 5000  // Base amount for minimum 5 seats
};

/**
 * Calculate the total tokens for an Enterprise tier account based on seat count
 * @param baseSeats Base number of seats (5)
 * @param actualSeats Actual number of seats in the organization
 * @returns Total token allocation for the organization
 */
export function calculateEnterpriseTokens(baseSeats: number, actualSeats: number): number {
  // Enterprise tier: 5,000 base tokens for minimum 5 seats, plus 500 additional tokens per seat beyond 5
  if (actualSeats <= baseSeats) {
    return MONTHLY_TOKEN_LIMITS[SubscriptionTier.ENTERPRISE];
  }
  
  const additionalSeats = actualSeats - baseSeats;
  const additionalTokens = additionalSeats * 500; // 500 tokens per additional seat
  
  return MONTHLY_TOKEN_LIMITS[SubscriptionTier.ENTERPRISE] + additionalTokens;
}

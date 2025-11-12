import { Timestamp } from 'firebase/firestore';

/**
 * Referral status enum
 */
export enum ReferralStatus {
  PENDING = 'pending',           // Referred user signed up but trial not complete
  TRIAL_ACTIVE = 'trial_active', // Referred user in trial period
  COMPLETED = 'completed',       // Referred user completed first paid month
  EXPIRED = 'expired',          // Referral expired before completion
  CANCELLED = 'cancelled'       // Referred user cancelled before completion
}

/**
 * Referral reward status
 */
export enum RewardStatus {
  PENDING = 'pending',
  AWARDED = 'awarded',
  FAILED = 'failed'
}

/**
 * Referral interface for Firestore
 */
export interface Referral {
  id: string;
  referrerUserId: string;        // User who made the referral
  referredUserId: string;        // User who was referred
  referralCode: string;          // Code used for referral
  status: ReferralStatus;
  rewardStatus: RewardStatus;
  
  // Tracking dates
  createdAt: Timestamp;
  trialStartedAt?: Timestamp;
  trialEndedAt?: Timestamp;
  firstPaymentAt?: Timestamp;
  rewardAwardedAt?: Timestamp;
  
  // Reward details
  rewardTokens: number;          // Number of tokens to award (default: 100)
  rewardTransactionId?: string;  // Token transaction ID when reward is given
  
  // Additional metadata
  referredUserEmail?: string;
  referrerUserEmail?: string;
  referredSubscriptionTier?: string;
  
  // Tracking info
  ipAddress?: string;
  userAgent?: string;
  source?: string;               // Where the referral came from (email, social, etc.)
}

/**
 * User referral stats interface
 */
export interface UserReferralStats {
  userId: string;
  referralCode: string;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalTokensEarned: number;
  lastReferralDate?: Timestamp;
  
  // Monthly breakdown
  monthlyStats: {
    month: string; // YYYY-MM format
    referrals: number;
    completedReferrals: number;
    tokensEarned: number;
  }[];
}

/**
 * Referral code validation result
 */
export interface ReferralCodeValidation {
  isValid: boolean;
  code?: string;
  referrerUserId?: string;
  referrerName?: string;
  error?: string;
}

/**
 * Default referral reward amount
 */
export const DEFAULT_REFERRAL_REWARD_TOKENS = 100;

/**
 * Referral code configuration
 */
export const REFERRAL_CONFIG = {
  codeLength: 12,
  codePrefix: 'IRIS',
  maxAttempts: 5, // Max attempts to generate unique code
  expirationDays: 365, // Referral codes never expire, but we track this for future use
  rewardTokens: DEFAULT_REFERRAL_REWARD_TOKENS
}; 
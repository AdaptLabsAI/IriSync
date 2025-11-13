import { TokenService } from './token-service';
import { TokenRepository } from './token-repository';
import { 
  trackTokenUsage, 
  tokenUsageMiddleware, 
  trackDirectTokenUsage,
  calculateTokenPurchasePrice,
  getRemainingTokens
} from './token-tracker';
import { TokenLimiter, limitTokenUsage, createTokenLimiter } from './token-limiter';
import { 
  TokenPurchaseService, 
  createTokenPurchaseService, 
  TOKEN_PACKAGES,
  TokenPurchaseRequest,
  TokenPurchaseResponse
} from './token-purchase';
import { NotificationService } from '../core/notifications/NotificationService';
import { firebaseAdmin } from '../core/firebase/admin';
import {
  SubscriptionTier,
  TIER_TOKEN_LIMITS,
  ENTERPRISE_TOKENS_PER_ADDITIONAL_SEAT,
  TOKEN_USAGE_NOTIFICATION_THRESHOLDS,
  TokenBalance,
  TokenUsageRecord,
  TokenPurchaseTransaction,
  TokenUsageNotification
} from '../ai/models/tokens';

/**
 * Create a token service instance
 * @returns TokenService instance
 */
export function createTokenService(): TokenService {
  // Create required dependencies
  const tokenRepository = new TokenRepository(firebaseAdmin.firestore());
  const notificationService = new NotificationService();
  
  return new TokenService(tokenRepository, notificationService);
}

// Export all token management components
export {
  // Services
  TokenService,
  TokenRepository,
  TokenLimiter,
  TokenPurchaseService,
  
  // Factory functions
  createTokenLimiter,
  createTokenPurchaseService,
  
  // Middlewares
  trackTokenUsage,
  tokenUsageMiddleware,
  limitTokenUsage,
  
  // Utility functions
  trackDirectTokenUsage,
  calculateTokenPurchasePrice,
  getRemainingTokens,
  
  // Constants
  TOKEN_PACKAGES,
  TIER_TOKEN_LIMITS,
  ENTERPRISE_TOKENS_PER_ADDITIONAL_SEAT,
  TOKEN_USAGE_NOTIFICATION_THRESHOLDS
};

// Export types
export type {
  SubscriptionTier,
  TokenBalance,
  TokenUsageRecord,
  TokenPurchaseTransaction,
  TokenUsageNotification,
  TokenPurchaseRequest,
  TokenPurchaseResponse
};

/**
 * Token Management Module
 * 
 * This module handles all aspects of the token-based system for AI features:
 * 
 * - Token balances and subscription-based allocations
 * - Token usage tracking and analytics
 * - Token purchases for additional capacity
 * - Usage limitations based on subscription tier
 * - Notifications for token usage milestones
 * 
 * Each subscription tier includes a monthly allocation of tokens:
 * - Creator ($80/mo): 100 tokens/month
 * - Influencer ($200/mo): 500 tokens/month
 * - Enterprise: 5,000 base tokens + 500 per seat beyond 5
 * 
 * Additional tokens can be purchased in packages:
 * - Small: 50 tokens for $10
 * - Medium: 100 tokens for $18
 * - Large: 500 tokens for $80
 * - Enterprise: 1,000 tokens for $150
 * 
 * Tokens are reset on monthly subscription renewal.
 */

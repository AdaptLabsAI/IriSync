import { firestore } from '../core/firebase';
import { doc, getDoc, updateDoc, increment, setDoc, collection, query, where, getDocs, Timestamp, limit, orderBy } from 'firebase/firestore';
import { SubscriptionTier } from '../subscription/models/subscription';
import { TokenRepository } from './token-repository';
import { NotificationService } from '../core/notifications/NotificationService';
import { logger } from '../logging/logger';

/**
 * Monthly token limits by subscription tier
 */
export const MONTHLY_TOKEN_LIMITS = {
  [SubscriptionTier.CREATOR]: 100,
  [SubscriptionTier.INFLUENCER]: 500,
  [SubscriptionTier.ENTERPRISE]: 5000 // Base limit, additional per seat are handled separately
};

/**
 * Maximum seats by subscription tier
 */
export const MAX_SEATS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.CREATOR]: 3,     // Base + 2 additional
  [SubscriptionTier.INFLUENCER]: 10, // Base + 9 additional
  [SubscriptionTier.ENTERPRISE]: Infinity // No hard cap
};

/**
 * Additional tokens per seat by subscription tier
 */
export const ADDITIONAL_TOKENS_PER_SEAT: Record<SubscriptionTier, number> = {
  [SubscriptionTier.CREATOR]: 100,
  [SubscriptionTier.INFLUENCER]: 500,
  [SubscriptionTier.ENTERPRISE]: 500
};

/**
 * Minimum seats required by subscription tier
 */
export const MIN_SEATS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.CREATOR]: 1,
  [SubscriptionTier.INFLUENCER]: 1,
  [SubscriptionTier.ENTERPRISE]: 5
};

/**
 * Cost per additional token (in cents)
 */
export const ADDITIONAL_TOKEN_COST = 0.50; // $0.50 per token

/**
 * Interface for token balance
 */
export interface TokenBalance {
  userId: string;
  organizationId?: string;
  // Total available tokens (baseTokens + purchasedTokens)
  available: number;
  // Tokens used in the current period
  used: number;
  // Total tokens allocated (baseTokens + purchasedTokens)
  total: number;
  // Monthly limit based on subscription tier
  limit: number;
  // Base tokens from subscription tier
  baseTokens: number;
  // Additional purchased tokens
  purchasedTokens: number;
  // Next reset date for base tokens
  nextResetDate: Date;
  lastUpdated: Date;
  tier: SubscriptionTier;
}

/**
 * Interface for token purchase
 */
export interface TokenPurchase {
  userId: string;
  organizationId?: string;
  amount: number;
  cost: number;
  purchaseDate: Date;
  paymentId?: string;
  status: 'completed' | 'pending' | 'failed';
}

/**
 * Production-ready Token Service for managing AI usage tokens
 */
export class TokenService {
  private tokenRepository: TokenRepository;
  private notificationService: NotificationService;
  private alertThresholds = [75, 90, 100]; // Percentage thresholds for alerts

  /**
   * Create a token service
   * @param tokenRepository Repository for token storage
   * @param notificationService Service for sending notifications
   */
  constructor(tokenRepository: TokenRepository, notificationService: NotificationService) {
    this.tokenRepository = tokenRepository;
    this.notificationService = notificationService;
    
    logger.info('TokenService initialized');
  }

  /**
   * Get token balance for a user based on their organization
   * @param userId User ID
   * @param organizationId Optional organization ID (will use user's current/personal org if not provided)
   * @returns Token balance
   */
  async getTokenBalance(userId: string, organizationId?: string): Promise<TokenBalance> {
    logger.debug('Getting token balance', { userId, organizationId });
    
    try {
      // Get user document to find their organization
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error(`User ${userId} not found when getting token balance`);
      }
      
      const userData = userDoc.data();
      
      // Get the organization ID (from parameter, or user's current/personal org)
      const orgId = organizationId || userData.currentOrganizationId || userData.personalOrganizationId;
      
      if (!orgId) {
        throw new Error(`No organization found for user ${userId}`);
      }
      
      // Get organization document
      const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
      
      if (!orgDoc.exists()) {
        throw new Error(`Organization ${orgId} not found for user ${userId}`);
      }
      
      const organization = orgDoc.data();
      
      // Get subscription tier from organization billing
      const tier = (organization.billing?.subscriptionTier as SubscriptionTier) || SubscriptionTier.CREATOR;
      
      // Get token usage from organization quotas
      const usageQuota = organization.usageQuota || {};
      const aiTokens = usageQuota.aiTokens || {
        limit: MONTHLY_TOKEN_LIMITS[tier],
        used: 0
      };
      
      // Calculate available tokens
      const baseTokens = aiTokens.limit || MONTHLY_TOKEN_LIMITS[tier];
      const purchasedTokens = aiTokens.purchased || 0;
      const used = aiTokens.used || 0;
      const available = Math.max(0, (baseTokens + purchasedTokens) - used);
      
      // Create token balance object
      const balance: TokenBalance = {
        userId,
        organizationId: orgId,
        baseTokens,
        purchasedTokens,
        available,
        used,
        total: baseTokens + purchasedTokens,
        limit: baseTokens,
        nextResetDate: new Date(organization.billing?.currentPeriodEnd?.toDate() || this.getNextResetDate()),
        lastUpdated: new Date(),
        tier
      };
      
      return balance;
    } catch (error) {
      logger.error('Error getting token balance', { userId, error });
      
      // Return default balance if error occurs
      return {
        userId,
        available: 0,
        used: 0,
        total: 0,
        limit: 0,
        baseTokens: 0,
        purchasedTokens: 0,
        nextResetDate: this.getNextResetDate(),
        lastUpdated: new Date(),
        tier: SubscriptionTier.CREATOR
      };
    }
  }
  
  /**
   * Check if a user has sufficient tokens
   * @param userId User ID
   * @param tokensNeeded Number of tokens needed
   * @param organizationId Optional organization ID
   * @returns Whether sufficient tokens are available
   */
  async hasSufficientTokens(userId: string, tokensNeeded: number, organizationId?: string): Promise<boolean> {
    try {
      const balance = await this.getTokenBalance(userId, organizationId);
      return balance.available >= tokensNeeded;
    } catch (error) {
      logger.error('Error checking token sufficiency', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tokensNeeded,
        organizationId
      });
      
      return false;
    }
  }

  /**
   * Use tokens for an AI task
   * @param userId User ID
   * @param taskType Task type
   * @param tokenCount Number of tokens to use
   * @param metadata Optional metadata about the task
   * @returns Whether the operation was successful
   */
  async useTokens(userId: string, taskType: string, tokenCount: number, metadata?: Record<string, any>): Promise<boolean> {
    try {
      if (tokenCount <= 0) {
        logger.warn('Invalid token amount', { userId, tokenCount });
        return false;
      }
      
      // Get user document to find their organization
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error(`User ${userId} not found when using tokens`);
      }
      
      const userData = userDoc.data();
      
      // Get the organization ID (from metadata, or user's current/personal org)
      const orgId = metadata?.organizationId || userData.currentOrganizationId || userData.personalOrganizationId;
      
      if (!orgId) {
        throw new Error(`No organization found for user ${userId}`);
      }
      
      // Get organization document
      const orgDocRef = doc(firestore, 'organizations', orgId);
      const orgDoc = await getDoc(orgDocRef);
      
      if (!orgDoc.exists()) {
        throw new Error(`Organization ${orgId} not found for user ${userId}`);
      }
      
      const organization = orgDoc.data();
      
      // Get token usage from organization quotas
      const usageQuota = organization.usageQuota || {};
      const aiTokens = usageQuota.aiTokens || {
        limit: 0,
        used: 0,
        purchased: 0
      };
      
      // Calculate available tokens
      const totalTokens = (aiTokens.limit || 0) + (aiTokens.purchased || 0);
      const usedTokens = aiTokens.used || 0;
      const availableTokens = Math.max(0, totalTokens - usedTokens);
      
      // Check if there are enough tokens
      if (availableTokens < tokenCount) {
        logger.warn('Insufficient tokens', {
          userId,
          tokenCount,
          available: availableTokens,
          taskType
        });
        return false;
      }
      
      // Update the token usage in the organization
      await updateDoc(orgDocRef, {
        'usageQuota.aiTokens.used': increment(tokenCount),
        updatedAt: Timestamp.now()
      });
      
      // Record the usage
      await this.tokenRepository.recordTokenUsage({
        userId,
        amount: tokenCount,
        taskType,
        timestamp: new Date(),
        metadata: metadata ? { 
          ...metadata, 
          organizationId: orgId
        } : { 
          organizationId: orgId
        }
      } as any);
      
      // Get the token balance for alert checks
      const balance = await this.getTokenBalance(userId, orgId);
      
      // Check if we need to send usage alerts
      await this.checkAndSendUsageAlerts(userId, balance);
      
      logger.debug('Tokens used successfully', {
        userId,
        amount: tokenCount,
        taskType,
        remaining: availableTokens - tokenCount,
        organizationId: orgId
      });
      
      return true;
    } catch (error) {
      logger.error('Error using tokens', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tokenCount,
        taskType
      });
      
      return false;
    }
  }
  
  /**
   * Add tokens to an organization's quota
   * @param userId User ID
   * @param amount Number of tokens to add
   * @param organizationId Optional organization ID (will use user's current/personal org if not provided)
   * @param paymentId Optional payment ID
   * @returns Whether the operation was successful
   */
  async addTokens(userId: string, amount: number, organizationId?: string, paymentId?: string): Promise<boolean> {
    try {
      if (amount <= 0) {
        logger.warn('Invalid token amount', { userId, amount });
        return false;
      }
      
      // Get user document to find their organization
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error(`User ${userId} not found when adding tokens`);
      }
      
      const userData = userDoc.data();
      
      // Get the organization ID (from parameter, or user's current/personal org)
      const orgId = organizationId || userData.currentOrganizationId || userData.personalOrganizationId;
      
      if (!orgId) {
        throw new Error(`No organization found for user ${userId}`);
      }
      
      // Get organization document
      const orgDocRef = doc(firestore, 'organizations', orgId);
      const orgDoc = await getDoc(orgDocRef);
      
      if (!orgDoc.exists()) {
        throw new Error(`Organization ${orgId} not found for user ${userId}`);
      }
      
      // Update the organization's purchased tokens
      await updateDoc(orgDocRef, {
        'usageQuota.aiTokens.purchased': increment(amount),
        updatedAt: Timestamp.now()
      });
      
      // Record the purchase
      await this.tokenRepository.saveTokenPurchase({
        userId,
        amount,
        cost: amount * ADDITIONAL_TOKEN_COST,
        purchaseDate: new Date(),
        paymentId,
        status: 'completed',
        metadata: { 
          organizationId: orgId,
          purchasedTokens: true 
        }
      } as any);
      
      logger.info('Purchased tokens added successfully', {
        userId,
        amount,
        organizationId: orgId,
        paymentId
      });
      
      return true;
    } catch (error) {
      logger.error('Error adding tokens', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        amount,
        organizationId
      });
      
      return false;
    }
  }
  
  /**
   * Reset monthly tokens for a user
   * @param userId User ID
   * @param organizationId Optional organization ID
   * @returns Whether the operation was successful
   */
  async resetMonthlyTokens(userId: string, organizationId?: string): Promise<boolean> {
    try {
      // Get the user's token balance
      const balance = await this.getTokenBalance(userId, organizationId);
      
      // Calculate the new token limit (may have changed if subscription tier changed)
      let baseTokenLimit = MONTHLY_TOKEN_LIMITS[balance.tier as keyof typeof MONTHLY_TOKEN_LIMITS];
      
      // Add tokens based on additional seats for all tiers
      if (balance.organizationId) {
        const orgDoc = await (this.tokenRepository as any).getOrganizationDocument(balance.organizationId);
        
        if (orgDoc) {
          const minSeats = MIN_SEATS[balance.tier as SubscriptionTier] || 1;
          const maxSeats = MAX_SEATS[balance.tier as SubscriptionTier] || minSeats;
          const actualSeats = Math.min(orgDoc.seats || minSeats, maxSeats);
          
          if (actualSeats > minSeats) {
            // Add appropriate tokens per additional seat based on tier
            baseTokenLimit += (actualSeats - minSeats) * 
              ADDITIONAL_TOKENS_PER_SEAT[balance.tier as SubscriptionTier];
            
            logger.debug('Added tokens for additional seats during reset', {
              tier: balance.tier,
              minSeats,
              actualSeats,
              additionalSeats: actualSeats - minSeats,
              tokensPerSeat: ADDITIONAL_TOKENS_PER_SEAT[balance.tier as SubscriptionTier],
              additionalTokens: (actualSeats - minSeats) * 
                ADDITIONAL_TOKENS_PER_SEAT[balance.tier as SubscriptionTier],
              finalBaseTokens: baseTokenLimit
            });
          }
        }
      }
      
      // Preserve purchased tokens, only reset base tokens
      const updatedBalance: TokenBalance = {
        ...balance,
        baseTokens: baseTokenLimit,
        // Keep purchased tokens intact
        purchasedTokens: balance.purchasedTokens,
        // Total available is sum of reset base tokens + existing purchased tokens
        available: baseTokenLimit + balance.purchasedTokens,
        used: 0,
        total: baseTokenLimit + balance.purchasedTokens,
        limit: baseTokenLimit, // The limit refers only to base tokens
        nextResetDate: this.getNextResetDate(),
        lastUpdated: new Date()
      };
      
      // Save the updated balance
      await this.tokenRepository.saveTokenBalance(updatedBalance as any);
      
      // Record the reset
      await this.tokenRepository.recordTokenUsage({
        userId,
        amount: 0,
        taskType: 'monthly_reset',
        timestamp: new Date(),
        metadata: {
          previousUsed: balance.used,
          previousAvailable: balance.available,
          previousBaseTokens: balance.baseTokens,
          newBaseTokens: baseTokenLimit,
          purchasedTokensPreserved: balance.purchasedTokens,
          organizationId: balance.organizationId
        }
      } as any);
      
      // Reset the usage alerts
      await this.resetUsageAlerts(userId, balance.organizationId);
      
      logger.info('Monthly tokens reset successfully', {
        userId,
        tier: balance.tier,
        newBaseTokens: baseTokenLimit,
        preservedPurchasedTokens: balance.purchasedTokens,
        totalAvailable: updatedBalance.available,
        organizationId: balance.organizationId
      });
      
      return true;
    } catch (error) {
      logger.error('Error resetting monthly tokens', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        organizationId
      });
      
      return false;
    }
  }
  
  /**
   * Get token usage history for a user
   * @param userId User ID
   * @param limit Maximum number of records to return
   * @param startDate Optional start date
   * @param endDate Optional end date
   * @returns Array of usage records
   */
  async getTokenUsageHistory(userId: string, limit: number = 50, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      return await this.tokenRepository.getUserTokenUsage(userId, limit, startDate, endDate);
    } catch (error) {
      logger.error('Error getting token usage history', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      
      return [];
    }
  }
  
  /**
   * Get token purchase history for a user
   * @param userId User ID
   * @param limit Maximum number of records to return
   * @returns Array of purchase records
   */
  async getTokenPurchaseHistory(userId: string, limit: number = 20): Promise<any[]> {
    try {
      return await this.tokenRepository.getUserPurchaseHistory(userId, limit);
    } catch (error) {
      logger.error('Error getting token purchase history', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      
      return [];
    }
  }
  
  /**
   * Purchase additional tokens
   * @param userId User ID
   * @param amount Number of tokens to purchase
   * @param paymentMethod Payment method information
   * @param organizationId Optional organization ID
   * @returns Purchase details or error
   */
  async purchaseTokens(
    userId: string, 
    amount: number, 
    paymentMethod: any, 
    organizationId?: string
  ): Promise<{ success: boolean; purchase?: TokenPurchase; error?: string }> {
    try {
      if (amount <= 0) {
        return { 
          success: false, 
          error: 'Invalid token amount' 
        };
      }
      
      // Calculate cost
      const cost = amount * ADDITIONAL_TOKEN_COST;
      
      // Process payment (would integrate with Stripe or other payment provider)
      // This is a simplified placeholder for now
      const paymentResult = { 
        success: true, 
        paymentId: `pm_${Date.now()}_${Math.floor(Math.random() * 10000)}` 
      };
      
      if (!paymentResult.success) {
        return { 
          success: false, 
          error: 'Payment processing failed' 
        };
      }
      
      // Create the purchase record
      const purchase: TokenPurchase = {
        userId,
        organizationId,
        amount,
        cost,
        purchaseDate: new Date(),
        paymentId: paymentResult.paymentId,
        status: 'completed'
      };
      
      // Save the purchase record
      await this.tokenRepository.saveTokenPurchase(purchase as any);
      
      // Add tokens to the user's balance
      await this.addTokens(userId, amount, organizationId, paymentResult.paymentId);
      
      // Send notification
      await (this.notificationService as any).sendNotification(userId, {
        type: 'token_purchase',
        title: 'Token Purchase Successful',
        message: `You've successfully purchased ${amount} additional tokens.`,
        data: {
          amount,
          cost,
          purchaseDate: purchase.purchaseDate
        }
      });
      
      logger.info('Token purchase successful', {
        userId,
        amount,
        cost,
        organizationId,
        paymentId: paymentResult.paymentId
      });
      
      return { 
        success: true, 
        purchase 
      };
    } catch (error) {
      logger.error('Error purchasing tokens', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        amount,
        organizationId
      });
      
      return { 
        success: false, 
        error: 'Token purchase failed' 
      };
    }
  }
  
  /**
   * Update user's subscription tier
   * @param userId User ID
   * @param tier New subscription tier
   * @param organizationId Optional organization ID
   * @returns Whether the operation was successful
   */
  async updateSubscriptionTier(userId: string, tier: SubscriptionTier, organizationId?: string): Promise<boolean> {
    try {
      // Get the user's token balance
      const balance = await this.getTokenBalance(userId, organizationId);
      
      // Calculate the new token limit based on tier
      let tokenLimit = MONTHLY_TOKEN_LIMITS[tier as keyof typeof MONTHLY_TOKEN_LIMITS];
      
      // Add tokens based on additional seats for all tiers
      if (organizationId) {
        const orgDoc = await (this.tokenRepository as any).getOrganizationDocument(organizationId);
        
        if (orgDoc) {
          const minSeats = MIN_SEATS[tier as SubscriptionTier] || 1;
          const maxSeats = MAX_SEATS[tier as SubscriptionTier] || minSeats;
          const actualSeats = Math.min(orgDoc.seats || minSeats, maxSeats);
          
          if (actualSeats > minSeats) {
            // Add appropriate tokens per additional seat based on tier
            tokenLimit += (actualSeats - minSeats) * 
              ADDITIONAL_TOKENS_PER_SEAT[tier as SubscriptionTier];
            
            logger.debug('Added tokens for additional seats', {
              tier,
              minSeats,
              actualSeats,
              additionalSeats: actualSeats - minSeats,
              tokensPerSeat: ADDITIONAL_TOKENS_PER_SEAT[tier as SubscriptionTier],
              additionalTokens: (actualSeats - minSeats) * 
                ADDITIONAL_TOKENS_PER_SEAT[tier as SubscriptionTier],
              finalBaseTokens: tokenLimit
            });
          }
        }
      }
      
      // Update the balance
      const updatedBalance: TokenBalance = {
        ...balance,
        tier,
        limit: tokenLimit,
        // Add the difference between new limit and old limit to available tokens
        available: balance.available + (tokenLimit - balance.limit),
        total: balance.total + (tokenLimit - balance.limit),
        lastUpdated: new Date()
      };
      
      // Save the updated balance
      await this.tokenRepository.saveTokenBalance(updatedBalance as any);
      
      // Record the tier change
      await this.tokenRepository.recordTokenUsage({
        userId,
        amount: tokenLimit - balance.limit,
        taskType: 'tier_change',
        timestamp: new Date(),
        metadata: {
          previousTier: balance.tier,
          newTier: tier,
          previousLimit: balance.limit,
          newLimit: tokenLimit,
          organizationId: balance.organizationId
        }
      } as any);
      
      logger.info('Subscription tier updated successfully', {
        userId,
        previousTier: balance.tier,
        newTier: tier,
        newLimit: tokenLimit,
        organizationId: balance.organizationId
      });
      
      return true;
    } catch (error) {
      logger.error('Error updating subscription tier', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tier,
        organizationId
      });
      
      return false;
    }
  }
  
  /**
   * Update organization seat count and recalculate token limits
   * @param organizationId Organization ID
   * @param seatCount New seat count
   * @returns Whether the operation was successful
   */
  async updateOrganizationSeats(organizationId: string, seatCount: number): Promise<boolean> {
    try {
      // Get organization details
      const orgDoc = await (this.tokenRepository as any).getOrganizationDocument(organizationId);
      if (!orgDoc) {
        logger.error('Organization not found', { organizationId });
        return false;
      }

      const tier = orgDoc.subscriptionTier || SubscriptionTier.CREATOR;
      
      // Enforce minimum and maximum seat constraints per tier
      const minSeats = MIN_SEATS[tier as SubscriptionTier] || 1;
      const maxSeats = MAX_SEATS[tier as SubscriptionTier] || minSeats;
      
      if (seatCount < minSeats) {
        logger.warn(`${tier} tier requires minimum ${minSeats} seats`, { 
          organizationId, 
          requestedSeats: seatCount,
          minSeats
        });
        seatCount = minSeats;
      }
      
      if (seatCount > maxSeats && maxSeats !== Infinity) {
        logger.warn(`${tier} tier limited to maximum ${maxSeats} seats`, { 
          organizationId, 
          requestedSeats: seatCount,
          maxSeats
        });
        seatCount = maxSeats;
      }
      
      // Update organization document
      await (this.tokenRepository as any).updateOrganizationSeats(organizationId, seatCount);
      
      // Calculate new token limit
      const baseTokens = MONTHLY_TOKEN_LIMITS[tier as SubscriptionTier];
      const additionalTokens = (seatCount > minSeats) 
        ? (seatCount - minSeats) * ADDITIONAL_TOKENS_PER_SEAT[tier as SubscriptionTier] 
        : 0;
      const newTokenLimit = baseTokens + additionalTokens;
      
      // Get all users in the organization
      const orgUsers = await (this.tokenRepository as any).getOrganizationUsers(organizationId);
      
      // Update token balances for all users
      for (const userId of orgUsers) {
        const balance = await this.getTokenBalance(userId, organizationId);
        
        // Update the balance
        const updatedBalance: TokenBalance = {
          ...balance,
          limit: newTokenLimit,
          baseTokens: newTokenLimit, // Update base tokens 
          // Update available tokens (add the difference to existing available)
          available: balance.available + (newTokenLimit - balance.baseTokens),
          // Update total tokens
          total: newTokenLimit + balance.purchasedTokens,
          lastUpdated: new Date()
        };
        
        // Save the updated balance
        await this.tokenRepository.saveTokenBalance(updatedBalance as any);
        
        // Record the seat change
        await this.tokenRepository.recordTokenUsage({
          userId,
          amount: newTokenLimit - balance.baseTokens,
          taskType: 'seat_change',
          timestamp: new Date(),
          metadata: {
            previousSeats: orgDoc.seats || minSeats,
            newSeats: seatCount,
            tier,
            previousLimit: balance.baseTokens,
            newLimit: newTokenLimit,
            organizationId
          }
        } as any);
        
        logger.info('Updated user token balance for seat change', {
          userId,
          organizationId,
          tier,
          previousBaseTokens: balance.baseTokens,
          newBaseTokens: newTokenLimit
        });
      }
      
      logger.info('Organization seats updated successfully', {
        organizationId,
        tier,
        previousSeats: orgDoc.seats || minSeats,
        newSeats: seatCount,
        newTokenLimit
      });
      
      return true;
    } catch (error) {
      logger.error('Error updating organization seats', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
        seatCount
      });
      
      return false;
    }
  }
  
  /**
   * Check and send usage alerts if thresholds are passed
   */
  private async checkAndSendUsageAlerts(userId: string, balance: TokenBalance): Promise<void> {
    try {
      // Calculate the percentage of tokens used
      const percentUsed = Math.floor((balance.used / balance.total) * 100);
      
      // Get the alerts already sent
      const alertsDoc = await (this.tokenRepository as any).getTokenUsageAlerts(userId, balance.organizationId);
      const alreadyAlerted = alertsDoc?.alreadyAlerted || [];
      
      // Check each threshold
      for (const threshold of this.alertThresholds) {
        if (percentUsed >= threshold && !alreadyAlerted.includes(threshold)) {
          // Send notification
          await (this.notificationService as any).sendNotification(userId, {
            type: 'token_usage_alert',
            title: `Token Usage Alert: ${threshold}%`,
            message: `You've used ${percentUsed}% of your monthly token allocation (${balance.used}/${balance.total}).`,
            data: {
              percentUsed,
              tokensUsed: balance.used,
              tokensTotal: balance.total,
              tokensRemaining: balance.available,
              threshold
            }
          });
          
          // Add to already alerted thresholds
          alreadyAlerted.push(threshold);
          
          logger.info('Token usage alert sent', {
            userId,
            organizationId: balance.organizationId,
            percentUsed,
            threshold
          });
        }
      }
      
      // Update the alerts document
      await (this.tokenRepository as any).saveTokenUsageAlerts({
        userId,
        organizationId: balance.organizationId,
        alertThresholds: this.alertThresholds,
        alreadyAlerted,
        lastUpdated: new Date()
      });
    } catch (error) {
      logger.error('Error handling usage alerts', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        organizationId: balance.organizationId
      });
    }
  }
  
  /**
   * Reset usage alerts for a new month
   */
  private async resetUsageAlerts(userId: string, organizationId?: string): Promise<void> {
    try {
      await (this.tokenRepository as any).saveTokenUsageAlerts({
        userId,
        organizationId,
        alertThresholds: this.alertThresholds,
        alreadyAlerted: [],
        lastUpdated: new Date()
      });
    } catch (error) {
      logger.error('Error resetting usage alerts', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        organizationId
      });
    }
  }
  
  /**
   * Get date for next month reset
   */
  private getNextResetDate(): Date {
    const today = new Date();
    return new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      1
    );
  }
}

export default TokenService;
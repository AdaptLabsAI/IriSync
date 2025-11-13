import { NextApiRequest, NextApiResponse } from 'next';
import { TokenService } from './token-service';
import { firebaseAdmin } from '../core/firebase/admin';
import { TokenRepository } from './token-repository';
import { TokenBalance, SubscriptionTier } from '../ai/models/tokens';
import { NotificationService } from '../core/notifications/NotificationService';
import { logger } from '../logging/logger';

/**
 * Enum for AI task types
 */
export enum AITaskType {
  GENERATE_POST = 'generate_post',
  GENERATE_CAPTION = 'generate_caption',
  GENERATE_HASHTAGS = 'generate_hashtags',
  IMPROVE_CONTENT = 'improve_content',
  ANALYZE_SENTIMENT = 'analyze_sentiment',
  CATEGORIZE_CONTENT = 'categorize_content',
  PREDICT_ENGAGEMENT = 'predict_engagement',
  GENERATE_ALT_TEXT = 'generate_alt_text',
  ANALYZE_IMAGE = 'analyze_image',
  MODERATE_CONTENT = 'moderate_content',
  SUGGEST_POSTING_TIME = 'suggest_posting_time',
  OPTIMIZE_CONTENT_MIX = 'optimize_content_mix',
  SUGGEST_REPLY = 'suggest_reply',
  SUMMARIZE_CONVERSATION = 'summarize_conversation',
  CATEGORIZE_MESSAGE = 'categorize_message'
}

/**
 * Interface for task cost mapping
 */
export interface TaskCostMap {
  [key: string]: number;
}

/**
 * Interface for token usage metrics
 */
export interface TokenUsageMetrics {
  userId: string;
  organizationId?: string;
  totalTokensUsed: number;
  taskBreakdown: Record<AITaskType, number>;
  lastUsed: Date;
  averageDailyUsage: number;
  projectedDepletion?: Date;
}

/**
 * Interface for token limit warning
 */
export interface TokenLimitWarning {
  userId: string;
  threshold: number;
  currentUsage: number;
  totalAvailable: number;
  percentageUsed: number;
  warningLevel: 'low' | 'medium' | 'high';
  timestamp: Date;
}

/**
 * Class for managing token limits and feature access
 */
export class TokenLimiter {
  private tokenService: TokenService;
  private subscriptionService: any; // Using any to avoid circular dependencies
  private readonly db = firebaseAdmin.firestore();
  
  // Define token costs for different task types - all set to 1 as per requirements
  private taskCosts: TaskCostMap = {
    [AITaskType.GENERATE_POST]: 1,
    [AITaskType.GENERATE_CAPTION]: 1,
    [AITaskType.GENERATE_HASHTAGS]: 1,
    [AITaskType.IMPROVE_CONTENT]: 1,
    [AITaskType.ANALYZE_SENTIMENT]: 1,
    [AITaskType.CATEGORIZE_CONTENT]: 1,
    [AITaskType.PREDICT_ENGAGEMENT]: 1,
    [AITaskType.GENERATE_ALT_TEXT]: 1,
    [AITaskType.ANALYZE_IMAGE]: 1,
    [AITaskType.MODERATE_CONTENT]: 1,
    [AITaskType.SUGGEST_POSTING_TIME]: 1,
    [AITaskType.OPTIMIZE_CONTENT_MIX]: 1,
    [AITaskType.SUGGEST_REPLY]: 1,
    [AITaskType.SUMMARIZE_CONVERSATION]: 1,
    [AITaskType.CATEGORIZE_MESSAGE]: 1
  };
  
  // Warning thresholds for token usage (percentage)
  private readonly warningThresholds = [50, 75, 90, 95];
  
  // Cache for token usage validation to reduce database calls
  private tokenValidationCache: Map<string, { 
    result: boolean, 
    timestamp: number,
    expiresAt: number 
  }> = new Map();
  
  // Cache TTL in milliseconds (5 minutes)
  private readonly CACHE_TTL = 5 * 60 * 1000;

  /**
   * Create a token limiter instance
   * @param tokenService Service for managing tokens
   * @param subscriptionService Service for subscription information
   */
  constructor(
    tokenService: TokenService,
    subscriptionService: any
  ) {
    this.tokenService = tokenService;
    this.subscriptionService = subscriptionService;
    
    // Log initialization
    logger.info('TokenLimiter initialized', {
      taskTypes: Object.keys(this.taskCosts).length,
      thresholds: this.warningThresholds
    });
    
    // Set up scheduled cache cleanup
    setInterval(() => this.cleanupCache(), 15 * 60 * 1000); // Run every 15 minutes
  }
  
  /**
   * Validate if a user can perform an AI operation based on token limits
   * @param userId User ID
   * @param tokensRequired Number of tokens required for operation
   * @returns Object with validation result and error message if applicable
   */
  async validateTokenUsage(
    userId: string,
    tokensRequired = 1
  ): Promise<{ allowed: boolean; message?: string; code?: string; upgradeUrl?: string }> {
    const startTime = Date.now();
    try {
      if (!userId) {
        logger.warn('validateTokenUsage called with empty userId');
        return {
          allowed: false,
          message: 'User ID is required',
          code: 'invalid_user'
        };
      }
      
      // Check cache first for recent validations
      const cacheKey = `${userId}:${tokensRequired}`;
      const cachedValidation = this.tokenValidationCache.get(cacheKey);
      
      if (cachedValidation && Date.now() < cachedValidation.expiresAt) {
        logger.debug('Using cached token validation result', {
          userId,
          result: cachedValidation.result,
          cacheAge: Date.now() - cachedValidation.timestamp
        });
        
        // If allowed, return quickly
        if (cachedValidation.result) {
          return { allowed: true };
        }
      }
      
      // Check if user has sufficient tokens
      const hasSufficientTokens = await this.tokenService.hasSufficientTokens(
        userId,
        tokensRequired
      );

      if (!hasSufficientTokens) {
        // Get user's subscription tier
        const userSubscription = await this.subscriptionService.getUserSubscription(userId);
        
        if (!userSubscription) {
          return {
            allowed: false,
            message: 'You need an active subscription to use AI features',
            code: 'no_subscription',
            upgradeUrl: '/pricing'
          };
        }

        const tokenBalance = await this.tokenService.getTokenBalance(userId);
        const { tier } = userSubscription;
        
        let upgradeMessage = '';
        let upgradeUrl = '/dashboard/settings/billing';
        
        switch (tier) {
          case SubscriptionTier.CREATOR:
            upgradeMessage = 'Consider upgrading to the Influencer tier for 500 tokens/month.';
            upgradeUrl = '/dashboard/settings/billing?upgrade=influencer';
            break;
          case SubscriptionTier.INFLUENCER:
            upgradeMessage = 'Consider upgrading to the Enterprise tier for more tokens.';
            upgradeUrl = '/dashboard/settings/billing?upgrade=enterprise';
            break;
          case SubscriptionTier.ENTERPRISE:
            upgradeMessage = 'You can purchase additional tokens or add more seats to your plan.';
            upgradeUrl = '/dashboard/settings/billing?purchase=tokens';
            break;
        }
        
        // Record this limit hit for analytics
        await this.recordTokenLimitHit(userId, tier, tokenBalance, tokensRequired);
        
        const result = {
          allowed: false,
          message: `You've used all your ${tokenBalance?.available || 0} tokens for this billing period. ${upgradeMessage}`,
          code: 'token_limit_reached',
          upgradeUrl
        };
        
        // Cache the negative result
        this.tokenValidationCache.set(cacheKey, {
          result: false,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.CACHE_TTL
        });
        
        return result;
      }

      // Cache the positive result
      this.tokenValidationCache.set(cacheKey, {
        result: true,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_TTL
      });
      
      return { allowed: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error validating token usage', {
        error: errorMessage,
        userId,
        tokensRequired,
        duration: Date.now() - startTime
      });
      
      return {
        allowed: false,
        message: 'An error occurred while validating token usage',
        code: 'validation_error'
      };
    }
  }

  /**
   * Middleware function to enforce token limits
   * @param tokensRequired Number of tokens required for the operation
   * @returns Middleware function
   */
  middleware(tokensRequired = 1) {
    return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
      try {
        // Extract user ID from request
        const userId = req.headers['user-id'] as string;
        
        if (!userId) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to use this feature',
            code: 'authentication_required'
          });
        }
        
        // Validate token usage
        const validation = await this.validateTokenUsage(userId, tokensRequired);
        
        if (!validation.allowed) {
          // Set headers for client analytics
          res.setHeader('X-Token-Limit-Exceeded', 'true');
          res.setHeader('X-Upgrade-Recommended', validation.upgradeUrl || 'false');
          
          return res.status(402).json({
            error: 'Token limit exceeded',
            message: validation.message,
            code: validation.code,
            upgradeUrl: validation.upgradeUrl || '/dashboard/settings/billing'
          });
        }
        
        // Attach token cost to request for later tracking
        (req as any).tokenCost = tokensRequired;
        (req as any).tokenTaskType = req.headers['x-token-task-type'] || 'unknown';
        
        next();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error in token limiter middleware', {
          error: errorMessage,
          path: req.url,
          method: req.method
        });
        
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'An error occurred while processing your request',
          code: 'server_error'
        });
      }
    };
  }
  
  /**
   * Check if a user can perform a specific AI task
   * @param userId User ID
   * @param taskType Type of AI task
   * @param tier User's subscription tier
   * @returns Object with allowed status and reason if not allowed
   */
  async canPerformTask(
    userId: string,
    taskType: AITaskType,
    tier?: SubscriptionTier
  ): Promise<{ allowed: boolean; reason?: string; upgradeUrl?: string }> {
    try {
      // Get current tier if not provided
      if (!tier) {
        const userSubscription = await this.subscriptionService.getUserSubscription(userId);
        if (!userSubscription) {
          return { 
            allowed: false, 
            reason: 'No active subscription',
            upgradeUrl: '/pricing'
          };
        }
        tier = userSubscription.tier;
      }
      
      // Ensure we have a valid tier at this point
      if (!tier) {
        logger.warn('Missing subscription tier for user', { userId });
        return {
          allowed: false,
          reason: 'Unknown subscription tier',
          upgradeUrl: '/pricing'
        };
      }
      
      // Check if the task is allowed for the tier
      const tierAllowed = this.isTaskAllowedForTier(taskType, tier);
      if (!tierAllowed.allowed) {
        // Track this feature gate for analytics
        await this.trackFeatureGate(userId, taskType, tier);
        return {
          ...tierAllowed,
          upgradeUrl: tierAllowed.upgradeUrl || this.getUpgradeUrlForTier(tier)
        };
      }
      
      // Check if user has enough tokens
      const taskCost = this.getTaskCost(taskType);
      const hasSufficientTokens = await this.tokenService.hasSufficientTokens(userId, taskCost);
      
      if (!hasSufficientTokens) {
        return { 
          allowed: false, 
          reason: 'Insufficient tokens. Purchase additional tokens or wait for your monthly reset.',
          upgradeUrl: '/dashboard/settings/billing?purchase=tokens'
        };
      }
      
      return { allowed: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error checking if task can be performed', {
        error: errorMessage,
        userId,
        taskType,
        tier
      });
      
      return { 
        allowed: false, 
        reason: `Error checking permissions: ${errorMessage}`
      };
    }
  }
  
  /**
   * Check if a task is allowed for a specific subscription tier
   * @param taskType Type of AI task
   * @param tier User's subscription tier
   * @returns Object with allowed status and reason if not allowed
   */
  isTaskAllowedForTier(
    taskType: AITaskType,
    tier: SubscriptionTier
  ): { allowed: boolean; reason?: string; upgradeUrl?: string } {
    // All tiers have access to basic content generation
    const basicTasks = [
      AITaskType.GENERATE_POST,
      AITaskType.GENERATE_CAPTION,
      AITaskType.GENERATE_HASHTAGS,
      AITaskType.GENERATE_ALT_TEXT
    ];
    
    if (basicTasks.includes(taskType)) {
      return { allowed: true };
    }
    
    // Check tier-specific restrictions
    switch (tier) {
      case SubscriptionTier.CREATOR:
        // Creator tier has limited AI capabilities
        const creatorRestrictedTasks = [
          AITaskType.SUGGEST_REPLY,
          AITaskType.SUMMARIZE_CONVERSATION,
          AITaskType.OPTIMIZE_CONTENT_MIX,
          AITaskType.PREDICT_ENGAGEMENT,
          AITaskType.ANALYZE_SENTIMENT
        ];
        
        if (creatorRestrictedTasks.includes(taskType)) {
          return { 
            allowed: false, 
            reason: `This feature requires Influencer or Enterprise tier.`,
            upgradeUrl: '/dashboard/settings/billing?upgrade=influencer&feature=' + taskType
          };
        }
        break;
        
      case SubscriptionTier.INFLUENCER:
        // Influencer tier has access to most features except enterprise-only ones
        const influencerRestrictedTasks = [
          AITaskType.SUGGEST_REPLY,
          AITaskType.SUMMARIZE_CONVERSATION
        ];
        
        if (influencerRestrictedTasks.includes(taskType)) {
          return { 
            allowed: false, 
            reason: `This feature requires Enterprise tier.`,
            upgradeUrl: '/dashboard/settings/billing?upgrade=enterprise&feature=' + taskType
          };
        }
        break;
        
      case SubscriptionTier.ENTERPRISE:
        // Enterprise tier has access to all features
        break;
        
      default:
        // Unknown tier, restrict access to be safe
        return { 
          allowed: false, 
          reason: `Unknown subscription tier.`,
          upgradeUrl: '/pricing'
        };
    }
    
    return { allowed: true };
  }
  
  /**
   * Get the token cost for a specific task
   * @param taskType Type of AI task
   * @returns Number of tokens required
   */
  getTaskCost(taskType: AITaskType): number {
    return this.taskCosts[taskType] || 1; // Default to 1 if not specified
  }
  
  /**
   * Update the cost of a specific task
   * @param taskType Type of AI task
   * @param cost New token cost
   */
  updateTaskCost(taskType: AITaskType, cost: number): void {
    if (cost < 0) {
      logger.warn('Attempted to set negative token cost', { taskType, cost });
      return;
    }
    
    // All costs should be 1 as per requirements
    if (cost !== 1) {
      logger.warn('Attempted to set non-standard token cost', { taskType, cost });
      return;
    }
    
    this.taskCosts[taskType] = cost;
    logger.info('Updated task cost', { taskType, cost });
  }
  
  /**
   * Calculate estimated monthly token usage based on task frequencies
   * @param taskFrequencies Map of task types to estimated frequency
   * @returns Estimated total token usage
   */
  estimateMonthlyUsage(taskFrequencies: Record<AITaskType, number>): number {
    let totalUsage = 0;
    
    for (const [taskType, frequency] of Object.entries(taskFrequencies)) {
      if (frequency < 0) {
        logger.warn('Negative frequency provided in usage estimation', { taskType, frequency });
        continue;
      }
      
      const cost = this.getTaskCost(taskType as AITaskType);
      totalUsage += cost * frequency;
    }
    
    return totalUsage;
  }
  
  /**
   * Recommend appropriate subscription tier based on usage patterns
   * @param taskFrequencies Map of task types to estimated frequency
   * @returns Recommended subscription tier
   */
  recommendSubscriptionTier(
    taskFrequencies: Record<AITaskType, number>
  ): { 
    tier: SubscriptionTier; 
    estimatedUsage: number;
    reason: string;
    estimatedCost: number;
    savings: number;
  } {
    const estimatedUsage = this.estimateMonthlyUsage(taskFrequencies);
    
    // Check if any Enterprise-only features are requested
    const needsEnterprise = Object.keys(taskFrequencies).some(task => {
      const taskType = task as AITaskType;
      return ![
        AITaskType.GENERATE_POST,
        AITaskType.GENERATE_CAPTION,
        AITaskType.GENERATE_HASHTAGS,
        AITaskType.IMPROVE_CONTENT,
        AITaskType.GENERATE_ALT_TEXT,
        AITaskType.MODERATE_CONTENT,
        AITaskType.CATEGORIZE_CONTENT,
        AITaskType.PREDICT_ENGAGEMENT,
        AITaskType.ANALYZE_SENTIMENT,
        AITaskType.CATEGORIZE_MESSAGE,
        AITaskType.SUGGEST_POSTING_TIME
      ].includes(taskType);
    });
    
    // Determine a realistic estimate of costs based on tier pricing
    const tokenCostCreator = 80 / 100; // $80 / 100 tokens = $0.80 per token
    const tokenCostInfluencer = 200 / 500; // $200 / 500 tokens = $0.40 per token
    const tokenCostEnterprise = 1250 / 5000; // $1250 / 5000 tokens = $0.25 per token
    
    let estimatedCost = 0;
    let selectedTier: SubscriptionTier;
    let reason = '';
    let savings = 0;
    
    if (needsEnterprise) {
      selectedTier = SubscriptionTier.ENTERPRISE;
      estimatedCost = 1250; // Base enterprise cost
      reason = 'You need Enterprise tier for advanced AI features like smart replies and conversation summarization.';
      
      // Calculate savings compared to purchasing individual tokens at Creator rate
      savings = (estimatedUsage * tokenCostCreator) - estimatedCost;
      
      return {
        tier: selectedTier,
        estimatedUsage,
        reason,
        estimatedCost,
        savings: Math.max(0, savings)
      };
    }
    
    // Check if any Influencer-only features are requested
    const needsInfluencer = Object.keys(taskFrequencies).some(task => {
      const taskType = task as AITaskType;
      return ![
        AITaskType.GENERATE_POST,
        AITaskType.GENERATE_CAPTION,
        AITaskType.GENERATE_HASHTAGS,
        AITaskType.GENERATE_ALT_TEXT
      ].includes(taskType);
    });
    
    if (needsInfluencer) {
      selectedTier = SubscriptionTier.INFLUENCER;
      estimatedCost = 200; // Influencer tier cost
      reason = 'You need Influencer tier for features like sentiment analysis and engagement prediction.';
      
      // Calculate savings compared to purchasing individual tokens at Creator rate
      savings = (estimatedUsage * tokenCostCreator) - estimatedCost;
      
      return {
        tier: selectedTier,
        estimatedUsage,
        reason,
        estimatedCost,
        savings: Math.max(0, savings)
      };
    }
    
    // Base recommendation on token usage
    if (estimatedUsage > 500) {
      selectedTier = SubscriptionTier.ENTERPRISE;
      estimatedCost = 1250;
      reason = 'Your estimated usage exceeds the Influencer tier token limit.';
      savings = (estimatedUsage * tokenCostInfluencer) - estimatedCost;
    } else if (estimatedUsage > 100) {
      selectedTier = SubscriptionTier.INFLUENCER;
      estimatedCost = 200;
      reason = 'Your estimated usage exceeds the Creator tier token limit.';
      savings = (estimatedUsage * tokenCostCreator) - estimatedCost;
    } else {
      selectedTier = SubscriptionTier.CREATOR;
      estimatedCost = 80;
      reason = 'The Creator tier provides enough tokens for your estimated usage.';
      savings = 0; // No savings at the lowest tier
    }
    
    return {
      tier: selectedTier,
      estimatedUsage,
      reason,
      estimatedCost,
      savings: Math.max(0, savings)
    };
  }
  
  /**
   * Get token usage metrics for a user
   * @param userId User ID
   * @param days Number of days to analyze
   * @returns Token usage metrics
   */
  async getTokenUsageMetrics(userId: string, days: number = 30): Promise<TokenUsageMetrics> {
    try {
      // Get token usage history from the token service
      const usageHistory = await this.tokenService.getTokenUsageHistory(userId, 100);
      
      // Filter to the requested time period
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const filteredHistory = usageHistory.filter(record => 
        new Date(record.timestamp) >= startDate
      );
      
      // Calculate total tokens used
      const totalTokensUsed = filteredHistory.reduce((sum, record) => 
        sum + record.amount, 0);
      
      // Calculate breakdown by task type
      const taskBreakdown: Record<AITaskType, number> = {} as Record<AITaskType, number>;
      
      for (const task of Object.values(AITaskType)) {
        taskBreakdown[task] = 0;
      }
      
      // Populate task breakdown
      for (const record of filteredHistory) {
        const taskType = record.taskType as AITaskType;
        if (taskBreakdown[taskType] !== undefined) {
          taskBreakdown[taskType] += record.amount;
        }
      }
      
      // Calculate average daily usage
      const averageDailyUsage = totalTokensUsed / Math.min(days, filteredHistory.length || 1);
      
      // Get current balance
      const currentBalance = await this.tokenService.getTokenBalance(userId);
      
      // Calculate projected depletion date if there are tokens remaining
      let projectedDepletion: Date | undefined = undefined;
      
      if (currentBalance.available > 0 && averageDailyUsage > 0) {
        const daysRemaining = currentBalance.available / averageDailyUsage;
        projectedDepletion = new Date();
        projectedDepletion.setDate(projectedDepletion.getDate() + daysRemaining);
      }
      
      // Get last usage timestamp
      const lastUsed = filteredHistory.length > 0 
        ? new Date(filteredHistory[0].timestamp) 
        : new Date();
      
      return {
        userId,
        organizationId: currentBalance.organizationId,
        totalTokensUsed,
        taskBreakdown,
        lastUsed,
        averageDailyUsage,
        projectedDepletion
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error getting token usage metrics', {
        error: errorMessage,
        userId,
        days
      });
      
      // Return empty metrics on error
      return {
        userId,
        totalTokensUsed: 0,
        taskBreakdown: Object.values(AITaskType).reduce((acc, task) => {
          acc[task] = 0;
          return acc;
        }, {} as Record<AITaskType, number>),
        lastUsed: new Date(),
        averageDailyUsage: 0
      };
    }
  }
  
  /**
   * Clean up expired cache entries
   * @private
   */
  private cleanupCache(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    this.tokenValidationCache.forEach((value, key) => {
      if (now > value.expiresAt) {
        this.tokenValidationCache.delete(key);
        expiredCount++;
      }
    });
    
    logger.debug('Cleaned up token validation cache', {
      expiredEntries: expiredCount,
      remainingEntries: this.tokenValidationCache.size
    });
  }
  
  /**
   * Record a token limit hit for analytics
   * @param userId User ID
   * @param tier Subscription tier
   * @param tokenBalance Token balance
   * @param tokensRequested Tokens requested
   * @private
   */
  private async recordTokenLimitHit(
    userId: string, 
    tier: SubscriptionTier, 
    tokenBalance: any, 
    tokensRequested: number
  ): Promise<void> {
    try {
      await this.db.collection('analytics_token_limits').add({
        userId,
        tier,
        available: tokenBalance?.available || 0,
        used: tokenBalance?.used || 0,
        total: tokenBalance?.total || 0,
        tokensRequested,
        timestamp: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      // Log but don't throw - this is non-critical analytics data
      logger.warn('Failed to record token limit hit', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tier
      });
    }
  }
  
  /**
   * Track when a user hits a feature gate based on their tier
   * @param userId User ID
   * @param taskType Task type
   * @param tier Subscription tier
   * @private
   */
  private async trackFeatureGate(
    userId: string,
    taskType: AITaskType,
    tier: SubscriptionTier
  ): Promise<void> {
    try {
      await this.db.collection('analytics_feature_gates').add({
        userId,
        taskType,
        currentTier: tier,
        timestamp: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        requiredTier: this.getRequiredTierForTask(taskType)
      });
    } catch (error) {
      // Log but don't throw - this is non-critical analytics data
      logger.warn('Failed to track feature gate', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        taskType,
        tier
      });
    }
  }
  
  /**
   * Get the required tier for a specific task
   * @param taskType Task type
   * @private
   */
  private getRequiredTierForTask(taskType: AITaskType): SubscriptionTier {
    // Enterprise-only tasks
    if ([AITaskType.SUGGEST_REPLY, AITaskType.SUMMARIZE_CONVERSATION].includes(taskType)) {
      return SubscriptionTier.ENTERPRISE;
    }
    
    // Influencer tasks
    if ([
      AITaskType.PREDICT_ENGAGEMENT,
      AITaskType.ANALYZE_SENTIMENT,
      AITaskType.OPTIMIZE_CONTENT_MIX
    ].includes(taskType)) {
      return SubscriptionTier.INFLUENCER;
    }
    
    // Everything else is available on Creator tier
    return SubscriptionTier.CREATOR;
  }
  
  /**
   * Get the upgrade URL for a tier
   * @param tier Current subscription tier
   * @private
   */
  private getUpgradeUrlForTier(tier: SubscriptionTier): string {
    switch (tier) {
      case SubscriptionTier.CREATOR:
        return '/dashboard/settings/billing?upgrade=influencer';
      case SubscriptionTier.INFLUENCER:
        return '/dashboard/settings/billing?upgrade=enterprise';
      default:
        return '/dashboard/settings/billing';
    }
  }
}

/**
 * Create a token limiter instance with real services
 * @returns TokenLimiter instance
 */
export function createTokenLimiter(): TokenLimiter {
  const db = firebaseAdmin.firestore();
  const tokenRepository = new TokenRepository(db);
  
  // Import services dynamically to avoid circular dependencies
  const { default: notificationService } = require('../notifications/NotificationService');
  const { default: subscriptionService } = require('../subscription/SubscriptionService');
  
  const tokenService = new TokenService(tokenRepository, notificationService);
  
  return new TokenLimiter(tokenService, subscriptionService);
}

/**
 * Express middleware function for limiting token usage
 * @param tokensRequired Number of tokens required for the operation
 * @returns Middleware function
 */
export function limitTokenUsage(tokensRequired = 1) {
  const limiter = createTokenLimiter();
  return limiter.middleware(tokensRequired);
}

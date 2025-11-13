import { firestore } from '../core/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, orderBy, limit, doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { TokenService } from './token-service';
import { AITaskType } from '../ai/models';
import { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '../core/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { TokenRepository } from './token-repository';
import { NotificationService } from '../notifications/NotificationService';

/**
 * Interface for token usage alert thresholds
 */
export interface TokenUsageAlerts {
  userId: string;
  organizationId?: string;
  alertThresholds: number[]; // Percentages e.g. [75, 90, 100]
  alreadyAlerted: number[]; // Thresholds that have already triggered alerts
  lastUpdated: Date;
}

/**
 * Token tracking service for monitoring AI token usage
 */
export class TokenTracker {
  private usageStore: Map<string, number> = new Map();
  private dailyUsage: Map<string, Map<string, number>> = new Map();
  
  /**
   * Track token usage for a user
   * @param userId User ID
   * @param tokenCount Number of tokens used
   * @param organizationId Optional organization ID
   * @returns Promise that resolves when tracking is complete
   */
  async trackUsage(userId: string, tokenCount: number, organizationId?: string): Promise<void> {
    try {
      // Ignore tracking if the inputs are invalid
      if (!userId || typeof tokenCount !== 'number' || tokenCount <= 0) {
        return;
      }
      
      // Update total user usage
      const currentUsage = this.usageStore.get(userId) || 0;
      this.usageStore.set(userId, currentUsage + tokenCount);
      
      // Track daily usage
      const today = new Date().toISOString().split('T')[0];
      const dailyKey = `${userId}_${today}`;
      
      if (!this.dailyUsage.has(userId)) {
        this.dailyUsage.set(userId, new Map());
      }
      
      const userDailyMap = this.dailyUsage.get(userId)!;
      const currentDailyUsage = userDailyMap.get(today) || 0;
      userDailyMap.set(today, currentDailyUsage + tokenCount);
      
      // If organization ID is provided, track organizational usage
      if (organizationId) {
        const orgCurrentUsage = this.usageStore.get(organizationId) || 0;
        this.usageStore.set(organizationId, orgCurrentUsage + tokenCount);
        
        // Track daily org usage
        const orgDailyKey = `${organizationId}_${today}`;
        
        if (!this.dailyUsage.has(organizationId)) {
          this.dailyUsage.set(organizationId, new Map());
        }
        
        const orgDailyMap = this.dailyUsage.get(organizationId)!;
        const orgCurrentDailyUsage = orgDailyMap.get(today) || 0;
        orgDailyMap.set(today, orgCurrentDailyUsage + tokenCount);
      }
      
      console.log(`Tracked ${tokenCount} tokens for user ${userId}`);
    } catch (error) {
      console.error('Error tracking token usage:', error);
      // Do not throw errors from token tracking to prevent disrupting the user experience
    }
  }
  
  /**
   * Get total usage for a user
   * @param userId User ID
   * @returns Total token usage
   */
  getUserTotalUsage(userId: string): number {
    return this.usageStore.get(userId) || 0;
  }
  
  /**
   * Get user daily usage
   * @param userId User ID
   * @param date Date string (YYYY-MM-DD)
   * @returns Daily token usage
   */
  getUserDailyUsage(userId: string, date: string): number {
    const userDailyMap = this.dailyUsage.get(userId);
    if (!userDailyMap) return 0;
    
    return userDailyMap.get(date) || 0;
  }
  
  /**
   * Get all daily usage for a user
   * @param userId User ID
   * @returns Map of date to usage
   */
  getUserAllDailyUsage(userId: string): Record<string, number> {
    const userDailyMap = this.dailyUsage.get(userId);
    if (!userDailyMap) return {};
    
    const result: Record<string, number> = {};
    userDailyMap.forEach((value, key) => {
      result[key] = value;
    });
    
    return result;
  }
  
  /**
   * Reset token usage tracking (for testing or administrative purposes)
   */
  resetTracking(): void {
    this.usageStore.clear();
    this.dailyUsage.clear();
  }
}

export default TokenTracker;

/**
 * Middleware function to track token usage for AI operations
 * @param req API request
 * @param res API response 
 * @param taskType Type of AI task being performed
 * @param tokensToUse Number of tokens to use (defaults to 1)
 * @param metadata Additional metadata about the operation
 * @returns True if tokens were successfully used, false if insufficient tokens
 */
export async function trackTokenUsage(
  req: NextApiRequest,
  res: NextApiResponse,
  taskType: string,
  tokensToUse = 1,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    // Extract user from request
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    
    const token = authHeader.substring(7);
    const auth = getAuth();
    
    // Verify token and get user
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    if (!userId) {
      return false;
    }
    
    // Create token service and repository
    const db = firebaseAdmin.firestore();
    const tokenRepository = new TokenRepository(db);
    const notificationService = new NotificationService();
    const tokenService = new TokenService(tokenRepository, notificationService);
    
    // Check if user has sufficient tokens
    const hasSufficientTokens = await tokenService.hasSufficientTokens(userId, tokensToUse);
    
    if (!hasSufficientTokens) {
      return false;
    }
    
    // Use tokens
    await tokenService.useTokens(userId, taskType, tokensToUse, {
      ...metadata,
      endpoint: req.url,
      method: req.method,
      timestamp: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error tracking token usage:', error);
    return false;
  }
}

/**
 * Express middleware for tracking token usage
 * @param taskType Type of AI task being performed
 * @param tokensToUse Number of tokens to use (defaults to 1)
 * @returns Express middleware function
 */
export function tokenUsageMiddleware(taskType: string, tokensToUse = 1) {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const success = await trackTokenUsage(req, res, taskType, tokensToUse);
    
    if (!success) {
      return res.status(402).json({
        error: 'Insufficient tokens',
        message: 'You do not have enough tokens to perform this operation',
        code: 'insufficient_tokens',
        purchaseUrl: '/dashboard/settings/billing'
      });
    }
    
    next();
  };
}

/**
 * Track token usage for non-API contexts (server components, etc.)
 * @param userId User ID
 * @param taskType Type of AI task
 * @param tokensToUse Number of tokens to use (defaults to 1)
 * @param metadata Additional metadata
 * @returns True if tokens were successfully used, false if insufficient tokens
 */
export async function trackDirectTokenUsage(
  userId: string,
  taskType: string,
  tokensToUse = 1,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    // Create token service and repository
    const db = firebaseAdmin.firestore();
    const tokenRepository = new TokenRepository(db);
    const notificationService = new NotificationService();
    const tokenService = new TokenService(tokenRepository, notificationService);
    
    // Check if user has sufficient tokens
    const hasSufficientTokens = await tokenService.hasSufficientTokens(userId, tokensToUse);
    
    if (!hasSufficientTokens) {
      return false;
    }
    
    // Use tokens
    await tokenService.useTokens(userId, taskType, tokensToUse, metadata);
    
    return true;
  } catch (error) {
    console.error('Error tracking token usage directly:', error);
    return false;
  }
}

/**
 * Calculate tiered pricing for additional tokens
 * @param numberOfTokens Number of tokens to purchase
 * @returns Price in cents
 */
export function calculateTokenPurchasePrice(numberOfTokens: number): number {
  // Tiered pricing for token purchases based on our new pricing structure
  if (numberOfTokens <= 50) {
    return numberOfTokens * 50; // $0.50 per token for very small purchases
  } else if (numberOfTokens <= 100) {
    return numberOfTokens * 45; // $0.45 per token for small purchases
  } else if (numberOfTokens <= 250) {
    return numberOfTokens * 36; // $0.36 per token for medium-small purchases
  } else if (numberOfTokens <= 500) {
    return numberOfTokens * 32; // $0.32 per token for medium purchases
  } else if (numberOfTokens <= 1000) {
    return numberOfTokens * 28; // $0.28 per token for medium-large purchases
  } else {
    return numberOfTokens * 25; // $0.25 per token for large purchases (2000+)
  }
}

/**
 * Get the remaining tokens for a user
 * @param userId User ID
 * @returns Remaining token count or null if error
 */
export async function getRemainingTokens(userId: string): Promise<number | null> {
  try {
    const db = firebaseAdmin.firestore();
    const tokenRepository = new TokenRepository(db);
    const notificationService = new NotificationService();
    const tokenService = new TokenService(tokenRepository, notificationService);
    
    const balance = await tokenService.getTokenBalance(userId);
    return balance?.available || null;
  } catch (error) {
    console.error('Error getting remaining tokens:', error);
    return null;
  }
}

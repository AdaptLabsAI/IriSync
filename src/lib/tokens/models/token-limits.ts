import { SubscriptionTier } from '../../subscription/models/subscription';
import { AITaskType } from '../../features/ai/models/AITask';

/**
 * Base monthly token limits by subscription tier
 * As specified in the Iris Dev Plan:
 * - Creator tier: 100 AI tokens/month
 * - Influencer tier: 500 AI tokens/month
 * - Enterprise tier: 5,000 base tokens for minimum 5 seats, plus 500 additional tokens per seat beyond the initial 5
 */
export const MONTHLY_TOKEN_LIMITS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.CREATOR]: 100,
  [SubscriptionTier.INFLUENCER]: 500,
  [SubscriptionTier.ENTERPRISE]: 5000 // Base amount for 5 seats
};

/**
 * Token cost per operation type
 * Each AI operation costs 1 token by default as specified in the Iris Dev Plan
 */
export const TOKEN_COST_PER_OPERATION: Record<AITaskType, number> = {
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
  [AITaskType.CATEGORIZE_MESSAGE]: 1,
  [AITaskType.CUSTOMER_SUPPORT]: 0, // Free for support ticket auto-responses
  [AITaskType.CHATBOT]: 1 // Standard token cost for interactive chatbot
};

/**
 * Usage alert thresholds as percentages
 * These are the points at which users will be notified of their token usage
 */
export const USAGE_ALERT_THRESHOLDS = [75, 90, 100];

/**
 * Token purchase price tiers in USD
 * Key is the number of tokens, value is the price in cents
 */
export const TOKEN_PURCHASE_PRICES: Record<number, number> = {
  50: 999,    // $9.99 for 50 tokens
  100: 1899,  // $18.99 for 100 tokens
  250: 3999,  // $39.99 for 250 tokens
  500: 7499,  // $74.99 for 500 tokens
  1000: 12999 // $129.99 for 1000 tokens
};

/**
 * Calculate the total tokens for an Enterprise tier account based on seat count
 * @param seatCount Number of seats in the organization
 * @returns Total token allocation for the organization
 */
export function calculateEnterpriseTokens(seatCount: number): number {
  const baseSeatCount = 5;
  const baseTokens = MONTHLY_TOKEN_LIMITS[SubscriptionTier.ENTERPRISE];
  
  // If less than or equal to base seat count, return base tokens
  if (seatCount <= baseSeatCount) {
    return baseTokens;
  }
  
  // Add 500 tokens per additional seat
  const additionalSeats = seatCount - baseSeatCount;
  const additionalTokens = additionalSeats * 500;
  
  return baseTokens + additionalTokens;
}

/**
 * Calculate token purchase price in cents
 * @param tokenCount Number of tokens to purchase
 * @returns Price in cents
 */
export function calculateTokenPurchasePrice(tokenCount: number): number {
  // Find the closest tier that doesn't exceed the requested count
  const tiers = Object.keys(TOKEN_PURCHASE_PRICES).map(Number).sort((a, b) => a - b);
  
  let tierToUse = tiers[0];
  for (const tier of tiers) {
    if (tier <= tokenCount) {
      tierToUse = tier;
    } else {
      break;
    }
  }
  
  // Calculate price based on the per-token rate of the selected tier
  const pricePerToken = TOKEN_PURCHASE_PRICES[tierToUse] / tierToUse;
  return Math.round(tokenCount * pricePerToken);
}

/**
 * Check if a task type is available for a given subscription tier
 * @param tier Subscription tier
 * @param taskType AI task type
 * @returns Whether the task is available
 */
export function isTaskAvailableForTier(tier: SubscriptionTier, taskType: AITaskType): boolean {
  // Task availability by tier
  const tierTaskAvailability: Record<SubscriptionTier, AITaskType[]> = {
    [SubscriptionTier.CREATOR]: [
      AITaskType.GENERATE_POST,
      AITaskType.GENERATE_CAPTION,
      AITaskType.GENERATE_HASHTAGS,
      AITaskType.GENERATE_ALT_TEXT,
      AITaskType.ANALYZE_SENTIMENT,
      AITaskType.CATEGORIZE_CONTENT,
      AITaskType.ANALYZE_IMAGE
    ],
    [SubscriptionTier.INFLUENCER]: [
      AITaskType.GENERATE_POST,
      AITaskType.GENERATE_CAPTION,
      AITaskType.GENERATE_HASHTAGS,
      AITaskType.IMPROVE_CONTENT,
      AITaskType.ANALYZE_SENTIMENT,
      AITaskType.CATEGORIZE_CONTENT,
      AITaskType.PREDICT_ENGAGEMENT,
      AITaskType.GENERATE_ALT_TEXT,
      AITaskType.ANALYZE_IMAGE,
      AITaskType.MODERATE_CONTENT,
      AITaskType.SUGGEST_POSTING_TIME,
      AITaskType.OPTIMIZE_CONTENT_MIX,
      AITaskType.SUGGEST_REPLY
    ],
    [SubscriptionTier.ENTERPRISE]: Object.values(AITaskType) // All tasks available
  };
  
  return tierTaskAvailability[tier]?.includes(taskType) || false;
}

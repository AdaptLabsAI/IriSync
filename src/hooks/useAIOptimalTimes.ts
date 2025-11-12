import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { 
  aiOptimalPostingTimeService,
  AIOptimalTime,
  AIScheduleRecommendation,
  AIAnalysisContext
} from '../lib/scheduler/ai-optimal-times';
import { SocialPlatform } from '../lib/models/SocialAccount';
import { SubscriptionTier } from '../lib/ai/models/tiered-model-router';
import { logger } from '../lib/logging/logger';

interface UseAIOptimalTimesOptions {
  platform: SocialPlatform;
  contentType: string;
  targetDate?: Date;
  autoFetch?: boolean;
  enableTokenCharging?: boolean;
}

interface UseAIOptimalTimesReturn {
  // Data
  recommendation: AIScheduleRecommendation | null;
  optimalTimes: AIOptimalTime[];
  bestOverallTime: AIOptimalTime | null;
  
  // Loading states
  loading: boolean;
  fetchingDayTimes: boolean;
  fetchingOptimalDayTime: boolean;
  
  // Error states
  error: string | null;
  tokenError: boolean;
  
  // Actions
  fetchOptimalTimes: () => Promise<void>;
  getOptimalTimesForDay: (date: Date) => Promise<AIOptimalTime[]>;
  getOptimalDayAndTime: (nextNDays?: number) => Promise<{
    bestOverall: AIOptimalTime;
    nextWeekRecommendations: AIOptimalTime[];
    insights: string[];
  }>;
  clearError: () => void;
  
  // Scheduling helpers
  isSchedulingTokenCharged: boolean;
  shouldChargeForOptimalTimes: boolean;
  tokenCost: number;
  
  // UI helpers
  formatOptimalTime: (time: AIOptimalTime) => string;
  formatRecommendationSummary: (recommendation: AIScheduleRecommendation) => string;
  getEngagementPredictionText: (time: AIOptimalTime) => string;
  getConfidenceLevel: (score: number) => 'High' | 'Medium' | 'Low';
}

/**
 * React hook for AI-powered optimal posting times integrated with content scheduling
 */
export function useAIOptimalTimes({
  platform,
  contentType,
  targetDate,
  autoFetch = false,
  enableTokenCharging = true
}: UseAIOptimalTimesOptions): UseAIOptimalTimesReturn {
  // State
  const [recommendation, setRecommendation] = useState<AIScheduleRecommendation | null>(null);
  const [optimalTimes, setOptimalTimes] = useState<AIOptimalTime[]>([]);
  const [bestOverallTime, setBestOverallTime] = useState<AIOptimalTime | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingDayTimes, setFetchingDayTimes] = useState(false);
  const [fetchingOptimalDayTime, setFetchingOptimalDayTime] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);

  // Hooks
  const { user } = useAuth();
  const { subscription } = useSubscription();

  // Constants
  const TOKEN_COST = 1;
  const isSchedulingTokenCharged = false; // Content scheduling is typically not token-charged
  const shouldChargeForOptimalTimes = enableTokenCharging && !isSchedulingTokenCharged;

  /**
   * Build analysis context for AI service
   */
  const buildAnalysisContext = useCallback((): AIAnalysisContext => {
    const subscriptionTier = subscription?.tier === 'enterprise' 
      ? SubscriptionTier.ENTERPRISE 
      : subscription?.tier === 'influencer' 
        ? SubscriptionTier.INFLUENCER 
        : SubscriptionTier.CREATOR;

    return {
      userId: user?.id || '',
      organizationId: user?.organizationId,
      platform,
      contentType,
      targetDate,
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      subscriptionTier,
      historicalData: [], // Will be fetched by the service
    };
  }, [user, subscription, platform, contentType, targetDate]);

  /**
   * Fetch optimal posting times
   */
  const fetchOptimalTimes = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setTokenError(false);

      const context = buildAnalysisContext();
      
      logger.debug('Fetching AI optimal times', {
        platform,
        contentType,
        shouldCharge: shouldChargeForOptimalTimes
      });

      const result = await aiOptimalPostingTimeService.getOptimalTimesForScheduling(
        context,
        shouldChargeForOptimalTimes
      );

      setRecommendation(result);
      setOptimalTimes([result.primaryRecommendation, ...result.alternativeSlots]);
      setBestOverallTime(result.primaryRecommendation);

      logger.info('AI optimal times fetched successfully', {
        platform,
        primaryScore: result.primaryRecommendation.score,
        alternativeSlotsCount: result.alternativeSlots.length
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch optimal posting times';
      
      logger.error('Error fetching AI optimal times', {
        error: errorMessage,
        platform,
        contentType
      });

      setError(errorMessage);
      
      // Check if it's a token error
      if (errorMessage.toLowerCase().includes('token')) {
        setTokenError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [user, platform, contentType, shouldChargeForOptimalTimes, buildAnalysisContext]);

  /**
   * Get optimal times for a specific day
   */
  const getOptimalTimesForDay = useCallback(async (date: Date): Promise<AIOptimalTime[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setFetchingDayTimes(true);
      setError(null);

      const context = buildAnalysisContext();
      
      const result = await aiOptimalPostingTimeService.getOptimalTimesForDay(
        date,
        context,
        shouldChargeForOptimalTimes
      );

      logger.debug('Day-specific optimal times fetched', {
        date: date.toISOString(),
        timesCount: result.length
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get optimal times for day';
      setError(errorMessage);
      throw err;
    } finally {
      setFetchingDayTimes(false);
    }
  }, [user, shouldChargeForOptimalTimes, buildAnalysisContext]);

  /**
   * Get optimal day AND time recommendations
   */
  const getOptimalDayAndTime = useCallback(async (nextNDays: number = 14) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setFetchingOptimalDayTime(true);
      setError(null);

      const context = buildAnalysisContext();
      
      const result = await aiOptimalPostingTimeService.getOptimalDayAndTime(
        context,
        nextNDays,
        shouldChargeForOptimalTimes
      );

      logger.debug('Optimal day and time fetched', {
        bestDay: result.bestOverall.dayOfWeek,
        bestHour: result.bestOverall.hour,
        recommendationsCount: result.nextWeekRecommendations.length
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get optimal day and time';
      setError(errorMessage);
      throw err;
    } finally {
      setFetchingOptimalDayTime(false);
    }
  }, [user, shouldChargeForOptimalTimes, buildAnalysisContext]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setTokenError(false);
  }, []);

  /**
   * Format optimal time for display
   */
  const formatOptimalTime = useCallback((time: AIOptimalTime): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[time.dayOfWeek];
    const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
    const ampm = time.hour >= 12 ? 'PM' : 'AM';
    const minute = time.minute.toString().padStart(2, '0');
    
    return `${dayName} at ${hour12}:${minute} ${ampm}`;
  }, []);

  /**
   * Format recommendation summary
   */
  const formatRecommendationSummary = useCallback((rec: AIScheduleRecommendation): string => {
    const primary = rec.primaryRecommendation;
    const confidence = getConfidenceLevel(primary.score);
    
    return `${formatOptimalTime(primary)} (${confidence} confidence - ${Math.round(primary.score * 100)}%)`;
  }, [formatOptimalTime]);

  /**
   * Get engagement prediction text
   */
  const getEngagementPredictionText = useCallback((time: AIOptimalTime): string => {
    const { expectedLikes, expectedComments, expectedShares } = time.engagementPrediction;
    const total = expectedLikes + expectedComments + expectedShares;
    
    return `~${total} total engagements (${expectedLikes} likes, ${expectedComments} comments, ${expectedShares} shares)`;
  }, []);

  /**
   * Get confidence level from score
   */
  const getConfidenceLevel = useCallback((score: number): 'High' | 'Medium' | 'Low' => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && user && platform && contentType) {
      fetchOptimalTimes();
    }
  }, [autoFetch, user, platform, contentType, fetchOptimalTimes]);

  // Clear data when platform or content type changes
  useEffect(() => {
    setRecommendation(null);
    setOptimalTimes([]);
    setBestOverallTime(null);
    setError(null);
    setTokenError(false);
  }, [platform, contentType]);

  return {
    // Data
    recommendation,
    optimalTimes,
    bestOverallTime,
    
    // Loading states
    loading,
    fetchingDayTimes,
    fetchingOptimalDayTime,
    
    // Error states
    error,
    tokenError,
    
    // Actions
    fetchOptimalTimes,
    getOptimalTimesForDay,
    getOptimalDayAndTime,
    clearError,
    
    // Scheduling helpers
    isSchedulingTokenCharged,
    shouldChargeForOptimalTimes,
    tokenCost: TOKEN_COST,
    
    // UI helpers
    formatOptimalTime,
    formatRecommendationSummary,
    getEngagementPredictionText,
    getConfidenceLevel
  };
} 
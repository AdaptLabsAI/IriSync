import { firestore } from '../core/firebase/admin';
import { Firestore, collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { ProviderType, SubscriptionTier, TaskCategory } from '../ai/models';
import { TieredModelRouter } from '../ai/models/tiered-model-router';
import { TokenService } from '../tokens/token-service';
import { TokenRepository } from '../tokens/token-repository';
import { NotificationService } from '../core/notifications/NotificationService';
import { logger } from '../logging/logger';
import { SocialPlatform } from '../models/SocialAccount';
import { PlatformType } from '../platforms/models';

/**
 * Interface for AI-analyzed optimal posting time
 */
export interface AIOptimalTime {
  dayOfWeek: number; // 0-6 (Sunday to Saturday)
  hour: number; // 0-23
  minute: number; // 0-59
  score: number; // 0-1 (confidence score)
  reasoning: string; // AI explanation
  audienceFactors: {
    timezone: string;
    activeHours: number[];
    peakEngagementTime: string;
    audienceSize: number;
    demographicInsights: string;
  };
  engagementPrediction: {
    expectedLikes: number;
    expectedComments: number;
    expectedShares: number;
    confidenceLevel: number;
  };
  competitiveAnalysis: {
    competitorPostingFrequency: number;
    optimalGapFromCompetitors: number;
    marketSaturation: number;
  };
}

/**
 * Interface for AI optimal posting schedule recommendation
 */
export interface AIScheduleRecommendation {
  primaryRecommendation: AIOptimalTime;
  alternativeSlots: AIOptimalTime[];
  dayOfWeekAnalysis: {
    bestDay: number;
    worstDay: number;
    weekendPerformance: number;
    workdayPerformance: number;
  };
  contentTypeOptimization: {
    contentType: string;
    bestTimes: AIOptimalTime[];
    platformSpecificTips: string[];
  };
  aiInsights: string[];
  lastUpdated: Date;
  validUntil: Date;
}

/**
 * Interface for user's historical posting performance
 */
export interface PostingPerformanceData {
  postId: string;
  platform: SocialPlatform;
  publishedAt: Date;
  contentType: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
    saves?: number;
  };
  audienceReach: number;
  timeToFirstEngagement: number; // minutes
}

/**
 * Interface for AI analysis context
 */
export interface AIAnalysisContext {
  userId: string;
  organizationId?: string;
  platform: SocialPlatform;
  contentType: string;
  targetDate?: Date;
  userTimezone: string;
  subscriptionTier: SubscriptionTier;
  historicalData: PostingPerformanceData[];
  competitorData?: any[];
  audienceInsights?: {
    demographics: any;
    activeHours: number[];
    timezoneDistribution: Record<string, number>;
    engagementPatterns: any;
  };
}

/**
 * AI-powered optimal posting time analyzer and scheduler integration
 */
export class AIOptimalPostingTimeService {
  private getFirestore() {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Firestore not configured');
    return firestore;
  }

  private tieredModelRouter: TieredModelRouter;
  private tokenService: TokenService;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly TOKEN_COST = 1; // Fixed token cost

  constructor() {
    this.tieredModelRouter = new TieredModelRouter();
    // Initialize TokenService with required dependencies
    const tokenRepository = new TokenRepository(firestore);
    const notificationService = new NotificationService();
    this.tokenService = new TokenService(tokenRepository, notificationService);
    logger.info('AIOptimalPostingTimeService initialized');
  }

  /**
   * Get AI-optimized posting time recommendations for content scheduling
   * Integrates directly with content scheduling workflow
   */
  async getOptimalTimesForScheduling(
    context: AIAnalysisContext,
    chargeTokens: boolean = true
  ): Promise<AIScheduleRecommendation> {
    try {
      logger.debug('Getting AI optimal times for scheduling', {
        userId: context.userId,
        platform: context.platform,
        contentType: context.contentType,
        chargeTokens
      });

      // Check cache first
      const cachedResult = await this.getCachedRecommendation(context);
      if (cachedResult && this.isCacheValid(cachedResult)) {
        logger.debug('Returning cached optimal time recommendation');
        return cachedResult;
      }

      // Check token availability if charging is required
      if (chargeTokens) {
        const tokenBalance = await this.tokenService.getTokenBalance(
          context.userId,
          context.organizationId
        );
        
        const hasTokens = tokenBalance.availableTokens >= this.TOKEN_COST;

        if (!hasTokens) {
          throw new Error('Insufficient tokens for AI optimal posting time analysis');
        }
      }

      // Gather comprehensive data for AI analysis
      const analysisData = await this.gatherAnalysisData(context);

      // Generate AI recommendations using tiered model
      const recommendation = await this.generateAIRecommendation(analysisData, context);

      // Cache the result
      await this.cacheRecommendation(context, recommendation);

      // Charge tokens if required
      if (chargeTokens) {
        await this.tokenService.useTokens(
          context.userId,
          'optimal_posting_time',
          this.TOKEN_COST,
          {
            organizationId: context.organizationId,
            platform: context.platform,
            contentType: context.contentType,
            serviceType: 'content_generation',
            taskType: 'SUGGEST_POSTING_TIME'
          }
        );
      }

      logger.info('AI optimal posting time recommendation generated', {
        userId: context.userId,
        platform: context.platform,
        primaryScore: recommendation.primaryRecommendation.score,
        chargedTokens: chargeTokens
      });

      return recommendation;
    } catch (error) {
      logger.error('Error generating AI optimal posting times', {
        error: error instanceof Error ? error.message : String(error),
        userId: context.userId,
        platform: context.platform
      });

      // Return fallback recommendation based on static data
      return this.getFallbackRecommendation(context);
    }
  }

  /**
   * Get optimal times for a specific day (calendar integration)
   */
  async getOptimalTimesForDay(
    date: Date,
    context: AIAnalysisContext,
    chargeTokens: boolean = true
  ): Promise<AIOptimalTime[]> {
    try {
      const dayContext = {
        ...context,
        targetDate: date
      };

      const recommendation = await this.getOptimalTimesForScheduling(dayContext, chargeTokens);
      
      const dayOfWeek = date.getDay();
      
      // Filter recommendations for the specific day
      const dayOptimalTimes = [
        recommendation.primaryRecommendation,
        ...recommendation.alternativeSlots
      ].filter(slot => slot.dayOfWeek === dayOfWeek);

      // If no specific times for this day, generate day-specific analysis
      if (dayOptimalTimes.length === 0) {
        return this.generateDaySpecificTimes(date, context, recommendation);
      }

      return dayOptimalTimes.slice(0, 5); // Return top 5 times
    } catch (error) {
      logger.error('Error getting optimal times for day', {
        error: error instanceof Error ? error.message : String(error),
        date: date.toISOString(),
        platform: context.platform
      });

      return this.getFallbackTimesForDay(date, context.platform);
    }
  }

  /**
   * Get optimal day AND time recommendations (calendar view)
   */
  async getOptimalDayAndTime(
    context: AIAnalysisContext,
    nextNDays: number = 14,
    chargeTokens: boolean = true
  ): Promise<{
    bestOverall: AIOptimalTime;
    nextWeekRecommendations: AIOptimalTime[];
    insights: string[];
  }> {
    try {
      const recommendation = await this.getOptimalTimesForScheduling(context, chargeTokens);
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + nextNDays);

      const nextWeekRecommendations: AIOptimalTime[] = [];
      
      // Generate recommendations for each day in the period
      for (let i = 0; i < nextNDays; i++) {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + i);
        
        const dayOfWeek = currentDate.getDay();
        
        // Find best time for this day from our recommendations
        const dayRecommendation = [
          recommendation.primaryRecommendation,
          ...recommendation.alternativeSlots
        ].find(slot => slot.dayOfWeek === dayOfWeek);

        if (dayRecommendation) {
          nextWeekRecommendations.push(dayRecommendation);
        }
      }

      // Sort by score to get the best overall recommendation
      const bestOverall = [
        recommendation.primaryRecommendation,
        ...recommendation.alternativeSlots
      ].sort((a, b) => b.score - a.score)[0];

      return {
        bestOverall,
        nextWeekRecommendations: nextWeekRecommendations.slice(0, 7),
        insights: recommendation.aiInsights
      };
    } catch (error) {
      logger.error('Error getting optimal day and time', {
        error: error instanceof Error ? error.message : String(error),
        platform: context.platform
      });

      return this.getFallbackDayAndTime(context);
    }
  }

  /**
   * Gather comprehensive data for AI analysis
   */
  private async gatherAnalysisData(context: AIAnalysisContext): Promise<any> {
    try {
      // Get user's historical posting performance
      const historicalPerformance = await this.getUserHistoricalPerformance(
        context.userId,
        context.platform,
        context.organizationId
      );

      // Get audience insights
      const audienceInsights = await this.getAudienceInsights(
        context.userId,
        context.platform,
        context.organizationId
      );

      // Get competitive data (if available)
      const competitiveData = await this.getCompetitiveData(
        context.platform,
        context.contentType
      );

      // Get platform-specific engagement patterns
      const platformPatterns = await this.getPlatformEngagementPatterns(
        context.platform,
        context.contentType
      );

      return {
        historical: historicalPerformance,
        audience: audienceInsights,
        competitive: competitiveData,
        platformPatterns,
        timezone: context.userTimezone,
        contentType: context.contentType,
        targetDate: context.targetDate
      };
    } catch (error) {
      logger.error('Error gathering analysis data', {
        error: error instanceof Error ? error.message : String(error),
        userId: context.userId
      });
      
      return {
        historical: [],
        audience: null,
        competitive: null,
        platformPatterns: null
      };
    }
  }

  /**
   * Generate AI recommendation using tiered model system
   */
  private async generateAIRecommendation(
    analysisData: any,
    context: AIAnalysisContext
  ): Promise<AIScheduleRecommendation> {
    try {
      const prompt = this.buildAnalysisPrompt(analysisData, context);
      
      // Use tiered model based on subscription
      const modelResponse = await this.tieredModelRouter.routeRequest(
        prompt,
        TaskCategory.STRATEGIC_INSIGHTS,
        context.subscriptionTier,
        {
          maxTokens: 2000,
          temperature: 0.3,
          responseFormat: { type: 'json_object' }
        }
      );

      const aiResponse = JSON.parse(modelResponse.content);
      
      return this.parseAIResponse(aiResponse, context);
    } catch (error) {
      logger.error('Error generating AI recommendation', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.getFallbackRecommendation(context);
    }
  }

  /**
   * Build comprehensive analysis prompt for AI
   */
  private buildAnalysisPrompt(analysisData: any, context: AIAnalysisContext): string {
    const { historical, audience, competitive, platformPatterns } = analysisData;
    
    return `You are an expert social media strategist analyzing optimal posting times. 

Platform: ${context.platform}
Content Type: ${context.contentType}
User Timezone: ${context.userTimezone}
Target Date: ${context.targetDate ? context.targetDate.toISOString() : 'Not specified'}

Historical Performance Data:
${historical.length > 0 ? JSON.stringify(historical.slice(-20)) : 'Limited historical data'}

Audience Insights:
${audience ? JSON.stringify(audience) : 'Limited audience data'}

Platform Engagement Patterns:
${platformPatterns ? JSON.stringify(platformPatterns) : 'Using general platform data'}

Competitive Analysis:
${competitive ? JSON.stringify(competitive) : 'No competitive data available'}

Please analyze this data and provide optimal posting time recommendations in the following JSON format:

{
  "primaryRecommendation": {
    "dayOfWeek": 1,
    "hour": 18,
    "minute": 30,
    "score": 0.95,
    "reasoning": "Based on your historical data, Tuesday evenings show 40% higher engagement...",
    "audienceFactors": {
      "timezone": "EST",
      "activeHours": [17, 18, 19, 20],
      "peakEngagementTime": "6:30 PM",
      "audienceSize": 15000,
      "demographicInsights": "Your audience is primarily 25-35 year olds who are most active after work"
    },
    "engagementPrediction": {
      "expectedLikes": 250,
      "expectedComments": 15,
      "expectedShares": 8,
      "confidenceLevel": 0.85
    },
    "competitiveAnalysis": {
      "competitorPostingFrequency": 3,
      "optimalGapFromCompetitors": 2,
      "marketSaturation": 0.4
    }
  },
  "alternativeSlots": [
    // 2-4 alternative time slots in same format
  ],
  "dayOfWeekAnalysis": {
    "bestDay": 1,
    "worstDay": 6,
    "weekendPerformance": 0.7,
    "workdayPerformance": 0.85
  },
  "contentTypeOptimization": {
    "contentType": "${context.contentType}",
    "bestTimes": [
      // Best times specific to this content type
    ],
    "platformSpecificTips": [
      "For ${context.platform}, ${context.contentType} content performs best when...",
      "Consider adding hashtags relevant to..."
    ]
  },
  "aiInsights": [
    "Your audience is most active during evening commute hours",
    "Tuesday and Wednesday show consistently higher engagement",
    "Visual content performs 30% better than text-only posts"
  ]
}

Focus on actionable insights based on the actual data provided. If data is limited, clearly state assumptions and provide general best practices.`;
  }

  /**
   * Parse AI response into structured recommendation
   */
  private parseAIResponse(aiResponse: any, context: AIAnalysisContext): AIScheduleRecommendation {
    const now = new Date();
    const validUntil = new Date(now.getTime() + this.CACHE_DURATION);

    return {
      primaryRecommendation: aiResponse.primaryRecommendation || this.getDefaultOptimalTime(context),
      alternativeSlots: aiResponse.alternativeSlots || [],
      dayOfWeekAnalysis: aiResponse.dayOfWeekAnalysis || {
        bestDay: 1,
        worstDay: 6,
        weekendPerformance: 0.7,
        workdayPerformance: 0.85
      },
      contentTypeOptimization: aiResponse.contentTypeOptimization || {
        contentType: context.contentType,
        bestTimes: [],
        platformSpecificTips: []
      },
      aiInsights: aiResponse.aiInsights || ['Analysis based on general platform best practices'],
      lastUpdated: now,
      validUntil
    };
  }

  /**
   * Get user's historical posting performance
   */
  private async getUserHistoricalPerformance(
    userId: string,
    platform: SocialPlatform,
    organizationId?: string
  ): Promise<PostingPerformanceData[]> {
    try {
      const postsRef = collection(this.getFirestore(), 'contentPosts');
      const q = query(
        postsRef,
        where('userId', '==', userId),
        where('platform', '==', platform),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          postId: doc.id,
          platform: data.platform,
          publishedAt: data.publishedAt.toDate(),
          contentType: data.contentType || 'post',
          engagement: {
            likes: data.likes || 0,
            comments: data.comments || 0,
            shares: data.shares || 0,
            views: data.views || 0,
            saves: data.saves || 0
          },
          audienceReach: data.reach || 0,
          timeToFirstEngagement: data.timeToFirstEngagement || 60
        };
      });
    } catch (error) {
      logger.error('Error getting historical performance', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        platform
      });
      return [];
    }
  }

  /**
   * Get audience insights for the user
   */
  private async getAudienceInsights(
    userId: string,
    platform: SocialPlatform,
    organizationId?: string
  ): Promise<any> {
    try {
      const insightsRef = doc(this.getFirestore(), 'audienceInsights', `${userId}_${platform}`);
      const snapshot = await getDoc(insightsRef);
      
      if (snapshot.exists()) {
        return snapshot.data();
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting audience insights', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        platform
      });
      return null;
    }
  }

  /**
   * Get competitive data for the platform/content type
   */
  private async getCompetitiveData(
    platform: SocialPlatform,
    contentType: string
  ): Promise<any> {
    try {
      const competitiveRef = collection(this.getFirestore(), 'competitiveData');
      const q = query(
        competitiveRef,
        where('platform', '==', platform),
        where('contentType', '==', contentType),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      logger.error('Error getting competitive data', {
        error: error instanceof Error ? error.message : String(error),
        platform,
        contentType
      });
      return null;
    }
  }

  /**
   * Get platform-specific engagement patterns
   */
  private async getPlatformEngagementPatterns(
    platform: SocialPlatform,
    contentType: string
  ): Promise<any> {
    try {
      const patternsRef = doc(this.getFirestore(), 'platformPatterns', `${platform}_${contentType}`);
      const snapshot = await getDoc(patternsRef);
      
      if (snapshot.exists()) {
        return snapshot.data();
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting platform patterns', {
        error: error instanceof Error ? error.message : String(error),
        platform,
        contentType
      });
      return null;
    }
  }

  /**
   * Cache recommendation for performance
   */
  private async cacheRecommendation(
    context: AIAnalysisContext,
    recommendation: AIScheduleRecommendation
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(context);
      const cacheRef = doc(this.getFirestore(), 'optimalTimeCache', cacheKey);
      
      await (cacheRef as any).set({
        userId: context.userId,
        platform: context.platform,
        contentType: context.contentType,
        recommendation,
        createdAt: new Date(),
        expiresAt: recommendation.validUntil
      });
    } catch (error) {
      logger.error('Error caching recommendation', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get cached recommendation
   */
  private async getCachedRecommendation(
    context: AIAnalysisContext
  ): Promise<AIScheduleRecommendation | null> {
    try {
      const cacheKey = this.getCacheKey(context);
      const cacheRef = doc(this.getFirestore(), 'optimalTimeCache', cacheKey);
      const snapshot = await getDoc(cacheRef);
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        return data.recommendation;
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting cached recommendation', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(recommendation: AIScheduleRecommendation): boolean {
    return new Date() < new Date(recommendation.validUntil);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(context: AIAnalysisContext): string {
    return `${context.userId}_${context.platform}_${context.contentType}`;
  }

  /**
   * Generate day-specific times when no specific recommendations exist
   */
  private generateDaySpecificTimes(
    date: Date,
    context: AIAnalysisContext,
    recommendation: AIScheduleRecommendation
  ): AIOptimalTime[] {
    const dayOfWeek = date.getDay();
    const baseRecommendation = recommendation.primaryRecommendation;
    
    // Generate times based on day of week patterns
    const timeSlots = this.getTimeSlotsByDay(dayOfWeek, context.platform);
    
    return timeSlots.map((hour, index) => ({
      dayOfWeek,
      hour,
      minute: 0,
      score: baseRecommendation.score * (1 - index * 0.1),
      reasoning: `Optimized for ${this.getDayName(dayOfWeek)} based on platform patterns`,
      audienceFactors: baseRecommendation.audienceFactors,
      engagementPrediction: {
        ...baseRecommendation.engagementPrediction,
        expectedLikes: Math.round(baseRecommendation.engagementPrediction.expectedLikes * (1 - index * 0.15))
      },
      competitiveAnalysis: baseRecommendation.competitiveAnalysis
    }));
  }

  /**
   * Get fallback recommendation when AI fails
   */
  private getFallbackRecommendation(context: AIAnalysisContext): AIScheduleRecommendation {
    const defaultTime = this.getDefaultOptimalTime(context);
    const now = new Date();
    
    return {
      primaryRecommendation: defaultTime,
      alternativeSlots: this.getAlternativeFallbackTimes(context),
      dayOfWeekAnalysis: {
        bestDay: 1, // Tuesday
        worstDay: 6, // Saturday
        weekendPerformance: 0.7,
        workdayPerformance: 0.85
      },
      contentTypeOptimization: {
        contentType: context.contentType,
        bestTimes: [defaultTime],
        platformSpecificTips: [`General best practices for ${context.platform}`]
      },
      aiInsights: ['Using general platform best practices due to limited data'],
      lastUpdated: now,
      validUntil: new Date(now.getTime() + this.CACHE_DURATION)
    };
  }

  /**
   * Get default optimal time based on platform
   */
  private getDefaultOptimalTime(context: AIAnalysisContext): AIOptimalTime {
    const platformDefaults: Record<string, { day: number; hour: number; minute: number }> = {
      [SocialPlatform.INSTAGRAM]: { day: 1, hour: 18, minute: 30 },
      [SocialPlatform.FACEBOOK]: { day: 1, hour: 15, minute: 0 },
      [SocialPlatform.TWITTER]: { day: 2, hour: 12, minute: 0 },
      [SocialPlatform.LINKEDIN]: { day: 2, hour: 10, minute: 0 },
      [SocialPlatform.TIKTOK]: { day: 2, hour: 19, minute: 0 },
      [SocialPlatform.YOUTUBE]: { day: 5, hour: 17, minute: 0 },
      [SocialPlatform.REDDIT]: { day: 0, hour: 21, minute: 0 },
      [SocialPlatform.MASTODON]: { day: 1, hour: 20, minute: 0 },
      [SocialPlatform.THREADS]: { day: 1, hour: 18, minute: 0 }
    };

    const defaults = platformDefaults[context.platform] || { day: 1, hour: 18, minute: 0 };

    return {
      dayOfWeek: defaults.day,
      hour: defaults.hour,
      minute: defaults.minute,
      score: 0.75,
      reasoning: `General best practice for ${context.platform}`,
      audienceFactors: {
        timezone: context.userTimezone,
        activeHours: [17, 18, 19, 20],
        peakEngagementTime: `${defaults.hour}:${defaults.minute.toString().padStart(2, '0')}`,
        audienceSize: 1000,
        demographicInsights: 'General audience patterns'
      },
      engagementPrediction: {
        expectedLikes: 50,
        expectedComments: 5,
        expectedShares: 2,
        confidenceLevel: 0.6
      },
      competitiveAnalysis: {
        competitorPostingFrequency: 3,
        optimalGapFromCompetitors: 2,
        marketSaturation: 0.5
      }
    };
  }

  /**
   * Get alternative fallback times
   */
  private getAlternativeFallbackTimes(context: AIAnalysisContext): AIOptimalTime[] {
    const primary = this.getDefaultOptimalTime(context);
    
    return [
      { ...primary, hour: primary.hour + 2, score: primary.score - 0.1 },
      { ...primary, dayOfWeek: (primary.dayOfWeek + 1) % 7, score: primary.score - 0.15 },
      { ...primary, hour: primary.hour - 3, score: primary.score - 0.2 }
    ].filter(time => time.hour >= 0 && time.hour <= 23);
  }

  /**
   * Get fallback times for a specific day
   */
  private getFallbackTimesForDay(date: Date, platform: SocialPlatform): AIOptimalTime[] {
    const dayOfWeek = date.getDay();
    const hours = this.getTimeSlotsByDay(dayOfWeek, platform);
    
    return hours.map((hour, index) => ({
      dayOfWeek,
      hour,
      minute: 0,
      score: 0.8 - (index * 0.1),
      reasoning: `Fallback time for ${this.getDayName(dayOfWeek)}`,
      audienceFactors: {
        timezone: 'UTC',
        activeHours: hours,
        peakEngagementTime: `${hour}:00`,
        audienceSize: 1000,
        demographicInsights: 'General patterns'
      },
      engagementPrediction: {
        expectedLikes: 30,
        expectedComments: 3,
        expectedShares: 1,
        confidenceLevel: 0.5
      },
      competitiveAnalysis: {
        competitorPostingFrequency: 3,
        optimalGapFromCompetitors: 2,
        marketSaturation: 0.5
      }
    }));
  }

  /**
   * Get fallback day and time recommendation
   */
  private getFallbackDayAndTime(context: AIAnalysisContext): {
    bestOverall: AIOptimalTime;
    nextWeekRecommendations: AIOptimalTime[];
    insights: string[];
  } {
    const bestOverall = this.getDefaultOptimalTime(context);
    
    return {
      bestOverall,
      nextWeekRecommendations: this.getAlternativeFallbackTimes(context),
      insights: [
        'Using general platform best practices',
        'Consider building posting history for better recommendations',
        'Analyze your audience insights for personalized timing'
      ]
    };
  }

  /**
   * Get time slots by day of week
   */
  private getTimeSlotsByDay(dayOfWeek: number, platform: SocialPlatform): number[] {
    const weekdaySlots = [9, 12, 15, 18, 20];
    const weekendSlots = [10, 14, 17, 19];
    
    return (dayOfWeek === 0 || dayOfWeek === 6) ? weekendSlots : weekdaySlots;
  }

  /**
   * Get day name from number
   */
  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }
}

// Export singleton instance
export const aiOptimalPostingTimeService = new AIOptimalPostingTimeService(); 
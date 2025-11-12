import { tieredModelRouter, TaskType } from '../ai/models/tiered-model-router';
import { User } from '../models/User';
import { logger } from '../logging/logger';
import { AnalyticsSummary, EngagementMetrics } from '../models/Analytics';
import { SocialPlatform } from '../models/SocialAccount';
import { CompetitiveComparison } from './competitive/comparator';
import { createTokenService } from '../tokens';

// Define BenchmarkingResult interface since it's not exported
interface BenchmarkingResult {
  benchmarks: Array<{
    metricId: string;
    userValue: number;
    industryAverage: number | null;
    competitorAverage: number | null;
    performanceCategory: string;
  }>;
}

/**
 * AI-powered analytics insights
 */
export interface AIAnalyticsInsights {
  summary: {
    overallPerformance: 'excellent' | 'good' | 'average' | 'needs_improvement';
    keyHighlights: string[];
    mainConcerns: string[];
    confidenceScore: number;
  };
  platformInsights: Array<{
    platform: SocialPlatform;
    performance: 'excellent' | 'good' | 'average' | 'poor';
    insights: string[];
    recommendations: string[];
    trendDirection: 'up' | 'down' | 'stable';
  }>;
  contentInsights: {
    bestPerformingTypes: Array<{
      type: string;
      performance: string;
      reason: string;
    }>;
    contentGaps: string[];
    optimizationOpportunities: string[];
  };
  audienceInsights: {
    engagementPatterns: string[];
    growthTrends: string[];
    behaviorChanges: string[];
  };
  competitiveInsights?: {
    positionSummary: string;
    strengthsVsCompetitors: string[];
    improvementAreas: string[];
    marketOpportunities: string[];
  };
  actionableRecommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'content' | 'timing' | 'engagement' | 'growth' | 'competitive';
    recommendation: string;
    expectedImpact: string;
    timeframe: string;
  }>;
  predictiveInsights: {
    nextMonthProjections: {
      followers: { predicted: number; confidence: number };
      engagement: { predicted: number; confidence: number };
      reach: { predicted: number; confidence: number };
    };
    seasonalTrends: string[];
    riskFactors: string[];
  };
}

/**
 * AI Analytics Summary Service
 * Generates intelligent insights and recommendations from analytics data
 * 
 * IMPORTANT: All AI operations are user-initiated and charged per token usage
 * This service does NOT run automatically - it must be called by explicit user action
 */
export class AIAnalyticsSummaryService {
  private tokenService;
  
  constructor() {
    this.tokenService = createTokenService();
  }
  
  /**
   * Generate comprehensive AI-powered analytics summary
   * USER-INITIATED ONLY: This method charges 2 tokens
   * @param analyticsData Raw analytics data
   * @param user User information for AI tier routing and token charging
   * @param competitiveData Optional competitive analysis data
   * @param benchmarkData Optional benchmark data
   * @returns AI-generated insights and recommendations
   */
  async generateAnalyticsSummary(
    analyticsData: AnalyticsSummary,
    user?: User,
    competitiveData?: CompetitiveComparison,
    benchmarkData?: BenchmarkingResult
  ): Promise<AIAnalyticsInsights> {
    try {
      if (!user) {
        throw new Error('User information required for AI analytics');
      }

      // Check and charge tokens using existing system (2 tokens for full analytics)
      const hasTokens = await this.tokenService.hasSufficientTokens(user.id, 2, user.organizationId);
      if (!hasTokens) {
        throw new Error('Insufficient tokens for full analytics summary. Required: 2 tokens.');
      }

      // Charge tokens using existing system
      const tokenUsed = await this.tokenService.useTokens(user.id, 'analytics_summary', 2, {
        organizationId: user.organizationId,
        operation: 'full_analytics_summary'
      });

      if (!tokenUsed) {
        throw new Error('Failed to charge tokens for analytics summary');
      }

      // Prepare context for AI analysis
      const context = this.prepareAnalyticsContext(analyticsData, competitiveData, benchmarkData);

      // Generate comprehensive insights using AI
      const [
        summary,
        platformInsights,
        contentInsights,
        audienceInsights,
        competitiveInsights,
        predictiveInsights
      ] = await Promise.all([
        this.generateOverallSummary(context, user),
        this.generatePlatformInsights(context, user),
        this.generateContentInsights(context, user),
        this.generateAudienceInsights(context, user),
        competitiveData ? this.generateCompetitiveInsights(competitiveData, user) : Promise.resolve(undefined),
        this.generatePredictiveInsights(context, user)
      ]);

      // Generate actionable recommendations based on all insights
      const actionableRecommendations = await this.generateActionableRecommendations(
        context,
        summary,
        platformInsights,
        contentInsights,
        user
      );

      logger.info('AI analytics summary generated successfully', {
        userId: user.id,
        organizationId: user.organizationId,
        tokensCharged: 2
      });

      return {
        summary,
        platformInsights,
        contentInsights,
        audienceInsights,
        competitiveInsights,
        actionableRecommendations,
        predictiveInsights
      };

    } catch (error) {
      logger.error('Error generating AI analytics summary', { error, userId: user?.id });
      
      // Fallback to non-AI summary if AI fails
      logger.info('Falling back to non-AI analytics summary');
      return this.generateNonAIAnalyticsSummary(analyticsData, competitiveData, benchmarkData);
    }
  }

  /**
   * Generate quick AI insights for dashboard
   * USER-INITIATED ONLY: This method charges 1 token
   * @param analyticsData Raw analytics data
   * @param user User information for AI tier routing and token charging
   * @returns Quick insights for dashboard display
   */
  async generateQuickInsights(
    analyticsData: AnalyticsSummary,
    user?: User
  ): Promise<{
    headline: string;
    keyMetric: { name: string; value: string; trend: 'up' | 'down' | 'stable' };
    topRecommendation: string;
    alertLevel: 'success' | 'warning' | 'error' | 'info';
  }> {
    try {
      if (!user) {
        throw new Error('User information required for AI quick insights');
      }

      // Check and charge tokens using existing system (1 token for quick insights)
      const hasTokens = await this.tokenService.hasSufficientTokens(user.id, 1, user.organizationId);
      if (!hasTokens) {
        throw new Error('Insufficient tokens for quick insights. Required: 1 token.');
      }

      // Charge tokens using existing system
      const tokenUsed = await this.tokenService.useTokens(user.id, 'analytics_quick_insights', 1, {
        organizationId: user.organizationId,
        operation: 'quick_insights'
      });

      if (!tokenUsed) {
        throw new Error('Failed to charge tokens for quick insights');
      }

      // Generate quick insights using AI
      const prompt = `
        Analyze this analytics data and provide a quick dashboard summary:
        
        Metrics: ${JSON.stringify(analyticsData.metrics, null, 2)}
        Growth: ${JSON.stringify(analyticsData.growth, null, 2)}
        
        Provide a JSON response with:
        1. headline: Brief performance summary (max 50 chars)
        2. keyMetric: Most important metric with trend
        3. topRecommendation: Single actionable recommendation
        4. alertLevel: success/warning/error/info based on performance
        
        Be concise and actionable.
      `;

      const result = await tieredModelRouter.routeTask({
        type: TaskType.ANALYTICS,
        input: prompt,
        options: {
          temperature: 0.4,
          maxTokens: 300
        }
      }, user);

      const insights = JSON.parse(result.output);

      logger.info('AI quick insights generated successfully', {
        userId: user.id,
        organizationId: user.organizationId,
        tokensCharged: 1
      });

      return insights;

    } catch (error) {
      logger.error('Error generating AI quick insights', { error, userId: user?.id });
      
      // Fallback to non-AI insights if AI fails
      logger.info('Falling back to non-AI quick insights');
      return this.generateNonAIQuickInsights(analyticsData);
    }
  }

  /**
   * Generate trend analysis from historical data
   * USER-INITIATED ONLY: This method charges 1 token
   * @param historicalData Array of historical analytics data
   * @param user User information for AI tier routing and token charging
   * @returns Trend analysis and forecasting
   */
  async generateTrendAnalysis(
    historicalData: AnalyticsSummary[],
    user?: User
  ): Promise<{
    trends: Array<{
      metric: string;
      direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
      strength: 'strong' | 'moderate' | 'weak';
      significance: string;
      prediction: string;
    }>;
    seasonalPatterns: string[];
    anomalies: Array<{
      date: string;
      metric: string;
      description: string;
      impact: 'positive' | 'negative' | 'neutral';
    }>;
    forecast: {
      nextMonth: Record<string, { value: number; confidence: number }>;
      nextQuarter: Record<string, { value: number; confidence: number }>;
    };
  }> {
    try {
      if (!user) {
        throw new Error('User information required for AI trend analysis');
      }

      if (!historicalData || historicalData.length < 2) {
        throw new Error('Insufficient historical data for trend analysis. Minimum 2 data points required.');
      }

      // Check and charge tokens using existing system (1 token for trend analysis)
      const hasTokens = await this.tokenService.hasSufficientTokens(user.id, 1, user.organizationId);
      if (!hasTokens) {
        throw new Error('Insufficient tokens for trend analysis. Required: 1 token.');
      }

      // Charge tokens using existing system
      const tokenUsed = await this.tokenService.useTokens(user.id, 'analytics_trend_analysis', 1, {
        organizationId: user.organizationId,
        operation: 'trend_analysis',
        dataPoints: historicalData.length
      });

      if (!tokenUsed) {
        throw new Error('Failed to charge tokens for trend analysis');
      }

      // Generate trend analysis using AI
      const prompt = `
        Analyze these historical analytics data points for trends and patterns:
        
        ${JSON.stringify(historicalData.map(d => ({
          date: d.periodStart,
          metrics: d.metrics,
          growth: d.growth
        })), null, 2)}
        
        Provide comprehensive trend analysis with:
        1. trends: Key metric trends with direction, strength, and predictions
        2. seasonalPatterns: Recurring patterns identified
        3. anomalies: Unusual data points with explanations
        4. forecast: Predictions for next month and quarter
        
        Format as JSON matching the expected structure.
      `;

      const result = await tieredModelRouter.routeTask({
        type: TaskType.TREND_ANALYSIS,
        input: prompt,
        options: {
          temperature: 0.3,
          maxTokens: 800
        }
      }, user);

      const trendAnalysis = JSON.parse(result.output);

      logger.info('AI trend analysis generated successfully', {
        userId: user.id,
        organizationId: user.organizationId,
        tokensCharged: 1,
        dataPoints: historicalData.length
      });

      return trendAnalysis;

    } catch (error) {
      logger.error('Error generating AI trend analysis', { error, userId: user?.id });
      
      // Fallback to non-AI trend analysis if AI fails
      logger.info('Falling back to non-AI trend analysis');
      return this.generateNonAITrendAnalysis(historicalData);
    }
  }

  // Private helper methods

  private prepareAnalyticsContext(
    analyticsData: AnalyticsSummary,
    competitiveData?: CompetitiveComparison,
    benchmarkData?: BenchmarkingResult
  ): any {
    return {
      metrics: analyticsData.metrics,
      platforms: analyticsData.platforms || [],
      timeframe: {
        start: analyticsData.periodStart,
        end: analyticsData.periodEnd
      },
      growth: analyticsData.growth,
      topContent: analyticsData.bestPerforming || [],
      audienceData: null, // Not available in AnalyticsSummary
      competitive: competitiveData ? {
        leadingMetrics: competitiveData.overallPerformance.userLeadingMetrics,
        laggingMetrics: competitiveData.overallPerformance.competitorLeadingMetrics,
        opportunities: competitiveData.overallPerformance.growthOpportunities
      } : null,
      benchmarks: benchmarkData ? {
        industryComparison: benchmarkData.benchmarks.map((b: any) => ({
          metric: b.metricId,
          performance: b.performanceCategory,
          vsIndustry: b.industryAverage ? (b.userValue / b.industryAverage) : null
        }))
      } : null
    };
  }

  private async generateOverallSummary(context: any, user?: User): Promise<AIAnalyticsInsights['summary']> {
    const prompt = `
      Analyze this social media analytics data and provide an overall performance summary:
      
      ${JSON.stringify(context, null, 2)}
      
      Provide a JSON response with:
      1. overallPerformance: excellent/good/average/needs_improvement
      2. keyHighlights: Array of 3-5 positive highlights
      3. mainConcerns: Array of 2-4 areas needing attention
      4. confidenceScore: 0-100 based on data quality and completeness
      
      Be specific and actionable in your analysis.
    `;

    const result = await tieredModelRouter.routeTask({
      type: TaskType.PERFORMANCE_INSIGHTS,
      input: prompt,
      options: {
        temperature: 0.3,
        maxTokens: 500
      }
    }, user);

    return JSON.parse(result.output);
  }

  private async generatePlatformInsights(context: any, user?: User): Promise<AIAnalyticsInsights['platformInsights']> {
    const prompt = `
      Analyze platform-specific performance from this data:
      
      ${JSON.stringify(context.platforms, null, 2)}
      
      For each platform, provide insights on:
      1. performance level (excellent/good/average/poor)
      2. specific insights about what's working
      3. actionable recommendations
      4. trend direction (up/down/stable)
      
      Format as JSON array matching the platformInsights structure.
    `;

    const result = await tieredModelRouter.routeTask({
      type: TaskType.ANALYTICS,
      input: prompt,
      options: {
        temperature: 0.4,
        maxTokens: 800
      }
    }, user);

    return JSON.parse(result.output);
  }

  private async generateContentInsights(context: any, user?: User): Promise<AIAnalyticsInsights['contentInsights']> {
    const prompt = `
      Analyze content performance patterns from this data:
      
      Top Content: ${JSON.stringify(context.topContent, null, 2)}
      Metrics: ${JSON.stringify(context.metrics, null, 2)}
      
      Identify:
      1. bestPerformingTypes: Content types that perform well and why
      2. contentGaps: Missing content opportunities
      3. optimizationOpportunities: Ways to improve content performance
      
      Format as JSON matching the contentInsights structure.
    `;

    const result = await tieredModelRouter.routeTask({
      type: TaskType.CONTENT_STRATEGY,
      input: prompt,
      options: {
        temperature: 0.5,
        maxTokens: 600
      }
    }, user);

    return JSON.parse(result.output);
  }

  private async generateAudienceInsights(context: any, user?: User): Promise<AIAnalyticsInsights['audienceInsights']> {
    const prompt = `
      Analyze audience behavior and engagement patterns:
      
      Audience Data: ${JSON.stringify(context.audienceData, null, 2)}
      Engagement Metrics: ${JSON.stringify(context.metrics, null, 2)}
      
      Provide insights on:
      1. engagementPatterns: How and when audience engages
      2. growthTrends: Audience growth patterns
      3. behaviorChanges: Notable changes in audience behavior
      
      Format as JSON matching the audienceInsights structure.
    `;

    const result = await tieredModelRouter.routeTask({
      type: TaskType.ANALYTICS,
      input: prompt,
      options: {
        temperature: 0.4,
        maxTokens: 500
      }
    }, user);

    return JSON.parse(result.output);
  }

  private async generateCompetitiveInsights(
    competitiveData: CompetitiveComparison,
    user?: User
  ): Promise<AIAnalyticsInsights['competitiveInsights']> {
    const prompt = `
      Analyze competitive position based on this comparison data:
      
      ${JSON.stringify(competitiveData.overallPerformance, null, 2)}
      
      Provide:
      1. positionSummary: Overall competitive position
      2. strengthsVsCompetitors: Areas where you're leading
      3. improvementAreas: Areas where competitors are ahead
      4. marketOpportunities: Opportunities to gain advantage
      
      Format as JSON matching the competitiveInsights structure.
    `;

    const result = await tieredModelRouter.routeTask({
      type: TaskType.COMPETITIVE_ANALYSIS,
      input: prompt,
      options: {
        temperature: 0.4,
        maxTokens: 600
      }
    }, user);

    return JSON.parse(result.output);
  }

  private async generateActionableRecommendations(
    context: any,
    summary: any,
    platformInsights: any,
    contentInsights: any,
    user?: User
  ): Promise<AIAnalyticsInsights['actionableRecommendations']> {
    const prompt = `
      Based on this comprehensive analytics analysis, generate specific actionable recommendations:
      
      Summary: ${JSON.stringify(summary, null, 2)}
      Platform Insights: ${JSON.stringify(platformInsights, null, 2)}
      Content Insights: ${JSON.stringify(contentInsights, null, 2)}
      
      Generate 5-8 prioritized recommendations with:
      1. priority: high/medium/low
      2. category: content/timing/engagement/growth/competitive
      3. recommendation: Specific action to take
      4. expectedImpact: What improvement to expect
      5. timeframe: When to implement and see results
      
      Format as JSON array matching the actionableRecommendations structure.
    `;

    const result = await tieredModelRouter.routeTask({
      type: TaskType.CONTENT_STRATEGY,
      input: prompt,
      options: {
        temperature: 0.5,
        maxTokens: 1000
      }
    }, user);

    return JSON.parse(result.output);
  }

  private async generatePredictiveInsights(context: any, user?: User): Promise<AIAnalyticsInsights['predictiveInsights']> {
    const prompt = `
      Generate predictive insights based on current trends and data:
      
      ${JSON.stringify(context, null, 2)}
      
      Provide:
      1. nextMonthProjections: Predicted values for key metrics with confidence
      2. seasonalTrends: Expected seasonal patterns
      3. riskFactors: Potential risks to watch for
      
      Format as JSON matching the predictiveInsights structure.
    `;

    const result = await tieredModelRouter.routeTask({
      type: TaskType.CONTENT_PERFORMANCE_PREDICTION,
      input: prompt,
      options: {
        temperature: 0.3,
        maxTokens: 700
      }
    }, user);

    return JSON.parse(result.output);
  }

  /**
   * Generate non-AI quick insights as fallback
   * This method does NOT charge tokens and provides basic analysis
   * @param analyticsData Analytics data
   * @returns Basic insights without AI
   */
  private generateNonAIQuickInsights(analyticsData: AnalyticsSummary): {
    headline: string;
    keyMetric: { name: string; value: string; trend: 'up' | 'down' | 'stable' };
    topRecommendation: string;
    alertLevel: 'success' | 'warning' | 'error' | 'info';
  } {
    const metrics = analyticsData.metrics;
    const engagement = metrics.engagement || 0;
    const followers = metrics.totalFollowers || 0;
    const impressions = metrics.impressions || 0;

    // Basic performance assessment
    let alertLevel: 'success' | 'warning' | 'error' | 'info' = 'info';
    let headline = 'Analytics data processed';
    
    if (engagement > 5) {
      alertLevel = 'success';
      headline = 'Strong engagement performance detected';
    } else if (engagement < 1) {
      alertLevel = 'warning';
      headline = 'Low engagement - optimization needed';
    }

    // Find highest metric
    const metricValues = [
      { name: 'Engagement', value: engagement },
      { name: 'Followers', value: followers },
      { name: 'Impressions', value: impressions }
    ];
    
    const topMetric = metricValues.reduce((max, current) => 
      current.value > max.value ? current : max
    );

    return {
      headline,
      keyMetric: { 
        name: topMetric.name, 
        value: topMetric.value.toLocaleString(), 
        trend: 'stable' 
      },
      topRecommendation: 'Continue monitoring your analytics and consider posting more engaging content',
      alertLevel
    };
  }

  /**
   * Generate non-AI trend analysis as fallback
   * This method does NOT charge tokens and provides basic analysis
   * @param historicalData Historical analytics data
   * @returns Basic trend analysis without AI
   */
  private generateNonAITrendAnalysis(historicalData: AnalyticsSummary[]): any {
    if (historicalData.length < 2) {
      return {
        trends: [],
        seasonalPatterns: ['Insufficient data for pattern analysis'],
        anomalies: [],
        forecast: {
          nextMonth: {},
          nextQuarter: {}
        }
      };
    }

    // Basic trend calculation
    const latest = historicalData[0];
    const previous = historicalData[1];
    
    const engagementTrend = latest.metrics.engagement! > previous.metrics.engagement! ? 'increasing' : 'decreasing';
    const followersTrend = latest.metrics.totalFollowers! > previous.metrics.totalFollowers! ? 'increasing' : 'decreasing';

    return {
      trends: [
        {
          metric: 'engagement',
          direction: engagementTrend,
          strength: 'moderate',
          significance: 'Basic trend analysis based on recent data points',
          prediction: 'Trend may continue based on current trajectory'
        },
        {
          metric: 'followers',
          direction: followersTrend,
          strength: 'moderate',
          significance: 'Basic follower growth analysis',
          prediction: 'Growth pattern may continue'
        }
      ],
      seasonalPatterns: ['Insufficient data for seasonal pattern analysis'],
      anomalies: [],
      forecast: {
        nextMonth: {
          engagement: { value: latest.metrics.engagement || 0, confidence: 50 },
          followers: { value: latest.metrics.totalFollowers || 0, confidence: 50 }
        },
        nextQuarter: {
          engagement: { value: latest.metrics.engagement || 0, confidence: 30 },
          followers: { value: latest.metrics.totalFollowers || 0, confidence: 30 }
        }
      }
    };
  }

  private generateNonAIAnalyticsSummary(
    analyticsData: AnalyticsSummary,
    competitiveData?: CompetitiveComparison,
    benchmarkData?: BenchmarkingResult
  ): AIAnalyticsInsights {
    // Generate basic insights without AI
    const metrics = analyticsData.metrics;
    const growth = analyticsData.growth;
    
    // Basic performance assessment with null checks
    const engagementGood = (metrics?.engagement || 0) > 3;
    const growthPositive = (growth?.followers || 0) > 0;
    
    return {
      summary: {
        overallPerformance: engagementGood && growthPositive ? 'good' : 'average',
        keyHighlights: [
          engagementGood ? 'Good engagement rate' : 'Engagement needs improvement',
          growthPositive ? 'Positive follower growth' : 'Follower growth stagnant'
        ],
        mainConcerns: [
          !engagementGood ? 'Low engagement rate' : 'Monitor engagement trends',
          !growthPositive ? 'No follower growth' : 'Maintain growth momentum'
        ],
        confidenceScore: 60
      },
      platformInsights: [],
      contentInsights: {
        bestPerformingTypes: [],
        contentGaps: ['More analysis needed'],
        optimizationOpportunities: ['Improve content strategy']
      },
      audienceInsights: {
        engagementPatterns: ['Basic patterns detected'],
        growthTrends: ['Growth analysis available'],
        behaviorChanges: ['Behavior tracking needed']
      },
      actionableRecommendations: [
        {
          priority: 'medium',
          category: 'content',
          recommendation: 'Focus on improving engagement',
          expectedImpact: 'Moderate improvement expected',
          timeframe: '2-4 weeks'
        }
      ],
      predictiveInsights: {
        nextMonthProjections: {
          followers: { predicted: (metrics?.totalFollowers || 0) * 1.05, confidence: 50 },
          engagement: { predicted: (metrics?.engagement || 0) * 1.02, confidence: 50 },
          reach: { predicted: (metrics?.reach || 0) * 1.03, confidence: 50 }
        },
        seasonalTrends: ['Seasonal analysis requires more data'],
        riskFactors: ['Limited data for accurate predictions']
      }
    };
  }
}

// Export singleton instance
export const aiAnalyticsSummaryService = new AIAnalyticsSummaryService();
export default aiAnalyticsSummaryService; 
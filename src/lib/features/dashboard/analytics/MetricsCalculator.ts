// MetricsCalculator - Core metrics calculation engine
// Production-ready analytics component following existing codebase patterns

import { logger } from '@/lib/core/logging/logger';
import { firestore } from '@/lib/core/firebase/client';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';

import {
  DashboardMetric,
  MetricType,
  Platform,
  TimeRange,
  DashboardErrorClass,
  DashboardErrorType
} from '../types';

import { MetricsUtils } from '../models/Metrics';
import { CRMService } from '../../crm/CRMService';

/**
 * MetricsCalculator - Calculates dashboard metrics from various data sources
 */
export class MetricsCalculator {
  private crmService: CRMService;

  constructor() {
    this.crmService = CRMService.getInstance();
  }

  /**
   * Calculate metrics for a user across specified time range and platforms
   */
  async calculateMetrics(
    userId: string,
    metricTypes: MetricType[],
    startDate: Date,
    endDate: Date,
    platforms?: Platform[],
    includeComparison: boolean = true
  ): Promise<DashboardMetric[]> {
    try {
      logger.info('Calculating metrics', { 
        userId, 
        metricTypes, 
        startDate, 
        endDate, 
        platforms,
        includeComparison 
      });

      const metrics: DashboardMetric[] = [];

      // Calculate metrics for each type
      for (const metricType of metricTypes) {
        try {
          const metric = await this.calculateMetricByType(
            userId,
            metricType,
            startDate,
            endDate,
            platforms,
            includeComparison
          );

          if (metric) {
            metrics.push(metric);
          }
        } catch (error) {
          logger.error('Error calculating metric', { 
            userId, 
            metricType, 
            error 
          });
          // Continue with other metrics even if one fails
        }
      }

      logger.info('Successfully calculated metrics', { 
        userId, 
        count: metrics.length 
      });

      return metrics;
    } catch (error) {
      logger.error('Error calculating metrics', { userId, metricTypes, error });
      throw new DashboardErrorClass(
        DashboardErrorType.METRICS_CALCULATION_ERROR,
        'Failed to calculate metrics',
        undefined,
        undefined,
        new Date(),
        { userId, metricTypes },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Calculate a specific metric type
   */
  private async calculateMetricByType(
    userId: string,
    metricType: MetricType,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[],
    includeComparison: boolean = true
  ): Promise<DashboardMetric | null> {
    try {
      let value = 0;
      let previousValue: number | undefined;

      // Calculate current period value
      switch (metricType) {
        case MetricType.ENGAGEMENT:
          value = await this.calculateEngagementMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.REACH:
          value = await this.calculateReachMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.IMPRESSIONS:
          value = await this.calculateImpressionsMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.FOLLOWERS:
          value = await this.calculateFollowersMetric(userId, endDate, platforms);
          break;
        case MetricType.LIKES:
          value = await this.calculateLikesMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.COMMENTS:
          value = await this.calculateCommentsMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.SHARES:
          value = await this.calculateSharesMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.CLICKS:
          value = await this.calculateClicksMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.CONVERSIONS:
          value = await this.calculateConversionsMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.REVENUE:
          value = await this.calculateRevenueMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.POSTS_PUBLISHED:
          value = await this.calculatePostsPublishedMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.RESPONSE_TIME:
          value = await this.calculateResponseTimeMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.SENTIMENT_SCORE:
          value = await this.calculateSentimentScoreMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.GROWTH_RATE:
          value = await this.calculateGrowthRateMetric(userId, startDate, endDate, platforms);
          break;
        case MetricType.ENGAGEMENT_RATE:
          value = await this.calculateEngagementRateMetric(userId, startDate, endDate, platforms);
          break;
        default:
          logger.warn('Unknown metric type', { metricType });
          return null;
      }

      // Calculate comparison value if requested
      if (includeComparison) {
        const periodDuration = endDate.getTime() - startDate.getTime();
        const previousStartDate = new Date(startDate.getTime() - periodDuration);
        const previousEndDate = new Date(startDate.getTime());

        previousValue = await this.calculateMetricByType(
          userId,
          metricType,
          previousStartDate,
          previousEndDate,
          platforms,
          false // Don't include comparison for previous period
        ).then(metric => metric?.value);
      }

      // Calculate change and percentage
      let change: number | undefined;
      let changePercentage: number | undefined;

      if (previousValue !== undefined && previousValue !== null) {
        change = value - previousValue;
        changePercentage = previousValue !== 0 
          ? (change / previousValue) * 100 
          : value > 0 ? 100 : 0;
      }

      const timeRange = this.getTimeRangeFromDates(startDate, endDate);

      return {
        id: `${metricType}-${userId}-${startDate.getTime()}-${endDate.getTime()}`,
        type: metricType,
        value,
        previousValue,
        change,
        changePercentage,
        timeRange,
        timestamp: new Date(),
        metadata: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          platforms: platforms || [],
          calculatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error calculating metric by type', { 
        userId, 
        metricType, 
        error 
      });
      return null;
    }
  }

  /**
   * Calculate engagement metric (likes + comments + shares)
   */
  private async calculateEngagementMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      // Get engagement data from posts
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        ...(platforms ? [where('platform', 'in', platforms)] : [])
      );

      const snapshot = await getDocs(q);
      let totalEngagement = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const metrics = data.metrics || {};
        totalEngagement += (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
      });

      return totalEngagement;
    } catch (error) {
      logger.error('Error calculating engagement metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate reach metric
   */
  private async calculateReachMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      // Get reach data from posts
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        ...(platforms ? [where('platform', 'in', platforms)] : [])
      );

      const snapshot = await getDocs(q);
      let totalReach = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const metrics = data.metrics || {};
        totalReach += metrics.reach || 0;
      });

      return totalReach;
    } catch (error) {
      logger.error('Error calculating reach metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate impressions metric
   */
  private async calculateImpressionsMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      // Get impressions data from posts
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        ...(platforms ? [where('platform', 'in', platforms)] : [])
      );

      const snapshot = await getDocs(q);
      let totalImpressions = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const metrics = data.metrics || {};
        totalImpressions += metrics.impressions || 0;
      });

      return totalImpressions;
    } catch (error) {
      logger.error('Error calculating impressions metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate followers metric (current count)
   */
  private async calculateFollowersMetric(
    userId: string,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      // Get latest follower counts from platform stats
      const statsRef = collection(firestore, 'users', userId, 'platformStats');
      const q = query(
        statsRef,
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        ...(platforms ? [where('platform', 'in', platforms)] : []),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      let totalFollowers = 0;

      // Get the most recent follower count for each platform
      const platformFollowers = new Map<string, number>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const platform = data.platform;
        
        if (!platformFollowers.has(platform)) {
          platformFollowers.set(platform, data.followers || 0);
        }
      });

      // Sum up followers from all platforms
      platformFollowers.forEach(count => {
        totalFollowers += count;
      });

      return totalFollowers;
    } catch (error) {
      logger.error('Error calculating followers metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate likes metric
   */
  private async calculateLikesMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        ...(platforms ? [where('platform', 'in', platforms)] : [])
      );

      const snapshot = await getDocs(q);
      let totalLikes = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const metrics = data.metrics || {};
        totalLikes += metrics.likes || 0;
      });

      return totalLikes;
    } catch (error) {
      logger.error('Error calculating likes metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate comments metric
   */
  private async calculateCommentsMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        ...(platforms ? [where('platform', 'in', platforms)] : [])
      );

      const snapshot = await getDocs(q);
      let totalComments = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const metrics = data.metrics || {};
        totalComments += metrics.comments || 0;
      });

      return totalComments;
    } catch (error) {
      logger.error('Error calculating comments metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate shares metric
   */
  private async calculateSharesMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        ...(platforms ? [where('platform', 'in', platforms)] : [])
      );

      const snapshot = await getDocs(q);
      let totalShares = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const metrics = data.metrics || {};
        totalShares += metrics.shares || 0;
      });

      return totalShares;
    } catch (error) {
      logger.error('Error calculating shares metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate clicks metric
   */
  private async calculateClicksMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        ...(platforms ? [where('platform', 'in', platforms)] : [])
      );

      const snapshot = await getDocs(q);
      let totalClicks = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const metrics = data.metrics || {};
        totalClicks += metrics.clicks || 0;
      });

      return totalClicks;
    } catch (error) {
      logger.error('Error calculating clicks metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate conversions metric (from CRM data)
   */
  private async calculateConversionsMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      // Get conversions from CRM deals
      const crmConnections = await this.crmService.getConnections(userId);
      let totalConversions = 0;

      for (const connection of crmConnections) {
        if (platforms && !platforms.includes(connection.platform as unknown as Platform)) {
          continue;
        }

        try {
          // Get deals data - using proper CRM service interface
          const dealsResponse = await this.crmService.getDeals(userId, {
            limit: 100
          });

          if (dealsResponse.success && dealsResponse.data) {
            const deals = dealsResponse.data;
            totalConversions += deals.length;
          }
        } catch (error) {
          logger.error('Error getting CRM conversions', { 
            userId, 
            platform: connection.platform, 
            error 
          });
        }
      }

      return totalConversions;
    } catch (error) {
      logger.error('Error calculating conversions metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate revenue metric (from CRM data)
   */
  private async calculateRevenueMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      // Get revenue from CRM deals
      const crmConnections = await this.crmService.getConnections(userId);
      let totalRevenue = 0;

      for (const connection of crmConnections) {
        if (platforms && !platforms.includes(connection.platform as unknown as Platform)) {
          continue;
        }

        try {
          // Get deals data - using proper CRM service interface
          const dealsResponse = await this.crmService.getDeals(userId, {
            limit: 100
          });

          if (dealsResponse.success && dealsResponse.data) {
            const deals = dealsResponse.data;
            totalRevenue += deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
          }
        } catch (error) {
          logger.error('Error getting CRM revenue', { 
            userId, 
            platform: connection.platform, 
            error 
          });
        }
      }

      return totalRevenue;
    } catch (error) {
      logger.error('Error calculating revenue metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate posts published metric
   */
  private async calculatePostsPublishedMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        where('status', '==', 'published'),
        ...(platforms ? [where('platform', 'in', platforms)] : [])
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.length;
    } catch (error) {
      logger.error('Error calculating posts published metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate response time metric (average response time to comments/messages)
   */
  private async calculateResponseTimeMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      // Get response times from social inbox data
      const inboxRef = collection(firestore, 'users', userId, 'socialInbox');
      const q = query(
        inboxRef,
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        where('type', '==', 'response'),
        ...(platforms ? [where('platform', 'in', platforms)] : [])
      );

      const snapshot = await getDocs(q);
      let totalResponseTime = 0;
      let responseCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.responseTime) {
          totalResponseTime += data.responseTime;
          responseCount++;
        }
      });

      return responseCount > 0 ? totalResponseTime / responseCount : 0;
    } catch (error) {
      logger.error('Error calculating response time metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate sentiment score metric
   */
  private async calculateSentimentScoreMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      // Get sentiment scores from posts and comments
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        ...(platforms ? [where('platform', 'in', platforms)] : [])
      );

      const snapshot = await getDocs(q);
      let totalSentiment = 0;
      let sentimentCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.sentimentScore !== undefined) {
          totalSentiment += data.sentimentScore;
          sentimentCount++;
        }
      });

      return sentimentCount > 0 ? totalSentiment / sentimentCount : 0;
    } catch (error) {
      logger.error('Error calculating sentiment score metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate growth rate metric
   */
  private async calculateGrowthRateMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      // Calculate follower growth rate
      const currentFollowers = await this.calculateFollowersMetric(userId, endDate, platforms);
      const previousFollowers = await this.calculateFollowersMetric(userId, startDate, platforms);

      if (previousFollowers === 0) {
        return currentFollowers > 0 ? 100 : 0;
      }

      return ((currentFollowers - previousFollowers) / previousFollowers) * 100;
    } catch (error) {
      logger.error('Error calculating growth rate metric', { userId, error });
      return 0;
    }
  }

  /**
   * Calculate engagement rate metric
   */
  private async calculateEngagementRateMetric(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[]
  ): Promise<number> {
    try {
      const totalEngagement = await this.calculateEngagementMetric(userId, startDate, endDate, platforms);
      const totalReach = await this.calculateReachMetric(userId, startDate, endDate, platforms);

      if (totalReach === 0) {
        return 0;
      }

      return (totalEngagement / totalReach) * 100;
    } catch (error) {
      logger.error('Error calculating engagement rate metric', { userId, error });
      return 0;
    }
  }

  /**
   * Determine time range from dates
   */
  private getTimeRangeFromDates(startDate: Date, endDate: Date): TimeRange {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) return TimeRange.LAST_24_HOURS;
    if (diffDays <= 7) return TimeRange.LAST_7_DAYS;
    if (diffDays <= 30) return TimeRange.LAST_30_DAYS;
    if (diffDays <= 90) return TimeRange.LAST_90_DAYS;
    if (diffDays <= 180) return TimeRange.LAST_6_MONTHS;
    if (diffDays <= 365) return TimeRange.LAST_YEAR;
    
    return TimeRange.CUSTOM;
  }
} 
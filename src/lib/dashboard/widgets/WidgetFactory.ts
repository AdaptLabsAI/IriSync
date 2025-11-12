// WidgetFactory - Widget creation and data generation factory
// Production-ready widget factory following existing codebase patterns

import { logger } from '@/lib/logging/logger';
import { firestore } from '@/lib/firebase/client';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

import {
  WidgetType,
  TimeRange,
  Platform,
  MetricType,
  DashboardErrorClass,
  DashboardErrorType
} from '../types';

import { MetricsCalculator } from '../analytics/MetricsCalculator';
import { PerformanceAnalyzer } from '../analytics/PerformanceAnalyzer';
import { AudienceAnalyzer } from '../analytics/AudienceAnalyzer';
import { TrendAnalyzer } from '../analytics/TrendAnalyzer';

/**
 * WidgetFactory - Creates and manages dashboard widgets
 */
export class WidgetFactory {
  private metricsCalculator: MetricsCalculator;
  private performanceAnalyzer: PerformanceAnalyzer;
  private audienceAnalyzer: AudienceAnalyzer;
  private trendAnalyzer: TrendAnalyzer;

  constructor() {
    this.metricsCalculator = new MetricsCalculator();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.audienceAnalyzer = new AudienceAnalyzer();
    this.trendAnalyzer = new TrendAnalyzer();
  }

  /**
   * Generate widget data based on widget type
   */
  async generateWidgetData(
    widgetType: WidgetType,
    userId: string,
    settings: Record<string, any> = {},
    timeRange: TimeRange = TimeRange.LAST_7_DAYS,
    filters: Record<string, any> = {}
  ): Promise<any> {
    try {
      logger.info('Generating widget data', { widgetType, userId, timeRange });

      switch (widgetType) {
        case WidgetType.STATS:
          return await this.generateStatsData(userId, settings, timeRange, filters);
        
        case WidgetType.CHART:
          return await this.generateChartData(userId, settings, timeRange, filters);
        
        case WidgetType.ACTIVITY:
          return await this.generateActivityData(userId, settings, timeRange, filters);
        
        case WidgetType.PLATFORM_OVERVIEW:
          return await this.generatePlatformOverviewData(userId, settings, timeRange, filters);
        
        case WidgetType.PERFORMANCE_METRICS:
          return await this.generatePerformanceMetricsData(userId, settings, timeRange, filters);
        
        case WidgetType.AUDIENCE_METRICS:
          return await this.generateAudienceMetricsData(userId, settings, timeRange, filters);
        
        case WidgetType.CONTENT_PERFORMANCE:
          return await this.generateContentPerformanceData(userId, settings, timeRange, filters);
        
        case WidgetType.UPCOMING_POSTS:
          return await this.generateUpcomingPostsData(userId, settings, timeRange, filters);
        
        case WidgetType.NOTIFICATIONS:
          return await this.generateNotificationsData(userId, settings, timeRange, filters);
        
        case WidgetType.TOKEN_USAGE:
          return await this.generateTokenUsageData(userId, settings, timeRange, filters);
        
        default:
          throw new Error(`Unsupported widget type: ${widgetType}`);
      }
    } catch (error) {
      logger.error('Error generating widget data', { widgetType, userId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.WIDGET_ERROR,
        'Failed to generate widget data',
        undefined,
        widgetType,
        new Date(),
        { widgetType, userId, timeRange },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Generate stats widget data
   */
  private async generateStatsData(
    userId: string,
    settings: Record<string, any>,
    timeRange: TimeRange,
    filters: Record<string, any>
  ): Promise<any> {
    try {
      const platform = filters.platform as Platform | undefined;
      
      // Get key metrics
      const [engagement, followers, reach, posts] = await Promise.all([
        this.metricsCalculator.calculateMetrics(userId, [MetricType.ENGAGEMENT], new Date(), new Date(), platform ? [platform] : undefined, true),
        this.metricsCalculator.calculateMetrics(userId, [MetricType.FOLLOWERS], new Date(), new Date(), platform ? [platform] : undefined, true),
        this.metricsCalculator.calculateMetrics(userId, [MetricType.REACH], new Date(), new Date(), platform ? [platform] : undefined, true),
        this.metricsCalculator.calculateMetrics(userId, [MetricType.POSTS_PUBLISHED], new Date(), new Date(), platform ? [platform] : undefined, true)
      ]);

      return {
        metrics: [
          {
            label: 'Total Engagement',
            value: engagement[0]?.value || 0,
            change: engagement[0]?.changePercentage || 0,
            trend: engagement[0]?.change && engagement[0].change > 0 ? 'up' : 'down'
          },
          {
            label: 'Followers',
            value: followers[0]?.value || 0,
            change: followers[0]?.changePercentage || 0,
            trend: followers[0]?.change && followers[0].change > 0 ? 'up' : 'down'
          },
          {
            label: 'Reach',
            value: reach[0]?.value || 0,
            change: reach[0]?.changePercentage || 0,
            trend: reach[0]?.change && reach[0].change > 0 ? 'up' : 'down'
          },
          {
            label: 'Posts Published',
            value: posts[0]?.value || 0,
            change: posts[0]?.changePercentage || 0,
            trend: posts[0]?.change && posts[0].change > 0 ? 'up' : 'down'
          }
        ],
        timeRange,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error generating stats data', { userId, error });
      return { metrics: [], timeRange, lastUpdated: new Date() };
    }
  }

  /**
   * Generate chart widget data
   */
  private async generateChartData(
    userId: string,
    settings: Record<string, any>,
    timeRange: TimeRange,
    filters: Record<string, any>
  ): Promise<any> {
    try {
      const platform = filters.platform as Platform | undefined;
      const chartType = settings.chartType || 'line';
      
      // Get performance trends
      const trends = await this.performanceAnalyzer.getContentPerformanceTrends(
        userId,
        timeRange,
        platform ? [platform] : undefined
      );

      const chartData = trends.map(trend => ({
        date: trend.date.toISOString().split('T')[0],
        engagement: trend.engagement,
        posts: trend.posts,
        reach: trend.reach
      }));

      return {
        type: chartType,
        data: chartData,
        labels: chartData.map(d => d.date),
        datasets: [
          {
            label: 'Engagement',
            data: chartData.map(d => d.engagement),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          },
          {
            label: 'Reach',
            data: chartData.map(d => d.reach),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)'
          }
        ],
        timeRange,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error generating chart data', { userId, error });
      return { type: 'line', data: [], labels: [], datasets: [], timeRange, lastUpdated: new Date() };
    }
  }

  /**
   * Generate activity widget data
   */
  private async generateActivityData(
    userId: string,
    settings: Record<string, any>,
    timeRange: TimeRange,
    filters: Record<string, any>
  ): Promise<any> {
    try {
      const maxItems = settings.maxItems || 10;
      
      // Get recent activities from various sources
      const activities = await this.getRecentActivities(userId, maxItems);

      return {
        activities,
        totalCount: activities.length,
        timeRange,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error generating activity data', { userId, error });
      return { activities: [], totalCount: 0, timeRange, lastUpdated: new Date() };
    }
  }

  /**
   * Generate platform overview widget data
   */
  private async generatePlatformOverviewData(
    userId: string,
    settings: Record<string, any>,
    timeRange: TimeRange,
    filters: Record<string, any>
  ): Promise<any> {
    try {
      // Get platform performance data
      const platformPerformance = await this.performanceAnalyzer.getPerformanceByPlatform(
        userId,
        timeRange
      );

      const platforms = Object.entries(platformPerformance).map(([platform, data]) => ({
        platform,
        posts: data.posts,
        avgEngagement: data.avgEngagement,
        totalReach: data.totalReach,
        engagementRate: data.engagementRate,
        status: 'connected' // This would come from actual platform connection status
      }));

      return {
        platforms,
        totalPlatforms: platforms.length,
        connectedPlatforms: platforms.filter(p => p.status === 'connected').length,
        timeRange,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error generating platform overview data', { userId, error });
      return { platforms: [], totalPlatforms: 0, connectedPlatforms: 0, timeRange, lastUpdated: new Date() };
    }
  }

  /**
   * Generate performance metrics widget data
   */
  private async generatePerformanceMetricsData(
    userId: string,
    settings: Record<string, any>,
    timeRange: TimeRange,
    filters: Record<string, any>
  ): Promise<any> {
    try {
      const platform = filters.platform as Platform | undefined;
      
      // Get content metrics
      const contentMetrics = await this.performanceAnalyzer.calculateContentMetrics(
        userId,
        timeRange,
        platform ? [platform] : undefined
      );

      // Get engagement metrics
      const engagementMetrics = await this.audienceAnalyzer.calculateEngagementMetrics(
        userId,
        timeRange,
        platform
      );

      return {
        contentMetrics,
        engagementMetrics,
        timeRange,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error generating performance metrics data', { userId, error });
      return { contentMetrics: null, engagementMetrics: null, timeRange, lastUpdated: new Date() };
    }
  }

  /**
   * Generate audience metrics widget data
   */
  private async generateAudienceMetricsData(
    userId: string,
    settings: Record<string, any>,
    timeRange: TimeRange,
    filters: Record<string, any>
  ): Promise<any> {
    try {
      const platform = filters.platform as Platform | undefined;
      
      // Get audience metrics
      const audienceMetrics = await this.audienceAnalyzer.calculateAudienceMetrics(
        userId,
        timeRange,
        platform
      );

      // Get follower growth trends
      const growthTrends = await this.audienceAnalyzer.getFollowerGrowthTrends(
        userId,
        timeRange,
        platform
      );

      return {
        audienceMetrics,
        growthTrends,
        timeRange,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error generating audience metrics data', { userId, error });
      return { audienceMetrics: null, growthTrends: [], timeRange, lastUpdated: new Date() };
    }
  }

  /**
   * Generate content performance widget data
   */
  private async generateContentPerformanceData(
    userId: string,
    settings: Record<string, any>,
    timeRange: TimeRange,
    filters: Record<string, any>
  ): Promise<any> {
    try {
      const maxPosts = settings.maxPosts || 5;
      const platform = filters.platform as Platform | undefined;
      
      // Get top performing posts
      const topPosts = await this.performanceAnalyzer.getTopPerformingPosts(
        userId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date(),
        platform ? [platform] : undefined,
        maxPosts
      );

      // Get posting time analysis
      const bestTimes = await this.performanceAnalyzer.analyzeBestPostingTimes(
        userId,
        timeRange,
        platform ? [platform] : undefined
      );

      return {
        topPosts,
        bestTimes,
        timeRange,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error generating content performance data', { userId, error });
      return { topPosts: [], bestTimes: { hourly: {}, daily: {} }, timeRange, lastUpdated: new Date() };
    }
  }

  /**
   * Generate upcoming posts widget data
   */
  private async generateUpcomingPostsData(
    userId: string,
    settings: Record<string, any>,
    timeRange: TimeRange,
    filters: Record<string, any>
  ): Promise<any> {
    try {
      const maxPosts = settings.maxPosts || 5;
      
      // Get scheduled posts
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const q = query(
        postsRef,
        where('status', '==', 'scheduled'),
        where('scheduledAt', '>', Timestamp.now()),
        orderBy('scheduledAt', 'asc'),
        limit(maxPosts)
      );

      const snapshot = await getDocs(q);
      const upcomingPosts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.content?.substring(0, 50) + '...' || 'Untitled Post',
          platform: data.platform,
          scheduledAt: data.scheduledAt.toDate(),
          content: data.content,
          media: data.media || []
        };
      });

      return {
        posts: upcomingPosts,
        totalScheduled: upcomingPosts.length,
        timeRange,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error generating upcoming posts data', { userId, error });
      return { posts: [], totalScheduled: 0, timeRange, lastUpdated: new Date() };
    }
  }

  /**
   * Generate notifications widget data
   */
  private async generateNotificationsData(
    userId: string,
    settings: Record<string, any>,
    timeRange: TimeRange,
    filters: Record<string, any>
  ): Promise<any> {
    try {
      const maxNotifications = settings.maxNotifications || 10;
      
      // Get recent notifications
      const notificationsRef = collection(firestore, 'users', userId, 'notifications');
      const q = query(
        notificationsRef,
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(maxNotifications)
      );

      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          title: data.title,
          message: data.message,
          createdAt: data.createdAt.toDate(),
          read: data.read,
          priority: data.priority || 'normal'
        };
      });

      return {
        notifications,
        unreadCount: notifications.length,
        timeRange,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error generating notifications data', { userId, error });
      return { notifications: [], unreadCount: 0, timeRange, lastUpdated: new Date() };
    }
  }

  /**
   * Generate token usage widget data
   */
  private async generateTokenUsageData(
    userId: string,
    settings: Record<string, any>,
    timeRange: TimeRange,
    filters: Record<string, any>
  ): Promise<any> {
    try {
      // Get token usage from subscription/usage collection
      const usageRef = collection(firestore, 'users', userId, 'tokenUsage');
      const q = query(
        usageRef,
        orderBy('date', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      let tokenData = {
        used: 0,
        limit: 10000,
        resetDate: new Date()
      };

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        tokenData = {
          used: data.used || 0,
          limit: data.limit || 10000,
          resetDate: data.resetDate?.toDate() || new Date()
        };
      }

      const usagePercentage = (tokenData.used / tokenData.limit) * 100;
      const remaining = tokenData.limit - tokenData.used;

      return {
        used: tokenData.used,
        limit: tokenData.limit,
        remaining,
        usagePercentage,
        resetDate: tokenData.resetDate,
        status: usagePercentage > 90 ? 'critical' : usagePercentage > 75 ? 'warning' : 'normal',
        timeRange,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error generating token usage data', { userId, error });
      return { 
        used: 0, 
        limit: 10000, 
        remaining: 10000, 
        usagePercentage: 0, 
        resetDate: new Date(),
        status: 'normal',
        timeRange, 
        lastUpdated: new Date() 
      };
    }
  }

  /**
   * Get recent activities from various sources
   */
  private async getRecentActivities(userId: string, maxItems: number): Promise<any[]> {
    try {
      const activities: any[] = [];

      // Get recent posts
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const postsQuery = query(
        postsRef,
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(5)
      );

      const postsSnapshot = await getDocs(postsQuery);
      postsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'post_published',
          title: 'Post Published',
          description: `Published "${data.title || data.content?.substring(0, 50) + '...'}" on ${data.platform}`,
          timestamp: data.publishedAt?.toDate() || new Date(),
          platform: data.platform,
          icon: 'post'
        });
      });

      // Get recent comments/interactions
      const interactionsRef = collection(firestore, 'users', userId, 'interactions');
      const interactionsQuery = query(
        interactionsRef,
        orderBy('timestamp', 'desc'),
        limit(5)
      );

      const interactionsSnapshot = await getDocs(interactionsQuery);
      interactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'interaction',
          title: 'New Interaction',
          description: `${data.type} on ${data.platform}`,
          timestamp: data.timestamp?.toDate() || new Date(),
          platform: data.platform,
          icon: 'interaction'
        });
      });

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, maxItems);
    } catch (error) {
      logger.error('Error getting recent activities', { userId, error });
      return [];
    }
  }
} 
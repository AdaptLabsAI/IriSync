// PerformanceAnalyzer - Content performance analysis engine
// Production-ready analytics component following existing codebase patterns

import { logger } from '@/lib/core/logging/logger';
import { firestore } from '@/lib/core/firebase/client';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

import {
  ContentMetrics,
  TimeRange,
  Platform,
  DashboardErrorClass,
  DashboardErrorType
} from '../types';

import { MetricsUtils } from '../models/Metrics';

/**
 * PerformanceAnalyzer - Analyzes content performance across platforms
 */
export class PerformanceAnalyzer {
  
  /**
   * Calculate comprehensive content metrics
   */
  async calculateContentMetrics(
    userId: string,
    timeRange: TimeRange,
    platforms?: Platform[]
  ): Promise<ContentMetrics> {
    try {
      logger.info('Calculating content metrics', { userId, timeRange, platforms });

      const { startDate, endDate } = MetricsUtils.getTimeRangeDates(timeRange);

      // Get all posts in the time range
      const postsRef = collection(firestore, 'users', userId, 'posts');
      let q = query(
        postsRef,
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );

      if (platforms && platforms.length > 0) {
        q = query(q, where('platform', 'in', platforms));
      }

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Array<{
        id: string;
        status?: string;
        metrics?: any;
        platform?: Platform;
        title?: string;
        content?: string;
        publishedAt?: any;
        createdAt?: any;
        media?: any[];
        poll?: any;
        isThread?: boolean;
        [key: string]: any;
      }>;

      // Calculate metrics
      const totalPosts = posts.length;
      const publishedPosts = posts.filter(post => post.status === 'published').length;
      const scheduledPosts = posts.filter(post => post.status === 'scheduled').length;
      const draftPosts = posts.filter(post => post.status === 'draft').length;

      // Calculate average engagement
      const publishedPostsWithMetrics = posts.filter(post => 
        post.status === 'published' && post.metrics
      );
      
      let totalEngagement = 0;
      publishedPostsWithMetrics.forEach(post => {
        const metrics = post.metrics || {};
        totalEngagement += (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
      });

      const averageEngagement = publishedPostsWithMetrics.length > 0 
        ? totalEngagement / publishedPostsWithMetrics.length 
        : 0;

      // Get top performing posts
      const topPerformingPosts = await this.getTopPerformingPosts(
        userId,
        startDate,
        endDate,
        platforms,
        5
      );

      // Analyze content types
      const contentTypes = this.analyzeContentTypes(posts);

      const contentMetrics: ContentMetrics = {
        totalPosts,
        publishedPosts,
        scheduledPosts,
        draftPosts,
        averageEngagement,
        topPerformingPosts,
        contentTypes,
        timeRange
      };

      logger.info('Successfully calculated content metrics', { 
        userId, 
        timeRange,
        totalPosts,
        publishedPosts
      });

      return contentMetrics;
    } catch (error) {
      logger.error('Error calculating content metrics', { userId, timeRange, platforms, error });
      throw new DashboardErrorClass(
        DashboardErrorType.METRICS_CALCULATION_ERROR,
        'Failed to calculate content metrics',
        undefined,
        undefined,
        new Date(),
        { userId, timeRange, platforms },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Get top performing posts by engagement
   */
  async getTopPerformingPosts(
    userId: string,
    startDate: Date,
    endDate: Date,
    platforms?: Platform[],
    limit: number = 5
  ): Promise<Array<{
    id: string;
    title: string;
    platform: Platform;
    engagement: number;
    publishedAt: Date;
  }>> {
    try {
      const postsRef = collection(firestore, 'users', userId, 'posts');
      let q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        where('status', '==', 'published'),
        orderBy('engagementScore', 'desc')
      );

      if (platforms && platforms.length > 0) {
        q = query(q, where('platform', 'in', platforms));
      }

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => {
        const data = doc.data();
        const metrics = data.metrics || {};
        const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);

        return {
          id: doc.id,
          title: data.title || data.content?.substring(0, 50) + '...' || 'Untitled Post',
          platform: data.platform as Platform,
          engagement,
          publishedAt: data.publishedAt?.toDate() || new Date()
        };
      });

      // Sort by engagement and take top posts
      return posts
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting top performing posts', { userId, error });
      return [];
    }
  }

  /**
   * Analyze content types distribution
   */
  private analyzeContentTypes(posts: any[]): Record<string, number> {
    const contentTypes: Record<string, number> = {};

    posts.forEach(post => {
      const type = this.determineContentType(post);
      contentTypes[type] = (contentTypes[type] || 0) + 1;
    });

    return contentTypes;
  }

  /**
   * Determine content type from post data
   */
  private determineContentType(post: any): string {
    // Check for media attachments
    if (post.media && post.media.length > 0) {
      const mediaTypes = post.media.map((m: any) => m.type);
      
      if (mediaTypes.includes('video')) {
        return 'Video';
      } else if (mediaTypes.includes('image')) {
        return 'Image';
      } else if (mediaTypes.includes('gif')) {
        return 'GIF';
      }
    }

    // Check for links
    if (post.content && this.containsLink(post.content)) {
      return 'Link';
    }

    // Check for polls
    if (post.poll) {
      return 'Poll';
    }

    // Check for threads/carousels
    if (post.isThread || (post.media && post.media.length > 1)) {
      return 'Carousel/Thread';
    }

    // Default to text
    return 'Text';
  }

  /**
   * Check if content contains links
   */
  private containsLink(content: string): boolean {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return urlRegex.test(content);
  }

  /**
   * Calculate content performance score
   */
  async calculateContentPerformanceScore(
    userId: string,
    postId: string
  ): Promise<number> {
    try {
      const postRef = collection(firestore, 'users', userId, 'posts');
      const q = query(postRef, where('__name__', '==', postId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return 0;
      }

      const post = snapshot.docs[0].data();
      const metrics = post.metrics || {};

      // Calculate weighted performance score
      const likes = metrics.likes || 0;
      const comments = metrics.comments || 0;
      const shares = metrics.shares || 0;
      const clicks = metrics.clicks || 0;
      const reach = metrics.reach || 1; // Avoid division by zero

      // Weighted scoring (comments and shares are more valuable)
      const engagementScore = (likes * 1) + (comments * 3) + (shares * 5) + (clicks * 2);
      const reachScore = engagementScore / reach * 100; // Engagement rate as percentage

      return Math.min(reachScore, 100); // Cap at 100
    } catch (error) {
      logger.error('Error calculating content performance score', { userId, postId, error });
      return 0;
    }
  }

  /**
   * Get content performance trends
   */
  async getContentPerformanceTrends(
    userId: string,
    timeRange: TimeRange,
    platforms?: Platform[]
  ): Promise<Array<{
    date: Date;
    posts: number;
    engagement: number;
    reach: number;
  }>> {
    try {
      const { startDate, endDate } = MetricsUtils.getTimeRangeDates(timeRange);
      
      // Get posts grouped by day
      const postsRef = collection(firestore, 'users', userId, 'posts');
      let q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'asc')
      );

      if (platforms && platforms.length > 0) {
        q = query(q, where('platform', 'in', platforms));
      }

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => doc.data());

      // Group by date
      const dailyData = new Map<string, {
        posts: number;
        engagement: number;
        reach: number;
      }>();

      posts.forEach(post => {
        const date = post.publishedAt?.toDate();
        if (!date) return;

        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const metrics = post.metrics || {};
        const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
        const reach = metrics.reach || 0;

        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, { posts: 0, engagement: 0, reach: 0 });
        }

        const dayData = dailyData.get(dateKey)!;
        dayData.posts += 1;
        dayData.engagement += engagement;
        dayData.reach += reach;
      });

      // Convert to array and sort by date
      return Array.from(dailyData.entries())
        .map(([dateStr, data]) => ({
          date: new Date(dateStr),
          ...data
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      logger.error('Error getting content performance trends', { userId, timeRange, error });
      return [];
    }
  }

  /**
   * Analyze best posting times
   */
  async analyzeBestPostingTimes(
    userId: string,
    timeRange: TimeRange,
    platforms?: Platform[]
  ): Promise<{
    hourly: Record<number, number>; // Hour of day -> average engagement
    daily: Record<number, number>; // Day of week -> average engagement
  }> {
    try {
      const { startDate, endDate } = MetricsUtils.getTimeRangeDates(timeRange);
      
      const postsRef = collection(firestore, 'users', userId, 'posts');
      let q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        where('status', '==', 'published')
      );

      if (platforms && platforms.length > 0) {
        q = query(q, where('platform', 'in', platforms));
      }

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => doc.data());

      const hourlyData: Record<number, { total: number; count: number }> = {};
      const dailyData: Record<number, { total: number; count: number }> = {};

      posts.forEach(post => {
        const date = post.publishedAt?.toDate();
        if (!date) return;

        const hour = date.getHours();
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const metrics = post.metrics || {};
        const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);

        // Hourly data
        if (!hourlyData[hour]) {
          hourlyData[hour] = { total: 0, count: 0 };
        }
        hourlyData[hour].total += engagement;
        hourlyData[hour].count += 1;

        // Daily data
        if (!dailyData[dayOfWeek]) {
          dailyData[dayOfWeek] = { total: 0, count: 0 };
        }
        dailyData[dayOfWeek].total += engagement;
        dailyData[dayOfWeek].count += 1;
      });

      // Calculate averages
      const hourly: Record<number, number> = {};
      Object.entries(hourlyData).forEach(([hour, data]) => {
        hourly[parseInt(hour)] = data.count > 0 ? data.total / data.count : 0;
      });

      const daily: Record<number, number> = {};
      Object.entries(dailyData).forEach(([day, data]) => {
        daily[parseInt(day)] = data.count > 0 ? data.total / data.count : 0;
      });

      return { hourly, daily };
    } catch (error) {
      logger.error('Error analyzing best posting times', { userId, timeRange, error });
      return { hourly: {}, daily: {} };
    }
  }

  /**
   * Get content performance by platform
   */
  async getPerformanceByPlatform(
    userId: string,
    timeRange: TimeRange
  ): Promise<Record<Platform, {
    posts: number;
    avgEngagement: number;
    totalReach: number;
    engagementRate: number;
  }>> {
    try {
      const { startDate, endDate } = MetricsUtils.getTimeRangeDates(timeRange);
      
      const result: Partial<Record<Platform, { posts: number; avgEngagement: number; totalReach: number; engagementRate: number }>> = {};

      // Get posts for the time range
      const postsRef = collection(firestore, 'users', userId, 'posts');
      const q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        where('status', '==', 'published')
      );

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => doc.data());

      // Group by platform and calculate metrics
      for (const post of posts) {
        const platform = post.platform as Platform;
        if (!result[platform]) {
          result[platform] = {
            posts: 0,
            avgEngagement: 0,
            totalReach: 0,
            engagementRate: 0
          };
        }

        const metrics = post.metrics || {};
        const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
        const reach = metrics.reach || 0;

        result[platform]!.posts += 1;
        result[platform]!.totalReach += reach;
        
        // Calculate running average for engagement
        const currentAvg = result[platform]!.avgEngagement;
        const postCount = result[platform]!.posts;
        result[platform]!.avgEngagement = (currentAvg * (postCount - 1) + engagement) / postCount;
      }

      // Calculate engagement rates
      Object.keys(result).forEach(platformKey => {
        const platform = platformKey as Platform;
        const data = result[platform]!;
        data.engagementRate = data.totalReach > 0 ? (data.avgEngagement / data.totalReach) * 100 : 0;
      });

      return result as Record<Platform, { posts: number; avgEngagement: number; totalReach: number; engagementRate: number }>;
    } catch (error) {
      logger.error('Error getting performance by platform', { userId, timeRange, error });
      return {} as Record<Platform, { posts: number; avgEngagement: number; totalReach: number; engagementRate: number }>;
    }
  }
} 
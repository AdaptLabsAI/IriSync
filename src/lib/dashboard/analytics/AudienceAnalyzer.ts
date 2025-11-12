// AudienceAnalyzer - Audience metrics and engagement analysis engine
// Production-ready analytics component following existing codebase patterns

import { logger } from '@/lib/logging/logger';
import { firestore } from '@/lib/firebase/client';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

import {
  EngagementMetrics,
  AudienceMetrics,
  TimeRange,
  Platform,
  DashboardErrorClass,
  DashboardErrorType
} from '../types';

import { MetricsUtils } from '../models/Metrics';

/**
 * AudienceAnalyzer - Analyzes audience metrics and engagement patterns
 */
export class AudienceAnalyzer {
  
  /**
   * Calculate engagement metrics for a user
   */
  async calculateEngagementMetrics(
    userId: string,
    timeRange: TimeRange,
    platform?: Platform
  ): Promise<EngagementMetrics> {
    try {
      logger.info('Calculating engagement metrics', { userId, timeRange, platform });

      const { startDate, endDate } = MetricsUtils.getTimeRangeDates(timeRange);

      // Get posts in the time range
      const postsRef = collection(firestore, 'users', userId, 'posts');
      let q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        where('status', '==', 'published')
      );

      if (platform) {
        q = query(q, where('platform', '==', platform));
      }

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => doc.data());

      // Calculate engagement metrics
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      let totalClicks = 0;
      let totalSaves = 0;
      let totalReach = 0;
      const reactions: Record<string, number> = {};

      posts.forEach(post => {
        const metrics = post.metrics || {};
        totalLikes += metrics.likes || 0;
        totalComments += metrics.comments || 0;
        totalShares += metrics.shares || 0;
        totalClicks += metrics.clicks || 0;
        totalSaves += metrics.saves || 0;
        totalReach += metrics.reach || 0;

        // Aggregate reactions
        if (metrics.reactions) {
          Object.entries(metrics.reactions).forEach(([reaction, count]) => {
            reactions[reaction] = (reactions[reaction] || 0) + (count as number);
          });
        }
      });

      const totalEngagement = totalLikes + totalComments + totalShares + totalClicks;
      const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

      const engagementMetrics: EngagementMetrics = {
        totalEngagement,
        engagementRate,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        clicks: totalClicks,
        saves: totalSaves,
        reactions,
        timeRange,
        platform
      };

      logger.info('Successfully calculated engagement metrics', { 
        userId, 
        timeRange,
        platform,
        totalEngagement,
        engagementRate
      });

      return engagementMetrics;
    } catch (error) {
      logger.error('Error calculating engagement metrics', { userId, timeRange, platform, error });
      throw new DashboardErrorClass(
        DashboardErrorType.METRICS_CALCULATION_ERROR,
        'Failed to calculate engagement metrics',
        platform,
        undefined,
        new Date(),
        { userId, timeRange, platform },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Calculate audience metrics for a user
   */
  async calculateAudienceMetrics(
    userId: string,
    timeRange: TimeRange,
    platform?: Platform
  ): Promise<AudienceMetrics> {
    try {
      logger.info('Calculating audience metrics', { userId, timeRange, platform });

      const { startDate, endDate } = MetricsUtils.getTimeRangeDates(timeRange);

      // Get current follower count
      const currentFollowers = await this.getCurrentFollowerCount(userId, platform);
      
      // Get follower count at start of period for growth calculation
      const startFollowers = await this.getFollowerCountAtDate(userId, startDate, platform);
      
      const followerGrowth = currentFollowers - startFollowers;
      const followerGrowthRate = startFollowers > 0 ? (followerGrowth / startFollowers) * 100 : 0;

      // Calculate reach and impressions
      const { totalReach, totalImpressions } = await this.calculateReachAndImpressions(
        userId, 
        startDate, 
        endDate, 
        platform
      );

      // Get demographics data
      const demographics = await this.getDemographicsData(userId, platform);

      const audienceMetrics: AudienceMetrics = {
        totalFollowers: currentFollowers,
        followerGrowth,
        followerGrowthRate,
        reach: totalReach,
        impressions: totalImpressions,
        demographics,
        timeRange,
        platform
      };

      logger.info('Successfully calculated audience metrics', { 
        userId, 
        timeRange,
        platform,
        totalFollowers: currentFollowers,
        followerGrowth,
        followerGrowthRate
      });

      return audienceMetrics;
    } catch (error) {
      logger.error('Error calculating audience metrics', { userId, timeRange, platform, error });
      throw new DashboardErrorClass(
        DashboardErrorType.METRICS_CALCULATION_ERROR,
        'Failed to calculate audience metrics',
        platform,
        undefined,
        new Date(),
        { userId, timeRange, platform },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Get current follower count
   */
  private async getCurrentFollowerCount(userId: string, platform?: Platform): Promise<number> {
    try {
      const statsRef = collection(firestore, 'users', userId, 'platformStats');
      let q = query(
        statsRef,
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      if (platform) {
        q = query(q, where('platform', '==', platform));
      }

      const snapshot = await getDocs(q);
      let totalFollowers = 0;

      if (platform) {
        // Get latest count for specific platform
        const latestStat = snapshot.docs[0];
        if (latestStat) {
          totalFollowers = latestStat.data().followers || 0;
        }
      } else {
        // Sum followers across all platforms (get latest for each)
        const platformFollowers = new Map<string, number>();
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const platformKey = data.platform;
          
          if (!platformFollowers.has(platformKey)) {
            platformFollowers.set(platformKey, data.followers || 0);
          }
        });

        platformFollowers.forEach(count => {
          totalFollowers += count;
        });
      }

      return totalFollowers;
    } catch (error) {
      logger.error('Error getting current follower count', { userId, platform, error });
      return 0;
    }
  }

  /**
   * Get follower count at a specific date
   */
  private async getFollowerCountAtDate(userId: string, date: Date, platform?: Platform): Promise<number> {
    try {
      const statsRef = collection(firestore, 'users', userId, 'platformStats');
      let q = query(
        statsRef,
        where('timestamp', '<=', Timestamp.fromDate(date)),
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      if (platform) {
        q = query(q, where('platform', '==', platform));
      }

      const snapshot = await getDocs(q);
      let totalFollowers = 0;

      if (platform) {
        // Get count for specific platform at date
        const stat = snapshot.docs[0];
        if (stat) {
          totalFollowers = stat.data().followers || 0;
        }
      } else {
        // Sum followers across all platforms at date
        const platformFollowers = new Map<string, number>();
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const platformKey = data.platform;
          
          if (!platformFollowers.has(platformKey)) {
            platformFollowers.set(platformKey, data.followers || 0);
          }
        });

        platformFollowers.forEach(count => {
          totalFollowers += count;
        });
      }

      return totalFollowers;
    } catch (error) {
      logger.error('Error getting follower count at date', { userId, date, platform, error });
      return 0;
    }
  }

  /**
   * Calculate total reach and impressions
   */
  private async calculateReachAndImpressions(
    userId: string,
    startDate: Date,
    endDate: Date,
    platform?: Platform
  ): Promise<{ totalReach: number; totalImpressions: number }> {
    try {
      const postsRef = collection(firestore, 'users', userId, 'posts');
      let q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        where('status', '==', 'published')
      );

      if (platform) {
        q = query(q, where('platform', '==', platform));
      }

      const snapshot = await getDocs(q);
      let totalReach = 0;
      let totalImpressions = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const metrics = data.metrics || {};
        totalReach += metrics.reach || 0;
        totalImpressions += metrics.impressions || 0;
      });

      return { totalReach, totalImpressions };
    } catch (error) {
      logger.error('Error calculating reach and impressions', { userId, error });
      return { totalReach: 0, totalImpressions: 0 };
    }
  }

  /**
   * Get demographics data
   */
  private async getDemographicsData(userId: string, platform?: Platform): Promise<{
    ageGroups: Record<string, number>;
    genders: Record<string, number>;
    locations: Record<string, number>;
    interests: Record<string, number>;
  } | undefined> {
    try {
      const demographicsRef = collection(firestore, 'users', userId, 'audienceDemographics');
      let q = query(
        demographicsRef,
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      if (platform) {
        q = query(q, where('platform', '==', platform));
      }

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return undefined;
      }

      const latestData = snapshot.docs[0].data();
      
      return {
        ageGroups: latestData.ageGroups || {},
        genders: latestData.genders || {},
        locations: latestData.locations || {},
        interests: latestData.interests || {}
      };
    } catch (error) {
      logger.error('Error getting demographics data', { userId, platform, error });
      return undefined;
    }
  }

  /**
   * Get engagement trends over time
   */
  async getEngagementTrends(
    userId: string,
    timeRange: TimeRange,
    platform?: Platform
  ): Promise<Array<{
    date: Date;
    engagement: number;
    engagementRate: number;
    reach: number;
  }>> {
    try {
      const { startDate, endDate } = MetricsUtils.getTimeRangeDates(timeRange);
      
      const postsRef = collection(firestore, 'users', userId, 'posts');
      let q = query(
        postsRef,
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate)),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'asc')
      );

      if (platform) {
        q = query(q, where('platform', '==', platform));
      }

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => doc.data());

      // Group by date
      const dailyData = new Map<string, {
        engagement: number;
        reach: number;
        posts: number;
      }>();

      posts.forEach(post => {
        const date = post.publishedAt?.toDate();
        if (!date) return;

        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const metrics = post.metrics || {};
        const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
        const reach = metrics.reach || 0;

        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, { engagement: 0, reach: 0, posts: 0 });
        }

        const dayData = dailyData.get(dateKey)!;
        dayData.engagement += engagement;
        dayData.reach += reach;
        dayData.posts += 1;
      });

      // Convert to array and calculate rates
      return Array.from(dailyData.entries())
        .map(([dateStr, data]) => ({
          date: new Date(dateStr),
          engagement: data.engagement,
          engagementRate: data.reach > 0 ? (data.engagement / data.reach) * 100 : 0,
          reach: data.reach
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      logger.error('Error getting engagement trends', { userId, timeRange, platform, error });
      return [];
    }
  }

  /**
   * Get follower growth trends
   */
  async getFollowerGrowthTrends(
    userId: string,
    timeRange: TimeRange,
    platform?: Platform
  ): Promise<Array<{
    date: Date;
    followers: number;
    growth: number;
  }>> {
    try {
      const { startDate, endDate } = MetricsUtils.getTimeRangeDates(timeRange);
      
      const statsRef = collection(firestore, 'users', userId, 'platformStats');
      let q = query(
        statsRef,
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'asc')
      );

      if (platform) {
        q = query(q, where('platform', '==', platform));
      }

      const snapshot = await getDocs(q);
      const stats = snapshot.docs.map(doc => ({
        date: doc.data().timestamp.toDate(),
        followers: doc.data().followers || 0,
        platform: doc.data().platform
      }));

      if (platform) {
        // Single platform trends
        let previousFollowers = 0;
        return stats.map((stat, index) => {
          const growth = index > 0 ? stat.followers - previousFollowers : 0;
          previousFollowers = stat.followers;
          return {
            date: stat.date,
            followers: stat.followers,
            growth
          };
        });
      } else {
        // Aggregate across platforms by date
        const dailyData = new Map<string, number>();
        
        stats.forEach(stat => {
          const dateKey = stat.date.toISOString().split('T')[0];
          dailyData.set(dateKey, (dailyData.get(dateKey) || 0) + stat.followers);
        });

        const sortedData = Array.from(dailyData.entries())
          .map(([dateStr, followers]) => ({
            date: new Date(dateStr),
            followers
          }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        // Calculate growth
        let previousFollowers = 0;
        return sortedData.map((data, index) => {
          const growth = index > 0 ? data.followers - previousFollowers : 0;
          previousFollowers = data.followers;
          return {
            ...data,
            growth
          };
        });
      }
    } catch (error) {
      logger.error('Error getting follower growth trends', { userId, timeRange, platform, error });
      return [];
    }
  }
} 
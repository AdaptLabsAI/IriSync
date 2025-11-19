/**
 * Post Analytics Service
 *
 * Tracks performance metrics for published social media posts:
 * - Fetches metrics from platform APIs
 * - Stores metrics in Firebase
 * - Provides aggregated analytics
 * - Integrates with scheduling system
 */

import { getFirebaseFirestore } from '../../core/firebase';
import { Firestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { logger } from '../../core/logging/logger';
import { PlatformType } from '../platforms/PlatformProvider';
import { PlatformProviderFactory } from '../platforms/providers/PlatformProviderFactory';

/**
 * Post metrics snapshot
 */
export interface PostMetrics {
  id?: string;
  postId: string; // Reference to scheduledPost
  userId: string;
  organizationId: string;
  platformType: PlatformType;
  platformPostId: string;

  // Engagement metrics
  likes: number;
  comments: number;
  shares: number;
  saves?: number; // Instagram, LinkedIn
  retweets?: number; // Twitter
  impressions: number;
  reach: number;
  engagement: number;

  // Calculated metrics
  engagementRate: number; // (engagement / reach) * 100
  clickThroughRate?: number; // If link tracking available

  // Timing
  publishedAt: Date;
  fetchedAt: Date;

  // Metadata
  contentType: 'text' | 'image' | 'video' | 'carousel' | 'story';
  hasHashtags: boolean;
  hashtagCount: number;
  hasMentions: boolean;
  mentionCount: number;

  // Platform-specific data
  platformData?: Record<string, any>;
}

/**
 * Analytics summary for a post
 */
export interface PostAnalyticsSummary {
  postId: string;
  totalMetrics: PostMetrics;
  historicalMetrics: PostMetrics[];
  growthRate: {
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
  };
  peakEngagementTime?: Date;
  avgHourlyGrowth: {
    likes: number;
    comments: number;
    shares: number;
  };
}

/**
 * Aggregated analytics for multiple posts
 */
export interface AggregatedAnalytics {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  totalImpressions: number;
  avgEngagementRate: number;
  topPerformingPost?: PostMetrics;
  worstPerformingPost?: PostMetrics;

  // Breakdown by platform
  byPlatform: Record<string, {
    posts: number;
    engagement: number;
    reach: number;
    avgEngagementRate: number;
  }>;

  // Breakdown by content type
  byContentType: Record<string, {
    posts: number;
    engagement: number;
    avgEngagementRate: number;
  }>;

  // Time series data
  timeSeries: Array<{
    date: Date;
    engagement: number;
    reach: number;
    posts: number;
  }>;
}

/**
 * Service for tracking post analytics
 */
export class PostAnalyticsService {
  private getFirestore() {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Firestore not configured');
    return firestore;
  }

  private readonly postMetricsCollection = 'postMetrics';
  private readonly postAnalyticsCache = 'postAnalyticsCache';

  /**
   * Fetch and store metrics for a published post
   */
  async fetchPostMetrics(
    postId: string,
    platformType: PlatformType,
    platformPostId: string,
    userId: string,
    organizationId: string,
    accessToken: string
  ): Promise<PostMetrics | null> {
    try {
      logger.info('Fetching post metrics', {
        postId,
        platformType,
        platformPostId
      });

      // Get platform-specific metrics
      const platformMetrics = await this.fetchPlatformMetrics(
        platformType,
        platformPostId,
        accessToken
      );

      if (!platformMetrics) {
        logger.warn('No metrics returned from platform', {
          postId,
          platformType
        });
        return null;
      }

      // Create metrics document
      const metrics: Omit<PostMetrics, 'id'> = {
        postId,
        userId,
        organizationId,
        platformType,
        platformPostId,
        likes: platformMetrics.likes || 0,
        comments: platformMetrics.comments || 0,
        shares: platformMetrics.shares || 0,
        saves: platformMetrics.saves,
        retweets: platformMetrics.retweets,
        impressions: platformMetrics.impressions || 0,
        reach: platformMetrics.reach || 0,
        engagement: this.calculateTotalEngagement(platformMetrics),
        engagementRate: this.calculateEngagementRate(platformMetrics),
        clickThroughRate: platformMetrics.clickThroughRate,
        publishedAt: platformMetrics.publishedAt || new Date(),
        fetchedAt: new Date(),
        contentType: platformMetrics.contentType || 'text',
        hasHashtags: platformMetrics.hasHashtags || false,
        hashtagCount: platformMetrics.hashtagCount || 0,
        hasMentions: platformMetrics.hasMentions || false,
        mentionCount: platformMetrics.mentionCount || 0,
        platformData: platformMetrics.raw
      };

      // Store metrics in Firestore
      const docRef = await addDoc(
        collection(this.getFirestore(), this.postMetricsCollection),
        {
          ...metrics,
          publishedAt: Timestamp.fromDate(metrics.publishedAt),
          fetchedAt: Timestamp.fromDate(metrics.fetchedAt)
        }
      );

      logger.info('Post metrics stored', {
        postId,
        metricsId: docRef.id,
        engagement: metrics.engagement,
        reach: metrics.reach
      });

      return {
        ...metrics,
        id: docRef.id
      };
    } catch (error) {
      logger.error('Failed to fetch post metrics', {
        error: error instanceof Error ? error.message : String(error),
        postId,
        platformType
      });
      return null;
    }
  }

  /**
   * Fetch metrics from platform API
   */
  private async fetchPlatformMetrics(
    platformType: PlatformType,
    platformPostId: string,
    accessToken: string
  ): Promise<any> {
    try {
      // This is a simplified implementation
      // In production, each platform provider should implement getPostMetrics()

      switch (platformType) {
        case PlatformType.INSTAGRAM:
          return await this.fetchInstagramMetrics(platformPostId, accessToken);

        case PlatformType.FACEBOOK:
          return await this.fetchFacebookMetrics(platformPostId, accessToken);

        case PlatformType.TWITTER:
          return await this.fetchTwitterMetrics(platformPostId, accessToken);

        case PlatformType.LINKEDIN:
          return await this.fetchLinkedInMetrics(platformPostId, accessToken);

        case PlatformType.TIKTOK:
          return await this.fetchTikTokMetrics(platformPostId, accessToken);

        case PlatformType.YOUTUBE:
          return await this.fetchYouTubeMetrics(platformPostId, accessToken);

        default:
          logger.warn('Unsupported platform for metrics', { platformType });
          return null;
      }
    } catch (error) {
      logger.error('Error fetching platform metrics', {
        error: error instanceof Error ? error.message : String(error),
        platformType,
        platformPostId
      });
      throw error;
    }
  }

  /**
   * Fetch Instagram metrics
   */
  private async fetchInstagramMetrics(postId: string, accessToken: string): Promise<any> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/${postId}?fields=id,like_count,comments_count,timestamp,media_type,permalink&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Get insights (requires business account)
      let insights = null;
      try {
        const insightsResponse = await fetch(
          `https://graph.instagram.com/${postId}/insights?metric=engagement,impressions,reach,saved&access_token=${accessToken}`
        );

        if (insightsResponse.ok) {
          insights = await insightsResponse.json();
        }
      } catch (error) {
        logger.debug('Instagram insights not available (may require business account)');
      }

      return {
        likes: data.like_count || 0,
        comments: data.comments_count || 0,
        shares: 0, // Not available via API
        saves: insights?.data?.find((m: any) => m.name === 'saved')?.values[0]?.value || 0,
        impressions: insights?.data?.find((m: any) => m.name === 'impressions')?.values[0]?.value || 0,
        reach: insights?.data?.find((m: any) => m.name === 'reach')?.values[0]?.value || 0,
        publishedAt: new Date(data.timestamp),
        contentType: data.media_type?.toLowerCase() || 'image',
        raw: data
      };
    } catch (error) {
      logger.error('Error fetching Instagram metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Fetch Facebook metrics
   */
  private async fetchFacebookMetrics(postId: string, accessToken: string): Promise<any> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true),created_time&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Get insights
      let insights = null;
      try {
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${postId}/insights?metric=post_impressions,post_engaged_users,post_clicks&access_token=${accessToken}`
        );

        if (insightsResponse.ok) {
          insights = await insightsResponse.json();
        }
      } catch (error) {
        logger.debug('Facebook insights not available');
      }

      return {
        likes: data.likes?.summary?.total_count || 0,
        comments: data.comments?.summary?.total_count || 0,
        shares: data.shares?.count || 0,
        impressions: insights?.data?.find((m: any) => m.name === 'post_impressions')?.values[0]?.value || 0,
        reach: insights?.data?.find((m: any) => m.name === 'post_engaged_users')?.values[0]?.value || 0,
        publishedAt: new Date(data.created_time),
        contentType: 'text',
        raw: data
      };
    } catch (error) {
      logger.error('Error fetching Facebook metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Fetch Twitter metrics
   */
  private async fetchTwitterMetrics(tweetId: string, accessToken: string): Promise<any> {
    try {
      const response = await fetch(
        `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=created_at,public_metrics&expansions=author_id`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.statusText}`);
      }

      const data = await response.json();
      const metrics = data.data?.public_metrics || {};

      return {
        likes: metrics.like_count || 0,
        comments: metrics.reply_count || 0,
        shares: 0,
        retweets: metrics.retweet_count || 0,
        impressions: metrics.impression_count || 0,
        reach: metrics.impression_count || 0, // Twitter doesn't separate reach from impressions
        publishedAt: new Date(data.data?.created_at),
        contentType: 'text',
        raw: data
      };
    } catch (error) {
      logger.error('Error fetching Twitter metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Fetch LinkedIn metrics
   */
  private async fetchLinkedInMetrics(shareId: string, accessToken: string): Promise<any> {
    try {
      // LinkedIn uses URN format: urn:li:share:123456789
      const urnId = shareId.includes('urn:') ? shareId : `urn:li:share:${shareId}`;

      const response = await fetch(
        `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(urnId)}/likes`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.statusText}`);
      }

      const likesData = await response.json();

      // Get comments
      const commentsResponse = await fetch(
        `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(urnId)}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      const commentsData = commentsResponse.ok ? await commentsResponse.json() : null;

      return {
        likes: likesData.paging?.total || 0,
        comments: commentsData?.paging?.total || 0,
        shares: 0, // Requires additional API call
        impressions: 0, // Not available via public API
        reach: 0, // Not available via public API
        publishedAt: new Date(),
        contentType: 'text',
        raw: { likes: likesData, comments: commentsData }
      };
    } catch (error) {
      logger.error('Error fetching LinkedIn metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Fetch TikTok metrics
   */
  private async fetchTikTokMetrics(videoId: string, accessToken: string): Promise<any> {
    try {
      const response = await fetch(
        `https://open.tiktokapis.com/v2/video/query/?video_id=${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`TikTok API error: ${response.statusText}`);
      }

      const data = await response.json();
      const video = data.data?.videos?.[0];

      return {
        likes: video?.like_count || 0,
        comments: video?.comment_count || 0,
        shares: video?.share_count || 0,
        impressions: video?.view_count || 0,
        reach: video?.view_count || 0,
        publishedAt: new Date(video?.create_time * 1000),
        contentType: 'video',
        raw: data
      };
    } catch (error) {
      logger.error('Error fetching TikTok metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Fetch YouTube metrics
   */
  private async fetchYouTubeMetrics(videoId: string, accessToken: string): Promise<any> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`);
      }

      const data = await response.json();
      const video = data.items?.[0];
      const stats = video?.statistics || {};

      return {
        likes: parseInt(stats.likeCount) || 0,
        comments: parseInt(stats.commentCount) || 0,
        shares: 0, // Not directly available
        impressions: parseInt(stats.viewCount) || 0,
        reach: parseInt(stats.viewCount) || 0,
        publishedAt: new Date(video?.snippet?.publishedAt),
        contentType: 'video',
        raw: data
      };
    } catch (error) {
      logger.error('Error fetching YouTube metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Calculate total engagement
   */
  private calculateTotalEngagement(metrics: any): number {
    return (
      (metrics.likes || 0) +
      (metrics.comments || 0) +
      (metrics.shares || 0) +
      (metrics.saves || 0) +
      (metrics.retweets || 0)
    );
  }

  /**
   * Calculate engagement rate
   */
  private calculateEngagementRate(metrics: any): number {
    const engagement = this.calculateTotalEngagement(metrics);
    const reach = metrics.reach || metrics.impressions || 0;

    if (reach === 0) {
      return 0;
    }

    return (engagement / reach) * 100;
  }

  /**
   * Get metrics history for a post
   */
  async getPostMetricsHistory(postId: string): Promise<PostMetrics[]> {
    try {
      const q = query(
        collection(this.getFirestore(), this.postMetricsCollection),
        where('postId', '==', postId),
        orderBy('fetchedAt', 'desc'),
        limit(100)
      );

      const querySnap = await getDocs(q);

      return querySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt.toDate(),
        fetchedAt: doc.data().fetchedAt.toDate()
      } as PostMetrics));
    } catch (error) {
      logger.error('Error getting post metrics history', {
        error: error instanceof Error ? error.message : String(error),
        postId
      });
      return [];
    }
  }

  /**
   * Get aggregated analytics for user's posts
   */
  async getAggregatedAnalytics(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      platformType?: PlatformType;
      limit?: number;
    } = {}
  ): Promise<AggregatedAnalytics> {
    try {
      // Build query
      let constraints: any[] = [
        where('userId', '==', userId),
        orderBy('publishedAt', 'desc')
      ];

      if (options.platformType) {
        constraints.push(where('platformType', '==', options.platformType));
      }

      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      const q = query(
        collection(this.getFirestore(), this.postMetricsCollection),
        ...constraints
      );

      const querySnap = await getDocs(q);
      const allMetrics = querySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt.toDate(),
        fetchedAt: doc.data().fetchedAt.toDate()
      } as PostMetrics));

      // Filter by date range if specified
      let metrics = allMetrics;
      if (options.startDate || options.endDate) {
        metrics = allMetrics.filter(m => {
          if (options.startDate && m.publishedAt < options.startDate) return false;
          if (options.endDate && m.publishedAt > options.endDate) return false;
          return true;
        });
      }

      // Get latest metrics for each post (deduplicate)
      const latestMetrics = new Map<string, PostMetrics>();
      metrics.forEach(m => {
        const existing = latestMetrics.get(m.postId);
        if (!existing || m.fetchedAt > existing.fetchedAt) {
          latestMetrics.set(m.postId, m);
        }
      });

      const uniqueMetrics = Array.from(latestMetrics.values());

      // Calculate aggregates
      const totalEngagement = uniqueMetrics.reduce((sum, m) => sum + m.engagement, 0);
      const totalReach = uniqueMetrics.reduce((sum, m) => sum + m.reach, 0);
      const totalImpressions = uniqueMetrics.reduce((sum, m) => sum + m.impressions, 0);
      const avgEngagementRate = uniqueMetrics.length > 0
        ? uniqueMetrics.reduce((sum, m) => sum + m.engagementRate, 0) / uniqueMetrics.length
        : 0;

      // Find top and worst performers
      const sortedByEngagement = [...uniqueMetrics].sort((a, b) => b.engagement - a.engagement);
      const topPerformingPost = sortedByEngagement[0];
      const worstPerformingPost = sortedByEngagement[sortedByEngagement.length - 1];

      // Breakdown by platform
      const byPlatform: Record<string, any> = {};
      uniqueMetrics.forEach(m => {
        if (!byPlatform[m.platformType]) {
          byPlatform[m.platformType] = {
            posts: 0,
            engagement: 0,
            reach: 0,
            avgEngagementRate: 0
          };
        }

        byPlatform[m.platformType].posts++;
        byPlatform[m.platformType].engagement += m.engagement;
        byPlatform[m.platformType].reach += m.reach;
      });

      // Calculate avg engagement rate per platform
      Object.keys(byPlatform).forEach(platform => {
        const platformMetrics = uniqueMetrics.filter(m => m.platformType === platform);
        byPlatform[platform].avgEngagementRate = platformMetrics.length > 0
          ? platformMetrics.reduce((sum, m) => sum + m.engagementRate, 0) / platformMetrics.length
          : 0;
      });

      // Breakdown by content type
      const byContentType: Record<string, any> = {};
      uniqueMetrics.forEach(m => {
        if (!byContentType[m.contentType]) {
          byContentType[m.contentType] = {
            posts: 0,
            engagement: 0,
            avgEngagementRate: 0
          };
        }

        byContentType[m.contentType].posts++;
        byContentType[m.contentType].engagement += m.engagement;
      });

      // Calculate avg engagement rate per content type
      Object.keys(byContentType).forEach(type => {
        const typeMetrics = uniqueMetrics.filter(m => m.contentType === type);
        byContentType[type].avgEngagementRate = typeMetrics.length > 0
          ? typeMetrics.reduce((sum, m) => sum + m.engagementRate, 0) / typeMetrics.length
          : 0;
      });

      // Create time series (group by day)
      const timeSeriesMap = new Map<string, any>();
      uniqueMetrics.forEach(m => {
        const dateKey = m.publishedAt.toISOString().split('T')[0];

        if (!timeSeriesMap.has(dateKey)) {
          timeSeriesMap.set(dateKey, {
            date: new Date(dateKey),
            engagement: 0,
            reach: 0,
            posts: 0
          });
        }

        const dayData = timeSeriesMap.get(dateKey);
        dayData.engagement += m.engagement;
        dayData.reach += m.reach;
        dayData.posts++;
      });

      const timeSeries = Array.from(timeSeriesMap.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return {
        totalPosts: uniqueMetrics.length,
        totalEngagement,
        totalReach,
        totalImpressions,
        avgEngagementRate,
        topPerformingPost,
        worstPerformingPost,
        byPlatform,
        byContentType,
        timeSeries
      };
    } catch (error) {
      logger.error('Error getting aggregated analytics', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      throw error;
    }
  }
}

// Export singleton instance
export const postAnalyticsService = new PostAnalyticsService();

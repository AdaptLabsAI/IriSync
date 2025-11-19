/**
 * Metrics Fetcher
 *
 * Automated service to fetch metrics for published posts:
 * - Runs periodically via cron
 * - Fetches metrics for recently published posts
 * - Updates analytics database
 * - Tracks growth over time
 */

import { getFirebaseFirestore } from '../../core/firebase';
import { Firestore, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { logger } from '../../core/logging/logger';
import { postAnalyticsService } from './PostAnalyticsService';
import { scheduledPostService } from '../scheduling/ScheduledPostService';
import { PlatformType } from '../platforms/PlatformProvider';

/**
 * Metrics fetching stats
 */
export interface FetchingStats {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: string[];
}

/**
 * Configuration for metrics fetching
 */
export interface MetricsFetcherConfig {
  // How far back to look for posts to fetch metrics (in hours)
  lookbackHours: number;

  // Maximum number of posts to process in one run
  batchSize: number;

  // Concurrent fetching limit
  concurrentFetches: number;

  // Minimum time between metric fetches for the same post (in hours)
  minFetchInterval: number;
}

/**
 * Service for fetching metrics from platforms
 */
export class MetricsFetcher {
  private processing: boolean = false;
  private config: MetricsFetcherConfig;

  constructor(config?: Partial<MetricsFetcherConfig>) {
    this.config = {
      lookbackHours: 168, // 7 days
      batchSize: 100,
      concurrentFetches: 10,
      minFetchInterval: 1, // Fetch at most once per hour
      ...config
    };
  }

  /**
   * Fetch metrics for all eligible posts
   */
  async fetchMetrics(): Promise<FetchingStats> {
    if (this.processing) {
      logger.warn('Metrics fetching already in progress, skipping');
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        errors: ['Already processing']
      };
    }

    this.processing = true;

    const stats: FetchingStats = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      logger.info('Starting metrics fetching', {
        lookbackHours: this.config.lookbackHours,
        batchSize: this.config.batchSize
      });

      // Get published posts from the last N hours
      const eligiblePosts = await this.getEligiblePosts();

      logger.info('Found eligible posts for metrics fetching', {
        count: eligiblePosts.length
      });

      // Process in batches
      const concurrency = this.config.concurrentFetches;

      for (let i = 0; i < eligiblePosts.length; i += concurrency) {
        const batch = eligiblePosts.slice(i, i + concurrency);

        const results = await Promise.allSettled(
          batch.map(post => this.fetchPostMetrics(post))
        );

        results.forEach((result, index) => {
          stats.processed++;

          if (result.status === 'fulfilled') {
            if (result.value) {
              stats.successful++;
            } else {
              stats.skipped++;
            }
          } else {
            stats.failed++;
            stats.errors.push(
              `Post ${batch[index].id}: ${result.reason?.message || 'Unknown error'}`
            );
          }
        });

        logger.info('Processed batch', {
          batchNumber: Math.floor(i / concurrency) + 1,
          processed: stats.processed,
          successful: stats.successful,
          failed: stats.failed
        });
      }

      logger.info('Metrics fetching completed', stats);

      return stats;
    } catch (error) {
      logger.error('Metrics fetching error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      stats.errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );

      return stats;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get posts eligible for metrics fetching
   */
  private async getEligiblePosts(): Promise<any[]> {
    try {
      const lookbackDate = new Date();
      lookbackDate.setHours(lookbackDate.getHours() - this.config.lookbackHours);

      // Query scheduled posts collection for published posts
      const q = query(
        collection(this.getFirestore(), 'scheduledPosts'),
        where('status', '==', 'published'),
        where('publishedAt', '>=', Timestamp.fromDate(lookbackDate)),
        orderBy('publishedAt', 'desc')
      );

      const querySnap = await getDocs(q);

      const posts = querySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate(),
        scheduledFor: doc.data().scheduledFor?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));

      // Filter out posts that were fetched recently
      const eligiblePosts = [];

      for (const post of posts) {
        const shouldFetch = await this.shouldFetchMetrics(post.id);

        if (shouldFetch) {
          eligiblePosts.push(post);
        }
      }

      return eligiblePosts.slice(0, this.config.batchSize);
    } catch (error) {
      logger.error('Error getting eligible posts', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Check if we should fetch metrics for a post
   */
  private async shouldFetchMetrics(postId: string): Promise<boolean> {
    try {
      // Get the most recent metrics fetch for this post
      const metricsHistory = await postAnalyticsService.getPostMetricsHistory(postId);

      if (metricsHistory.length === 0) {
        // Never fetched before, should fetch
        return true;
      }

      const lastFetch = metricsHistory[0].fetchedAt;
      const minInterval = this.config.minFetchInterval * 60 * 60 * 1000; // Convert hours to ms
      const timeSinceLastFetch = Date.now() - lastFetch.getTime();

      return timeSinceLastFetch >= minInterval;
    } catch (error) {
      logger.error('Error checking if should fetch metrics', {
        error: error instanceof Error ? error.message : String(error),
        postId
      });
      // Err on the side of fetching
      return true;
    }
  }

  /**
   * Fetch metrics for a single post
   */
  private async fetchPostMetrics(post: any): Promise<boolean> {
    try {
      logger.debug('Fetching metrics for post', {
        postId: post.id,
        platformType: post.post?.platformType
      });

      // Get platform post IDs
      const platformPostIds = post.platformPostIds || {};
      const platformType = post.post?.platformType as PlatformType;

      if (!platformType) {
        logger.warn('Post has no platform type', { postId: post.id });
        return false;
      }

      const platformPostId = platformPostIds[platformType];

      if (!platformPostId) {
        logger.warn('Post has no platform post ID', {
          postId: post.id,
          platformType
        });
        return false;
      }

      // Get platform connection to get access token
      const connection = await this.getPlatformConnection(
        post.userId,
        post.organizationId,
        platformType
      );

      if (!connection || !connection.accessToken) {
        logger.warn('No platform connection found', {
          postId: post.id,
          userId: post.userId,
          platformType
        });
        return false;
      }

      // Fetch metrics
      const metrics = await postAnalyticsService.fetchPostMetrics(
        post.id,
        platformType,
        platformPostId,
        post.userId,
        post.organizationId,
        connection.accessToken
      );

      if (metrics) {
        logger.info('Successfully fetched metrics', {
          postId: post.id,
          engagement: metrics.engagement,
          reach: metrics.reach
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error fetching post metrics', {
        error: error instanceof Error ? error.message : String(error),
        postId: post.id
      });
      throw error;
    }
  }

  /**
   * Get platform connection for a user
   */
  private async getPlatformConnection(
    userId: string,
    organizationId: string,
    platformType: PlatformType
  ): Promise<any> {
    try {
      // Query connections collection
      const connectionsQuery = query(
        collection(this.getFirestore(), 'connections'),
        where('userId', '==', userId),
        where('provider', '==', platformType.toLowerCase())
      );

      const querySnap = await getDocs(connectionsQuery);

      if (querySnap.empty) {
        // Try organization-level connection
        const orgConnectionsQuery = query(
          collection(this.getFirestore(), 'connections'),
          where('organizationId', '==', organizationId),
          where('provider', '==', platformType.toLowerCase())
        );

        const orgQuerySnap = await getDocs(orgConnectionsQuery);

        if (orgQuerySnap.empty) {
          return null;
        }

        return orgQuerySnap.docs[0].data();
      }

      return querySnap.docs[0].data();
    } catch (error) {
      logger.error('Error getting platform connection', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        platformType
      });
      return null;
    }
  }

  /**
   * Fetch metrics for a specific post (manual trigger)
   */
  async fetchMetricsForPost(postId: string): Promise<boolean> {
    try {
      logger.info('Manually fetching metrics for post', { postId });

      // Get the scheduled post
      const post = await scheduledPostService.getScheduledPost(postId);

      if (!post) {
        logger.error('Post not found', { postId });
        return false;
      }

      if (post.status !== 'published') {
        logger.warn('Post is not published', {
          postId,
          status: post.status
        });
        return false;
      }

      return await this.fetchPostMetrics(post);
    } catch (error) {
      logger.error('Error in manual metrics fetch', {
        error: error instanceof Error ? error.message : String(error),
        postId
      });
      return false;
    }
  }

  /**
   * Get processing status
   */
  isProcessing(): boolean {
    return this.processing;
  }
}

// Export singleton instance
export const metricsFetcher = new MetricsFetcher();

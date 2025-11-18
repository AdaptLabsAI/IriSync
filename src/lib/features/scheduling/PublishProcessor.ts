/**
 * Publish Processor
 *
 * Processes scheduled posts and publishes them to social media platforms.
 * Features:
 * - Batch processing of due posts
 * - Multi-platform publishing
 * - Retry logic for failures
 * - Concurrent post processing
 * - Error handling and logging
 */

import { logger } from '../../core/logging/logger';
import { scheduledPostService, ScheduledPost, PublishResult } from './ScheduledPostService';
import { PlatformProviderFactory } from '../platforms/providers/PlatformProviderFactory';
import { PlatformType } from '../platforms/PlatformProvider';
import { firestore } from '../../core/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Processing statistics
 */
export interface ProcessingStats {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    postId: string;
    error: string;
  }>;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * Platform connection info
 */
interface PlatformConnection {
  platformType: PlatformType;
  accountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Publish processor for scheduled posts
 */
export class PublishProcessor {
  private processing: boolean = false;
  private readonly maxConcurrent = 5; // Process 5 posts concurrently

  /**
   * Process all due posts
   */
  async processDuePosts(): Promise<ProcessingStats> {
    if (this.processing) {
      logger.warn('Publish processor already running, skipping');
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        startTime: new Date()
      };
    }

    this.processing = true;
    const stats: ProcessingStats = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startTime: new Date()
    };

    try {
      logger.info('Starting publish processor');

      // Get posts due for publishing
      const duePosts = await scheduledPostService.getDuePost();

      if (duePosts.length === 0) {
        logger.info('No posts due for publishing');
        return stats;
      }

      logger.info(`Found ${duePosts.length} posts due for publishing`);

      // Process posts in batches
      const batchSize = this.maxConcurrent;
      for (let i = 0; i < duePosts.length; i += batchSize) {
        const batch = duePosts.slice(i, i + batchSize);

        // Process batch concurrently
        const results = await Promise.allSettled(
          batch.map((post) => this.publishPost(post))
        );

        // Update stats
        results.forEach((result, index) => {
          stats.processed++;

          if (result.status === 'fulfilled' && result.value) {
            stats.successful++;
          } else {
            stats.failed++;
            const post = batch[index];
            const error =
              result.status === 'rejected'
                ? result.reason?.message || 'Unknown error'
                : 'Failed to publish';
            stats.errors.push({
              postId: post.id || 'unknown',
              error
            });
          }
        });
      }

      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

      logger.info('Publish processor completed', {
        processed: stats.processed,
        successful: stats.successful,
        failed: stats.failed,
        duration: stats.duration
      });

      return stats;
    } catch (error) {
      logger.error('Publish processor error', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Publish a single scheduled post
   */
  private async publishPost(scheduledPost: ScheduledPost): Promise<boolean> {
    if (!scheduledPost.id) {
      logger.error('Scheduled post missing ID', { post: scheduledPost });
      return false;
    }

    logger.info('Publishing post', {
      postId: scheduledPost.id,
      userId: scheduledPost.userId,
      platform: scheduledPost.post.platformType
    });

    try {
      // Get user's connected platforms
      const connections = await this.getUserPlatformConnections(
        scheduledPost.userId,
        scheduledPost.organizationId,
        scheduledPost.post.platformType
      );

      if (connections.length === 0) {
        throw new Error(`No connected account found for ${scheduledPost.post.platformType}`);
      }

      // Publish to all connected accounts for the platform
      const publishResults: PublishResult[] = [];

      for (const connection of connections) {
        try {
          const result = await this.publishToPlatform(
            scheduledPost.post,
            connection
          );
          publishResults.push(result);
        } catch (error) {
          publishResults.push({
            success: false,
            platformType: connection.platformType,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Check if any publishes succeeded
      const hasSuccess = publishResults.some((r) => r.success);

      if (hasSuccess) {
        // Mark as published
        await scheduledPostService.markAsPublished(
          scheduledPost.id,
          publishResults.filter((r) => r.success)
        );

        // Create next occurrence if recurring
        if (scheduledPost.schedule.recurrence) {
          await scheduledPostService.createRecurringInstance(scheduledPost);
        }

        logger.info('Post published successfully', {
          postId: scheduledPost.id,
          results: publishResults
        });

        return true;
      } else {
        // All publishes failed
        const errors = publishResults.map((r) => r.error).join('; ');
        await scheduledPostService.markAsFailed(scheduledPost.id, errors);

        logger.error('Post failed to publish', {
          postId: scheduledPost.id,
          errors
        });

        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await scheduledPostService.markAsFailed(
        scheduledPost.id,
        errorMessage
      );

      logger.error('Error publishing post', {
        postId: scheduledPost.id,
        error: errorMessage
      });

      return false;
    }
  }

  /**
   * Get user's platform connections
   */
  private async getUserPlatformConnections(
    userId: string,
    organizationId: string,
    platformType: PlatformType
  ): Promise<PlatformConnection[]> {
    try {
      // Get connected accounts from Firebase
      const accountsSnapshot = await firestore
        .collection('connectedAccounts')
        .where('userId', '==', userId)
        .where('organizationId', '==', organizationId)
        .where('platformType', '==', platformType)
        .where('isActive', '==', true)
        .get();

      const connections: PlatformConnection[] = [];

      for (const accountDoc of accountsSnapshot.docs) {
        const accountData = accountDoc.data();

        connections.push({
          platformType: accountData.platformType as PlatformType,
          accountId: accountDoc.id,
          accessToken: accountData.accessToken,
          refreshToken: accountData.refreshToken,
          expiresAt: accountData.expiresAt?.toDate()
        });
      }

      return connections;
    } catch (error) {
      logger.error('Failed to get platform connections', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        platformType
      });
      return [];
    }
  }

  /**
   * Publish post to a specific platform
   */
  private async publishToPlatform(
    post: any,
    connection: PlatformConnection
  ): Promise<PublishResult> {
    try {
      // Get platform provider
      const provider = PlatformProviderFactory.createProvider(
        connection.platformType,
        {
          clientId: process.env[`${connection.platformType.toUpperCase()}_CLIENT_ID`] || '',
          clientSecret: process.env[`${connection.platformType.toUpperCase()}_CLIENT_SECRET`] || '',
          redirectUri: process.env.NEXT_PUBLIC_BASE_URL + `/api/platforms/callback/${connection.platformType}`
        },
        {
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
          expiresAt: connection.expiresAt,
          scope: []
        }
      );

      // Publish the post
      const response = await provider.createPost(post);

      return {
        success: true,
        platformType: connection.platformType,
        platformPostId: response.platformPostId,
        url: response.url
      };
    } catch (error) {
      logger.error('Failed to publish to platform', {
        error: error instanceof Error ? error.message : String(error),
        platformType: connection.platformType
      });

      return {
        success: false,
        platformType: connection.platformType,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Retry failed posts
   */
  async retryFailedPosts(): Promise<ProcessingStats> {
    // TODO: Implement retry logic for posts that failed but haven't exceeded max attempts
    // This would query posts with status 'scheduled' and attempts > 0
    logger.info('Retry failed posts not yet implemented');
    return {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startTime: new Date()
    };
  }
}

// Export singleton instance
export const publishProcessor = new PublishProcessor();

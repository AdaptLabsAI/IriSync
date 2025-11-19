/**
 * Scheduled Post Service
 *
 * Manages scheduled social media posts with:
 * - Post scheduling and queuing
 * - Recurring post support
 * - Multi-platform publishing
 * - Retry logic for failed posts
 * - Status tracking and analytics
 */

import { getFirebaseFirestore } from '../../core/firebase';
import { Firestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  runTransaction,
  QueryConstraint
} from 'firebase/firestore';
import { logger } from '../../core/logging/logger';
import { PlatformType } from '../platforms/PlatformProvider';
import { PostStatus, PlatformPost, PostSchedule, PostAttachment } from '../platforms/models/content';

/**
 * Scheduled post document structure
 */
export interface ScheduledPost {
  id?: string;
  userId: string;
  organizationId: string;

  // Post content
  post: PlatformPost;

  // Scheduling
  schedule: PostSchedule;
  status: PostStatus;

  // Tracking
  createdAt: Date;
  updatedAt: Date;
  scheduledFor: Date; // Denormalized for query performance
  publishedAt?: Date;

  // Error handling
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  lastError?: string;

  // Results
  platformPostIds?: Partial<Record<PlatformType, string>>;
  publishUrls?: Partial<Record<PlatformType, string>>;

  // Metadata
  tags?: string[];
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Queue item for processing
 */
export interface QueueItem {
  postId: string;
  scheduledPost: ScheduledPost;
  priority: number;
  retryCount: number;
}

/**
 * Publishing result
 */
export interface PublishResult {
  success: boolean;
  platformType: PlatformType;
  platformPostId?: string;
  url?: string;
  error?: string;
}

/**
 * Service for managing scheduled posts
 */
export class ScheduledPostService {
  private getFirestore() {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Firestore not configured');
    return firestore;
  }

  private readonly scheduledPostsCollection = 'scheduledPosts';
  private readonly publishQueueCollection = 'publishQueue';
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 60000; // 1 minute

  /**
   * Create a new scheduled post
   */
  async createScheduledPost(
    userId: string,
    organizationId: string,
    post: PlatformPost,
    schedule: PostSchedule,
    options?: {
      tags?: string[];
      notes?: string;
      maxAttempts?: number;
    }
  ): Promise<string> {
    try {
      const scheduledPost: Omit<ScheduledPost, 'id'> = {
        userId,
        organizationId,
        post,
        schedule,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: schedule.publishAt,
        attempts: 0,
        maxAttempts: options?.maxAttempts || 3,
        tags: options?.tags || [],
        notes: options?.notes || '',
        metadata: {}
      };

      const docRef = await addDoc(
        collection(this.getFirestore(), this.scheduledPostsCollection),
        {
          ...scheduledPost,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          scheduledFor: Timestamp.fromDate(schedule.publishAt)
        }
      );

      logger.info('Scheduled post created', {
        postId: docRef.id,
        userId,
        scheduledFor: schedule.publishAt,
        platforms: post.platformType
      });

      return docRef.id;
    } catch (error) {
      logger.error('Failed to create scheduled post', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      throw new Error('Failed to create scheduled post');
    }
  }

  /**
   * Get scheduled post by ID
   */
  async getScheduledPost(postId: string): Promise<ScheduledPost | null> {
    try {
      const docRef = doc(this.getFirestore(), this.scheduledPostsCollection, postId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data();
      return {
        id: snapshot.id,
        userId: data.userId,
        organizationId: data.organizationId,
        post: data.post,
        schedule: {
          ...data.schedule,
          publishAt: data.schedule.publishAt.toDate()
        },
        status: data.status as PostStatus,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        scheduledFor: data.scheduledFor?.toDate() || new Date(),
        publishedAt: data.publishedAt?.toDate(),
        attempts: data.attempts || 0,
        maxAttempts: data.maxAttempts || 3,
        lastAttemptAt: data.lastAttemptAt?.toDate(),
        lastError: data.lastError,
        platformPostIds: data.platformPostIds,
        publishUrls: data.publishUrls,
        tags: data.tags || [],
        notes: data.notes,
        metadata: data.metadata || {}
      };
    } catch (error) {
      logger.error('Failed to get scheduled post', {
        error: error instanceof Error ? error.message : String(error),
        postId
      });
      return null;
    }
  }

  /**
   * Get user's scheduled posts
   */
  async getUserScheduledPosts(
    userId: string,
    options?: {
      status?: PostStatus | PostStatus[];
      limit?: number;
      includePublished?: boolean;
    }
  ): Promise<ScheduledPost[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('userId', '==', userId)
      ];

      // Filter by status
      if (options?.status) {
        if (Array.isArray(options.status)) {
          constraints.push(where('status', 'in', options.status));
        } else {
          constraints.push(where('status', '==', options.status));
        }
      } else if (!options?.includePublished) {
        constraints.push(where('status', 'in', ['scheduled', 'draft']));
      }

      // Order by scheduled time
      constraints.push(orderBy('scheduledFor', 'asc'));

      // Limit results
      if (options?.limit) {
        constraints.push(limit(options.limit));
      }

      const q = query(
        collection(this.getFirestore(), this.scheduledPostsCollection),
        ...constraints
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          organizationId: data.organizationId,
          post: data.post,
          schedule: {
            ...data.schedule,
            publishAt: data.schedule.publishAt.toDate()
          },
          status: data.status as PostStatus,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          scheduledFor: data.scheduledFor?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
          attempts: data.attempts || 0,
          maxAttempts: data.maxAttempts || 3,
          lastAttemptAt: data.lastAttemptAt?.toDate(),
          lastError: data.lastError,
          platformPostIds: data.platformPostIds,
          publishUrls: data.publishUrls,
          tags: data.tags || [],
          notes: data.notes,
          metadata: data.metadata || {}
        };
      });
    } catch (error) {
      logger.error('Failed to get user scheduled posts', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return [];
    }
  }

  /**
   * Get posts due for publishing
   */
  async getDuePosts(now: Date = new Date()): Promise<ScheduledPost[]> {
    try {
      const q = query(
        collection(this.getFirestore(), this.scheduledPostsCollection),
        where('status', '==', 'scheduled'),
        where('scheduledFor', '<=', Timestamp.fromDate(now)),
        orderBy('scheduledFor', 'asc'),
        limit(50) // Process in batches
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          organizationId: data.organizationId,
          post: data.post,
          schedule: {
            ...data.schedule,
            publishAt: data.schedule.publishAt.toDate()
          },
          status: data.status as PostStatus,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          scheduledFor: data.scheduledFor?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
          attempts: data.attempts || 0,
          maxAttempts: data.maxAttempts || 3,
          lastAttemptAt: data.lastAttemptAt?.toDate(),
          lastError: data.lastError,
          platformPostIds: data.platformPostIds,
          publishUrls: data.publishUrls,
          tags: data.tags || [],
          notes: data.notes,
          metadata: data.metadata || {}
        };
      });
    } catch (error) {
      logger.error('Failed to get due posts', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Update scheduled post
   */
  async updateScheduledPost(
    postId: string,
    updates: {
      post?: PlatformPost;
      schedule?: PostSchedule;
      status?: PostStatus;
      tags?: string[];
      notes?: string;
    }
  ): Promise<void> {
    try {
      const docRef = doc(this.getFirestore(), this.scheduledPostsCollection, postId);

      const updateData: any = {
        updatedAt: serverTimestamp()
      };

      if (updates.post) updateData.post = updates.post;
      if (updates.schedule) {
        updateData.schedule = updates.schedule;
        updateData.scheduledFor = Timestamp.fromDate(updates.schedule.publishAt);
      }
      if (updates.status) updateData.status = updates.status;
      if (updates.tags) updateData.tags = updates.tags;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      await updateDoc(docRef, updateData);

      logger.info('Scheduled post updated', { postId, updates: Object.keys(updates) });
    } catch (error) {
      logger.error('Failed to update scheduled post', {
        error: error instanceof Error ? error.message : String(error),
        postId
      });
      throw new Error('Failed to update scheduled post');
    }
  }

  /**
   * Mark post as published
   */
  async markAsPublished(
    postId: string,
    results: PublishResult[]
  ): Promise<void> {
    try {
      const platformPostIds: Partial<Record<PlatformType, string>> = {};
      const publishUrls: Partial<Record<PlatformType, string>> = {};

      results.forEach((result) => {
        if (result.success && result.platformPostId) {
          platformPostIds[result.platformType] = result.platformPostId;
          if (result.url) {
            publishUrls[result.platformType] = result.url;
          }
        }
      });

      await updateDoc(doc(this.getFirestore(), this.scheduledPostsCollection, postId), {
        status: 'published',
        publishedAt: serverTimestamp(),
        platformPostIds,
        publishUrls,
        updatedAt: serverTimestamp()
      });

      logger.info('Post marked as published', {
        postId,
        platforms: Object.keys(platformPostIds)
      });
    } catch (error) {
      logger.error('Failed to mark post as published', {
        error: error instanceof Error ? error.message : String(error),
        postId
      });
      throw new Error('Failed to mark post as published');
    }
  }

  /**
   * Mark post as failed
   */
  async markAsFailed(
    postId: string,
    error: string,
    shouldRetry: boolean = true
  ): Promise<void> {
    try {
      const post = await this.getScheduledPost(postId);

      if (!post) {
        throw new Error('Post not found');
      }

      const newAttempts = post.attempts + 1;
      const maxAttempts = post.maxAttempts || 3;

      const updateData: any = {
        attempts: newAttempts,
        lastAttemptAt: serverTimestamp(),
        lastError: error,
        updatedAt: serverTimestamp()
      };

      // Mark as failed if max retries reached or retry not requested
      if (!shouldRetry || newAttempts >= maxAttempts) {
        updateData.status = 'failed';
        logger.warn('Post marked as failed (max retries reached)', {
          postId,
          attempts: newAttempts,
          maxAttempts,
          error
        });
      } else {
        logger.info('Post will be retried', {
          postId,
          attempt: newAttempts,
          maxAttempts
        });
      }

      await updateDoc(doc(this.getFirestore(), this.scheduledPostsCollection, postId), updateData);
    } catch (error) {
      logger.error('Failed to mark post as failed', {
        error: error instanceof Error ? error.message : String(error),
        postId
      });
      throw new Error('Failed to mark post as failed');
    }
  }

  /**
   * Delete scheduled post
   */
  async deleteScheduledPost(postId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.getFirestore(), this.scheduledPostsCollection, postId));

      logger.info('Scheduled post deleted', { postId });
    } catch (error) {
      logger.error('Failed to delete scheduled post', {
        error: error instanceof Error ? error.message : String(error),
        postId
      });
      throw new Error('Failed to delete scheduled post');
    }
  }

  /**
   * Calculate next occurrence for recurring posts
   */
  calculateNextOccurrence(schedule: PostSchedule): Date | null {
    if (!schedule.recurrence) {
      return null;
    }

    const { frequency, interval, endDate, endAfterOccurrences, weekdays } = schedule.recurrence;
    const current = new Date(schedule.publishAt);
    const next = new Date(current);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + interval);
        break;

      case 'weekly':
        next.setDate(next.getDate() + (7 * interval));
        break;

      case 'monthly':
        next.setMonth(next.getMonth() + interval);
        break;
    }

    // Check end conditions
    if (endDate && next > endDate) {
      return null;
    }

    return next;
  }

  /**
   * Create recurring post instance
   */
  async createRecurringInstance(originalPost: ScheduledPost): Promise<string | null> {
    if (!originalPost.schedule.recurrence) {
      return null;
    }

    const nextPublishAt = this.calculateNextOccurrence(originalPost.schedule);

    if (!nextPublishAt) {
      return null;
    }

    // Create new instance with updated schedule
    const newSchedule: PostSchedule = {
      ...originalPost.schedule,
      publishAt: nextPublishAt
    };

    return await this.createScheduledPost(
      originalPost.userId,
      originalPost.organizationId,
      originalPost.post,
      newSchedule,
      {
        tags: originalPost.tags,
        notes: originalPost.notes,
        maxAttempts: originalPost.maxAttempts
      }
    );
  }
}

// Export singleton instance
export const scheduledPostService = new ScheduledPostService();

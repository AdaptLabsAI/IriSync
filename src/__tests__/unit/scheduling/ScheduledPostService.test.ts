/**
 * Unit Tests: ScheduledPostService
 *
 * Comprehensive test suite for scheduled post management service
 */

import { ScheduledPostService, ScheduledPost, PublishResult } from '@/lib/features/scheduling/ScheduledPostService';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';
import { PostStatus, PlatformPost, PostSchedule } from '@/lib/features/platforms/models/content';
import {
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
  runTransaction
} from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore');
jest.mock('@/lib/core/firebase', () => ({
  firestore: {}
}));
jest.mock('@/lib/core/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('ScheduledPostService', () => {
  let service: ScheduledPostService;

  // Mock data
  const mockUserId = 'user_123';
  const mockOrgId = 'org_456';
  const mockPostId = 'post_789';

  const mockPost: PlatformPost = {
    content: 'Test post content #testing',
    platformType: PlatformType.INSTAGRAM,
    hashtags: ['testing'],
    mentions: [],
    attachments: []
  };

  const mockSchedule: PostSchedule = {
    publishAt: new Date('2025-12-01T10:00:00Z'),
    timezone: 'America/New_York',
    recurrence: null
  };

  const mockScheduledPost: ScheduledPost = {
    id: mockPostId,
    userId: mockUserId,
    organizationId: mockOrgId,
    post: mockPost,
    schedule: mockSchedule,
    status: 'scheduled' as PostStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
    scheduledFor: new Date('2025-12-01T10:00:00Z'),
    attempts: 0,
    maxAttempts: 3
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScheduledPostService();
  });

  describe('createScheduledPost', () => {
    it('should create a new scheduled post with valid data', async () => {
      const mockDocRef = { id: mockPostId };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const postId = await service.createScheduledPost(
        mockUserId,
        mockOrgId,
        mockPost,
        mockSchedule
      );

      expect(postId).toBe(mockPostId);
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: mockUserId,
          organizationId: mockOrgId,
          post: mockPost,
          schedule: expect.objectContaining({
            publishAt: expect.any(Object), // Timestamp
            timezone: mockSchedule.timezone
          }),
          status: 'scheduled',
          attempts: 0,
          maxAttempts: 3
        })
      );
    });

    it('should accept optional parameters', async () => {
      const mockDocRef = { id: mockPostId };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const postId = await service.createScheduledPost(
        mockUserId,
        mockOrgId,
        mockPost,
        mockSchedule,
        {
          tags: ['campaign1', 'promo'],
          notes: 'Important campaign post',
          maxAttempts: 5
        }
      );

      expect(postId).toBe(mockPostId);
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tags: ['campaign1', 'promo'],
          notes: 'Important campaign post',
          maxAttempts: 5
        })
      );
    });

    it('should handle errors during creation', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        service.createScheduledPost(mockUserId, mockOrgId, mockPost, mockSchedule)
      ).rejects.toThrow('Firestore error');
    });

    it('should create post with recurring schedule', async () => {
      const mockDocRef = { id: mockPostId };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const recurringSchedule: PostSchedule = {
        ...mockSchedule,
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          daysOfWeek: [1, 3, 5] // Mon, Wed, Fri
        }
      };

      const postId = await service.createScheduledPost(
        mockUserId,
        mockOrgId,
        mockPost,
        recurringSchedule
      );

      expect(postId).toBe(mockPostId);
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          schedule: expect.objectContaining({
            recurrence: recurringSchedule.recurrence
          })
        })
      );
    });
  });

  describe('getScheduledPost', () => {
    it('should retrieve an existing post', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: mockPostId,
        data: () => ({
          ...mockScheduledPost,
          createdAt: Timestamp.fromDate(mockScheduledPost.createdAt),
          updatedAt: Timestamp.fromDate(mockScheduledPost.updatedAt),
          scheduledFor: Timestamp.fromDate(mockScheduledPost.scheduledFor)
        })
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const post = await service.getScheduledPost(mockPostId);

      expect(post).toBeDefined();
      expect(post?.id).toBe(mockPostId);
      expect(post?.userId).toBe(mockUserId);
      expect(post?.status).toBe('scheduled');
    });

    it('should return null for non-existent post', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const post = await service.getScheduledPost('nonexistent_id');

      expect(post).toBeNull();
    });

    it('should handle errors during retrieval', async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(service.getScheduledPost(mockPostId)).rejects.toThrow('Firestore error');
    });
  });

  describe('getUserScheduledPosts', () => {
    it('should retrieve user posts with default options', async () => {
      const mockQuerySnap = {
        empty: false,
        docs: [
          {
            id: mockPostId,
            data: () => ({
              ...mockScheduledPost,
              createdAt: Timestamp.fromDate(mockScheduledPost.createdAt),
              updatedAt: Timestamp.fromDate(mockScheduledPost.updatedAt),
              scheduledFor: Timestamp.fromDate(mockScheduledPost.scheduledFor)
            })
          }
        ]
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const posts = await service.getUserScheduledPosts(mockUserId);

      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe(mockPostId);
    });

    it('should filter by status', async () => {
      const mockQuerySnap = {
        empty: false,
        docs: [
          {
            id: mockPostId,
            data: () => ({
              ...mockScheduledPost,
              status: 'published',
              createdAt: Timestamp.fromDate(mockScheduledPost.createdAt),
              updatedAt: Timestamp.fromDate(mockScheduledPost.updatedAt),
              scheduledFor: Timestamp.fromDate(mockScheduledPost.scheduledFor)
            })
          }
        ]
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const posts = await service.getUserScheduledPosts(mockUserId, {
        status: 'published'
      });

      expect(posts).toHaveLength(1);
      expect(posts[0].status).toBe('published');
    });

    it('should exclude published posts by default', async () => {
      const mockQuerySnap = {
        empty: false,
        docs: [
          {
            id: 'post_1',
            data: () => ({
              ...mockScheduledPost,
              id: 'post_1',
              status: 'scheduled',
              createdAt: Timestamp.fromDate(mockScheduledPost.createdAt),
              updatedAt: Timestamp.fromDate(mockScheduledPost.updatedAt),
              scheduledFor: Timestamp.fromDate(mockScheduledPost.scheduledFor)
            })
          }
        ]
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const posts = await service.getUserScheduledPosts(mockUserId, {
        includePublished: false
      });

      expect(posts.every(p => p.status !== 'published')).toBe(true);
    });

    it('should respect limit option', async () => {
      const mockQuerySnap = {
        empty: false,
        docs: Array(10).fill(null).map((_, i) => ({
          id: `post_${i}`,
          data: () => ({
            ...mockScheduledPost,
            id: `post_${i}`,
            createdAt: Timestamp.fromDate(mockScheduledPost.createdAt),
            updatedAt: Timestamp.fromDate(mockScheduledPost.updatedAt),
            scheduledFor: Timestamp.fromDate(mockScheduledPost.scheduledFor)
          })
        }))
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const posts = await service.getUserScheduledPosts(mockUserId, {
        limit: 10
      });

      expect(posts.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getDuePosts', () => {
    it('should retrieve posts due for publishing', async () => {
      const now = new Date('2025-12-01T10:30:00Z');
      const mockQuerySnap = {
        empty: false,
        docs: [
          {
            id: mockPostId,
            data: () => ({
              ...mockScheduledPost,
              scheduledFor: Timestamp.fromDate(new Date('2025-12-01T10:00:00Z')),
              createdAt: Timestamp.fromDate(mockScheduledPost.createdAt),
              updatedAt: Timestamp.fromDate(mockScheduledPost.updatedAt)
            })
          }
        ]
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const posts = await service.getDuePosts(now);

      expect(posts).toHaveLength(1);
      expect(posts[0].status).toBe('scheduled');
    });

    it('should only return scheduled posts', async () => {
      const mockQuerySnap = {
        empty: false,
        docs: [
          {
            id: 'post_1',
            data: () => ({
              ...mockScheduledPost,
              id: 'post_1',
              status: 'scheduled',
              scheduledFor: Timestamp.fromDate(new Date('2025-12-01T09:00:00Z')),
              createdAt: Timestamp.fromDate(mockScheduledPost.createdAt),
              updatedAt: Timestamp.fromDate(mockScheduledPost.updatedAt)
            })
          },
          {
            id: 'post_2',
            data: () => ({
              ...mockScheduledPost,
              id: 'post_2',
              status: 'published',
              scheduledFor: Timestamp.fromDate(new Date('2025-12-01T09:00:00Z')),
              createdAt: Timestamp.fromDate(mockScheduledPost.createdAt),
              updatedAt: Timestamp.fromDate(mockScheduledPost.updatedAt)
            })
          }
        ]
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const posts = await service.getDuePosts(new Date('2025-12-01T10:00:00Z'));

      // Should only return scheduled post
      expect(posts.every(p => p.status === 'scheduled')).toBe(true);
    });

    it('should limit batch size', async () => {
      const mockQuerySnap = {
        empty: false,
        docs: Array(100).fill(null).map((_, i) => ({
          id: `post_${i}`,
          data: () => ({
            ...mockScheduledPost,
            id: `post_${i}`,
            scheduledFor: Timestamp.fromDate(new Date('2025-12-01T09:00:00Z')),
            createdAt: Timestamp.fromDate(mockScheduledPost.createdAt),
            updatedAt: Timestamp.fromDate(mockScheduledPost.updatedAt)
          })
        }))
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const posts = await service.getDuePosts(new Date('2025-12-01T10:00:00Z'));

      // Should be limited to batch size (50 in implementation)
      expect(posts.length).toBeLessThanOrEqual(50);
    });
  });

  describe('updateScheduledPost', () => {
    it('should update post with new data', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await service.updateScheduledPost(mockPostId, {
        post: {
          ...mockPost,
          content: 'Updated content'
        },
        notes: 'Updated notes'
      });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          post: expect.objectContaining({
            content: 'Updated content'
          }),
          notes: 'Updated notes',
          updatedAt: expect.any(Object)
        })
      );
    });

    it('should update schedule time', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const newSchedule: PostSchedule = {
        publishAt: new Date('2025-12-02T15:00:00Z'),
        timezone: 'America/New_York',
        recurrence: null
      };

      await service.updateScheduledPost(mockPostId, {
        schedule: newSchedule
      });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          schedule: expect.objectContaining({
            publishAt: expect.any(Object),
            timezone: 'America/New_York'
          }),
          scheduledFor: expect.any(Object)
        })
      );
    });

    it('should handle errors during update', async () => {
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        service.updateScheduledPost(mockPostId, { notes: 'test' })
      ).rejects.toThrow('Firestore error');
    });
  });

  describe('markAsPublished', () => {
    it('should mark post as published with results', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const publishResults: PublishResult[] = [
        {
          success: true,
          platformType: PlatformType.INSTAGRAM,
          platformPostId: 'insta_123',
          url: 'https://instagram.com/p/xyz'
        }
      ];

      await service.markAsPublished(mockPostId, publishResults);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'published',
          publishedAt: expect.any(Object),
          platformPostIds: expect.objectContaining({
            [PlatformType.INSTAGRAM]: 'insta_123'
          }),
          publishUrls: expect.objectContaining({
            [PlatformType.INSTAGRAM]: 'https://instagram.com/p/xyz'
          })
        })
      );
    });

    it('should handle multiple platform results', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const publishResults: PublishResult[] = [
        {
          success: true,
          platformType: PlatformType.INSTAGRAM,
          platformPostId: 'insta_123',
          url: 'https://instagram.com/p/xyz'
        },
        {
          success: true,
          platformType: PlatformType.TWITTER,
          platformPostId: 'tweet_456',
          url: 'https://twitter.com/user/status/456'
        }
      ];

      await service.markAsPublished(mockPostId, publishResults);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          platformPostIds: {
            [PlatformType.INSTAGRAM]: 'insta_123',
            [PlatformType.TWITTER]: 'tweet_456'
          },
          publishUrls: {
            [PlatformType.INSTAGRAM]: 'https://instagram.com/p/xyz',
            [PlatformType.TWITTER]: 'https://twitter.com/user/status/456'
          }
        })
      );
    });
  });

  describe('markAsFailed', () => {
    it('should mark post as failed with error', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await service.markAsFailed(mockPostId, 'Network error', false);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'failed',
          lastError: 'Network error',
          lastAttemptAt: expect.any(Object),
          updatedAt: expect.any(Object)
        })
      );
    });

    it('should increment attempts when shouldRetry is true', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: mockPostId,
        data: () => ({
          ...mockScheduledPost,
          attempts: 1,
          createdAt: Timestamp.fromDate(mockScheduledPost.createdAt),
          updatedAt: Timestamp.fromDate(mockScheduledPost.updatedAt),
          scheduledFor: Timestamp.fromDate(mockScheduledPost.scheduledFor)
        })
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await service.markAsFailed(mockPostId, 'Temporary error', true);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          attempts: 2,
          status: 'scheduled' // Should stay scheduled for retry
        })
      );
    });

    it('should mark as failed when max attempts reached', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: mockPostId,
        data: () => ({
          ...mockScheduledPost,
          attempts: 3,
          maxAttempts: 3,
          createdAt: Timestamp.fromDate(mockScheduledPost.createdAt),
          updatedAt: Timestamp.fromDate(mockScheduledPost.updatedAt),
          scheduledFor: Timestamp.fromDate(mockScheduledPost.scheduledFor)
        })
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await service.markAsFailed(mockPostId, 'Persistent error', true);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'failed'
        })
      );
    });
  });

  describe('deleteScheduledPost', () => {
    it('should delete a scheduled post', async () => {
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await service.deleteScheduledPost(mockPostId);

      expect(deleteDoc).toHaveBeenCalledWith(expect.anything());
    });

    it('should handle errors during deletion', async () => {
      (deleteDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(service.deleteScheduledPost(mockPostId)).rejects.toThrow('Firestore error');
    });
  });

  describe('calculateNextOccurrence', () => {
    it('should calculate next daily occurrence', () => {
      const schedule: PostSchedule = {
        publishAt: new Date('2025-12-01T10:00:00Z'),
        timezone: 'America/New_York',
        recurrence: {
          frequency: 'daily',
          interval: 1
        }
      };

      const next = service.calculateNextOccurrence(schedule);

      expect(next).not.toBeNull();
      expect(next?.getDate()).toBe(2); // Next day
    });

    it('should calculate next weekly occurrence', () => {
      const schedule: PostSchedule = {
        publishAt: new Date('2025-12-01T10:00:00Z'), // Monday
        timezone: 'America/New_York',
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          daysOfWeek: [1] // Monday
        }
      };

      const next = service.calculateNextOccurrence(schedule);

      expect(next).not.toBeNull();
      expect(next?.getDate()).toBe(8); // Next Monday
    });

    it('should calculate next monthly occurrence', () => {
      const schedule: PostSchedule = {
        publishAt: new Date('2025-12-01T10:00:00Z'),
        timezone: 'America/New_York',
        recurrence: {
          frequency: 'monthly',
          interval: 1,
          dayOfMonth: 1
        }
      };

      const next = service.calculateNextOccurrence(schedule);

      expect(next).not.toBeNull();
      expect(next?.getMonth()).toBe(0); // January (month 0)
      expect(next?.getDate()).toBe(1);
    });

    it('should return null for non-recurring schedule', () => {
      const schedule: PostSchedule = {
        publishAt: new Date('2025-12-01T10:00:00Z'),
        timezone: 'America/New_York',
        recurrence: null
      };

      const next = service.calculateNextOccurrence(schedule);

      expect(next).toBeNull();
    });

    it('should respect custom intervals', () => {
      const schedule: PostSchedule = {
        publishAt: new Date('2025-12-01T10:00:00Z'),
        timezone: 'America/New_York',
        recurrence: {
          frequency: 'daily',
          interval: 3 // Every 3 days
        }
      };

      const next = service.calculateNextOccurrence(schedule);

      expect(next).not.toBeNull();
      expect(next?.getDate()).toBe(4); // 3 days later
    });
  });

  describe('createRecurringInstance', () => {
    it('should create next instance for recurring post', async () => {
      const recurringPost: ScheduledPost = {
        ...mockScheduledPost,
        schedule: {
          ...mockSchedule,
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            daysOfWeek: [1]
          }
        }
      };

      const mockDocRef = { id: 'new_post_id' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const newPostId = await service.createRecurringInstance(recurringPost);

      expect(newPostId).toBe('new_post_id');
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: mockUserId,
          organizationId: mockOrgId,
          status: 'scheduled',
          attempts: 0
        })
      );
    });

    it('should return null for non-recurring post', async () => {
      const nonRecurringPost: ScheduledPost = {
        ...mockScheduledPost,
        schedule: {
          ...mockSchedule,
          recurrence: null
        }
      };

      const newPostId = await service.createRecurringInstance(nonRecurringPost);

      expect(newPostId).toBeNull();
      expect(addDoc).not.toHaveBeenCalled();
    });
  });
});

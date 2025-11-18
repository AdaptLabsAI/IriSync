/**
 * Unit Tests: PostAnalyticsService
 *
 * Comprehensive test suite for post analytics service
 */

import { PostAnalyticsService, PostMetrics, AggregatedAnalytics } from '@/lib/features/analytics/PostAnalyticsService';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp
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

// Mock fetch
global.fetch = jest.fn();

describe('PostAnalyticsService', () => {
  let service: PostAnalyticsService;

  const mockPostId = 'post_123';
  const mockUserId = 'user_123';
  const mockOrgId = 'org_456';
  const mockPlatformPostId = 'platform_post_789';
  const mockAccessToken = 'mock_access_token';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PostAnalyticsService();
  });

  describe('fetchPostMetrics', () => {
    it('should fetch and store Instagram metrics', async () => {
      const mockInstagramData = {
        like_count: 150,
        comments_count: 25,
        timestamp: '2025-11-15T10:00:00Z',
        media_type: 'IMAGE',
        permalink: 'https://instagram.com/p/xyz'
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInstagramData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              { name: 'impressions', values: [{ value: 1000 }] },
              { name: 'reach', values: [{ value: 800 }] },
              { name: 'saved', values: [{ value: 10 }] }
            ]
          })
        });

      const mockDocRef = { id: 'metrics_123' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const metrics = await service.fetchPostMetrics(
        mockPostId,
        PlatformType.INSTAGRAM,
        mockPlatformPostId,
        mockUserId,
        mockOrgId,
        mockAccessToken
      );

      expect(metrics).toBeDefined();
      expect(metrics?.likes).toBe(150);
      expect(metrics?.comments).toBe(25);
      expect(metrics?.saves).toBe(10);
      expect(metrics?.impressions).toBe(1000);
      expect(metrics?.reach).toBe(800);
      expect(metrics?.engagement).toBeGreaterThan(0);
      expect(addDoc).toHaveBeenCalled();
    });

    it('should fetch and store Facebook metrics', async () => {
      const mockFacebookData = {
        likes: {
          summary: { total_count: 200 }
        },
        comments: {
          summary: { total_count: 30 }
        },
        shares: {
          count: 15
        },
        created_time: '2025-11-15T10:00:00Z'
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFacebookData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              { name: 'post_impressions', values: [{ value: 2000 }] },
              { name: 'post_engaged_users', values: [{ value: 500 }] }
            ]
          })
        });

      const mockDocRef = { id: 'metrics_124' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const metrics = await service.fetchPostMetrics(
        mockPostId,
        PlatformType.FACEBOOK,
        mockPlatformPostId,
        mockUserId,
        mockOrgId,
        mockAccessToken
      );

      expect(metrics).toBeDefined();
      expect(metrics?.likes).toBe(200);
      expect(metrics?.comments).toBe(30);
      expect(metrics?.shares).toBe(15);
      expect(metrics?.impressions).toBe(2000);
      expect(metrics?.reach).toBe(500);
    });

    it('should fetch and store Twitter metrics', async () => {
      const mockTwitterData = {
        data: {
          public_metrics: {
            like_count: 100,
            reply_count: 20,
            retweet_count: 50,
            impression_count: 5000
          },
          created_at: '2025-11-15T10:00:00Z'
        }
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTwitterData
      });

      const mockDocRef = { id: 'metrics_125' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const metrics = await service.fetchPostMetrics(
        mockPostId,
        PlatformType.TWITTER,
        mockPlatformPostId,
        mockUserId,
        mockOrgId,
        mockAccessToken
      );

      expect(metrics).toBeDefined();
      expect(metrics?.likes).toBe(100);
      expect(metrics?.comments).toBe(20);
      expect(metrics?.retweets).toBe(50);
      expect(metrics?.impressions).toBe(5000);
      expect(metrics?.reach).toBe(5000);
    });

    it('should handle platform API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized'
      });

      const metrics = await service.fetchPostMetrics(
        mockPostId,
        PlatformType.INSTAGRAM,
        mockPlatformPostId,
        mockUserId,
        mockOrgId,
        mockAccessToken
      );

      expect(metrics).toBeNull();
    });

    it('should calculate engagement rate correctly', async () => {
      const mockData = {
        like_count: 100,
        comments_count: 50,
        timestamp: '2025-11-15T10:00:00Z',
        media_type: 'IMAGE'
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              { name: 'impressions', values: [{ value: 1000 }] },
              { name: 'reach', values: [{ value: 500 }] },
              { name: 'saved', values: [{ value: 10 }] }
            ]
          })
        });

      const mockDocRef = { id: 'metrics_126' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const metrics = await service.fetchPostMetrics(
        mockPostId,
        PlatformType.INSTAGRAM,
        mockPlatformPostId,
        mockUserId,
        mockOrgId,
        mockAccessToken
      );

      // Total engagement = 100 likes + 50 comments + 10 saves = 160
      // Engagement rate = (160 / 500 reach) * 100 = 32%
      expect(metrics?.engagement).toBe(160);
      expect(metrics?.engagementRate).toBeCloseTo(32, 1);
    });
  });

  describe('getPostMetricsHistory', () => {
    it('should retrieve metrics history for a post', async () => {
      const mockMetrics = [
        {
          postId: mockPostId,
          likes: 100,
          comments: 20,
          shares: 5,
          engagement: 125,
          engagementRate: 25,
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-15'))
        },
        {
          postId: mockPostId,
          likes: 150,
          comments: 25,
          shares: 10,
          engagement: 185,
          engagementRate: 30,
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-15'))
        }
      ];

      const mockQuerySnap = {
        docs: mockMetrics.map((data, index) => ({
          id: `metrics_${index}`,
          data: () => data
        }))
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const history = await service.getPostMetricsHistory(mockPostId);

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('metrics_0');
      expect(history[1].likes).toBe(150);
    });

    it('should return empty array if no metrics found', async () => {
      const mockQuerySnap = {
        docs: []
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const history = await service.getPostMetricsHistory(mockPostId);

      expect(history).toHaveLength(0);
    });
  });

  describe('getAggregatedAnalytics', () => {
    it('should calculate aggregated analytics correctly', async () => {
      const mockMetrics = [
        {
          postId: 'post_1',
          userId: mockUserId,
          platformType: PlatformType.INSTAGRAM,
          likes: 100,
          comments: 20,
          shares: 5,
          engagement: 125,
          engagementRate: 25,
          reach: 500,
          impressions: 600,
          contentType: 'image',
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-15'))
        },
        {
          postId: 'post_2',
          userId: mockUserId,
          platformType: PlatformType.TWITTER,
          likes: 50,
          comments: 10,
          shares: 15,
          engagement: 75,
          engagementRate: 30,
          reach: 250,
          impressions: 300,
          contentType: 'text',
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-15'))
        }
      ];

      const mockQuerySnap = {
        docs: mockMetrics.map((data, index) => ({
          id: `metrics_${index}`,
          data: () => data
        }))
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const analytics = await service.getAggregatedAnalytics(mockUserId);

      expect(analytics.totalPosts).toBe(2);
      expect(analytics.totalEngagement).toBe(200); // 125 + 75
      expect(analytics.totalReach).toBe(750); // 500 + 250
      expect(analytics.totalImpressions).toBe(900); // 600 + 300
      expect(analytics.avgEngagementRate).toBeCloseTo(27.5, 1); // (25 + 30) / 2
      expect(analytics.topPerformingPost?.postId).toBe('post_1');
      expect(analytics.worstPerformingPost?.postId).toBe('post_2');
    });

    it('should breakdown analytics by platform', async () => {
      const mockMetrics = [
        {
          postId: 'post_1',
          userId: mockUserId,
          platformType: PlatformType.INSTAGRAM,
          likes: 100,
          engagement: 125,
          engagementRate: 25,
          reach: 500,
          impressions: 600,
          contentType: 'image',
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-15'))
        },
        {
          postId: 'post_2',
          userId: mockUserId,
          platformType: PlatformType.INSTAGRAM,
          likes: 75,
          engagement: 100,
          engagementRate: 20,
          reach: 500,
          impressions: 600,
          contentType: 'image',
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-15'))
        },
        {
          postId: 'post_3',
          userId: mockUserId,
          platformType: PlatformType.TWITTER,
          likes: 50,
          engagement: 75,
          engagementRate: 30,
          reach: 250,
          impressions: 300,
          contentType: 'text',
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-15'))
        }
      ];

      const mockQuerySnap = {
        docs: mockMetrics.map((data, index) => ({
          id: `metrics_${index}`,
          data: () => data
        }))
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const analytics = await service.getAggregatedAnalytics(mockUserId);

      expect(analytics.byPlatform[PlatformType.INSTAGRAM]).toBeDefined();
      expect(analytics.byPlatform[PlatformType.INSTAGRAM].posts).toBe(2);
      expect(analytics.byPlatform[PlatformType.INSTAGRAM].engagement).toBe(225);
      expect(analytics.byPlatform[PlatformType.INSTAGRAM].avgEngagementRate).toBeCloseTo(22.5, 1);

      expect(analytics.byPlatform[PlatformType.TWITTER]).toBeDefined();
      expect(analytics.byPlatform[PlatformType.TWITTER].posts).toBe(1);
      expect(analytics.byPlatform[PlatformType.TWITTER].engagement).toBe(75);
    });

    it('should breakdown analytics by content type', async () => {
      const mockMetrics = [
        {
          postId: 'post_1',
          userId: mockUserId,
          platformType: PlatformType.INSTAGRAM,
          engagement: 150,
          engagementRate: 30,
          reach: 500,
          impressions: 600,
          contentType: 'image',
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-15'))
        },
        {
          postId: 'post_2',
          userId: mockUserId,
          platformType: PlatformType.INSTAGRAM,
          engagement: 200,
          engagementRate: 40,
          reach: 500,
          impressions: 600,
          contentType: 'video',
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-15'))
        }
      ];

      const mockQuerySnap = {
        docs: mockMetrics.map((data, index) => ({
          id: `metrics_${index}`,
          data: () => data
        }))
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const analytics = await service.getAggregatedAnalytics(mockUserId);

      expect(analytics.byContentType['image']).toBeDefined();
      expect(analytics.byContentType['image'].posts).toBe(1);
      expect(analytics.byContentType['image'].engagement).toBe(150);

      expect(analytics.byContentType['video']).toBeDefined();
      expect(analytics.byContentType['video'].posts).toBe(1);
      expect(analytics.byContentType['video'].engagement).toBe(200);
    });

    it('should create time series data', async () => {
      const mockMetrics = [
        {
          postId: 'post_1',
          userId: mockUserId,
          platformType: PlatformType.INSTAGRAM,
          engagement: 100,
          reach: 500,
          impressions: 600,
          contentType: 'image',
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-15'))
        },
        {
          postId: 'post_2',
          userId: mockUserId,
          platformType: PlatformType.INSTAGRAM,
          engagement: 150,
          reach: 600,
          impressions: 700,
          contentType: 'image',
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-16'))
        }
      ];

      const mockQuerySnap = {
        docs: mockMetrics.map((data, index) => ({
          id: `metrics_${index}`,
          data: () => data
        }))
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const analytics = await service.getAggregatedAnalytics(mockUserId);

      expect(analytics.timeSeries).toHaveLength(2);
      expect(analytics.timeSeries[0].posts).toBe(1);
      expect(analytics.timeSeries[1].posts).toBe(1);
    });

    it('should filter by platform type', async () => {
      const mockMetrics = [
        {
          postId: 'post_1',
          userId: mockUserId,
          platformType: PlatformType.INSTAGRAM,
          engagement: 100,
          reach: 500,
          impressions: 600,
          contentType: 'image',
          fetchedAt: Timestamp.now(),
          publishedAt: Timestamp.fromDate(new Date('2025-11-15'))
        }
      ];

      const mockQuerySnap = {
        docs: mockMetrics.map((data, index) => ({
          id: `metrics_${index}`,
          data: () => data
        }))
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const analytics = await service.getAggregatedAnalytics(mockUserId, {
        platformType: PlatformType.INSTAGRAM
      });

      expect(analytics.totalPosts).toBe(1);
      expect(query).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('should handle empty results', async () => {
      const mockQuerySnap = {
        docs: []
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnap);

      const analytics = await service.getAggregatedAnalytics(mockUserId);

      expect(analytics.totalPosts).toBe(0);
      expect(analytics.totalEngagement).toBe(0);
      expect(analytics.avgEngagementRate).toBe(0);
      expect(analytics.topPerformingPost).toBeUndefined();
    });
  });
});

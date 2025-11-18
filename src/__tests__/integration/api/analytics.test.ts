/**
 * Integration Tests: Analytics API
 *
 * Tests for post analytics endpoints:
 * - GET /api/analytics/posts
 * - GET /api/analytics/posts/[id]
 * - POST /api/analytics/posts/[id]
 */

import { GET as getAggregated } from '@/app/api/analytics/posts/route';
import { GET as getPostAnalytics, POST as fetchMetrics } from '@/app/api/analytics/posts/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { postAnalyticsService } from '@/lib/features/analytics/PostAnalyticsService';
import { metricsFetcher } from '@/lib/features/analytics/MetricsFetcher';
import { scheduledPostService } from '@/lib/features/scheduling/ScheduledPostService';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/features/analytics/PostAnalyticsService');
jest.mock('@/lib/features/analytics/MetricsFetcher');
jest.mock('@/lib/features/scheduling/ScheduledPostService');
jest.mock('@/lib/core/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Analytics API Integration Tests', () => {
  const mockUserId = 'user_123';
  const mockPostId = 'post_789';

  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User'
    }
  };

  const mockMetrics = {
    id: 'metrics_123',
    postId: mockPostId,
    userId: mockUserId,
    organizationId: 'org_456',
    platformType: PlatformType.INSTAGRAM,
    platformPostId: 'insta_123',
    likes: 150,
    comments: 25,
    shares: 10,
    saves: 5,
    impressions: 1000,
    reach: 800,
    engagement: 190,
    engagementRate: 23.75,
    publishedAt: new Date('2025-11-15'),
    fetchedAt: new Date(),
    contentType: 'image' as const,
    hasHashtags: true,
    hashtagCount: 5,
    hasMentions: false,
    mentionCount: 0
  };

  const mockScheduledPost = {
    id: mockPostId,
    userId: mockUserId,
    organizationId: 'org_456',
    status: 'published',
    post: {
      content: 'Test post',
      platformType: PlatformType.INSTAGRAM
    },
    publishedAt: new Date('2025-11-15')
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/posts', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analytics/posts');

      const response = await getAggregated(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return aggregated analytics', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const mockAggregated = {
        totalPosts: 5,
        totalEngagement: 500,
        totalReach: 5000,
        totalImpressions: 6000,
        avgEngagementRate: 25.5,
        topPerformingPost: mockMetrics,
        worstPerformingPost: mockMetrics,
        byPlatform: {
          [PlatformType.INSTAGRAM]: {
            posts: 3,
            engagement: 300,
            reach: 3000,
            avgEngagementRate: 26
          },
          [PlatformType.TWITTER]: {
            posts: 2,
            engagement: 200,
            reach: 2000,
            avgEngagementRate: 25
          }
        },
        byContentType: {
          image: { posts: 3, engagement: 400, avgEngagementRate: 27 },
          video: { posts: 2, engagement: 100, avgEngagementRate: 22 }
        },
        timeSeries: [
          {
            date: new Date('2025-11-15'),
            engagement: 500,
            reach: 5000,
            posts: 5
          }
        ]
      };

      (postAnalyticsService.getAggregatedAnalytics as jest.Mock).mockResolvedValue(mockAggregated);

      const request = new NextRequest('http://localhost:3000/api/analytics/posts');

      const response = await getAggregated(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analytics.totalPosts).toBe(5);
      expect(data.analytics.totalEngagement).toBe(500);
      expect(data.analytics.avgEngagementRate).toBe(25.5);
    });

    it('should filter by platform', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const mockAggregated = {
        totalPosts: 3,
        totalEngagement: 300,
        totalReach: 3000,
        totalImpressions: 3500,
        avgEngagementRate: 26,
        byPlatform: {},
        byContentType: {},
        timeSeries: []
      };

      (postAnalyticsService.getAggregatedAnalytics as jest.Mock).mockResolvedValue(mockAggregated);

      const request = new NextRequest('http://localhost:3000/api/analytics/posts?platform=instagram');

      const response = await getAggregated(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(postAnalyticsService.getAggregatedAnalytics).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          platformType: PlatformType.INSTAGRAM
        })
      );
      expect(data.filters.platform).toBe('instagram');
    });

    it('should filter by date range', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const mockAggregated = {
        totalPosts: 2,
        totalEngagement: 200,
        totalReach: 2000,
        totalImpressions: 2500,
        avgEngagementRate: 24,
        byPlatform: {},
        byContentType: {},
        timeSeries: []
      };

      (postAnalyticsService.getAggregatedAnalytics as jest.Mock).mockResolvedValue(mockAggregated);

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/posts?startDate=2025-11-01&endDate=2025-11-30'
      );

      const response = await getAggregated(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(postAnalyticsService.getAggregatedAnalytics).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          startDate: new Date('2025-11-01'),
          endDate: new Date('2025-11-30')
        })
      );
    });

    it('should respect limit parameter', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const mockAggregated = {
        totalPosts: 10,
        totalEngagement: 1000,
        totalReach: 10000,
        totalImpressions: 12000,
        avgEngagementRate: 25,
        byPlatform: {},
        byContentType: {},
        timeSeries: []
      };

      (postAnalyticsService.getAggregatedAnalytics as jest.Mock).mockResolvedValue(mockAggregated);

      const request = new NextRequest('http://localhost:3000/api/analytics/posts?limit=10');

      const response = await getAggregated(request);

      expect(postAnalyticsService.getAggregatedAnalytics).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          limit: 10
        })
      );
    });

    it('should handle service errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (postAnalyticsService.getAggregatedAnalytics as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const request = new NextRequest('http://localhost:3000/api/analytics/posts');

      const response = await getAggregated(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server Error');
    });
  });

  describe('GET /api/analytics/posts/[id]', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/analytics/posts/${mockPostId}`);

      const response = await getPostAnalytics(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return post analytics with metrics', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(mockScheduledPost);
      (postAnalyticsService.getPostMetricsHistory as jest.Mock).mockResolvedValue([
        mockMetrics,
        {
          ...mockMetrics,
          likes: 100,
          engagement: 140,
          fetchedAt: new Date('2025-11-15T10:00:00Z')
        }
      ]);

      const request = new NextRequest(`http://localhost:3000/api/analytics/posts/${mockPostId}`);

      const response = await getPostAnalytics(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasMetrics).toBe(true);
      expect(data.latestMetrics.likes).toBe(150);
      expect(data.growthRate).toBeDefined();
      expect(data.growthRate.likes).toBe(50); // 150 - 100
    });

    it('should return message when no metrics available', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(mockScheduledPost);
      (postAnalyticsService.getPostMetricsHistory as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(`http://localhost:3000/api/analytics/posts/${mockPostId}`);

      const response = await getPostAnalytics(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasMetrics).toBe(false);
      expect(data.latestMetrics).toBeNull();
    });

    it('should verify post ownership', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue({
        ...mockScheduledPost,
        userId: 'different_user'
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/posts/${mockPostId}`);

      const response = await getPostAnalytics(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 for non-existent post', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analytics/posts/nonexistent');

      const response = await getPostAnalytics(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
    });
  });

  describe('POST /api/analytics/posts/[id]', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/analytics/posts/${mockPostId}`, {
        method: 'POST'
      });

      const response = await fetchMetrics(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should manually fetch metrics for a post', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(mockScheduledPost);
      (metricsFetcher.fetchMetricsForPost as jest.Mock).mockResolvedValue(true);
      (postAnalyticsService.getPostMetricsHistory as jest.Mock).mockResolvedValue([mockMetrics]);

      const request = new NextRequest(`http://localhost:3000/api/analytics/posts/${mockPostId}`, {
        method: 'POST'
      });

      const response = await fetchMetrics(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.likes).toBe(150);
    });

    it('should verify post ownership before fetching', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue({
        ...mockScheduledPost,
        userId: 'different_user'
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/posts/${mockPostId}`, {
        method: 'POST'
      });

      const response = await fetchMetrics(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should only fetch metrics for published posts', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue({
        ...mockScheduledPost,
        status: 'scheduled'
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/posts/${mockPostId}`, {
        method: 'POST'
      });

      const response = await fetchMetrics(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('published posts');
    });

    it('should handle fetch failure', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(mockScheduledPost);
      (metricsFetcher.fetchMetricsForPost as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest(`http://localhost:3000/api/analytics/posts/${mockPostId}`, {
        method: 'POST'
      });

      const response = await fetchMetrics(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Fetch Failed');
    });

    it('should return 404 for non-existent post', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analytics/posts/nonexistent', {
        method: 'POST'
      });

      const response = await fetchMetrics(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
    });
  });
});

/**
 * Post Analytics API
 *
 * Endpoints for retrieving analytics for a specific post:
 * - GET: Get post metrics and history
 * - POST: Manually trigger metrics fetch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { postAnalyticsService } from '@/lib/features/analytics/PostAnalyticsService';
import { metricsFetcher } from '@/lib/features/analytics/MetricsFetcher';
import { scheduledPostService } from '@/lib/features/scheduling/ScheduledPostService';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Extended user type
 */
interface ExtendedUser {
  id?: string;
  name?: string | null;
  email?: string | null;
}

/**
 * GET /api/analytics/posts/[id]
 * Get analytics for a specific post
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    const user = session.user as ExtendedUser;
    const userId = user.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid Session', message: 'User ID not found' },
        { status: 400 }
      );
    }

    const postId = params.id;

    // Get scheduled post to verify ownership
    const scheduledPost = await scheduledPostService.getScheduledPost(postId);

    if (!scheduledPost) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Post not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (scheduledPost.userId !== userId) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have access to this post'
        },
        { status: 403 }
      );
    }

    // Get metrics history
    const metricsHistory = await postAnalyticsService.getPostMetricsHistory(postId);

    if (metricsHistory.length === 0) {
      return NextResponse.json({
        success: true,
        postId,
        hasMetrics: false,
        message: 'No metrics available yet. Metrics will be fetched automatically.',
        latestMetrics: null,
        history: []
      });
    }

    // Latest metrics are first in array (ordered by fetchedAt desc)
    const latestMetrics = metricsHistory[0];

    // Calculate growth rate
    let growthRate = null;

    if (metricsHistory.length >= 2) {
      const previousMetrics = metricsHistory[1];

      growthRate = {
        likes: latestMetrics.likes - previousMetrics.likes,
        comments: latestMetrics.comments - previousMetrics.comments,
        shares: latestMetrics.shares - previousMetrics.shares,
        engagement: latestMetrics.engagement - previousMetrics.engagement
      };
    }

    logger.info('Retrieved post analytics', {
      postId,
      userId,
      metricsCount: metricsHistory.length
    });

    return NextResponse.json({
      success: true,
      postId,
      hasMetrics: true,
      latestMetrics,
      history: metricsHistory,
      growthRate,
      stats: {
        totalFetches: metricsHistory.length,
        firstFetch: metricsHistory[metricsHistory.length - 1].fetchedAt,
        lastFetch: latestMetrics.fetchedAt,
        peakEngagement: Math.max(...metricsHistory.map(m => m.engagement)),
        peakReach: Math.max(...metricsHistory.map(m => m.reach))
      }
    });
  } catch (error) {
    logger.error('Failed to get post analytics', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to retrieve post analytics'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/posts/[id]
 * Manually trigger metrics fetch for a post
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    const user = session.user as ExtendedUser;
    const userId = user.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid Session', message: 'User ID not found' },
        { status: 400 }
      );
    }

    const postId = params.id;

    // Get scheduled post to verify ownership
    const scheduledPost = await scheduledPostService.getScheduledPost(postId);

    if (!scheduledPost) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Post not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (scheduledPost.userId !== userId) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have access to this post'
        },
        { status: 403 }
      );
    }

    // Check if post is published
    if (scheduledPost.status !== 'published') {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Can only fetch metrics for published posts'
        },
        { status: 400 }
      );
    }

    logger.info('Manual metrics fetch requested', {
      postId,
      userId
    });

    // Trigger metrics fetch
    const success = await metricsFetcher.fetchMetricsForPost(postId);

    if (success) {
      // Get the newly fetched metrics
      const metricsHistory = await postAnalyticsService.getPostMetricsHistory(postId);
      const latestMetrics = metricsHistory[0];

      return NextResponse.json({
        success: true,
        message: 'Metrics fetched successfully',
        metrics: latestMetrics
      });
    } else {
      return NextResponse.json(
        {
          error: 'Fetch Failed',
          message: 'Failed to fetch metrics from platform'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Failed to fetch post metrics', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to fetch post metrics'
      },
      { status: 500 }
    );
  }
}

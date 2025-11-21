/**
 * Aggregated Analytics API
 *
 * Endpoints for retrieving aggregated analytics across posts:
 * - GET: Get aggregated analytics with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { postAnalyticsService } from '@/lib/features/analytics/PostAnalyticsService';
import { logger } from '@/lib/core/logging/logger';
import { PlatformType, PlatformFilter } from '@/lib/features/platforms/PlatformProvider';

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
 * GET /api/analytics/posts
 * Get aggregated analytics across all posts
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const platformFilter = searchParams.get('platform') as PlatformFilter | null;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const limitParam = searchParams.get('limit');

    // Build options
    const options: any = {};

    if (platformFilter && platformFilter !== 'all') {
      // TypeScript now knows platformFilter is PlatformType here (not 'all')
      options.platformType = platformFilter;
    }

    if (startDateParam) {
      options.startDate = new Date(startDateParam);
    }

    if (endDateParam) {
      options.endDate = new Date(endDateParam);
    }

    if (limitParam) {
      options.limit = parseInt(limitParam);
    }

    logger.info('Fetching aggregated analytics', {
      userId,
      options
    });

    // Get aggregated analytics
    const analytics = await postAnalyticsService.getAggregatedAnalytics(
      userId,
      options
    );

    logger.info('Retrieved aggregated analytics', {
      userId,
      totalPosts: analytics.totalPosts,
      totalEngagement: analytics.totalEngagement
    });

    return NextResponse.json({
      success: true,
      analytics,
      filters: {
        platform: platformFilter || 'all',
        startDate: startDateParam,
        endDate: endDateParam,
        limit: limitParam
      }
    });
  } catch (error) {
    logger.error('Failed to get aggregated analytics', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to retrieve aggregated analytics'
      },
      { status: 500 }
    );
  }
}

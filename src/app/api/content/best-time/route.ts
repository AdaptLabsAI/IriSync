/**
 * Best Time to Post API
 *
 * Endpoints for analytics-based posting time recommendations:
 * - GET: Get best time to post recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { contentGenerationService } from '@/lib/features/content/ContentGenerationService';
import { logger } from '@/lib/core/logging/logger';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';

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
 * GET /api/content/best-time
 * Get best time to post recommendations based on analytics
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
    const platformType = searchParams.get('platform') as PlatformType | null;
    const timezone = searchParams.get('timezone') || 'America/New_York';

    // Validate platform type
    if (!platformType) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Platform type is required' },
        { status: 400 }
      );
    }

    if (!Object.values(PlatformType).includes(platformType)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: `Invalid platform type: ${platformType}` },
        { status: 400 }
      );
    }

    logger.info('Getting best time to post', {
      userId,
      platformType,
      timezone
    });

    // Get recommendations
    const recommendations = await contentGenerationService.getBestTimeToPost(
      userId,
      platformType,
      timezone
    );

    logger.info('Best time recommendations generated', {
      userId,
      recommendationsCount: recommendations.length
    });

    return NextResponse.json({
      success: true,
      recommendations,
      platformType,
      timezone
    });
  } catch (error) {
    logger.error('Failed to get best time to post', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get best time to post recommendations'
      },
      { status: 500 }
    );
  }
}

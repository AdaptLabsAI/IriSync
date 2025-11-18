/**
 * Hashtag Suggestions API
 *
 * Endpoints for AI-powered hashtag suggestions:
 * - POST: Get hashtag suggestions for content
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
 * POST /api/content/hashtags
 * Get AI-powered hashtag suggestions
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { content, platformType, count = 10 } = body;

    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Content is required' },
        { status: 400 }
      );
    }

    if (!platformType) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Platform type is required' },
        { status: 400 }
      );
    }

    // Validate platform type
    if (!Object.values(PlatformType).includes(platformType)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: `Invalid platform type: ${platformType}` },
        { status: 400 }
      );
    }

    // Validate count
    if (count < 1 || count > 30) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Count must be between 1 and 30' },
        { status: 400 }
      );
    }

    logger.info('Getting hashtag suggestions', {
      userId,
      platformType,
      count
    });

    // Get hashtag suggestions
    const suggestions = await contentGenerationService.getHashtagSuggestions(
      content,
      platformType,
      count
    );

    logger.info('Hashtag suggestions generated', {
      userId,
      suggestionsCount: suggestions.length
    });

    return NextResponse.json({
      success: true,
      suggestions
    });
  } catch (error) {
    logger.error('Failed to get hashtag suggestions', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get hashtag suggestions'
      },
      { status: 500 }
    );
  }
}

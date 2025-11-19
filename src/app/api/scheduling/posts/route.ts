/**
 * Scheduled Posts API
 *
 * Endpoints for managing scheduled social media posts:
 * - GET: List user's scheduled posts
 * - POST: Create new scheduled post
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { scheduledPostService } from '@/lib/features/scheduling/ScheduledPostService';
import { logger } from '@/lib/core/logging/logger';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PlatformPost, PostSchedule, PostStatus } from '@/lib/features/platforms/models/content';

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
 * GET /api/scheduling/posts
 * List user's scheduled posts
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
    const status = searchParams.get('status') as PostStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const includePublished = searchParams.get('includePublished') === 'true';

    // Get scheduled posts
    const posts = await scheduledPostService.getUserScheduledPosts(userId, {
      status: status || undefined,
      limit,
      includePublished
    });

    logger.info('Retrieved user scheduled posts', {
      userId,
      count: posts.length,
      status,
      includePublished
    });

    return NextResponse.json({
      success: true,
      posts,
      total: posts.length
    });
  } catch (error) {
    logger.error('Failed to get scheduled posts', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to retrieve scheduled posts'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheduling/posts
 * Create new scheduled post
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

    // Get user's organization
    let organizationId: string | undefined;
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        organizationId = userData.currentOrganizationId || userData.personalOrganizationId;
      }
    } catch (error) {
      logger.warn('Failed to get user organization', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Organization not found' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { post, schedule, tags, notes, maxAttempts } = body;

    // Validate required fields
    if (!post || !schedule) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Both post and schedule are required'
        },
        { status: 400 }
      );
    }

    // Validate post content
    if (!post.content || !post.platformType) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Post must have content and platformType'
        },
        { status: 400 }
      );
    }

    // Validate schedule
    if (!schedule.publishAt || !schedule.timezone) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Schedule must have publishAt and timezone'
        },
        { status: 400 }
      );
    }

    // Parse publishAt as Date
    const publishAt = new Date(schedule.publishAt);
    if (isNaN(publishAt.getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Invalid publishAt date format'
        },
        { status: 400 }
      );
    }

    // Check if scheduled time is in the future
    if (publishAt <= new Date()) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Scheduled time must be in the future'
        },
        { status: 400 }
      );
    }

    // Create scheduled post
    const postId = await scheduledPostService.createScheduledPost(
      userId,
      organizationId,
      post as PlatformPost,
      {
        ...schedule,
        publishAt
      } as PostSchedule,
      {
        tags,
        notes,
        maxAttempts
      }
    );

    logger.info('Scheduled post created', {
      postId,
      userId,
      organizationId,
      scheduledFor: publishAt,
      platform: post.platformType
    });

    return NextResponse.json({
      success: true,
      postId,
      message: 'Post scheduled successfully'
    });
  } catch (error) {
    logger.error('Failed to create scheduled post', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to create scheduled post'
      },
      { status: 500 }
    );
  }
}

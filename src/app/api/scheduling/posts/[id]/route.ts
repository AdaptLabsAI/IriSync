/**
 * Single Scheduled Post API
 *
 * Endpoints for managing a specific scheduled post:
 * - GET: Get scheduled post details
 * - PATCH: Update scheduled post
 * - DELETE: Delete scheduled post
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
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
 * GET /api/scheduling/posts/[id]
 * Get a specific scheduled post
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

    // Get scheduled post
    const scheduledPost = await scheduledPostService.getScheduledPost(postId);

    if (!scheduledPost) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Scheduled post not found' },
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

    logger.info('Retrieved scheduled post', {
      postId,
      userId,
      status: scheduledPost.status
    });

    return NextResponse.json({
      success: true,
      post: scheduledPost
    });
  } catch (error) {
    logger.error('Failed to get scheduled post', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to retrieve scheduled post'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/scheduling/posts/[id]
 * Update scheduled post
 */
export async function PATCH(
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

    // Get scheduled post
    const scheduledPost = await scheduledPostService.getScheduledPost(postId);

    if (!scheduledPost) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Scheduled post not found' },
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

    // Can't update published or failed posts
    if (scheduledPost.status === 'published' || scheduledPost.status === 'failed') {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Cannot update ${scheduledPost.status} posts`
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { post, schedule, status, tags, notes } = body;

    // Validate schedule if provided
    if (schedule?.publishAt) {
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

      if (publishAt <= new Date()) {
        return NextResponse.json(
          {
            error: 'Invalid Request',
            message: 'Scheduled time must be in the future'
          },
          { status: 400 }
        );
      }

      schedule.publishAt = publishAt;
    }

    // Update scheduled post
    await scheduledPostService.updateScheduledPost(postId, {
      post,
      schedule,
      status,
      tags,
      notes
    });

    logger.info('Updated scheduled post', {
      postId,
      userId,
      updates: Object.keys(body)
    });

    return NextResponse.json({
      success: true,
      message: 'Post updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update scheduled post', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to update scheduled post'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scheduling/posts/[id]
 * Delete scheduled post
 */
export async function DELETE(
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

    // Get scheduled post
    const scheduledPost = await scheduledPostService.getScheduledPost(postId);

    if (!scheduledPost) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Scheduled post not found' },
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

    // Can't delete published posts
    if (scheduledPost.status === 'published') {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Cannot delete published posts'
        },
        { status: 400 }
      );
    }

    // Delete scheduled post
    await scheduledPostService.deleteScheduledPost(postId);

    logger.info('Deleted scheduled post', {
      postId,
      userId
    });

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete scheduled post', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to delete scheduled post'
      },
      { status: 500 }
    );
  }
}

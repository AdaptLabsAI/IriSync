import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth/auth-options';
import { logger } from '@/lib/core/logging/logger';
import { database } from '@/lib/core/database';
import { verifyTeamAccess } from '@/lib/features/team/permissions';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * API Handler for content approval workflows
 * This endpoint handles approving, rejecting, and requesting changes to content
 * before it's scheduled for publication
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to access this endpoint' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      contentId, 
      action, 
      organizationId,
      comment,
      scheduledTime,
      platforms
    } = body;

    if (!contentId || !action || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields: contentId, action, and organizationId are required' },
        { status: 400 }
      );
    }

    // Validate action is one of the allowed values
    const allowedActions = ['approve', 'reject', 'request_changes', 'schedule'];
    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${allowedActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Check user has permission in the organization to approve content
    const hasAccess = await verifyTeamAccess(session.user.id, organizationId, ['content:approve']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied - You do not have permission to approve content' },
        { status: 403 }
      );
    }

    // Get the content details
    const content = await database.content.findUnique({
      where: { id: contentId, organizationId }
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found or does not belong to this organization' },
        { status: 404 }
      );
    }

    // Handle different approval actions
    let result;
    switch (action) {
      case 'approve':
        result = await handleApproval(contentId, session.user.id, comment);
        break;
      case 'reject':
        result = await handleRejection(contentId, session.user.id, comment);
        break;
      case 'request_changes':
        result = await handleChangeRequest(contentId, session.user.id, comment);
        break;
      case 'schedule':
        if (!scheduledTime) {
          return NextResponse.json(
            { error: 'scheduledTime is required for the schedule action' },
            { status: 400 }
          );
        }
        result = await handleScheduling(contentId, session.user.id, scheduledTime, platforms);
        break;
    }

    logger.info('Content workflow action processed', {
      contentId,
      action,
      userId: session.user.id,
      organizationId
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in content approval workflow', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { error: 'Failed to process content workflow action' },
      { status: 500 }
    );
  }
}

/**
 * Handle content approval
 */
async function handleApproval(contentId: string, userId: string, comment?: string) {
  // Update content status to approved
  const updatedContent = await database.content.update({
    where: { id: contentId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById: userId,
      approvalComment: comment || null
    }
  });

  // Create activity record
  await database.activity.create({
    data: {
      type: 'CONTENT_APPROVAL',
      userId,
      contentId,
      metadata: {
        comment: comment || 'Content approved'
      }
    }
  });

  // Notify content creator
  await sendContentNotification(
    updatedContent.createdById,
    'Content Approved',
    `Your content "${updatedContent.title}" has been approved.`,
    contentId
  );

  return {
    success: true,
    message: 'Content approved successfully',
    content: updatedContent
  };
}

/**
 * Handle content rejection
 */
async function handleRejection(contentId: string, userId: string, comment?: string) {
  if (!comment) {
    throw new Error('A comment is required when rejecting content');
  }

  // Update content status to rejected
  const updatedContent = await database.content.update({
    where: { id: contentId },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectedById: userId,
      rejectionReason: comment
    }
  });

  // Create activity record
  await database.activity.create({
    data: {
      type: 'CONTENT_REJECTION',
      userId,
      contentId,
      metadata: {
        reason: comment
      }
    }
  });

  // Notify content creator
  await sendContentNotification(
    updatedContent.createdById,
    'Content Rejected',
    `Your content "${updatedContent.title}" has been rejected. Reason: ${comment}`,
    contentId
  );

  return {
    success: true,
    message: 'Content rejected',
    content: updatedContent
  };
}

/**
 * Handle request for content changes
 */
async function handleChangeRequest(contentId: string, userId: string, comment?: string) {
  if (!comment) {
    throw new Error('A comment is required when requesting changes');
  }

  // Update content status to needs changes
  const updatedContent = await database.content.update({
    where: { id: contentId },
    data: {
      status: 'NEEDS_CHANGES',
      reviewedAt: new Date(),
      reviewedById: userId,
      revisionNotes: comment
    }
  });

  // Create activity record
  await database.activity.create({
    data: {
      type: 'CONTENT_CHANGE_REQUEST',
      userId,
      contentId,
      metadata: {
        notes: comment
      }
    }
  });

  // Notify content creator
  await sendContentNotification(
    updatedContent.createdById,
    'Changes Requested',
    `Changes have been requested for "${updatedContent.title}". Notes: ${comment}`,
    contentId
  );

  return {
    success: true,
    message: 'Changes requested',
    content: updatedContent
  };
}

/**
 * Handle content scheduling
 */
async function handleScheduling(contentId: string, userId: string, scheduledTime: string, platforms?: string[]) {
  // Validate scheduled time
  const scheduleDate = new Date(scheduledTime);
  if (isNaN(scheduleDate.getTime()) || scheduleDate < new Date()) {
    throw new Error('Invalid scheduled time - must be a valid future date');
  }

  // Update content with scheduled information
  const updatedContent = await database.content.update({
    where: { id: contentId },
    data: {
      status: 'SCHEDULED',
      scheduledAt: scheduleDate,
      scheduledById: userId,
      scheduledPlatforms: platforms || undefined
    }
  });

  // Create schedule entries for each platform
  if (platforms && platforms.length > 0) {
    for (const platform of platforms) {
      await database.contentSchedule.create({
        data: {
          contentId,
          platform,
          scheduledTime: scheduleDate,
          status: 'PENDING'
        }
      });
    }
  }

  // Create activity record
  await database.activity.create({
    data: {
      type: 'CONTENT_SCHEDULED',
      userId,
      contentId,
      metadata: {
        scheduledTime: scheduleDate.toISOString(),
        platforms: platforms || []
      }
    }
  });

  // Notify content creator
  await sendContentNotification(
    updatedContent.createdById,
    'Content Scheduled',
    `Your content "${updatedContent.title}" has been scheduled for ${scheduleDate.toLocaleString()}.`,
    contentId
  );

  return {
    success: true,
    message: 'Content scheduled successfully',
    content: updatedContent
  };
}

/**
 * Send notification to user about content status change
 */
async function sendContentNotification(
  userId: string,
  title: string,
  message: string,
  contentId: string
) {
  try {
    await database.notification.create({
      data: {
        userId,
        title,
        message,
        type: 'CONTENT',
        linkType: 'CONTENT',
        linkId: contentId,
        isRead: false
      }
    });
  } catch (error) {
    logger.error('Failed to send content notification', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      contentId
    });
  }
} 
/**
 * Single Conversation Management API
 *
 * Endpoints for managing a specific conversation:
 * - GET: Get conversation details and messages
 * - PATCH: Update conversation (e.g., title)
 * - DELETE: Delete specific conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { conversationService } from '@/lib/features/ai/ConversationService';
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
 * GET /api/ai/conversations/[id]
 * Get a specific conversation with its messages
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

    const conversationId = params.id;

    // Get conversation
    const conversation = await conversationService.getConversation(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this conversation' },
        { status: 403 }
      );
    }

    // Get messages
    const searchParams = request.nextUrl.searchParams;
    const maxMessages = parseInt(searchParams.get('maxMessages') || '50');
    const messages = await conversationService.getConversationHistory(
      conversationId,
      maxMessages
    );

    logger.info('Retrieved conversation details', {
      userId,
      conversationId,
      messageCount: messages.length
    });

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        messages
      }
    });
  } catch (error) {
    logger.error('Failed to get conversation', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to retrieve conversation'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai/conversations/[id]
 * Update conversation details
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

    const conversationId = params.id;

    // Get conversation
    const conversation = await conversationService.getConversation(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this conversation' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title } = body;

    // Update conversation
    if (title !== undefined) {
      await conversationService.updateConversationTitle(conversationId, title);

      logger.info('Updated conversation title', {
        userId,
        conversationId,
        newTitle: title
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update conversation', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to update conversation'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/conversations/[id]
 * Permanently delete a conversation
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

    const conversationId = params.id;

    // Get conversation
    const conversation = await conversationService.getConversation(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this conversation' },
        { status: 403 }
      );
    }

    // Delete conversation
    await conversationService.deleteConversation(conversationId);

    logger.info('Deleted conversation', {
      userId,
      conversationId
    });

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete conversation', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to delete conversation'
      },
      { status: 500 }
    );
  }
}

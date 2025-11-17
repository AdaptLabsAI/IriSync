/**
 * Conversation Management API
 *
 * Provides endpoints for managing user conversations:
 * - GET: List user's conversations
 * - POST: Create new conversation
 * - DELETE: Archive conversation (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { conversationService } from '@/lib/features/ai/ConversationService';
import { logger } from '@/lib/core/logging/logger';
import { firestore } from '@/lib/core/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
 * GET /api/ai/conversations
 * List all conversations for the authenticated user
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Get conversations
    const conversations = await conversationService.getUserConversations(userId, limit);

    // Filter out archived if needed
    const filteredConversations = includeArchived
      ? conversations
      : conversations.filter((c) => !c.archived);

    logger.info('Retrieved user conversations', {
      userId,
      count: filteredConversations.length,
      includeArchived
    });

    return NextResponse.json({
      success: true,
      conversations: filteredConversations,
      total: filteredConversations.length
    });
  } catch (error) {
    logger.error('Failed to get conversations', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to retrieve conversations'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/conversations
 * Create a new conversation
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
    const { title } = body;

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

    // Create conversation
    const conversationId = await conversationService.createConversation(
      userId,
      organizationId,
      title || undefined
    );

    logger.info('Created new conversation', {
      userId,
      conversationId,
      title: title || 'New Conversation'
    });

    return NextResponse.json({
      success: true,
      conversationId,
      message: 'Conversation created successfully'
    });
  } catch (error) {
    logger.error('Failed to create conversation', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to create conversation'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/conversations?id={conversationId}
 * Archive a conversation (soft delete)
 */
export async function DELETE(request: NextRequest) {
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

    // Get conversation ID from query
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('id');
    const hardDelete = searchParams.get('hardDelete') === 'true';

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Verify conversation belongs to user
    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this conversation' },
        { status: 403 }
      );
    }

    // Archive or delete
    if (hardDelete) {
      await conversationService.deleteConversation(conversationId);
      logger.info('Hard deleted conversation', { userId, conversationId });
    } else {
      await conversationService.archiveConversation(conversationId);
      logger.info('Archived conversation', { userId, conversationId });
    }

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Conversation deleted' : 'Conversation archived'
    });
  } catch (error) {
    logger.error('Failed to delete/archive conversation', {
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

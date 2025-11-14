import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth/nextauth';
import { SocialInboxController } from '@/lib/features/content/SocialInboxController';
import { MessageStatus, MessagePriority, MessageType } from '@/lib/features/content/SocialInboxService';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * GET /api/content/inbox
 * Get unified inbox messages with advanced filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const filter = {
      platformTypes: searchParams.get('platforms')?.split(',') as PlatformType[] || undefined,
      accountIds: searchParams.get('accounts')?.split(',') || undefined,
      messageTypes: searchParams.get('types')?.split(',') as MessageType[] || undefined,
      statuses: searchParams.get('statuses')?.split(',') as MessageStatus[] || undefined,
      priorities: searchParams.get('priorities')?.split(',') as MessagePriority[] || undefined,
      labels: searchParams.get('labels')?.split(',') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      search: searchParams.get('search') || undefined,
      sentiment: searchParams.get('sentiment')?.split(',') as ('positive' | 'neutral' | 'negative')[] || undefined,
      verified: searchParams.get('verified') ? searchParams.get('verified') === 'true' : undefined,
      minFollowerCount: searchParams.get('minFollowerCount') ? parseInt(searchParams.get('minFollowerCount')!) : undefined,
      dateRange: searchParams.get('startDate') && searchParams.get('endDate') ? {
        start: new Date(searchParams.get('startDate')!),
        end: new Date(searchParams.get('endDate')!)
      } : undefined
    };

    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor') || undefined;

    const controller = new SocialInboxController();
    const result = await controller.getUnifiedInboxMessages(
      session.user.id,
      filter,
      limit,
      cursor
    );

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error fetching unified inbox messages', { error });
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST /api/content/inbox
 * Perform inbox actions (sync, reply, bulk actions)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    const controller = new SocialInboxController();

    switch (action) {
      case 'sync_all':
        {
          const result = await controller.syncAllPlatforms(
            session.user.id,
            params.organizationId
          );
          
          return NextResponse.json({
            success: true,
            message: 'All platforms synced successfully',
            data: result
          });
        }

      case 'reply':
        {
          const { messageId, content } = params;
          
          if (!messageId || !content) {
            return NextResponse.json({
              error: 'messageId and content are required for reply action'
            }, { status: 400 });
          }

          const reply = await controller.replyToMessage(
            messageId,
            content,
            session.user.id
          );

          return NextResponse.json({
            success: true,
            message: 'Reply sent successfully',
            data: reply
          });
        }

      case 'bulk_action':
        {
          const { messageIds, bulkAction, bulkParams } = params;
          
          if (!messageIds || !Array.isArray(messageIds) || !bulkAction) {
            return NextResponse.json({
              error: 'messageIds array and bulkAction are required'
            }, { status: 400 });
          }

          const result = await controller.bulkAction(
            messageIds,
            bulkAction,
            bulkParams
          );

          return NextResponse.json({
            success: true,
            message: `Bulk action ${bulkAction} completed`,
            data: result
          });
        }

      case 'start_background_sync':
        {
          const { intervalMinutes = 5 } = params;
          
          await controller.startUnifiedBackgroundSync(
            session.user.id,
            intervalMinutes
          );

          return NextResponse.json({
            success: true,
            message: 'Background sync started successfully'
          });
        }

      default:
        return NextResponse.json({
          error: 'Invalid action specified'
        }, { status: 400 });
    }

  } catch (error) {
    logger.error('Error performing inbox action', { error });
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
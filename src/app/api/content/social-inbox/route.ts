import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/auth-options';
import unifiedSocialInboxManager, { SocialAccount, SyncConfiguration } from '../../../../lib/features/content/UnifiedSocialInboxManager';
import { SocialInboxService, InboxFilter, MessageStatus, MessagePriority } from '../../../../lib/features/content/SocialInboxService';
import { PlatformType } from '../../../../lib/features/platforms/PlatformProvider';
import { logger } from '../../../../lib/core/logging/logger';
import { firestore } from '../../../../lib/core/firebase/client';
import { collection, query, where, getDocs } from 'firebase/firestore';

const socialInboxService = new SocialInboxService();

/**
 * GET /api/content/social-inbox
 * Get inbox messages with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor') || undefined;
    const platformTypes = searchParams.get('platforms')?.split(',') as PlatformType[] || undefined;
    const statuses = searchParams.get('statuses')?.split(',') as MessageStatus[] || undefined;
    const priorities = searchParams.get('priorities')?.split(',') as MessagePriority[] || undefined;
    const search = searchParams.get('search') || undefined;
    const assignedTo = searchParams.get('assignedTo') || undefined;
    
    // Date range parsing
    let dateRange;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    // Build filter
    const filter: InboxFilter = {
      platformTypes,
      statuses,
      priorities,
      search,
      assignedTo,
      dateRange
    };

    // Get messages
    const result = await socialInboxService.getMessages(
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
    logger.error('Error fetching inbox messages', { error });
    return NextResponse.json(
      { error: 'Failed to fetch inbox messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content/social-inbox
 * Handle various inbox operations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'sync_all':
        return await handleSyncAll(session.user.id, params);
      
      case 'start_background_sync':
        return await handleStartBackgroundSync(session.user.id, params);
      
      case 'stop_background_sync':
        return await handleStopBackgroundSync();
      
      case 'reply':
        return await handleReply(session.user.id, params);
      
      case 'update_status':
        return await handleUpdateStatus(params);
      
      case 'bulk_update_status':
        return await handleBulkUpdateStatus(params);
      
      case 'assign_message':
        return await handleAssignMessage(params);
      
      case 'update_priority':
        return await handleUpdatePriority(params);
      
      case 'add_notes':
        return await handleAddNotes(params);
      
      case 'get_stats':
        return await handleGetStats(session.user.id);
      
      case 'process_webhook':
        return await handleProcessWebhook(params);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Error handling inbox operation', { error });
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Action handlers

async function handleSyncAll(userId: string, params: any) {
  try {
    const { organizationId } = params;
    const orgId = organizationId || await getUserOrganizationId(userId);
    
    if (!orgId) {
      return NextResponse.json({
        success: false,
        error: 'Organization ID required for social inbox operations'
      }, { status: 400 });
    }

    // Get connected accounts for the ORGANIZATION
    const accounts = await getConnectedAccounts(orgId);
    
    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalMessages: 0,
          messagesByPlatform: {},
          errors: [],
          message: 'No connected accounts found for this organization'
        }
      });
    }

    // Initialize the manager
    await unifiedSocialInboxManager.initialize(accounts);
    
    // Perform sync
    const result = await unifiedSocialInboxManager.syncAllPlatforms(accounts);
    
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        organizationId: orgId
      }
    });

  } catch (error) {
    logger.error('Error in sync all operation', { error });
    return NextResponse.json(
      { error: 'Failed to sync platforms' },
      { status: 500 }
    );
  }
}

async function handleStartBackgroundSync(userId: string, params: any) {
  try {
    const { config, organizationId } = params;
    const orgId = organizationId || await getUserOrganizationId(userId);
    
    if (!orgId) {
      return NextResponse.json({
        success: false,
        error: 'Organization ID required for social inbox operations'
      }, { status: 400 });
    }
    
    // Get connected accounts for the ORGANIZATION
    const accounts = await getConnectedAccounts(orgId);
    
    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No connected accounts found for this organization'
      });
    }

    // Initialize the manager
    await unifiedSocialInboxManager.initialize(accounts);
    
    // Start background sync
    const syncConfig: SyncConfiguration = {
      intervalMinutes: config?.intervalMinutes || 15,
      enabledPlatforms: config?.enabledPlatforms || Object.values(PlatformType),
      syncTypes: config?.syncTypes || {
        comments: true,
        mentions: true,
        directMessages: true,
        notifications: true
      }
    };
    
    await unifiedSocialInboxManager.startBackgroundSync(accounts, syncConfig);
    
    return NextResponse.json({
      success: true,
      message: 'Background sync started',
      config: syncConfig,
      organizationId: orgId
    });

  } catch (error) {
    logger.error('Error starting background sync', { error });
    return NextResponse.json(
      { error: 'Failed to start background sync' },
      { status: 500 }
    );
  }
}

async function handleStopBackgroundSync() {
  try {
    unifiedSocialInboxManager.stopBackgroundSync();
    
    return NextResponse.json({
      success: true,
      message: 'Background sync stopped'
    });

  } catch (error) {
    logger.error('Error stopping background sync', { error });
    return NextResponse.json(
      { error: 'Failed to stop background sync' },
      { status: 500 }
    );
  }
}

async function handleReply(userId: string, params: any) {
  try {
    const { messageId, content } = params;
    
    if (!messageId || !content) {
      return NextResponse.json(
        { error: 'messageId and content are required' },
        { status: 400 }
      );
    }

    const result = await unifiedSocialInboxManager.replyToMessage(
      messageId,
      content,
      userId
    );
    
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error replying to message', { error });
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}

async function handleUpdateStatus(params: any) {
  try {
    const { messageId, status } = params;
    
    if (!messageId || !status) {
      return NextResponse.json(
        { error: 'messageId and status are required' },
        { status: 400 }
      );
    }

    const result = await socialInboxService.updateMessageStatus(messageId, status);
    
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error updating message status', { error });
    return NextResponse.json(
      { error: 'Failed to update message status' },
      { status: 500 }
    );
  }
}

async function handleBulkUpdateStatus(params: any) {
  try {
    const { messageIds, status } = params;
    
    if (!messageIds || !Array.isArray(messageIds) || !status) {
      return NextResponse.json(
        { error: 'messageIds (array) and status are required' },
        { status: 400 }
      );
    }

    const result = await socialInboxService.bulkUpdateStatus(messageIds, status);
    
    return NextResponse.json({
      success: true,
      data: { updatedCount: result }
    });

  } catch (error) {
    logger.error('Error bulk updating message status', { error });
    return NextResponse.json(
      { error: 'Failed to bulk update message status' },
      { status: 500 }
    );
  }
}

async function handleAssignMessage(params: any) {
  try {
    const { messageId, assigneeId } = params;
    
    if (!messageId || !assigneeId) {
      return NextResponse.json(
        { error: 'messageId and assigneeId are required' },
        { status: 400 }
      );
    }

    const result = await socialInboxService.assignMessage(messageId, assigneeId);
    
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error assigning message', { error });
    return NextResponse.json(
      { error: 'Failed to assign message' },
      { status: 500 }
    );
  }
}

async function handleUpdatePriority(params: any) {
  try {
    const { messageId, priority } = params;
    
    if (!messageId || !priority) {
      return NextResponse.json(
        { error: 'messageId and priority are required' },
        { status: 400 }
      );
    }

    const result = await socialInboxService.updatePriority(messageId, priority);
    
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error updating message priority', { error });
    return NextResponse.json(
      { error: 'Failed to update message priority' },
      { status: 500 }
    );
  }
}

async function handleAddNotes(params: any) {
  try {
    const { messageId, notes } = params;
    
    if (!messageId || !notes) {
      return NextResponse.json(
        { error: 'messageId and notes are required' },
        { status: 400 }
      );
    }

    const result = await socialInboxService.addNotes(messageId, notes);
    
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error adding notes to message', { error });
    return NextResponse.json(
      { error: 'Failed to add notes to message' },
      { status: 500 }
    );
  }
}

async function handleGetStats(userId: string) {
  try {
    const organizationId = await getUserOrganizationId(userId);
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'Organization ID required for stats'
      }, { status: 400 });
    }

    const stats = await unifiedSocialInboxManager.getUnifiedInboxStats(organizationId);
    
    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        organizationId
      }
    });

  } catch (error) {
    logger.error('Error getting inbox stats', { error });
    return NextResponse.json(
      { error: 'Failed to get inbox stats' },
      { status: 500 }
    );
  }
}

async function handleProcessWebhook(params: any) {
  try {
    const { platformType, event, accountId, userId, organizationId } = params;
    
    if (!platformType || !event || !accountId || !userId) {
      return NextResponse.json(
        { error: 'platformType, event, accountId, and userId are required' },
        { status: 400 }
      );
    }

    const result = await unifiedSocialInboxManager.processWebhookEvent(
      platformType,
      event,
      accountId,
      userId,
      organizationId
    );
    
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error processing webhook event', { error });
    return NextResponse.json(
      { error: 'Failed to process webhook event' },
      { status: 500 }
    );
  }
}

// Helper functions

async function getConnectedAccounts(organizationId: string): Promise<SocialAccount[]> {
  try {
    const accountsQuery = query(
      collection(firestore, 'connectedAccounts'),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true)
    );
    
    const accountsSnapshot = await getDocs(accountsQuery);
    const accounts: SocialAccount[] = [];
    
    accountsSnapshot.forEach(doc => {
      const data = doc.data();
      accounts.push({
        userId: data.userId,
        accountId: doc.id,
        organizationId: data.organizationId,
        platformType: data.platformType,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        additionalData: data.additionalData,
        isActive: data.isActive
      });
    });
    
    return accounts;
  } catch (error) {
    logger.error('Error fetching connected accounts', { error, organizationId });
    return [];
  }
}

async function getUserOrganizationId(userId: string): Promise<string | null> {
  try {
    const { firestore } = await import('../../../../lib/core/firebase/client');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.organizationId || null;
    }
    
    return null;
  } catch (error) {
    logger.error('Error fetching user organization ID', { error, userId });
    return null;
  }
} 
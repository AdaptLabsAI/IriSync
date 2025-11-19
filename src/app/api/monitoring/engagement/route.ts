/**
 * Engagement Items API
 * GET /api/monitoring/engagement - Get engagement items (comments, DMs)
 * POST /api/monitoring/engagement - Fetch new engagement from platforms
 * PATCH /api/monitoring/engagement - Update engagement item (mark read, star, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { engagementService } from '@/lib/features/monitoring/EngagementService';

/**
 * GET /api/monitoring/engagement
 * Get engagement items with filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's organization
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User Not Found', message: 'User document not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Organization not found' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const platforms = searchParams.get('platforms')?.split(',');
    const type = searchParams.get('type') as 'comment' | 'direct_message' | 'reply' | undefined;
    const isRead = searchParams.get('isRead') === 'true' ? true : searchParams.get('isRead') === 'false' ? false : undefined;
    const isStarred = searchParams.get('isStarred') === 'true' ? true : undefined;
    const requiresResponse = searchParams.get('requiresResponse') === 'true' ? true : undefined;
    const priority = searchParams.get('priority') as 'low' | 'medium' | 'high' | 'critical' | undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    // Get engagement items
    const items = await engagementService.getEngagementItems(userId, organizationId, {
      platforms: platforms as any,
      type,
      isRead,
      isStarred,
      requiresResponse,
      priority,
      limit,
    });

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    });
  } catch (error) {
    console.error('Error getting engagement items:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get engagement items',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/engagement
 * Fetch new engagement items from platforms
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's organization
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User Not Found', message: 'User document not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Organization not found' },
        { status: 400 }
      );
    }

    // Get platform connections
    const connectionsDoc = await getDoc(doc(firestore, 'platformConnections', userId));
    const platformConnections = connectionsDoc.exists() ? connectionsDoc.data().connections || [] : [];

    if (platformConnections.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No platform connections found' },
        { status: 400 }
      );
    }

    // Fetch engagement from all platforms
    const { items, errors } = await engagementService.fetchAllEngagement(
      userId,
      organizationId,
      platformConnections
    );

    // Analyze sentiment for new items
    if (items.length > 0) {
      await engagementService.analyzeEngagementSentiment(items);

      // Save items to Firestore
      const saveResult = await engagementService.saveEngagementItems(items);

      return NextResponse.json({
        success: true,
        fetched: items.length,
        saved: saveResult.saved,
        errors: [...errors, ...saveResult.errors],
      });
    }

    return NextResponse.json({
      success: true,
      fetched: 0,
      saved: 0,
      errors,
    });
  } catch (error) {
    console.error('Error fetching engagement:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to fetch engagement items',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/monitoring/engagement
 * Update engagement item status
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { itemId, action, value } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'itemId is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'action is required' },
        { status: 400 }
      );
    }

    // Perform action
    switch (action) {
      case 'markRead':
        await engagementService.markAsRead(itemId);
        break;
      case 'toggleStar':
        await engagementService.toggleStar(itemId, value === true);
        break;
      case 'archive':
        await engagementService.archiveItem(itemId);
        break;
      case 'markSpam':
        await engagementService.markAsSpam(itemId);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid Request', message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Action ${action} completed successfully`,
    });
  } catch (error) {
    console.error('Error updating engagement item:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to update engagement item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

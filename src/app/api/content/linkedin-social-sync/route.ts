import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth/nextauth';
import { LinkedInProvider } from '@/lib/features/platforms/providers/LinkedInProvider';
import { LinkedInSocialInboxAdapter } from '@/lib/features/content/LinkedInSocialInboxAdapter';
import { logger } from '@/lib/core/logging/logger';
import { firestore } from '@/lib/core/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * POST /api/content/linkedin-social-sync
 * Sync LinkedIn social actions (comments, likes) to unified social inbox
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { postUrns, accountId, organizationId, syncType = 'comments' } = body;

    if (!postUrns || !Array.isArray(postUrns)) {
      return NextResponse.json({ 
        error: 'postUrns array is required' 
      }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json({ 
        error: 'accountId is required' 
      }, { status: 400 });
    }

    // Get LinkedIn credentials for this account
    const accountDocRef = doc(firestore, 'connectedAccounts', accountId);
    const accountDoc = await getDoc(accountDocRef);

    if (!accountDoc.exists()) {
      return NextResponse.json({ 
        error: 'LinkedIn account not found' 
      }, { status: 404 });
    }

    const accountData = accountDoc.data();
    if (accountData?.platformType !== 'linkedin') {
      return NextResponse.json({ 
        error: 'Account is not a LinkedIn account' 
      }, { status: 400 });
    }

    // Initialize LinkedIn provider with account credentials
    const linkedInProvider = new LinkedInProvider(
      {
        clientId: process.env.LINKEDIN_CORE_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CORE_CLIENT_SECRET || '',
        redirectUri: process.env.LINKEDIN_CORE_CALLBACK_URL || '',
        additionalParams: {
          restApiUrl: process.env.LINKEDIN_REST_API_URL,
          useModernRestApi: true
        }
      },
      {
        accessToken: accountData.accessToken,
        expiresAt: accountData.expiresAt,
        additionalData: accountData.additionalData
      }
    );

    // Initialize social inbox adapter
    const socialInboxAdapter = new LinkedInSocialInboxAdapter(linkedInProvider);

    const results = {
      success: 0,
      failed: 0,
      totalMessages: 0,
      errors: [] as string[]
    };

    // Process each post URN
    for (const postUrn of postUrns) {
      try {
        if (syncType === 'comments' || syncType === 'all') {
          // Sync comments to inbox
          const newMessages = await socialInboxAdapter.syncCommentsToInbox(
            postUrn,
            session.user.id,
            accountId,
            organizationId
          );
          
          results.totalMessages += newMessages.length;
        }

        if (syncType === 'metrics' || syncType === 'all') {
          // Sync engagement metrics
          await socialInboxAdapter.syncEngagementMetrics(postUrn);
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to sync ${postUrn}: ${error instanceof Error ? error.message : String(error)}`);
        logger.error('Error syncing LinkedIn post to inbox', { 
          error, 
          postUrn, 
          userId: session.user.id 
        });
      }
    }

    logger.info('LinkedIn social sync completed', {
      userId: session.user.id,
      accountId,
      results
    });

    return NextResponse.json({
      message: 'LinkedIn social sync completed',
      results
    });

  } catch (error) {
    logger.error('Error in LinkedIn social sync API', { error });
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/content/linkedin-social-sync
 * Get sync status and recent activity
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ 
        error: 'accountId parameter is required' 
      }, { status: 400 });
    }

    // Get recent LinkedIn messages from inbox
    const inboxQuery = query(
      collection(firestore, 'inbox'),
      where('userId', '==', session.user.id),
      where('accountId', '==', accountId),
      where('platformType', '==', 'linkedin'),
      orderBy('receivedAt', 'desc'),
      limit(50)
    );
    
    const recentMessages = await getDocs(inboxQuery);

    const messages = recentMessages.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{ id: string; receivedAt: any; status: string; [key: string]: any }>;

    // Get sync statistics
    const stats = {
      totalMessages: messages.length,
      unreadCount: messages.filter((msg) => msg.status === 'unread').length,
      todayCount: messages.filter((msg) => {
        const msgDate = new Date(msg.receivedAt.toDate());
        const today = new Date();
        return msgDate.toDateString() === today.toDateString();
      }).length,
      lastSyncTime: messages[0]?.receivedAt?.toDate() || null
    };

    return NextResponse.json({
      stats,
      recentMessages: messages.slice(0, 10) // Return top 10 for preview
    });

  } catch (error) {
    logger.error('Error fetching LinkedIn sync status', { error });
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
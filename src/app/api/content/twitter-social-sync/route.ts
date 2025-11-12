import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/nextauth';
import { TwitterProvider } from '@/lib/platforms/providers/TwitterProvider';
import { TwitterSocialInboxAdapter } from '@/lib/content/TwitterSocialInboxAdapter';
import { logger } from '@/lib/logging/logger';
import { firestore } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

/**
 * POST /api/content/twitter-social-sync
 * Sync Twitter social actions (mentions, DMs, replies) to unified social inbox
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      accountId, 
      organizationId, 
      syncType = 'all', // 'mentions', 'dms', 'replies', 'all'
      tweetIds = [] // Optional: specific tweets to sync replies for
    } = body;

    if (!accountId) {
      return NextResponse.json({ 
        error: 'accountId is required' 
      }, { status: 400 });
    }

    // Get Twitter credentials for this account
    const accountDocRef = doc(firestore, 'connectedAccounts', accountId);
    const accountDoc = await getDoc(accountDocRef);

    if (!accountDoc.exists()) {
      return NextResponse.json({ 
        error: 'Twitter account not found' 
      }, { status: 404 });
    }

    const accountData = accountDoc.data();
    if (accountData?.platformType !== 'twitter') {
      return NextResponse.json({ 
        error: 'Account is not a Twitter account' 
      }, { status: 400 });
    }

    // Initialize Twitter provider with account credentials
    const twitterProvider = new TwitterProvider(
      {
        clientId: process.env.TWITTER_API_KEY || '',
        clientSecret: process.env.TWITTER_API_SECRET || '',
        redirectUri: process.env.TWITTER_CALLBACK_URL || '',
        additionalParams: {
          apiKey: process.env.TWITTER_API_KEY,
          apiSecret: process.env.TWITTER_API_SECRET,
          bearerToken: process.env.TWITTER_BEARER_TOKEN,
          tier: process.env.TWITTER_API_TIER || 'free'
        }
      },
      {
        accessToken: accountData.accessToken,
        expiresAt: accountData.expiresAt,
        additionalData: accountData.additionalData
      }
    );

    // Initialize social inbox adapter
    const socialInboxAdapter = new TwitterSocialInboxAdapter(twitterProvider);

    const results = {
      mentions: { success: false, count: 0, errors: [] as string[] },
      dms: { success: false, count: 0, errors: [] as string[] },
      replies: { success: false, count: 0, errors: [] as string[] },
      totalMessages: 0
    };

    // Sync mentions
    if (syncType === 'mentions' || syncType === 'all') {
      try {
        const mentionMessages = await socialInboxAdapter.syncMentionsToInbox(
          session.user.id,
          accountId,
          organizationId
        );
        
        results.mentions.success = true;
        results.mentions.count = mentionMessages.length;
        results.totalMessages += mentionMessages.length;
      } catch (error) {
        results.mentions.errors.push(
          `Failed to sync mentions: ${error instanceof Error ? error.message : String(error)}`
        );
        logger.error('Error syncing Twitter mentions', { 
          error, 
          accountId, 
          userId: session.user.id 
        });
      }
    }

    // Sync DMs
    if (syncType === 'dms' || syncType === 'all') {
      try {
        const dmMessages = await socialInboxAdapter.syncDirectMessagesToInbox(
          session.user.id,
          accountId,
          organizationId
        );
        
        results.dms.success = true;
        results.dms.count = dmMessages.length;
        results.totalMessages += dmMessages.length;
      } catch (error) {
        results.dms.errors.push(
          `Failed to sync DMs: ${error instanceof Error ? error.message : String(error)}`
        );
        logger.error('Error syncing Twitter DMs', { 
          error, 
          accountId, 
          userId: session.user.id 
        });
      }
    }

    // Sync replies to specific tweets
    if ((syncType === 'replies' || syncType === 'all') && tweetIds.length > 0) {
      try {
        let totalReplies = 0;
        const replyErrors: string[] = [];

        for (const tweetId of tweetIds) {
          try {
            const replyMessages = await socialInboxAdapter.syncRepliesToInbox(
              tweetId,
              session.user.id,
              accountId,
              organizationId
            );
            
            totalReplies += replyMessages.length;
          } catch (error) {
            replyErrors.push(
              `Failed to sync replies for tweet ${tweetId}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
        
        results.replies.success = replyErrors.length === 0;
        results.replies.count = totalReplies;
        results.replies.errors = replyErrors;
        results.totalMessages += totalReplies;
      } catch (error) {
        results.replies.errors.push(
          `Failed to sync replies: ${error instanceof Error ? error.message : String(error)}`
        );
        logger.error('Error syncing Twitter replies', { 
          error, 
          accountId, 
          tweetIds,
          userId: session.user.id 
        });
      }
    }

    logger.info('Twitter social sync completed', {
      userId: session.user.id,
      accountId,
      results
    });

    return NextResponse.json({
      message: 'Twitter social sync completed',
      results
    });

  } catch (error) {
    logger.error('Error in Twitter social sync API', { error });
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/content/twitter-social-sync
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

    // Get recent Twitter messages from inbox
    const inboxQuery = query(
      collection(firestore, 'inbox'),
      where('userId', '==', session.user.id),
      where('accountId', '==', accountId),
      where('platformType', '==', 'twitter'),
      orderBy('receivedAt', 'desc'),
      limit(100)
    );
    
    const recentMessages = await getDocs(inboxQuery);

    const messages = recentMessages.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{ id: string; receivedAt: any; type: string; status: string; [key: string]: any }>;

    // Get sync statistics by message type
    const mentionCount = messages.filter((msg) => msg.type === 'mention').length;
    const dmCount = messages.filter((msg) => msg.type === 'direct_message').length;
    const replyCount = messages.filter((msg) => msg.type === 'reply').length;

    // Get sync statistics
    const stats = {
      totalMessages: messages.length,
      unreadCount: messages.filter((msg: any) => msg.status === 'unread').length,
      mentionCount,
      dmCount,
      replyCount,
      todayCount: messages.filter((msg: any) => {
        const msgDate = new Date(msg.receivedAt.toDate());
        const today = new Date();
        return msgDate.toDateString() === today.toDateString();
      }).length,
      lastSyncTime: messages[0]?.receivedAt?.toDate() || null,
      messagesByType: {
        mentions: mentionCount,
        directMessages: dmCount,
        replies: replyCount
      },
      messagesByPriority: {
        high: messages.filter((msg: any) => msg.priority === 'high').length,
        medium: messages.filter((msg: any) => msg.priority === 'medium').length,
        low: messages.filter((msg: any) => msg.priority === 'low').length,
        urgent: messages.filter((msg: any) => msg.priority === 'urgent').length
      }
    };

    return NextResponse.json({
      stats,
      recentMessages: messages.slice(0, 20) // Return top 20 for preview
    });

  } catch (error) {
    logger.error('Error fetching Twitter sync status', { error });
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
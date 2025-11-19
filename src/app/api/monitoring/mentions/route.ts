/**
 * Social Mentions API
 * GET /api/monitoring/mentions - Get social media mentions
 * POST /api/monitoring/mentions - Fetch new mentions from platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { socialListeningService, FetchMentionsOptions } from '@/lib/features/monitoring/SocialListeningService';
import { sentimentAnalysisService } from '@/lib/features/monitoring/SentimentAnalysisService';

/**
 * GET /api/monitoring/mentions
 * Retrieve social media mentions with filtering
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
    const types = searchParams.get('types')?.split(',');
    const sentiment = searchParams.get('sentiment') as 'positive' | 'negative' | 'neutral' | undefined;
    const isRead = searchParams.get('isRead') === 'true' ? true : searchParams.get('isRead') === 'false' ? false : undefined;
    const isStarred = searchParams.get('isStarred') === 'true' ? true : searchParams.get('isStarred') === 'false' ? false : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    const options: FetchMentionsOptions = {
      platforms: platforms as any,
      types: types as any,
      sentiment,
      isRead,
      isStarred,
      limit,
    };

    // Get mentions
    const mentions = await socialListeningService.getMentions(userId, organizationId, options);

    return NextResponse.json({
      success: true,
      mentions,
      count: mentions.length,
    });
  } catch (error) {
    console.error('Error getting mentions:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get mentions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/mentions
 * Fetch new mentions from connected platforms
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

    // Fetch mentions from all platforms
    const { mentions, errors } = await socialListeningService.fetchAllMentions(
      userId,
      organizationId,
      platformConnections
    );

    // Analyze sentiment for new mentions
    if (mentions.length > 0) {
      const batchResult = await sentimentAnalysisService.analyzeBatch(mentions);

      // Update mentions with sentiment
      mentions.forEach((mention, index) => {
        const sentiment = batchResult.results.get(mention.id || `temp-${index}`);
        if (sentiment) {
          mention.sentiment = sentiment.sentiment;
          mention.sentimentScore = sentiment.score;
          mention.priority = sentiment.priority;
        }
      });

      // Save mentions to Firestore
      const saveResult = await socialListeningService.saveMentions(mentions);

      return NextResponse.json({
        success: true,
        fetched: mentions.length,
        saved: saveResult.saved,
        analyzed: batchResult.analyzed,
        errors: [...errors, ...saveResult.errors, ...batchResult.errors],
      });
    }

    return NextResponse.json({
      success: true,
      fetched: 0,
      saved: 0,
      analyzed: 0,
      errors,
    });
  } catch (error) {
    console.error('Error fetching mentions:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to fetch mentions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Reply to Engagement API
 * POST /api/monitoring/reply - Reply to a comment or message
 * GET /api/monitoring/reply/suggestions - Get smart reply suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { firestore } from '@/lib/core/firebase';
import { getDoc, doc, getDocs, query, collection, where, limit } from 'firebase/firestore';
import { engagementService } from '@/lib/features/monitoring/EngagementService';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';

/**
 * POST /api/monitoring/reply
 * Reply to an engagement item
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

    // Parse request body
    const body = await request.json();
    const { itemId, replyContent, platformType } = body;

    // Validate input
    if (!itemId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'itemId is required' },
        { status: 400 }
      );
    }

    if (!replyContent || typeof replyContent !== 'string' || replyContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'replyContent is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!platformType) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'platformType is required' },
        { status: 400 }
      );
    }

    // Validate platform type
    const validPlatforms = Object.values(PlatformType);
    if (!validPlatforms.includes(platformType)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: `Invalid platform type. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Get platform connection for access token
    const connectionsDoc = await getDoc(doc(firestore, 'platformConnections', userId));
    if (!connectionsDoc.exists()) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No platform connections found' },
        { status: 400 }
      );
    }

    const connections = connectionsDoc.data().connections || [];
    const connection = connections.find((c: any) => c.type === platformType);

    if (!connection) {
      return NextResponse.json(
        { error: 'Bad Request', message: `No connection found for platform: ${platformType}` },
        { status: 400 }
      );
    }

    // Send reply
    const result = await engagementService.replyToItem(
      itemId,
      replyContent,
      platformType,
      connection.accessToken
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Reply Failed', message: result.error || 'Failed to send reply' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      replyId: result.replyId,
      message: 'Reply sent successfully',
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to send reply',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/monitoring/reply/suggestions
 * Get AI-powered smart reply suggestions for an engagement item
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get('itemId');
    const brandVoice = searchParams.get('brandVoice') as 'professional' | 'casual' | 'friendly' || 'professional';

    if (!itemId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'itemId query parameter is required' },
        { status: 400 }
      );
    }

    // Validate brand voice
    const validVoices = ['professional', 'casual', 'friendly'];
    if (!validVoices.includes(brandVoice)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: `Invalid brandVoice. Must be one of: ${validVoices.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate smart reply suggestions
    const suggestions = await engagementService.generateReplySuggestions(itemId, brandVoice);

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Could not generate reply suggestions' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestions,
      brandVoice,
    });
  } catch (error) {
    console.error('Error generating reply suggestions:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to generate reply suggestions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

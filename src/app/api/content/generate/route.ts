/**
 * Content Generation API
 *
 * Endpoints for AI-powered content generation:
 * - POST: Generate social media content
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { contentGenerationService } from '@/lib/features/content/ContentGenerationService';
import { logger } from '@/lib/core/logging/logger';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';
import { getFirebaseFirestore } from '@/lib/core/firebase';
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
 * POST /api/content/generate
 * Generate social media content using AI
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

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Organization not found' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      topic,
      platformType,
      tone,
      targetAudience,
      keywords,
      callToAction,
      includeHashtags,
      maxHashtags,
      includeEmojis,
      contentType,
      additionalContext
    } = body;

    // Validate required fields
    if (!topic) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Topic is required' },
        { status: 400 }
      );
    }

    if (!platformType) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Platform type is required' },
        { status: 400 }
      );
    }

    // Validate platform type
    if (!Object.values(PlatformType).includes(platformType)) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: `Invalid platform type: ${platformType}`
        },
        { status: 400 }
      );
    }

    logger.info('Generating content', {
      userId,
      topic,
      platformType,
      tone
    });

    // Generate content
    const generatedContent = await contentGenerationService.generateContent(
      {
        topic,
        platformType,
        tone,
        targetAudience,
        keywords,
        callToAction,
        includeHashtags,
        maxHashtags,
        includeEmojis,
        contentType,
        additionalContext
      },
      userId,
      organizationId
    );

    logger.info('Content generated successfully', {
      userId,
      characterCount: generatedContent.characterCount,
      hashtagCount: generatedContent.hashtags.length,
      optimizationScore: generatedContent.optimizationScore
    });

    return NextResponse.json({
      success: true,
      content: generatedContent
    });
  } catch (error) {
    logger.error('Failed to generate content', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to generate content'
      },
      { status: 500 }
    );
  }
}

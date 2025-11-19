/**
 * Content Optimization API
 *
 * Endpoints for optimizing content across platforms:
 * - POST: Optimize content for different platforms
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
 * POST /api/content/optimize
 * Optimize existing content for a different platform
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
    const { caption, fromPlatform, toPlatform } = body;

    // Validate required fields
    if (!caption) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Caption is required' },
        { status: 400 }
      );
    }

    if (!fromPlatform || !toPlatform) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Both fromPlatform and toPlatform are required' },
        { status: 400 }
      );
    }

    // Validate platform types
    if (!Object.values(PlatformType).includes(fromPlatform) ||
        !Object.values(PlatformType).includes(toPlatform)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Invalid platform type' },
        { status: 400 }
      );
    }

    logger.info('Optimizing content for platform', {
      userId,
      from: fromPlatform,
      to: toPlatform
    });

    // Optimize content
    const optimizedContent = await contentGenerationService.optimizeContent(
      caption,
      fromPlatform,
      toPlatform,
      userId,
      organizationId
    );

    logger.info('Content optimized successfully', {
      userId,
      fromPlatform,
      toPlatform,
      optimizationScore: optimizedContent.optimizationScore
    });

    return NextResponse.json({
      success: true,
      content: optimizedContent
    });
  } catch (error) {
    logger.error('Failed to optimize content', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to optimize content'
      },
      { status: 500 }
    );
  }
}

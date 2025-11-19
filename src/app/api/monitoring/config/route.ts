/**
 * Monitoring Configuration API
 * GET /api/monitoring/config - Get monitoring configuration
 * PUT /api/monitoring/config - Update monitoring configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { socialListeningService } from '@/lib/features/monitoring/SocialListeningService';

/**
 * GET /api/monitoring/config
 * Get monitoring configuration
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

    // Get monitoring config
    const config = await socialListeningService.getMonitoringConfig(userId, organizationId);

    if (!config) {
      // Return default config
      return NextResponse.json({
        success: true,
        config: {
          enabled: false,
          brandKeywords: [],
          competitorKeywords: [],
          trackedHashtags: [],
          customKeywords: [],
          platforms: [],
          alertThresholds: {
            highEngagement: 100,
            negativesentiment: -0.5,
            influencerFollowers: 10000,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Error getting monitoring config:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get monitoring configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/monitoring/config
 * Update monitoring configuration
 */
export async function PUT(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const {
      enabled,
      brandKeywords,
      competitorKeywords,
      trackedHashtags,
      customKeywords,
      platforms,
      alertThresholds,
    } = body;

    // Validate input
    if (brandKeywords && !Array.isArray(brandKeywords)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'brandKeywords must be an array' },
        { status: 400 }
      );
    }

    if (competitorKeywords && !Array.isArray(competitorKeywords)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'competitorKeywords must be an array' },
        { status: 400 }
      );
    }

    if (platforms && !Array.isArray(platforms)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'platforms must be an array' },
        { status: 400 }
      );
    }

    // Update config
    const configId = await socialListeningService.updateMonitoringConfig(
      userId,
      organizationId,
      {
        enabled,
        brandKeywords,
        competitorKeywords,
        trackedHashtags,
        customKeywords,
        platforms,
        alertThresholds,
      }
    );

    // Get updated config
    const updatedConfig = await socialListeningService.getMonitoringConfig(userId, organizationId);

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      configId,
    });
  } catch (error) {
    console.error('Error updating monitoring config:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to update monitoring configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

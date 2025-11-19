/**
 * Media Stats API
 * GET /api/media/stats - Get media library statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { mediaAssetService } from '@/lib/features/media/MediaAssetService';

/**
 * GET /api/media/stats
 * Get media library statistics
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

    // Get media stats
    const stats = await mediaAssetService.getAssetStats(userId, organizationId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting media stats:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get media stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

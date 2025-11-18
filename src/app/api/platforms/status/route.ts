/**
 * Platform Connection Status API
 * GET /api/platforms/status - Check if user has connected platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { firestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { getConnectionStatus } from '@/lib/utils/platformConnectionChecker';

/**
 * GET /api/platforms/status
 * Get platform connection status for user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
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

    const connectionStatus = await getConnectionStatus(userId, organizationId);

    return NextResponse.json({
      success: true,
      ...connectionStatus,
    });
  } catch (error) {
    console.error('Error getting platform status:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get platform status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Campaign Stats API
 * GET /api/campaigns/stats - Get campaign performance summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { campaignService } from '@/lib/features/campaigns/CampaignService';

/**
 * GET /api/campaigns/stats
 * Get campaign performance summary for organization
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

    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30;

    const stats = await campaignService.getPerformanceSummary(organizationId, days);

    return NextResponse.json({
      success: true,
      stats,
      period: `${days} days`,
    });
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get campaign stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

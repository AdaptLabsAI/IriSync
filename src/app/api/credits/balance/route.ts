/**
 * Credit Balance API
 * GET /api/credits/balance - Get user's credit balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { creditService } from '@/lib/features/credits/CreditService';

/**
 * GET /api/credits/balance
 * Get user's credit balance
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

    // Get credit balance
    const balance = await creditService.getBalance(userId, organizationId);

    // Get recommended bundle
    const recommendedBundle = await creditService.getRecommendedBundle(userId, organizationId);

    return NextResponse.json({
      success: true,
      balance: {
        current: balance.balance,
        isUnlimited: balance.isUnlimited,
        lifetimeEarned: balance.lifetimeEarned,
        lifetimeSpent: balance.lifetimeSpent,
        lastPurchaseAt: balance.lastPurchaseAt?.toISOString(),
      },
      recommendedBundle,
    });
  } catch (error) {
    console.error('Error getting credit balance:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get credit balance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

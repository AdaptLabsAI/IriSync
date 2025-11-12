import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase/admin';
import { getStripeClient } from '@/lib/billing/stripe';
import { logger } from '@/lib/logging/logger';

/**
 * Simple endpoint to check if user has access to the platform
 * Used by TrialGate component for access control
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const firestore = getFirestore();

    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({
        hasAccess: false,
        reason: 'User not found'
      });
    }

    const userData = userDoc.data();
    const orgId = userData?.currentOrganizationId || userData?.personalOrganizationId;

    if (!orgId) {
      return NextResponse.json({
        hasAccess: false,
        reason: 'No organization found'
      });
    }

    // Get organization data
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) {
      return NextResponse.json({
        hasAccess: false,
        reason: 'Organization not found'
      });
    }

    const orgData = orgDoc.data();
    const billingStatus = orgData?.billing?.subscriptionStatus || 'none';

    // User has access if they have active subscription OR active trial
    const hasAccess = ['active', 'trialing'].includes(billingStatus);

    return NextResponse.json({
      hasAccess,
      subscriptionStatus: billingStatus,
      organizationId: orgId,
      tier: orgData?.billing?.subscriptionTier || 'creator',
      reason: hasAccess ? 'Active subscription or trial' : 'No active subscription or trial'
    });

  } catch (error) {
    logger.error('Error checking access status', {
      error: error instanceof Error ? error.message : String(error)
    });

    // Default to no access if there's an error
    return NextResponse.json({
      hasAccess: false,
      reason: 'Error checking status'
    });
  }
} 
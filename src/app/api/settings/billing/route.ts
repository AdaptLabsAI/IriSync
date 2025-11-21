/**
 * Settings Billing API
 *
 * This endpoint provides billing information for the settings page.
 * It acts as a proxy/facade to the main billing APIs for easier settings integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { getDoc, doc } from 'firebase/firestore';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { logger } from '@/lib/core/logging/logger';
import { universalBillingService } from '@/lib/features/subscription/UniversalBillingService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/settings/billing
 * Get billing status and subscription information for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
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
        { error: 'Not found', message: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const orgId = userData.currentOrganizationId || userData.personalOrganizationId;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Not found', message: 'No organization found' },
        { status: 404 }
      );
    }

    // Get billing status enum from universal billing service
    const billingStatusEnum = await universalBillingService.checkBillingStatus(orgId);

    // Get organization details for additional billing info
    const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
    const orgData = orgDoc.exists() ? orgDoc.data() : {};

    // Get billing document for more detailed info
    const billingDoc = await getDoc(doc(firestore, 'billing', orgId));
    const billingData = billingDoc.exists() ? billingDoc.data() : {};

    return NextResponse.json({
      success: true,
      billing: {
        status: billingStatusEnum,
        tier: billingData.tier || orgData.subscriptionTier || 'free',
        provider: billingData.provider || 'stripe',
        expiresAt: billingData.expiresAt?.toDate?.()?.toISOString() || null,
        credits: billingData.credits || 0,
        features: billingData.features || [],
        limits: billingData.limits || {},
        trialInfo: billingData.trialInfo || null
      },
      organization: {
        id: orgId,
        name: orgData.name || 'Personal Organization',
        stripeCustomerId: orgData.stripeCustomerId,
        subscriptionStatus: orgData.subscriptionStatus
      }
    });
  } catch (error) {
    logger.error('Error fetching billing settings:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        message: 'Failed to fetch billing information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/billing
 * Create customer portal session or handle billing actions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const action = body.action;

    // Redirect to the appropriate billing endpoint
    switch (action) {
      case 'create-portal-session':
        // Redirect to customer portal endpoint
        return NextResponse.redirect(
          new URL('/api/billing/customer-portal', request.url)
        );

      case 'create-checkout-session':
        // Redirect to checkout session endpoint
        return NextResponse.redirect(
          new URL('/api/billing/create-checkout-session', request.url)
        );

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            message: 'The specified action is not supported',
            supportedActions: ['create-portal-session', 'create-checkout-session']
          },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error processing billing action:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        message: 'Failed to process billing action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

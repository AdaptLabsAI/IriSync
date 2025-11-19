/**
 * Credit Purchase API
 * POST /api/credits/purchase - Create Stripe checkout session for credit purchase
 * GET /api/credits/bundles - Get available credit bundles
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { CREDIT_BUNDLES, CreditBundle } from '@/lib/features/credits/CreditService';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

/**
 * GET /api/credits/bundles
 * Get available credit bundles
 */
export async function GET(request: NextRequest) {
  try {
    const bundles = Object.values(CREDIT_BUNDLES).map(bundle => ({
      bundle: bundle.bundle,
      credits: bundle.credits,
      price: bundle.price,
      priceFormatted: bundle.priceFormatted,
      savingsPercent: bundle.savingsPercent,
      costPerCredit: (bundle.price / bundle.credits / 100).toFixed(3), // in dollars
      available: !!bundle.stripePriceId, // Only show if Stripe Price ID is configured
    }));

    return NextResponse.json({
      success: true,
      bundles,
    });
  } catch (error) {
    console.error('Error getting credit bundles:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get credit bundles',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credits/purchase
 * Create Stripe checkout session for credit purchase
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
    const userEmail = session.user.email;

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

    // Parse request body
    const body = await request.json();
    const { bundle } = body;

    // Validate bundle
    if (!bundle || !Object.values(CreditBundle).includes(bundle)) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: `Invalid bundle. Must be one of: ${Object.values(CreditBundle).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const bundleDetails = CREDIT_BUNDLES[bundle as CreditBundle];

    // Check if Stripe Price ID is configured
    if (!bundleDetails.stripePriceId) {
      return NextResponse.json(
        {
          error: 'Configuration Error',
          message: `Stripe Price ID not configured for ${bundle} bundle. Please contact support.`,
        },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: bundleDetails.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?credits_purchased=true&bundle=${bundle}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?credits_cancelled=true`,
      customer_email: userEmail || undefined,
      client_reference_id: userId,
      metadata: {
        userId,
        organizationId,
        bundle,
        credits: bundleDetails.credits.toString(),
        type: 'credit_purchase',
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      bundle: bundleDetails,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

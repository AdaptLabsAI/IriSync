import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, createCustomer } from '@/lib/features/billing/stripe';
import { getFirestore, serverTimestamp } from '@/lib/core/firebase/admin';
import { logger } from '@/lib/core/logging/logger';
import Stripe from 'stripe';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Create a Stripe Checkout session for trial with payment collection
 * POST /api/subscription/create-trial-checkout
 *
 * This collects payment info upfront and creates a subscription with trial period.
 * After trial ends, user is automatically charged for the selected tier.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, name, tier = 'trial' } = body;

    // Validate required fields
    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and email are required' },
        { status: 400 }
      );
    }

    // Initialize Stripe
    let stripe: Stripe;
    try {
      stripe = getStripeClient();
    } catch (error) {
      logger.error('Stripe not configured', { error });
      return NextResponse.json(
        { error: 'Stripe is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Initialize Firestore
    let firestore: FirebaseFirestore.Firestore;
    try {
      firestore = getFirestore();
    } catch (error) {
      logger.error('Firebase not configured', { error });
      return NextResponse.json(
        { error: 'Database is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Check if user already has a Stripe customer ID
    const userDoc = await firestore.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    let customerId = userData?.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      try {
        customerId = await createCustomer(
          email,
          name || userData?.name || email.split('@')[0],
          {
            userId,
            tier: 'trial'
          }
        );

        // Save customer ID to user document
        await firestore.collection('users').doc(userId).update({
          stripeCustomerId: customerId,
          updatedAt: serverTimestamp()
        });

        logger.info('Created Stripe customer for trial', { userId, customerId });
      } catch (error) {
        logger.error('Failed to create Stripe customer', { error, userId });
        return NextResponse.json(
          { error: 'Failed to create customer account' },
          { status: 500 }
        );
      }
    }

    // Determine the price ID based on environment (trial converts to Creator after 7 days)
    // The trial tier gives influencer-level features but converts to creator pricing
    const priceId = process.env.STRIPE_PRICE_CREATOR_ID;

    if (!priceId) {
      logger.error('Missing Stripe price ID for Creator tier');
      return NextResponse.json(
        { error: 'Pricing configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Create Checkout session with trial period
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        // Collect payment method upfront but don't charge until trial ends
        subscription_data: {
          trial_period_days: 7,
          trial_settings: {
            end_behavior: {
              missing_payment_method: 'cancel', // Cancel if no payment method
            },
          },
          metadata: {
            userId,
            tier: 'trial', // Start as trial
            subscriptionTier: 'creator', // Will convert to creator after trial
            isTrial: 'true',
          },
        },
        metadata: {
          userId,
          tier: 'trial',
          subscriptionTier: 'creator',
          isTrial: 'true',
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?trial_started=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/register?trial_canceled=true`,
        allow_promotion_codes: true,
      });

      logger.info('Created trial checkout session', {
        userId,
        customerId,
        sessionId: session.id,
      });

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      logger.error('Failed to create checkout session', { error, userId, customerId });
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Unexpected error in create-trial-checkout', { error });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

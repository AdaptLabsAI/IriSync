import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, serverTimestamp } from '@/lib/firebase/admin';
import { getStripeClient } from '@/lib/billing/stripe';
import { handleApiError } from '@/lib/auth/utils';
import { logger } from '@/lib/logging/logger';

/**
 * Stripe-Native Trial Setup Endpoint
 * This endpoint is called AFTER registration to set up a trial with Stripe
 * 
 * Benefits:
 * - Uses Stripe's native trial functionality
 * - Simpler, more reliable than custom trial management
 * - Industry standard approach
 * - Better user experience (no payment required during registration)
 */

/**
 * POST - Start a Stripe-native trial
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      userId, 
      organizationId, 
      tier, 
      paymentMethodId,
      successUrl,
      cancelUrl 
    } = body;

    // Validation
    if (!userId || !organizationId || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, organizationId, tier' },
        { status: 400 }
      );
    }

    // Validate tier
    const validTiers = ['creator', 'influencer', 'enterprise'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    const firestore = getFirestore();
    const stripe = getStripeClient();

    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const userEmail = userData?.email;
    const userName = userData?.displayName || `${userData?.firstName} ${userData?.lastName}`;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Get organization data
    const orgDoc = await firestore.collection('organizations').doc(organizationId).get();
    if (!orgDoc.exists) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const orgData = orgDoc.data();

    // Check if already has active subscription/trial
    if (orgData?.billing?.subscriptionStatus === 'active' || 
        orgData?.billing?.subscriptionStatus === 'trialing') {
      return NextResponse.json(
        { error: 'Organization already has an active subscription or trial' },
        { status: 400 }
      );
    }

    // Create or get Stripe customer
    let stripeCustomerId = userData?.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          userId,
          organizationId,
          tier
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Update user with Stripe customer ID
      await firestore.collection('users').doc(userId).update({
        stripeCustomerId,
        updatedAt: serverTimestamp()
      });
    }

    // Get price ID for the tier
    const PRICE_IDS: Record<string, string> = {
      creator: process.env.STRIPE_PRICE_CREATOR_ID || '',
      influencer: process.env.STRIPE_PRICE_INFLUENCER_ID || '',
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE_ID || ''
    };

    const priceId = PRICE_IDS[tier as string];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured for tier' },
        { status: 500 }
      );
    }

    // If payment method provided, create subscription with trial immediately
    if (paymentMethodId) {
      try {
        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: stripeCustomerId,
        });

        // Set as default payment method
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        // Create subscription with 7-day trial
        const subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: priceId }],
          trial_period_days: 7, // Stripe native trial
          metadata: {
            userId,
            organizationId,
            tier,
            source: 'trial_setup'
          }
        });

        // Update organization with trial status
        await firestore.collection('organizations').doc(organizationId).update({
          'billing.subscriptionId': subscription.id,
          'billing.subscriptionStatus': 'trialing',
          'billing.subscriptionTier': tier,
          'billing.stripeCustomerId': stripeCustomerId,
          'billing.currentPeriodStart': new Date((subscription as any).current_period_start * 1000),
          'billing.currentPeriodEnd': new Date((subscription as any).current_period_end * 1000),
          'billing.trialEnd': new Date(subscription.trial_end! * 1000),
          updatedAt: serverTimestamp()
        });

        logger.info('Stripe-native trial started successfully', {
          userId,
          organizationId,
          subscriptionId: subscription.id,
          tier,
          trialEnd: new Date(subscription.trial_end! * 1000)
        });

        return NextResponse.json({
          success: true,
          message: `Your 7-day free trial for ${tier} tier has started!`,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            trialEnd: subscription.trial_end
          },
          nextStep: 'trial_active'
        });

      } catch (error) {
        logger.error('Error creating trial subscription', {
          error: error instanceof Error ? error.message : String(error),
          userId,
          organizationId
        });

        return NextResponse.json(
          { error: 'Failed to create trial subscription' },
          { status: 500 }
        );
      }
    } else {
      // No payment method - create checkout session for trial setup
      try {
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          mode: 'subscription',
          allow_promotion_codes: true,
          subscription_data: {
            trial_period_days: 7, // Stripe native trial
            metadata: {
              userId,
              organizationId,
              tier,
              source: 'trial_setup'
            }
          },
          metadata: {
            userId,
            organizationId,
            tier,
            source: 'trial_setup'
          },
          success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?trial=started`,
          cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?trial=canceled`
        });

        return NextResponse.json({
          success: true,
          message: 'Please complete payment setup to start your trial',
          checkoutUrl: session.url,
          nextStep: 'complete_checkout'
        });

      } catch (error) {
        logger.error('Error creating trial checkout session', {
          error: error instanceof Error ? error.message : String(error),
          userId,
          organizationId
        });

        return NextResponse.json(
          { error: 'Failed to create checkout session' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    logger.error('Error in trial setup', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      handleApiError(error, '/api/billing/trial-setup', 'setting up trial'),
      { status: 500 }
    );
  }
}

/**
 * GET - Check trial eligibility
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const organizationId = searchParams.get('organizationId');

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing userId or organizationId' },
        { status: 400 }
      );
    }

    const firestore = getFirestore();

    // Check organization billing status
    const orgDoc = await firestore.collection('organizations').doc(organizationId).get();
    if (!orgDoc.exists) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const orgData = orgDoc.data();
    const billingStatus = orgData?.billing?.subscriptionStatus || 'none';

    // Check if eligible for trial
    const isEligible = !['active', 'trialing', 'past_due'].includes(billingStatus);

    return NextResponse.json({
      eligible: isEligible,
      currentStatus: billingStatus,
      message: isEligible 
        ? 'You are eligible to start a 7-day free trial'
        : 'You already have an active subscription or trial'
    });

  } catch (error) {
    logger.error('Error checking trial eligibility', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { error: 'Failed to check trial eligibility' },
      { status: 500 }
    );
  }
} 
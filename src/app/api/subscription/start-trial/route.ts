import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createCustomer, createTrialCheckoutSession } from '@/lib/features/billing/stripe';
import { TRIAL_CONFIG } from '@/types/subscription';
import { logger } from '@/lib/core/logging/logger';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the Firebase token
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;
    const userEmail = decodedToken.email || '';

    // Get user from Firestore
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Check if user already has a Stripe customer ID
    let stripeCustomerId = userData?.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      stripeCustomerId = await createCustomer(
        userEmail,
        userData?.firstName && userData?.lastName
          ? `${userData.firstName} ${userData.lastName}`
          : userEmail,
        {
          userId,
          firebaseUid: userId,
        }
      );

      // Update user with Stripe customer ID
      await userRef.update({
        stripeCustomerId,
        updatedAt: new Date().toISOString(),
      });
    }

    // Get the Creator plan price ID from env
    const creatorPriceId = process.env.STRIPE_PRICE_CREATOR_ID;
    if (!creatorPriceId) {
      throw new Error('Creator price ID not configured');
    }

    // Create trial checkout session
    const { sessionId, url } = await createTrialCheckoutSession(
      stripeCustomerId,
      creatorPriceId,
      TRIAL_CONFIG.durationDays,
      userId,
      userEmail
    );

    logger.info('Trial checkout session created', { userId, sessionId });

    return NextResponse.json({
      success: true,
      checkoutUrl: url,
      sessionId,
    });
  } catch (error) {
    logger.error('Error creating trial checkout session', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to start trial',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

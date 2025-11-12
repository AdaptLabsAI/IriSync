import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { getStripeClient } from '@/lib/features/billing/stripe';
import { getDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase';
import { logger } from '@/lib/core/logging/logger';

/**
 * Create a Stripe Customer Portal session
 * This allows customers to manage payment methods, view invoices, update billing info, etc.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    const { returnUrl } = await req.json();

    // Get user's Stripe customer ID
    const userDoc = await getDoc(doc(firestore, 'users', user.id));
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    let stripeCustomerId = userData.stripeCustomerId;

    const stripe = getStripeClient();

    // If no customer ID, find or create customer
    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || '',
          metadata: {
            userId: user.id
          }
        });
        stripeCustomerId = customer.id;
      }

      // Update user with customer ID
      await import('firebase/firestore').then(({ updateDoc }) => 
        updateDoc(doc(firestore, 'users', user.id), {
          stripeCustomerId
        })
      );
    }

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined
    });

    logger.info('Created customer portal session', {
      userId: user.id,
      customerId: stripeCustomerId,
      sessionId: portalSession.id
    });

    return NextResponse.json({
      url: portalSession.url
    });

  } catch (error) {
    logger.error('Error creating customer portal session', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

/**
 * Get customer portal configuration (if needed for customization)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const stripe = getStripeClient();
    
    // Get available portal configurations
    const configurations = await stripe.billingPortal.configurations.list();
    
    return NextResponse.json({
      configurations: configurations.data
    });

  } catch (error) {
    logger.error('Error getting portal configurations', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { error: 'Failed to get configurations' },
      { status: 500 }
    );
  }
} 
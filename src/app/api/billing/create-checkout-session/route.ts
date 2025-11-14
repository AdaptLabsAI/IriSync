import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, getAuth } from '@/lib/core/firebase/admin';
import { getStripeClient } from '@/lib/features/billing/stripe';
import { handleApiError } from '@/lib/features/auth/utils';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * Price IDs for different subscription tiers and additional seats
 * These should be created in the Stripe dashboard and referenced here
 */
const PRICE_IDS: Record<string, string> = {
  creator: process.env.STRIPE_PRICE_CREATOR_ID || '',
  influencer: process.env.STRIPE_PRICE_INFLUENCER_ID || '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE_ID || '',
  
  // Additional seat price IDs
  creatorSeat: process.env.STRIPE_CREATOR_SEAT_PRICE_ID || '',
  influencerSeat: process.env.STRIPE_INFLUENCER_SEAT_PRICE_ID || '',
  enterpriseSeat: process.env.STRIPE_ENTERPRISE_SEAT_PRICE_ID || '',
};

/**
 * Get user's organization for billing operations
 */
async function getUserOrganization(firestore: any, userId: string) {
  const userDoc = await firestore.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    throw new Error('User not found');
  }
  
  const userData = userDoc.data();
  const orgId = userData?.currentOrganizationId || userData?.personalOrganizationId;
  
  if (!orgId) {
    throw new Error('No organization found for user');
  }
  
  return { orgId, userData };
}

/**
 * Create checkout session endpoint
 * This handles redirecting the user to Stripe checkout for subscription payment
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscriptionTier, purchaseType = 'subscription', quantity = 1, additionalSeats = 0 } = body;
    
    if (!userId || !subscriptionTier) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and subscriptionTier' },
        { status: 400 }
      );
    }
    
    // Validate tier
    if (!['creator', 'influencer', 'enterprise'].includes(subscriptionTier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }
    
    // Validate purchase type
    if (!['subscription', 'additional_seats'].includes(purchaseType)) {
      return NextResponse.json(
        { error: 'Invalid purchase type. Must be "subscription" or "additional_seats"' },
        { status: 400 }
      );
    }
    
    // Get Firestore and Auth instances
    const firestore = getFirestore();
    const auth = getAuth();
    
    // Get user data and organization
    const { orgId, userData } = await getUserOrganization(firestore, userId);
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }
    
    // Initialize Stripe
    const stripe = getStripeClient();
    
    // Create or retrieve Stripe customer
    let stripeCustomerId = userData.stripeCustomerId;
    
    if (!stripeCustomerId) {
      // Create a new customer in Stripe
      const customer = await stripe.customers.create({
        email: userData.email || '',
        name: userData.name || '',
        metadata: {
          userId: userId,
          organizationId: orgId,
          businessType: userData.businessType || '',
          companyName: userData.companyName || '',
        },
      });
      
      stripeCustomerId = customer.id;
      
      // Update user with Stripe customer ID
      await firestore.collection('users').doc(userId).update({
        stripeCustomerId: stripeCustomerId,
        updatedAt: new Date(),
      });
    }
    
    // Get price ID based on purchase type
    let priceId: string;
    let lineItems: any[] = [];
    
    if (purchaseType === 'subscription') {
      // Base subscription purchase
      priceId = PRICE_IDS[subscriptionTier as keyof typeof PRICE_IDS];
      
      if (!priceId) {
        return NextResponse.json(
          { error: 'Price ID not configured for the selected tier' },
          { status: 500 }
        );
      }
      
      lineItems.push({
        price: priceId,
        quantity: 1,
      });
      
      // Add additional seats if requested
      if (additionalSeats > 0) {
        const seatPriceId = PRICE_IDS[`${subscriptionTier}Seat` as keyof typeof PRICE_IDS];
        
        if (!seatPriceId) {
          return NextResponse.json(
            { error: 'Additional seat price ID not configured for the selected tier' },
            { status: 500 }
          );
        }
        
        lineItems.push({
          price: seatPriceId,
          quantity: additionalSeats,
        });
      }
    } else {
      // Additional seats only purchase
      const seatPriceId = PRICE_IDS[`${subscriptionTier}Seat` as keyof typeof PRICE_IDS];
      
      if (!seatPriceId) {
        return NextResponse.json(
          { error: 'Additional seat price ID not configured for the selected tier' },
          { status: 500 }
        );
      }
      
      lineItems.push({
        price: seatPriceId,
        quantity: quantity,
      });
    }
    
    // Set up success and cancel URLs
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success&type=${purchaseType}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=canceled&type=${purchaseType}`;
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          userId: userId,
          organizationId: orgId,
          subscriptionTier: subscriptionTier,
          purchaseType: purchaseType,
          additionalSeats: additionalSeats.toString(),
        },
      },
      metadata: {
        userId: userId,
        organizationId: orgId,
        subscriptionTier: subscriptionTier,
        purchaseType: purchaseType,
        additionalSeats: additionalSeats.toString(),
      },
    });
    
    // Update organization with pending subscription status
    const updateData: any = {
      'billing.subscriptionStatus': 'pending',
      'billing.subscriptionTier': subscriptionTier,
      updatedAt: new Date(),
    };
    
    if (purchaseType === 'additional_seats') {
      updateData['billing.pendingAdditionalSeats'] = quantity;
    } else if (additionalSeats > 0) {
      updateData['billing.pendingAdditionalSeats'] = additionalSeats;
    }
    
    await firestore.collection('organizations').doc(orgId).update(updateData);
    
    console.log('Updated organization billing status to pending', { 
      organizationId: orgId, 
      userId,
      subscriptionTier,
      purchaseType,
      additionalSeats: additionalSeats || quantity
    });
    
    // Return success with checkout URL
    return NextResponse.json({
      success: true,
      url: session.url,
      purchaseType,
      subscriptionTier,
      additionalSeats: purchaseType === 'additional_seats' ? quantity : additionalSeats,
    });
    
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      handleApiError(error, '/api/billing/create-checkout-session', 'creating checkout session'),
      { status: 500 }
    );
  }
} 
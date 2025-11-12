import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/core/firebase/admin';
import { getStripeClient } from '@/lib/features/billing/stripe';
import { handleApiError } from '@/lib/features/auth/utils';
import { stripeConfig } from '@/environment';

/**
 * Available token packages with their corresponding Stripe price IDs
 */
const TOKEN_PACKAGES = [
  { 
    id: 'token-50', 
    tokens: 50, 
    price: 25.00,
    stripePriceId: stripeConfig.tokenPackages.token50,
    tier: 'all' as const,
    name: 'Small Token Pack'
  },
  { 
    id: 'token-100', 
    tokens: 100, 
    price: 45.00,
    stripePriceId: stripeConfig.tokenPackages.token100,
    tier: 'all' as const,
    name: 'Medium Token Pack'
  },
  { 
    id: 'token-250', 
    tokens: 250, 
    price: 90.00,
    stripePriceId: stripeConfig.tokenPackages.token250,
    tier: 'all' as const,
    name: 'Large Token Pack'
  },
  { 
    id: 'token-500', 
    tokens: 500, 
    price: 160.00,
    stripePriceId: stripeConfig.tokenPackages.token500,
    tier: 'all' as const,
    name: 'XL Token Pack'
  },
  { 
    id: 'token-1000', 
    tokens: 1000, 
    price: 280.00,
    stripePriceId: stripeConfig.tokenPackages.token1000,
    tier: 'all' as const,
    name: 'Premium Token Pack'
  },
  { 
    id: 'token-2000', 
    tokens: 2000, 
    price: 500.00,
    stripePriceId: stripeConfig.tokenPackages.token2000,
    tier: 'all' as const,
    name: 'Heavy User Pack'
  },
  { 
    id: 'token-ent-1000', 
    tokens: 1000, 
    price: 252.00,
    stripePriceId: stripeConfig.tokenPackages.enterpriseToken1000,
    tier: 'enterprise' as const,
    name: 'Enterprise Premium Pack'
  },
  { 
    id: 'token-ent-2000', 
    tokens: 2000, 
    price: 400.00,
    stripePriceId: stripeConfig.tokenPackages.enterpriseToken2000,
    tier: 'enterprise' as const,
    name: 'Enterprise Heavy User Pack'
  }
];

/**
 * Get user's organization and subscription details
 */
async function getUserSubscriptionDetails(firestore: any, userId: string) {
  const userDoc = await firestore.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    throw new Error('User not found');
  }
  
  const userData = userDoc.data();
  const orgId = userData?.currentOrganizationId || userData?.personalOrganizationId;
  
  if (!orgId) {
    throw new Error('No organization found for user');
  }
  
  // Get organization details including subscription info
  const orgDoc = await firestore.collection('organizations').doc(orgId).get();
  
  if (!orgDoc.exists) {
    throw new Error('Organization not found');
  }
  
  const orgData = orgDoc.data();
  
  return { 
    orgId, 
    userData, 
    orgData,
    subscriptionTier: orgData?.billing?.subscriptionTier,
    subscriptionStatus: orgData?.billing?.subscriptionStatus,
    stripeCustomerId: userData?.stripeCustomerId
  };
}

/**
 * GET - Get available token packages for the user's subscription tier
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
    const { subscriptionTier, subscriptionStatus } = await getUserSubscriptionDetails(firestore, userId);
    
    if (subscriptionStatus !== 'active') {
      return NextResponse.json(
        { error: 'Active subscription required to purchase tokens' },
        { status: 403 }
      );
    }
    
    // Filter packages based on user's subscription tier
    const availablePackages = TOKEN_PACKAGES.filter(pkg => {
      if (pkg.tier === 'all') return true;
      return pkg.tier === subscriptionTier;
    }).map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      tokens: pkg.tokens,
      price: pkg.price,
      tier: pkg.tier
    }));
    
    return NextResponse.json({
      success: true,
      packages: availablePackages,
      userTier: subscriptionTier
    });
    
  } catch (error) {
    console.error('Error fetching token packages:', error);
    return NextResponse.json(
      handleApiError(error, '/api/billing/token-purchase', 'fetching token packages'),
      { status: 500 }
    );
  }
}

/**
 * POST - Create checkout session for token purchase
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, tokenPackageId, successUrl, cancelUrl } = body;
    
    if (!userId || !tokenPackageId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and tokenPackageId' },
        { status: 400 }
      );
    }
    
    const firestore = getFirestore();
    const stripe = getStripeClient();
    
    // Get user subscription details
    const { 
      orgId, 
      subscriptionTier, 
      subscriptionStatus, 
      stripeCustomerId 
    } = await getUserSubscriptionDetails(firestore, userId);
    
    if (subscriptionStatus !== 'active') {
      return NextResponse.json(
        { error: 'Active subscription required to purchase tokens' },
        { status: 403 }
      );
    }
    
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Stripe customer ID not found' },
        { status: 400 }
      );
    }
    
    // Find the token package
    const tokenPackage = TOKEN_PACKAGES.find(pkg => pkg.id === tokenPackageId);
    
    if (!tokenPackage) {
      return NextResponse.json(
        { error: 'Invalid token package ID' },
        { status: 400 }
      );
    }
    
    // Check if user's tier can purchase this package
    if (tokenPackage.tier !== 'all' && tokenPackage.tier !== subscriptionTier) {
      return NextResponse.json(
        { error: 'Token package not available for your subscription tier' },
        { status: 403 }
      );
    }
    
    // Validate Stripe price ID is configured
    if (!tokenPackage.stripePriceId) {
      return NextResponse.json(
        { error: 'Token package not properly configured' },
        { status: 500 }
      );
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: tokenPackage.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?purchase=success&tokens=${tokenPackage.tokens}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?purchase=canceled`,
      metadata: {
        userId,
        organizationId: orgId,
        tokenPackageId: tokenPackage.id,
        tokenAmount: tokenPackage.tokens.toString(),
        subscriptionTier,
        type: 'token_purchase'
      },
    });
    
    return NextResponse.json({
      success: true,
      url: session.url,
      tokenPackage: {
        id: tokenPackage.id,
        name: tokenPackage.name,
        tokens: tokenPackage.tokens,
        price: tokenPackage.price
      }
    });
    
  } catch (error) {
    console.error('Error creating token purchase session:', error);
    return NextResponse.json(
      handleApiError(error, '/api/billing/token-purchase', 'creating token purchase session'),
      { status: 500 }
    );
  }
} 
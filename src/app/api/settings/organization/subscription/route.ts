import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/features/auth/utils';
import { getFirestore, serverTimestamp } from '@/lib/core/firebase/admin';
import { logger } from '@/lib/core/logging/logger';
import { 
  TIER_TOKEN_LIMITS, 
  ENTERPRISE_TOKENS_PER_ADDITIONAL_SEAT, 
  SubscriptionTier,
  TokenPurchaseTransaction
} from '@/lib/features/ai/models/tokens';
import { v4 as uuidv4 } from 'uuid';
import { isMemberOfOrganization, hasOrganizationRole, OrganizationRole } from '@/lib/features/team/users/organization';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * Get subscription information for the current user's organization
 */
export async function GET(req: NextRequest) {
  try {
    // Verify user authentication
    const userId = await verifyAuthentication(req);
    if (!userId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource' 
      }, { status: 401 });
    }
    
    // Get the user's data to find their organization
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ 
        error: 'User not found',
        message: 'Your user profile could not be located' 
      }, { status: 404 });
    }
    
    const userData = userDoc.data();
    if (!userData) {
      return NextResponse.json({ 
        error: 'User data missing',
        message: 'Your user profile has no data' 
      }, { status: 404 });
    }
    
    // Use organization-centric approach to get organization ID
    const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;
    
    if (!organizationId) {
      return NextResponse.json({ 
        error: 'No organization',
        message: 'You are not associated with any organization' 
      }, { status: 404 });
    }
    
    if (userData.organizationId) {
      console.warn('Using deprecated user.organizationId field', { userId });
    }
    
    // Get organization data
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    
    if (!orgDoc.exists) {
      return NextResponse.json({ 
        error: 'Organization not found',
        message: 'The organization could not be located' 
      }, { status: 404 });
    }
    
    const orgData = orgDoc.data();
    if (!orgData) {
      return NextResponse.json({ 
        error: 'Organization data missing',
        message: 'The organization exists but has no data' 
      }, { status: 404 });
    }
    
    // Get subscription data directly from organization or from subscriptions collection
    let subscription: any = null;
    const tier = orgData.subscriptionTier as SubscriptionTier || SubscriptionTier.CREATOR;
    const seats = orgData.seats || 1;
    
    // Check if there's a subscription document
    if (orgData.subscriptionId) {
      const subscriptionDoc = await db.collection('subscriptions').doc(orgData.subscriptionId).get();
      if (subscriptionDoc.exists) {
        subscription = subscriptionDoc.data();
      }
    }
    
    // Count used seats by counting organization members
    let usedSeats = 0;
    const membersSnapshot = await db.collection('organizations').doc(organizationId).collection('members').get();
    usedSeats = membersSnapshot.size;
    
    // Calculate token allocation based on tier and seat count
    let tokenAllocation = 0;
    
    switch (tier) {
      case SubscriptionTier.CREATOR:
        tokenAllocation = TIER_TOKEN_LIMITS[SubscriptionTier.CREATOR] * seats;
        break;
      case SubscriptionTier.INFLUENCER:
        tokenAllocation = TIER_TOKEN_LIMITS[SubscriptionTier.INFLUENCER] * seats;
        break;
      case SubscriptionTier.ENTERPRISE:
        // Base tokens for minimum 5 seats, plus additional tokens per seat beyond 5
        if (seats <= 5) {
          tokenAllocation = TIER_TOKEN_LIMITS[SubscriptionTier.ENTERPRISE];
        } else {
          tokenAllocation = TIER_TOKEN_LIMITS[SubscriptionTier.ENTERPRISE] + 
                           (ENTERPRISE_TOKENS_PER_ADDITIONAL_SEAT * (seats - 5));
        }
        break;
      default:
        tokenAllocation = 0;
    }
    
    // Add any additional purchased tokens
    try {
      const tokenBalanceSnapshot = await db.collection('token_balances')
        .where('organizationId', '==', organizationId)
        .limit(1)
        .get();
      
      if (!tokenBalanceSnapshot.empty) {
        const tokenBalanceData = tokenBalanceSnapshot.docs[0].data();
        if (tokenBalanceData && tokenBalanceData.additionalTokensPurchased) {
          tokenAllocation += tokenBalanceData.additionalTokensPurchased;
        }
      }
    } catch (tokenError) {
      logger.warn('Error fetching additional token data', { tokenError });
      // Continue execution even if we can't get additional tokens
    }
    
    // Calculate seat limits based on tier
    let seatLimit = 1;
    switch (tier) {
      case SubscriptionTier.CREATOR:
        seatLimit = 3;
        break;
      case SubscriptionTier.INFLUENCER:
        seatLimit = 10;
        break;
      case SubscriptionTier.ENTERPRISE:
        seatLimit = Number.MAX_SAFE_INTEGER; // Unlimited
        break;
      default:
        seatLimit = 1;
    }

    // Return subscription info
    return NextResponse.json({
      organizationId,
      tier,
      seats,
      usedSeats,
      seatLimit,
      tokenAllocation,
      status: subscription?.status || orgData.billing?.subscriptionStatus || 'inactive',
      currentPeriodStart: subscription?.currentPeriodStart?.toDate?.() || 
                          (orgData.billing?.currentPeriodStart?.toDate?.() || 
                          new Date().toISOString()),
      currentPeriodEnd: subscription?.currentPeriodEnd?.toDate?.() || 
                        (orgData.billing?.currentPeriodEnd?.toDate?.() || 
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
      stripePriceId: subscription?.stripePriceId || orgData.stripePriceId,
      stripeCustomerId: subscription?.stripeCustomerId || orgData.stripeCustomerId,
      stripeSubscriptionId: subscription?.stripeSubscriptionId || orgData.stripeSubscriptionId,
    });
    
  } catch (error) {
    logger.error('Error fetching organization subscription', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({ 
      error: 'Server error',
      message: 'An error occurred while fetching subscription information',
    }, { status: 500 });
  }
}

/**
 * Update organization subscription information
 * Only administrators can perform this action
 */
export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const userId = await verifyAuthentication(req);
    if (!userId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'You must be logged in to update subscription information' 
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { organizationId, tier, seats, status, stripeSubscriptionId } = body;
    
    if (!organizationId) {
      return NextResponse.json({ 
        error: 'Missing organization ID',
        message: 'Organization ID is required' 
      }, { status: 400 });
    }
    
    // Get user data to check permissions
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ 
        error: 'User not found',
        message: 'Your user profile could not be located' 
      }, { status: 404 });
    }
    
    const userData = userDoc.data();
    if (!userData) {
      return NextResponse.json({ 
        error: 'User data missing',
        message: 'Your user profile has no data' 
      }, { status: 404 });
    }
    
    // Check if user is a member of the organization
    const isMember = await isMemberOfOrganization(userId, organizationId);
    if (!isMember) {
      return NextResponse.json({
        error: 'Forbidden',
        message: 'You are not a member of this organization'
      }, { status: 403 });
    }
    // Check if user is an org admin or global admin
    const isOrgAdmin = await hasOrganizationRole(userId, organizationId, [OrganizationRole.ADMIN, OrganizationRole.OWNER]);
    const isSystemAdmin = userData.role === 'admin' || userData.role === 'super_admin';
    if (!isSystemAdmin && !isOrgAdmin) {
      return NextResponse.json({
        error: 'Permission denied',
        message: 'You do not have permission to update subscription information'
      }, { status: 403 });
    }
    
    // Get organization data
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    
    if (!orgDoc.exists) {
      return NextResponse.json({ 
        error: 'Organization not found',
        message: 'The organization could not be located' 
      }, { status: 404 });
    }
    
    // Prepare update data
    const updateData: { [key: string]: any } = {};
    
    // Only include fields that are provided
    if (tier && Object.values(SubscriptionTier).includes(tier as SubscriptionTier)) {
      updateData.subscriptionTier = tier;
    }
    
    if (typeof seats === 'number' && seats > 0) {
      updateData.seats = seats;
    }
    
    if (status) {
      updateData.subscriptionStatus = status;
    }
    
    if (stripeSubscriptionId) {
      updateData.stripeSubscriptionId = stripeSubscriptionId;
    }
    
    // Add timestamp
    updateData.updatedAt = new Date();
    
    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: 'No updates provided',
        message: 'No valid subscription information was provided to update' 
      }, { status: 400 });
    }
    
    // Update organization
    await db.collection('organizations').doc(organizationId).update(updateData);
    
    // Log the update
    const logEntry = {
      action: 'update_subscription',
      userId,
      organizationId,
      changes: updateData,
      timestamp: new Date()
    };
    
    await db.collection('audit_logs').add(logEntry);
    
    // Return success
    return NextResponse.json({
      success: true,
      message: 'Subscription information updated successfully',
      organizationId,
      updates: updateData
    });
    
  } catch (error) {
    logger.error('Error updating organization subscription', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({ 
      error: 'Server error',
      message: 'An error occurred while updating subscription information',
    }, { status: 500 });
  }
}

/**
 * Purchase additional tokens for an organization
 */
export async function PATCH(req: NextRequest) {
  try {
    // Verify user authentication
    const userId = await verifyAuthentication(req);
    if (!userId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'You must be logged in to purchase additional tokens' 
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { organizationId, tokenAmount, paymentMethod, stripePaymentId, cost } = body;
    
    if (!organizationId) {
      return NextResponse.json({ 
        error: 'Missing organization ID',
        message: 'Organization ID is required' 
      }, { status: 400 });
    }
    
    if (!tokenAmount || typeof tokenAmount !== 'number' || tokenAmount <= 0) {
      return NextResponse.json({ 
        error: 'Invalid token amount',
        message: 'A positive token amount is required' 
      }, { status: 400 });
    }
    
    if (!paymentMethod) {
      return NextResponse.json({ 
        error: 'Missing payment method',
        message: 'Payment method is required' 
      }, { status: 400 });
    }
    
    // Get user data to check permissions
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ 
        error: 'User not found',
        message: 'Your user profile could not be located' 
      }, { status: 404 });
    }
    
    const userData = userDoc.data();
    if (!userData) {
      return NextResponse.json({ 
        error: 'User data missing',
        message: 'Your user profile has no data' 
      }, { status: 404 });
    }
    
    // Check if user is a member of the organization
    const isMember = await isMemberOfOrganization(userId, organizationId);
    if (!isMember) {
      return NextResponse.json({
        error: 'Forbidden',
        message: 'You are not a member of this organization'
      }, { status: 403 });
    }
    // Check if user is an org admin or global admin
    const isOrgAdmin = await hasOrganizationRole(userId, organizationId, [OrganizationRole.ADMIN, OrganizationRole.OWNER]);
    const isSystemAdmin = userData.role === 'admin' || userData.role === 'super_admin';
    if (!isSystemAdmin && !isOrgAdmin) {
      return NextResponse.json({
        error: 'Permission denied',
        message: 'You do not have permission to purchase tokens for this organization'
      }, { status: 403 });
    }
    
    // Get organization data
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    
    if (!orgDoc.exists) {
      return NextResponse.json({ 
        error: 'Organization not found',
        message: 'The organization could not be located' 
      }, { status: 404 });
    }
    
    const orgData = orgDoc.data();
    if (!orgData) {
      return NextResponse.json({ 
        error: 'Organization data missing',
        message: 'The organization exists but has no data' 
      }, { status: 404 });
    }
    
    // Record the purchase transaction
    const transactionId = uuidv4();
    const transaction: TokenPurchaseTransaction = {
      transactionId,
      userId,
      timestamp: new Date(),
      tokenAmount,
      cost: cost || 0,
      paymentMethod,
      status: 'completed',
      stripePaymentId
    };
    
    await db.collection('token_purchases').doc(transactionId).set(transaction);
    
    // Update token balance for the organization
    // First check if there's already a balance document
    const tokenBalanceSnapshot = await db.collection('token_balances')
      .where('organizationId', '==', organizationId)
      .limit(1)
      .get();
    
    if (tokenBalanceSnapshot.empty) {
      // Create new token balance record
      await db.collection('token_balances').add({
        userId,
        organizationId,
        additionalTokensPurchased: tokenAmount,
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    } else {
      // Update existing token balance
      const tokenBalanceDoc = tokenBalanceSnapshot.docs[0];
      await tokenBalanceDoc.ref.update({
        additionalTokensPurchased: (tokenBalanceDoc.data().additionalTokensPurchased || 0) + tokenAmount,
        lastUpdated: serverTimestamp()
      });
    }
    
    // Log the token purchase
    const logEntry = {
      action: 'purchase_tokens',
      userId,
      organizationId,
      tokenAmount,
      transactionId,
      cost: cost || 0,
      timestamp: serverTimestamp()
    };
    
    await db.collection('audit_logs').add(logEntry);
    
    // Return success
    return NextResponse.json({
      success: true,
      message: 'Tokens purchased successfully',
      organizationId,
      tokenAmount,
      transactionId
    });
    
  } catch (error) {
    logger.error('Error purchasing additional tokens', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({ 
      error: 'Server error',
      message: 'An error occurred while purchasing additional tokens',
    }, { status: 500 });
  }
} 
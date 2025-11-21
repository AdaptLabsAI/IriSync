import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { getStripeClient } from '@/lib/features/billing/stripe';
import { getDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseFirestore  } from '@/lib/core/firebase';
import { logger } from '@/lib/core/logging/logger';
import { universalBillingService, BillingStatus } from '@/lib/features/subscription/UniversalBillingService';
import { TrialService } from '@/lib/features/subscription/TrialService';
import { VerificationService } from '@/lib/features/subscription/VerificationService';
import { SubscriptionTier } from '@/lib/features/subscription/models/subscription';
import { getFirestore } from '@/lib/core/firebase/admin';
import { handleApiError } from '@/lib/features/auth/utils';
import Stripe from 'stripe';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * TYPE ARCHITECTURE FOR STRIPE SUBSCRIPTIONS
 * ============================================
 *
 * This file deals with two distinct subscription concepts:
 *
 * 1. STRIPE SUBSCRIPTION (StripeSubscription):
 *    - Raw subscription objects from Stripe API
 *    - Uses snake_case field names (current_period_start, trial_end, etc.)
 *    - Contains Unix timestamps as numbers (seconds since epoch)
 *    - Source: stripe.subscriptions.retrieve(), .list(), etc.
 *    - Type alias for Stripe.Subscription from the official Stripe SDK
 *
 * 2. APP SUBSCRIPTION DTO (AppSubscription):
 *    - Application-level Data Transfer Object
 *    - Uses camelCase field names (currentPeriodStart, trialEnd, etc.)
 *    - Contains JavaScript Date objects (converted from timestamps)
 *    - Returned in API responses to clients
 *
 * The mapStripeSubscriptionToApp() function converts between these types.
 *
 * IMPORTANT: We do NOT use a bare "Subscription" type in this file to avoid
 * conflicts with other Subscription types in the codebase.
 */

/**
 * Type alias for raw Stripe subscription objects from the Stripe SDK.
 * Use this type for all variables that hold raw subscription data from Stripe API calls.
 */
export type StripeSubscription = Stripe.Subscription;

/**
 * Application-level subscription DTO.
 *
 * This represents the subscription data shape we return from our API,
 * completely distinct from Stripe's raw Subscription type.
 *
 * Key differences from StripeSubscription:
 * - Uses Date objects instead of Unix timestamps (numbers)
 * - Uses camelCase (currentPeriodStart) instead of snake_case (current_period_start)
 * - Only includes fields we expose in our API responses
 * - No Stripe-internal fields that clients don't need
 */
export interface AppSubscription {
  id: string;
  status: Stripe.Subscription.Status | string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
}

/**
 * Convert a raw Stripe subscription to our application DTO.
 *
 * This function provides the single point of conversion from Stripe's API format
 * (snake_case fields, Unix timestamps) to our application's DTO format
 * (camelCase fields, Date objects).
 *
 * Conversion details:
 * - current_period_start (number) → currentPeriodStart (Date)
 * - current_period_end (number) → currentPeriodEnd (Date)
 * - trial_end (number | null) → trialEnd (Date | null)
 * - cancel_at_period_end (boolean) → cancelAtPeriodEnd (boolean)
 *
 * Unix timestamps are multiplied by 1000 to convert from seconds to milliseconds
 * before creating Date objects.
 *
 * @param subscription - Raw subscription object from Stripe API (StripeSubscription)
 * @returns AppSubscription - Our application DTO with converted dates
 */
function mapStripeSubscriptionToApp(subscription: StripeSubscription): AppSubscription {
  return {
    id: subscription.id,
    status: subscription.status,
    // Convert Unix timestamps (seconds) to JavaScript Date objects (milliseconds)
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
  };
}


/**
 * Universal Billing Subscription API with Trial Fraud Protection
 * Integrates TrialService, VerificationService, and UniversalBillingService
 */

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
  role?: string;
}

// Initialize services
const trialService = new TrialService();
const verificationService = new VerificationService();

/**
 * Get user's organization for billing operations
 */
async function getUserOrganization(userId: string): Promise<{ orgId: string; userData: any }> {
  const firestore = getFirebaseFirestore();
  if (!firestore) {
    throw new Error('Database not configured');
  }
  const userDoc = await getDoc(doc(firestore, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();
  const orgId = userData.currentOrganizationId || userData.personalOrganizationId;

  if (!orgId) {
    throw new Error('No organization found for user');
  }

  return { orgId, userData };
}

/**
 * GET - Retrieve comprehensive billing information including trial data
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required to access billing information'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'User ID not found in session'
      }, { status: 401 });
    }

    // Explicitly type stripe to ensure proper Stripe SDK type resolution
    const stripe: Stripe = getStripeClient();
    
    // Get user's organization
    const { orgId, userData } = await getUserOrganization(user.id);
    
    // Get organization data
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
    if (!orgDoc.exists()) {
      return NextResponse.json({ 
        error: 'Organization not found'
      }, { status: 404 });
    }
    
    const orgData = orgDoc.data();
    const billing = orgData.billing || {};
    
    // Find or create Stripe customer by email
    let customers = await stripe.customers.list({ 
      email: user.email || '' 
    });
    
    let customer = customers.data[0];
    
    if (!customer) {
      customer = await stripe.customers.create({ 
        email: user.email || '',
        name: user.name || '',
        metadata: { 
          userId: user.id,
          organizationId: orgId
        }
      });
      
      // Update user with customer ID
      await updateDoc(doc(firestore, 'users', user.id), {
        stripeCustomerId: customer.id,
        updatedAt: Timestamp.now()
      });
    }
    
    // Get current billing status using UniversalBillingService
    let billingStatus: BillingStatus = BillingStatus.PENDING_SETUP;
    if (billing.subscriptionId) {
      billingStatus = await universalBillingService.checkBillingStatus(orgId);
    }
    
    // Get trial information from TrialService
    const activeTrial = await trialService.getActiveTrial(user.id);
    const userTrials = await trialService.getUserTrials(user.id);
    const verificationStatus = await verificationService.getVerificationStatus(user.id);
    
    // Get payment methods
    const paymentMethods = await stripe.paymentMethods.list({ 
      customer: customer.id, 
      type: 'card' 
    });
    
    // Get invoices
    const invoices = await stripe.invoices.list({ 
      customer: customer.id, 
      limit: 10 
    });
    
    // Get subscription details if exists
    // Using StripeSubscription type alias for raw Stripe subscription data
    let subscription: StripeSubscription | null = null;
    let subscriptionDetails: AppSubscription | null = null;

    if (billing.subscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(billing.subscriptionId);
        // Map Stripe subscription to our app DTO
        subscriptionDetails = mapStripeSubscriptionToApp(subscription);
      } catch (error) {
        logger.error('Error retrieving subscription', {
          subscriptionId: billing.subscriptionId,
          error
        });
      }
    }
    
    // Get organization subscription tier and details
    const subscriptionTier = billing.subscriptionTier || 'creator';
    const seats = orgData.seats || 1;
    const usedSeats = orgData.usedSeats || 1;
    
    // Get usage quotas
    const usageQuota = orgData.usageQuota || {};
    
    // Check trial eligibility for tiers if no active trial
    let trialEligibility = null;
    if (!activeTrial) {
      trialEligibility = await Promise.all([
        SubscriptionTier.CREATOR,
        SubscriptionTier.INFLUENCER,
        SubscriptionTier.ENTERPRISE
      ].map(async (tier) => ({
        tier,
        eligible: await trialService.isEligibleForTrial(user.id!, tier)
      })));
    }
    
    const response = {
      organization: {
        id: orgId,
        name: orgData.name,
        status: orgData.status || 'active'
      },
      billing: {
        status: billingStatus,
        subscriptionTier,
        subscriptionId: billing.subscriptionId,
        customerId: customer.id,
        seats,
        usedSeats,
        subscriptionDetails,
        usageQuota,
        paymentMethods: paymentMethods.data.map((pm: Stripe.PaymentMethod) => ({
          id: pm.id,
          type: 'card',
          last4: pm.card?.last4,
          brand: pm.card?.brand,
          exp: `${pm.card?.exp_month}/${pm.card?.exp_year}`,
          isDefault: pm.id === customer.invoice_settings?.default_payment_method
        })),
        invoices: invoices.data.map((inv: Stripe.Invoice) => ({
          id: inv.id,
          amount: inv.amount_paid / 100,
          date: inv.created * 1000,
          status: inv.status,
          downloadUrl: inv.invoice_pdf,
          description: inv.description || `${subscriptionTier} subscription`
        })),
        // Reminder and suspension info
        pastDueSince: billing.pastDueSince ? billing.pastDueSince.toDate() : null,
        reminderCount: billing.reminderCount || 0,
        lastReminderSent: billing.lastReminderSent ? billing.lastReminderSent.toDate() : null,
        suspendedAt: orgData.suspendedAt ? orgData.suspendedAt.toDate() : null,
        closedAt: orgData.closedAt ? orgData.closedAt.toDate() : null
      },
      // Trial information with fraud protection data
      trial: {
        activeTrial,
        trialHistory: userTrials,
        verification: verificationStatus,
        trialEligibility,
        fraudProtection: {
          paymentMethodRequired: true,
          socialAccountRequired: true,
          cooldownPeriod: '6 months',
          maxTrialsPerTier: 1,
          verificationRequired: true,
          trialDuration: '7 days'
        }
      }
    };
    
    logger.info('Retrieved billing information with trial data', {
      userId: user.id,
      organizationId: orgId,
      billingStatus,
      subscriptionTier,
      hasActiveTrial: !!activeTrial,
      trialHistoryCount: userTrials.length
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error retrieving billing information', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({ 
      error: 'Failed to retrieve billing information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST - Update billing information, manage trials, or trigger actions
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session'
      }, { status: 401 });
    }
    
    const body = await req.json();
    const { action, ...params } = body;
    
    // Get user's organization
    const { orgId } = await getUserOrganization(user.id);
    
    switch (action) {
      case 'check_billing_status': {
        // Force refresh billing status
        const billingStatus = await universalBillingService.checkBillingStatus(orgId);
        
        return NextResponse.json({
          success: true,
          billingStatus,
          message: 'Billing status refreshed'
        });
      }
      
      case 'restore_account': {
        // Attempt to restore suspended/closed account
        try {
          await universalBillingService.restoreAccount(orgId);
          
          return NextResponse.json({
            success: true,
            message: 'Account restoration initiated'
          });
        } catch (error) {
          return NextResponse.json({
            error: 'Failed to restore account',
            message: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 400 });
        }
      }
      
      case 'start_trial': {
        // Start a new trial with fraud protection
        const { tier, paymentMethodId, socialAccountsVerified } = params;
        
        if (!tier || !paymentMethodId) {
          return NextResponse.json({
            error: 'Missing required parameters',
            message: 'tier and paymentMethodId are required'
          }, { status: 400 });
        }
        
        // Validate tier
        if (!Object.values(SubscriptionTier).includes(tier)) {
          return NextResponse.json({
            error: 'Invalid tier',
            message: 'tier must be creator, influencer, or enterprise'
          }, { status: 400 });
        }
        
        // Validate user email
        if (!user.email) {
          return NextResponse.json({
            error: 'User email required',
            message: 'User must have a valid email address'
          }, { status: 400 });
        }
        
        try {
          // Get Stripe customer - explicitly type to ensure proper Stripe SDK type resolution
          const stripe: Stripe = getStripeClient();
          let customers = await stripe.customers.list({ 
            email: user.email 
          });
          
          let customer = customers.data[0];
          if (!customer) {
            customer = await stripe.customers.create({ 
              email: user.email,
              name: user.name || '',
              metadata: { userId: user.id, organizationId: orgId }
            });
          }
          
          // Verify social accounts if not provided
          let socialVerified = socialAccountsVerified;
          if (!socialVerified) {
            socialVerified = await verificationService.verifySocialAccounts(user.id);
          }
          
          // Start trial with fraud protection
          const trial = await trialService.startTrial(
            user.id,
            user.email,
            tier,
            customer.id,
            paymentMethodId,
            socialVerified
          );
          
          // Store verification status
          await verificationService.storeVerificationStatus(user.id, {
            paymentMethodVerified: true,
            paymentMethodId,
            socialAccountsVerified: socialVerified,
            verifiedAt: new Date()
          });
          
          return NextResponse.json({
            success: true,
            trial,
            message: 'Trial started successfully'
          });
          
        } catch (error) {
          return NextResponse.json({
            error: 'Failed to start trial',
            message: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 400 });
        }
      }
      
      case 'cancel_trial': {
        // Cancel an active trial
        const { trialId } = params;
        
        if (!trialId) {
          return NextResponse.json({
            error: 'Missing trialId'
          }, { status: 400 });
        }
        
        try {
          await trialService.cancelTrial(trialId, user.id);
          
          return NextResponse.json({
            success: true,
            message: 'Trial canceled successfully'
          });
        } catch (error) {
          return NextResponse.json({
            error: 'Failed to cancel trial',
            message: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 400 });
        }
      }
      
      case 'check_trial_eligibility': {
        // Check trial eligibility for all tiers
        const eligibility = await Promise.all([
          SubscriptionTier.CREATOR,
          SubscriptionTier.INFLUENCER,
          SubscriptionTier.ENTERPRISE
        ].map(async (tier) => ({
          tier,
          eligible: await trialService.isEligibleForTrial(user.id!, tier)
        })));
        
        return NextResponse.json({
          success: true,
          eligibility
        });
      }
      
      case 'update_billing_email': {
        const { billingEmail } = params;
        if (!billingEmail) {
          return NextResponse.json({ 
            error: 'Billing email is required' 
          }, { status: 400 });
        }
        
        // Update organization billing email
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

        await updateDoc(doc(firestore, 'organizations', orgId), {
          billingEmail,
          updatedAt: Timestamp.now()
        });
        
        return NextResponse.json({
          success: true,
          message: 'Billing email updated'
        });
      }
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          message: `Action '${action}' not supported`
        }, { status: 400 });
    }
    
  } catch (error) {
    logger.error('Error processing billing request', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({ 
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT - Update subscription (change tier, cancel, etc.)
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'User ID not found' 
      }, { status: 401 });
    }
    
    const body = await req.json();
    const { action, ...params } = body;
    
    // Get user's organization
    const { orgId } = await getUserOrganization(user.id);
    
    // Get organization data
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
    if (!orgDoc.exists()) {
      return NextResponse.json({ 
        error: 'Organization not found' 
      }, { status: 404 });
    }
    
    const orgData = orgDoc.data();
    const billing = orgData.billing || {};
    
    if (!billing.subscriptionId) {
      return NextResponse.json({
        error: 'No active subscription found'
      }, { status: 400 });
    }

    // Explicitly type stripe to ensure proper Stripe SDK type resolution
    const stripe: Stripe = getStripeClient();
    
    switch (action) {
      case 'cancel_subscription': {
        const { cancelImmediately = false } = params;
        
        await stripe.subscriptions.update(billing.subscriptionId, {
          cancel_at_period_end: !cancelImmediately
        });
        
        if (cancelImmediately) {
          await stripe.subscriptions.cancel(billing.subscriptionId);
        }
        
        // Update organization
        await updateDoc(doc(firestore, 'organizations', orgId), {
          'billing.subscriptionStatus': cancelImmediately ? 'canceled' : 'cancel_at_period_end',
          updatedAt: Timestamp.now()
        });
        
        return NextResponse.json({
          success: true,
          message: cancelImmediately ? 'Subscription canceled immediately' : 'Subscription will cancel at period end'
        });
      }
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 });
    }
    
  } catch (error) {
    logger.error('Error updating subscription', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({ 
      error: 'Failed to update subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Check user's current subscription status
 */
export async function GET_CHECK_SUBSCRIPTION_STATUS(req: NextRequest) {
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
    // Explicitly type stripe to ensure proper Stripe SDK type resolution
    const stripe: Stripe = getStripeClient();

    // Get user data (using admin SDK firestore from above)

    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const orgId = userData?.currentOrganizationId || userData?.personalOrganizationId;

    if (!orgId) {
      return NextResponse.json({
        hasActiveSubscription: false,
        hasActiveTrial: false,
        subscriptionStatus: 'none',
        message: 'No organization found'
      });
    }

    // Get organization data
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) {
      return NextResponse.json({
        hasActiveSubscription: false,
        hasActiveTrial: false,
        subscriptionStatus: 'none',
        message: 'Organization not found'
      });
    }

    const orgData = orgDoc.data();
    const billingData = orgData?.billing;

    if (!billingData) {
      return NextResponse.json({
        hasActiveSubscription: false,
        hasActiveTrial: false,
        subscriptionStatus: 'none',
        message: 'No billing information found'
      });
    }

    // Check current subscription status
    const subscriptionStatus = billingData.subscriptionStatus || 'none';
    const subscriptionId = billingData.subscriptionId;

    // Get current subscription from Stripe if we have one
    // Using StripeSubscription type alias for raw Stripe subscription data
    let stripeSubscription: StripeSubscription | null = null;
    if (subscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      } catch (error) {
        logger.warn('Failed to retrieve Stripe subscription', {
          subscriptionId,
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Determine current status
    const hasActiveSubscription = subscriptionStatus === 'active' && 
                                 stripeSubscription?.status === 'active';
    
    const hasActiveTrial = subscriptionStatus === 'trialing' && 
                          stripeSubscription?.status === 'trialing';

    // Get trial end date if in trial
    let trialEndDate = null;
    if (hasActiveTrial && stripeSubscription?.trial_end) {
      trialEndDate = new Date(stripeSubscription.trial_end * 1000);
    }

    // Calculate days remaining in trial
    let daysRemaining = 0;
    if (trialEndDate) {
      const now = new Date();
      const timeDiff = trialEndDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      hasActiveSubscription,
      hasActiveTrial,
      subscriptionStatus,
      // Map Stripe subscription to our app DTO with proper Date conversion
      subscription: stripeSubscription ? mapStripeSubscriptionToApp(stripeSubscription) : null,
      trial: hasActiveTrial ? {
        activeTrial: {
          isActive: true,
          endDate: trialEndDate?.toISOString(),
          daysRemaining,
          tier: billingData.subscriptionTier
        }
      } : null,
      organizationId: orgId,
      billingTier: billingData.subscriptionTier,
      message: hasActiveSubscription ? 'Active subscription found' :
               hasActiveTrial ? `Trial active (${daysRemaining} days remaining)` :
               'No active subscription or trial'
    });

  } catch (error) {
    logger.error('Error checking subscription status', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      handleApiError(error, '/api/billing/subscription', 'checking subscription status'),
      { status: 500 }
    );
  }
}

/**
 * POST method not allowed for this endpoint
 */
export async function POST_CHECK_SUBSCRIPTION_STATUS() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
} 
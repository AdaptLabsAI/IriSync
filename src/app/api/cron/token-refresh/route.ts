import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, serverTimestamp } from '@/lib/firebase/admin';
import { getStripeClient } from '@/lib/billing/stripe';
import { logger } from '@/lib/logging/logger';

/**
 * Monthly Token Refresh Cron Job
 * 
 * This cron job handles:
 * 1. Refreshing monthly token allocations for active subscribers
 * 2. Resetting usage counters
 * 3. Processing billing period starts
 * 
 * Should be called monthly on the 1st at 00:00 UTC: "0 0 1 * *"
 * 
 * NOTE: Trial conversions are now handled automatically by Stripe webhooks
 * when trial_end event occurs, making this system much more reliable.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Starting monthly token refresh cron job');

    const stripe = getStripeClient();
    const firestore = getFirestore();
    
    // Get all active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100 // Adjust based on your customer count
    });

    let tokensRefreshed = 0;
    let refreshFailed = 0;
    let newBillingPeriods = 0;

    for (const subscription of subscriptions.data) {
      try {
        const userId = subscription.metadata?.userId;
        const organizationId = subscription.metadata?.organizationId;
        const tier = subscription.metadata?.tier;

        if (!userId || !organizationId || !tier) {
          logger.warn('Subscription missing metadata', { 
            subscriptionId: subscription.id 
          });
          continue;
        }

        // Check if this is a new billing period (current_period_start within last day)
        const periodStart = new Date((subscription as any).current_period_start * 1000);
        const now = new Date();
        const dayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        const isNewBillingPeriod = periodStart > dayAgo;

        if (isNewBillingPeriod) {
          // Get token allocation for tier
          const tokenAllocations: Record<string, number> = {
            creator: 100,
            influencer: 500,
            enterprise: 5000
          };

          const monthlyTokens = tokenAllocations[tier] || 100;

          // Update organization with new token allocation
          await firestore.collection('organizations').doc(organizationId).update({
            'billing.currentPeriodStart': periodStart,
            'billing.currentPeriodEnd': new Date((subscription as any).current_period_end * 1000),
            'tokens.monthlyAllocation': monthlyTokens,
            'tokens.remainingTokens': monthlyTokens,
            'tokens.usedTokens': 0,
            'tokens.lastRefreshDate': serverTimestamp(),
            'tokens.billingPeriodStart': periodStart,
            updatedAt: serverTimestamp()
          });

          logger.info('Monthly tokens refreshed', {
            userId,
            organizationId,
            tier,
            monthlyTokens,
            subscriptionId: subscription.id,
            billingPeriodStart: periodStart
          });

          tokensRefreshed++;
          newBillingPeriods++;
        }

      } catch (error) {
        logger.error('Error processing subscription for token refresh', {
          error: error instanceof Error ? error.message : String(error),
          subscriptionId: subscription.id
        });
        refreshFailed++;
      }
    }

    // Also check for any organizations that might have missed their refresh
    // (backup logic in case Stripe webhook missed something)
    const orgsSnapshot = await firestore.collection('organizations')
      .where('billing.subscriptionStatus', '==', 'active')
      .get();

    let backupRefreshes = 0;

    for (const orgDoc of orgsSnapshot.docs) {
      try {
        const orgData = orgDoc.data();
        const lastRefresh = orgData.tokens?.lastRefreshDate?.toDate();
        const currentPeriodStart = orgData.billing?.currentPeriodStart?.toDate();

        // If last refresh was more than 35 days ago, force refresh
        const now = new Date();
        const thirtyFiveDaysAgo = new Date(now.getTime() - (35 * 24 * 60 * 60 * 1000));

        if (!lastRefresh || lastRefresh < thirtyFiveDaysAgo) {
          const tier = orgData.billing?.subscriptionTier || 'creator';
          const tokenAllocations: Record<string, number> = {
            creator: 100,
            influencer: 500,
            enterprise: 5000
          };

          const monthlyTokens = tokenAllocations[tier] || 100;

          await firestore.collection('organizations').doc(orgDoc.id).update({
            'tokens.monthlyAllocation': monthlyTokens,
            'tokens.remainingTokens': monthlyTokens,
            'tokens.usedTokens': 0,
            'tokens.lastRefreshDate': serverTimestamp(),
            'tokens.forceRefresh': true, // Flag for monitoring
            updatedAt: serverTimestamp()
          });

          logger.info('Backup token refresh performed', {
            organizationId: orgDoc.id,
            tier,
            monthlyTokens,
            lastRefresh: lastRefresh?.toISOString() || 'never'
          });

          backupRefreshes++;
        }
      } catch (error) {
        logger.error('Error in backup token refresh', {
          error: error instanceof Error ? error.message : String(error),
          organizationId: orgDoc.id
        });
      }
    }

    logger.info('Monthly token refresh completed', {
      totalSubscriptionsProcessed: subscriptions.data.length,
      tokensRefreshed,
      refreshFailed,
      newBillingPeriods,
      backupRefreshes
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalSubscriptionsProcessed: subscriptions.data.length,
        tokensRefreshed,
        refreshFailed,
        newBillingPeriods,
        backupRefreshes
      },
      timestamp: new Date().toISOString(),
      message: 'Monthly token refresh completed successfully'
    });

  } catch (error) {
    logger.error('Token refresh cron job failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { 
        error: 'Token refresh cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET method to check cron job status and token statistics
 */
export async function GET(req: NextRequest) {
  try {
    const firestore = getFirestore();
    
    // Get token usage statistics
    const orgsSnapshot = await firestore.collection('organizations')
      .where('billing.subscriptionStatus', 'in', ['active', 'trialing'])
      .get();
    
    let totalActive = 0;
    let totalTokensAllocated = 0;
    let totalTokensUsed = 0;
    
    orgsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalActive++;
      totalTokensAllocated += data.tokens?.monthlyAllocation || 0;
      totalTokensUsed += data.tokens?.usedTokens || 0;
    });
    
    return NextResponse.json({
      status: 'healthy',
      statistics: {
        activeSubscriptions: totalActive,
        totalMonthlyTokensAllocated: totalTokensAllocated,
        totalTokensUsed: totalTokensUsed,
        utilizationRate: totalTokensAllocated > 0 ? 
          (totalTokensUsed / totalTokensAllocated * 100).toFixed(1) + '%' : '0%'
      },
      lastCheck: new Date().toISOString(),
      note: 'Trial conversions are handled automatically by Stripe webhooks'
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
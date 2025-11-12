import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, serverTimestamp } from '@/lib/firebase/admin';
import { getStripeClient } from '@/lib/billing/stripe';
import { logger } from '@/lib/logging/logger';
import Stripe from 'stripe';
import { ReferralService } from '@/lib/referrals/ReferralService';

// The webhook secret should be set in environment variables
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Helper function to get user by Stripe customer ID
async function getUserByCustomerId(firestore: FirebaseFirestore.Firestore, customerId: string) {
  const usersSnapshot = await firestore
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
    
  if (usersSnapshot.empty) {
    return null;
  }
  
  return {
    id: usersSnapshot.docs[0].id,
    ...usersSnapshot.docs[0].data()
  };
}

// Helper function to check if a subscription was already processed
async function isSubscriptionAlreadyProcessed(
  firestore: FirebaseFirestore.Firestore, 
  subscriptionId: string
): Promise<boolean> {
  const existingEvent = await firestore
    .collection('subscriptionEvents')
    .where('subscriptionId', '==', subscriptionId)
    .where('eventType', '==', 'subscription_created')
    .limit(1)
    .get();
    
  return !existingEvent.empty;
}

// Helper function to determine subscription tier from Stripe subscription
async function determineSubscriptionTier(
  stripe: Stripe,
  subscription: Stripe.Subscription
): Promise<string> {
  try {
    // Check metadata first
    if (subscription.metadata?.tier) {
      return subscription.metadata.tier;
    }
    
    // Check price metadata
    for (const item of subscription.items.data) {
      if (item.price.metadata?.tier) {
        return item.price.metadata.tier;
      }
      
      // Check product metadata
      if (item.price.product && typeof item.price.product === 'string') {
        const product = await stripe.products.retrieve(item.price.product);
        if (product && !product.deleted && 'metadata' in product && product.metadata?.tier) {
          return product.metadata.tier;
        }
      } else if (item.price.product && typeof item.price.product === 'object') {
        if (!item.price.product.deleted && 'metadata' in item.price.product && item.price.product.metadata?.tier) {
          return item.price.product.metadata.tier;
        }
      }
    }
    
    // Fallback: determine by price amount
    const totalAmount = subscription.items.data.reduce((sum, item) => {
      return sum + (item.price.unit_amount || 0) * (item.quantity || 1);
    }, 0);
    
    // Convert cents to dollars for comparison
    const dollarAmount = totalAmount / 100;
    
    if (dollarAmount >= 1250) {
      return 'enterprise';
    } else if (dollarAmount >= 200) {
      return 'influencer';
    } else {
      return 'creator';
    }
  } catch (error) {
    logger.error('Error determining subscription tier', { error, subscriptionId: subscription.id });
    return 'creator'; // Safe fallback
  }
}

// Helper function to calculate token allocation based on subscription tier
async function calculateTokenAllocation(tier: string, firestore: FirebaseFirestore.Firestore, userId: string) {
  switch (tier) {
    case 'creator':
      return 100;
    case 'influencer':
      return 500;
    case 'enterprise': {
      // Get organization data to determine seats
      try {
        const userData = (await firestore.collection('users').doc(userId).get()).data();
        const orgId = userData?.organizationId;
        let baseTokens = 5000; // Base tokens for 5 seats
        
        if (orgId) {
          const orgDoc = await firestore.collection('organizations').doc(orgId).get();
          if (orgDoc.exists) {
            const orgData = orgDoc.data();
            const seats = orgData?.seats || 5;
            
            // Add 500 tokens per seat beyond the initial 5
            if (seats > 5) {
              baseTokens += (seats - 5) * 500;
            }
          }
        }
        
        return baseTokens;
      } catch (error) {
        logger.error('Error calculating enterprise token allocation', { error, userId });
        return 5000; // Default allocation if calculation fails
      }
    }
    default:
      return 50; // Default tier
  }
}

// Helper function to process subscription creation
async function processSubscriptionCreation(
  firestore: FirebaseFirestore.Firestore,
  stripe: Stripe,
  subscription: Stripe.Subscription,
  source: 'checkout' | 'direct' | 'enterprise',
  metadata?: { userId?: string; organizationId?: string; subscriptionTier?: string; sessionId?: string }
): Promise<void> {
  // Get customer ID
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;
    
  if (!customerId) {
    logger.error('Missing customer ID in subscription', { subscriptionId: subscription.id });
    return;
  }
  
  // Find user by customer ID
  const user = await getUserByCustomerId(firestore, customerId);
  if (!user) {
    logger.error('No user found for subscription customer', { customerId, subscriptionId: subscription.id });
    return;
  }
  
  // Determine subscription tier
  const subscriptionTier = metadata?.subscriptionTier || await determineSubscriptionTier(stripe, subscription);
  
  // Get or determine organization ID
  const userData = user as any;
  const orgId = metadata?.organizationId || 
               userData.currentOrganizationId || 
               userData.personalOrganizationId ||
               userData.organizationId; // Legacy fallback
  
  if (!orgId) {
    logger.error('No organization found for user', { userId: user.id });
    return;
  }
  
  // Calculate seats from subscription items
  let totalSeats = 1; // Default to 1 seat
  let hasEnterpriseSeats = false;
  
  for (const item of subscription.items.data) {
    // Check if this is a seat item
    if (item.price.metadata?.isSeat === 'true' || 
        (typeof item.price.product === 'object' && 
         item.price.product && !item.price.product.deleted &&
         'metadata' in item.price.product &&
         item.price.product.metadata?.isSeat === 'true')) {
      totalSeats = item.quantity || 1;
      hasEnterpriseSeats = true;
      break;
    }
  }
  
  // For enterprise subscriptions, ensure minimum 5 seats
  if (subscriptionTier === 'enterprise' && totalSeats < 5) {
    totalSeats = 5;
  }
  
  // Calculate token allocation
  const tokenAllocation = await calculateTokenAllocation(subscriptionTier, firestore, user.id);
  
  // Update organization subscription details
  const organizationUpdate: any = {
    'billing.subscriptionStatus': 'active',
    'billing.subscriptionId': subscription.id,
    'billing.subscriptionTier': subscriptionTier,
    'billing.currentPeriodStart': new Date((subscription as any).current_period_start * 1000),
    'billing.currentPeriodEnd': new Date((subscription as any).current_period_end * 1000),
    'billing.status': 'active',
    seats: totalSeats,
    'usageQuota.aiTokens.limit': tokenAllocation,
    updatedAt: serverTimestamp(),
  };
  
  // Add enterprise-specific fields
  if (subscriptionTier === 'enterprise') {
    organizationUpdate['billing.isEnterprise'] = true;
    
    // Check for enterprise quote ID
    const quoteId = subscription.metadata?.quoteId;
    if (quoteId) {
      organizationUpdate.enterpriseQuoteId = quoteId;
      
      // Update the quote status
      try {
        await firestore.collection('enterprise_quotes').doc(quoteId).update({
          billingStatus: 'active',
          subscriptionId: subscription.id,
          activatedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        logger.error('Error updating enterprise quote', { error, quoteId });
      }
    }
  }
  
  await firestore.collection('organizations').doc(orgId).update(organizationUpdate);
  
  // Log the subscription creation event
  await firestore.collection('subscriptionEvents').add({
    userId: user.id,
    organizationId: orgId,
    eventType: 'subscription_created',
    subscriptionId: subscription.id,
    subscriptionTier: subscriptionTier,
    source: source,
    stripeSessionId: metadata?.sessionId || null,
    seats: totalSeats,
    tokenAllocation: tokenAllocation,
    amount: subscription.items.data.reduce((sum, item) => sum + (item.price.unit_amount || 0) * (item.quantity || 1), 0) / 100,
    currency: subscription.currency,
    status: 'success',
    createdAt: serverTimestamp(),
  });
  
  logger.info('Subscription created successfully', { 
    userId: user.id,
    organizationId: orgId,
    subscriptionId: subscription.id,
    subscriptionTier,
    source,
    seats: totalSeats,
    tokenAllocation
  });
}

/**
 * Stripe webhook handler
 * This processes Stripe events like subscription updates, payment successes, etc.
 */
export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeClient();
    const firestore = getFirestore();
    
    // Get the signature from headers
    const signature = req.headers.get('stripe-signature') || '';
    
    if (!signature) {
      logger.error('Missing stripe-signature header');
      
      return NextResponse.json(
        { 
          error: 'Bad Request',
          message: 'Missing stripe-signature header',
          endpoint: '/api/webhooks/stripe'
        },
        { status: 400 }
      );
    }
    
    // Validate webhook secret
    if (!STRIPE_WEBHOOK_SECRET) {
      logger.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      
      return NextResponse.json(
        { 
          error: 'Server Configuration Error',
          message: 'Webhook secret not configured',
          endpoint: '/api/webhooks/stripe'
        },
        { status: 500 }
      );
    }
    
    // Get the raw body and parse as Stripe event
    const rawBody = await req.text();
    let event: Stripe.Event;
    
    try {
      // Verify the event with Stripe
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      
      return NextResponse.json(
        { 
          error: 'Bad Request',
          message: 'Webhook signature verification failed',
          endpoint: '/api/webhooks/stripe'
        },
        { status: 400 }
      );
    }
    
    // Log the event received
    logger.info('Stripe webhook received', { 
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });
    
    const referralService = new ReferralService();

    // Handle specific event types
    try {
      switch (event.type) {
        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          
          logger.info('Processing subscription.created event', {
            subscriptionId: subscription.id,
            customerId: subscription.customer
          });
          
          // Check if this subscription was already processed
          const alreadyProcessed = await isSubscriptionAlreadyProcessed(firestore, subscription.id);
          if (alreadyProcessed) {
            logger.info('Subscription already processed, skipping', {
              subscriptionId: subscription.id
            });
            break;
          }
          
          // Determine the source of this subscription
          let source: 'checkout' | 'direct' | 'enterprise' = 'direct';
          let metadata: any = {};
          
          // Check if this came from a checkout session
          if (subscription.metadata?.checkoutSessionId) {
            source = 'checkout';
            metadata.sessionId = subscription.metadata.checkoutSessionId;
          }
          
          // Check if this is an enterprise subscription
          if (subscription.metadata?.isEnterpriseQuote === 'true' || 
              subscription.metadata?.tier === 'enterprise' ||
              subscription.metadata?.quoteId) {
            source = 'enterprise';
          }
          
          // Extract metadata from subscription
          if (subscription.metadata) {
            metadata.userId = subscription.metadata.userId;
            metadata.organizationId = subscription.metadata.organizationId;
            metadata.subscriptionTier = subscription.metadata.subscriptionTier || subscription.metadata.tier;
          }
          
          // Process the subscription creation
          await processSubscriptionCreation(
            firestore,
            stripe,
            subscription,
            source,
            metadata
          );
          
          break;
        }
        
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          
          // Handle token purchases
          if (session.mode === 'payment' && session.metadata?.type === 'token_purchase') {
            const userId = session.metadata?.userId;
            const organizationId = session.metadata?.organizationId;
            const tokenAmount = session.metadata?.tokenAmount;
            const tokenPackageId = session.metadata?.tokenPackageId;
            
            if (!userId || !organizationId || !tokenAmount) {
              logger.error('Missing metadata in token purchase session', { 
                sessionId: session.id, 
                userId: userId || 'missing',
                organizationId: organizationId || 'missing',
                tokenAmount: tokenAmount || 'missing'
              });
              break;
            }
            
            try {
              const tokenAmountNum = parseInt(tokenAmount);
              
              // Get current organization data
              const orgDoc = await firestore.collection('organizations').doc(organizationId).get();
              
              if (!orgDoc.exists) {
                logger.error('Organization not found for token purchase', { organizationId });
                break;
              }
              
              const orgData = orgDoc.data();
              const currentTokens = orgData?.usageQuota?.aiTokens?.remaining || 0;
              const newTokenTotal = currentTokens + tokenAmountNum;
              
              // Update organization with new token balance
              await firestore.collection('organizations').doc(organizationId).update({
                'usageQuota.aiTokens.remaining': newTokenTotal,
                'usageQuota.aiTokens.lastPurchaseAmount': tokenAmountNum,
                'usageQuota.aiTokens.lastPurchaseDate': serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              
              // Log the token purchase event
              await firestore.collection('tokenPurchaseEvents').add({
                userId,
                organizationId,
                sessionId: session.id,
                tokenPackageId: tokenPackageId || 'unknown',
                tokenAmount: tokenAmountNum,
                amountPaid: (session.amount_total || 0) / 100, // Convert cents to dollars
                currency: session.currency || 'usd',
                previousBalance: currentTokens,
                newBalance: newTokenTotal,
                status: 'completed',
                createdAt: serverTimestamp(),
              });
              
              logger.info('Token purchase processed successfully', {
                userId,
                organizationId,
                sessionId: session.id,
                tokenAmount: tokenAmountNum,
                previousBalance: currentTokens,
                newBalance: newTokenTotal,
                packageId: tokenPackageId
              });
              
            } catch (error) {
              logger.error('Error processing token purchase', {
                error: error instanceof Error ? error.message : String(error),
                sessionId: session.id,
                userId,
                organizationId
              });
            }
            
            break;
          }
          
          // Handle subscription checkouts
          // Extract metadata
          const userId = session.metadata?.userId;
          const subscriptionTier = session.metadata?.subscriptionTier;
          
          if (!userId || !subscriptionTier) {
            logger.error('Missing metadata in session', { 
              sessionId: session.id, 
              userId: userId || 'missing',
              subscriptionTier: subscriptionTier || 'missing'
            });
            break;
          }
          
          // Get subscription details if this was a subscription checkout
          if (session.mode === 'subscription' && session.subscription) {
            const subscriptionId = typeof session.subscription === 'string' ? 
              session.subscription : session.subscription.id;
            
            // Check if subscription was already processed by subscription.created
            const alreadyProcessed = await isSubscriptionAlreadyProcessed(firestore, subscriptionId);
            if (alreadyProcessed) {
              logger.info('Subscription already processed by subscription.created, skipping checkout processing', {
                subscriptionId,
                sessionId: session.id
              });
              break;
            }
            
            // Get the full subscription object
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            
            // Process via the unified subscription handler
            await processSubscriptionCreation(
              firestore,
              stripe,
              subscription,
              'checkout',
              {
                userId,
                organizationId: session.metadata?.organizationId,
                subscriptionTier,
                sessionId: session.id
              }
            );
          }
          
          await handleCheckoutCompleted(session, referralService);
          
          break;
        }
        
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          
          // Skip non-subscription invoices
          const invoiceWithSub = invoice as unknown as { subscription?: string | { id: string } };
          if (!invoiceWithSub.subscription) {
            break;
          }
          
          // Get the subscription details
          const subscriptionId = typeof invoiceWithSub.subscription === 'string' ? 
            invoiceWithSub.subscription : invoiceWithSub.subscription.id;
            
          // Get the customer ID
          if (!invoice.customer) {
            logger.error('Missing customer ID in invoice', { invoiceId: invoice.id });
            break;
          }
          
          const customerId = typeof invoice.customer === 'string' ? 
            invoice.customer : invoice.customer.id;
          
          // Find user by Stripe customer ID
          const user = await getUserByCustomerId(firestore, customerId);
          
          if (user) {
            // Get organization ID
            const userData = user as any;
            const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
            
            if (orgId) {
              // Get subscription details for all tiers
              const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
                expand: ['items.data.price']
              });
              
              // Universal billing status update
              await firestore.collection('organizations').doc(orgId).update({
                'billing.status': 'active',
                'billing.subscriptionStatus': 'active',
                'billing.currentPeriodStart': new Date((subscription as any).current_period_start * 1000),
                'billing.currentPeriodEnd': new Date((subscription as any).current_period_end * 1000),
                'billing.lastInvoiceId': invoice.id,
                'billing.lastInvoiceAmount': (invoice.amount_paid / 100).toString(),
                'billing.lastInvoiceDate': new Date((invoice as any).created * 1000),
                'billing.pastDueSince': null, // Clear past due status
                'billing.reminderCount': 0, // Reset reminder count
                'billing.lastReminderSent': null,
                updatedAt: serverTimestamp()
              });
              
              // Check if this is an enterprise subscription for quote updates
              const isEnterprise = subscription.items.data.some(item => 
                item.price.metadata?.isEnterpriseQuote === 'true' || 
                item.price.metadata?.tier === 'enterprise'
              );
              
              if (isEnterprise) {
                // Get enterprise quote ID from metadata
                const quoteId = subscription.metadata?.quoteId || 
                               subscription.items.data.find(item => 
                                 item.price.metadata?.quoteId
                               )?.price.metadata?.quoteId;
                
                if (quoteId) {
                  // Update the quote with payment information
                  const quoteRef = firestore.collection('enterprise_quotes').doc(quoteId);
                  const quoteSnapshot = await quoteRef.get();
                  
                  if (quoteSnapshot.exists) {
                    await quoteRef.update({
                      billingStatus: 'active',
                      lastInvoiceId: invoice.id,
                      lastInvoiceAmount: (invoice.amount_paid / 100).toString(),
                      lastInvoiceDate: new Date((invoice as any).created * 1000),
                      updatedAt: serverTimestamp()
                    });
                    
                    logger.info('Updated enterprise quote with payment information', {
                      quoteId,
                      invoiceId: invoice.id
                    });
                  }
                }
              }
              
              // Restore account if it was suspended/closed
              const { universalBillingService } = await import('@/lib/subscription/UniversalBillingService');
              try {
                await universalBillingService.restoreAccount(orgId);
                logger.info('Account restored after successful payment', {
                  organizationId: orgId,
                  invoiceId: invoice.id
                });
              } catch (restoreError) {
                logger.error('Error restoring account after payment', {
                  error: restoreError instanceof Error ? restoreError.message : String(restoreError),
                  organizationId: orgId
                });
              }
              
              logger.info('Updated organization billing status after payment', {
                organizationId: orgId,
                subscriptionId,
                invoiceId: invoice.id
              });
            } else {
              logger.error('No organization found for user', { userId: user.id });
            }
          } else {
            logger.error('No user found for customer', { customerId });
          }
          
          await handleInvoicePaymentSucceeded(invoice, referralService);
          
          break;
        }
        
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          
          if (invoice.customer) {
            // Get customer ID to find the user
            const customerId = typeof invoice.customer === 'string' 
              ? invoice.customer 
              : invoice.customer.id;
              
            // Find user by Stripe customer ID
            const user = await getUserByCustomerId(firestore, customerId);
            
            if (!user) {
              logger.error('No user found for customer with failed payment', { customerId });
              break;
            }
            
            // Get organization ID
            const userData = user as any;
            const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
            
            if (orgId) {
              // Update organization billing status to past due
              await firestore.collection('organizations').doc(orgId).update({
                'billing.status': 'past_due',
                'billing.subscriptionStatus': 'past_due',
                'billing.paymentStatus': 'failed',
                'billing.lastFailedPayment': serverTimestamp(),
                'billing.pastDueSince': serverTimestamp(), // Start the past due timer
                updatedAt: serverTimestamp()
              });
              
              logger.info('Updated organization billing status to past due', {
                organizationId: orgId,
                status: 'past_due'
              });
              
              // Trigger universal billing service to check status
              const { universalBillingService } = await import('@/lib/subscription/UniversalBillingService');
              try {
                await universalBillingService.checkBillingStatus(orgId);
                logger.info('Triggered billing status check after payment failure', {
                  organizationId: orgId
                });
              } catch (billingError) {
                logger.error('Error checking billing status after payment failure', {
                  error: billingError instanceof Error ? billingError.message : String(billingError),
                  organizationId: orgId
                });
              }
            } else {
              logger.error('No organization found for user', { userId: user.id });
            }
            
            // Get subscription ID, safely handling potential undefined values
            const invoiceWithSub = invoice as unknown as { subscription?: string | { id: string } };
            const subscriptionId = invoiceWithSub.subscription ? 
              (typeof invoiceWithSub.subscription === 'string' ? invoiceWithSub.subscription : invoiceWithSub.subscription.id) : 
              undefined;
            
            // Get failure message from payment intent or charge
            let failureReason = 'Unknown payment failure';
            const invoiceWithError = invoice as unknown as { last_payment_error?: { message?: string } };
            if (invoiceWithError.last_payment_error) {
              failureReason = invoiceWithError.last_payment_error.message || failureReason;
            }
            
            // Log the failed payment event
            await firestore.collection('billingEvents').add({
              userId: user.id,
              organizationId: orgId,
              eventType: 'invoice_payment_failed',
              invoiceId: invoice.id,
              subscriptionId,
              amount: invoice.amount_due / 100,
              currency: invoice.currency,
              status: 'failed',
              failureReason,
              createdAt: serverTimestamp(),
            });
            
            logger.warn('Invoice payment failed', { 
              userId: user.id,
              organizationId: orgId,
              invoiceId: invoice.id,
              reason: failureReason
            });
          }
          
          break;
        }
        
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          
          // Get customer ID
          const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;
          
          // Find user by Stripe customer ID
          const user = await getUserByCustomerId(firestore, customerId);
          
          if (!user) {
            logger.error('No user found for subscription update', { 
              customerId,
              subscriptionId: subscription.id
            });
            break;
          }
          
          // Determine subscription tier
          const subscriptionTier = await determineSubscriptionTier(stripe, subscription);
          
          // Get current period end date
          const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
          
          // Check if this is a seat-related update
          let updatedSeats = 1;
          let hasSeatUpdate = false;
          
          // Look for seat items in the subscription
          for (const item of subscription.items.data) {
            if (typeof item.price.product === 'object' && 
                item.price.product && 
                'metadata' in item.price.product && 
                item.price.product.metadata && 
                item.price.product.metadata.isSeat === 'true') {
              updatedSeats = item.quantity || 1;
              hasSeatUpdate = true;
              break;
            }
          }
          
          // For enterprise, ensure minimum 5 seats
          if (subscriptionTier === 'enterprise' && updatedSeats < 5) {
            updatedSeats = 5;
          }
          
          // If this user belongs to an organization, update organization as well
          const userData = user as any; // Type assertion to avoid TypeScript errors
          
          // Get the organization ID using the recommended approach
          const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
          
          // Check for deprecated organizationId property
          if (!orgId && userData.organizationId) {
            logger.warn('Deprecated: Using user.organizationId field', { 
              userId: user.id,
              deprecationReason: 'Use currentOrganizationId or personalOrganizationId instead' 
            });
          }
          
          if (orgId || userData.organizationId) {
            const finalOrgId = orgId || userData.organizationId;
            const orgRef = firestore.collection('organizations').doc(finalOrgId);
            const orgSnapshot = await orgRef.get();
            
            if (orgSnapshot.exists) {
              // Prepare update data
              const updateData: any = {
                'billing.subscriptionStatus': subscription.status,
                'billing.subscriptionTier': subscriptionTier,
                'billing.currentPeriodEnd': currentPeriodEnd,
                updatedAt: serverTimestamp()
              };
              
              // If this is a seat update, update seat count
              if (hasSeatUpdate) {
                updateData.seats = updatedSeats;
                
                logger.info('Updating organization seats', {
                  organizationId: finalOrgId,
                  previousSeats: orgSnapshot.data()?.seats || 1,
                  newSeats: updatedSeats
                });
                
                // Recalculate token allocation based on tier and new seat count
                const tokenAllocation = await calculateTokenAllocation(subscriptionTier, firestore, user.id);
                
                // Update token limits
                if (tokenAllocation > 0) {
                  updateData['usageQuota.aiTokens.limit'] = tokenAllocation;
                  
                  logger.info('Updating organization token allocation', {
                    organizationId: finalOrgId,
                    newTokenAllocation: tokenAllocation
                  });
                }
              }
              
              await orgRef.update(updateData);
              
              logger.info('Updated organization subscription status', {
                orgId: finalOrgId,
                subscriptionId: subscription.id,
                hasSeatUpdate,
                updatedSeats: hasSeatUpdate ? updatedSeats : 'unchanged'
              });
            }
          }
          
          // Log the subscription update
          await firestore.collection('subscriptionEvents').add({
            userId: user.id,
            eventType: 'subscription_updated',
            subscriptionId: subscription.id,
            status: subscription.status,
            subscriptionTier: subscriptionTier,
            currentPeriodEnd: currentPeriodEnd,
            hasSeatUpdate,
            updatedSeats: hasSeatUpdate ? updatedSeats : null,
            createdAt: serverTimestamp(),
          });
          
          logger.info('Subscription updated', { 
            userId: user.id,
            subscriptionId: subscription.id,
            status: subscription.status,
            tier: subscriptionTier,
            hasSeatUpdate,
            updatedSeats: hasSeatUpdate ? updatedSeats : 'unchanged'
          });
          
          await handleSubscriptionUpdated(subscription, referralService);
          
          break;
        }
        
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          
          // Check if this is an enterprise subscription
          const isEnterprise = subscription.metadata?.isEnterpriseQuote === 'true' || 
                              subscription.metadata?.tier === 'enterprise';
          
          if (isEnterprise) {
            logger.info('Processing enterprise subscription cancellation', {
              subscriptionId: subscription.id
            });
            
            // Get enterprise quote ID from metadata
            const quoteId = subscription.metadata?.quoteId;
            
            if (quoteId) {
              // Update the quote with cancellation information
              const quoteRef = firestore.collection('enterprise_quotes').doc(quoteId);
              const quoteSnapshot = await quoteRef.get();
              
              if (quoteSnapshot.exists) {
                await quoteRef.update({
                  billingStatus: 'canceled',
                  canceledAt: new Date((subscription as any).canceled_at * 1000),
                  updatedAt: serverTimestamp()
                });
                
                logger.info('Updated enterprise quote with cancellation information', {
                  quoteId,
                  subscriptionId: subscription.id
                });
              }
            }
            
            // Find the associated organization and update its status
            if (quoteId) {
              const orgsSnapshot = await firestore
                .collection('organizations')
                .where('enterpriseQuoteId', '==', quoteId)
                .limit(1)
                .get();
                
              if (!orgsSnapshot.empty) {
                const orgId = orgsSnapshot.docs[0].id;
                
                await firestore.collection('organizations').doc(orgId).update({
                  'billing.subscriptionStatus': 'canceled',
                  updatedAt: serverTimestamp()
                });
                
                logger.info('Updated organization subscription status', {
                  orgId,
                  subscriptionId: subscription.id
                });
              }
            }
          }
          
          // Also handle non-enterprise cancellations
          const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;
            
          if (customerId) {
            const user = await getUserByCustomerId(firestore, customerId);
            if (user) {
              const userData = user as any;
              const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
              
              if (orgId) {
                await firestore.collection('organizations').doc(orgId).update({
                  'billing.subscriptionStatus': 'canceled',
                  'billing.canceledAt': serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
                
                logger.info('Updated organization subscription status to canceled', {
                  orgId,
                  subscriptionId: subscription.id
                });
              }
            }
          }
          
          await handleSubscriptionDeleted(subscription, referralService);
          
          break;
        }
        
        // Add handlers for other events as needed
        default:
          logger.info('Unhandled Stripe event type', { type: event.type });
          break;
      }
      
      // Return success response
      return NextResponse.json({ 
        received: true,
        type: event.type,
        id: event.id,
        timestamp: new Date().toISOString()
      });
      
    } catch (dbError) {
      logger.error('Error handling Stripe webhook event', { 
        error: dbError, 
        eventType: event.type, 
        eventId: event.id 
      });
      
      return NextResponse.json({ 
        error: 'Server Error',
        message: 'Failed to process webhook event',
        type: event.type,
        endpoint: '/api/webhooks/stripe'
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('Unexpected error processing Stripe webhook', { error });
    
    return NextResponse.json({ 
      error: 'Server Error',
      message: 'Failed to process webhook',
      endpoint: '/api/webhooks/stripe'
    }, { status: 500 });
  }
}

/**
 * Handle checkout session completion (trial setup)
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, referralService: ReferralService) {
  try {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier;
    
    if (userId && tier) {
      // Update referral status to trial active
      await referralService.updateReferralOnTrialStart(userId, tier);
      
      logger.info('Updated referral on trial start', {
        userId,
        tier,
        sessionId: session.id
      });
    }
  } catch (error) {
    logger.error('Error handling checkout completion for referrals', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: session.id
    });
  }
}

/**
 * Handle invoice payment succeeded (potential referral completion)
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, referralService: ReferralService) {
  try {
    if (!(invoice as any).subscription) {
      return; // Not a subscription invoice
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
    
    // Check if this is the first payment after trial
    const isFirstPaymentAfterTrial = 
      subscription.status === 'active' &&
      (invoice as any).billing_reason === 'subscription_cycle' &&
      subscription.trial_end &&
      new Date(subscription.trial_end * 1000) < new Date();

    if (isFirstPaymentAfterTrial) {
      // Find user by customer ID
      const firestore = getFirestore();
      const userQuery = await firestore.collection('users')
        .where('stripeCustomerId', '==', invoice.customer)
        .limit(1)
        .get();

      if (!userQuery.empty) {
        const userId = userQuery.docs[0].id;
        
        // Process referral completion
        await referralService.processReferralCompletion(userId);
        
        logger.info('Processed referral completion on first payment', {
          userId,
          subscriptionId: subscription.id,
          invoiceId: invoice.id
        });
      }
    }
  } catch (error) {
    logger.error('Error handling invoice payment for referrals', {
      error: error instanceof Error ? error.message : String(error),
      invoiceId: invoice.id
    });
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription, referralService: ReferralService) {
  try {
    const userId = subscription.metadata?.userId;
    const tier = subscription.metadata?.tier;
    
    if (userId && tier && subscription.trial_end) {
      // Update referral status to trial active
      await referralService.updateReferralOnTrialStart(userId, tier);
      
      logger.info('Updated referral on subscription trial start', {
        userId,
        tier,
        subscriptionId: subscription.id,
        trialEnd: new Date(subscription.trial_end * 1000)
      });
    }
  } catch (error) {
    logger.error('Error handling subscription creation for referrals', {
      error: error instanceof Error ? error.message : String(error),
      subscriptionId: subscription.id
    });
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription, referralService: ReferralService) {
  try {
    const userId = subscription.metadata?.userId;
    
    if (userId) {
      // Check if subscription was cancelled
      if (subscription.cancel_at_period_end || subscription.status === 'canceled') {
        await referralService.cancelReferral(userId);
        
        logger.info('Cancelled referral due to subscription cancellation', {
          userId,
          subscriptionId: subscription.id
        });
      }
    }
  } catch (error) {
    logger.error('Error handling subscription update for referrals', {
      error: error instanceof Error ? error.message : String(error),
      subscriptionId: subscription.id
    });
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, referralService: ReferralService) {
  try {
    const userId = subscription.metadata?.userId;
    
    if (userId) {
      await referralService.cancelReferral(userId);
      
      logger.info('Cancelled referral due to subscription deletion', {
        userId,
        subscriptionId: subscription.id
      });
    }
  } catch (error) {
    logger.error('Error handling subscription deletion for referrals', {
      error: error instanceof Error ? error.message : String(error),
      subscriptionId: subscription.id
    });
  }
} 
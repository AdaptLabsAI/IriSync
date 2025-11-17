import Stripe from 'stripe';
import { logger } from '../../core/logging/logger';

/**
 * Initialize Stripe client
 * Validates environment variables at runtime (not at module load)
 */
export function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    logger.error('Stripe secret key not found in environment variables');
    throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.');
  }
  
  // Validate key format
  if (!apiKey.startsWith('sk_')) {
    logger.error('Stripe secret key appears to be invalid (should start with "sk_")');
    throw new Error('Stripe secret key is invalid');
  }
  
  return new Stripe(apiKey, {
    apiVersion: '2024-12-18.acacia', // Use the latest stable API version
  });
}

/**
 * Create a Stripe customer
 */
export async function createCustomer(
  email: string, 
  name?: string, 
  metadata?: Record<string, string>
): Promise<string> {
  try {
    const stripe = getStripeClient();
    
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });
    
    logger.info('Created Stripe customer', { email, customerId: customer.id });
    return customer.id;
  } catch (error) {
    logger.error('Failed to create Stripe customer', { 
      error: error instanceof Error ? error.message : String(error),
      email 
    });
    throw new Error('Failed to create customer');
  }
}

/**
 * Create a payment session for token purchase
 */
export async function createTokenPurchaseSession(
  customerId: string,
  priceId: string,
  quantity: number,
  metadata?: Record<string, string>
): Promise<{ sessionId: string; url: string }> {
  try {
    const stripe = getStripeClient();
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/tokens?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/tokens?canceled=true`,
      metadata: {
        type: 'token_purchase',
        tokenQuantity: quantity.toString(),
        ...metadata,
      },
    });
    
    logger.info('Created token purchase session', { 
      customerId, 
      sessionId: session.id,
      tokenQuantity: quantity 
    });
    
    return { 
      sessionId: session.id,
      url: session.url || '',
    };
  } catch (error) {
    logger.error('Failed to create token purchase session', { 
      error: error instanceof Error ? error.message : String(error),
      customerId,
      priceId,
      quantity
    });
    throw new Error('Failed to create token purchase session');
  }
}

/**
 * Create a subscription
 */
export async function createSubscription(
  customerId: string,
  priceId: string,
  quantity: number = 1,
  trialDays?: number,
  metadata?: Record<string, string>,
  couponId?: string
): Promise<string> {
  try {
    const stripe = getStripeClient();
    
    const subscriptionData: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [
        {
          price: priceId,
          quantity,
        },
      ],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        type: 'subscription',
        seats: quantity.toString(),
        ...metadata,
      },
    };
    
    // Add trial period if specified
    if (trialDays && trialDays > 0) {
      subscriptionData.trial_period_days = trialDays;
    }
    
    // Add coupon if specified
    if (couponId) {
      subscriptionData.coupon = couponId;
      logger.info('Applying coupon to subscription', { customerId, couponId });
    }
    
    const subscription = await stripe.subscriptions.create(subscriptionData);
    
    logger.info('Created subscription', { 
      customerId, 
      subscriptionId: subscription.id,
      seats: quantity,
      hasCoupon: !!couponId
    });
    
    return subscription.id;
  } catch (error) {
    logger.error('Failed to create subscription', { 
      error: error instanceof Error ? error.message : String(error),
      customerId,
      priceId,
      quantity,
      couponId
    });
    throw new Error('Failed to create subscription');
  }
}

/**
 * Update a subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  priceId: string,
  quantity: number
): Promise<void> {
  try {
    const stripe = getStripeClient();
    
    // Find the subscription item ID for the current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data'],
    });
    
    if (!subscription.items.data.length) {
      throw new Error('No subscription items found');
    }
    
    const subscriptionItemId = subscription.items.data[0].id;
    
    // Update the subscription
    await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: priceId,
          quantity,
        },
      ],
      metadata: {
        ...subscription.metadata,
        seats: quantity.toString(),
      },
      proration_behavior: 'create_prorations',
    });
    
    logger.info('Updated subscription', { 
      subscriptionId, 
      newPriceId: priceId,
      newQuantity: quantity 
    });
  } catch (error) {
    logger.error('Failed to update subscription', { 
      error: error instanceof Error ? error.message : String(error),
      subscriptionId,
      priceId,
      quantity
    });
    throw new Error('Failed to update subscription');
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelImmediately: boolean = false
): Promise<void> {
  try {
    const stripe = getStripeClient();

    if (cancelImmediately) {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscriptionId);
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    logger.info('Cancelled subscription', {
      subscriptionId,
      immediate: cancelImmediately
    });
  } catch (error) {
    logger.error('Failed to cancel subscription', {
      error: error instanceof Error ? error.message : String(error),
      subscriptionId,
      cancelImmediately
    });
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Create a trial subscription with required billing information
 * This creates a Checkout Session that collects billing info and starts a trial
 */
export async function createTrialCheckoutSession(
  customerId: string,
  priceId: string,
  trialDays: number,
  userId: string,
  userEmail: string
): Promise<{ sessionId: string; url: string }> {
  try {
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?trial=started`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/register?trial=canceled`,
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          userId,
          userEmail,
          tier: 'trial',
        },
      },
      payment_method_collection: 'always', // Require payment method upfront
      metadata: {
        type: 'trial_subscription',
        userId,
        userEmail,
      },
    });

    logger.info('Created trial checkout session', {
      customerId,
      sessionId: session.id,
      trialDays,
      userId
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  } catch (error) {
    logger.error('Failed to create trial checkout session', {
      error: error instanceof Error ? error.message : String(error),
      customerId,
      priceId,
      trialDays
    });
    throw new Error('Failed to create trial checkout session');
  }
}

/**
 * Create a subscription upgrade checkout session (from trial to paid)
 */
export async function createUpgradeCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  currentSubscriptionId?: string
): Promise<{ sessionId: string; url: string }> {
  try {
    const stripe = getStripeClient();

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/billing`,
      metadata: {
        type: 'upgrade_subscription',
        userId,
      },
    };

    // If there's an existing subscription, we'll cancel it after the new one is created
    if (currentSubscriptionId) {
      sessionData.subscription_data = {
        metadata: {
          previousSubscriptionId: currentSubscriptionId,
          userId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    logger.info('Created upgrade checkout session', {
      customerId,
      sessionId: session.id,
      userId,
      currentSubscriptionId
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  } catch (error) {
    logger.error('Failed to create upgrade checkout session', {
      error: error instanceof Error ? error.message : String(error),
      customerId,
      priceId
    });
    throw new Error('Failed to create upgrade checkout session');
  }
} 
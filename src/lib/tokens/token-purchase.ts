import { TokenService } from './token-service';
import { TokenRepository } from './token-repository';
import { NotificationService, NotificationPriority, NotificationCategory } from '@/lib/core/notifications/NotificationService';
import { firebaseAdmin } from '@/lib/core/firebase/admin';
import { calculateTokenPurchasePrice } from './token-tracker';
import { getStripeClient } from '@/lib/features/billing/stripe';
import { stripeConfig } from '@/environment';
import Stripe from 'stripe';
import { SubscriptionTier } from '../subscription/models/subscription';
import { SubscriptionStatus } from '../subscription/models/subscription';

/**
 * Token package size options
 */
export enum TokenPackageSize {
  SMALL = 0,
  MEDIUM = 1,
  LARGE = 2,
  XL = 3,
  PREMIUM = 4,
  HEAVY = 5,
  ENTERPRISE_PREMIUM = 6,
  ENTERPRISE_HEAVY = 7
}

/**
 * Token purchase package options with Stripe price IDs
 */
export const TOKEN_PACKAGES = [
  { 
    id: 'token-50', 
    tokens: 50, 
    price: 2500, // $25 in cents
    stripePriceId: stripeConfig.tokenPackages.token50,
    tier: 'all' as const
  },
  { 
    id: 'token-100', 
    tokens: 100, 
    price: 4500, // $45 in cents
    stripePriceId: stripeConfig.tokenPackages.token100,
    tier: 'all' as const
  },
  { 
    id: 'token-250', 
    tokens: 250, 
    price: 9000, // $90 in cents
    stripePriceId: stripeConfig.tokenPackages.token250,
    tier: 'all' as const
  },
  { 
    id: 'token-500', 
    tokens: 500, 
    price: 16000, // $160 in cents
    stripePriceId: stripeConfig.tokenPackages.token500,
    tier: 'all' as const
  },
  { 
    id: 'token-1000', 
    tokens: 1000, 
    price: 28000, // $280 in cents
    stripePriceId: stripeConfig.tokenPackages.token1000,
    tier: 'all' as const
  },
  { 
    id: 'token-2000', 
    tokens: 2000, 
    price: 50000, // $500 in cents
    stripePriceId: stripeConfig.tokenPackages.token2000,
    tier: 'all' as const
  },
  { 
    id: 'token-ent-1000', 
    tokens: 1000, 
    price: 25200, // $252 in cents (10% discount for Enterprise)
    stripePriceId: stripeConfig.tokenPackages.enterpriseToken1000,
    tier: SubscriptionTier.ENTERPRISE as const
  },
  { 
    id: 'token-ent-2000', 
    tokens: 2000, 
    price: 40000, // $400 in cents (20% discount for Enterprise)
    stripePriceId: stripeConfig.tokenPackages.enterpriseToken2000,
    tier: SubscriptionTier.ENTERPRISE as const
  }
];

/**
 * Interface for token purchase request
 */
export interface TokenPurchaseRequest {
  userId: string;
  organizationId?: string;
  tokenPackageId?: string;
  customTokenAmount?: number;
  paymentMethodId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Interface for token purchase response
 */
export interface TokenPurchaseResponse {
  success: boolean;
  message?: string;
  error?: string;
  redirectUrl?: string;
  paymentIntentId?: string;
  amount?: number;
  tokens?: number;
}

/**
 * Service for handling token purchases
 */
export class TokenPurchaseService {
  private tokenService: TokenService;
  
  constructor(
    tokenService: TokenService
  ) {
    this.tokenService = tokenService;
  }
  
  /**
   * Create a token purchase checkout session
   * @param request Token purchase request
   * @returns Token purchase response with checkout URL
   */
  async createCheckoutSession(request: TokenPurchaseRequest): Promise<TokenPurchaseResponse> {
    try {
      const { userId, tokenPackageId, customTokenAmount, successUrl, cancelUrl } = request;
      
      // Validate the user has an active subscription
      const subscription = await checkUserSubscription(userId);
      
      if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
        return {
          success: false,
          error: 'You need an active subscription to purchase additional tokens',
          message: 'Please subscribe to a plan first'
        };
      }
      
      // Determine token package and price ID
      let tokenPackage;
      let stripePriceId: string;
      
      if (tokenPackageId) {
        // Find the package
        tokenPackage = TOKEN_PACKAGES.find(pkg => pkg.id === tokenPackageId);
        
        if (!tokenPackage) {
          return {
            success: false,
            error: 'Invalid token package',
            message: 'The selected token package is not valid'
          };
        }
        
        // Check if user tier can purchase this package
        const userTier = subscription.tier;
        if (tokenPackage.tier !== 'all' && tokenPackage.tier !== userTier) {
          return {
            success: false,
            error: 'Package not available for your tier',
            message: 'This token package is not available for your subscription tier'
          };
        }
        
        stripePriceId = tokenPackage.stripePriceId || '';
        
        if (!stripePriceId) {
          return {
            success: false,
            error: 'Price ID not configured',
            message: 'Token package price ID is not configured in environment'
          };
        }
      } else if (customTokenAmount) {
        // For custom amounts, we'll use the closest package or create dynamic pricing
        // Find the best matching package or fall back to dynamic pricing
        if (customTokenAmount < 10 || customTokenAmount > 10000) {
          return {
            success: false,
            error: 'Invalid token amount',
            message: 'Custom token amount must be between 10 and 10,000'
          };
        }
        
        // For now, require users to select from predefined packages
        return {
          success: false,
          error: 'Custom amounts not supported',
          message: 'Please select from the available token packages'
        };
      } else {
        return {
          success: false,
          error: 'Missing token amount',
          message: 'Please specify a token package'
        };
      }
      
      // Get customer ID from subscription
      const stripeCustomerId = subscription.stripeCustomerId;
      
      if (!stripeCustomerId) {
        return {
          success: false,
          error: 'Missing customer information',
          message: 'Customer information not found'
        };
      }
      
      // Create checkout session using the predefined Stripe price ID
      const session = await getStripeClient().checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          tokenAmount: tokenPackage.tokens.toString(),
          tokenPackageId: tokenPackage.id,
          organizationId: request.organizationId || '',
          type: 'token_purchase'
        },
        mode: 'payment',
        success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?purchase=success&tokens=${tokenPackage.tokens}`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?purchase=canceled`,
      });
      
      return {
        success: true,
        redirectUrl: session.url!,
        amount: tokenPackage.price / 100, // Convert cents to dollars
        tokens: tokenPackage.tokens
      };
    } catch (error) {
      console.error('Error creating token purchase checkout:', error);
      return {
        success: false,
        error: 'Failed to create checkout session',
        message: (error as Error).message
      };
    }
  }
  
  /**
   * Process a successful token purchase
   * @param event Stripe webhook event
   * @returns True if processed successfully
   */
  async processSuccessfulPurchase(event: Stripe.Event): Promise<boolean> {
    try {
      if (event.type !== 'checkout.session.completed') {
        return false;
      }
      
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Verify this is a token purchase
      if (session.metadata?.type !== 'token_purchase') {
        return false;
      }
      
      const userId = session.metadata.userId;
      const tokenAmount = parseInt(session.metadata.tokenAmount, 10);
      
      if (!userId || isNaN(tokenAmount)) {
        console.error('Invalid metadata in token purchase session', session.metadata);
        return false;
      }
      
      // Add tokens to user's balance
      await this.tokenService.addTokens(
        userId,
        tokenAmount,
        session.metadata.organizationId || undefined,
        session.payment_intent as string
      );
      
      // Send purchase confirmation notification
      const notificationService = new NotificationService();
      await notificationService.sendNotification({
        userId,
        title: 'Token Purchase Successful',
        message: `Your purchase of ${tokenAmount} additional AI tokens is complete. These tokens have been added to your balance.`,
        priority: NotificationPriority.MEDIUM,
        category: NotificationCategory.BILLING,
        metadata: {
          tokenAmount,
          purchaseDate: new Date(),
          transactionId: session.payment_intent
        }
      });
      
      // Email notification is handled elsewhere or via Firebase functions

      return true;
    } catch (error) {
      console.error('Error processing token purchase:', error);
      return false;
    }
  }
  
  /**
   * Get token purchase packages with pricing information
   * @returns Array of token packages
   */
  getTokenPackages() {
    return TOKEN_PACKAGES.map(pkg => ({
      ...pkg,
      priceFormatted: `$${(pkg.price / 100).toFixed(2)}`,
      pricePerToken: `$${((pkg.price / 100) / pkg.tokens).toFixed(2)}`
    }));
  }
}

/**
 * Create a token purchase service instance with default services
 * @returns TokenPurchaseService instance
 */
export function createTokenPurchaseService(): TokenPurchaseService {
  const db = firebaseAdmin.firestore();
  const tokenRepository = new TokenRepository(db);
  const notificationService = new NotificationService();
  const tokenService = new TokenService(tokenRepository, notificationService);
  
  return new TokenPurchaseService(tokenService);
}

/**
 * Get token package details from TokenPackageSize enum
 */
export function getTokenPackageDetails(packageSize: TokenPackageSize): { tokens: number; price: number; name: string } {
  const pkg = TOKEN_PACKAGES[packageSize];
  if (!pkg) {
    throw new Error(`Invalid token package size: ${packageSize}`);
  }
  
  const priceInDollars = pkg.price / 100;
  
  let name = '';
  switch (packageSize) {
    case TokenPackageSize.SMALL:
      name = 'Small';
      break;
    case TokenPackageSize.MEDIUM:
      name = 'Medium';
      break;
    case TokenPackageSize.LARGE:
      name = 'Large';
      break;
    case TokenPackageSize.XL:
      name = 'XL';
      break;
    case TokenPackageSize.PREMIUM:
      name = 'Premium';
      break;
    case TokenPackageSize.HEAVY:
      name = 'Heavy User';
      break;
    case TokenPackageSize.ENTERPRISE_PREMIUM:
      name = 'Enterprise Premium';
      break;
    case TokenPackageSize.ENTERPRISE_HEAVY:
      name = 'Enterprise Heavy User';
      break;
    default:
      name = `Package ${packageSize}`;
  }
  
  return {
    tokens: pkg.tokens,
    price: priceInDollars,
    name
  };
}

/**
 * Check if user has an active subscription
 */
async function checkUserSubscription(userId: string) {
  const firestore = firebaseAdmin.firestore();
  
  // Get user data
  const userDoc = await firestore.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    return null;
  }
  
  const userData = userDoc.data();
  const orgId = userData?.currentOrganizationId || userData?.personalOrganizationId;
  
  if (!orgId) {
    return null;
  }
  
  // Get organization billing data
  const orgDoc = await firestore.collection('organizations').doc(orgId).get();
  if (!orgDoc.exists) {
    return null;
  }
  
  const orgData = orgDoc.data();
  const billing = orgData?.billing;
  
  if (!billing) {
    return null;
  }
  
  return {
    status: billing.subscriptionStatus === 'active' ? SubscriptionStatus.ACTIVE : SubscriptionStatus.CANCELED,
    tier: billing.subscriptionTier,
    stripeCustomerId: userData?.stripeCustomerId
  };
}

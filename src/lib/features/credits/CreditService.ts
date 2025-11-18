/**
 * Credit Service
 *
 * Manages user credits for AI toolkit usage.
 * Credits are consumed when using AI features (chat, content generation, etc.)
 * Admin users have unlimited credits.
 *
 * Pricing Structure:
 * - Starter: 100 credits - $10 ($0.10/credit)
 * - Growth: 500 credits - $40 ($0.08/credit)
 * - Pro: 1,000 credits - $70 ($0.07/credit)
 * - Enterprise: 5,000 credits - $300 ($0.06/credit)
 *
 * STATUS: INACTIVE - Awaiting Stripe Price IDs configuration
 * The credit system is implemented but not active until Stripe Price IDs are provided.
 * Set CREDIT_SYSTEM_ACTIVE=true in environment variables to enable.
 */

import { firestore } from '@/lib/core/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  Timestamp,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
} from 'firebase/firestore';

/**
 * Credit bundle tiers
 */
export enum CreditBundle {
  STARTER = 'starter',
  GROWTH = 'growth',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

/**
 * Credit bundle details
 */
export interface CreditBundleDetails {
  bundle: CreditBundle;
  credits: number;
  price: number; // in cents
  priceFormatted: string;
  savingsPercent: number;
  stripePriceId?: string; // To be set by admin
}

/**
 * Credit bundles configuration
 */
export const CREDIT_BUNDLES: Record<CreditBundle, CreditBundleDetails> = {
  [CreditBundle.STARTER]: {
    bundle: CreditBundle.STARTER,
    credits: 100,
    price: 1000, // $10.00
    priceFormatted: '$10.00',
    savingsPercent: 0,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_CREDITS_PRICE_ID,
  },
  [CreditBundle.GROWTH]: {
    bundle: CreditBundle.GROWTH,
    credits: 500,
    price: 4000, // $40.00
    priceFormatted: '$40.00',
    savingsPercent: 20,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_CREDITS_PRICE_ID,
  },
  [CreditBundle.PRO]: {
    bundle: CreditBundle.PRO,
    credits: 1000,
    price: 7000, // $70.00
    priceFormatted: '$70.00',
    savingsPercent: 30,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_CREDITS_PRICE_ID,
  },
  [CreditBundle.ENTERPRISE]: {
    bundle: CreditBundle.ENTERPRISE,
    credits: 5000,
    price: 30000, // $300.00
    priceFormatted: '$300.00',
    savingsPercent: 40,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_CREDITS_PRICE_ID,
  },
};

/**
 * AI operation types and their credit costs
 */
export enum AIOperation {
  CHAT_BASIC = 'chat_basic',
  CHAT_COMPLEX = 'chat_complex',
  CONTENT_GENERATION = 'content_generation',
  CONTENT_OPTIMIZATION = 'content_optimization',
  HASHTAG_SUGGESTIONS = 'hashtag_suggestions',
  SMART_REPLY = 'smart_reply',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  BATCH_SENTIMENT = 'batch_sentiment',
  IMAGE_ANALYSIS = 'image_analysis',
}

/**
 * Credit costs for operations
 */
export const OPERATION_COSTS: Record<AIOperation, number> = {
  [AIOperation.CHAT_BASIC]: 1,
  [AIOperation.CHAT_COMPLEX]: 5,
  [AIOperation.CONTENT_GENERATION]: 5,
  [AIOperation.CONTENT_OPTIMIZATION]: 3,
  [AIOperation.HASHTAG_SUGGESTIONS]: 2,
  [AIOperation.SMART_REPLY]: 3,
  [AIOperation.SENTIMENT_ANALYSIS]: 1,
  [AIOperation.BATCH_SENTIMENT]: 1, // Per item, volume discount applied
  [AIOperation.IMAGE_ANALYSIS]: 5,
};

/**
 * Credit transaction record
 */
export interface CreditTransaction {
  id?: string;
  userId: string;
  organizationId: string;
  type: 'purchase' | 'deduction' | 'refund' | 'bonus';
  amount: number; // Positive for additions, negative for deductions
  balance: number; // Balance after transaction
  operation?: AIOperation;
  bundle?: CreditBundle;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * User credit balance
 */
export interface CreditBalance {
  userId: string;
  organizationId: string;
  balance: number;
  isUnlimited: boolean; // True for admin users
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastPurchaseAt?: Date;
  updatedAt: Date;
}

class CreditService {
  private readonly BALANCES_COLLECTION = 'creditBalances';
  private readonly TRANSACTIONS_COLLECTION = 'creditTransactions';

  /**
   * Credit system active status
   * Set to true once Stripe Price IDs are configured
   */
  private readonly ACTIVE = process.env.CREDIT_SYSTEM_ACTIVE === 'true' || false;

  /**
   * Check if credit system is active
   */
  isActive(): boolean {
    return this.ACTIVE;
  }

  /**
   * Get user's credit balance
   */
  async getBalance(userId: string, organizationId: string): Promise<CreditBalance> {
    try {
      const balanceDoc = await getDoc(
        doc(firestore, this.BALANCES_COLLECTION, `${userId}_${organizationId}`)
      );

      if (!balanceDoc.exists()) {
        // Create initial balance
        const initialBalance: CreditBalance = {
          userId,
          organizationId,
          balance: 0,
          isUnlimited: false,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
          updatedAt: new Date(),
        };

        await this.createBalance(userId, organizationId);
        return initialBalance;
      }

      const data = balanceDoc.data();
      return {
        userId: data.userId,
        organizationId: data.organizationId,
        balance: data.balance || 0,
        isUnlimited: data.isUnlimited || false,
        lifetimeEarned: data.lifetimeEarned || 0,
        lifetimeSpent: data.lifetimeSpent || 0,
        lastPurchaseAt: data.lastPurchaseAt?.toDate(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error getting credit balance:', error);
      throw new Error('Failed to get credit balance');
    }
  }

  /**
   * Create initial balance for user
   */
  private async createBalance(userId: string, organizationId: string): Promise<void> {
    try {
      // Check if user is admin (has admin role in Firestore)
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      const isAdmin = userDoc.exists() && userDoc.data().role === 'super_admin';

      await updateDoc(
        doc(firestore, this.BALANCES_COLLECTION, `${userId}_${organizationId}`),
        {
          userId,
          organizationId,
          balance: 0,
          isUnlimited: isAdmin,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
          updatedAt: Timestamp.now(),
        }
      );
    } catch (error) {
      // Document doesn't exist, create it
      await addDoc(collection(firestore, this.BALANCES_COLLECTION), {
        userId,
        organizationId,
        balance: 0,
        isUnlimited: false,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        updatedAt: Timestamp.now(),
      });
    }
  }

  /**
   * Check if user has sufficient credits for operation
   */
  async hasCredits(
    userId: string,
    organizationId: string,
    operation: AIOperation,
    quantity: number = 1
  ): Promise<{ hasCredits: boolean; balance: number; required: number }> {
    // If credit system is not active, allow all operations
    if (!this.ACTIVE) {
      return { hasCredits: true, balance: Infinity, required: 0 };
    }

    const balance = await this.getBalance(userId, organizationId);

    // Admin always has credits
    if (balance.isUnlimited) {
      return { hasCredits: true, balance: Infinity, required: 0 };
    }

    const required = this.calculateCost(operation, quantity);
    return {
      hasCredits: balance.balance >= required,
      balance: balance.balance,
      required,
    };
  }

  /**
   * Calculate cost for operation
   */
  calculateCost(operation: AIOperation, quantity: number = 1): number {
    const baseCost = OPERATION_COSTS[operation];

    // Apply volume discount for batch operations
    if (operation === AIOperation.BATCH_SENTIMENT && quantity > 10) {
      // 10% discount for 10-50 items, 20% for 50+
      const discount = quantity > 50 ? 0.8 : 0.9;
      return Math.ceil(baseCost * quantity * discount);
    }

    return baseCost * quantity;
  }

  /**
   * Deduct credits for operation
   */
  async deductCredits(
    userId: string,
    organizationId: string,
    operation: AIOperation,
    quantity: number = 1,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    try {
      // If credit system is not active, skip deduction
      if (!this.ACTIVE) {
        return { success: true, newBalance: Infinity };
      }

      const balance = await this.getBalance(userId, organizationId);

      // Admin has unlimited credits
      if (balance.isUnlimited) {
        return { success: true, newBalance: Infinity };
      }

      const cost = this.calculateCost(operation, quantity);

      if (balance.balance < cost) {
        return {
          success: false,
          newBalance: balance.balance,
          error: `Insufficient credits. Required: ${cost}, Available: ${balance.balance}`,
        };
      }

      // Deduct credits
      const balanceRef = doc(firestore, this.BALANCES_COLLECTION, `${userId}_${organizationId}`);
      await updateDoc(balanceRef, {
        balance: increment(-cost),
        lifetimeSpent: increment(cost),
        updatedAt: Timestamp.now(),
      });

      const newBalance = balance.balance - cost;

      // Record transaction
      await this.recordTransaction({
        userId,
        organizationId,
        type: 'deduction',
        amount: -cost,
        balance: newBalance,
        operation,
        description: `Used ${cost} credits for ${operation}`,
        metadata,
        createdAt: new Date(),
      });

      return { success: true, newBalance };
    } catch (error) {
      console.error('Error deducting credits:', error);
      return {
        success: false,
        newBalance: 0,
        error: 'Failed to deduct credits',
      };
    }
  }

  /**
   * Add credits to user account (from purchase or bonus)
   */
  async addCredits(
    userId: string,
    organizationId: string,
    amount: number,
    type: 'purchase' | 'bonus' | 'refund',
    bundle?: CreditBundle,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      const balanceRef = doc(firestore, this.BALANCES_COLLECTION, `${userId}_${organizationId}`);

      // Update balance
      await updateDoc(balanceRef, {
        balance: increment(amount),
        lifetimeEarned: increment(amount),
        lastPurchaseAt: type === 'purchase' ? Timestamp.now() : undefined,
        updatedAt: Timestamp.now(),
      });

      const balance = await this.getBalance(userId, organizationId);
      const newBalance = balance.balance + amount;

      // Record transaction
      await this.recordTransaction({
        userId,
        organizationId,
        type,
        amount,
        balance: newBalance,
        bundle,
        description: bundle
          ? `Purchased ${CREDIT_BUNDLES[bundle].credits} credits (${bundle} bundle)`
          : `Added ${amount} credits (${type})`,
        metadata,
        createdAt: new Date(),
      });

      return { success: true, newBalance };
    } catch (error) {
      console.error('Error adding credits:', error);
      return { success: false, newBalance: 0 };
    }
  }

  /**
   * Record credit transaction
   */
  private async recordTransaction(transaction: CreditTransaction): Promise<void> {
    try {
      await addDoc(collection(firestore, this.TRANSACTIONS_COLLECTION), {
        ...transaction,
        createdAt: Timestamp.fromDate(transaction.createdAt),
      });
    } catch (error) {
      console.error('Error recording transaction:', error);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    organizationId: string,
    limitCount: number = 50
  ): Promise<CreditTransaction[]> {
    try {
      const transactionsQuery = query(
        collection(firestore, this.TRANSACTIONS_COLLECTION),
        where('userId', '==', userId),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );

      const transactionsDocs = await getDocs(transactionsQuery);
      const transactions: CreditTransaction[] = [];

      transactionsDocs.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          userId: data.userId,
          organizationId: data.organizationId,
          type: data.type,
          amount: data.amount,
          balance: data.balance,
          operation: data.operation,
          bundle: data.bundle,
          description: data.description,
          metadata: data.metadata,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      return transactions;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Set unlimited credits for admin
   */
  async setUnlimitedCredits(userId: string, organizationId: string): Promise<void> {
    try {
      const balanceRef = doc(firestore, this.BALANCES_COLLECTION, `${userId}_${organizationId}`);
      await updateDoc(balanceRef, {
        isUnlimited: true,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error setting unlimited credits:', error);
      throw new Error('Failed to set unlimited credits');
    }
  }

  /**
   * Get recommended bundle based on usage
   */
  async getRecommendedBundle(
    userId: string,
    organizationId: string
  ): Promise<CreditBundle> {
    const transactions = await this.getTransactionHistory(userId, organizationId, 100);
    const deductions = transactions.filter(t => t.type === 'deduction');

    // Calculate average monthly usage
    const totalSpent = deductions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const monthsOfData = Math.max(1, deductions.length > 0 ? 1 : 1); // Simplified
    const avgMonthlyUsage = totalSpent / monthsOfData;

    // Recommend based on monthly usage
    if (avgMonthlyUsage < 100) {
      return CreditBundle.STARTER;
    } else if (avgMonthlyUsage < 500) {
      return CreditBundle.GROWTH;
    } else if (avgMonthlyUsage < 1000) {
      return CreditBundle.PRO;
    } else {
      return CreditBundle.ENTERPRISE;
    }
  }
}

// Export singleton instance
export const creditService = new CreditService();

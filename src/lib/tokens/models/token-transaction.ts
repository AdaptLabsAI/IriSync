import { AITaskType } from '../../ai/models/AITask';

/**
 * Types of token transactions
 */
export enum TokenTransactionType {
  // Additions
  SUBSCRIPTION_ALLOCATION = 'subscription_allocation',
  MANUAL_ADDITION = 'manual_addition',
  PURCHASE = 'purchase',
  REFUND = 'refund',
  CREDIT = 'credit',
  PROMOTIONAL = 'promotional',
  
  // Deductions
  AI_USAGE = 'ai_usage',
  MANUAL_DEDUCTION = 'manual_deduction',
  EXPIRED = 'expired',
  REFUNDED = 'refunded'
}

/**
 * Payment methods for token purchases
 */
export enum TokenPaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  CRYPTO = 'crypto',
  INTERNAL_CREDIT = 'internal_credit'
}

/**
 * Status of a token transaction
 */
export enum TokenTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

/**
 * Base interface for all token transactions
 */
export interface TokenTransaction {
  /**
   * Unique ID of the transaction
   */
  id?: string;
  
  /**
   * User ID associated with the transaction
   */
  userId: string;
  
  /**
   * Organization ID (if applicable)
   */
  organizationId?: string;
  
  /**
   * Number of tokens involved in the transaction (positive for additions, negative for deductions)
   */
  amount: number;
  
  /**
   * Type of transaction
   */
  type: TokenTransactionType;
  
  /**
   * Status of the transaction
   */
  status: TokenTransactionStatus;
  
  /**
   * Timestamp when the transaction occurred
   */
  timestamp: Date;
  
  /**
   * Description of the transaction
   */
  description?: string;
  
  /**
   * Reference ID (e.g., Stripe payment ID, task ID)
   */
  referenceId?: string;
  
  /**
   * Additional metadata about the transaction
   */
  metadata?: Record<string, any>;
  
  /**
   * ID of the admin who performed the transaction (if applicable)
   */
  performedBy?: string;
  
  /**
   * Whether this transaction was automatically generated
   */
  isAutomatic: boolean;
}

/**
 * Interface for token usage transactions
 */
export interface TokenUsageTransaction extends TokenTransaction {
  /**
   * Type of transaction (always AI_USAGE for usage)
   */
  type: TokenTransactionType.AI_USAGE;
  
  /**
   * AI task type associated with the usage
   */
  taskType: AITaskType;
  
  /**
   * AI provider used
   */
  provider: string;
  
  /**
   * Model used
   */
  model: string;
  
  /**
   * Token breakdown for API usage
   */
  tokenBreakdown?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Interface for token purchase transactions
 */
export interface TokenPurchaseTransaction extends TokenTransaction {
  /**
   * Type of transaction (always PURCHASE for purchases)
   */
  type: TokenTransactionType.PURCHASE;
  
  /**
   * Amount paid in cents (USD)
   */
  amountPaid: number;
  
  /**
   * Currency used for payment
   */
  currency: string;
  
  /**
   * Payment method used
   */
  paymentMethod: TokenPaymentMethod;
  
  /**
   * Payment provider ID (e.g., Stripe)
   */
  paymentProviderId: string;
  
  /**
   * Payment provider reference ID
   */
  paymentReferenceId: string;
  
  /**
   * Date when the purchase was initiated
   */
  purchaseDate: Date;
  
  /**
   * Receipt URL (if available)
   */
  receiptUrl?: string;
  
  /**
   * Invoice ID (if available)
   */
  invoiceId?: string;
}

/**
 * Interface for subscription allocation transactions
 */
export interface SubscriptionAllocationTransaction extends TokenTransaction {
  /**
   * Type of transaction (always SUBSCRIPTION_ALLOCATION for subscription allocations)
   */
  type: TokenTransactionType.SUBSCRIPTION_ALLOCATION;
  
  /**
   * Subscription ID
   */
  subscriptionId: string;
  
  /**
   * Billing period start date
   */
  periodStart: Date;
  
  /**
   * Billing period end date
   */
  periodEnd: Date;
}

/**
 * Interface for manual adjustment transactions (admin actions)
 */
export interface ManualAdjustmentTransaction extends TokenTransaction {
  /**
   * Type of transaction (MANUAL_ADDITION or MANUAL_DEDUCTION)
   */
  type: TokenTransactionType.MANUAL_ADDITION | TokenTransactionType.MANUAL_DEDUCTION;
  
  /**
   * Reason for the adjustment
   */
  reason: string;
  
  /**
   * Admin note
   */
  adminNote?: string;
  
  /**
   * Support ticket ID (if applicable)
   */
  ticketId?: string;
}

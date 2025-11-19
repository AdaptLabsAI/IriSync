import { getFirebaseFirestore } from '../core/firebase';
import { Firestore, collection, query, where, limit, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStripeClient } from '../features/billing/stripe';
import { logger } from '../core/logging/logger';

/**
 * Service to handle verification for trial accounts
 * Manages both payment method verification and social account verification
 */
export class VerificationService {
  private getFirestore() {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Firestore not configured');
    return firestore;
  }

  private readonly VERIFIED_USERS_COLLECTION = 'verified_users';
  
  /**
   * Verify a user's payment method with Stripe
   * @param customerId Stripe customer ID
   * @param paymentMethodId Payment method ID to verify
   * @returns True if payment method is valid
   */
  async verifyPaymentMethod(customerId: string, paymentMethodId: string): Promise<boolean> {
    try {
      const stripe = getStripeClient();
      
      // Attempt to attach the payment method to the customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      
      // Set as the default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
      // Run a $0 authorization to verify the card is valid
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 0,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
      });
      
      const isVerified = paymentIntent.status === 'succeeded';
      
      // Log the verification result
      logger.info('Payment method verification', { 
        customerId, 
        paymentMethodId, 
        verified: isVerified 
      });
      
      return isVerified;
    } catch (error) {
      logger.error('Payment method verification failed', { 
        customerId, 
        paymentMethodId, 
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }
  
  /**
   * Verify a user's social media accounts
   * Requires at least one connected account
   * @param userId User ID
   * @returns True if social accounts are verified
   */
  async verifySocialAccounts(userId: string): Promise<boolean> {
    try {
      // Check if the user has any connected social accounts
      const socialAccountsCollection = collection(this.getFirestore(), 'social_accounts');
      const socialAccountsQuery = query(
        socialAccountsCollection,
        where('userId', '==', userId),
        limit(1)
      );
      
      const socialAccountsSnapshot = await getDocs(socialAccountsQuery);
      
      const isVerified = !socialAccountsSnapshot.empty;
      
      // Log the verification result
      logger.info('Social account verification', { 
        userId, 
        verified: isVerified 
      });
      
      return isVerified;
    } catch (error) {
      logger.error('Social account verification failed', { 
        userId, 
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }
  
  /**
   * Store verification status for a user
   * @param userId User ID
   * @param verificationData Verification data
   * @returns True if stored successfully
   */
  async storeVerificationStatus(
    userId: string,
    verificationData: {
      paymentMethodVerified: boolean;
      paymentMethodId?: string;
      socialAccountsVerified: boolean;
      verifiedAt: Date;
    }
  ): Promise<boolean> {
    try {
      const userDocRef = doc(this.getFirestore(), this.VERIFIED_USERS_COLLECTION, userId);
      await setDoc(userDocRef, {
        ...verificationData,
        updatedAt: new Date()
      }, { merge: true });
      
      return true;
    } catch (error) {
      logger.error('Failed to store verification status', { 
        userId, 
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }
  
  /**
   * Check if a user has been verified
   * @param userId User ID
   * @returns Verification status
   */
  async getVerificationStatus(userId: string): Promise<{
    paymentMethodVerified: boolean;
    paymentMethodId?: string;
    socialAccountsVerified: boolean;
    verifiedAt?: Date;
  } | null> {
    try {
      const userDocRef = doc(this.getFirestore(), this.VERIFIED_USERS_COLLECTION, userId);
      const docSnap = await getDoc(userDocRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return docSnap.data() as {
        paymentMethodVerified: boolean;
        paymentMethodId?: string;
        socialAccountsVerified: boolean;
        verifiedAt: Date;
      };
    } catch (error) {
      logger.error('Failed to get verification status', { 
        userId, 
        error: error instanceof Error ? error.message : String(error)
      });
      
      return null;
    }
  }
  
  /**
   * Check if the user meets the verification requirements for a trial
   * Either payment method OR social accounts must be verified
   * @param userId User ID
   * @returns True if user meets verification requirements
   */
  async meetsTrialRequirements(userId: string): Promise<boolean> {
    const status = await this.getVerificationStatus(userId);
    
    if (!status) {
      return false;
    }
    
    // User must have either payment method OR social accounts verified
    return status.paymentMethodVerified || status.socialAccountsVerified;
  }
} 
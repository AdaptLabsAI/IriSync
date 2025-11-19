import { getFirebaseFirestore } from '../core/firebase';
import { Firestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { SubscriptionTier } from '../subscription/utils';
import unifiedEmailService from '../core/notifications/unified-email-service';
import { firestore } from '@/lib/core/firebase';

/**
 * Token purchase record
 */
export interface TokenPurchase {
  id: string;
  userId: string;
  organizationId?: string;
  tokenAmount: number;
  price: number;
  currency: string;
  purchaseDate: Date;
  expiryDate?: Date; // Optional, only if tokens expire
  isProcessed: boolean;
  transactionId?: string;
  paymentMethod: string;
  receipt?: string;
  notes?: string;
}

/**
 * Token balance record with individual billing cycle tracking
 */
export interface TokenBalance {
  userId: string;
  organizationId?: string;
  includedTokens: number;     // Monthly tokens that reset based on subscription tier
  purchasedTokens: number;    // Additional purchased tokens (carries over)
  totalUsedTokens: number;    // Total tokens used this billing period
  lastRefreshDate: Date;      // When tokens were last refreshed
  nextRefreshDate: Date;      // When next refresh should occur (user's billing cycle)
  billingCycleStartDate: Date; // When user's billing cycle started
  subscriptionStartDate: Date; // When user first subscribed (for calculating cycles)
}

/**
 * Token package
 */
export interface TokenPackage {
  id: string;
  name: string;
  tokenAmount: number;
  price: number;
  currency: string;
  isActive: boolean;
  tier: SubscriptionTier | 'all'; // Which tier this package is available for
}

/**
 * Service for managing token purchases and balances with individual billing cycles
 */
export class TokenPurchaseService {
  private getFirestore() {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Firestore not configured');
    return firestore;
  }

  private readonly PURCHASE_COLLECTION = 'token_purchases';
  private readonly BALANCE_COLLECTION = 'token_balances';
  private readonly PACKAGE_COLLECTION = 'token_packages';
  
  /**
   * Get the token balance for a user
   */
  async getTokenBalance(userId: string, organizationId?: string): Promise<TokenBalance | null> {
    try {
      // Query for the user's token balance
      let q = query(
        collection(this.getFirestore(), this.BALANCE_COLLECTION),
        where('userId', '==', userId),
        ...(organizationId ? [where('organizationId', '==', organizationId)] : []),
        limit(1)
      );
      
      const balanceSnapshot = await getDocs(q);
      
      if (balanceSnapshot.empty) {
        // If no balance record exists, create one based on subscription tier
        return this.initializeTokenBalance(userId, organizationId);
      }
      
      const balance = balanceSnapshot.docs[0].data() as TokenBalance;
      
      // Check if this user's tokens need refresh based on their individual billing cycle
      const now = new Date();
      if (now >= balance.nextRefreshDate) {
        await this.refreshUserTokens(userId, organizationId);
        // Get the updated balance
        const updatedSnapshot = await getDocs(q);
        return updatedSnapshot.docs[0]?.data() as TokenBalance;
      }
      
      return balance;
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw new Error('Failed to get token balance');
    }
  }
  
  /**
   * Initialize a token balance for a user based on their subscription tier and billing cycle
   */
  async initializeTokenBalance(userId: string, organizationId?: string): Promise<TokenBalance> {
    try {
      // Get the user's subscription tier
      const tier = await getSubscriptionTier(userId);
      
      // Get user's subscription start date from their subscription or organization
      let subscriptionStartDate = new Date();
      
      if (organizationId) {
        const orgDoc = await getDoc(doc(this.getFirestore(), 'organizations', organizationId));
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          subscriptionStartDate = orgData.billing?.subscriptionStartDate?.toDate() || new Date();
        }
      } else {
        // Get from user's subscription record
        const userDoc = await getDoc(doc(this.getFirestore(), 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          subscriptionStartDate = userData.subscriptionStartDate?.toDate() || new Date();
        }
      }
      
      // Get seat count for token calculation
      let seatCount = 1; // Default to 1 seat
      if (organizationId) {
        const orgDocRef = doc(collection(this.getFirestore(), 'organizations'), organizationId);
        const orgDocSnap = await getDoc(orgDocRef);
        
        if (orgDocSnap.exists()) {
          const orgData = orgDocSnap.data();
          seatCount = orgData?.seats || orgData?.seatCount || 1;
        }
      }
      
      // Determine included tokens based on tier and seat count
      let includedTokens = 0;
      
      switch (tier) {
        case SubscriptionTier.CREATOR:
          // Creator: 100 tokens per seat, max 3 seats
          const creatorSeats = Math.min(seatCount, 3);
          includedTokens = creatorSeats * 100;
          break;
        case SubscriptionTier.INFLUENCER:
          // Influencer: 500 tokens per seat, max 10 seats
          const influencerSeats = Math.min(seatCount, 10);
          includedTokens = influencerSeats * 500;
          break;
        case SubscriptionTier.ENTERPRISE:
          // Enterprise: 5000 base + 500 per additional seat beyond 5
          includedTokens = 5000; // Base amount for minimum 5 seats
          const additionalSeats = Math.max(0, seatCount - 5);
          includedTokens += additionalSeats * 500;
          break;
        default:
          includedTokens = 0;
          break;
      }
      
      // Calculate next refresh date based on user's billing cycle
      const now = new Date();
      const nextRefreshDate = this.calculateNextBillingDate(subscriptionStartDate);
      
      // Create token balance record
      const tokenBalance: TokenBalance = {
        userId,
        organizationId,
        includedTokens,
        purchasedTokens: 0,
        totalUsedTokens: 0,
        lastRefreshDate: now,
        nextRefreshDate,
        billingCycleStartDate: subscriptionStartDate,
        subscriptionStartDate
      };
      
      // Store in Firestore
      const balanceDocRef = doc(collection(this.getFirestore(), this.BALANCE_COLLECTION), userId);
      await setDoc(balanceDocRef, tokenBalance);
      
      return tokenBalance;
    } catch (error) {
      console.error('Error initializing token balance:', error);
      throw new Error('Failed to initialize token balance');
    }
  }
  
  /**
   * Calculate the next billing date based on the subscription start date
   */
  private calculateNextBillingDate(subscriptionStartDate: Date): Date {
    const now = new Date();
    const startDay = subscriptionStartDate.getDate();
    
    // Start with current month, same day as subscription started
    let nextBilling = new Date(now.getFullYear(), now.getMonth(), startDay);
    
    // If the date has already passed this month, move to next month
    if (nextBilling <= now) {
      nextBilling = new Date(now.getFullYear(), now.getMonth() + 1, startDay);
    }
    
    // Handle edge case where the day doesn't exist in next month (e.g., Jan 31 -> Feb 31)
    if (nextBilling.getDate() !== startDay) {
      // Use the last day of the month instead
      nextBilling = new Date(nextBilling.getFullYear(), nextBilling.getMonth() + 1, 0);
    }
    
    return nextBilling;
  }
  
  /**
   * Refresh tokens for a specific user based on their billing cycle
   */
  async refreshUserTokens(userId: string, organizationId?: string): Promise<boolean> {
    try {
      console.log(`Refreshing tokens for user ${userId} based on their billing cycle`);
      
      // Get current balance
      const q = query(
        collection(this.getFirestore(), this.BALANCE_COLLECTION),
        where('userId', '==', userId),
        ...(organizationId ? [where('organizationId', '==', organizationId)] : []),
        limit(1)
      );
      
      const balanceSnapshot = await getDocs(q);
      if (balanceSnapshot.empty) {
        return false;
      }
      
      const balanceDoc = balanceSnapshot.docs[0];
      const balance = balanceDoc.data() as TokenBalance;
      
             // Get subscription tier to determine new included token amount
       const tier = await getSubscriptionTier(userId);
       
       // Get seat count for token calculation
       let seatCount = 1; // Default to 1 seat
       if (balance.organizationId) {
         const orgDocRef = doc(collection(this.getFirestore(), 'organizations'), balance.organizationId);
         const orgDocSnap = await getDoc(orgDocRef);
         
         if (orgDocSnap.exists()) {
           const orgData = orgDocSnap.data();
           seatCount = orgData?.seats || orgData?.seatCount || 1;
         }
       }
       
       // Calculate new included tokens based on tier and seat count
       let newIncludedTokens = 0;
       
       switch (tier) {
         case SubscriptionTier.CREATOR:
           // Creator: 100 tokens per seat, max 3 seats
           const creatorSeats = Math.min(seatCount, 3);
           newIncludedTokens = creatorSeats * 100;
           break;
         case SubscriptionTier.INFLUENCER:
           // Influencer: 500 tokens per seat, max 10 seats
           const influencerSeats = Math.min(seatCount, 10);
           newIncludedTokens = influencerSeats * 500;
           break;
         case SubscriptionTier.ENTERPRISE:
           // Enterprise: 5000 base + 500 per additional seat beyond 5
           newIncludedTokens = 5000; // Base amount for minimum 5 seats
           const additionalSeats = Math.max(0, seatCount - 5);
           newIncludedTokens += additionalSeats * 500;
           break;
       }
      
      // Calculate next billing date
      const nextRefreshDate = this.calculateNextBillingDate(balance.subscriptionStartDate);
      
      // Update the balance
      await updateDoc(balanceDoc.ref, {
        includedTokens: newIncludedTokens,
        totalUsedTokens: 0, // Reset used tokens
        lastRefreshDate: new Date(),
        nextRefreshDate,
        billingCycleStartDate: new Date() // Update billing cycle start
      });
      
      console.log(`Successfully refreshed tokens for user ${userId}`, {
        newIncludedTokens,
        nextRefreshDate: nextRefreshDate.toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error refreshing user tokens:', error);
      return false;
    }
  }
  
  /**
   * Refresh tokens for all users whose billing cycle has come due
   * This replaces the monthly universal refresh with individual billing cycles
   */
  async refreshMonthlyTokens(): Promise<number> {
    try {
      const now = new Date();
      
      // Get all balances that need refresh (where nextRefreshDate <= now)
      const q = query(
        collection(this.getFirestore(), this.BALANCE_COLLECTION),
        where('nextRefreshDate', '<=', now)
      );
      
      const balancesSnapshot = await getDocs(q);
      
      if (balancesSnapshot.empty) {
        console.log('No token balances need refresh at this time');
        return 0;
      }
      
      console.log(`Found ${balancesSnapshot.size} users whose billing cycles are due for refresh`);
      
      // Process each balance individually
      let count = 0;
      
      for (const docSnapshot of balancesSnapshot.docs) {
        const balance = docSnapshot.data() as TokenBalance;
        
        try {
          const success = await this.refreshUserTokens(balance.userId, balance.organizationId);
          if (success) {
            count++;
          }
        } catch (error) {
          console.error(`Failed to refresh tokens for user ${balance.userId}:`, error);
        }
      }
      
      console.log(`Successfully refreshed tokens for ${count} users`);
      return count;
    } catch (error) {
      console.error('Error refreshing monthly tokens:', error);
      throw new Error('Failed to refresh monthly tokens');
    }
  }
  
  /**
   * Purchase additional tokens
   */
  async purchaseTokens(
    userId: string,
    packageId: string,
    paymentMethod: string,
    organizationId?: string
  ): Promise<TokenPurchase> {
    try {
      // Get the token package
      const packageDocRef = doc(collection(this.getFirestore(), this.PACKAGE_COLLECTION), packageId);
      const packageDocSnap = await getDoc(packageDocRef);
      
      if (!packageDocSnap.exists()) {
        throw new Error('Token package not found');
      }
      
      const tokenPackage = packageDocSnap.data() as TokenPackage;
      
      if (!tokenPackage.isActive) {
        throw new Error('Token package is not active');
      }
      
      // Check if the package is available for the user's tier
      const userTier = await getSubscriptionTier(userId);
      
      if (tokenPackage.tier !== 'all' && tokenPackage.tier !== userTier) {
        throw new Error(`This token package is not available for ${userTier} tier`);
      }
      
      // Create purchase record
      const purchaseId = uuidv4();
      const now = new Date();
      
      const purchase: TokenPurchase = {
        id: purchaseId,
        userId,
        organizationId,
        tokenAmount: tokenPackage.tokenAmount,
        price: tokenPackage.price,
        currency: tokenPackage.currency,
        purchaseDate: now,
        isProcessed: false,
        paymentMethod,
        notes: `Purchase of ${tokenPackage.name} token package`
      };
      
      // Store purchase in Firestore
      const purchaseDocRef = doc(collection(this.getFirestore(), this.PURCHASE_COLLECTION), purchaseId);
      await setDoc(purchaseDocRef, purchase);
      
      // Process the purchase and update token balance
      await this.processTokenPurchase(purchaseId);
      
      return purchase;
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      throw new Error('Failed to purchase tokens');
    }
  }
  
  /**
   * Process a token purchase and add to user's balance
   */
  async processTokenPurchase(purchaseId: string): Promise<void> {
    try {
      // Get the purchase record
      const purchaseDocRef = doc(collection(this.getFirestore(), this.PURCHASE_COLLECTION), purchaseId);
      const purchaseDocSnap = await getDoc(purchaseDocRef);
      
      if (!purchaseDocSnap.exists()) {
        throw new Error('Purchase record not found');
      }
      
      const purchase = purchaseDocSnap.data() as TokenPurchase;
      
      if (purchase.isProcessed) {
        return; // Already processed
      }
      
      // Get or create token balance
      let tokenBalance = await this.getTokenBalance(purchase.userId, purchase.organizationId);
      
      if (!tokenBalance) {
        tokenBalance = await this.initializeTokenBalance(purchase.userId, purchase.organizationId);
      }
      
      // Update token balance with purchased tokens
      const balanceDocRef = doc(collection(this.getFirestore(), this.BALANCE_COLLECTION), purchase.userId);
      await updateDoc(balanceDocRef, {
        purchasedTokens: tokenBalance.purchasedTokens + purchase.tokenAmount,
        updatedAt: new Date()
      });
      
      // Mark purchase as processed
      await updateDoc(purchaseDocRef, {
        isProcessed: true,
        processedAt: new Date()
      });
      
      // Send confirmation email (implement as needed)
      await this.sendPurchaseConfirmation(purchase);
      
    } catch (error) {
      console.error('Error processing token purchase:', error);
      throw new Error('Failed to process token purchase');
    }
  }
  
  /**
   * Send purchase confirmation email
   */
  private async sendPurchaseConfirmation(purchase: TokenPurchase): Promise<void> {
    try {
      // Get user email
      const userDoc = await getDoc(doc(this.getFirestore(), 'users', purchase.userId));
      
      if (!userDoc.exists()) {
        console.error('User not found for purchase confirmation:', purchase.userId);
        return;
      }
      
      const userData = userDoc.data();
      const userEmail = userData.email;
      
      if (!userEmail) {
        console.error('User email not found for purchase confirmation:', purchase.userId);
        return;
      }
      
      await unifiedEmailService.sendTokenPurchaseConfirmation({
        to: userEmail,
        tokenAmount: purchase.tokenAmount,
        price: purchase.price,
        currency: purchase.currency,
        purchaseDate: purchase.purchaseDate
      });
    } catch (error) {
      console.error('Error sending purchase confirmation:', error);
      // Don't throw error - purchase should still be processed even if email fails
    }
  }
  
  /**
   * Use tokens and update balance
   */
  async useTokens(userId: string, tokenAmount: number, organizationId?: string): Promise<boolean> {
    try {
      // Get current balance
      const balance = await this.getTokenBalance(userId, organizationId);
      
      if (!balance) {
        return false;
      }
      
      // Calculate available tokens
      const availableIncludedTokens = Math.max(0, balance.includedTokens - balance.totalUsedTokens);
      const availablePurchasedTokens = balance.purchasedTokens;
      const totalAvailableTokens = availableIncludedTokens + availablePurchasedTokens;
      
      if (totalAvailableTokens < tokenAmount) {
        return false; // Insufficient tokens
      }
      
      // Update token usage
      const balanceDocRef = doc(collection(this.getFirestore(), this.BALANCE_COLLECTION), userId);
      await updateDoc(balanceDocRef, {
        totalUsedTokens: balance.totalUsedTokens + tokenAmount,
        lastUsedAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error using tokens:', error);
      return false;
    }
  }
  
  /**
   * Get purchase history for a user
   */
  async getPurchaseHistory(userId: string, organizationId?: string): Promise<TokenPurchase[]> {
    try {
      let q = query(
        collection(this.getFirestore(), this.PURCHASE_COLLECTION),
        where('userId', '==', userId),
        ...(organizationId ? [where('organizationId', '==', organizationId)] : []),
        orderBy('purchaseDate', 'desc')
      );
      
      const purchasesSnapshot = await getDocs(q);
      
      const purchases: TokenPurchase[] = [];
      
      purchasesSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        purchases.push({ ...doc.data(), id: doc.id } as TokenPurchase);
      });
      
      return purchases;
    } catch (error) {
      console.error('Error getting purchase history:', error);
      throw new Error('Failed to get purchase history');
    }
  }
  
  /**
   * Get available token packages for a tier
   */
  async getAvailablePackages(tier: SubscriptionTier): Promise<TokenPackage[]> {
    try {
      const q = query(
        collection(this.getFirestore(), this.PACKAGE_COLLECTION),
        where('isActive', '==', true),
        where('tier', 'in', [tier, 'all'])
      );
      
      const packagesSnapshot = await getDocs(q);
      
      const packages: TokenPackage[] = [];
      
      packagesSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        packages.push({ ...doc.data(), id: doc.id } as TokenPackage);
      });
      
      return packages;
    } catch (error) {
      console.error('Error getting available packages:', error);
      throw new Error('Failed to get available packages');
    }
  }
  
  /**
   * Create a standard set of token packages
   * This should be run during application setup
   */
  async createDefaultTokenPackages(): Promise<void> {
    try {
      const defaultPackages: Omit<TokenPackage, 'id'>[] = [
        {
          name: 'Small Token Pack',
          tokenAmount: 50,
          price: 25.00,
          currency: 'USD',
          isActive: true,
          tier: 'all'
        },
        {
          name: 'Medium Token Pack',
          tokenAmount: 100,
          price: 45.00,
          currency: 'USD',
          isActive: true,
          tier: 'all'
        },
        {
          name: 'Large Token Pack',
          tokenAmount: 250,
          price: 90.00,
          currency: 'USD',
          isActive: true,
          tier: 'all'
        },
        {
          name: 'XL Token Pack',
          tokenAmount: 500,
          price: 160.00,
          currency: 'USD',
          isActive: true,
          tier: 'all'
        },
        {
          name: 'Premium Token Pack',
          tokenAmount: 1000,
          price: 280.00,
          currency: 'USD',
          isActive: true,
          tier: 'all'
        },
        {
          name: 'Heavy User Pack',
          tokenAmount: 2000,
          price: 500.00,
          currency: 'USD',
          isActive: true,
          tier: 'all'
        },
        // Enterprise discounted packages
        {
          name: 'Enterprise Premium Pack',
          tokenAmount: 1000,
          price: 252.00, // 10% discount on the Premium Token Pack
          currency: 'USD',
          isActive: true,
          tier: SubscriptionTier.ENTERPRISE
        },
        {
          name: 'Enterprise Heavy User Pack',
          tokenAmount: 2000,
          price: 400.00, // 20% discount on the Heavy User Pack
          currency: 'USD',
          isActive: true,
          tier: SubscriptionTier.ENTERPRISE
        }
      ];
      
      // Check if packages already exist
      const q = query(collection(this.getFirestore(), this.PACKAGE_COLLECTION));
      const existingPackagesSnapshot = await getDocs(q);
      
      if (!existingPackagesSnapshot.empty) {
        return; // Packages already exist
      }
      
      // Create packages
      const batch = writeBatch(firestore);
      
      defaultPackages.forEach(pkg => {
        const docRef = doc(collection(this.getFirestore(), this.PACKAGE_COLLECTION));
        batch.set(docRef, pkg);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error creating default token packages:', error);
      throw new Error('Failed to create default token packages');
    }
  }
}

/**
 * Get subscription tier for a user
 */
async function getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  try {
    const userDoc = await getDoc(doc(this.getFirestore(), 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.subscriptionTier || SubscriptionTier.CREATOR;
    }
    return SubscriptionTier.CREATOR;
  } catch (error) {
    console.error('Error getting subscription tier:', error);
    return SubscriptionTier.CREATOR;
  }
}

// Create singleton instance
const tokenPurchaseService = new TokenPurchaseService();
export default tokenPurchaseService; 
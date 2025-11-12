import { firestore } from 'firebase-admin';
import { 
  TokenBalance, 
  TokenUsageRecord, 
  TokenPurchaseTransaction,
  TokenUsageNotification
} from '../ai/models/tokens';

/**
 * Repository class for managing token-related data in Firestore
 */
export class TokenRepository {
  private db: firestore.Firestore;
  
  // Collection names
  private static readonly BALANCES_COLLECTION = 'tokenBalances';
  private static readonly USAGE_COLLECTION = 'tokenUsage';
  private static readonly PURCHASES_COLLECTION = 'tokenPurchases';
  private static readonly NOTIFICATIONS_COLLECTION = 'tokenNotifications';
  
  constructor(firestoreInstance: firestore.Firestore) {
    this.db = firestoreInstance;
  }
  
  /**
   * Get token balance for a user
   * @param userId The user ID to retrieve balance for
   * @returns The user's token balance or null if not found
   */
  async getTokenBalance(userId: string): Promise<TokenBalance | null> {
    const doc = await this.db.collection(TokenRepository.BALANCES_COLLECTION)
      .doc(userId)
      .get();
      
    if (!doc.exists) {
      return null;
    }
    
    return doc.data() as TokenBalance;
  }
  
  /**
   * Create or update a user's token balance
   * @param balance The token balance to save
   * @returns The updated token balance
   */
  async saveTokenBalance(balance: TokenBalance): Promise<TokenBalance> {
    await this.db.collection(TokenRepository.BALANCES_COLLECTION)
      .doc(balance.userId)
      .set(balance, { merge: true });
      
    return balance;
  }
  
  /**
   * Record a token usage event
   * @param usageRecord The usage record to save
   * @returns The saved usage record with ID
   */
  async recordTokenUsage(usageRecord: TokenUsageRecord): Promise<TokenUsageRecord & { id: string }> {
    const docRef = await this.db.collection(TokenRepository.USAGE_COLLECTION).add({
      ...usageRecord,
      timestamp: firestore.Timestamp.fromDate(usageRecord.timestamp)
    });
    
    return {
      ...usageRecord,
      id: docRef.id
    };
  }
  
  /**
   * Get token usage history for a user
   * @param userId The user ID
   * @param limit Maximum number of records to return
   * @param startDate Optional start date for filtering
   * @param endDate Optional end date for filtering
   * @returns Array of usage records
   */
  async getUserTokenUsage(
    userId: string, 
    limit = 100,
    startDate?: Date,
    endDate?: Date
  ): Promise<(TokenUsageRecord & { id: string })[]> {
    let query = this.db.collection(TokenRepository.USAGE_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit);
      
    if (startDate) {
      query = query.where('timestamp', '>=', firestore.Timestamp.fromDate(startDate));
    }
    
    if (endDate) {
      query = query.where('timestamp', '<=', firestore.Timestamp.fromDate(endDate));
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      ...(doc.data() as TokenUsageRecord),
      timestamp: (doc.data().timestamp as firestore.Timestamp).toDate(),
      id: doc.id
    }));
  }
  
  /**
   * Save a token purchase transaction
   * @param purchase The purchase transaction to save
   * @returns The saved purchase with ID
   */
  async saveTokenPurchase(purchase: TokenPurchaseTransaction): Promise<TokenPurchaseTransaction & { id: string }> {
    const docRef = await this.db.collection(TokenRepository.PURCHASES_COLLECTION).add({
      ...purchase,
      timestamp: firestore.Timestamp.fromDate(purchase.timestamp)
    });
    
    return {
      ...purchase,
      id: docRef.id
    };
  }
  
  /**
   * Get purchase history for a user
   * @param userId The user ID
   * @param limit Maximum number of records to return
   * @returns Array of purchase transactions
   */
  async getUserPurchaseHistory(
    userId: string,
    limit = 20
  ): Promise<(TokenPurchaseTransaction & { id: string })[]> {
    const snapshot = await this.db.collection(TokenRepository.PURCHASES_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
      
    return snapshot.docs.map(doc => ({
      ...(doc.data() as TokenPurchaseTransaction),
      timestamp: (doc.data().timestamp as firestore.Timestamp).toDate(),
      id: doc.id
    }));
  }
  
  /**
   * Record a notification sent to a user
   * @param notification The notification record
   * @returns The saved notification with ID
   */
  async recordNotification(
    notification: TokenUsageNotification
  ): Promise<TokenUsageNotification & { id: string }> {
    const docRef = await this.db.collection(TokenRepository.NOTIFICATIONS_COLLECTION).add({
      ...notification,
      timestamp: firestore.Timestamp.fromDate(notification.timestamp)
    });
    
    return {
      ...notification,
      id: docRef.id
    };
  }
  
  /**
   * Get recent notifications for a user
   * @param userId The user ID
   * @param limit Maximum notifications to return
   * @returns Recent notifications for the user
   */
  async getUserNotifications(
    userId: string,
    limit = 10
  ): Promise<(TokenUsageNotification & { id: string })[]> {
    const snapshot = await this.db.collection(TokenRepository.NOTIFICATIONS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
      
    return snapshot.docs.map(doc => ({
      ...(doc.data() as TokenUsageNotification),
      timestamp: (doc.data().timestamp as firestore.Timestamp).toDate(),
      id: doc.id
    }));
  }
}

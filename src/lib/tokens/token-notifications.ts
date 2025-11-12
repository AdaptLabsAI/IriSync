import { firestore } from '../firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { TokenService } from './token-service';

/**
 * Types of token notifications
 */
export enum TokenNotificationType {
  LOW_BALANCE = 'low_balance',
  DEPLETED = 'depleted',
  RENEWAL = 'renewal',
  PURCHASE = 'purchase',
  USAGE_MILESTONE = 'usage_milestone'
}

/**
 * Interface for token notification
 */
export interface TokenNotification {
  id: string;
  userId: string;
  organizationId?: string;
  type: TokenNotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  isSent: boolean;
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
}

/**
 * Service for managing token notifications
 */
export class TokenNotificationService {
  private tokenService: TokenService;
  
  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
  }
  
  /**
   * Create a low balance notification
   * @param userId User ID
   * @param currentBalance Current token balance
   * @param usagePercentage Current usage percentage
   * @param resetDate Date when tokens will reset
   * @param organizationId Optional organization ID
   * @returns Created notification
   */
  async createLowBalanceNotification(
    userId: string,
    currentBalance: number,
    usagePercentage: number,
    resetDate: Date,
    organizationId?: string
  ): Promise<TokenNotification> {
    try {
      const notification: Omit<TokenNotification, 'id'> = {
        userId,
        organizationId,
        type: TokenNotificationType.LOW_BALANCE,
        title: `Low Token Balance: ${currentBalance} tokens remaining`,
        message: `You have used ${usagePercentage}% of your monthly token allocation. Your tokens will reset on ${resetDate.toLocaleDateString()}.`,
        metadata: {
          currentBalance,
          usagePercentage,
          resetDate: resetDate.toISOString()
        },
        isRead: false,
        isSent: false,
        createdAt: new Date()
      };
      
      // Add to Firestore
      const notificationRef = await addDoc(collection(firestore, 'tokenNotifications'), {
        ...notification,
        createdAt: Timestamp.fromDate(notification.createdAt)
      });
      
      return {
        ...notification,
        id: notificationRef.id
      };
    } catch (error) {
      console.error('Error creating low balance notification:', error);
      throw new Error(`Failed to create notification: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create a depleted balance notification
   * @param userId User ID
   * @param resetDate Date when tokens will reset
   * @param organizationId Optional organization ID
   * @returns Created notification
   */
  async createDepletedNotification(
    userId: string,
    resetDate: Date,
    organizationId?: string
  ): Promise<TokenNotification> {
    try {
      const notification: Omit<TokenNotification, 'id'> = {
        userId,
        organizationId,
        type: TokenNotificationType.DEPLETED,
        title: 'Token Balance Depleted',
        message: `You have used all of your monthly token allocation. Your tokens will reset on ${resetDate.toLocaleDateString()}.`,
        metadata: {
          resetDate: resetDate.toISOString()
        },
        isRead: false,
        isSent: false,
        createdAt: new Date()
      };
      
      // Add to Firestore
      const notificationRef = await addDoc(collection(firestore, 'tokenNotifications'), {
        ...notification,
        createdAt: Timestamp.fromDate(notification.createdAt)
      });
      
      return {
        ...notification,
        id: notificationRef.id
      };
    } catch (error) {
      console.error('Error creating depleted notification:', error);
      throw new Error(`Failed to create notification: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create a token renewal notification
   * @param userId User ID
   * @param newBalance New token balance after renewal
   * @param nextResetDate Next reset date
   * @param organizationId Optional organization ID
   * @returns Created notification
   */
  async createRenewalNotification(
    userId: string,
    newBalance: number,
    nextResetDate: Date,
    organizationId?: string
  ): Promise<TokenNotification> {
    try {
      const notification: Omit<TokenNotification, 'id'> = {
        userId,
        organizationId,
        type: TokenNotificationType.RENEWAL,
        title: 'Token Balance Renewed',
        message: `Your token balance has been reset to ${newBalance} tokens. Your next reset date is ${nextResetDate.toLocaleDateString()}.`,
        metadata: {
          newBalance,
          nextResetDate: nextResetDate.toISOString()
        },
        isRead: false,
        isSent: false,
        createdAt: new Date()
      };
      
      // Add to Firestore
      const notificationRef = await addDoc(collection(firestore, 'tokenNotifications'), {
        ...notification,
        createdAt: Timestamp.fromDate(notification.createdAt)
      });
      
      return {
        ...notification,
        id: notificationRef.id
      };
    } catch (error) {
      console.error('Error creating renewal notification:', error);
      throw new Error(`Failed to create notification: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create a token purchase notification
   * @param userId User ID
   * @param purchasedAmount Amount of tokens purchased
   * @param newBalance New token balance after purchase
   * @param organizationId Optional organization ID
   * @returns Created notification
   */
  async createPurchaseNotification(
    userId: string,
    purchasedAmount: number,
    newBalance: number,
    organizationId?: string
  ): Promise<TokenNotification> {
    try {
      const notification: Omit<TokenNotification, 'id'> = {
        userId,
        organizationId,
        type: TokenNotificationType.PURCHASE,
        title: 'Token Purchase Successful',
        message: `You have successfully purchased ${purchasedAmount} tokens. Your new balance is ${newBalance} tokens.`,
        metadata: {
          purchasedAmount,
          newBalance
        },
        isRead: false,
        isSent: false,
        createdAt: new Date()
      };
      
      // Add to Firestore
      const notificationRef = await addDoc(collection(firestore, 'tokenNotifications'), {
        ...notification,
        createdAt: Timestamp.fromDate(notification.createdAt)
      });
      
      return {
        ...notification,
        id: notificationRef.id
      };
    } catch (error) {
      console.error('Error creating purchase notification:', error);
      throw new Error(`Failed to create notification: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create a usage milestone notification
   * @param userId User ID
   * @param milestone Milestone percentage (e.g. 50%, 75%)
   * @param currentBalance Current token balance
   * @param resetDate Date when tokens will reset
   * @param organizationId Optional organization ID
   * @returns Created notification
   */
  async createUsageMilestoneNotification(
    userId: string,
    milestone: number,
    currentBalance: number,
    resetDate: Date,
    organizationId?: string
  ): Promise<TokenNotification> {
    try {
      const notification: Omit<TokenNotification, 'id'> = {
        userId,
        organizationId,
        type: TokenNotificationType.USAGE_MILESTONE,
        title: `${milestone}% Token Usage Milestone`,
        message: `You have used ${milestone}% of your monthly token allocation. You have ${currentBalance} tokens remaining until ${resetDate.toLocaleDateString()}.`,
        metadata: {
          milestone,
          currentBalance,
          resetDate: resetDate.toISOString()
        },
        isRead: false,
        isSent: false,
        createdAt: new Date()
      };
      
      // Add to Firestore
      const notificationRef = await addDoc(collection(firestore, 'tokenNotifications'), {
        ...notification,
        createdAt: Timestamp.fromDate(notification.createdAt)
      });
      
      return {
        ...notification,
        id: notificationRef.id
      };
    } catch (error) {
      console.error('Error creating usage milestone notification:', error);
      throw new Error(`Failed to create notification: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get all notifications for a user
   * @param userId User ID
   * @param unreadOnly Whether to return only unread notifications
   * @param limit Maximum number of notifications to return
   * @param offset Offset for pagination
   * @returns Array of notifications
   */
  async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
    limitCount: number = 20,
    offset: number = 0
  ): Promise<TokenNotification[]> {
    try {
      // Create query
      let notificationQuery = query(
        collection(firestore, 'tokenNotifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      if (unreadOnly) {
        notificationQuery = query(
          notificationQuery,
          where('isRead', '==', false)
        );
      }
      
      const querySnapshot = await getDocs(notificationQuery);
      
      // Convert to notifications
      const notifications: TokenNotification[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          userId: data.userId,
          organizationId: data.organizationId,
          type: data.type as TokenNotificationType,
          title: data.title,
          message: data.message,
          metadata: data.metadata,
          isRead: data.isRead,
          isSent: data.isSent,
          createdAt: data.createdAt.toDate(),
          sentAt: data.sentAt?.toDate(),
          readAt: data.readAt?.toDate()
        });
      });
      
      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw new Error(`Failed to get notifications: ${(error as Error).message}`);
    }
  }
  
  /**
   * Mark a notification as read
   * @param notificationId Notification ID
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      // In Phase 0, we're just implementing the interface
      // This would normally update the notification in Firestore
      console.log(`Marking notification ${notificationId} as read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${(error as Error).message}`);
    }
  }
  
  /**
   * Mark a notification as sent
   * @param notificationId Notification ID
   */
  async markNotificationAsSent(notificationId: string): Promise<void> {
    try {
      // In Phase 0, we're just implementing the interface
      // This would normally update the notification in Firestore
      console.log(`Marking notification ${notificationId} as sent`);
    } catch (error) {
      console.error('Error marking notification as sent:', error);
      throw new Error(`Failed to mark notification as sent: ${(error as Error).message}`);
    }
  }
}

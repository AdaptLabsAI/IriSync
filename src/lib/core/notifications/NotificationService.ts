import { firestore } from '../core/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { logger } from '../logging/logger';
import unifiedEmailService from './unified-email-service';

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Notification categories
 */
export enum NotificationCategory {
  SYSTEM = 'system',
  SECURITY = 'security',
  BILLING = 'billing',
  FEATURE = 'feature',
  SOCIAL = 'social',
  CONTENT = 'content',
  TEAM = 'team',
  PLATFORM = 'platform'
}

/**
 * Notification delivery channels
 */
export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  BOTH = 'both'
}

/**
 * Base notification interface
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
  actionText?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Firestore notification document structure
 */
interface FirestoreNotification {
  userId: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  isRead: boolean;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  actionUrl?: string;
  actionText?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Notification service for managing user notifications
 */
export class NotificationService {
  private readonly notificationsCollection = 'notifications';
  
  /**
   * Send a notification to a user
   * @param notification Notification data
   * @param channel Notification delivery channel
   * @param email User email (required for email notifications)
   * @returns Created notification ID
   */
  async sendNotification(
    notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>,
    channel: NotificationChannel = NotificationChannel.IN_APP,
    email?: string
  ): Promise<string> {
    try {
      // Create notification data
      const now = new Date();
      const notificationData: FirestoreNotification = {
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        category: notification.category,
        isRead: false,
        createdAt: Timestamp.fromDate(now),
        expiresAt: notification.expiresAt ? Timestamp.fromDate(notification.expiresAt) : undefined,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        imageUrl: notification.imageUrl,
        metadata: notification.metadata
      };
      
      let notificationId = '';
      
      // Save in-app notification to Firestore
      if (channel === NotificationChannel.IN_APP || channel === NotificationChannel.BOTH) {
        const notificationsRef = collection(firestore, this.notificationsCollection);
        const newNotificationRef = doc(notificationsRef);
        notificationId = newNotificationRef.id;
        
        await setDoc(newNotificationRef, notificationData);
      }
      
      // Send email notification using unified email service
      if ((channel === NotificationChannel.EMAIL || channel === NotificationChannel.BOTH) && email) {
        await unifiedEmailService.sendNotificationEmail({
          to: email,
          subject: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText,
          priority: this.mapPriorityToEmailPriority(notification.priority)
        });
      }
      
      return notificationId;
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user with pagination
   * @param userId User ID
   * @param limitCount Number of notifications to retrieve
   * @param lastNotificationId Last notification ID for pagination
   * @returns Array of notifications
   */
  async getUserNotifications(
    userId: string, 
    limitCount: number = 20,
    lastNotificationId?: string
  ): Promise<Notification[]> {
    try {
      let notificationsQuery = query(
        collection(firestore, this.notificationsCollection),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      // If lastNotificationId is provided, get notifications after that
      if (lastNotificationId) {
        const lastNotificationDoc = await getDoc(doc(firestore, this.notificationsCollection, lastNotificationId));
        if (lastNotificationDoc.exists()) {
          notificationsQuery = query(
            collection(firestore, this.notificationsCollection),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
          );
        }
      }

      const querySnapshot = await getDocs(notificationsQuery);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as FirestoreNotification;
        return {
          id: doc.id,
          userId: data.userId,
          title: data.title,
          message: data.message,
          priority: data.priority,
          category: data.category,
          isRead: data.isRead,
          createdAt: data.createdAt.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          actionUrl: data.actionUrl,
          actionText: data.actionText,
          imageUrl: data.imageUrl,
          metadata: data.metadata
        };
      });
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param notificationId Notification ID
   * @param userId User ID (for security)
   * @returns Success status
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notificationRef = doc(firestore, this.notificationsCollection, notificationId);
      const notificationDoc = await getDoc(notificationRef);

      if (!notificationDoc.exists()) {
        logger.warn('Notification not found for marking as read', { notificationId, userId });
        return false;
      }

      const notificationData = notificationDoc.data() as FirestoreNotification;

      // Verify ownership
      if (notificationData.userId !== userId) {
        logger.warn('User attempted to mark notification as read without ownership', { 
          notificationId, 
          userId, 
          actualUserId: notificationData.userId 
        });
        return false;
      }

      // Update notification
      await updateDoc(notificationRef, { isRead: true });

      return true;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param userId User ID
   * @returns Number of notifications marked as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const unreadQuery = query(
        collection(firestore, this.notificationsCollection),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(unreadQuery);
      const updatePromises = querySnapshot.docs.map(async (docSnapshot) => {
        await updateDoc(docSnapshot.ref, { isRead: true });
      });

      await Promise.all(updatePromises);
      return querySnapshot.docs.length;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param notificationId Notification ID
   * @param userId User ID (for security)
   * @returns Success status
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notificationRef = doc(firestore, this.notificationsCollection, notificationId);
      const notificationDoc = await getDoc(notificationRef);

      if (!notificationDoc.exists()) {
        logger.warn('Notification not found for deletion', { notificationId, userId });
        return false;
      }

      const notificationData = notificationDoc.data() as FirestoreNotification;

      // Verify ownership
      if (notificationData.userId !== userId) {
        logger.warn('User attempted to delete notification without ownership', { 
          notificationId, 
          userId, 
          actualUserId: notificationData.userId 
        });
        return false;
      }

      // Delete notification
      await deleteDoc(notificationRef);

      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Get unread notification count for a user
   * @param userId User ID
   * @returns Number of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const unreadQuery = query(
        collection(firestore, this.notificationsCollection),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(unreadQuery);
      return querySnapshot.docs.length;
    } catch (error) {
      logger.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Clean up expired notifications
   * @returns Number of notifications cleaned up
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const now = Timestamp.now();
      const expiredQuery = query(
        collection(firestore, this.notificationsCollection),
        where('expiresAt', '<=', now)
      );

      const querySnapshot = await getDocs(expiredQuery);
      
      const deletePromises = querySnapshot.docs.map(async (docSnapshot) => {
        await deleteDoc(docSnapshot.ref);
      });

      await Promise.all(deletePromises);
      
      logger.info(`Cleaned up ${querySnapshot.docs.length} expired notifications`);
      return querySnapshot.docs.length;
    } catch (error) {
      logger.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }

  /**
   * Map notification priority to email priority
   */
  private mapPriorityToEmailPriority(priority: NotificationPriority): 'low' | 'normal' | 'high' {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'high';
      case NotificationPriority.HIGH:
        return 'high';
      case NotificationPriority.MEDIUM:
        return 'normal';
      case NotificationPriority.LOW:
      default:
        return 'low';
    }
  }
} 
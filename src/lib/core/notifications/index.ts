/**
 * Notifications system for IriSync
 * Exports functionality for sending various types of notifications
 */

import { logger } from '../logging/logger';
import * as emailService from './email';

/**
 * Notification type
 */
export enum NotificationType {
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
  SMS = 'sms',
}

/**
 * Notification priority
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification status
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * Notification template keys
 */
export enum NotificationTemplate {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  INVOICE = 'invoice',
  QUOTE_REQUEST = 'quote_request',
  TOKEN_PURCHASE = 'token_purchase',
  TOKEN_USAGE_LIMIT = 'token_usage_limit',
  SUBSCRIPTION_RENEWAL = 'subscription_renewal',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  CONTENT_PUBLISHED = 'content_published',
  CONTENT_APPROVAL = 'content_approval',
  TEAM_INVITATION = 'team_invitation',
}

/**
 * Base notification options
 */
export interface NotificationOptions {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  data: Record<string, any>;
}

/**
 * Email notification options
 */
export interface EmailNotificationOptions extends NotificationOptions {
  type: NotificationType.EMAIL;
  data: {
    to: string;
    subject: string;
    template?: NotificationTemplate;
    templateData?: Record<string, any>;
    html?: string;
    attachments?: Array<{
      filename: string;
      content: string | Buffer;
      contentType?: string;
    }>;
  };
}

/**
 * In-app notification options
 */
export interface InAppNotificationOptions extends NotificationOptions {
  type: NotificationType.IN_APP;
  data: {
    title: string;
    message: string;
    action?: {
      label: string;
      url: string;
    };
    icon?: string;
    expiresAt?: Date;
  };
}

/**
 * Send a notification
 */
export async function sendNotification(options: NotificationOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    logger.info('Sending notification', { type: options.type, userId: options.userId });
    
    switch (options.type) {
      case NotificationType.EMAIL:
        return await sendEmailNotification(options as EmailNotificationOptions);
        
      case NotificationType.IN_APP:
        return await sendInAppNotification(options as InAppNotificationOptions);
        
      default:
        logger.warn('Unsupported notification type', { type: options.type });
        return { success: false, error: 'Unsupported notification type' };
    }
  } catch (error) {
    logger.error('Failed to send notification', { 
      error: error instanceof Error ? error.message : String(error),
      type: options.type,
      userId: options.userId
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error sending notification' 
    };
  }
}

/**
 * Send an email notification
 */
async function sendEmailNotification(options: EmailNotificationOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data } = options;
    
    // If using a template, generate the email content
    if (data.template) {
      switch (data.template) {
        case NotificationTemplate.WELCOME:
          return await emailService.sendWelcomeEmail(
            data.to, 
            data.templateData?.name || 'User'
          );
          
        case NotificationTemplate.PASSWORD_RESET:
          return await emailService.sendPasswordResetEmail(
            data.to, 
            data.templateData?.resetToken || '', 
            data.templateData?.resetUrl || ''
          );
          
        case NotificationTemplate.INVOICE:
          return await emailService.sendInvoiceEmail(
            data.to, 
            data.templateData?.invoiceData || {}
          );
          
        case NotificationTemplate.QUOTE_REQUEST:
          return await emailService.sendQuoteRequestEmail(
            data.to, 
            data.templateData?.quoteData || {}
          );
          
        case NotificationTemplate.TOKEN_PURCHASE:
          return await emailService.sendEmail({
            to: data.to,
            subject: data.subject || 'Your Token Purchase',
            html: data.html || `
              <div>
                <h1>Token Purchase Confirmation</h1>
                <p>Thank you for purchasing additional tokens for your IriSync account.</p>
                <p>You have purchased ${data.templateData?.tokenCount || 0} tokens for $${data.templateData?.amount || 0}.</p>
              </div>
            `,
            attachments: data.attachments
          });
          
        case NotificationTemplate.TOKEN_USAGE_LIMIT:
          return await emailService.sendEmail({
            to: data.to,
            subject: data.subject || 'Token Usage Limit Reached',
            html: data.html || `
              <div>
                <h1>Token Usage Alert</h1>
                <p>You have reached ${data.templateData?.percentage || 90}% of your monthly token usage limit.</p>
                <p>Consider upgrading your plan or purchasing additional tokens to avoid disruption.</p>
              </div>
            `,
            attachments: data.attachments
          });
          
        default:
          // If no template matches, fall back to direct HTML
          break;
      }
    }
    
    // Send a custom email without a template
    return await emailService.sendEmail({
      to: data.to,
      subject: data.subject,
      html: data.html || '<div>No content provided</div>',
      attachments: data.attachments
    });
  } catch (error) {
    logger.error('Failed to send email notification', { 
      error: error instanceof Error ? error.message : String(error),
      userId: options.userId
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error sending email' 
    };
  }
}

/**
 * Send an in-app notification
 * Stores notifications in Firestore and uses Firebase Cloud Messaging for real-time delivery
 */
async function sendInAppNotification(options: InAppNotificationOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { userId, data } = options;
    const admin = require('firebase-admin');
    const firestore = admin.firestore();
    
    // Create unique notification ID
    const notificationId = `notification_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Prepare notification data for storage
    const notificationData = {
      id: notificationId,
      userId,
      title: data.title,
      message: data.message,
      action: data.action || null,
      icon: data.icon || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      readAt: null,
      expiresAt: data.expiresAt ? admin.firestore.Timestamp.fromDate(data.expiresAt) : null,
      status: NotificationStatus.PENDING
    };
    
    // Store notification in Firestore
    await firestore
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(notificationId)
      .set(notificationData);
    
    // Update user's unread notification count
    await firestore
      .collection('users')
      .doc(userId)
      .update({
        'metrics.unreadNotifications': admin.firestore.FieldValue.increment(1)
      });
    
    // Send notification via Firebase Cloud Messaging (FCM)
    try {
      // Get the user's FCM tokens
      const userDevicesRef = firestore
        .collection('users')
        .doc(userId)
        .collection('devices');
      
      const devices = await userDevicesRef.get();
      
      if (!devices.empty) {
        // Prepare FCM message
        const message = {
          notification: {
            title: data.title,
            body: data.message
          },
          data: {
            notificationId,
            type: 'in_app',
            click_action: data.action?.url || 'OPEN_APP'
          }
        };
        
        // Send to all user devices
        const tokens = devices.docs.map((device: any) => device.data().fcmToken);
        const validTokens = tokens.filter((token: any) => token && typeof token === 'string');
        
        if (validTokens.length > 0) {
          const messaging = admin.messaging();
          const response = await messaging.sendMulticast({
            tokens: validTokens,
            ...message
          });
          
          logger.info('FCM notification sent', { 
            userId, 
            notificationId,
            successCount: response.successCount,
            failureCount: response.failureCount
          });
          
          // Mark notification as delivered if at least one device received it
          if (response.successCount > 0) {
            await firestore
              .collection('users')
              .doc(userId)
              .collection('notifications')
              .doc(notificationId)
              .update({
                status: NotificationStatus.DELIVERED
              });
          }
        }
      }
    } catch (fcmError) {
      // Log FCM error but continue - we've still stored the notification in Firestore
      logger.error('Error sending FCM notification', {
        error: fcmError instanceof Error ? fcmError.message : String(fcmError),
        userId,
        notificationId
      });
    }
    
    return { success: true, id: notificationId };
  } catch (error) {
    logger.error('Failed to send in-app notification', { 
      error: error instanceof Error ? error.message : String(error),
      userId: options.userId
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error sending in-app notification' 
    };
  }
}

// Re-export email service for direct access
export { emailService }; 
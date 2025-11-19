import { getFirebaseFirestore } from '../core/firebase';
import { getFirestore } from '../core/firebase/admin';
import { 
  doc, 
  collection, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp,
  limit
} from 'firebase/firestore';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../core/logging/logger';

const adminFirestore = getFirestore();

/**
 * Webhook event types
 */
export enum WebhookEventType {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  CONTENT_CREATED = 'content.created',
  CONTENT_UPDATED = 'content.updated',
  CONTENT_DELETED = 'content.deleted',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  TEAM_CREATED = 'team.created',
  TEAM_UPDATED = 'team.updated',
  TEAM_DELETED = 'team.deleted',
  // CRM Integration Events
  CONTACT_CREATED = 'contact.created',
  CONTACT_UPDATED = 'contact.updated',
  CONTACT_INTERACTION = 'contact.interaction',
  LEAD_CREATED = 'lead.created',
  LEAD_UPDATED = 'lead.updated',
  // Social Inbox Events
  MESSAGE_RECEIVED = 'message.received',
  MESSAGE_REPLIED = 'message.replied',
  MESSAGE_ASSIGNED = 'message.assigned',
  // Storage Events
  FILE_UPLOADED = 'file.uploaded',
  FILE_DELETED = 'file.deleted',
  STORAGE_QUOTA_EXCEEDED = 'storage.quota_exceeded'
}

/**
 * Webhook configuration interface
 */
export interface Webhook {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook in Firestore format
 */
export interface FirestoreWebhook {
  organizationId: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Webhook delivery status
 */
export enum WebhookDeliveryStatus {
  SUCCESS = 'success',
  FAILED = 'failed'
}

/**
 * Webhook delivery attempt interface
 */
export interface WebhookDeliveryAttempt {
  id: string;
  webhookId: string;
  eventType: WebhookEventType;
  payload: any;
  status: WebhookDeliveryStatus;
  statusCode?: number;
  response?: string;
  error?: string;
  requestedAt: Date;
  completedAt?: Date;
}

/**
 * Webhook delivery attempt in Firestore format
 */
export interface FirestoreWebhookDeliveryAttempt {
  webhookId: string;
  eventType: WebhookEventType;
  payload: any;
  status: WebhookDeliveryStatus;
  statusCode?: number;
  response?: string;
  error?: string;
  requestedAt: Timestamp;
  completedAt?: Timestamp;
}

/**
 * Webhook service for managing webhooks and webhook deliveries
 */
export class WebhookService {
  private readonly webhooksCollection = 'webhooks';
  private readonly deliveryAttemptsCollection = 'webhook_delivery_attempts';
  
  /**
   * Create a new webhook
   * @param webhook Webhook configuration
   * @returns Created webhook ID
   */
  async createWebhook(webhook: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Create webhook data with timestamps
      const now = new Date();
      const webhookData: FirestoreWebhook = {
        organizationId: webhook.organizationId,
        name: webhook.name,
        url: webhook.url,
        secret: webhook.secret || this.generateWebhookSecret(),
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };
      
      // Generate a unique ID
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }
      const webhooksRef = collection(firestore, this.webhooksCollection);
      const newWebhookRef = doc(webhooksRef);
      const webhookId = newWebhookRef.id;
      
      // Save to Firestore
      await setDoc(newWebhookRef, webhookData);
      
      // Also save in admin Firestore
      await adminFirestore
        .collection(this.webhooksCollection)
        .doc(webhookId)
        .set(webhookData);
      
      return webhookId;
    } catch (error) {
      logger.error('Error creating webhook:', error);
      throw error;
    }
  }
  
  /**
   * Get webhook by ID
   * @param webhookId Webhook ID
   * @returns Webhook or null if not found
   */
  async getWebhookById(webhookId: string): Promise<Webhook | null> {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        throw new Error('Database not configured');
      }
      const webhookRef = doc(firestore, this.webhooksCollection, webhookId);
      const webhookSnapshot = await getDoc(webhookRef);
      
      if (!webhookSnapshot.exists()) {
        return null;
      }
      
      const webhookData = webhookSnapshot.data() as FirestoreWebhook;
      
      return {
        id: webhookSnapshot.id,
        organizationId: webhookData.organizationId,
        name: webhookData.name,
        url: webhookData.url,
        secret: webhookData.secret,
        events: webhookData.events,
        isActive: webhookData.isActive,
        createdAt: webhookData.createdAt.toDate(),
        updatedAt: webhookData.updatedAt.toDate()
      };
    } catch (error) {
      logger.error('Error getting webhook:', error);
      throw error;
    }
  }
  
  /**
   * Get webhooks by organization
   * @param organizationId Organization ID
   * @returns Array of webhooks
   */
  async getWebhooksByOrganization(organizationId: string): Promise<Webhook[]> {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        throw new Error('Database not configured');
      }
      const webhooksRef = collection(firestore, this.webhooksCollection);
      const webhooksQuery = query(webhooksRef, where('organizationId', '==', organizationId));
      const webhooksSnapshot = await getDocs(webhooksQuery);
      
      return webhooksSnapshot.docs.map(doc => {
        const webhookData = doc.data() as FirestoreWebhook;
        
        return {
          id: doc.id,
          organizationId: webhookData.organizationId,
          name: webhookData.name,
          url: webhookData.url,
          secret: webhookData.secret,
          events: webhookData.events,
          isActive: webhookData.isActive,
          createdAt: webhookData.createdAt.toDate(),
          updatedAt: webhookData.updatedAt.toDate()
        };
      });
    } catch (error) {
      logger.error('Error getting webhooks by organization:', error);
      throw error;
    }
  }
  
  /**
   * Update webhook
   * @param webhookId Webhook ID
   * @param updates Updates to apply
   * @returns Updated webhook
   */
  async updateWebhook(webhookId: string, updates: Partial<Omit<Webhook, 'id' | 'organizationId' | 'createdAt'>>): Promise<Webhook> {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        throw new Error('Database not configured');
      }
      const webhookRef = doc(firestore, this.webhooksCollection, webhookId);
      const webhookSnapshot = await getDoc(webhookRef);
      
      if (!webhookSnapshot.exists()) {
        throw new Error(`Webhook with ID ${webhookId} not found`);
      }
      
      // Create updated data
      const updatedData: Partial<FirestoreWebhook> = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      };
      
      // Update in Firestore
      await updateDoc(webhookRef, updatedData);
      
      // Update in admin Firestore
      await adminFirestore
        .collection(this.webhooksCollection)
        .doc(webhookId)
        .update(updatedData);
      
      // Get the updated webhook
      const updatedWebhook = await this.getWebhookById(webhookId);
      
      if (!updatedWebhook) {
        throw new Error(`Failed to retrieve updated webhook with ID ${webhookId}`);
      }
      
      return updatedWebhook;
    } catch (error) {
      logger.error('Error updating webhook:', error);
      throw error;
    }
  }
  
  /**
   * Delete webhook
   * @param webhookId Webhook ID
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        throw new Error('Database not configured');
      }
      const webhookRef = doc(firestore, this.webhooksCollection, webhookId);
      
      // Delete from Firestore
      await deleteDoc(webhookRef);
      
      // Delete from admin Firestore
      await adminFirestore
        .collection(this.webhooksCollection)
        .doc(webhookId)
        .delete();
    } catch (error) {
      logger.error('Error deleting webhook:', error);
      throw error;
    }
  }
  
  /**
   * Trigger webhook for a specific event
   * @param eventType Event type
   * @param payload Event payload
   * @param organizationId Organization ID (optional, to filter webhooks)
   * @returns Array of delivery attempt IDs
   */
  async triggerWebhooks(
    eventType: WebhookEventType,
    payload: any,
    organizationId?: string
  ): Promise<string[]> {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        throw new Error('Database not configured');
      }
      // Get webhooks that subscribe to this event
      const webhooksRef = collection(firestore, this.webhooksCollection);
      let webhooksQuery = query(
        webhooksRef,
        where('events', 'array-contains', eventType),
        where('isActive', '==', true)
      );
      
      // Add organization filter if provided
      if (organizationId) {
        webhooksQuery = query(
          webhooksRef,
          where('events', 'array-contains', eventType),
          where('isActive', '==', true),
          where('organizationId', '==', organizationId)
        );
      }
      
      const webhooksSnapshot = await getDocs(webhooksQuery);
      
      // No webhooks to trigger
      if (webhooksSnapshot.empty) {
        return [];
      }
      
      const deliveryAttemptIds: string[] = [];
      
      // Trigger each webhook
      for (const doc of webhooksSnapshot.docs) {
        const webhook = {
          id: doc.id,
          ...(doc.data() as FirestoreWebhook)
        };
        
        // Create a delivery attempt
        const deliveryAttemptId = await this.createDeliveryAttempt(webhook.id, eventType, payload);
        deliveryAttemptIds.push(deliveryAttemptId);
        
        // Send the webhook asynchronously
        this.sendWebhook(webhook, eventType, payload, deliveryAttemptId).catch(error => {
          logger.error(`Error sending webhook ${webhook.id} for event ${eventType}:`, error);
        });
      }
      
      return deliveryAttemptIds;
    } catch (error) {
      logger.error(`Error triggering webhooks for event ${eventType}:`, error);
      throw error;
    }
  }
  
  /**
   * Get webhook delivery attempts for a webhook
   * @param webhookId Webhook ID
   * @param limitCount Maximum number of attempts to return
   * @returns Array of delivery attempts
   */
  async getDeliveryAttempts(webhookId: string, limitCount: number = 50): Promise<WebhookDeliveryAttempt[]> {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        throw new Error('Database not configured');
      }
      const attemptsRef = collection(firestore, this.deliveryAttemptsCollection);
      const attemptsQuery = query(
        attemptsRef,
        where('webhookId', '==', webhookId),
        where('requestedAt', '<=', Timestamp.fromDate(new Date())),
        limit(limitCount)
      );
      
      const attemptsSnapshot = await getDocs(attemptsQuery);
      
      return attemptsSnapshot.docs.map(doc => {
        const attemptData = doc.data() as FirestoreWebhookDeliveryAttempt;
        
        return {
          id: doc.id,
          webhookId: attemptData.webhookId,
          eventType: attemptData.eventType,
          payload: attemptData.payload,
          status: attemptData.status,
          statusCode: attemptData.statusCode,
          response: attemptData.response,
          error: attemptData.error,
          requestedAt: attemptData.requestedAt.toDate(),
          completedAt: attemptData.completedAt?.toDate()
        };
      });
    } catch (error) {
      logger.error(`Error getting delivery attempts for webhook ${webhookId}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a webhook delivery attempt
   * @param webhookId Webhook ID
   * @param eventType Event type
   * @param payload Event payload
   * @returns Delivery attempt ID
   * @private
   */
  private async createDeliveryAttempt(
    webhookId: string,
    eventType: WebhookEventType,
    payload: any
  ): Promise<string> {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        throw new Error('Database not configured');
      }
      const now = new Date();
      const attemptData: FirestoreWebhookDeliveryAttempt = {
        webhookId,
        eventType,
        payload,
        status: WebhookDeliveryStatus.FAILED, // Assume failure until successful
        requestedAt: Timestamp.fromDate(now)
      };

      // Generate a unique ID
      const attemptsRef = collection(firestore, this.deliveryAttemptsCollection);
      const newAttemptRef = doc(attemptsRef);
      const attemptId = newAttemptRef.id;
      
      // Save to Firestore
      await setDoc(newAttemptRef, attemptData);
      
      // Also save in admin Firestore
      await adminFirestore
        .collection(this.deliveryAttemptsCollection)
        .doc(attemptId)
        .set(attemptData);
      
      return attemptId;
    } catch (error) {
      logger.error('Error creating delivery attempt:', error);
      throw error;
    }
  }
  
  /**
   * Send a webhook to the configured URL
   * @param webhook Webhook configuration
   * @param eventType Event type
   * @param payload Event payload
   * @param deliveryAttemptId Delivery attempt ID
   * @private
   */
  private async sendWebhook(
    webhook: Webhook | { id: string } & FirestoreWebhook,
    eventType: WebhookEventType,
    payload: any,
    deliveryAttemptId: string
  ): Promise<void> {
    try {
      // Prepare webhook data
      const timestamp = new Date().toISOString();
      const webhookPayload = {
        id: deliveryAttemptId,
        event: eventType,
        timestamp,
        data: payload
      };
      
      // Generate signature
      const signature = this.generateSignature(webhook.secret, JSON.stringify(webhookPayload));
      
      // Send the webhook
      const response = await axios.post(webhook.url, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'IriSync-Webhook',
          'X-IriSync-Event': eventType,
          'X-IriSync-Delivery': deliveryAttemptId,
          'X-IriSync-Signature': signature,
          'X-IriSync-Timestamp': timestamp
        },
        timeout: 10000 // 10 seconds timeout
      });
      
      // Update the delivery attempt as successful
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        throw new Error('Database not configured');
      }
      const attemptRef = doc(firestore, this.deliveryAttemptsCollection, deliveryAttemptId);
      await updateDoc(attemptRef, {
        status: WebhookDeliveryStatus.SUCCESS,
        statusCode: response.status,
        response: JSON.stringify(response.data),
        completedAt: Timestamp.fromDate(new Date())
      });
      
      // Update in admin Firestore
      await adminFirestore
        .collection(this.deliveryAttemptsCollection)
        .doc(deliveryAttemptId)
        .update({
          status: WebhookDeliveryStatus.SUCCESS,
          statusCode: response.status,
          response: JSON.stringify(response.data),
          completedAt: Timestamp.fromDate(new Date())
        });
      
      logger.info(`Webhook ${webhook.id} delivered successfully for event ${eventType}`);
    } catch (error: any) {
      // Update the delivery attempt as failed
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        logger.error('Database not configured');
        return;
      }
      const attemptRef = doc(firestore, this.deliveryAttemptsCollection, deliveryAttemptId);
      await updateDoc(attemptRef, {
        status: WebhookDeliveryStatus.FAILED,
        statusCode: error.response?.status,
        error: error.message,
        completedAt: Timestamp.fromDate(new Date())
      });
      
      // Update in admin Firestore
      await adminFirestore
        .collection(this.deliveryAttemptsCollection)
        .doc(deliveryAttemptId)
        .update({
          status: WebhookDeliveryStatus.FAILED,
          statusCode: error.response?.status,
          error: error.message,
          completedAt: Timestamp.fromDate(new Date())
        });
      
      logger.error(`Webhook ${webhook.id} delivery failed for event ${eventType}:`, error);
    }
  }
  
  /**
   * Generate a signature for webhook payload
   * @param secret Webhook secret
   * @param payload Webhook payload as a string
   * @returns HMAC signature
   * @private
   */
  private generateSignature(secret: string, payload: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
  
  /**
   * Generate a random webhook secret
   * @returns Random webhook secret
   * @private
   */
  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
} 
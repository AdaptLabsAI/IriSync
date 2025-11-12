// CRM Service - Main orchestrator for all CRM operations
// Production-ready service following existing codebase patterns

import { firestore } from '@/lib/core/firebase/client';
import { getFirestore } from '@/lib/core/firebase/admin';
import { logger } from '@/lib/core/logging/logger';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp 
} from 'firebase/firestore';

import {
  CRMPlatform,
  CRMConnectionStatus,
  CRMDataType,
  SyncStatus,
  CRMError,
  CRMErrorType,
  CRMApiResponse,
  PaginationParams,
  SearchParams,
  SyncResult
} from './types';

import { 
  CRMConnection, 
  CRMConnectionUtils, 
  FirestoreCRMConnection,
  DEFAULT_SYNC_CONFIG 
} from './models/CRMConnection';

import { Contact, ContactUtils, ContactSearchParams, ContactData } from './models/Contact';
import { Deal, DealUtils, DealSearchParams, DealData } from './models/Deal';
import { Lead, LeadUtils, LeadSearchParams, LeadData } from './models/Lead';

import { HubSpotAdapter } from './adapters/HubSpotAdapter';
import { SalesforceAdapter } from './adapters/SalesforceAdapter';
import { ZohoAdapter } from './adapters/ZohoAdapter';
import { PipedriveAdapter } from './adapters/PipedriveAdapter';
import { DynamicsAdapter } from './adapters/DynamicsAdapter';
import { SugarCRMAdapter } from './adapters/SugarCRMAdapter';

import { SyncEngine } from './sync/SyncEngine';
import { RateLimiter } from './utils/RateLimiter';

/**
 * Main CRM Service class
 * Orchestrates all CRM operations across different platforms
 */
export class CRMService {
  private static instance: CRMService;
  private syncEngine: SyncEngine;
  private rateLimiter: RateLimiter;

  private constructor() {
    this.syncEngine = new SyncEngine();
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CRMService {
    if (!CRMService.instance) {
      CRMService.instance = new CRMService();
    }
    return CRMService.instance;
  }

  // ==================== CONNECTION MANAGEMENT ====================

  /**
   * Get all CRM connections for a user
   */
  async getConnections(userId: string, organizationId?: string): Promise<CRMConnection[]> {
    try {
      logger.info('Fetching CRM connections', { userId, organizationId });

      const connectionsRef = collection(firestore, 'crmConnections');
      let q = query(
        connectionsRef,
        where('userId', '==', userId),
        orderBy('connectedAt', 'desc')
      );

      if (organizationId) {
        q = query(q, where('organizationId', '==', organizationId));
      }

      const snapshot = await getDocs(q);
      const connections = snapshot.docs.map(doc => 
        CRMConnectionUtils.fromFirestore(doc.data() as FirestoreCRMConnection, doc.id)
      );

      logger.info('Successfully fetched CRM connections', { 
        userId, 
        organizationId, 
        count: connections.length 
      });

      return connections;
    } catch (error) {
      logger.error('Error fetching CRM connections', { userId, organizationId, error });
      throw new CRMError(
        'Failed to fetch CRM connections',
        CRMErrorType.API_ERROR,
        CRMPlatform.HUBSPOT, // Default platform for generic errors
        500,
        error
      );
    }
  }

  /**
   * Get a specific CRM connection
   */
  async getConnection(connectionId: string): Promise<CRMConnection | null> {
    try {
      const docRef = doc(firestore, 'crmConnections', connectionId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return CRMConnectionUtils.fromFirestore(
        docSnap.data() as FirestoreCRMConnection, 
        docSnap.id
      );
    } catch (error) {
      logger.error('Error fetching CRM connection', { connectionId, error });
      throw new CRMError(
        'Failed to fetch CRM connection',
        CRMErrorType.API_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  /**
   * Create a new CRM connection
   */
  async createConnection(connection: Omit<CRMConnection, 'id'>): Promise<CRMConnection> {
    try {
      logger.info('Creating CRM connection', { 
        userId: connection.userId, 
        platform: connection.platform 
      });

      const firestoreData = CRMConnectionUtils.toFirestore(connection);
      const docRef = await addDoc(collection(firestore, 'crmConnections'), firestoreData);

      const createdConnection = {
        ...connection,
        id: docRef.id,
        connectedAt: new Date(),
        updatedAt: new Date()
      };

      logger.info('Successfully created CRM connection', { 
        connectionId: docRef.id,
        userId: connection.userId, 
        platform: connection.platform 
      });

      return createdConnection;
    } catch (error) {
      logger.error('Error creating CRM connection', { 
        userId: connection.userId, 
        platform: connection.platform, 
        error 
      });
      throw new CRMError(
        'Failed to create CRM connection',
        CRMErrorType.API_ERROR,
        connection.platform,
        500,
        error
      );
    }
  }

  /**
   * Update a CRM connection
   */
  async updateConnection(connectionId: string, updates: Partial<CRMConnection>): Promise<CRMConnection> {
    try {
      const docRef = doc(firestore, 'crmConnections', connectionId);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      await updateDoc(docRef, updateData);

      const updatedDoc = await getDoc(docRef);
      if (!updatedDoc.exists()) {
        throw new Error('Connection not found after update');
      }

      return CRMConnectionUtils.fromFirestore(
        updatedDoc.data() as FirestoreCRMConnection,
        updatedDoc.id
      );
    } catch (error) {
      logger.error('Error updating CRM connection', { connectionId, error });
      throw new CRMError(
        'Failed to update CRM connection',
        CRMErrorType.API_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  /**
   * Delete a CRM connection
   */
  async deleteConnection(connectionId: string): Promise<void> {
    try {
      logger.info('Deleting CRM connection', { connectionId });

      await deleteDoc(doc(firestore, 'crmConnections', connectionId));

      logger.info('Successfully deleted CRM connection', { connectionId });
    } catch (error) {
      logger.error('Error deleting CRM connection', { connectionId, error });
      throw new CRMError(
        'Failed to delete CRM connection',
        CRMErrorType.API_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  // ==================== CONTACT OPERATIONS ====================

  /**
   * Get contacts from CRM platforms
   */
  async getContacts(
    userId: string, 
    params?: ContactSearchParams & PaginationParams
  ): Promise<CRMApiResponse<Contact[]>> {
    try {
      logger.info('Fetching CRM contacts', { userId, params });

      const connections = await this.getActiveConnections(userId);
      if (connections.length === 0) {
        return { success: true, data: [] };
      }

      const allContacts: Contact[] = [];

      for (const connection of connections) {
        try {
          await this.rateLimiter.checkLimit(connection.platform);

          const adapter = this.getAdapter(connection.platform);
          const platformContacts = await adapter.getContacts(
            connection.tokens.access_token,
            params?.limit || 100
          );

          // Transform platform-specific contacts to standardized format
          const standardizedContacts = this.transformContactsFromPlatform(
            platformContacts,
            connection
          );

          allContacts.push(...standardizedContacts);
        } catch (error) {
          logger.error('Error fetching contacts from platform', {
            platform: connection.platform,
            error
          });
          // Continue with other platforms
        }
      }

      logger.info('Successfully fetched CRM contacts', { 
        userId, 
        totalContacts: allContacts.length 
      });

      return { success: true, data: allContacts };
    } catch (error) {
      logger.error('Error fetching CRM contacts', { userId, error });
      return {
        success: false,
        error: 'Failed to fetch contacts',
        statusCode: 500
      };
    }
  }

  /**
   * Create a contact in CRM platforms
   */
  async createContact(
    userId: string, 
    contactData: ContactData,
    platforms?: CRMPlatform[]
  ): Promise<CRMApiResponse<Contact[]>> {
    try {
      logger.info('Creating CRM contact', { userId, platforms });

      const connections = await this.getActiveConnections(userId, platforms);
      if (connections.length === 0) {
        return { 
          success: false, 
          error: 'No active CRM connections found',
          statusCode: 400
        };
      }

      const createdContacts: Contact[] = [];

      for (const connection of connections) {
        try {
          await this.rateLimiter.checkLimit(connection.platform);

          const adapter = this.getAdapter(connection.platform);
          const platformContact = await adapter.createContact(
            connection.tokens.access_token,
            contactData
          );

          const standardizedContact = this.transformContactFromPlatform(
            platformContact,
            connection
          );

          createdContacts.push(standardizedContact);

          // Store in Firestore for sync
          await this.storeContact(standardizedContact);
        } catch (error) {
          logger.error('Error creating contact in platform', {
            platform: connection.platform,
            error
          });
        }
      }

      return { success: true, data: createdContacts };
    } catch (error) {
      logger.error('Error creating CRM contact', { userId, error });
      return {
        success: false,
        error: 'Failed to create contact',
        statusCode: 500
      };
    }
  }

  // ==================== DEAL OPERATIONS ====================

  /**
   * Get deals from CRM platforms
   */
  async getDeals(
    userId: string, 
    params?: DealSearchParams & PaginationParams
  ): Promise<CRMApiResponse<Deal[]>> {
    try {
      logger.info('Fetching CRM deals', { userId, params });

      const connections = await this.getActiveConnections(userId);
      if (connections.length === 0) {
        return { success: true, data: [] };
      }

      const allDeals: Deal[] = [];

      for (const connection of connections) {
        try {
          await this.rateLimiter.checkLimit(connection.platform);

          const adapter = this.getAdapter(connection.platform);
          const platformDeals = await adapter.getDeals(
            connection.tokens.access_token,
            params?.limit || 100
          );

          const standardizedDeals = this.transformDealsFromPlatform(
            platformDeals,
            connection
          );

          allDeals.push(...standardizedDeals);
        } catch (error) {
          logger.error('Error fetching deals from platform', {
            platform: connection.platform,
            error
          });
        }
      }

      logger.info('Successfully fetched CRM deals', { 
        userId, 
        totalDeals: allDeals.length 
      });

      return { success: true, data: allDeals };
    } catch (error) {
      logger.error('Error fetching CRM deals', { userId, error });
      return {
        success: false,
        error: 'Failed to fetch deals',
        statusCode: 500
      };
    }
  }

  // ==================== SYNC OPERATIONS ====================

  /**
   * Sync data from CRM platforms
   */
  async syncData(
    userId: string, 
    dataTypes: CRMDataType[] = [CRMDataType.CONTACTS, CRMDataType.DEALS],
    platforms?: CRMPlatform[]
  ): Promise<SyncResult[]> {
    try {
      logger.info('Starting CRM data sync', { userId, dataTypes, platforms });

      const connections = await this.getActiveConnections(userId, platforms);
      if (connections.length === 0) {
        return [];
      }

      const syncResults: SyncResult[] = [];

      for (const connection of connections) {
        for (const dataType of dataTypes) {
          const result = await this.syncEngine.syncData(connection, dataType);
          syncResults.push(result);
        }
      }

      logger.info('Completed CRM data sync', { 
        userId, 
        totalResults: syncResults.length 
      });

      return syncResults;
    } catch (error) {
      logger.error('Error during CRM data sync', { userId, error });
      throw new CRMError(
        'Failed to sync CRM data',
        CRMErrorType.SYNC_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Get active CRM connections for a user
   */
  private async getActiveConnections(
    userId: string, 
    platforms?: CRMPlatform[]
  ): Promise<CRMConnection[]> {
    const connections = await this.getConnections(userId);
    
    return connections.filter(connection => {
      const isActive = CRMConnectionUtils.isActive(connection);
      const isPlatformMatch = !platforms || platforms.includes(connection.platform);
      return isActive && isPlatformMatch;
    });
  }

  /**
   * Get the appropriate adapter for a CRM platform
   */
  private getAdapter(platform: CRMPlatform): any {
    switch (platform) {
      case CRMPlatform.HUBSPOT:
        return HubSpotAdapter;
      case CRMPlatform.SALESFORCE:
        return SalesforceAdapter;
      case CRMPlatform.ZOHO:
        return ZohoAdapter;
      case CRMPlatform.PIPEDRIVE:
        return PipedriveAdapter;
      case CRMPlatform.DYNAMICS:
        return DynamicsAdapter;
      case CRMPlatform.SUGARCRM:
        return SugarCRMAdapter;
      default:
        throw new CRMError(
          `Unsupported CRM platform: ${platform}`,
          CRMErrorType.VALIDATION_ERROR,
          platform,
          400
        );
    }
  }

  /**
   * Transform platform-specific contacts to standardized format
   */
  private transformContactsFromPlatform(
    platformContacts: any[],
    connection: CRMConnection
  ): Contact[] {
    return platformContacts.map(contact => 
      this.transformContactFromPlatform(contact, connection)
    );
  }

  /**
   * Transform a single platform contact to standardized format
   */
  private transformContactFromPlatform(
    platformContact: any,
    connection: CRMConnection
  ): Contact {
    // This would contain platform-specific transformation logic
    // For now, returning a basic transformation
    return {
      externalId: platformContact.id || platformContact.Id,
      platform: connection.platform,
      userId: connection.userId,
      organizationId: connection.organizationId,
      firstName: platformContact.firstName || platformContact.First_Name,
      lastName: platformContact.lastName || platformContact.Last_Name,
      email: platformContact.email || platformContact.Email,
      phone: platformContact.phone || platformContact.Phone,
      company: platformContact.company || platformContact.Company,
      lastSyncAt: new Date(),
      syncStatus: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
      rawData: platformContact
    };
  }

  /**
   * Transform platform-specific deals to standardized format
   */
  private transformDealsFromPlatform(
    platformDeals: any[],
    connection: CRMConnection
  ): Deal[] {
    return platformDeals.map(deal => ({
      externalId: deal.id || deal.Id,
      platform: connection.platform,
      userId: connection.userId,
      organizationId: connection.organizationId,
      name: deal.name || deal.Name || deal.Deal_Name,
      amount: deal.amount || deal.Amount,
      stage: deal.stage || deal.Stage || deal.StageName,
      lastSyncAt: new Date(),
      syncStatus: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
      rawData: deal
    }));
  }

  /**
   * Store contact in Firestore
   */
  private async storeContact(contact: Contact): Promise<void> {
    try {
      const firestoreData = ContactUtils.toFirestore(contact);
      await addDoc(collection(firestore, 'crmContacts'), firestoreData);
    } catch (error) {
      logger.error('Error storing contact in Firestore', { contact, error });
    }
  }
} 
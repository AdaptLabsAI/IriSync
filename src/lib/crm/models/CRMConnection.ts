// CRM Connection Model
// Defines the structure and operations for CRM connections

import { Timestamp } from 'firebase/firestore';
import { 
  CRMPlatform, 
  CRMConnectionStatus, 
  CRMTokens, 
  SyncConfig,
  CRMDataType
} from '../types';

/**
 * CRM Connection interface for application use
 */
export interface CRMConnection {
  id?: string;
  userId: string;
  organizationId?: string;
  platform: CRMPlatform;
  accountId: string;
  accountName: string;
  accountEmail: string;
  status: CRMConnectionStatus;
  tokens: CRMTokens;
  config: SyncConfig;
  lastSyncAt?: Date;
  connectedAt: Date;
  updatedAt: Date;
  errorMessage?: string;
  webhookId?: string;
  features?: {
    contacts: boolean;
    deals: boolean;
    leads: boolean;
    companies: boolean;
    activities: boolean;
    webhooks: boolean;
    realTimeSync: boolean;
  };
  metadata?: {
    apiVersion?: string;
    instanceUrl?: string;
    region?: string;
    timezone?: string;
    currency?: string;
  };
}

/**
 * Firestore CRM Connection document structure
 */
export interface FirestoreCRMConnection {
  userId: string;
  organizationId?: string;
  platform: CRMPlatform;
  accountId: string;
  accountName: string;
  accountEmail: string;
  status: CRMConnectionStatus;
  tokens: CRMTokens;
  config: SyncConfig;
  lastSyncAt?: Timestamp;
  connectedAt: Timestamp;
  updatedAt: Timestamp;
  errorMessage?: string;
  webhookId?: string;
  features?: {
    contacts: boolean;
    deals: boolean;
    leads: boolean;
    companies: boolean;
    activities: boolean;
    webhooks: boolean;
    realTimeSync: boolean;
  };
  metadata?: {
    apiVersion?: string;
    instanceUrl?: string;
    region?: string;
    timezone?: string;
    currency?: string;
  };
}

/**
 * Default sync configuration
 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: true,
  interval: 60, // 1 hour
  dataTypes: [CRMDataType.CONTACTS, CRMDataType.DEALS],
  bidirectional: false,
  conflictResolution: 'source_wins',
  batchSize: 100,
  retryAttempts: 3
};

/**
 * Default features for each platform
 */
export const PLATFORM_FEATURES: Record<CRMPlatform, CRMConnection['features']> = {
  [CRMPlatform.HUBSPOT]: {
    contacts: true,
    deals: true,
    leads: true,
    companies: true,
    activities: true,
    webhooks: true,
    realTimeSync: true
  },
  [CRMPlatform.SALESFORCE]: {
    contacts: true,
    deals: true,
    leads: true,
    companies: true,
    activities: true,
    webhooks: true,
    realTimeSync: true
  },
  [CRMPlatform.ZOHO]: {
    contacts: true,
    deals: true,
    leads: true,
    companies: true,
    activities: true,
    webhooks: true,
    realTimeSync: false
  },
  [CRMPlatform.PIPEDRIVE]: {
    contacts: true,
    deals: true,
    leads: true,
    companies: true,
    activities: true,
    webhooks: true,
    realTimeSync: false
  },
  [CRMPlatform.DYNAMICS]: {
    contacts: true,
    deals: true,
    leads: true,
    companies: true,
    activities: true,
    webhooks: false,
    realTimeSync: false
  },
  [CRMPlatform.SUGARCRM]: {
    contacts: true,
    deals: true,
    leads: true,
    companies: true,
    activities: true,
    webhooks: false,
    realTimeSync: false
  }
};

/**
 * Utility functions for CRM connections
 */
export class CRMConnectionUtils {
  /**
   * Convert Firestore document to CRM connection
   */
  static fromFirestore(doc: FirestoreCRMConnection, id: string): CRMConnection {
    return {
      id,
      userId: doc.userId,
      organizationId: doc.organizationId,
      platform: doc.platform,
      accountId: doc.accountId,
      accountName: doc.accountName,
      accountEmail: doc.accountEmail,
      status: doc.status,
      tokens: doc.tokens,
      config: doc.config,
      lastSyncAt: doc.lastSyncAt?.toDate(),
      connectedAt: doc.connectedAt.toDate(),
      updatedAt: doc.updatedAt.toDate(),
      errorMessage: doc.errorMessage,
      webhookId: doc.webhookId,
      features: doc.features || PLATFORM_FEATURES[doc.platform],
      metadata: doc.metadata
    };
  }

  /**
   * Convert CRM connection to Firestore document
   */
  static toFirestore(connection: CRMConnection): Omit<FirestoreCRMConnection, 'connectedAt' | 'updatedAt'> & {
    connectedAt?: Timestamp;
    updatedAt?: Timestamp;
    lastSyncAt?: Timestamp;
  } {
    return {
      userId: connection.userId,
      organizationId: connection.organizationId,
      platform: connection.platform,
      accountId: connection.accountId,
      accountName: connection.accountName,
      accountEmail: connection.accountEmail,
      status: connection.status,
      tokens: connection.tokens,
      config: connection.config,
      lastSyncAt: connection.lastSyncAt ? Timestamp.fromDate(connection.lastSyncAt) : undefined,
      connectedAt: connection.connectedAt ? Timestamp.fromDate(connection.connectedAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      errorMessage: connection.errorMessage,
      webhookId: connection.webhookId,
      features: connection.features,
      metadata: connection.metadata
    };
  }

  /**
   * Check if connection is active and valid
   */
  static isActive(connection: CRMConnection): boolean {
    return connection.status === CRMConnectionStatus.CONNECTED && 
           this.isTokenValid(connection.tokens);
  }

  /**
   * Check if tokens are valid (not expired)
   */
  static isTokenValid(tokens: CRMTokens): boolean {
    if (!tokens.expires_at) return true; // No expiration set
    return Date.now() < tokens.expires_at * 1000;
  }

  /**
   * Check if tokens need refresh (expire within 5 minutes)
   */
  static needsTokenRefresh(tokens: CRMTokens): boolean {
    if (!tokens.expires_at) return false;
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return fiveMinutesFromNow >= tokens.expires_at * 1000;
  }

  /**
   * Get platform display name
   */
  static getPlatformDisplayName(platform: CRMPlatform): string {
    const names: Record<CRMPlatform, string> = {
      [CRMPlatform.HUBSPOT]: 'HubSpot',
      [CRMPlatform.SALESFORCE]: 'Salesforce',
      [CRMPlatform.ZOHO]: 'Zoho CRM',
      [CRMPlatform.PIPEDRIVE]: 'Pipedrive',
      [CRMPlatform.DYNAMICS]: 'Microsoft Dynamics',
      [CRMPlatform.SUGARCRM]: 'SugarCRM'
    };
    return names[platform] || platform;
  }

  /**
   * Get platform color for UI
   */
  static getPlatformColor(platform: CRMPlatform): string {
    const colors: Record<CRMPlatform, string> = {
      [CRMPlatform.HUBSPOT]: '#ff7a59',
      [CRMPlatform.SALESFORCE]: '#00a1e0',
      [CRMPlatform.ZOHO]: '#c83c3c',
      [CRMPlatform.PIPEDRIVE]: '#1a73e8',
      [CRMPlatform.DYNAMICS]: '#0078d4',
      [CRMPlatform.SUGARCRM]: '#e61e2b'
    };
    return colors[platform] || '#666666';
  }
} 
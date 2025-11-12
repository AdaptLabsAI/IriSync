// CRM Deal Model
// Standardized deal/opportunity structure across all CRM platforms

import { Timestamp } from 'firebase/firestore';
import { CRMPlatform } from '../types';

/**
 * Standardized deal interface
 */
export interface Deal {
  id?: string;
  externalId: string; // ID from the CRM platform
  platform: CRMPlatform;
  userId: string;
  organizationId?: string;
  
  // Basic Information
  name: string;
  description?: string;
  amount?: number;
  currency?: string;
  
  // Deal Status
  stage?: string;
  status?: 'open' | 'won' | 'lost' | 'pending';
  probability?: number; // 0-100
  
  // Dates
  closeDate?: Date;
  expectedCloseDate?: Date;
  createdDate?: Date;
  lastActivityDate?: Date;
  
  // Associated Records
  contactId?: string;
  contactName?: string;
  accountId?: string;
  accountName?: string;
  companyName?: string;
  
  // Ownership
  ownerId?: string;
  ownerName?: string;
  
  // Source Information
  leadSource?: string;
  dealSource?: string;
  
  // Custom Fields (platform-specific)
  customFields?: Record<string, any>;
  
  // Metadata
  tags?: string[];
  notes?: string;
  
  // Pipeline Information
  pipelineId?: string;
  pipelineName?: string;
  stageId?: string;
  
  // Sync Information
  lastSyncAt?: Date;
  syncStatus?: 'synced' | 'pending' | 'error';
  syncError?: string;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
  
  // Platform-specific raw data
  rawData?: any;
}

/**
 * Firestore deal document structure
 */
export interface FirestoreDeal {
  externalId: string;
  platform: CRMPlatform;
  userId: string;
  organizationId?: string;
  name: string;
  description?: string;
  amount?: number;
  currency?: string;
  stage?: string;
  status?: string;
  probability?: number;
  closeDate?: Timestamp;
  expectedCloseDate?: Timestamp;
  createdDate?: Timestamp;
  lastActivityDate?: Timestamp;
  contactId?: string;
  contactName?: string;
  accountId?: string;
  accountName?: string;
  companyName?: string;
  ownerId?: string;
  ownerName?: string;
  leadSource?: string;
  dealSource?: string;
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string;
  pipelineId?: string;
  pipelineName?: string;
  stageId?: string;
  lastSyncAt?: Timestamp;
  syncStatus?: string;
  syncError?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  rawData?: any;
}

/**
 * Deal search/filter parameters
 */
export interface DealSearchParams {
  query?: string;
  stage?: string;
  status?: string;
  ownerId?: string;
  contactId?: string;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  closeDateAfter?: Date;
  closeDateBefore?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Deal creation/update data
 */
export interface DealData {
  externalId?: string;
  platform?: CRMPlatform;
  name: string;
  description?: string;
  amount?: number;
  currency?: string;
  stage?: string;
  status?: string;
  probability?: number;
  closeDate?: Date;
  expectedCloseDate?: Date;
  contactId?: string;
  contactName?: string;
  accountId?: string;
  companyName?: string;
  ownerId?: string;
  leadSource?: string;
  dealSource?: string;
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string;
  pipelineId?: string;
  stageId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Platform-specific deal interfaces
 */
export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    createdate?: string;
    hs_lastmodifieddate?: string;
    dealtype?: string;
    description?: string;
    hubspot_owner_id?: string;
    hs_deal_stage_probability?: string;
    hs_analytics_source?: string;
    hs_deal_amount_calculation_preference?: string;
    [key: string]: any;
  };
  associations?: {
    contacts?: {
      results: Array<{ id: string; type: string }>;
    };
    companies?: {
      results: Array<{ id: string; type: string }>;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface SalesforceDeal {
  Id: string;
  Name?: string;
  Description?: string;
  Amount?: number;
  StageName?: string;
  Probability?: number;
  CloseDate?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  LastActivityDate?: string;
  AccountId?: string;
  Account?: {
    Name?: string;
  };
  ContactId?: string;
  Contact?: {
    Name?: string;
  };
  OwnerId?: string;
  Owner?: {
    Name?: string;
  };
  LeadSource?: string;
  Type?: string;
  CurrencyIsoCode?: string;
  [key: string]: any;
}

export interface ZohoDeal {
  id: string;
  Deal_Name?: string;
  Description?: string;
  Amount?: number;
  Stage?: string;
  Probability?: number;
  Closing_Date?: string;
  Created_Time: string;
  Modified_Time: string;
  Last_Activity_Time?: string;
  Account_Name?: {
    name?: string;
    id?: string;
  };
  Contact_Name?: {
    name?: string;
    id?: string;
  };
  Owner?: {
    name?: string;
    id?: string;
  };
  Lead_Source?: string;
  Deal_Category?: string;
  Currency?: string;
  Pipeline?: string;
  [key: string]: any;
}

export interface PipedriveDeal {
  id: number;
  title?: string;
  value?: number;
  currency?: string;
  stage_id?: number;
  stage_name?: string;
  pipeline_id?: number;
  status?: string;
  probability?: number;
  expected_close_date?: string;
  close_time?: string;
  add_time: string;
  update_time: string;
  last_activity_date?: string;
  org_id?: {
    name?: string;
    value?: number;
  };
  person_id?: {
    name?: string;
    value?: number;
  };
  user_id?: {
    name?: string;
    value?: number;
  };
  [key: string]: any;
}

export interface DynamicsDeal {
  opportunityid: string;
  name?: string;
  description?: string;
  estimatedvalue?: number;
  actualvalue?: number;
  stepname?: string;
  statecode?: number;
  statuscode?: number;
  closeprobability?: number;
  estimatedclosedate?: string;
  actualclosedate?: string;
  createdon: string;
  modifiedon: string;
  _parentaccountid_value?: string;
  _parentcontactid_value?: string;
  _ownerid_value?: string;
  transactioncurrencyid?: string;
  [key: string]: any;
}

/**
 * Deal utility functions
 */
export class DealUtils {
  /**
   * Convert Firestore document to Deal
   */
  static fromFirestore(doc: FirestoreDeal, id: string): Deal {
    return {
      id,
      externalId: doc.externalId,
      platform: doc.platform,
      userId: doc.userId,
      organizationId: doc.organizationId,
      name: doc.name,
      description: doc.description,
      amount: doc.amount,
      currency: doc.currency,
      stage: doc.stage,
      status: doc.status as any,
      probability: doc.probability,
      closeDate: doc.closeDate?.toDate(),
      expectedCloseDate: doc.expectedCloseDate?.toDate(),
      createdDate: doc.createdDate?.toDate(),
      lastActivityDate: doc.lastActivityDate?.toDate(),
      contactId: doc.contactId,
      contactName: doc.contactName,
      accountId: doc.accountId,
      accountName: doc.accountName,
      companyName: doc.companyName,
      ownerId: doc.ownerId,
      ownerName: doc.ownerName,
      leadSource: doc.leadSource,
      dealSource: doc.dealSource,
      customFields: doc.customFields,
      tags: doc.tags,
      notes: doc.notes,
      pipelineId: doc.pipelineId,
      pipelineName: doc.pipelineName,
      stageId: doc.stageId,
      lastSyncAt: doc.lastSyncAt?.toDate(),
      syncStatus: doc.syncStatus as any,
      syncError: doc.syncError,
      createdAt: doc.createdAt.toDate(),
      updatedAt: doc.updatedAt.toDate(),
      rawData: doc.rawData
    };
  }

  /**
   * Convert Deal to Firestore document
   */
  static toFirestore(deal: Deal): Omit<FirestoreDeal, 'createdAt' | 'updatedAt'> & {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    lastSyncAt?: Timestamp;
    closeDate?: Timestamp;
    expectedCloseDate?: Timestamp;
    createdDate?: Timestamp;
    lastActivityDate?: Timestamp;
  } {
    return {
      externalId: deal.externalId,
      platform: deal.platform,
      userId: deal.userId,
      organizationId: deal.organizationId,
      name: deal.name,
      description: deal.description,
      amount: deal.amount,
      currency: deal.currency,
      stage: deal.stage,
      status: deal.status,
      probability: deal.probability,
      closeDate: deal.closeDate ? Timestamp.fromDate(deal.closeDate) : undefined,
      expectedCloseDate: deal.expectedCloseDate ? Timestamp.fromDate(deal.expectedCloseDate) : undefined,
      createdDate: deal.createdDate ? Timestamp.fromDate(deal.createdDate) : undefined,
      lastActivityDate: deal.lastActivityDate ? Timestamp.fromDate(deal.lastActivityDate) : undefined,
      contactId: deal.contactId,
      contactName: deal.contactName,
      accountId: deal.accountId,
      accountName: deal.accountName,
      companyName: deal.companyName,
      ownerId: deal.ownerId,
      ownerName: deal.ownerName,
      leadSource: deal.leadSource,
      dealSource: deal.dealSource,
      customFields: deal.customFields,
      tags: deal.tags,
      notes: deal.notes,
      pipelineId: deal.pipelineId,
      pipelineName: deal.pipelineName,
      stageId: deal.stageId,
      lastSyncAt: deal.lastSyncAt ? Timestamp.fromDate(deal.lastSyncAt) : undefined,
      syncStatus: deal.syncStatus,
      syncError: deal.syncError,
      createdAt: deal.createdAt ? Timestamp.fromDate(deal.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      rawData: deal.rawData
    };
  }

  /**
   * Validate deal data
   */
  static validate(deal: DealData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Name is required
    if (!deal.name || deal.name.trim().length === 0) {
      errors.push('Deal name is required');
    }

    // Amount validation
    if (deal.amount !== undefined && deal.amount < 0) {
      errors.push('Deal amount cannot be negative');
    }

    // Probability validation
    if (deal.probability !== undefined && (deal.probability < 0 || deal.probability > 100)) {
      errors.push('Probability must be between 0 and 100');
    }

    // Close date validation
    if (deal.closeDate && deal.closeDate < new Date()) {
      errors.push('Close date cannot be in the past');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate deal value in base currency
   */
  static calculateBaseValue(amount: number, currency: string, exchangeRates: Record<string, number>): number {
    if (!exchangeRates[currency]) return amount;
    return amount * exchangeRates[currency];
  }

  /**
   * Get deal status color for UI
   */
  static getStatusColor(status?: string): string {
    const colors: Record<string, string> = {
      'open': '#2196f3',
      'won': '#4caf50',
      'lost': '#f44336',
      'pending': '#ff9800'
    };
    return colors[status || 'open'] || '#666666';
  }

  /**
   * Format deal amount for display
   */
  static formatAmount(amount?: number, currency?: string): string {
    if (!amount) return 'N/A';
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    
    return formatter.format(amount);
  }

  /**
   * Calculate days until close date
   */
  static getDaysUntilClose(closeDate?: Date): number | null {
    if (!closeDate) return null;
    
    const today = new Date();
    const diffTime = closeDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Get deal stage progress percentage
   */
  static getStageProgress(stage?: string, stages?: string[]): number {
    if (!stage || !stages || stages.length === 0) return 0;
    
    const stageIndex = stages.indexOf(stage);
    if (stageIndex === -1) return 0;
    
    return Math.round(((stageIndex + 1) / stages.length) * 100);
  }
} 
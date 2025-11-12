// CRM Lead Model
// Standardized lead structure across all CRM platforms

import { Timestamp } from 'firebase/firestore';
import { CRMPlatform } from '../types';

/**
 * Standardized lead interface
 */
export interface Lead {
  id?: string;
  externalId: string; // ID from the CRM platform
  platform: CRMPlatform;
  userId: string;
  organizationId?: string;
  
  // Basic Information
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  
  // Company Information
  company?: string;
  jobTitle?: string;
  industry?: string;
  website?: string;
  
  // Address Information
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Lead Status
  status?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
  leadSource?: string;
  leadScore?: number;
  rating?: 'hot' | 'warm' | 'cold';
  
  // Qualification
  isQualified?: boolean;
  qualificationDate?: Date;
  qualificationNotes?: string;
  
  // Conversion
  isConverted?: boolean;
  convertedDate?: Date;
  convertedContactId?: string;
  convertedAccountId?: string;
  convertedDealId?: string;
  
  // Engagement
  lastContactedAt?: Date;
  lastActivityAt?: Date;
  engagementScore?: number;
  
  // Custom Fields (platform-specific)
  customFields?: Record<string, any>;
  
  // Metadata
  tags?: string[];
  notes?: string;
  ownerId?: string;
  ownerName?: string;
  
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
 * Firestore lead document structure
 */
export interface FirestoreLead {
  externalId: string;
  platform: CRMPlatform;
  userId: string;
  organizationId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  status?: string;
  leadSource?: string;
  leadScore?: number;
  rating?: string;
  isQualified?: boolean;
  qualificationDate?: Timestamp;
  qualificationNotes?: string;
  isConverted?: boolean;
  convertedDate?: Timestamp;
  convertedContactId?: string;
  convertedAccountId?: string;
  convertedDealId?: string;
  lastContactedAt?: Timestamp;
  lastActivityAt?: Timestamp;
  engagementScore?: number;
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string;
  ownerId?: string;
  ownerName?: string;
  lastSyncAt?: Timestamp;
  syncStatus?: string;
  syncError?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  rawData?: any;
}

/**
 * Lead search/filter parameters
 */
export interface LeadSearchParams {
  query?: string;
  email?: string;
  company?: string;
  status?: string;
  leadSource?: string;
  rating?: string;
  isQualified?: boolean;
  isConverted?: boolean;
  ownerId?: string;
  minScore?: number;
  maxScore?: number;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Lead creation/update data
 */
export interface LeadData {
  externalId?: string;
  platform?: CRMPlatform;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  status?: string;
  leadSource?: string;
  leadScore?: number;
  rating?: string;
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string;
  ownerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Platform-specific lead interfaces
 */
export interface HubSpotLead {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    mobilephone?: string;
    company?: string;
    jobtitle?: string;
    industry?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    lifecyclestage?: string;
    lead_status?: string;
    hs_lead_status?: string;
    hubspotscore?: string;
    hubspot_owner_id?: string;
    notes_last_contacted?: string;
    lastmodifieddate?: string;
    createdate?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SalesforceLead {
  Id: string;
  FirstName?: string;
  LastName?: string;
  Name?: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  Company?: string;
  Title?: string;
  Industry?: string;
  Website?: string;
  Street?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
  Status?: string;
  LeadSource?: string;
  Rating?: string;
  IsConverted?: boolean;
  ConvertedDate?: string;
  ConvertedContactId?: string;
  ConvertedAccountId?: string;
  ConvertedOpportunityId?: string;
  OwnerId?: string;
  Owner?: {
    Name?: string;
  };
  CreatedDate: string;
  LastModifiedDate: string;
  [key: string]: any;
}

export interface ZohoLead {
  id: string;
  First_Name?: string;
  Last_Name?: string;
  Full_Name?: string;
  Email?: string;
  Phone?: string;
  Mobile?: string;
  Company?: string;
  Designation?: string;
  Industry?: string;
  Website?: string;
  Street?: string;
  City?: string;
  State?: string;
  Zip_Code?: string;
  Country?: string;
  Lead_Status?: string;
  Lead_Source?: string;
  Rating?: string;
  Converted?: boolean;
  Converted_Date?: string;
  Converted_Contact?: {
    name?: string;
    id?: string;
  };
  Converted_Account?: {
    name?: string;
    id?: string;
  };
  Converted_Deal?: {
    name?: string;
    id?: string;
  };
  Owner?: {
    name?: string;
    id?: string;
  };
  Created_Time: string;
  Modified_Time: string;
  [key: string]: any;
}

export interface PipedriveLead {
  id: string;
  title?: string;
  person_id?: number;
  organization_id?: number;
  source_name?: string;
  is_archived?: boolean;
  was_seen?: boolean;
  value?: {
    amount?: number;
    currency?: string;
  };
  expected_close_date?: string;
  next_activity_id?: number;
  add_time: string;
  update_time: string;
  visible_to?: string;
  cc_email?: string;
  owner_id?: number;
  [key: string]: any;
}

/**
 * Lead utility functions
 */
export class LeadUtils {
  /**
   * Convert Firestore document to Lead
   */
  static fromFirestore(doc: FirestoreLead, id: string): Lead {
    return {
      id,
      externalId: doc.externalId,
      platform: doc.platform,
      userId: doc.userId,
      organizationId: doc.organizationId,
      firstName: doc.firstName,
      lastName: doc.lastName,
      fullName: doc.fullName,
      email: doc.email,
      phone: doc.phone,
      mobilePhone: doc.mobilePhone,
      company: doc.company,
      jobTitle: doc.jobTitle,
      industry: doc.industry,
      website: doc.website,
      address: doc.address,
      status: doc.status as any,
      leadSource: doc.leadSource,
      leadScore: doc.leadScore,
      rating: doc.rating as any,
      isQualified: doc.isQualified,
      qualificationDate: doc.qualificationDate?.toDate(),
      qualificationNotes: doc.qualificationNotes,
      isConverted: doc.isConverted,
      convertedDate: doc.convertedDate?.toDate(),
      convertedContactId: doc.convertedContactId,
      convertedAccountId: doc.convertedAccountId,
      convertedDealId: doc.convertedDealId,
      lastContactedAt: doc.lastContactedAt?.toDate(),
      lastActivityAt: doc.lastActivityAt?.toDate(),
      engagementScore: doc.engagementScore,
      customFields: doc.customFields,
      tags: doc.tags,
      notes: doc.notes,
      ownerId: doc.ownerId,
      ownerName: doc.ownerName,
      lastSyncAt: doc.lastSyncAt?.toDate(),
      syncStatus: doc.syncStatus as any,
      syncError: doc.syncError,
      createdAt: doc.createdAt.toDate(),
      updatedAt: doc.updatedAt.toDate(),
      rawData: doc.rawData
    };
  }

  /**
   * Convert Lead to Firestore document
   */
  static toFirestore(lead: Lead): Omit<FirestoreLead, 'createdAt' | 'updatedAt'> & {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    lastSyncAt?: Timestamp;
    qualificationDate?: Timestamp;
    convertedDate?: Timestamp;
    lastContactedAt?: Timestamp;
    lastActivityAt?: Timestamp;
  } {
    return {
      externalId: lead.externalId,
      platform: lead.platform,
      userId: lead.userId,
      organizationId: lead.organizationId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      mobilePhone: lead.mobilePhone,
      company: lead.company,
      jobTitle: lead.jobTitle,
      industry: lead.industry,
      website: lead.website,
      address: lead.address,
      status: lead.status,
      leadSource: lead.leadSource,
      leadScore: lead.leadScore,
      rating: lead.rating,
      isQualified: lead.isQualified,
      qualificationDate: lead.qualificationDate ? Timestamp.fromDate(lead.qualificationDate) : undefined,
      qualificationNotes: lead.qualificationNotes,
      isConverted: lead.isConverted,
      convertedDate: lead.convertedDate ? Timestamp.fromDate(lead.convertedDate) : undefined,
      convertedContactId: lead.convertedContactId,
      convertedAccountId: lead.convertedAccountId,
      convertedDealId: lead.convertedDealId,
      lastContactedAt: lead.lastContactedAt ? Timestamp.fromDate(lead.lastContactedAt) : undefined,
      lastActivityAt: lead.lastActivityAt ? Timestamp.fromDate(lead.lastActivityAt) : undefined,
      engagementScore: lead.engagementScore,
      customFields: lead.customFields,
      tags: lead.tags,
      notes: lead.notes,
      ownerId: lead.ownerId,
      ownerName: lead.ownerName,
      lastSyncAt: lead.lastSyncAt ? Timestamp.fromDate(lead.lastSyncAt) : undefined,
      syncStatus: lead.syncStatus,
      syncError: lead.syncError,
      createdAt: lead.createdAt ? Timestamp.fromDate(lead.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      rawData: lead.rawData
    };
  }

  /**
   * Generate full name from first and last name
   */
  static generateFullName(firstName?: string, lastName?: string): string {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.join(' ');
  }

  /**
   * Validate lead data
   */
  static validate(lead: LeadData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // At least one of email, phone, or name is required
    if (!lead.email && !lead.phone && !lead.firstName && !lead.lastName) {
      errors.push('At least one of email, phone, first name, or last name is required');
    }

    // Email validation
    if (lead.email && !this.isValidEmail(lead.email)) {
      errors.push('Invalid email format');
    }

    // Phone validation
    if (lead.phone && !this.isValidPhone(lead.phone)) {
      errors.push('Invalid phone format');
    }

    // Website validation
    if (lead.website && !this.isValidUrl(lead.website)) {
      errors.push('Invalid website URL format');
    }

    // Lead score validation
    if (lead.leadScore !== undefined && (lead.leadScore < 0 || lead.leadScore > 100)) {
      errors.push('Lead score must be between 0 and 100');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate lead score based on various factors
   */
  static calculateLeadScore(lead: Lead): number {
    let score = 0;

    // Basic information completeness
    if (lead.email) score += 20;
    if (lead.phone) score += 15;
    if (lead.company) score += 15;
    if (lead.jobTitle) score += 10;

    // Engagement factors
    if (lead.lastContactedAt) {
      const daysSinceContact = Math.floor((Date.now() - lead.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceContact <= 7) score += 20;
      else if (daysSinceContact <= 30) score += 10;
    }

    // Lead source quality
    const sourceScores: Record<string, number> = {
      'referral': 20,
      'website': 15,
      'social_media': 10,
      'email_campaign': 8,
      'cold_call': 5
    };
    if (lead.leadSource && sourceScores[lead.leadSource.toLowerCase()]) {
      score += sourceScores[lead.leadSource.toLowerCase()];
    }

    return Math.min(score, 100);
  }

  /**
   * Get lead status color for UI
   */
  static getStatusColor(status?: string): string {
    const colors: Record<string, string> = {
      'new': '#2196f3',
      'contacted': '#ff9800',
      'qualified': '#4caf50',
      'unqualified': '#9e9e9e',
      'converted': '#8bc34a',
      'lost': '#f44336'
    };
    return colors[status || 'new'] || '#666666';
  }

  /**
   * Get lead rating color for UI
   */
  static getRatingColor(rating?: string): string {
    const colors: Record<string, string> = {
      'hot': '#f44336',
      'warm': '#ff9800',
      'cold': '#2196f3'
    };
    return colors[rating || 'cold'] || '#666666';
  }

  /**
   * Check if lead is qualified based on criteria
   */
  static isQualifiedLead(lead: Lead): boolean {
    // Basic qualification criteria
    const hasContact = !!(lead.email || lead.phone);
    const hasCompany = !!lead.company;
    const hasTitle = !!lead.jobTitle;
    const hasRecentActivity = lead.lastActivityAt ? 
      (Date.now() - lead.lastActivityAt.getTime()) < (30 * 24 * 60 * 60 * 1000) : false; // 30 days

    return hasContact && hasCompany && (hasTitle || hasRecentActivity);
  }

  /**
   * Simple email validation
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Simple phone validation
   */
  private static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Simple URL validation
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
} 
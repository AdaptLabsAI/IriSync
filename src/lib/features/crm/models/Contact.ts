// CRM Contact Model
// Standardized contact structure across all CRM platforms

import { Timestamp } from 'firebase/firestore';
import { CRMPlatform } from '../types';

/**
 * Standardized contact interface
 */
export interface Contact {
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
  department?: string;
  
  // Address Information
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Social Media
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  
  // Contact Status
  status?: 'active' | 'inactive' | 'lead' | 'customer' | 'prospect';
  leadSource?: string;
  leadStatus?: string;
  
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
 * Firestore contact document structure
 */
export interface FirestoreContact {
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
  department?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  status?: string;
  leadSource?: string;
  leadStatus?: string;
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
 * Contact search/filter parameters
 */
export interface ContactSearchParams {
  query?: string;
  email?: string;
  company?: string;
  status?: string;
  leadSource?: string;
  tags?: string[];
  ownerId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Contact creation/update data
 */
export interface ContactData {
  externalId?: string;
  platform?: CRMPlatform;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  status?: string;
  leadSource?: string;
  leadStatus?: string;
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string;
  ownerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Platform-specific contact interfaces
 */
export interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    mobilephone?: string;
    company?: string;
    jobtitle?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    lifecyclestage?: string;
    lead_status?: string;
    hs_lead_status?: string;
    hubspot_owner_id?: string;
    notes_last_contacted?: string;
    lastmodifieddate?: string;
    createdate?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SalesforceContact {
  Id: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  Account?: {
    Name?: string;
  };
  Title?: string;
  Department?: string;
  MailingStreet?: string;
  MailingCity?: string;
  MailingState?: string;
  MailingPostalCode?: string;
  MailingCountry?: string;
  LeadSource?: string;
  OwnerId?: string;
  Owner?: {
    Name?: string;
  };
  CreatedDate: string;
  LastModifiedDate: string;
  [key: string]: any;
}

export interface ZohoContact {
  id: string;
  First_Name?: string;
  Last_Name?: string;
  Full_Name?: string;
  Email?: string;
  Phone?: string;
  Mobile?: string;
  Account_Name?: {
    name?: string;
    id?: string;
  };
  Title?: string;
  Department?: string;
  Mailing_Street?: string;
  Mailing_City?: string;
  Mailing_State?: string;
  Mailing_Zip?: string;
  Mailing_Country?: string;
  Lead_Source?: string;
  Owner?: {
    name?: string;
    id?: string;
  };
  Created_Time: string;
  Modified_Time: string;
  [key: string]: any;
}

export interface PipedriveContact {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: Array<{
    value: string;
    primary: boolean;
  }>;
  phone?: Array<{
    value: string;
    primary: boolean;
  }>;
  org_id?: {
    name?: string;
    value?: number;
  };
  owner_id?: {
    name?: string;
    value?: number;
  };
  add_time: string;
  update_time: string;
  [key: string]: any;
}

/**
 * Contact utility functions
 */
export class ContactUtils {
  /**
   * Convert Firestore document to Contact
   */
  static fromFirestore(doc: FirestoreContact, id: string): Contact {
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
      department: doc.department,
      address: doc.address,
      socialProfiles: doc.socialProfiles,
      status: doc.status as any,
      leadSource: doc.leadSource,
      leadStatus: doc.leadStatus,
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
   * Convert Contact to Firestore document
   */
  static toFirestore(contact: Contact): Omit<FirestoreContact, 'createdAt' | 'updatedAt'> & {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    lastSyncAt?: Timestamp;
    lastContactedAt?: Timestamp;
    lastActivityAt?: Timestamp;
  } {
    return {
      externalId: contact.externalId,
      platform: contact.platform,
      userId: contact.userId,
      organizationId: contact.organizationId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: contact.fullName,
      email: contact.email,
      phone: contact.phone,
      mobilePhone: contact.mobilePhone,
      company: contact.company,
      jobTitle: contact.jobTitle,
      department: contact.department,
      address: contact.address,
      socialProfiles: contact.socialProfiles,
      status: contact.status,
      leadSource: contact.leadSource,
      leadStatus: contact.leadStatus,
      lastContactedAt: contact.lastContactedAt ? Timestamp.fromDate(contact.lastContactedAt) : undefined,
      lastActivityAt: contact.lastActivityAt ? Timestamp.fromDate(contact.lastActivityAt) : undefined,
      engagementScore: contact.engagementScore,
      customFields: contact.customFields,
      tags: contact.tags,
      notes: contact.notes,
      ownerId: contact.ownerId,
      ownerName: contact.ownerName,
      lastSyncAt: contact.lastSyncAt ? Timestamp.fromDate(contact.lastSyncAt) : undefined,
      syncStatus: contact.syncStatus,
      syncError: contact.syncError,
      createdAt: contact.createdAt ? Timestamp.fromDate(contact.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      rawData: contact.rawData
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
   * Extract primary email from platform-specific format
   */
  static extractPrimaryEmail(emails: any): string | undefined {
    if (typeof emails === 'string') return emails;
    if (Array.isArray(emails)) {
      const primary = emails.find(e => e.primary);
      return primary?.value || emails[0]?.value;
    }
    return undefined;
  }

  /**
   * Extract primary phone from platform-specific format
   */
  static extractPrimaryPhone(phones: any): string | undefined {
    if (typeof phones === 'string') return phones;
    if (Array.isArray(phones)) {
      const primary = phones.find(p => p.primary);
      return primary?.value || phones[0]?.value;
    }
    return undefined;
  }

  /**
   * Validate contact data
   */
  static validate(contact: ContactData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // At least one of email, phone, or name is required
    if (!contact.email && !contact.phone && !contact.firstName && !contact.lastName) {
      errors.push('At least one of email, phone, first name, or last name is required');
    }

    // Email validation
    if (contact.email && !this.isValidEmail(contact.email)) {
      errors.push('Invalid email format');
    }

    // Phone validation
    if (contact.phone && !this.isValidPhone(contact.phone)) {
      errors.push('Invalid phone format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
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
} 
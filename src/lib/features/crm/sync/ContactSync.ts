// Contact Sync Implementation
// Handles contact synchronization between CRM platforms and our database

import { logger } from '@/lib/core/logging/logger';
import { firestore } from '@/lib/core/firebase/client';
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';

import {
  CRMDataType,
  SyncStatus,
  SyncResult,
  CRMError,
  CRMErrorType
} from '../types';

import { CRMConnection } from '../models/CRMConnection';
import { Contact, ContactUtils } from '../models/Contact';

/**
 * Contact synchronization handler
 */
export class ContactSync {
  /**
   * Sync contacts for a CRM connection
   */
  async sync(connection: CRMConnection): Promise<SyncResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;
    let recordsErrored = 0;
    const errors: Array<{ recordId: string; error: string }> = [];

    logger.info('Starting contact sync', {
      connectionId: connection.id,
      platform: connection.platform,
      userId: connection.userId
    });

    try {
      // Get contacts from CRM platform
      const platformContacts = await this.fetchContactsFromPlatform(connection);
      recordsProcessed = platformContacts.length;

      if (platformContacts.length === 0) {
        logger.info('No contacts found to sync', {
          connectionId: connection.id,
          platform: connection.platform
        });

        return {
          dataType: CRMDataType.CONTACTS,
          status: SyncStatus.SUCCESS,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          recordsErrored: 0,
          errors: [],
          startedAt: new Date(startTime),
          completedAt: new Date(),
          duration: Date.now() - startTime
        };
      }

      // Get existing contacts from our database
      const externalIds = platformContacts.map(contact => contact.id || contact.Id);
      const existingContacts = await this.getExistingContacts(
        connection.userId,
        connection.platform,
        externalIds
      );

      // Process each contact
      for (const platformContact of platformContacts) {
        try {
          const externalId = platformContact.id || platformContact.Id;
          const standardizedContact = this.transformContact(platformContact, connection);
          
          const existingContact = existingContacts.get(externalId);

          if (existingContact) {
            // Update existing contact if needed
            if (this.needsUpdate(existingContact, standardizedContact)) {
              await this.updateContact(existingContact.id, standardizedContact);
              recordsUpdated++;
              logger.debug('Contact updated', { externalId, contactId: existingContact.id });
            } else {
              recordsSkipped++;
              logger.debug('Contact skipped (no changes)', { externalId });
            }
          } else {
            // Create new contact
            const contactId = await this.createContact(standardizedContact);
            recordsCreated++;
            logger.debug('Contact created', { externalId, contactId });
          }
        } catch (error) {
          recordsErrored++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            recordId: platformContact.id || platformContact.Id || 'unknown',
            error: errorMessage
          });
          
          logger.error('Error processing contact', {
            contactId: platformContact.id || platformContact.Id,
            error: errorMessage
          });
        }
      }

      const endTime = Date.now();
      const status = recordsErrored > 0 ? 
        (recordsErrored === recordsProcessed ? SyncStatus.ERROR : SyncStatus.PARTIAL) :
        SyncStatus.SUCCESS;

      const result: SyncResult = {
        dataType: CRMDataType.CONTACTS,
        status,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        recordsErrored,
        errors,
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        duration: endTime - startTime
      };

      logger.info('Contact sync completed', {
        connectionId: connection.id,
        platform: connection.platform,
        result
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Contact sync failed', {
        connectionId: connection.id,
        platform: connection.platform,
        error: errorMessage
      });

      return {
        dataType: CRMDataType.CONTACTS,
        status: SyncStatus.ERROR,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        recordsErrored: recordsProcessed || 1,
        errors: [{
          recordId: 'contact_sync',
          error: errorMessage
        }],
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        duration: endTime - startTime
      };
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Fetch contacts from CRM platform
   */
  private async fetchContactsFromPlatform(connection: CRMConnection): Promise<any[]> {
    try {
      // This would use the appropriate adapter based on platform
      // For now, returning empty array as adapters are not fully implemented
      logger.debug('Fetching contacts from platform', {
        platform: connection.platform,
        connectionId: connection.id
      });

      // In a real implementation, this would call:
      // const adapter = this.getAdapter(connection.platform);
      // return await adapter.getContacts(connection.tokens.access_token, 1000);

      return [];
    } catch (error) {
      logger.error('Error fetching contacts from platform', {
        platform: connection.platform,
        error
      });
      throw new CRMError(
        `Failed to fetch contacts from ${connection.platform}`,
        CRMErrorType.API_ERROR,
        connection.platform,
        500,
        error
      );
    }
  }

  /**
   * Transform platform-specific contact to standardized format
   */
  private transformContact(platformContact: any, connection: CRMConnection): Contact {
    const now = new Date();

    // Basic transformation - would be more sophisticated in production
    const contact: Contact = {
      externalId: platformContact.id || platformContact.Id,
      platform: connection.platform,
      userId: connection.userId,
      organizationId: connection.organizationId,
      firstName: this.extractFirstName(platformContact),
      lastName: this.extractLastName(platformContact),
      email: this.extractEmail(platformContact),
      phone: this.extractPhone(platformContact),
      company: this.extractCompany(platformContact),
      jobTitle: this.extractJobTitle(platformContact),
      lastSyncAt: now,
      syncStatus: 'synced',
      createdAt: this.extractCreatedDate(platformContact) || now,
      updatedAt: this.extractUpdatedDate(platformContact) || now,
      rawData: platformContact
    };

    // Generate full name if not provided
    if (!contact.fullName && (contact.firstName || contact.lastName)) {
      contact.fullName = ContactUtils.generateFullName(contact.firstName, contact.lastName);
    }

    return contact;
  }

  /**
   * Get existing contacts from database
   */
  private async getExistingContacts(
    userId: string,
    platform: string,
    externalIds: string[]
  ): Promise<Map<string, any>> {
    const existingContacts = new Map();

    try {
      // Query in batches due to Firestore 'in' query limit
      const batchSize = 10;
      for (let i = 0; i < externalIds.length; i += batchSize) {
        const batch = externalIds.slice(i, i + batchSize);
        
        const q = query(
          collection(firestore, 'crmContacts'),
          where('userId', '==', userId),
          where('platform', '==', platform),
          where('externalId', 'in', batch)
        );

        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          existingContacts.set(data.externalId, { id: doc.id, ...data });
        });
      }
    } catch (error) {
      logger.error('Error getting existing contacts', {
        userId,
        platform,
        error
      });
    }

    return existingContacts;
  }

  /**
   * Create new contact in database
   */
  private async createContact(contact: Contact): Promise<string> {
    try {
      const firestoreData = ContactUtils.toFirestore(contact);
      const docRef = await addDoc(collection(firestore, 'crmContacts'), firestoreData);
      return docRef.id;
    } catch (error) {
      logger.error('Error creating contact', { contact, error });
      throw error;
    }
  }

  /**
   * Update existing contact in database
   */
  private async updateContact(contactId: string, contact: Contact): Promise<void> {
    try {
      const firestoreData = ContactUtils.toFirestore(contact);
      const contactRef = doc(firestore, 'crmContacts', contactId);
      await updateDoc(contactRef, firestoreData);
    } catch (error) {
      logger.error('Error updating contact', { contactId, contact, error });
      throw error;
    }
  }

  /**
   * Determine if contact needs update
   */
  private needsUpdate(existingContact: any, newContact: Contact): boolean {
    // Simple comparison based on updated timestamp
    const existingUpdated = existingContact.updatedAt?.toDate?.() || existingContact.updatedAt;
    const newUpdated = newContact.updatedAt;

    if (!existingUpdated || !newUpdated) {
      return true; // Update if we can't determine timestamps
    }

    return newUpdated > existingUpdated;
  }

  // ==================== FIELD EXTRACTION METHODS ====================

  private extractFirstName(platformContact: any): string | undefined {
    return platformContact.firstName || 
           platformContact.First_Name || 
           platformContact.properties?.firstname;
  }

  private extractLastName(platformContact: any): string | undefined {
    return platformContact.lastName || 
           platformContact.Last_Name || 
           platformContact.properties?.lastname;
  }

  private extractEmail(platformContact: any): string | undefined {
    const email = platformContact.email || 
                  platformContact.Email || 
                  platformContact.properties?.email;
    
    // Handle array format (like Pipedrive)
    if (Array.isArray(email)) {
      const primary = email.find(e => e.primary);
      return primary?.value || email[0]?.value;
    }
    
    return email;
  }

  private extractPhone(platformContact: any): string | undefined {
    const phone = platformContact.phone || 
                  platformContact.Phone || 
                  platformContact.properties?.phone;
    
    // Handle array format (like Pipedrive)
    if (Array.isArray(phone)) {
      const primary = phone.find(p => p.primary);
      return primary?.value || phone[0]?.value;
    }
    
    return phone;
  }

  private extractCompany(platformContact: any): string | undefined {
    return platformContact.company || 
           platformContact.Company || 
           platformContact.Account?.Name ||
           platformContact.properties?.company;
  }

  private extractJobTitle(platformContact: any): string | undefined {
    return platformContact.jobTitle || 
           platformContact.Title || 
           platformContact.properties?.jobtitle;
  }

  private extractCreatedDate(platformContact: any): Date | undefined {
    const created = platformContact.createdAt || 
                   platformContact.CreatedDate || 
                   platformContact.Created_Time ||
                   platformContact.properties?.createdate;
    
    return created ? new Date(created) : undefined;
  }

  private extractUpdatedDate(platformContact: any): Date | undefined {
    const updated = platformContact.updatedAt || 
                   platformContact.LastModifiedDate || 
                   platformContact.Modified_Time ||
                   platformContact.properties?.lastmodifieddate;
    
    return updated ? new Date(updated) : undefined;
  }
} 
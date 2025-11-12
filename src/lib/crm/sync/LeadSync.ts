// Lead Sync Implementation
// Handles lead synchronization between CRM platforms and our database

import { logger } from '@/lib/logging/logger';
import { firestore } from '@/lib/firebase/client';
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';

import {
  CRMDataType,
  SyncStatus,
  SyncResult,
  CRMError,
  CRMErrorType
} from '../types';

import { CRMConnection } from '../models/CRMConnection';
import { Lead, LeadUtils } from '../models/Lead';

/**
 * Lead synchronization handler
 */
export class LeadSync {
  /**
   * Sync leads for a CRM connection
   */
  async sync(connection: CRMConnection): Promise<SyncResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;
    let recordsErrored = 0;
    const errors: Array<{ recordId: string; error: string }> = [];

    logger.info('Starting lead sync', {
      connectionId: connection.id,
      platform: connection.platform,
      userId: connection.userId
    });

    try {
      // Get leads from CRM platform
      const platformLeads = await this.fetchLeadsFromPlatform(connection);
      recordsProcessed = platformLeads.length;

      if (platformLeads.length === 0) {
        logger.info('No leads found to sync', {
          connectionId: connection.id,
          platform: connection.platform
        });

        return {
          dataType: CRMDataType.LEADS,
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

      // Get existing leads from our database
      const externalIds = platformLeads.map(lead => lead.id || lead.Id || lead.leadid);
      const existingLeads = await this.getExistingLeads(
        connection.userId,
        connection.platform,
        externalIds
      );

      // Process each lead
      for (const platformLead of platformLeads) {
        try {
          const externalId = platformLead.id || platformLead.Id || platformLead.leadid;
          const standardizedLead = this.transformLead(platformLead, connection);
          
          const existingLead = existingLeads.get(externalId);

          if (existingLead) {
            // Update existing lead if needed
            if (this.needsUpdate(existingLead, standardizedLead)) {
              await this.updateLead(existingLead.id, standardizedLead);
              recordsUpdated++;
              logger.debug('Lead updated', { externalId, leadId: existingLead.id });
            } else {
              recordsSkipped++;
              logger.debug('Lead skipped (no changes)', { externalId });
            }
          } else {
            // Create new lead
            const leadId = await this.createLead(standardizedLead);
            recordsCreated++;
            logger.debug('Lead created', { externalId, leadId });
          }
        } catch (error) {
          recordsErrored++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            recordId: platformLead.id || platformLead.Id || platformLead.leadid || 'unknown',
            error: errorMessage
          });
          
          logger.error('Error processing lead', {
            leadId: platformLead.id || platformLead.Id || platformLead.leadid,
            error: errorMessage
          });
        }
      }

      const endTime = Date.now();
      const status = recordsErrored > 0 ? 
        (recordsErrored === recordsProcessed ? SyncStatus.ERROR : SyncStatus.PARTIAL) :
        SyncStatus.SUCCESS;

      const result: SyncResult = {
        dataType: CRMDataType.LEADS,
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

      logger.info('Lead sync completed', {
        connectionId: connection.id,
        platform: connection.platform,
        result
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Lead sync failed', {
        connectionId: connection.id,
        platform: connection.platform,
        error: errorMessage
      });

      return {
        dataType: CRMDataType.LEADS,
        status: SyncStatus.ERROR,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        recordsErrored: recordsProcessed || 1,
        errors: [{
          recordId: 'lead_sync',
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
   * Fetch leads from CRM platform
   */
  private async fetchLeadsFromPlatform(connection: CRMConnection): Promise<any[]> {
    try {
      // This would use the appropriate adapter based on platform
      // For now, returning empty array as adapters are not fully implemented
      logger.debug('Fetching leads from platform', {
        platform: connection.platform,
        connectionId: connection.id
      });

      // In a real implementation, this would call:
      // const adapter = this.getAdapter(connection.platform);
      // return await adapter.getLeads(connection.tokens.access_token, 1000);

      return [];
    } catch (error) {
      logger.error('Error fetching leads from platform', {
        platform: connection.platform,
        error
      });
      throw new CRMError(
        `Failed to fetch leads from ${connection.platform}`,
        CRMErrorType.API_ERROR,
        connection.platform,
        500,
        error
      );
    }
  }

  /**
   * Transform platform-specific lead to standardized format
   */
  private transformLead(platformLead: any, connection: CRMConnection): Lead {
    const now = new Date();

    // Basic transformation - would be more sophisticated in production
    const lead: Lead = {
      externalId: platformLead.id || platformLead.Id || platformLead.leadid,
      platform: connection.platform,
      userId: connection.userId,
      organizationId: connection.organizationId,
      firstName: this.extractFirstName(platformLead),
      lastName: this.extractLastName(platformLead),
      fullName: this.extractFullName(platformLead),
      email: this.extractEmail(platformLead),
      phone: this.extractPhone(platformLead),
      mobilePhone: this.extractMobilePhone(platformLead),
      company: this.extractCompany(platformLead),
      jobTitle: this.extractJobTitle(platformLead),
      industry: this.extractIndustry(platformLead),
      website: this.extractWebsite(platformLead),
      status: this.extractStatus(platformLead),
      leadSource: this.extractLeadSource(platformLead),
      leadScore: this.extractLeadScore(platformLead),
      rating: this.extractRating(platformLead),
      ownerName: this.extractOwnerName(platformLead),
      lastSyncAt: now,
      syncStatus: 'synced',
      createdAt: this.extractCreatedDate(platformLead) || now,
      updatedAt: this.extractUpdatedDate(platformLead) || now,
      rawData: platformLead
    };

    return lead;
  }

  /**
   * Get existing leads from database
   */
  private async getExistingLeads(
    userId: string,
    platform: string,
    externalIds: string[]
  ): Promise<Map<string, any>> {
    const existingLeads = new Map();

    try {
      // Query in batches due to Firestore 'in' query limit
      const batchSize = 10;
      for (let i = 0; i < externalIds.length; i += batchSize) {
        const batch = externalIds.slice(i, i + batchSize);
        
        const q = query(
          collection(firestore, 'crmLeads'),
          where('userId', '==', userId),
          where('platform', '==', platform),
          where('externalId', 'in', batch)
        );

        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          existingLeads.set(data.externalId, { id: doc.id, ...data });
        });
      }
    } catch (error) {
      logger.error('Error getting existing leads', {
        userId,
        platform,
        error
      });
    }

    return existingLeads;
  }

  /**
   * Create new lead in database
   */
  private async createLead(lead: Lead): Promise<string> {
    try {
      const firestoreData = LeadUtils.toFirestore(lead);
      const docRef = await addDoc(collection(firestore, 'crmLeads'), firestoreData);
      return docRef.id;
    } catch (error) {
      logger.error('Error creating lead', { lead, error });
      throw error;
    }
  }

  /**
   * Update existing lead in database
   */
  private async updateLead(leadId: string, lead: Lead): Promise<void> {
    try {
      const firestoreData = LeadUtils.toFirestore(lead);
      const leadRef = doc(firestore, 'crmLeads', leadId);
      await updateDoc(leadRef, firestoreData);
    } catch (error) {
      logger.error('Error updating lead', { leadId, lead, error });
      throw error;
    }
  }

  /**
   * Determine if lead needs update
   */
  private needsUpdate(existingLead: any, newLead: Lead): boolean {
    // Simple comparison based on updated timestamp
    const existingUpdated = existingLead.updatedAt?.toDate?.() || existingLead.updatedAt;
    const newUpdated = newLead.updatedAt;

    if (!existingUpdated || !newUpdated) {
      return true; // Update if we can't determine timestamps
    }

    return newUpdated > existingUpdated;
  }

  // ==================== FIELD EXTRACTION METHODS ====================

  private extractFirstName(platformLead: any): string | undefined {
    return platformLead.firstName || 
           platformLead.FirstName || 
           platformLead.First_Name ||
           platformLead.properties?.firstname;
  }

  private extractLastName(platformLead: any): string | undefined {
    return platformLead.lastName || 
           platformLead.LastName || 
           platformLead.Last_Name ||
           platformLead.properties?.lastname;
  }

  private extractFullName(platformLead: any): string | undefined {
    return platformLead.fullName || 
           platformLead.Name || 
           platformLead.Full_Name ||
           platformLead.properties?.fullname;
  }

  private extractEmail(platformLead: any): string | undefined {
    return platformLead.email || 
           platformLead.Email || 
           platformLead.properties?.email;
  }

  private extractPhone(platformLead: any): string | undefined {
    return platformLead.phone || 
           platformLead.Phone || 
           platformLead.properties?.phone;
  }

  private extractMobilePhone(platformLead: any): string | undefined {
    return platformLead.mobilePhone || 
           platformLead.MobilePhone || 
           platformLead.Mobile ||
           platformLead.properties?.mobilephone;
  }

  private extractCompany(platformLead: any): string | undefined {
    return platformLead.company || 
           platformLead.Company || 
           platformLead.properties?.company;
  }

  private extractJobTitle(platformLead: any): string | undefined {
    return platformLead.jobTitle || 
           platformLead.Title || 
           platformLead.Designation ||
           platformLead.properties?.jobtitle;
  }

  private extractIndustry(platformLead: any): string | undefined {
    return platformLead.industry || 
           platformLead.Industry || 
           platformLead.properties?.industry;
  }

  private extractWebsite(platformLead: any): string | undefined {
    return platformLead.website || 
           platformLead.Website || 
           platformLead.properties?.website;
  }

  private extractStatus(platformLead: any): string | undefined {
    return platformLead.status || 
           platformLead.Status || 
           platformLead.Lead_Status ||
           platformLead.properties?.leadstatus;
  }

  private extractLeadSource(platformLead: any): string | undefined {
    return platformLead.leadSource || 
           platformLead.LeadSource || 
           platformLead.Lead_Source ||
           platformLead.properties?.leadsource;
  }

  private extractLeadScore(platformLead: any): number | undefined {
    const score = platformLead.leadScore || 
                 platformLead.Score || 
                 platformLead.hubspotscore ||
                 platformLead.properties?.hubspotscore;
    
    return score ? parseFloat(score) : undefined;
  }

  private extractRating(platformLead: any): string | undefined {
    return platformLead.rating || 
           platformLead.Rating || 
           platformLead.properties?.rating;
  }

  private extractOwnerName(platformLead: any): string | undefined {
    return platformLead.ownerName ||
           platformLead.Owner?.Name ||
           platformLead.Owner?.name;
  }

  private extractCreatedDate(platformLead: any): Date | undefined {
    const created = platformLead.createdAt || 
                   platformLead.CreatedDate || 
                   platformLead.Created_Time ||
                   platformLead.properties?.createdate;
    
    return created ? new Date(created) : undefined;
  }

  private extractUpdatedDate(platformLead: any): Date | undefined {
    const updated = platformLead.updatedAt || 
                   platformLead.LastModifiedDate || 
                   platformLead.Modified_Time ||
                   platformLead.properties?.lastmodifieddate;
    
    return updated ? new Date(updated) : undefined;
  }
} 
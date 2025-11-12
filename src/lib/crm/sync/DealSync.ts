// Deal Sync Implementation
// Handles deal synchronization between CRM platforms and our database

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
import { Deal, DealUtils } from '../models/Deal';

/**
 * Deal synchronization handler
 */
export class DealSync {
  /**
   * Sync deals for a CRM connection
   */
  async sync(connection: CRMConnection): Promise<SyncResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;
    let recordsErrored = 0;
    const errors: Array<{ recordId: string; error: string }> = [];

    logger.info('Starting deal sync', {
      connectionId: connection.id,
      platform: connection.platform,
      userId: connection.userId
    });

    try {
      // Get deals from CRM platform
      const platformDeals = await this.fetchDealsFromPlatform(connection);
      recordsProcessed = platformDeals.length;

      if (platformDeals.length === 0) {
        logger.info('No deals found to sync', {
          connectionId: connection.id,
          platform: connection.platform
        });

        return {
          dataType: CRMDataType.DEALS,
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

      // Get existing deals from our database
      const externalIds = platformDeals.map(deal => deal.id || deal.Id || deal.opportunityid);
      const existingDeals = await this.getExistingDeals(
        connection.userId,
        connection.platform,
        externalIds
      );

      // Process each deal
      for (const platformDeal of platformDeals) {
        try {
          const externalId = platformDeal.id || platformDeal.Id || platformDeal.opportunityid;
          const standardizedDeal = this.transformDeal(platformDeal, connection);
          
          const existingDeal = existingDeals.get(externalId);

          if (existingDeal) {
            // Update existing deal if needed
            if (this.needsUpdate(existingDeal, standardizedDeal)) {
              await this.updateDeal(existingDeal.id, standardizedDeal);
              recordsUpdated++;
              logger.debug('Deal updated', { externalId, dealId: existingDeal.id });
            } else {
              recordsSkipped++;
              logger.debug('Deal skipped (no changes)', { externalId });
            }
          } else {
            // Create new deal
            const dealId = await this.createDeal(standardizedDeal);
            recordsCreated++;
            logger.debug('Deal created', { externalId, dealId });
          }
        } catch (error) {
          recordsErrored++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            recordId: platformDeal.id || platformDeal.Id || platformDeal.opportunityid || 'unknown',
            error: errorMessage
          });
          
          logger.error('Error processing deal', {
            dealId: platformDeal.id || platformDeal.Id || platformDeal.opportunityid,
            error: errorMessage
          });
        }
      }

      const endTime = Date.now();
      const status = recordsErrored > 0 ? 
        (recordsErrored === recordsProcessed ? SyncStatus.ERROR : SyncStatus.PARTIAL) :
        SyncStatus.SUCCESS;

      const result: SyncResult = {
        dataType: CRMDataType.DEALS,
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

      logger.info('Deal sync completed', {
        connectionId: connection.id,
        platform: connection.platform,
        result
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Deal sync failed', {
        connectionId: connection.id,
        platform: connection.platform,
        error: errorMessage
      });

      return {
        dataType: CRMDataType.DEALS,
        status: SyncStatus.ERROR,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        recordsErrored: recordsProcessed || 1,
        errors: [{
          recordId: 'deal_sync',
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
   * Fetch deals from CRM platform
   */
  private async fetchDealsFromPlatform(connection: CRMConnection): Promise<any[]> {
    try {
      // This would use the appropriate adapter based on platform
      // For now, returning empty array as adapters are not fully implemented
      logger.debug('Fetching deals from platform', {
        platform: connection.platform,
        connectionId: connection.id
      });

      // In a real implementation, this would call:
      // const adapter = this.getAdapter(connection.platform);
      // return await adapter.getDeals(connection.tokens.access_token, 1000);

      return [];
    } catch (error) {
      logger.error('Error fetching deals from platform', {
        platform: connection.platform,
        error
      });
      throw new CRMError(
        `Failed to fetch deals from ${connection.platform}`,
        CRMErrorType.API_ERROR,
        connection.platform,
        500,
        error
      );
    }
  }

  /**
   * Transform platform-specific deal to standardized format
   */
  private transformDeal(platformDeal: any, connection: CRMConnection): Deal {
    const now = new Date();

    // Basic transformation - would be more sophisticated in production
    const deal: Deal = {
      externalId: platformDeal.id || platformDeal.Id || platformDeal.opportunityid,
      platform: connection.platform,
      userId: connection.userId,
      organizationId: connection.organizationId,
      name: this.extractDealName(platformDeal),
      description: this.extractDescription(platformDeal),
      amount: this.extractAmount(platformDeal),
      currency: this.extractCurrency(platformDeal),
      stage: this.extractStage(platformDeal),
      status: this.extractStatus(platformDeal),
      probability: this.extractProbability(platformDeal),
      closeDate: this.extractCloseDate(platformDeal),
      expectedCloseDate: this.extractExpectedCloseDate(platformDeal),
      contactName: this.extractContactName(platformDeal),
      accountName: this.extractAccountName(platformDeal),
      companyName: this.extractCompanyName(platformDeal),
      ownerName: this.extractOwnerName(platformDeal),
      lastSyncAt: now,
      syncStatus: 'synced',
      createdAt: this.extractCreatedDate(platformDeal) || now,
      updatedAt: this.extractUpdatedDate(platformDeal) || now,
      rawData: platformDeal
    };

    return deal;
  }

  /**
   * Get existing deals from database
   */
  private async getExistingDeals(
    userId: string,
    platform: string,
    externalIds: string[]
  ): Promise<Map<string, any>> {
    const existingDeals = new Map();

    try {
      // Query in batches due to Firestore 'in' query limit
      const batchSize = 10;
      for (let i = 0; i < externalIds.length; i += batchSize) {
        const batch = externalIds.slice(i, i + batchSize);
        
        const q = query(
          collection(firestore, 'crmDeals'),
          where('userId', '==', userId),
          where('platform', '==', platform),
          where('externalId', 'in', batch)
        );

        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          existingDeals.set(data.externalId, { id: doc.id, ...data });
        });
      }
    } catch (error) {
      logger.error('Error getting existing deals', {
        userId,
        platform,
        error
      });
    }

    return existingDeals;
  }

  /**
   * Create new deal in database
   */
  private async createDeal(deal: Deal): Promise<string> {
    try {
      const firestoreData = DealUtils.toFirestore(deal);
      const docRef = await addDoc(collection(firestore, 'crmDeals'), firestoreData);
      return docRef.id;
    } catch (error) {
      logger.error('Error creating deal', { deal, error });
      throw error;
    }
  }

  /**
   * Update existing deal in database
   */
  private async updateDeal(dealId: string, deal: Deal): Promise<void> {
    try {
      const firestoreData = DealUtils.toFirestore(deal);
      const dealRef = doc(firestore, 'crmDeals', dealId);
      await updateDoc(dealRef, firestoreData);
    } catch (error) {
      logger.error('Error updating deal', { dealId, deal, error });
      throw error;
    }
  }

  /**
   * Determine if deal needs update
   */
  private needsUpdate(existingDeal: any, newDeal: Deal): boolean {
    // Simple comparison based on updated timestamp
    const existingUpdated = existingDeal.updatedAt?.toDate?.() || existingDeal.updatedAt;
    const newUpdated = newDeal.updatedAt;

    if (!existingUpdated || !newUpdated) {
      return true; // Update if we can't determine timestamps
    }

    return newUpdated > existingUpdated;
  }

  // ==================== FIELD EXTRACTION METHODS ====================

  private extractDealName(platformDeal: any): string {
    return platformDeal.name || 
           platformDeal.Name || 
           platformDeal.Deal_Name ||
           platformDeal.title ||
           platformDeal.properties?.dealname ||
           'Untitled Deal';
  }

  private extractDescription(platformDeal: any): string | undefined {
    return platformDeal.description || 
           platformDeal.Description || 
           platformDeal.properties?.description;
  }

  private extractAmount(platformDeal: any): number | undefined {
    const amount = platformDeal.amount || 
                  platformDeal.Amount || 
                  platformDeal.value ||
                  platformDeal.estimatedvalue ||
                  platformDeal.properties?.amount;
    
    return amount ? parseFloat(amount) : undefined;
  }

  private extractCurrency(platformDeal: any): string | undefined {
    return platformDeal.currency || 
           platformDeal.CurrencyIsoCode || 
           platformDeal.Currency ||
           'USD'; // Default currency
  }

  private extractStage(platformDeal: any): string | undefined {
    return platformDeal.stage || 
           platformDeal.StageName || 
           platformDeal.Stage ||
           platformDeal.stepname ||
           platformDeal.stage_name ||
           platformDeal.properties?.dealstage;
  }

  private extractStatus(platformDeal: any): 'open' | 'won' | 'lost' | 'pending' | undefined {
    const status = platformDeal.status || 
                  platformDeal.Status ||
                  platformDeal.statecode;
    
    // Map numeric status codes to string values (for Dynamics)
    if (typeof status === 'number') {
      switch (status) {
        case 0: return 'open';
        case 1: return 'won';
        case 2: return 'lost';
        default: return 'open';
      }
    }
    
    // Map string values to valid status types
    if (typeof status === 'string') {
      const normalizedStatus = status.toLowerCase();
      switch (normalizedStatus) {
        case 'open':
        case 'new':
        case 'active':
          return 'open';
        case 'won':
        case 'closed won':
        case 'completed':
          return 'won';
        case 'lost':
        case 'closed lost':
        case 'cancelled':
          return 'lost';
        case 'pending':
        case 'in progress':
        case 'review':
          return 'pending';
        default:
          return 'open'; // Default to open for unknown statuses
      }
    }
    
    return undefined;
  }

  private extractProbability(platformDeal: any): number | undefined {
    const probability = platformDeal.probability || 
                       platformDeal.Probability ||
                       platformDeal.closeprobability ||
                       platformDeal.properties?.hs_deal_stage_probability;
    
    return probability ? parseFloat(probability) : undefined;
  }

  private extractCloseDate(platformDeal: any): Date | undefined {
    const closeDate = platformDeal.closeDate || 
                     platformDeal.CloseDate ||
                     platformDeal.Closing_Date ||
                     platformDeal.actualclosedate ||
                     platformDeal.close_time ||
                     platformDeal.properties?.closedate;
    
    return closeDate ? new Date(closeDate) : undefined;
  }

  private extractExpectedCloseDate(platformDeal: any): Date | undefined {
    const expectedDate = platformDeal.expectedCloseDate || 
                        platformDeal.estimatedclosedate ||
                        platformDeal.expected_close_date;
    
    return expectedDate ? new Date(expectedDate) : undefined;
  }

  private extractContactName(platformDeal: any): string | undefined {
    return platformDeal.contactName ||
           platformDeal.Contact?.Name ||
           platformDeal.Contact_Name?.name ||
           platformDeal.person_id?.name;
  }

  private extractAccountName(platformDeal: any): string | undefined {
    return platformDeal.accountName ||
           platformDeal.Account?.Name ||
           platformDeal.Account_Name?.name;
  }

  private extractCompanyName(platformDeal: any): string | undefined {
    return platformDeal.companyName ||
           platformDeal.org_id?.name ||
           this.extractAccountName(platformDeal);
  }

  private extractOwnerName(platformDeal: any): string | undefined {
    return platformDeal.ownerName ||
           platformDeal.Owner?.Name ||
           platformDeal.Owner?.name ||
           platformDeal.user_id?.name;
  }

  private extractCreatedDate(platformDeal: any): Date | undefined {
    const created = platformDeal.createdAt || 
                   platformDeal.CreatedDate || 
                   platformDeal.Created_Time ||
                   platformDeal.createdon ||
                   platformDeal.add_time ||
                   platformDeal.properties?.createdate;
    
    return created ? new Date(created) : undefined;
  }

  private extractUpdatedDate(platformDeal: any): Date | undefined {
    const updated = platformDeal.updatedAt || 
                   platformDeal.LastModifiedDate || 
                   platformDeal.Modified_Time ||
                   platformDeal.modifiedon ||
                   platformDeal.update_time ||
                   platformDeal.properties?.hs_lastmodifieddate;
    
    return updated ? new Date(updated) : undefined;
  }
} 
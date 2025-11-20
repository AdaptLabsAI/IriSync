// CRM Sync Engine
// Handles data synchronization between CRM platforms and our database

import { logger } from '@/lib/core/logging/logger';
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
import { Deal, DealUtils } from '../models/Deal';
import { Lead, LeadUtils } from '../models/Lead';

import { ContactSync } from './ContactSync';
import { DealSync } from './DealSync';
import { LeadSync } from './LeadSync';
import { ConflictResolver } from './ConflictResolver';

/**
 * Main sync engine for CRM data synchronization
 */
export class SyncEngine {
  private contactSync: ContactSync;
  private dealSync: DealSync;
  private leadSync: LeadSync;
  private conflictResolver: ConflictResolver;

  constructor() {
    this.contactSync = new ContactSync();
    this.dealSync = new DealSync();
    this.leadSync = new LeadSync();
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * Sync data for a specific connection and data type
   */
  async syncData(connection: CRMConnection, dataType: CRMDataType): Promise<SyncResult> {
    const startTime = Date.now();
    
    logger.info('Starting sync operation', {
      connectionId: connection.id,
      platform: connection.platform,
      dataType,
      userId: connection.userId
    });

    try {
      let result: SyncResult;

      switch (dataType) {
        case CRMDataType.CONTACTS:
          result = await this.contactSync.sync(connection);
          break;
        case CRMDataType.DEALS:
          result = await this.dealSync.sync(connection);
          break;
        case CRMDataType.LEADS:
          result = await this.leadSync.sync(connection);
          break;
        default:
          throw new CRMError(
            `Unsupported data type: ${dataType}`,
            CRMErrorType.VALIDATION_ERROR,
            connection.platform,
            400
          );
      }

      // Update connection's last sync time
      await this.updateConnectionSyncTime(connection);

      logger.info('Sync operation completed', {
        connectionId: connection.id,
        platform: connection.platform,
        dataType,
        result
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const errorResult: SyncResult = {
        dataType,
        status: SyncStatus.ERROR,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        recordsErrored: 1,
        errors: [{
          recordId: 'sync_operation',
          error: error instanceof Error ? error.message : 'Unknown error'
        }],
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        duration: endTime - startTime
      };

      logger.error('Sync operation failed', {
        connectionId: connection.id,
        platform: connection.platform,
        dataType,
        error,
        result: errorResult
      });

      return errorResult;
    }
  }

  /**
   * Sync multiple data types for a connection
   */
  async syncMultipleDataTypes(
    connection: CRMConnection, 
    dataTypes: CRMDataType[]
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const dataType of dataTypes) {
      try {
        const result = await this.syncData(connection, dataType);
        results.push(result);
      } catch (error) {
        logger.error('Error syncing data type', {
          connectionId: connection.id,
          dataType,
          error
        });
        
        // Continue with other data types
        results.push({
          dataType,
          status: SyncStatus.ERROR,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          recordsErrored: 1,
          errors: [{
            recordId: 'sync_operation',
            error: error instanceof Error ? error.message : 'Unknown error'
          }],
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 0
        });
      }
    }

    return results;
  }

  /**
   * Get sync status for a connection
   */
  async getSyncStatus(connectionId: string): Promise<{
    lastSyncAt?: Date;
    isCurrentlySyncing: boolean;
    lastSyncResults?: SyncResult[];
  }> {
    try {
      // This would typically query a sync status collection
      // For now, returning basic status
      return {
        isCurrentlySyncing: false,
        lastSyncResults: []
      };
    } catch (error) {
      logger.error('Error getting sync status', { connectionId, error });
      throw error;
    }
  }

  /**
   * Cancel ongoing sync operation
   */
  async cancelSync(connectionId: string): Promise<void> {
    try {
      logger.info('Cancelling sync operation', { connectionId });
      
      // Implementation would depend on how we track ongoing syncs
      // For now, just log the cancellation
      
      logger.info('Sync operation cancelled', { connectionId });
    } catch (error) {
      logger.error('Error cancelling sync', { connectionId, error });
      throw error;
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Update connection's last sync time
   */
  private async updateConnectionSyncTime(connection: CRMConnection): Promise<void> {
    try {
      if (!connection.id) return;

      const connectionRef = doc(firestore, 'crmConnections', connection.id);
      await updateDoc(connectionRef, {
        lastSyncAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error updating connection sync time', {
        connectionId: connection.id,
        error
      });
      // Don't throw error as this is not critical
    }
  }

  /**
   * Store sync result in database
   */
  private async storeSyncResult(
    connection: CRMConnection, 
    result: SyncResult
  ): Promise<void> {
    try {
      const syncResultData = {
        connectionId: connection.id,
        userId: connection.userId,
        organizationId: connection.organizationId,
        platform: connection.platform,
        dataType: result.dataType,
        status: result.status,
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        recordsErrored: result.recordsErrored,
        errors: result.errors,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        duration: result.duration,
        createdAt: new Date()
      };

      await addDoc(collection(firestore, 'crmSyncResults'), syncResultData);
    } catch (error) {
      logger.error('Error storing sync result', {
        connectionId: connection.id,
        result,
        error
      });
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get existing records from database for comparison
   */
  private async getExistingRecords(
    userId: string,
    platform: string,
    dataType: CRMDataType,
    externalIds: string[]
  ): Promise<Map<string, any>> {
    const existingRecords = new Map();

    try {
      let collectionName: string;
      switch (dataType) {
        case CRMDataType.CONTACTS:
          collectionName = 'crmContacts';
          break;
        case CRMDataType.DEALS:
          collectionName = 'crmDeals';
          break;
        case CRMDataType.LEADS:
          collectionName = 'crmLeads';
          break;
        default:
          return existingRecords;
      }

      // Query in batches due to Firestore 'in' query limit of 10
      const batchSize = 10;
      for (let i = 0; i < externalIds.length; i += batchSize) {
        const batch = externalIds.slice(i, i + batchSize);
        
        const q = query(
          collection(firestore, collectionName),
          where('userId', '==', userId),
          where('platform', '==', platform),
          where('externalId', 'in', batch)
        );

        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          existingRecords.set(data.externalId, { id: doc.id, ...data });
        });
      }
    } catch (error) {
      logger.error('Error getting existing records', {
        userId,
        platform,
        dataType,
        error
      });
    }

    return existingRecords;
  }

  /**
   * Determine if a record needs to be updated
   */
  private needsUpdate(existingRecord: any, newRecord: any): boolean {
    // Simple comparison - in production, this would be more sophisticated
    const existingUpdated = existingRecord.updatedAt?.toDate?.() || existingRecord.updatedAt;
    const newUpdated = newRecord.updatedAt;

    if (!existingUpdated || !newUpdated) {
      return true; // Update if we can't determine timestamps
    }

    return newUpdated > existingUpdated;
  }
} 
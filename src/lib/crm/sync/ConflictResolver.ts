// CRM Conflict Resolver
// Handles data conflicts during synchronization between CRM platforms and our database

import { logger } from '@/lib/logging/logger';
import { CRMPlatform } from '../types';
import { Contact } from '../models/Contact';
import { Deal } from '../models/Deal';
import { Lead } from '../models/Lead';

/**
 * Conflict resolution strategies
 */
export enum ConflictResolutionStrategy {
  SOURCE_WINS = 'source_wins',
  TARGET_WINS = 'target_wins',
  MANUAL = 'manual',
  MERGE = 'merge',
  NEWEST_WINS = 'newest_wins',
  MOST_COMPLETE_WINS = 'most_complete_wins'
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  field: string;
  sourceValue: any;
  targetValue: any;
  conflictType: 'value_mismatch' | 'missing_source' | 'missing_target';
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  resolved: boolean;
  strategy: ConflictResolutionStrategy;
  resolvedValue: any;
  conflicts: ConflictInfo[];
  requiresManualReview: boolean;
}

/**
 * Conflict resolver for CRM data synchronization
 */
export class ConflictResolver {
  /**
   * Resolve conflicts between source and target records
   */
  async resolveConflicts<T extends Contact | Deal | Lead>(
    sourceRecord: T,
    targetRecord: T,
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.SOURCE_WINS,
    platform: CRMPlatform
  ): Promise<ConflictResolution> {
    try {
      logger.debug('Resolving conflicts', {
        strategy,
        platform,
        sourceId: sourceRecord.externalId,
        targetId: targetRecord.id
      });

      const conflicts = this.detectConflicts(sourceRecord, targetRecord);
      
      if (conflicts.length === 0) {
        return {
          resolved: true,
          strategy,
          resolvedValue: sourceRecord,
          conflicts: [],
          requiresManualReview: false
        };
      }

      const resolution = await this.applyResolutionStrategy(
        sourceRecord,
        targetRecord,
        conflicts,
        strategy
      );

      logger.info('Conflicts resolved', {
        strategy,
        platform,
        conflictCount: conflicts.length,
        requiresManualReview: resolution.requiresManualReview
      });

      return resolution;
    } catch (error) {
      logger.error('Error resolving conflicts', {
        strategy,
        platform,
        error
      });

      return {
        resolved: false,
        strategy,
        resolvedValue: targetRecord, // Keep existing on error
        conflicts: [],
        requiresManualReview: true
      };
    }
  }

  /**
   * Resolve contact conflicts specifically
   */
  async resolveContactConflicts(
    sourceContact: Contact,
    targetContact: Contact,
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.SOURCE_WINS
  ): Promise<ConflictResolution> {
    return this.resolveConflicts(sourceContact, targetContact, strategy, sourceContact.platform);
  }

  /**
   * Resolve deal conflicts specifically
   */
  async resolveDealConflicts(
    sourceDeal: Deal,
    targetDeal: Deal,
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.SOURCE_WINS
  ): Promise<ConflictResolution> {
    return this.resolveConflicts(sourceDeal, targetDeal, strategy, sourceDeal.platform);
  }

  /**
   * Resolve lead conflicts specifically
   */
  async resolveLeadConflicts(
    sourceLead: Lead,
    targetLead: Lead,
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.SOURCE_WINS
  ): Promise<ConflictResolution> {
    return this.resolveConflicts(sourceLead, targetLead, strategy, sourceLead.platform);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Detect conflicts between source and target records
   */
  private detectConflicts<T extends Contact | Deal | Lead>(
    sourceRecord: T,
    targetRecord: T
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const fieldsToCheck = this.getFieldsToCheck(sourceRecord);

    for (const field of fieldsToCheck) {
      const sourceValue = sourceRecord[field as keyof T];
      const targetValue = targetRecord[field as keyof T];

      if (this.hasConflict(sourceValue, targetValue)) {
        conflicts.push({
          field,
          sourceValue,
          targetValue,
          conflictType: this.getConflictType(sourceValue, targetValue)
        });
      }
    }

    return conflicts;
  }

  /**
   * Apply the specified resolution strategy
   */
  private async applyResolutionStrategy<T extends Contact | Deal | Lead>(
    sourceRecord: T,
    targetRecord: T,
    conflicts: ConflictInfo[],
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolution> {
    let resolvedRecord: T;
    let requiresManualReview = false;

    switch (strategy) {
      case ConflictResolutionStrategy.SOURCE_WINS:
        resolvedRecord = { ...targetRecord, ...sourceRecord };
        break;

      case ConflictResolutionStrategy.TARGET_WINS:
        resolvedRecord = targetRecord;
        break;

      case ConflictResolutionStrategy.NEWEST_WINS:
        resolvedRecord = this.resolveByNewest(sourceRecord, targetRecord);
        break;

      case ConflictResolutionStrategy.MOST_COMPLETE_WINS:
        resolvedRecord = this.resolveByCompleteness(sourceRecord, targetRecord);
        break;

      case ConflictResolutionStrategy.MERGE:
        resolvedRecord = this.mergeRecords(sourceRecord, targetRecord, conflicts);
        break;

      case ConflictResolutionStrategy.MANUAL:
      default:
        resolvedRecord = targetRecord;
        requiresManualReview = true;
        break;
    }

    return {
      resolved: !requiresManualReview,
      strategy,
      resolvedValue: resolvedRecord,
      conflicts,
      requiresManualReview
    };
  }

  /**
   * Get fields that should be checked for conflicts
   */
  private getFieldsToCheck<T extends Contact | Deal | Lead>(record: T): string[] {
    // Common fields for all record types
    const commonFields = ['firstName', 'lastName', 'email', 'phone', 'company'];
    
    // Add type-specific fields
    if ('jobTitle' in record) {
      // Contact fields
      return [...commonFields, 'jobTitle', 'department', 'mobilePhone'];
    } else if ('name' in record && 'amount' in record) {
      // Deal fields
      return ['name', 'amount', 'stage', 'closeDate', 'probability', 'description'];
    } else if ('leadScore' in record) {
      // Lead fields
      return [...commonFields, 'leadScore', 'status', 'rating', 'industry'];
    }

    return commonFields;
  }

  /**
   * Check if there's a conflict between two values
   */
  private hasConflict(sourceValue: any, targetValue: any): boolean {
    // Both null/undefined - no conflict
    if (!sourceValue && !targetValue) return false;
    
    // One is null/undefined, other has value - potential conflict
    if (!sourceValue || !targetValue) return true;
    
    // Different values - conflict
    if (sourceValue !== targetValue) return true;
    
    return false;
  }

  /**
   * Determine the type of conflict
   */
  private getConflictType(sourceValue: any, targetValue: any): ConflictInfo['conflictType'] {
    if (!sourceValue && targetValue) return 'missing_source';
    if (sourceValue && !targetValue) return 'missing_target';
    return 'value_mismatch';
  }

  /**
   * Resolve by choosing the newest record
   */
  private resolveByNewest<T extends Contact | Deal | Lead>(
    sourceRecord: T,
    targetRecord: T
  ): T {
    const sourceUpdated = sourceRecord.updatedAt || sourceRecord.createdAt;
    const targetUpdated = targetRecord.updatedAt || targetRecord.createdAt;

    if (!sourceUpdated || !targetUpdated) {
      return sourceRecord; // Default to source if timestamps missing
    }

    return sourceUpdated > targetUpdated ? sourceRecord : targetRecord;
  }

  /**
   * Resolve by choosing the most complete record
   */
  private resolveByCompleteness<T extends Contact | Deal | Lead>(
    sourceRecord: T,
    targetRecord: T
  ): T {
    const sourceScore = this.calculateCompletenessScore(sourceRecord);
    const targetScore = this.calculateCompletenessScore(targetRecord);

    return sourceScore >= targetScore ? sourceRecord : targetRecord;
  }

  /**
   * Calculate completeness score for a record
   */
  private calculateCompletenessScore<T extends Contact | Deal | Lead>(record: T): number {
    const fieldsToCheck = this.getFieldsToCheck(record);
    let score = 0;

    for (const field of fieldsToCheck) {
      const value = record[field as keyof T];
      if (value !== null && value !== undefined && value !== '') {
        score++;
      }
    }

    return score;
  }

  /**
   * Merge records by taking the best value for each field
   */
  private mergeRecords<T extends Contact | Deal | Lead>(
    sourceRecord: T,
    targetRecord: T,
    conflicts: ConflictInfo[]
  ): T {
    const merged = { ...targetRecord };

    for (const conflict of conflicts) {
      const field = conflict.field as keyof T;
      
      // Merge strategy: prefer non-empty values, then source
      if (conflict.conflictType === 'missing_target' && conflict.sourceValue) {
        merged[field] = conflict.sourceValue;
      } else if (conflict.conflictType === 'missing_source' && conflict.targetValue) {
        // Keep target value
        continue;
      } else if (conflict.conflictType === 'value_mismatch') {
        // For value mismatches, prefer the longer/more detailed value
        const sourceLength = String(conflict.sourceValue || '').length;
        const targetLength = String(conflict.targetValue || '').length;
        
        if (sourceLength > targetLength) {
          merged[field] = conflict.sourceValue;
        }
        // Otherwise keep target value
      }
    }

    return merged;
  }

  /**
   * Check if conflicts require manual review
   */
  private requiresManualReview(
    conflicts: ConflictInfo[],
    strategy: ConflictResolutionStrategy
  ): boolean {
    if (strategy === ConflictResolutionStrategy.MANUAL) {
      return true;
    }

    // Check for critical field conflicts that should always be reviewed
    const criticalFields = ['email', 'amount', 'closeDate'];
    return conflicts.some(conflict => 
      criticalFields.includes(conflict.field) && 
      conflict.conflictType === 'value_mismatch'
    );
  }
} 
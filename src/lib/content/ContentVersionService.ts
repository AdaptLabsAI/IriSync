import { firestore } from '../firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { ContentItem } from './CalendarService';

/**
 * Interface representing a version of content
 */
export interface ContentVersion {
  id: string;
  contentId: string;
  userId: string;
  organizationId?: string;
  version: number;
  content: Partial<ContentItem>;
  createdAt: Date;
  comment?: string;
  changes?: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    source?: 'manual' | 'auto-save' | 'ai-assist' | 'collaboration';
    collaborators?: string[];
  };
}

/**
 * Interface for version comparison result
 */
export interface VersionComparison {
  field: string;
  oldValue?: any;
  newValue?: any;
  changeType: 'added' | 'modified' | 'removed';
  significance: 'major' | 'minor' | 'patch';
}

/**
 * Interface for conflict resolution
 */
export interface VersionConflict {
  field: string;
  baseValue?: any;
  currentValue?: any;
  incomingValue?: any;
  resolution?: 'current' | 'incoming' | 'merge' | 'manual';
}

/**
 * ContentVersionService handles versioning of content items
 * This allows tracking changes over time and reverting to previous versions
 */
export class ContentVersionService {
  private readonly COLLECTION = 'content_versions';
  private readonly MAX_VERSIONS_PER_CONTENT = 100;
  
  /**
   * Create a new version for a content item
   */
  async createVersion(
    contentId: string, 
    content: Partial<ContentItem>, 
    userId: string,
    comment?: string,
    changes?: { field: string; oldValue?: any; newValue?: any }[],
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      source?: 'manual' | 'auto-save' | 'ai-assist' | 'collaboration';
      collaborators?: string[];
    }
  ): Promise<ContentVersion> {
    // Get the latest version number for this content
    const latestVersion = await this.getLatestVersionNumber(contentId);
    const newVersionNumber = latestVersion + 1;
    
    // Create new version record
    const versionId = uuidv4();
    const version: ContentVersion = {
      id: versionId,
      contentId,
      userId,
      organizationId: content.organizationId,
      version: newVersionNumber,
      content,
      createdAt: new Date(),
      comment,
      changes,
      metadata
    };
    
    // Store in Firestore
    await setDoc(doc(firestore, this.COLLECTION, versionId), {
      ...version,
      createdAt: Timestamp.fromDate(version.createdAt)
    });
    
    // Clean up old versions if we exceed the limit
    await this.cleanupOldVersions(contentId);
    
    return version;
  }
  
  /**
   * Get the latest version number for a content item
   */
  async getLatestVersionNumber(contentId: string): Promise<number> {
    const versionsQuery = query(
      collection(firestore, this.COLLECTION),
      where('contentId', '==', contentId),
      orderBy('version', 'desc'),
      limit(1)
    );
    
    const versionsSnapshot = await getDocs(versionsQuery);
      
    if (versionsSnapshot.empty) {
      return 0;
    }
    
    return versionsSnapshot.docs[0].data().version;
  }
  
  /**
   * Get all versions for a content item
   */
  async getVersionHistory(contentId: string, limitCount?: number): Promise<ContentVersion[]> {
    let versionsQuery = query(
      collection(firestore, this.COLLECTION),
      where('contentId', '==', contentId),
      orderBy('version', 'desc')
    );
      
    if (limitCount) {
      versionsQuery = query(versionsQuery, limit(limitCount));
    }
      
    const versionsSnapshot = await getDocs(versionsQuery);
    const versions: ContentVersion[] = [];
    
    versionsSnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      versions.push({
        ...data,
        createdAt: data.createdAt.toDate()
      } as ContentVersion);
    });
    
    return versions;
  }
  
  /**
   * Get a specific version of a content item
   */
  async getVersion(contentId: string, version: number): Promise<ContentVersion | null> {
    const versionQuery = query(
      collection(firestore, this.COLLECTION),
      where('contentId', '==', contentId),
      where('version', '==', version),
      limit(1)
    );
    
    const versionSnapshot = await getDocs(versionQuery);
      
    if (versionSnapshot.empty) {
      return null;
    }
    
    const data = versionSnapshot.docs[0].data();
    return {
      ...data,
      createdAt: data.createdAt.toDate()
    } as ContentVersion;
  }
  
  /**
   * Revert content to a specific version
   * This creates a new version with the content from the specified version
   */
  async revertToVersion(
    contentId: string, 
    version: number, 
    userId: string,
    comment: string = `Reverted to version ${version}`
  ): Promise<ContentVersion> {
    // Get the version to revert to
    const targetVersion = await this.getVersion(contentId, version);
    
    if (!targetVersion) {
      throw new Error(`Version ${version} not found for content ${contentId}`);
    }
    
    // Get the current content
    const contentDoc = await getDoc(doc(firestore, 'content', contentId));
    
    if (!contentDoc.exists()) {
      throw new Error(`Content ${contentId} not found`);
    }
    
    const currentContent = contentDoc.data() as ContentItem;
    
    // Create a new version with the target version's content
    // But preserve certain fields that should not be reverted
    const newContent: Partial<ContentItem> = {
      ...targetVersion.content,
      updatedAt: new Date()
    };
    
    // Update the content
    await updateDoc(doc(firestore, 'content', contentId), {
      ...newContent,
      updatedAt: Timestamp.fromDate(newContent.updatedAt!)
    });
    
    // Track changes between current and reverted version
    const changes = this.generateChanges(currentContent, newContent);
    
    // Create a new version record for this revert action
    return this.createVersion(
      contentId,
      newContent,
      userId,
      comment,
      changes,
      {
        source: 'manual',
        userAgent: 'system'
      }
    );
  }
  
  /**
   * Generate changes between two content objects
   */
  private generateChanges(
    oldContent: Partial<ContentItem>, 
    newContent: Partial<ContentItem>
  ): { field: string; oldValue?: any; newValue?: any }[] {
    const changes: { field: string; oldValue?: any; newValue?: any }[] = [];
    
    // Get all unique keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldContent || {}),
      ...Object.keys(newContent || {})
    ]);
    
    for (const key of Array.from(allKeys)) {
      const oldValue = (oldContent as any)?.[key];
      const newValue = (newContent as any)?.[key];
      
      // Skip certain fields that shouldn't be tracked
      if (['updatedAt', 'createdAt', 'version'].includes(key)) {
        continue;
      }
      
      // Compare values
      if (!this.deepEqual(oldValue, newValue)) {
        changes.push({
          field: key,
          oldValue: this.serializeValue(oldValue),
          newValue: this.serializeValue(newValue)
        });
      }
    }
    
    return changes;
  }
  
  /**
   * Compare two versions and get the differences
   */
  async compareVersions(
    contentId: string,
    versionA: number,
    versionB: number
  ): Promise<VersionComparison[]> {
    const versionADoc = await this.getVersion(contentId, versionA);
    const versionBDoc = await this.getVersion(contentId, versionB);
    
    if (!versionADoc || !versionBDoc) {
      throw new Error('One or both versions not found');
    }
    
    const changes = this.generateChanges(versionADoc.content, versionBDoc.content);
    
    return changes.map(change => ({
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      changeType: this.getChangeType(change.oldValue, change.newValue),
      significance: this.getChangeSignificance(change.field, change.oldValue, change.newValue)
    }));
  }
  
  /**
   * Merge two versions with conflict resolution
   */
  async mergeVersions(
    contentId: string,
    baseVersion: number,
    versionA: number,
    versionB: number,
    userId: string,
    conflictResolutions?: Record<string, 'current' | 'incoming' | 'merge'>
  ): Promise<ContentVersion> {
    const base = await this.getVersion(contentId, baseVersion);
    const versionADoc = await this.getVersion(contentId, versionA);
    const versionBDoc = await this.getVersion(contentId, versionB);
    
    if (!base || !versionADoc || !versionBDoc) {
      throw new Error('One or more versions not found');
    }
    
    // Detect conflicts
    const conflicts = this.detectConflicts(base.content, versionADoc.content, versionBDoc.content);
    
    // Resolve conflicts
    const mergedContent = await this.resolveConflicts(
      base.content,
      versionADoc.content,
      versionBDoc.content,
      conflicts,
      conflictResolutions
    );
    
    // Create merged version
    const changes = this.generateChanges(base.content, mergedContent);
    
    return this.createVersion(
      contentId,
      mergedContent,
      userId,
      `Merged versions ${versionA} and ${versionB}`,
      changes,
      {
        source: 'manual',
        collaborators: [versionADoc.userId, versionBDoc.userId]
      }
    );
  }
  
  /**
   * Get version statistics for a content item
   */
  async getVersionStats(contentId: string): Promise<{
    totalVersions: number;
    contributors: string[];
    firstVersion: Date;
    lastVersion: Date;
    averageTimeBetweenVersions: number;
  }> {
    const versions = await this.getVersionHistory(contentId);
    
    if (versions.length === 0) {
      throw new Error('No versions found for content');
    }
    
    const contributors = Array.from(new Set(versions.map(v => v.userId)));
    const firstVersion = versions[versions.length - 1].createdAt;
    const lastVersion = versions[0].createdAt;
    
    let totalTimeDiff = 0;
    for (let i = 0; i < versions.length - 1; i++) {
      totalTimeDiff += versions[i].createdAt.getTime() - versions[i + 1].createdAt.getTime();
    }
    
    const averageTimeBetweenVersions = versions.length > 1 
      ? totalTimeDiff / (versions.length - 1) 
      : 0;
    
    return {
      totalVersions: versions.length,
      contributors,
      firstVersion,
      lastVersion,
      averageTimeBetweenVersions
    };
  }
  
  /**
   * Clean up old versions to maintain performance
   */
  private async cleanupOldVersions(contentId: string): Promise<void> {
    const versions = await this.getVersionHistory(contentId);
    
    if (versions.length > this.MAX_VERSIONS_PER_CONTENT) {
      const versionsToDelete = versions.slice(this.MAX_VERSIONS_PER_CONTENT);
      
      const batch = writeBatch(firestore);
      versionsToDelete.forEach(version => {
        const docRef = doc(firestore, this.COLLECTION, version.id);
        batch.delete(docRef);
      });
      
      await batch.commit();
    }
  }
  
  /**
   * Detect conflicts between three versions (base, current, incoming)
   */
  private detectConflicts(
    base: Partial<ContentItem>,
    current: Partial<ContentItem>,
    incoming: Partial<ContentItem>
  ): VersionConflict[] {
    const conflicts: VersionConflict[] = [];
    
    const allKeys = new Set([
      ...Object.keys(base || {}),
      ...Object.keys(current || {}),
      ...Object.keys(incoming || {})
    ]);
    
    for (const key of Array.from(allKeys)) {
      const baseValue = (base as any)?.[key];
      const currentValue = (current as any)?.[key];
      const incomingValue = (incoming as any)?.[key];
      
      // Skip certain fields
      if (['updatedAt', 'createdAt', 'version'].includes(key)) {
        continue;
      }
      
      // Check if both current and incoming changed from base
      const currentChanged = !this.deepEqual(baseValue, currentValue);
      const incomingChanged = !this.deepEqual(baseValue, incomingValue);
      const valuesConflict = !this.deepEqual(currentValue, incomingValue);
      
      if (currentChanged && incomingChanged && valuesConflict) {
        conflicts.push({
          field: key,
          baseValue: this.serializeValue(baseValue),
          currentValue: this.serializeValue(currentValue),
          incomingValue: this.serializeValue(incomingValue)
        });
      }
    }
    
    return conflicts;
  }
  
  /**
   * Resolve conflicts between versions
   */
  private async resolveConflicts(
    base: Partial<ContentItem>,
    current: Partial<ContentItem>,
    incoming: Partial<ContentItem>,
    conflicts: VersionConflict[],
    resolutions?: Record<string, 'current' | 'incoming' | 'merge'>
  ): Promise<Partial<ContentItem>> {
    const merged = { ...current };
    
    for (const conflict of conflicts) {
      const resolution = resolutions?.[conflict.field] || 'current';
      
      switch (resolution) {
        case 'current':
          // Keep current value (already in merged)
          break;
        case 'incoming':
          (merged as any)[conflict.field] = conflict.incomingValue;
          break;
        case 'merge':
          // Attempt automatic merge for certain field types
          (merged as any)[conflict.field] = this.attemptAutoMerge(
            conflict.baseValue,
            conflict.currentValue,
            conflict.incomingValue,
            conflict.field
          );
          break;
      }
    }
    
    return merged;
  }
  
  /**
   * Attempt automatic merge for compatible field types
   */
  private attemptAutoMerge(baseValue: any, currentValue: any, incomingValue: any, field: string): any {
    // For arrays, try to merge unique values
    if (Array.isArray(currentValue) && Array.isArray(incomingValue)) {
      return Array.from(new Set([...currentValue, ...incomingValue]));
    }
    
    // For strings, if it's content, try to merge paragraphs
    if (typeof currentValue === 'string' && typeof incomingValue === 'string' && field === 'content') {
      return `${currentValue}\n\n${incomingValue}`;
    }
    
    // For objects, merge properties
    if (typeof currentValue === 'object' && typeof incomingValue === 'object' && currentValue && incomingValue) {
      return { ...currentValue, ...incomingValue };
    }
    
    // Default to current value if no merge strategy available
    return currentValue;
  }
  
  /**
   * Deep equality check for values
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    
    if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
      return a === b;
    }
    
    if (a === null || a === undefined || b === null || b === undefined) {
      return false;
    }
    
    if (a.prototype !== b.prototype) return false;
    
    let keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) {
      return false;
    }
    
    return keys.every(k => this.deepEqual(a[k], b[k]));
  }
  
  /**
   * Serialize value for storage
   */
  private serializeValue(value: any): any {
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    if (typeof value === 'object' && value !== null) {
      return JSON.parse(JSON.stringify(value));
    }
    
    return value;
  }
  
  /**
   * Determine the type of change
   */
  private getChangeType(oldValue: any, newValue: any): 'added' | 'modified' | 'removed' {
    if (oldValue === undefined && newValue !== undefined) return 'added';
    if (oldValue !== undefined && newValue === undefined) return 'removed';
    return 'modified';
  }
  
  /**
   * Determine the significance of a change
   */
  private getChangeSignificance(field: string, oldValue: any, newValue: any): 'major' | 'minor' | 'patch' {
    // Major changes
    if (['content', 'title', 'platforms'].includes(field)) {
      return 'major';
    }
    
    // Minor changes
    if (['hashtags', 'scheduledTime', 'status'].includes(field)) {
      return 'minor';
    }
    
    // Patch changes (metadata, formatting, etc.)
    return 'patch';
  }
}

// Create and export singleton instance
const contentVersionService = new ContentVersionService();
export default contentVersionService; 
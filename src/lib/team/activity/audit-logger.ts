import { getFirestore } from 'firebase-admin/firestore';

/**
 * Audit log action categories
 */
export enum AuditLogCategory {
  AUTH = 'auth',
  USER_MANAGEMENT = 'user_management',
  CONTENT = 'content',
  PLATFORM = 'platform',
  SETTINGS = 'settings',
  SUBSCRIPTION = 'subscription',
  TEAM = 'team',
  ORGANIZATION = 'organization',
  API = 'api',
  SECURITY = 'security'
}

/**
 * Audit log severity levels
 */
export enum AuditLogSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  category: AuditLogCategory;
  action: string;
  timestamp: Date;
  severity: AuditLogSeverity;
  resourceId?: string;
  resourceType?: string;
  organizationId?: string;
  teamId?: string;
  previousState?: any;
  newState?: any;
  metadata: Record<string, any>;
}

/**
 * Team audit logging service
 */
export class TeamAuditLogger {
  private readonly AUDIT_LOG_COLLECTION = 'audit_logs';
  private _firestore: ReturnType<typeof getFirestore> | null = null;
  
  /**
   * Lazy-load Firestore instance to avoid initialization during build time
   */
  private get firestore(): ReturnType<typeof getFirestore> {
    if (!this._firestore) {
      this._firestore = getFirestore();
    }
    return this._firestore;
  }
  
  /**
   * Log an audit event
   * @param entry Audit log entry data
   * @returns The ID of the created audit log entry
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Create the audit log entry
      const auditData = {
        ...entry,
        timestamp: new Date()
      };
      
      // Add to the audit log collection
      const docRef = await this.firestore.collection(this.AUDIT_LOG_COLLECTION).add(auditData);
      
      return docRef.id;
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw error, just return empty string to prevent disrupting main workflow
      return '';
    }
  }
  
  /**
   * Get audit logs with filters
   * @param filters Audit log filters
   * @param limit Maximum number of entries to return
   * @param offset Offset for pagination
   * @returns Filtered audit log entries
   */
  async getAuditLogs(
    filters: {
      userId?: string;
      category?: AuditLogCategory;
      categories?: string[];
      severity?: AuditLogSeverity;
      severities?: string[];
      resourceId?: string;
      resourceType?: string;
      organizationId?: string;
      teamId?: string;
      startDate?: Date;
      endDate?: Date;
      action?: string;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      // Start building the query
      let query: any = this.firestore.collection(this.AUDIT_LOG_COLLECTION);
      
      // Multi-value filters
      if (filters.severities && filters.severities.length > 0) {
        query = query.where('severity', 'in', filters.severities);
      } else if (filters.severity) {
        query = query.where('severity', '==', filters.severity);
      }
      if (filters.categories && filters.categories.length > 0) {
        query = query.where('category', 'in', filters.categories);
      } else if (filters.category) {
        query = query.where('category', '==', filters.category);
      }
      
      // Apply other filters
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      
      if (filters.resourceId) {
        query = query.where('resourceId', '==', filters.resourceId);
      }
      
      if (filters.resourceType) {
        query = query.where('resourceType', '==', filters.resourceType);
      }
      
      if (filters.organizationId) {
        query = query.where('organizationId', '==', filters.organizationId);
      }
      
      if (filters.teamId) {
        query = query.where('teamId', '==', filters.teamId);
      }
      
      if (filters.action) {
        query = query.where('action', '==', filters.action);
      }
      
      // Apply date range filters
      if (filters.startDate) {
        query = query.where('timestamp', '>=', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.where('timestamp', '<=', filters.endDate);
      }
      
      // Apply ordering, pagination
      query = query.orderBy('timestamp', 'desc')
        .limit(limit)
        .offset(offset);
      
      // Execute query
      const snapshot = await query.get();
      
      // Process results
      const entries: AuditLogEntry[] = [];
      
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          userId: data.userId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          category: data.category,
          action: data.action,
          timestamp: data.timestamp.toDate(),
          severity: data.severity,
          resourceId: data.resourceId,
          resourceType: data.resourceType,
          organizationId: data.organizationId,
          teamId: data.teamId,
          previousState: data.previousState,
          newState: data.newState,
          metadata: data.metadata || {}
        });
      });
      
      return entries;
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw new Error('Failed to get audit logs');
    }
  }
  
  /**
   * Log user authentication event
   * @param userId User ID
   * @param action Authentication action (login, logout, etc.)
   * @param ipAddress User's IP address
   * @param userAgent User's browser agent
   * @param metadata Additional metadata
   * @returns The ID of the created audit log entry
   */
  async logAuthEvent(
    userId: string,
    action: string,
    ipAddress: string,
    userAgent: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    return this.log({
      userId,
      ipAddress,
      userAgent,
      category: AuditLogCategory.AUTH,
      action,
      severity: AuditLogSeverity.INFO,
      metadata
    });
  }
  
  /**
   * Log user management event
   * @param userId User ID of the actor
   * @param action User management action
   * @param targetUserId Target user ID
   * @param organizationId Organization ID
   * @param previousState Previous state (if applicable)
   * @param newState New state (if applicable)
   * @returns The ID of the created audit log entry
   */
  async logUserManagementEvent(
    userId: string,
    action: string,
    targetUserId: string,
    organizationId?: string,
    previousState?: any,
    newState?: any
  ): Promise<string> {
    return this.log({
      userId,
      category: AuditLogCategory.USER_MANAGEMENT,
      action,
      severity: AuditLogSeverity.INFO,
      resourceId: targetUserId,
      resourceType: 'user',
      organizationId,
      previousState,
      newState,
      metadata: {
        targetUserId
      }
    });
  }
  
  /**
   * Log content management event
   * @param userId User ID of the actor
   * @param action Content action
   * @param contentId Content ID
   * @param contentType Content type
   * @param teamId Team ID
   * @param organizationId Organization ID
   * @param metadata Additional metadata
   * @returns The ID of the created audit log entry
   */
  async logContentEvent(
    userId: string,
    action: string,
    contentId: string,
    contentType: string,
    teamId?: string,
    organizationId?: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    return this.log({
      userId,
      category: AuditLogCategory.CONTENT,
      action,
      severity: AuditLogSeverity.INFO,
      resourceId: contentId,
      resourceType: contentType,
      teamId,
      organizationId,
      metadata
    });
  }
  
  /**
   * Log security event
   * @param userId User ID
   * @param action Security action
   * @param severity Event severity
   * @param ipAddress User's IP address
   * @param userAgent User's browser agent
   * @param metadata Additional metadata
   * @returns The ID of the created audit log entry
   */
  async logSecurityEvent(
    userId: string,
    action: string,
    severity: AuditLogSeverity,
    ipAddress?: string,
    userAgent?: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    return this.log({
      userId,
      ipAddress,
      userAgent,
      category: AuditLogCategory.SECURITY,
      action,
      severity,
      metadata
    });
  }
}

// Export the class so it can be instantiated when needed
// Don't create a singleton at module level to avoid build-time initialization
export default TeamAuditLogger;

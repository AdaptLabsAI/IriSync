import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from '../../firebase';
import { 
  Permission, 
  FirestorePermission, 
  PermissionCondition,
  RolePermission,
  UserPermission,
  PermissionContext,
  PermissionCheckResult,
  PermissionUtils
} from '../models/Permission';
import { 
  User, 
  UserUtils 
} from '../models/User';
import { 
  UserError, 
  UserErrorType, 
  UserOperationResult,
  OrganizationRole,
  TeamRole,
  PermissionScope
} from '../types';
import { UserRole } from '../../models/User';
import { SubscriptionTier } from '../../subscription/models/subscription';
import { ActivityUtils } from '../models/Activity';

/**
 * Permission cache entry
 */
interface PermissionCacheEntry {
  result: PermissionCheckResult;
  timestamp: number;
  expiresAt: number;
}

/**
 * Permission manager configuration
 */
export interface PermissionManagerConfig {
  cacheEnabled: boolean;
  cacheTTL: number; // in milliseconds
  maxCacheSize: number;
  enableAuditLogging: boolean;
  defaultDenyAll: boolean;
}

/**
 * Permission check options
 */
export interface PermissionCheckOptions {
  useCache?: boolean;
  skipSubscriptionCheck?: boolean;
  context?: Partial<PermissionContext>;
}

/**
 * Permission manager class for RBAC
 */
export class PermissionManager {
  private config: PermissionManagerConfig;
  private permissionCache: Map<string, PermissionCacheEntry> = new Map();
  private rolePermissionsCache: Map<string, RolePermission[]> = new Map();
  private userPermissionsCache: Map<string, UserPermission[]> = new Map();

  constructor(config: Partial<PermissionManagerConfig> = {}) {
    this.config = {
      cacheEnabled: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 1000,
      enableAuditLogging: true,
      defaultDenyAll: false,
      ...config
    };

    // Clean cache periodically
    if (this.config.cacheEnabled) {
      setInterval(() => this.cleanExpiredCache(), 60 * 1000); // Clean every minute
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    userId: string,
    action: string,
    resource?: string,
    resourceId?: string,
    options: PermissionCheckOptions = {}
  ): Promise<PermissionCheckResult> {
    try {
      // Generate cache key
      const cacheKey = PermissionUtils.generatePermissionKey(userId, action, resource, resourceId);

      // Check cache first
      if (this.config.cacheEnabled && options.useCache !== false) {
        const cached = this.getCachedPermission(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Get user data
      const user = await this.getUser(userId);
      if (!user) {
        const result: PermissionCheckResult = {
          granted: false,
          reason: 'User not found',
          source: 'system'
        };
        this.setCachedPermission(cacheKey, result);
        return result;
      }

      // Check if user is active
      if (user.status !== 'active') {
        const result: PermissionCheckResult = {
          granted: false,
          reason: `User account is ${user.status}`,
          source: 'system'
        };
        this.setCachedPermission(cacheKey, result);
        return result;
      }

      // Build permission context
      const context: PermissionContext = {
        userId,
        resource,
        resourceId,
        organizationId: user.organizations?.[0] || undefined,
        teamId: undefined, // Would be determined from context
        metadata: options.context
      };

      // Check role-based permissions
      const roleResult = await this.checkRolePermissions(user.role, action, resource, context);

      // Check user-specific permissions (overrides role permissions)
      const userResult = await this.checkUserPermissions(userId, action, resource, context);

      // Merge results (user permissions override role permissions)
      const finalResult = PermissionUtils.mergePermissionResults(roleResult, userResult);

      // Check subscription tier requirements if not skipped
      if (!options.skipSubscriptionCheck && finalResult.granted) {
        const subscriptionCheck = await this.checkSubscriptionRequirements(
          action,
          resource,
          SubscriptionTier.CREATOR // Default to creator tier if not available
        );
        if (!subscriptionCheck.granted) {
          finalResult.granted = false;
          finalResult.reason = subscriptionCheck.reason;
          finalResult.source = 'subscription';
        }
      }

      // Cache result
      if (this.config.cacheEnabled) {
        this.setCachedPermission(cacheKey, finalResult);
      }

      // Log audit trail if enabled
      if (this.config.enableAuditLogging) {
        await this.logPermissionCheck(userId, action, resource, resourceId, finalResult);
      }

      return finalResult;

    } catch (error: any) {
      console.error('Error checking permission:', error);
      return {
        granted: this.config.defaultDenyAll ? false : true,
        reason: 'Permission check failed',
        source: 'system'
      };
    }
  }

  /**
   * Check multiple permissions at once
   */
  async hasPermissions(
    userId: string,
    permissions: Array<{
      action: string;
      resource?: string;
      resourceId?: string;
    }>,
    options: PermissionCheckOptions = {}
  ): Promise<Record<string, PermissionCheckResult>> {
    const results: Record<string, PermissionCheckResult> = {};

    await Promise.all(
      permissions.map(async (permission) => {
        const key = PermissionUtils.generatePermissionKey(
          userId,
          permission.action,
          permission.resource,
          permission.resourceId
        );
        
        results[key] = await this.hasPermission(
          userId,
          permission.action,
          permission.resource,
          permission.resourceId,
          options
        );
      })
    );

    return results;
  }

  /**
   * Grant permission to user
   */
  async grantUserPermission(
    userId: string,
    permissionId: string,
    grantedBy: string,
    options: {
      expiresAt?: Date;
      reason?: string;
      conditions?: any[];
    } = {}
  ): Promise<UserOperationResult<void>> {
    try {
      // Validate permission exists
      const permission = await this.getPermission(permissionId);
      if (!permission) {
        return {
          success: false,
          error: {
            type: UserErrorType.PERMISSION_NOT_FOUND,
            message: 'Permission not found',
            timestamp: new Date()
          }
        };
      }

      // Create user permission
      const userPermission: UserPermission = {
        userId,
        permissionId,
        granted: true,
        conditions: options.conditions,
        grantedBy,
        grantedAt: new Date(),
        expiresAt: options.expiresAt,
        reason: options.reason
      };

      // Store in database
      const permissionDoc = doc(firestore, 'userPermissions', `${userId}_${permissionId}`);
      await setDoc(permissionDoc, {
        ...userPermission,
        grantedAt: serverTimestamp(),
        expiresAt: options.expiresAt ? Timestamp.fromDate(options.expiresAt) : null
      });

      // Clear cache
      this.clearUserPermissionsCache(userId);
      this.clearPermissionCache(userId);

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: {
          type: UserErrorType.PERMISSION_ERROR,
          message: 'Failed to grant permission',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Revoke permission from user
   */
  async revokeUserPermission(
    userId: string,
    permissionId: string,
    revokedBy: string,
    reason?: string
  ): Promise<UserOperationResult<void>> {
    try {
      // Update user permission to revoked
      const permissionDoc = doc(firestore, 'userPermissions', `${userId}_${permissionId}`);
      await updateDoc(permissionDoc, {
        granted: false,
        revokedBy,
        revokedAt: serverTimestamp(),
        reason
      });

      // Clear cache
      this.clearUserPermissionsCache(userId);
      this.clearPermissionCache(userId);

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: {
          type: UserErrorType.PERMISSION_ERROR,
          message: 'Failed to revoke permission',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    // Check cache first
    if (this.userPermissionsCache.has(userId)) {
      return this.userPermissionsCache.get(userId)!;
    }

    try {
      const permissionsQuery = query(
        collection(firestore, 'userPermissions'),
        where('userId', '==', userId),
        where('granted', '==', true)
      );

      const snapshot = await getDocs(permissionsQuery);
      const permissions: UserPermission[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        permissions.push({
          userId: data.userId,
          permissionId: data.permissionId,
          granted: data.granted,
          conditions: data.conditions,
          grantedBy: data.grantedBy,
          grantedAt: data.grantedAt.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          reason: data.reason
        });
      });

      // Filter out expired permissions
      const activePermissions = permissions.filter(p => 
        !PermissionUtils.isExpired(p)
      );

      // Cache result
      this.userPermissionsCache.set(userId, activePermissions);

      return activePermissions;

    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(role: UserRole): Promise<RolePermission[]> {
    // Check cache first
    if (this.rolePermissionsCache.has(role)) {
      return this.rolePermissionsCache.get(role)!;
    }

    try {
      const permissionsQuery = query(
        collection(firestore, 'rolePermissions'),
        where('roleId', '==', role),
        where('granted', '==', true)
      );

      const snapshot = await getDocs(permissionsQuery);
      const permissions: RolePermission[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        permissions.push({
          roleId: data.roleId,
          permissionId: data.permissionId,
          granted: data.granted,
          conditions: data.conditions,
          grantedBy: data.grantedBy,
          grantedAt: data.grantedAt.toDate(),
          expiresAt: data.expiresAt?.toDate()
        });
      });

      // Filter out expired permissions
      const activePermissions = permissions.filter(p => 
        !PermissionUtils.isExpired(p)
      );

      // Cache result
      this.rolePermissionsCache.set(role, activePermissions);

      return activePermissions;

    } catch (error) {
      console.error('Error getting role permissions:', error);
      return [];
    }
  }

  /**
   * Create new permission
   */
  async createPermission(
    permissionData: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<UserOperationResult<Permission>> {
    try {
      // Validate permission data
      const validation = PermissionUtils.validatePermission(permissionData as Permission);
      if (!validation.success) {
        return validation;
      }

      const now = new Date();
      const permission: Permission = {
        id: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...permissionData,
        createdAt: now,
        updatedAt: now
      };

      // Store in database
      const permissionDoc = doc(firestore, 'permissions', permission.id);
      const firestorePermission = PermissionUtils.toFirestore(permission);
      await setDoc(permissionDoc, firestorePermission);

      return { success: true, data: permission };

    } catch (error: any) {
      return {
        success: false,
        error: {
          type: UserErrorType.PERMISSION_ERROR,
          message: 'Failed to create permission',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Update permission
   */
  async updatePermission(
    permissionId: string,
    updates: Partial<Permission>
  ): Promise<UserOperationResult<Permission>> {
    try {
      const permissionDoc = doc(firestore, 'permissions', permissionId);
      const permissionSnapshot = await getDoc(permissionDoc);

      if (!permissionSnapshot.exists()) {
        return {
          success: false,
          error: {
            type: UserErrorType.PERMISSION_NOT_FOUND,
            message: 'Permission not found',
            timestamp: new Date()
          }
        };
      }

      const currentPermission = PermissionUtils.fromFirestore(
        permissionSnapshot.data() as FirestorePermission
      );

      const updatedPermission: Permission = {
        ...currentPermission,
        ...updates,
        updatedAt: new Date()
      };

      // Validate updated permission
      const validation = PermissionUtils.validatePermission(updatedPermission);
      if (!validation.success) {
        return validation;
      }

      // Update in database
      const firestorePermission = PermissionUtils.toFirestore(updatedPermission);
      await updateDoc(permissionDoc, firestorePermission as any);

      // Clear caches
      this.clearAllCaches();

      return { success: true, data: updatedPermission };

    } catch (error: any) {
      return {
        success: false,
        error: {
          type: UserErrorType.PERMISSION_ERROR,
          message: 'Failed to update permission',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Delete permission
   */
  async deletePermission(permissionId: string): Promise<UserOperationResult<void>> {
    try {
      // Delete permission document
      await deleteDoc(doc(firestore, 'permissions', permissionId));

      // Delete all role permissions for this permission
      const rolePermissionsQuery = query(
        collection(firestore, 'rolePermissions'),
        where('permissionId', '==', permissionId)
      );
      const rolePermissionsSnapshot = await getDocs(rolePermissionsQuery);
      
      const deletePromises = rolePermissionsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );

      // Delete all user permissions for this permission
      const userPermissionsQuery = query(
        collection(firestore, 'userPermissions'),
        where('permissionId', '==', permissionId)
      );
      const userPermissionsSnapshot = await getDocs(userPermissionsQuery);
      
      deletePromises.push(...userPermissionsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      ));

      await Promise.all(deletePromises);

      // Clear caches
      this.clearAllCaches();

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: {
          type: UserErrorType.PERMISSION_ERROR,
          message: 'Failed to delete permission',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const permissionsQuery = query(
        collection(firestore, 'permissions'),
        orderBy('name')
      );

      const snapshot = await getDocs(permissionsQuery);
      const permissions: Permission[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as FirestorePermission;
        permissions.push(PermissionUtils.fromFirestore(data));
      });

      return permissions;

    } catch (error) {
      console.error('Error getting all permissions:', error);
      return [];
    }
  }

  /**
   * Check role-based permissions
   */
  private async checkRolePermissions(
    role: UserRole,
    action: string,
    resource: string | undefined,
    context: PermissionContext
  ): Promise<PermissionCheckResult | null> {
    try {
      const rolePermissions = await this.getRolePermissions(role);
      
      for (const rolePermission of rolePermissions) {
        const permission = await this.getPermission(rolePermission.permissionId);
        if (!permission) continue;

        // Check if permission matches the action and resource
        if (this.matchesPermission(permission, action, resource)) {
          // Check if permission matches context and conditions
          if (PermissionUtils.matchesContext(permission, context, rolePermission.conditions)) {
            return {
              granted: true,
              reason: `Granted by role: ${role}`,
              source: 'role',
              conditions: rolePermission.conditions,
              expiresAt: rolePermission.expiresAt
            };
          }
        }
      }

      return null;

    } catch (error) {
      console.error('Error checking role permissions:', error);
      return null;
    }
  }

  /**
   * Check user-specific permissions
   */
  private async checkUserPermissions(
    userId: string,
    action: string,
    resource: string | undefined,
    context: PermissionContext
  ): Promise<PermissionCheckResult | null> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      
      for (const userPermission of userPermissions) {
        const permission = await this.getPermission(userPermission.permissionId);
        if (!permission) continue;

        // Check if permission matches the action and resource
        if (this.matchesPermission(permission, action, resource)) {
          // Check if permission matches context and conditions
          if (PermissionUtils.matchesContext(permission, context, userPermission.conditions)) {
            return {
              granted: userPermission.granted,
              reason: userPermission.granted ? 
                'Granted by user-specific permission' : 
                'Denied by user-specific permission',
              source: 'user',
              conditions: userPermission.conditions,
              expiresAt: userPermission.expiresAt
            };
          }
        }
      }

      return null;

    } catch (error) {
      console.error('Error checking user permissions:', error);
      return null;
    }
  }

  /**
   * Check subscription tier requirements
   */
  private async checkSubscriptionRequirements(
    action: string,
    resource: string | undefined,
    userTier: SubscriptionTier
  ): Promise<PermissionCheckResult> {
    try {
      // Get all permissions that match this action/resource
      const allPermissions = await this.getAllPermissions();
      
      for (const permission of allPermissions) {
        if (this.matchesPermission(permission, action, resource)) {
          if (!PermissionUtils.requiresSubscriptionTier(permission, userTier)) {
            return {
              granted: false,
              reason: `Requires ${permission.metadata.requiresSubscription} subscription tier`,
              source: 'subscription'
            };
          }
        }
      }

      return {
        granted: true,
        reason: 'Subscription tier requirements met',
        source: 'subscription'
      };

    } catch (error) {
      console.error('Error checking subscription requirements:', error);
      return {
        granted: true,
        reason: 'Subscription check failed, allowing access',
        source: 'subscription'
      };
    }
  }

  /**
   * Check if permission matches action and resource
   */
  private matchesPermission(permission: Permission, action: string, resource?: string): boolean {
    // Check wildcard permissions
    if (permission.action === '*') return true;
    if (permission.action === action && (!permission.resource || permission.resource === resource)) {
      return true;
    }

    // Check pattern matching (e.g., "content:*" matches "content:read", "content:write", etc.)
    if (permission.action.endsWith('*')) {
      const prefix = permission.action.slice(0, -1);
      return action.startsWith(prefix);
    }

    return false;
  }

  /**
   * Get permission by ID
   */
  private async getPermission(permissionId: string): Promise<Permission | null> {
    try {
      const permissionDoc = await getDoc(doc(firestore, 'permissions', permissionId));
      if (!permissionDoc.exists()) return null;

      const data = permissionDoc.data() as FirestorePermission;
      return PermissionUtils.fromFirestore(data);

    } catch (error) {
      console.error('Error getting permission:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  private async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (!userDoc.exists()) return null;

      const data = userDoc.data();
      return UserUtils.fromFirestore(userId, data as any);

    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Get cached permission result
   */
  private getCachedPermission(key: string): PermissionCheckResult | null {
    if (!this.config.cacheEnabled) return null;

    const entry = this.permissionCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.permissionCache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Set cached permission result
   */
  private setCachedPermission(key: string, result: PermissionCheckResult): void {
    if (!this.config.cacheEnabled) return;

    // Ensure cache doesn't exceed max size
    if (this.permissionCache.size >= this.config.maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.permissionCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = Math.floor(this.config.maxCacheSize * 0.1); // Remove 10%
      for (let i = 0; i < toRemove; i++) {
        this.permissionCache.delete(entries[i][0]);
      }
    }

    const now = Date.now();
    this.permissionCache.set(key, {
      result,
      timestamp: now,
      expiresAt: now + this.config.cacheTTL
    });
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    const entries = Array.from(this.permissionCache.entries());
    
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Clear permission cache for user
   */
  private clearPermissionCache(userId: string): void {
    const keys = Array.from(this.permissionCache.keys());
    for (const key of keys) {
      if (key.startsWith(userId)) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Clear user permissions cache
   */
  private clearUserPermissionsCache(userId: string): void {
    this.userPermissionsCache.delete(userId);
  }

  /**
   * Clear all caches
   */
  private clearAllCaches(): void {
    this.permissionCache.clear();
    this.rolePermissionsCache.clear();
    this.userPermissionsCache.clear();
  }

  /**
   * Log permission check for audit trail
   */
  private async logPermissionCheck(
    userId: string,
    action: string,
    resource: string | undefined,
    resourceId: string | undefined,
    result: PermissionCheckResult
  ): Promise<void> {
    try {
      // In a real implementation, this would log to an audit collection
      console.log('Permission check audit:', {
        userId,
        action,
        resource,
        resourceId,
        granted: result.granted,
        reason: result.reason,
        source: result.source,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging permission check:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearAllCaches();
  }
} 
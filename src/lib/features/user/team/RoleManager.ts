import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { getFirebaseFirestore } from '../../core/firebase';
import {
  OrganizationRole,
  TeamRole,
  UserActivityType,
  ActivityContext,
  UserErrorType,
  UserOperationResult,
  UserApiResponse,
  UserPaginationParams
} from '../types';
import { Team, TeamUtils } from '../models/Team';
import { User, UserUtils } from '../../core/models/User';
import { ActivityUtils } from '../models/Activity';

/**
 * Custom role interface for teams
 */
export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  organizationId: string;
  permissions: string[];
  isSystemRole: boolean;
  isActive: boolean;
  priority: number;
  metadata: {
    createdBy: string;
    updatedBy?: string;
    category?: string;
    color?: string;
    icon?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firestore representation of custom role
 */
export interface FirestoreCustomRole {
  name: string;
  description?: string;
  teamId: string;
  organizationId: string;
  permissions: string[];
  isSystemRole: boolean;
  isActive: boolean;
  priority: number;
  metadata: {
    createdBy: string;
    updatedBy?: string;
    category?: string;
    color?: string;
    icon?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Role assignment interface
 */
export interface RoleAssignment {
  id: string;
  userId: string;
  teamId: string;
  organizationId: string;
  roleId: string;
  roleName: string;
  roleType: 'system' | 'custom';
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

/**
 * Role creation data
 */
export interface RoleCreateData {
  name: string;
  description?: string;
  permissions: string[];
  priority?: number;
  metadata?: {
    category?: string;
    color?: string;
    icon?: string;
  };
}

/**
 * Role update data
 */
export interface RoleUpdateData {
  name?: string;
  description?: string;
  permissions?: string[];
  priority?: number;
  isActive?: boolean;
  metadata?: Partial<CustomRole['metadata']>;
}

/**
 * Role search options
 */
export interface RoleSearchOptions {
  teamId?: string;
  organizationId?: string;
  isSystemRole?: boolean;
  isActive?: boolean;
  category?: string;
  permissions?: string[];
  sortBy?: 'name' | 'priority' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Role manager configuration
 */
export interface RoleManagerConfig {
  enableCaching: boolean;
  cacheTTL: number; // in milliseconds
  maxCustomRoles: number;
  enableAuditLogging: boolean;
  defaultRolePriority: number;
}

/**
 * Role Manager for team role management
 * Handles custom roles, role assignments, and role-based permissions
 */
export class RoleManager {
  private static instance: RoleManager;
  private config: RoleManagerConfig;
  private roleCache: Map<string, CustomRole> = new Map();
  private assignmentCache: Map<string, RoleAssignment[]> = new Map();

  private constructor(config: Partial<RoleManagerConfig> = {}) {
    this.config = {
      enableCaching: true,
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      maxCustomRoles: 50,
      enableAuditLogging: true,
      defaultRolePriority: 100,
      ...config
    };
  }

  public static getInstance(config?: Partial<RoleManagerConfig>): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager(config);
    }
    return RoleManager.instance;
  }

  /**
   * Create a custom role
   */
  async createRole(
    teamId: string,
    organizationId: string,
    createdBy: string,
    roleData: RoleCreateData
  ): Promise<UserOperationResult<CustomRole>> {
    try {
      // Validate role data
      const validation = this.validateRoleData(roleData);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error!
        };
      }

      // Check if role name already exists in team
      const existingRole = await this.getRoleByName(teamId, roleData.name);
      if (existingRole) {
        return {
          success: false,
          error: {
            type: UserErrorType.ALREADY_EXISTS,
            message: 'Role name already exists in this team',
            timestamp: new Date()
          }
        };
      }

      // Check custom role limits
      const teamRoles = await this.getTeamRoles(teamId);
      const customRoleCount = teamRoles.filter(r => !r.isSystemRole).length;
      if (customRoleCount >= this.config.maxCustomRoles) {
        return {
          success: false,
          error: {
            type: UserErrorType.QUOTA_EXCEEDED,
            message: `Maximum custom roles limit (${this.config.maxCustomRoles}) reached`,
            timestamp: new Date()
          }
        };
      }

      const roleId = doc(collection(firestore, 'customRoles')).id;
      const now = new Date();

      const customRole: CustomRole = {
        id: roleId,
        name: roleData.name,
        description: roleData.description,
        teamId,
        organizationId,
        permissions: roleData.permissions,
        isSystemRole: false,
        isActive: true,
        priority: roleData.priority || this.config.defaultRolePriority,
        metadata: {
          createdBy,
          category: roleData.metadata?.category || 'custom',
          color: roleData.metadata?.color || '#6B7280',
          icon: roleData.metadata?.icon || '👤'
        },
        createdAt: now,
        updatedAt: now
      };

      // Save to Firestore
      const firestoreRole = this.toFirestore(customRole);
      await setDoc(doc(firestore, 'customRoles', roleId), firestoreRole);

      // Update cache
      if (this.config.enableCaching) {
        this.roleCache.set(roleId, customRole);
      }

      // Log activity
      if (this.config.enableAuditLogging) {
        await this.logRoleActivity(
          roleId,
          createdBy,
          UserActivityType.ROLE_CHANGE,
          'role_created',
          {
            roleName: roleData.name,
            teamId,
            permissions: roleData.permissions
          }
        );
      }

      return {
        success: true,
        data: customRole
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: 'Failed to create role',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<CustomRole | null> {
    try {
      // Check cache first
      if (this.config.enableCaching && this.roleCache.has(roleId)) {
        return this.roleCache.get(roleId)!;
      }

      const roleDoc = await getDoc(doc(firestore, 'customRoles', roleId));
      if (!roleDoc.exists()) {
        return null;
      }

      const role = this.fromFirestore(roleId, roleDoc.data() as FirestoreCustomRole);

      // Update cache
      if (this.config.enableCaching) {
        this.roleCache.set(roleId, role);
      }

      return role;

    } catch (error) {
      console.error('Error getting role:', error);
      return null;
    }
  }

  /**
   * Update role
   */
  async updateRole(
    roleId: string,
    updatedBy: string,
    updates: RoleUpdateData
  ): Promise<UserOperationResult<CustomRole>> {
    try {
      const existingRole = await this.getRole(roleId);
      if (!existingRole) {
        return {
          success: false,
          error: {
            type: UserErrorType.NOT_FOUND,
            message: 'Role not found',
            timestamp: new Date()
          }
        };
      }

      // Validate updates
      if (updates.name) {
        const validation = this.validateRoleData({ 
          name: updates.name, 
          permissions: updates.permissions || existingRole.permissions 
        });
        if (!validation.success) {
          return {
            success: false,
            error: validation.error!
          };
        }

        // Check for name conflicts (excluding current role)
        const existingByName = await this.getRoleByName(existingRole.teamId, updates.name);
        if (existingByName && existingByName.id !== roleId) {
          return {
            success: false,
            error: {
              type: UserErrorType.ALREADY_EXISTS,
              message: 'Role name already exists in this team',
              timestamp: new Date()
            }
          };
        }
      }

      const updatedRole: CustomRole = {
        ...existingRole,
        ...updates,
        metadata: {
          ...existingRole.metadata,
          ...updates.metadata,
          updatedBy
        },
        updatedAt: new Date()
      };

      // Update in Firestore
      const firestoreUpdates = this.toFirestore(updatedRole);
      await updateDoc(doc(firestore, 'customRoles', roleId), {
        ...firestoreUpdates,
        updatedAt: serverTimestamp()
      });

      // Update cache
      if (this.config.enableCaching) {
        this.roleCache.set(roleId, updatedRole);
      }

      // Log activity
      if (this.config.enableAuditLogging) {
        await this.logRoleActivity(
          roleId,
          updatedBy,
          UserActivityType.ROLE_CHANGE,
          'role_updated',
          {
            roleName: updatedRole.name,
            updates: Object.keys(updates)
          }
        );
      }

      return {
        success: true,
        data: updatedRole
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: 'Failed to update role',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Delete role
   */
  async deleteRole(
    roleId: string,
    deletedBy: string
  ): Promise<UserOperationResult<void>> {
    try {
      const role = await this.getRole(roleId);
      if (!role) {
        return {
          success: false,
          error: {
            type: UserErrorType.NOT_FOUND,
            message: 'Role not found',
            timestamp: new Date()
          }
        };
      }

      // Check if role is in use
      const assignments = await this.getRoleAssignments(roleId);
      if (assignments.length > 0) {
        return {
          success: false,
          error: {
            type: UserErrorType.VALIDATION_ERROR,
            message: 'Cannot delete role that is currently assigned to users',
            timestamp: new Date()
          }
        };
      }

      // Delete from Firestore
      await deleteDoc(doc(firestore, 'customRoles', roleId));

      // Remove from cache
      if (this.config.enableCaching) {
        this.roleCache.delete(roleId);
      }

      // Log activity
      if (this.config.enableAuditLogging) {
        await this.logRoleActivity(
          roleId,
          deletedBy,
          UserActivityType.ROLE_CHANGE,
          'role_deleted',
          {
            roleName: role.name,
            teamId: role.teamId
          }
        );
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: 'Failed to delete role',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Get all roles for a team
   */
  async getTeamRoles(teamId: string): Promise<CustomRole[]> {
    try {
      const q = query(
        collection(firestore, 'customRoles'),
        where('teamId', '==', teamId),
        where('isActive', '==', true),
        orderBy('priority', 'desc'),
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(q);
      const roles: CustomRole[] = [];

      snapshot.forEach(doc => {
        const role = this.fromFirestore(doc.id, doc.data() as FirestoreCustomRole);
        roles.push(role);

        // Update cache
        if (this.config.enableCaching) {
          this.roleCache.set(role.id, role);
        }
      });

      return roles;

    } catch (error) {
      console.error('Error getting team roles:', error);
      return [];
    }
  }

  /**
   * Search roles
   */
  async searchRoles(
    options: RoleSearchOptions,
    pagination?: UserPaginationParams
  ): Promise<UserApiResponse<CustomRole[]>> {
    try {
      let q = query(collection(firestore, 'customRoles'));

      // Apply filters
      if (options.teamId) {
        q = query(q, where('teamId', '==', options.teamId));
      }
      if (options.organizationId) {
        q = query(q, where('organizationId', '==', options.organizationId));
      }
      if (options.isSystemRole !== undefined) {
        q = query(q, where('isSystemRole', '==', options.isSystemRole));
      }
      if (options.isActive !== undefined) {
        q = query(q, where('isActive', '==', options.isActive));
      }

      // Apply sorting
      const sortField = options.sortBy || 'priority';
      const sortDirection = options.sortOrder || 'desc';
      q = query(q, orderBy(sortField, sortDirection));

      // Apply pagination
      if (pagination?.limit) {
        q = query(q, limit(pagination.limit));
      }

      const snapshot = await getDocs(q);
      const roles: CustomRole[] = [];

      snapshot.forEach(doc => {
        const role = this.fromFirestore(doc.id, doc.data() as FirestoreCustomRole);
        
        // Apply additional filters that can't be done in Firestore
        if (this.matchesSearchCriteria(role, options)) {
          roles.push(role);
        }
      });

      return {
        success: true,
        data: roles,
        metadata: {
          timestamp: new Date(),
          requestId: `search_${Date.now()}`,
          version: '1.0',
          pagination: {
            page: pagination?.page || 1,
            limit: pagination?.limit || 50,
            total: roles.length,
            hasNext: false,
            hasPrevious: false
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: 'Failed to search roles',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    teamId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: Date
  ): Promise<UserOperationResult<RoleAssignment>> {
    try {
      // Validate role exists
      const role = await this.getRole(roleId);
      if (!role) {
        return {
          success: false,
          error: {
            type: UserErrorType.NOT_FOUND,
            message: 'Role not found',
            timestamp: new Date()
          }
        };
      }

      // Check if user already has this role
      const existingAssignments = await this.getUserRoleAssignments(userId, teamId);
      const hasRole = existingAssignments.some(a => a.roleId === roleId && a.isActive);
      if (hasRole) {
        return {
          success: false,
          error: {
            type: UserErrorType.ALREADY_EXISTS,
            message: 'User already has this role',
            timestamp: new Date()
          }
        };
      }

      const assignmentId = doc(collection(firestore, 'roleAssignments')).id;
      const assignment: RoleAssignment = {
        id: assignmentId,
        userId,
        teamId,
        organizationId: role.organizationId,
        roleId,
        roleName: role.name,
        roleType: role.isSystemRole ? 'system' : 'custom',
        assignedBy,
        assignedAt: new Date(),
        expiresAt,
        isActive: true
      };

      // Save assignment
      await setDoc(doc(firestore, 'roleAssignments', assignmentId), {
        ...assignment,
        assignedAt: serverTimestamp(),
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null
      });

      // Clear assignment cache for user
      this.assignmentCache.delete(`${userId}:${teamId}`);

      // Log activity
      if (this.config.enableAuditLogging) {
        await this.logRoleActivity(
          roleId,
          assignedBy,
          UserActivityType.ROLE_CHANGE,
          'role_assigned',
          {
            userId,
            roleName: role.name,
            teamId
          }
        );
      }

      return {
        success: true,
        data: assignment
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: 'Failed to assign role',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRole(
    userId: string,
    teamId: string,
    roleId: string,
    revokedBy: string
  ): Promise<UserOperationResult<void>> {
    try {
      const assignments = await this.getUserRoleAssignments(userId, teamId);
      const assignment = assignments.find(a => a.roleId === roleId && a.isActive);

      if (!assignment) {
        return {
          success: false,
          error: {
            type: UserErrorType.NOT_FOUND,
            message: 'Role assignment not found',
            timestamp: new Date()
          }
        };
      }

      // Deactivate assignment
      await updateDoc(doc(firestore, 'roleAssignments', assignment.id), {
        isActive: false,
        revokedBy,
        revokedAt: serverTimestamp()
      });

      // Clear cache
      this.assignmentCache.delete(`${userId}:${teamId}`);

      // Log activity
      if (this.config.enableAuditLogging) {
        await this.logRoleActivity(
          roleId,
          revokedBy,
          UserActivityType.ROLE_CHANGE,
          'role_revoked',
          {
            userId,
            roleName: assignment.roleName,
            teamId
          }
        );
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: 'Failed to revoke role',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Get user's role assignments for a team
   */
  async getUserRoleAssignments(userId: string, teamId: string): Promise<RoleAssignment[]> {
    try {
      const cacheKey = `${userId}:${teamId}`;
      
      // Check cache first
      if (this.config.enableCaching && this.assignmentCache.has(cacheKey)) {
        return this.assignmentCache.get(cacheKey)!;
      }

      const q = query(
        collection(firestore, 'roleAssignments'),
        where('userId', '==', userId),
        where('teamId', '==', teamId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      const assignments: RoleAssignment[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        assignments.push({
          id: doc.id,
          userId: data.userId,
          teamId: data.teamId,
          organizationId: data.organizationId,
          roleId: data.roleId,
          roleName: data.roleName,
          roleType: data.roleType,
          assignedBy: data.assignedBy,
          assignedAt: data.assignedAt.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          isActive: data.isActive,
          metadata: data.metadata
        });
      });

      // Update cache
      if (this.config.enableCaching) {
        this.assignmentCache.set(cacheKey, assignments);
      }

      return assignments;

    } catch (error) {
      console.error('Error getting user role assignments:', error);
      return [];
    }
  }

  /**
   * Get role assignments for a specific role
   */
  async getRoleAssignments(roleId: string): Promise<RoleAssignment[]> {
    try {
      const q = query(
        collection(firestore, 'roleAssignments'),
        where('roleId', '==', roleId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      const assignments: RoleAssignment[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        assignments.push({
          id: doc.id,
          userId: data.userId,
          teamId: data.teamId,
          organizationId: data.organizationId,
          roleId: data.roleId,
          roleName: data.roleName,
          roleType: data.roleType,
          assignedBy: data.assignedBy,
          assignedAt: data.assignedAt.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          isActive: data.isActive,
          metadata: data.metadata
        });
      });

      return assignments;

    } catch (error) {
      console.error('Error getting role assignments:', error);
      return [];
    }
  }

  /**
   * Get effective permissions for user in team
   */
  async getUserEffectivePermissions(userId: string, teamId: string): Promise<string[]> {
    try {
      const assignments = await this.getUserRoleAssignments(userId, teamId);
      const permissions = new Set<string>();

      // Get permissions from all assigned roles
      for (const assignment of assignments) {
        const role = await this.getRole(assignment.roleId);
        if (role && role.isActive) {
          role.permissions.forEach(permission => permissions.add(permission));
        }
      }

      return Array.from(permissions);

    } catch (error) {
      console.error('Error getting user effective permissions:', error);
      return [];
    }
  }

  /**
   * Check if user has specific permission in team
   */
  async userHasPermission(
    userId: string,
    teamId: string,
    permission: string
  ): Promise<boolean> {
    try {
      const permissions = await this.getUserEffectivePermissions(userId, teamId);
      return permissions.includes(permission);
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }

  /**
   * Get role by name in team
   */
  private async getRoleByName(teamId: string, name: string): Promise<CustomRole | null> {
    try {
      const q = query(
        collection(firestore, 'customRoles'),
        where('teamId', '==', teamId),
        where('name', '==', name),
        where('isActive', '==', true),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return this.fromFirestore(doc.id, doc.data() as FirestoreCustomRole);

    } catch (error) {
      console.error('Error getting role by name:', error);
      return null;
    }
  }

  /**
   * Validate role data
   */
  private validateRoleData(roleData: Partial<RoleCreateData>): UserOperationResult<void> {
    const errors: string[] = [];

    if (!roleData.name?.trim()) {
      errors.push('Role name is required');
    } else if (roleData.name.length < 2) {
      errors.push('Role name must be at least 2 characters');
    } else if (roleData.name.length > 50) {
      errors.push('Role name must be less than 50 characters');
    }

    if (!roleData.permissions || roleData.permissions.length === 0) {
      errors.push('At least one permission is required');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: {
          type: UserErrorType.VALIDATION_ERROR,
          message: errors.join(', '),
          timestamp: new Date()
        }
      };
    }

    return { success: true };
  }

  /**
   * Check if role matches search criteria
   */
  private matchesSearchCriteria(role: CustomRole, options: RoleSearchOptions): boolean {
    if (options.category && role.metadata.category !== options.category) {
      return false;
    }

    if (options.permissions && options.permissions.length > 0) {
      const hasAllPermissions = options.permissions.every(permission =>
        role.permissions.includes(permission)
      );
      if (!hasAllPermissions) {
        return false;
      }
    }

    return true;
  }

  /**
   * Convert to Firestore format
   */
  private toFirestore(role: CustomRole): FirestoreCustomRole {
    return {
      name: role.name,
      description: role.description,
      teamId: role.teamId,
      organizationId: role.organizationId,
      permissions: role.permissions,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      priority: role.priority,
      metadata: role.metadata,
      createdAt: Timestamp.fromDate(role.createdAt),
      updatedAt: Timestamp.fromDate(role.updatedAt)
    };
  }

  /**
   * Convert from Firestore format
   */
  private fromFirestore(id: string, data: FirestoreCustomRole): CustomRole {
    return {
      id,
      name: data.name,
      description: data.description,
      teamId: data.teamId,
      organizationId: data.organizationId,
      permissions: data.permissions,
      isSystemRole: data.isSystemRole,
      isActive: data.isActive,
      priority: data.priority,
      metadata: data.metadata,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate()
    };
  }

  /**
   * Log role-related activity
   */
  private async logRoleActivity(
    roleId: string,
    userId: string,
    type: UserActivityType,
    action: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const activity = ActivityUtils.createActivity(
        userId,
        type,
        action,
        {
          resource: 'role',
          resourceId: roleId,
          context: ActivityContext.WEB,
          metadata: {
            success: true,
            // Only include valid metadata fields
            ...(metadata.roleName && { newValues: { roleName: metadata.roleName } }),
            ...(metadata.teamId && { previousValues: { teamId: metadata.teamId } }),
            ...(metadata.permissions && { newValues: { ...metadata.newValues, permissions: metadata.permissions } })
          }
        }
      );

      // Save activity to Firestore
      const activitiesRef = collection(firestore, 'userActivities');
      await setDoc(doc(activitiesRef), {
        userId,
        type,
        action,
        resource: 'role',
        resourceId: roleId,
        context: ActivityContext.WEB,
        timestamp: serverTimestamp(),
        metadata: {
          success: true,
          ...metadata
        }
      });

    } catch (error) {
      console.error('Error logging role activity:', error);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.roleCache.clear();
    this.assignmentCache.clear();
  }

  /**
   * Destroy manager instance
   */
  destroy(): void {
    this.clearCache();
    RoleManager.instance = null as any;
  }
} 
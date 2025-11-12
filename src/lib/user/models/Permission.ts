import { Timestamp } from 'firebase/firestore';
import {
  PermissionScope,
  UserPermissionData,
  UserError,
  UserErrorType,
  UserOperationResult
} from '../types';
import { UserRole } from '../../models/User';
import { SubscriptionTier } from '../../subscription/models/subscription';

/**
 * Permission interface for comprehensive access control
 */
export interface Permission {
  id: string;
  name: string;
  description: string;
  scope: PermissionScope;
  resource?: string;
  action: string;
  conditions?: PermissionCondition[];
  metadata: {
    category: string;
    priority: number;
    isSystemPermission: boolean;
    requiresSubscription?: SubscriptionTier;
    deprecatedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission condition for dynamic access control
 */
export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  description?: string;
}

/**
 * Role permission assignment
 */
export interface RolePermission {
  roleId: string;
  permissionId: string;
  granted: boolean;
  conditions?: PermissionCondition[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

/**
 * User permission assignment (overrides role permissions)
 */
export interface UserPermission {
  userId: string;
  permissionId: string;
  granted: boolean;
  conditions?: PermissionCondition[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  reason?: string;
}

/**
 * Permission check context
 */
export interface PermissionContext {
  userId: string;
  resource?: string;
  resourceId?: string;
  organizationId?: string;
  teamId?: string;
  metadata?: Record<string, any>;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason: string;
  source: 'role' | 'user' | 'system' | 'subscription';
  conditions?: PermissionCondition[];
  expiresAt?: Date;
}

/**
 * Firestore representation of Permission
 */
export interface FirestorePermission {
  id: string;
  name: string;
  description: string;
  scope: PermissionScope;
  resource?: string;
  action: string;
  conditions?: PermissionCondition[];
  metadata: {
    category: string;
    priority: number;
    isSystemPermission: boolean;
    requiresSubscription?: SubscriptionTier;
    deprecatedAt?: Timestamp | null;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Permission utility class
 */
export class PermissionUtils {
  /**
   * Convert Firestore permission to Permission interface
   */
  static fromFirestore(data: FirestorePermission): Permission {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      scope: data.scope,
      resource: data.resource,
      action: data.action,
      conditions: data.conditions,
      metadata: {
        ...data.metadata,
        deprecatedAt: data.metadata.deprecatedAt?.toDate() || undefined
      },
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate()
    };
  }

  /**
   * Convert Permission to Firestore format
   */
  static toFirestore(permission: Permission): FirestorePermission {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      scope: permission.scope,
      resource: permission.resource,
      action: permission.action,
      conditions: permission.conditions,
      metadata: {
        ...permission.metadata,
        deprecatedAt: permission.metadata.deprecatedAt ? 
          Timestamp.fromDate(permission.metadata.deprecatedAt) : null
      },
      createdAt: Timestamp.fromDate(permission.createdAt),
      updatedAt: Timestamp.fromDate(permission.updatedAt)
    };
  }

  /**
   * Validate permission data
   */
  static validatePermission(permission: Partial<Permission>): UserOperationResult<Permission> {
    const errors: UserError[] = [];

    if (!permission.name?.trim()) {
      errors.push({
        type: UserErrorType.VALIDATION_ERROR,
        message: 'Permission name is required',
        timestamp: new Date()
      });
    }

    if (!permission.action?.trim()) {
      errors.push({
        type: UserErrorType.VALIDATION_ERROR,
        message: 'Permission action is required',
        timestamp: new Date()
      });
    }

    if (!permission.scope) {
      errors.push({
        type: UserErrorType.VALIDATION_ERROR,
        message: 'Permission scope is required',
        timestamp: new Date()
      });
    }

    if (permission.conditions) {
      const conditionErrors = this.validateConditions(permission.conditions);
      errors.push(...conditionErrors);
    }

    if (errors.length > 0) {
      return { 
        success: false, 
        error: errors[0], // Return the first error as the main error
        warnings: errors.slice(1).map(e => e.message) // Additional errors as warnings
      };
    }

    return { success: true, data: permission as Permission };
  }

  /**
   * Validate permission conditions
   */
  static validateConditions(conditions: PermissionCondition[]): UserError[] {
    const errors: UserError[] = [];

    conditions.forEach((condition, index) => {
      if (!condition.field?.trim()) {
        errors.push({
          type: UserErrorType.VALIDATION_ERROR,
          message: `Condition ${index + 1}: field is required`,
          timestamp: new Date()
        });
      }

      if (!condition.operator) {
        errors.push({
          type: UserErrorType.VALIDATION_ERROR,
          message: `Condition ${index + 1}: operator is required`,
          timestamp: new Date()
        });
      }

      if (condition.value === undefined || condition.value === null) {
        errors.push({
          type: UserErrorType.VALIDATION_ERROR,
          message: `Condition ${index + 1}: value is required`,
          timestamp: new Date()
        });
      }
    });

    return errors;
  }

  /**
   * Check if permission is expired
   */
  static isExpired(permission: UserPermission | RolePermission): boolean {
    return permission.expiresAt ? new Date() > permission.expiresAt : false;
  }

  /**
   * Check if permission matches context
   */
  static matchesContext(
    permission: Permission,
    context: PermissionContext,
    conditions?: PermissionCondition[]
  ): boolean {
    // Check resource match
    if (permission.resource && context.resource && permission.resource !== context.resource) {
      return false;
    }

    // Check scope match
    if (permission.scope === PermissionScope.ORGANIZATION && !context.organizationId) {
      return false;
    }

    if (permission.scope === PermissionScope.TEAM && !context.teamId) {
      return false;
    }

    // Check conditions
    if (conditions && conditions.length > 0) {
      return this.evaluateConditions(conditions, context);
    }

    return true;
  }

  /**
   * Evaluate permission conditions
   */
  static evaluateConditions(
    conditions: PermissionCondition[],
    context: PermissionContext
  ): boolean {
    return conditions.every(condition => {
      const contextValue = this.getContextValue(condition.field, context);
      return this.evaluateCondition(condition, contextValue);
    });
  }

  /**
   * Get value from context by field path
   */
  private static getContextValue(field: string, context: PermissionContext): any {
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Evaluate single condition
   */
  private static evaluateCondition(condition: PermissionCondition, contextValue: any): boolean {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return contextValue === value;
      case 'not_equals':
        return contextValue !== value;
      case 'contains':
        return Array.isArray(contextValue) ? contextValue.includes(value) : 
               typeof contextValue === 'string' ? contextValue.includes(value) : false;
      case 'not_contains':
        return Array.isArray(contextValue) ? !contextValue.includes(value) : 
               typeof contextValue === 'string' ? !contextValue.includes(value) : true;
      case 'greater_than':
        return typeof contextValue === 'number' && typeof value === 'number' && contextValue > value;
      case 'less_than':
        return typeof contextValue === 'number' && typeof value === 'number' && contextValue < value;
      case 'in':
        return Array.isArray(value) && value.includes(contextValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(contextValue);
      default:
        return false;
    }
  }

  /**
   * Generate permission key for caching
   */
  static generatePermissionKey(
    userId: string,
    action: string,
    resource?: string,
    resourceId?: string
  ): string {
    const parts = [userId, action];
    if (resource) parts.push(resource);
    if (resourceId) parts.push(resourceId);
    return parts.join(':');
  }

  /**
   * Get default permissions for role
   */
  static getDefaultPermissionsForRole(role: UserRole): string[] {
    const basePermissions = [
      'user:read:own',
      'user:update:own',
      'content:read:own',
      'content:create',
      'content:update:own',
      'content:delete:own'
    ];

    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: [
        ...basePermissions,
        'admin:*',
        'user:*',
        'organization:*',
        'team:*',
        'content:*',
        'analytics:*',
        'billing:*'
      ],
      [UserRole.ADMIN]: [
        ...basePermissions,
        'user:read:organization',
        'user:update:organization',
        'user:invite',
        'organization:read',
        'organization:update',
        'team:*',
        'content:read:organization',
        'content:update:organization',
        'content:delete:organization',
        'analytics:read:organization',
        'billing:read'
      ],
      [UserRole.USER]: basePermissions
    };

    return rolePermissions[role] || basePermissions;
  }

  /**
   * Check if permission requires subscription tier
   */
  static requiresSubscriptionTier(
    permission: Permission,
    userTier: SubscriptionTier
  ): boolean {
    if (!permission.metadata.requiresSubscription) {
      return true;
    }

    const tierHierarchy: Record<SubscriptionTier, number> = {
      [SubscriptionTier.CREATOR]: 1,
      [SubscriptionTier.INFLUENCER]: 2,
      [SubscriptionTier.ENTERPRISE]: 3
    };

    const requiredLevel = tierHierarchy[permission.metadata.requiresSubscription];
    const userLevel = tierHierarchy[userTier];

    return userLevel >= requiredLevel;
  }

  /**
   * Merge permission results (user permissions override role permissions)
   */
  static mergePermissionResults(
    roleResult: PermissionCheckResult | null,
    userResult: PermissionCheckResult | null
  ): PermissionCheckResult {
    // User permission overrides role permission
    if (userResult) {
      return userResult;
    }

    // Fall back to role permission
    if (roleResult) {
      return roleResult;
    }

    // Default deny
    return {
      granted: false,
      reason: 'No matching permissions found',
      source: 'system'
    };
  }

  /**
   * Format permission for display
   */
  static formatPermissionDisplay(permission: Permission): string {
    const parts: string[] = [permission.scope];
    if (permission.resource) parts.push(permission.resource);
    parts.push(permission.action);
    return parts.join(':');
  }

  /**
   * Get permission category color
   */
  static getPermissionCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'user': '#3B82F6',
      'content': '#10B981',
      'analytics': '#8B5CF6',
      'billing': '#F59E0B',
      'admin': '#EF4444',
      'team': '#06B6D4',
      'organization': '#84CC16'
    };

    return colors[category.toLowerCase()] || '#6B7280';
  }
} 
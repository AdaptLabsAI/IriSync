import { v4 as uuidv4 } from 'uuid';

/**
 * Permission definition for a specific resource
 */
export interface Permission {
  resource: string;
  actions: string[];
}

/**
 * Role definition with permissions
 */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  parentRoles?: string[];
  isCustom: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Organization tier types
 */
export type SubscriptionTier = 'creator' | 'influencer' | 'enterprise';

/**
 * Role availability by subscription tier
 * Creator tier supports 3 seats, so they need multiple role types
 */
export const roleAvailability: Record<string, SubscriptionTier[]> = {
  'owner': ['creator', 'influencer', 'enterprise'],
  'org_admin': ['influencer', 'enterprise'],           // Only higher tiers get org admin
  'content-manager': ['creator', 'influencer', 'enterprise'],  // Creator tier needs content roles
  'content-creator': ['creator', 'influencer', 'enterprise'],  // Creator tier needs content roles  
  'analyst': ['creator', 'influencer', 'enterprise'],          // Creator tier needs analyst role
  'viewer': ['enterprise']                             // Only enterprise gets dedicated viewers
};

/**
 * System-defined roles
 */
export const systemRoles: Record<string, Role> = {
  'owner': {
    id: 'role_owner',
    name: 'Owner',
    description: 'Full access to all resources and settings',
    permissions: [
      { resource: '*', actions: ['*'] }
    ],
    isCustom: false,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'super_admin': {
    id: 'role_super_admin',
    name: 'Super Admin',
    description: 'IriSync manager with full platform and organization access',
    permissions: [
      { resource: '*', actions: ['*'] },
      { resource: 'platform-settings', actions: ['read', 'update'] },
      { resource: 'admin-management', actions: ['create', 'delete', 'update', 'read'] },
      { resource: 'user-management', actions: ['*'] },
      { resource: 'org-settings', actions: ['*'] },
      { resource: 'content-management', actions: ['*'] },
      { resource: 'analytics', actions: ['*'] },
      { resource: 'social-accounts', actions: ['*'] }
    ],
    isCustom: false,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'admin': {
    id: 'role_admin',
    name: 'Administrator',
    description: 'IriSync employee with global organization access (not platform admin management)',
    permissions: [
      { resource: 'platform-settings', actions: ['read', 'update'] },
      { resource: 'user-management', actions: ['*'] },
      { resource: 'org-settings', actions: ['*'] },
      { resource: 'content-management', actions: ['*'] },
      { resource: 'analytics', actions: ['*'] },
      { resource: 'social-accounts', actions: ['*'] }
      // No admin-management
    ],
    isCustom: false,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'content-manager': {
    id: 'role_content_manager',
    name: 'Content Manager',
    description: 'Manage and approve content',
    permissions: [
      { resource: 'content', actions: ['read', 'create', 'update', 'delete', 'publish', 'approve'] },
      { resource: 'users', actions: ['read'] },
      { resource: 'analytics', actions: ['read'] },
      { resource: 'social-accounts', actions: ['read'] }
    ],
    isCustom: false,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'content-creator': {
    id: 'role_content_creator',
    name: 'Content Creator',
    description: 'Create and update content',
    permissions: [
      { resource: 'content', actions: ['read', 'create', 'update'] },
      { resource: 'analytics', actions: ['read'] },
      { resource: 'social-accounts', actions: ['read'] }
    ],
    parentRoles: [],
    isCustom: false,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'analyst': {
    id: 'role_analyst',
    name: 'Analyst',
    description: 'View and analyze reports and content performance',
    permissions: [
      { resource: 'analytics', actions: ['read', 'export'] },
      { resource: 'content', actions: ['read'] },
      { resource: 'social-accounts', actions: ['read'] }
    ],
    isCustom: false,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'viewer': {
    id: 'role_viewer',
    name: 'Viewer',
    description: 'View-only access to content',
    permissions: [
      { resource: 'content', actions: ['read'] }
    ],
    isCustom: false,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'org_admin': {
    id: 'role_org_admin',
    name: 'Organization Admin',
    description: 'Administers a single organization, manages users and content within their org',
    permissions: [
      { resource: 'user-management', actions: ['read', 'create', 'update', 'delete'] },
      { resource: 'org-settings', actions: ['read', 'update'] },
      { resource: 'content-management', actions: ['read', 'create', 'update', 'delete', 'publish', 'approve'] },
      { resource: 'analytics', actions: ['read'] },
      { resource: 'social-accounts', actions: ['read', 'create', 'update', 'delete'] }
      // No platform-settings, no admin-management
    ],
    isCustom: false,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

/**
 * Create a new custom role
 * @param name Role name
 * @param description Role description
 * @param permissions Role permissions
 * @param parentRoles Parent role IDs for inheritance
 * @returns New role object
 */
export function createRole(
  name: string,
  description: string,
  permissions: Permission[],
  parentRoles?: string[]
): Role {
  return {
    id: `role_custom_${uuidv4()}`,
    name,
    description,
    permissions,
    parentRoles,
    isCustom: true,
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Check if a role is available for a subscription tier
 * @param roleId Role ID
 * @param tier Subscription tier
 * @returns True if the role is available for the tier
 */
export function isRoleAvailableForTier(roleId: string, tier: SubscriptionTier): boolean {
  // Extract role name from ID (remove 'role_' prefix)
  const roleName = roleId.replace('role_', '').replace('custom_', '');
  
  // Custom roles are only available for influencer and enterprise tiers
  if (roleId.includes('custom_')) {
    return tier === 'influencer' || tier === 'enterprise';
  }
  
  // Check system role availability
  const tiers = roleAvailability[roleName];
  return !!tiers && tiers.includes(tier);
}

/**
 * Combine permissions from a role and its parent roles
 * @param role Role to calculate effective permissions for
 * @param allRoles All available roles for lookup
 * @returns Combined permissions
 */
export function getEffectivePermissions(role: Role, allRoles: Record<string, Role>): Permission[] {
  // Start with the role's own permissions
  const effectivePermissions = [...role.permissions];
  
  // If there are no parent roles, return the current permissions
  if (!role.parentRoles || role.parentRoles.length === 0) {
    return effectivePermissions;
  }
  
  // Process parent roles recursively
  const processedRoleIds = new Set<string>([role.id]);
  
  function processParentRoles(parentRoleIds: string[]) {
    for (const parentRoleId of parentRoleIds) {
      // Skip if already processed (avoid circular references)
      if (processedRoleIds.has(parentRoleId)) continue;
      
      // Mark as processed
      processedRoleIds.add(parentRoleId);
      
      // Get parent role
      const parentRole = allRoles[parentRoleId];
      if (!parentRole) continue;
      
      // Add parent permissions
      for (const parentPermission of parentRole.permissions) {
        // Check if we already have a permission for this resource
        const existingPermIndex = effectivePermissions.findIndex(
          p => p.resource === parentPermission.resource
        );
        
        if (existingPermIndex >= 0) {
          // Merge actions for the same resource
          const existingPerm = effectivePermissions[existingPermIndex];
          const combinedActions = Array.from(new Set([...existingPerm.actions, ...parentPermission.actions]));
          effectivePermissions[existingPermIndex] = {
            ...existingPerm,
            actions: combinedActions
          };
        } else {
          // Add new permission
          effectivePermissions.push({ ...parentPermission });
        }
      }
      
      // Process further parent roles if any
      if (parentRole.parentRoles && parentRole.parentRoles.length > 0) {
        processParentRoles(parentRole.parentRoles);
      }
    }
  }
  
  // Start processing parent roles
  processParentRoles(role.parentRoles);
  
  return effectivePermissions;
}

/**
 * Centralized permission check utility for RBAC
 * @param userOrRole - User object with role, or Role object
 * @param resource - Resource string (e.g., 'platform-settings')
 * @param action - Action string (e.g., 'read', 'update', '*')
 * @param allRoles - Optional: all roles map for parent role resolution
 * @returns boolean
 */
export function hasPermission(
  userOrRole: { role: string; permissions?: Permission[] },
  resource: string,
  action: string,
  allRoles: Record<string, Role> = systemRoles
): boolean {
  let permissions: Permission[] = [];

  // Accept either a user object or a role object
  if ('permissions' in userOrRole && userOrRole.permissions) {
    permissions = userOrRole.permissions;
  } else if ('role' in userOrRole && userOrRole.role) {
    // Try multiple lookup strategies for the role
    const userRole = userOrRole.role;
    let role: Role | undefined;
    
    // Strategy 1: Direct lookup
    role = allRoles[userRole];
    
    // Strategy 2: Remove 'role_' prefix if present
    if (!role && userRole.startsWith('role_')) {
      role = allRoles[userRole.replace('role_', '')];
    }
    
    // Strategy 3: Add 'role_' prefix if not present
    if (!role && !userRole.startsWith('role_')) {
      role = allRoles[`role_${userRole}`];
    }
    
    // Strategy 4: Handle specific known roles
    if (!role) {
      switch (userRole) {
        case 'super_admin':
        case 'role_super_admin':
          role = allRoles['super_admin'];
          break;
        case 'admin':
        case 'role_admin':
          role = allRoles['admin'];
          break;
        case 'owner':
        case 'role_owner':
          role = allRoles['owner'];
          break;
      }
    }
    
    if (role) {
      permissions = getEffectivePermissions(role, allRoles);
    } else {
      console.warn(`Role not found: ${userRole}. Available roles:`, Object.keys(allRoles));
      return false;
    }
  }

  // Check for wildcard permission
  if (permissions.some(p => (p.resource === '*' || p.resource === resource) && (p.actions.includes('*') || p.actions.includes(action)))) {
    return true;
  }

  // No permission found
  return false;
} 
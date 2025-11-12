import { v4 as uuidv4 } from 'uuid';
import { Role, Permission, systemRoles, getEffectivePermissions, isRoleAvailableForTier, SubscriptionTier } from './role';
import { logger } from '../logging/logger';
import { getSubscriptionTier } from '../subscription/utils';
import { db } from '../database/firestore';

/**
 * User role assignment
 */
export interface UserRole {
  userId: string;
  organizationId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
}

/**
 * Role service for managing organization roles
 */
export class RoleService {
  /**
   * Get all roles available for an organization
   * @param organizationId Organization ID
   * @returns Available roles for the organization
   */
  async getOrganizationRoles(organizationId: string): Promise<Role[]> {
    try {
      // Get organization's subscription tier
      const tier = await getSubscriptionTier(organizationId);
      
      // Get custom roles defined for this organization
      const customRoles = await this.getCustomRoles(organizationId);
      
      // Filter system roles based on subscription tier
      const availableSystemRoles = Object.values(systemRoles).filter(role => 
        isRoleAvailableForTier(role.id, tier as SubscriptionTier)
      );
      
      // Return combined roles
      return [...availableSystemRoles, ...customRoles];
    } catch (error) {
      logger.error(`Error getting organization roles: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Get custom roles for an organization
   * @param organizationId Organization ID
   * @returns Custom roles for the organization
   */
  async getCustomRoles(organizationId: string): Promise<Role[]> {
    try {
      const rolesSnapshot = await db.collection('organizations')
        .doc(organizationId)
        .collection('roles')
        .where('isCustom', '==', true)
        .get();
      
      if (rolesSnapshot.empty) {
        return [];
      }
      
      return rolesSnapshot.docs.map(doc => doc.data() as Role);
    } catch (error) {
      logger.error(`Error getting custom roles: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Create a custom role for an organization
   * @param organizationId Organization ID
   * @param name Role name
   * @param description Role description
   * @param permissions Role permissions
   * @param parentRoles Parent role IDs
   * @returns Created role
   */
  async createCustomRole(
    organizationId: string,
    name: string,
    description: string,
    permissions: Permission[],
    createdBy: string,
    parentRoles?: string[]
  ): Promise<Role> {
    try {
      // Check organization tier
      const tier = await getSubscriptionTier(organizationId);
      
      // Only influencer and enterprise tiers can create custom roles
      if (tier !== 'influencer' && tier !== 'enterprise') {
        throw new Error('Custom roles are only available for Influencer and Enterprise tiers');
      }
      
      // Create new role
      const role: Role = {
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
      
      // Save to database
      await db.collection('organizations')
        .doc(organizationId)
        .collection('roles')
        .doc(role.id)
        .set(role);
      
      // Log the creation
      logger.info(`Custom role created: ${role.id} by user ${createdBy} for org ${organizationId}`);
      
      return role;
    } catch (error) {
      logger.error(`Error creating custom role: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Update a custom role
   * @param organizationId Organization ID
   * @param roleId Role ID
   * @param updates Role updates
   * @returns Updated role
   */
  async updateCustomRole(
    organizationId: string,
    roleId: string,
    updates: Partial<Role>,
    updatedBy: string
  ): Promise<Role> {
    try {
      // Verify the role exists and is custom
      const roleRef = db.collection('organizations')
        .doc(organizationId)
        .collection('roles')
        .doc(roleId);
      
      const roleDoc = await roleRef.get();
      
      if (!roleDoc.exists) {
        throw new Error(`Role ${roleId} not found`);
      }
      
      const role = roleDoc.data() as Role;
      
      if (!role.isCustom) {
        throw new Error('System roles cannot be modified');
      }
      
      // Prepare updates
      const allowedFields: (keyof Role)[] = ['name', 'description', 'permissions', 'parentRoles'];
      const validUpdates: Partial<Role> = {};
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          validUpdates[field] = updates[field];
        }
      }
      
      validUpdates.updatedAt = new Date();
      
      // Apply updates
      await roleRef.update(validUpdates);
      
      // Get updated role
      const updatedRoleDoc = await roleRef.get();
      const updatedRole = updatedRoleDoc.data() as Role;
      
      // Log the update
      logger.info(`Custom role updated: ${roleId} by user ${updatedBy} for org ${organizationId}`);
      
      return updatedRole;
    } catch (error) {
      logger.error(`Error updating custom role: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Delete a custom role
   * @param organizationId Organization ID
   * @param roleId Role ID
   * @param deletedBy User ID who deleted the role
   * @returns True if successful
   */
  async deleteCustomRole(
    organizationId: string,
    roleId: string,
    deletedBy: string
  ): Promise<boolean> {
    try {
      // Verify the role exists and is custom
      const roleRef = db.collection('organizations')
        .doc(organizationId)
        .collection('roles')
        .doc(roleId);
      
      const roleDoc = await roleRef.get();
      
      if (!roleDoc.exists) {
        throw new Error(`Role ${roleId} not found`);
      }
      
      const role = roleDoc.data() as Role;
      
      if (!role.isCustom) {
        throw new Error('System roles cannot be deleted');
      }
      
      // Check if role is in use
      const usersWithRole = await db.collection('organizations')
        .doc(organizationId)
        .collection('userRoles')
        .where('roleId', '==', roleId)
        .limit(1)
        .get();
      
      if (!usersWithRole.empty) {
        throw new Error('Cannot delete role that is assigned to users');
      }
      
      // Delete the role
      await roleRef.delete();
      
      // Log the deletion
      logger.info(`Custom role deleted: ${roleId} by user ${deletedBy} for org ${organizationId}`);
      
      return true;
    } catch (error) {
      logger.error(`Error deleting custom role: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Assign a role to a user
   * @param organizationId Organization ID
   * @param userId User ID
   * @param roleId Role ID
   * @param assignedBy User ID who assigned the role
   * @returns UserRole assignment
   */
  async assignRoleToUser(
    organizationId: string,
    userId: string,
    roleId: string,
    assignedBy: string
  ): Promise<UserRole> {
    try {
      // Verify the role exists and is available for the organization
      const availableRoles = await this.getOrganizationRoles(organizationId);
      const role = availableRoles.find(r => r.id === roleId);
      
      if (!role) {
        throw new Error(`Role ${roleId} not found or not available for this organization`);
      }
      
      // Verify the user belongs to the organization
      const userOrg = await db.collection('users')
        .doc(userId)
        .get()
        .then(doc => doc.data()?.organizationId);
      
      if (userOrg !== organizationId) {
        throw new Error(`User ${userId} does not belong to organization ${organizationId}`);
      }
      
      // Create role assignment
      const userRole: UserRole = {
        userId,
        organizationId,
        roleId,
        assignedAt: new Date(),
        assignedBy
      };
      
      // Save to database
      await db.collection('organizations')
        .doc(organizationId)
        .collection('userRoles')
        .doc(userId)
        .set(userRole);
      
      // Log the assignment
      logger.info(`Role assigned: ${roleId} to user ${userId} by ${assignedBy} in org ${organizationId}`);
      
      return userRole;
    } catch (error) {
      logger.error(`Error assigning role: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Get a user's role
   * @param organizationId Organization ID
   * @param userId User ID
   * @returns User's role or null if not assigned
   */
  async getUserRole(
    organizationId: string,
    userId: string
  ): Promise<Role | null> {
    try {
      // Get user's role assignment
      const userRoleDoc = await db.collection('organizations')
        .doc(organizationId)
        .collection('userRoles')
        .doc(userId)
        .get();
      
      if (!userRoleDoc.exists) {
        return null;
      }
      
      const userRole = userRoleDoc.data() as UserRole;
      
      // Get the role
      const availableRoles = await this.getOrganizationRoles(organizationId);
      const role = availableRoles.find(r => r.id === userRole.roleId);
      
      return role || null;
    } catch (error) {
      logger.error(`Error getting user role: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Get effective permissions for a user
   * @param organizationId Organization ID
   * @param userId User ID
   * @returns Effective permissions for the user
   */
  async getUserPermissions(
    organizationId: string,
    userId: string
  ): Promise<Permission[]> {
    try {
      // Get user's role
      const role = await this.getUserRole(organizationId, userId);
      
      if (!role) {
        return [];
      }
      
      // Get all roles for permission inheritance
      const allRoles = await this.getOrganizationRoles(organizationId);
      const rolesMap: Record<string, Role> = {};
      
      for (const r of allRoles) {
        rolesMap[r.id] = r;
      }
      
      // Get effective permissions
      return getEffectivePermissions(role, rolesMap);
    } catch (error) {
      logger.error(`Error getting user permissions: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Check if a user has permission for an action on a resource
   * @param organizationId Organization ID
   * @param userId User ID
   * @param resource Resource to check
   * @param action Action to check
   * @returns True if user has permission
   */
  async checkUserPermission(
    organizationId: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      // Get user's permissions
      const permissions = await this.getUserPermissions(organizationId, userId);
      
      // Check wildcard permission
      const wildcardPermission = permissions.find(p => p.resource === '*');
      if (wildcardPermission && (wildcardPermission.actions.includes('*') || wildcardPermission.actions.includes(action))) {
        return true;
      }
      
      // Check specific resource permission
      const resourcePermission = permissions.find(p => p.resource === resource);
      if (resourcePermission) {
        return resourcePermission.actions.includes('*') || resourcePermission.actions.includes(action);
      }
      
      return false;
    } catch (error) {
      logger.error(`Error checking user permission: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

export default new RoleService(); 
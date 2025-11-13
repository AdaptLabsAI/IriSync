import { logger } from '../../core/logging/logger';
import { getDoc, updateDoc, queryDocs } from '../../core/database/firestore';

/**
 * Organization membership role
 */
export enum OrganizationRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

/**
 * Organization status
 */
export enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

/**
 * Organization member
 */
export interface OrganizationMember {
  userId: string;
  email: string;
  role: OrganizationRole;
  joinedAt: Date | string;
}

/**
 * Organization data
 */
export interface Organization {
  id: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  status: OrganizationStatus;
  ownerId: string;
  subscriptionId?: string;
  stripeCustomerId?: string;
  plan?: string;
  members: OrganizationMember[];
  metadata?: Record<string, any>;
}

/**
 * Get an organization by ID
 */
export async function getOrganization(id: string): Promise<Organization | null> {
  try {
    const organization = await getDoc<Organization>('organizations', id);
    return organization;
  } catch (error) {
    logger.error('Error getting organization', {
      error: error instanceof Error ? error.message : String(error),
      organizationId: id,
    });
    throw new Error('Failed to retrieve organization');
  }
}

/**
 * Get organizations by user ID
 */
export async function getOrganizationsByUser(userId: string): Promise<Array<Organization & { role: OrganizationRole }>> {
  try {
    const organizations = await queryDocs<Organization>('organizations', [
      {
        field: 'members',
        operator: 'array-contains',
        value: { userId },
      },
    ]);
    
    // Add user's role to each organization
    return organizations.map(org => {
      const member = org.members.find(m => m.userId === userId);
      const role = member ? member.role : OrganizationRole.MEMBER;
      return { ...org, role };
    });
  } catch (error) {
    logger.error('Error getting organizations by user', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw new Error('Failed to retrieve organizations for user');
  }
}

/**
 * Get an organization's members
 */
export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  try {
    const organization = await getOrganization(orgId);
    if (!organization) {
      throw new Error('Organization not found');
    }
    
    return organization.members;
  } catch (error) {
    logger.error('Error getting organization members', {
      error: error instanceof Error ? error.message : String(error),
      organizationId: orgId,
    });
    throw new Error('Failed to retrieve organization members');
  }
}

/**
 * Check if a user is a member of an organization
 */
export async function isMemberOfOrganization(userId: string, orgId: string): Promise<boolean> {
  try {
    const organization = await getOrganization(orgId);
    if (!organization) {
      return false;
    }
    
    const member = organization.members.find(m => m.userId === userId);
    return !!member;
  } catch (error) {
    logger.error('Error checking organization membership', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      organizationId: orgId,
    });
    return false;
  }
}

/**
 * Get a user's role in an organization
 */
export async function getUserOrganizationRole(userId: string, orgId: string): Promise<OrganizationRole | null> {
  try {
    const organization = await getOrganization(orgId);
    if (!organization) {
      return null;
    }
    
    const member = organization.members.find(m => m.userId === userId);
    return member ? member.role : null;
  } catch (error) {
    logger.error('Error getting user organization role', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      organizationId: orgId,
    });
    return null;
  }
}

/**
 * Check if user has required role in organization
 */
export async function hasOrganizationRole(
  userId: string, 
  orgId: string, 
  requiredRoles: OrganizationRole[]
): Promise<boolean> {
  try {
    const role = await getUserOrganizationRole(userId, orgId);
    if (!role) {
      return false;
    }
    
    return requiredRoles.includes(role);
  } catch (error) {
    logger.error('Error checking organization role', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      organizationId: orgId,
      requiredRoles,
    });
    return false;
  }
}

/**
 * Update an organization's subscription details
 */
export async function updateOrganizationSubscription(
  orgId: string,
  subscriptionId: string,
  plan: string
): Promise<void> {
  try {
    await updateDoc<Organization>('organizations', orgId, {
      subscriptionId,
      plan,
      updatedAt: new Date(),
    });
    
    logger.info('Updated organization subscription', {
      organizationId: orgId,
      subscriptionId,
      plan,
    });
  } catch (error) {
    logger.error('Error updating organization subscription', {
      error: error instanceof Error ? error.message : String(error),
      organizationId: orgId,
      subscriptionId,
      plan,
    });
    throw new Error('Failed to update organization subscription');
  }
} 
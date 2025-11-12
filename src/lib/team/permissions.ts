import { database } from '../database';
import { logger } from '../logging/logger';

/**
 * Verify if a user has the requested access level in an organization
 * @param userId User ID to check permissions for
 * @param organizationId Organization ID to check permissions in
 * @param permissions Array of permission strings to check
 * @returns Boolean indicating if the user has the required permissions
 */
export async function verifyTeamAccess(
  userId: string, 
  organizationId: string, 
  permissions: string[]
): Promise<boolean> {
  try {
    // Get the user's role in the organization
    const userOrg = await database.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId
        }
      },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });
    
    // If user is not a member of the organization, deny access
    if (!userOrg) {
      return false;
    }
    
    // If user is the organization admin, grant access
    if (userOrg.role.name === 'Admin') {
      return true;
    }
    
    // Check if user's role has all the required permissions
    const userPermissions = userOrg.role.permissions.map((p: { permission: string }) => p.permission);
    return permissions.every(perm => userPermissions.includes(perm));
  } catch (error) {
    logger.error('Error verifying team access', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      organizationId
    });
    return false;
  }
} 
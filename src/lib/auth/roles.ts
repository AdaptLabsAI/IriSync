import { UserRole } from '../core/models/User';
import { OrganizationRole, TeamRole } from '../features/user/types';
import { Role } from '../team/role';

/**
 * System-level roles (controls access to the entire system)
 * Re-exported from User model for convenience
 */
export { UserRole as SystemRole };

/**
 * Organization-level roles (controls access to organizations)
 * Re-exported from user types for convenience
 */
export { OrganizationRole };

/**
 * Team-level roles (controls access to features within teams)
 * Re-exported from user types for convenience
 */
export { TeamRole };

/**
 * Maps an organization role to its default team role
 * When an org member joins a team, this determines their default team role
 * 
 * @param role Organization role to map
 * @returns Default team role for that org role
 */
export function mapOrganizationToTeamRole(role: OrganizationRole): TeamRole {
  const mapping: Record<OrganizationRole, TeamRole> = {
    [OrganizationRole.OWNER]: TeamRole.TEAM_ADMIN,      // Owners get team admin when they join teams
    [OrganizationRole.ORG_ADMIN]: TeamRole.TEAM_ADMIN,  // Org admins get team admin when they join teams
    [OrganizationRole.MEMBER]: TeamRole.CONTRIBUTOR,    // Members are contributors by default
    [OrganizationRole.VIEWER]: TeamRole.OBSERVER        // Viewers are observers
  };
  
  return mapping[role] || TeamRole.OBSERVER;
}

/**
 * Maps a team role to the minimum required organization role
 * This determines what org-level access is needed for team roles
 * 
 * @param role Team role to map
 * @returns Minimum organization role required
 */
export function mapTeamToOrganizationRole(role: TeamRole): OrganizationRole {
  const mapping: Record<TeamRole, OrganizationRole> = {
    [TeamRole.TEAM_ADMIN]: OrganizationRole.MEMBER,     // Team admins must be org members (not org admins!)
    [TeamRole.EDITOR]: OrganizationRole.MEMBER,         // Editors must be org members
    [TeamRole.CONTRIBUTOR]: OrganizationRole.MEMBER,    // Contributors must be org members
    [TeamRole.OBSERVER]: OrganizationRole.VIEWER        // Observers can be org viewers
  };
  
  return mapping[role] || OrganizationRole.VIEWER;
}

/**
 * Checks if a user has at least the minimum required system role
 * Higher roles include lower roles (SUPER_ADMIN > ADMIN > USER)
 * 
 * @param userRole User's current role
 * @param minimumRole Minimum required role
 * @returns Whether the user meets the minimum role requirement
 */
export function hasMinimumSystemRole(userRole: UserRole, minimumRole: UserRole): boolean {
  const roleValues: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 3,
    [UserRole.ADMIN]: 2,
    [UserRole.USER]: 1
  };
  
  return (roleValues[userRole] || 0) >= (roleValues[minimumRole] || 0);
}

/**
 * Checks if a user has at least the minimum required organization role
 * Higher roles include lower roles (OWNER > ORG_ADMIN > MEMBER > VIEWER)
 * 
 * @param userRole User's current role
 * @param minimumRole Minimum required role
 * @returns Whether the user meets the minimum role requirement
 */
export function hasMinimumOrganizationRole(userRole: OrganizationRole, minimumRole: OrganizationRole): boolean {
  const roleValues: Record<OrganizationRole, number> = {
    [OrganizationRole.OWNER]: 4,
    [OrganizationRole.ORG_ADMIN]: 3,
    [OrganizationRole.MEMBER]: 2,
    [OrganizationRole.VIEWER]: 1
  };
  
  return (roleValues[userRole] || 0) >= (roleValues[minimumRole] || 0);
}

/**
 * Checks if a user has at least the minimum required team role
 * Higher roles include lower roles (TEAM_ADMIN > EDITOR > CONTRIBUTOR > OBSERVER)
 * 
 * @param userRole User's current role
 * @param minimumRole Minimum required role
 * @returns Whether the user meets the minimum role requirement
 */
export function hasMinimumTeamRole(userRole: TeamRole, minimumRole: TeamRole): boolean {
  const roleValues: Record<TeamRole, number> = {
    [TeamRole.TEAM_ADMIN]: 4,
    [TeamRole.EDITOR]: 3,
    [TeamRole.CONTRIBUTOR]: 2,
    [TeamRole.OBSERVER]: 1
  };
  
  return (roleValues[userRole] || 0) >= (roleValues[minimumRole] || 0);
}

/**
 * Get all organization roles in order from highest to lowest
 * 
 * @returns Array of organization roles
 */
export function getAllOrganizationRoles(): OrganizationRole[] {
  return [
    OrganizationRole.OWNER,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.MEMBER,
    OrganizationRole.VIEWER
  ];
}

/**
 * Get all team roles in order from highest to lowest
 * 
 * @returns Array of team roles
 */
export function getAllTeamRoles(): TeamRole[] {
  return [
    TeamRole.TEAM_ADMIN,
    TeamRole.EDITOR,
    TeamRole.CONTRIBUTOR,
    TeamRole.OBSERVER
  ];
}

/**
 * Maps a comprehensive role ID to an organization role
 * This is useful when translating from the detailed permission system
 * to the simpler organization role hierarchy.
 */
export function mapRoleIdToOrganizationRole(roleId: string): OrganizationRole {
  if (!roleId) return OrganizationRole.MEMBER;
  
  const normalizedRoleId = roleId.replace('role_', '').toLowerCase();
  
  switch (normalizedRoleId) {
    case 'owner':
      return OrganizationRole.OWNER;
    case 'org_admin':
      return OrganizationRole.ORG_ADMIN;
    case 'content_manager':
    case 'content_creator':
    case 'analyst':
      return OrganizationRole.MEMBER;
    case 'guest':
    case 'viewer':
      return OrganizationRole.VIEWER;
    default:
      return OrganizationRole.MEMBER;
  }
}

/**
 * Maps a comprehensive role ID to a team role
 * This is useful when translating from the detailed permission system
 * to the simpler team role hierarchy.
 */
export function mapRoleIdToTeamRole(roleId: string): TeamRole {
  if (!roleId) return TeamRole.OBSERVER;
  
  const normalizedRoleId = roleId.replace('role_', '').toLowerCase();
  
  switch (normalizedRoleId) {
    case 'owner':
      return TeamRole.TEAM_ADMIN;
    case 'org_admin':
      return TeamRole.TEAM_ADMIN;
    case 'content_manager':
    case 'editor':
      return TeamRole.EDITOR;
    case 'content_creator':
    case 'contributor':
      return TeamRole.CONTRIBUTOR;
    case 'analyst':
    case 'guest':
    case 'viewer':
      return TeamRole.OBSERVER;
    case 'admin':
      // Reject 'admin' role - this is reserved for Sybernetics employees only
      throw new Error('Invalid role: "admin" is reserved for system administrators. Use "org_admin" for organization administrators.');
    default:
      return TeamRole.OBSERVER;
  }
}

/**
 * Get the default team role for a user based on their organization role
 * For new users or team assignments
 */
export function getDefaultTeamRole(orgRole: OrganizationRole): TeamRole {
  return mapOrganizationToTeamRole(orgRole);
}

/**
 * @deprecated Use `hasMinimumSystemRole` instead
 */
export const hasSystemRole = hasMinimumSystemRole; 
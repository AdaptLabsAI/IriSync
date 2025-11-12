import { Timestamp } from 'firebase/firestore';
import { 
  OrganizationRole,
  TeamRole,
  TeamInviteStatus,
  UserStatus
} from '../types';

/**
 * Team member interface with dual-role architecture
 */
export interface TeamMember {
  userId: string;
  email: string;
  displayName: string;
  organizationRole: OrganizationRole;  // Organization-level role
  teamRole?: TeamRole;                 // Team-specific role (only if MEMBER)
  permissions: string[];
  joinedAt: Date;
  invitedBy: string;
  status: 'active' | 'inactive' | 'pending';
  lastActiveAt?: Date;
}

/**
 * Team invitation interface with dual-role architecture
 */
export interface TeamInvitation {
  id: string;
  email: string;
  organizationRole: OrganizationRole;  // Org role being invited to
  teamRole?: TeamRole;                 // Team role (only if inviting as MEMBER)
  permissions: string[];
  invitedBy: string;
  invitedByName: string;
  status: TeamInviteStatus;
  token: string;
  message?: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Team settings interface
 */
export interface TeamSettings {
  allowSelfJoin: boolean;
  requireApproval: boolean;
  allowInvites: boolean;
  allowRoleChange: boolean;
  notifyOnJoin: boolean;
  notifyOnLeave: boolean;
  autoArchiveInactive: boolean;
  inactiveThresholdDays: number;
}

/**
 * Team interface for the User Library with dual-role architecture
 */
export interface Team {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  
  // Team settings
  isDefault: boolean; // Default team for organization
  isPublic: boolean; // Can be discovered by organization members
  maxMembers?: number; // Maximum number of members (null = unlimited)
  
  // Team members with dual-role architecture
  members: Array<{
    userId: string;
    email: string;
    displayName: string;
    organizationRole: OrganizationRole;  // Organization-level role
    teamRole?: TeamRole;                 // Team-specific role (only if MEMBER)
    permissions: string[];
    joinedAt: Date;
    invitedBy: string;
    status: 'active' | 'inactive' | 'pending';
    lastActiveAt?: Date;
  }>;
  
  // Team invitations with dual-role architecture
  pendingInvites: Array<{
    id: string;
    email: string;
    organizationRole: OrganizationRole;  // Org role being invited to
    teamRole?: TeamRole;                 // Team role (only if inviting as MEMBER)
    permissions: string[];
    invitedBy: string;
    invitedByName: string;
    status: TeamInviteStatus;
    token: string;
    message?: string;
    createdAt: Date;
    expiresAt: Date;
  }>;
  
  // Team permissions and roles
  defaultTeamRole: TeamRole;             // Default team role for new MEMBERS
  defaultPermissions: string[];
  customRoles: Array<{
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    isCustom: boolean;
    createdBy: string;
    createdAt: Date;
  }>;
  
  // Team settings
  settings: {
    allowSelfJoin: boolean;
    requireApproval: boolean;
    allowInvites: boolean;
    allowRoleChange: boolean;
    notifyOnJoin: boolean;
    notifyOnLeave: boolean;
    autoArchiveInactive: boolean;
    inactiveThresholdDays: number;
  };
  
  // Team activity and metrics
  activity: {
    totalMembers: number;
    activeMembers: number;
    pendingInvites: number;
    lastActivity?: Date;
    contentCreated: number;
    contentPublished: number;
    collaborations: number;
  };
  
  // Team metadata
  tags?: string[];
  customFields?: Record<string, any>;
  
  // Ownership and management
  ownerId: string;
  managers: string[]; // User IDs who can manage the team
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  deletedAt?: Date;
}

/**
 * Firestore representation of Team with dual-role architecture
 */
export interface FirestoreTeam {
  name: string;
  description?: string;
  organizationId: string;
  
  isDefault: boolean;
  isPublic: boolean;
  maxMembers?: number;
  
  members: Array<{
    userId: string;
    email: string;
    displayName: string;
    organizationRole: OrganizationRole;  // Organization-level role
    teamRole?: TeamRole;                 // Team-specific role (only if MEMBER)
    permissions: string[];
    joinedAt: Timestamp;
    invitedBy: string;
    status: 'active' | 'inactive' | 'pending';
    lastActiveAt?: Timestamp;
  }>;
  
  pendingInvites: Array<{
    id: string;
    email: string;
    organizationRole: OrganizationRole;  // Org role being invited to
    teamRole?: TeamRole;                 // Team role (only if inviting as MEMBER)
    permissions: string[];
    invitedBy: string;
    invitedByName: string;
    status: TeamInviteStatus;
    token: string;
    message?: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
  }>;
  
  defaultTeamRole: TeamRole;             // Default team role for new MEMBERS
  defaultPermissions: string[];
  customRoles: Array<{
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    isCustom: boolean;
    createdBy: string;
    createdAt: Timestamp;
  }>;
  
  settings: {
    allowSelfJoin: boolean;
    requireApproval: boolean;
    allowInvites: boolean;
    allowRoleChange: boolean;
    notifyOnJoin: boolean;
    notifyOnLeave: boolean;
    autoArchiveInactive: boolean;
    inactiveThresholdDays: number;
  };
  
  activity: {
    totalMembers: number;
    activeMembers: number;
    pendingInvites: number;
    lastActivity?: Timestamp;
    contentCreated: number;
    contentPublished: number;
    collaborations: number;
  };
  
  tags?: string[];
  customFields?: Record<string, any>;
  
  ownerId: string;
  managers: string[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archivedAt?: Timestamp;
  deletedAt?: Timestamp;
}

/**
 * Team utility functions
 */
export class TeamUtils {
  /**
   * Convert Firestore team to Team interface
   */
  static fromFirestore(id: string, data: FirestoreTeam): Team {
    return {
      id,
      name: data.name,
      description: data.description,
      organizationId: data.organizationId,
      
      isDefault: data.isDefault,
      isPublic: data.isPublic,
      maxMembers: data.maxMembers,
      
      members: data.members.map(member => ({
        ...member,
        joinedAt: member.joinedAt.toDate(),
        lastActiveAt: member.lastActiveAt?.toDate()
      })),
      
      pendingInvites: data.pendingInvites.map(invite => ({
        ...invite,
        createdAt: invite.createdAt.toDate(),
        expiresAt: invite.expiresAt.toDate()
      })),
      
      defaultTeamRole: data.defaultTeamRole,
      defaultPermissions: data.defaultPermissions,
      customRoles: data.customRoles.map(role => ({
        ...role,
        createdAt: role.createdAt.toDate()
      })),
      
      settings: data.settings,
      
      activity: {
        ...data.activity,
        lastActivity: data.activity.lastActivity?.toDate()
      },
      
      tags: data.tags,
      customFields: data.customFields,
      
      ownerId: data.ownerId,
      managers: data.managers,
      
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      archivedAt: data.archivedAt?.toDate(),
      deletedAt: data.deletedAt?.toDate()
    };
  }

  /**
   * Convert Team to Firestore format
   */
  static toFirestore(team: Team): Omit<FirestoreTeam, 'createdAt' | 'updatedAt'> & {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
  } {
    return {
      name: team.name,
      description: team.description,
      organizationId: team.organizationId,
      
      isDefault: team.isDefault,
      isPublic: team.isPublic,
      maxMembers: team.maxMembers,
      
      members: team.members.map(member => ({
        ...member,
        joinedAt: Timestamp.fromDate(member.joinedAt),
        lastActiveAt: member.lastActiveAt ? Timestamp.fromDate(member.lastActiveAt) : undefined
      })),
      
      pendingInvites: team.pendingInvites.map(invite => ({
        ...invite,
        createdAt: Timestamp.fromDate(invite.createdAt),
        expiresAt: Timestamp.fromDate(invite.expiresAt)
      })),
      
      defaultTeamRole: team.defaultTeamRole,
      defaultPermissions: team.defaultPermissions,
      customRoles: team.customRoles.map(role => ({
        ...role,
        createdAt: Timestamp.fromDate(role.createdAt)
      })),
      
      settings: team.settings,
      
      activity: {
        ...team.activity,
        lastActivity: team.activity.lastActivity ? Timestamp.fromDate(team.activity.lastActivity) : undefined
      },
      
      tags: team.tags,
      customFields: team.customFields,
      
      ownerId: team.ownerId,
      managers: team.managers,
      
      createdAt: Timestamp.fromDate(team.createdAt),
      updatedAt: Timestamp.fromDate(team.updatedAt),
      archivedAt: team.archivedAt ? Timestamp.fromDate(team.archivedAt) : undefined,
      deletedAt: team.deletedAt ? Timestamp.fromDate(team.deletedAt) : undefined
    };
  }

  /**
   * Create default team settings
   */
  static createDefaultSettings() {
    return {
      allowSelfJoin: false,
      requireApproval: true,
      allowInvites: true,
      allowRoleChange: true,
      notifyOnJoin: true,
      notifyOnLeave: true,
      autoArchiveInactive: false,
      inactiveThresholdDays: 90
    };
  }

  /**
   * Create default team activity
   */
  static createDefaultActivity() {
    return {
      totalMembers: 0,
      activeMembers: 0,
      pendingInvites: 0,
      contentCreated: 0,
      contentPublished: 0,
      collaborations: 0
    };
  }

  /**
   * Check if user is team member
   */
  static isMember(team: Team, userId: string): boolean {
    return team.members.some(member => member.userId === userId && member.status === 'active');
  }

  /**
   * Check if user is team owner
   */
  static isOwner(team: Team, userId: string): boolean {
    return team.ownerId === userId;
  }

  /**
   * Check if user is team manager
   */
  static isManager(team: Team, userId: string): boolean {
    return team.managers.includes(userId) || TeamUtils.isOwner(team, userId);
  }

  /**
   * Check if user can manage team members (add/remove/change roles)
   * Only OWNER and ORG_ADMIN can manage members
   */
  static canManageMembers(team: Team, userId: string): boolean {
    return TeamUtils.hasOrganizationRole(team, userId, OrganizationRole.ORG_ADMIN);
  }

  /**
   * Check if user can manage team settings and configuration
   * Only OWNER and managers can manage team settings
   */
  static canManageTeam(team: Team, userId: string): boolean {
    return TeamUtils.isOwner(team, userId) || TeamUtils.isManager(team, userId);
  }

  /**
   * Check if user can access team information
   * All team members can access basic team info
   */
  static canAccessTeam(team: Team, userId: string): boolean {
    return TeamUtils.isMember(team, userId);
  }

  /**
   * Check if user has specific organization role or higher in team
   */
  static hasOrganizationRole(team: Team, userId: string, role: OrganizationRole): boolean {
    const member = team.members.find(m => m.userId === userId);
    if (!member) return false;

    const roleHierarchy = {
      [OrganizationRole.OWNER]: 4,
      [OrganizationRole.ORG_ADMIN]: 3,
      [OrganizationRole.MEMBER]: 2,
      [OrganizationRole.VIEWER]: 1
    };

    const userRoleLevel = roleHierarchy[member.organizationRole] || 0;
    const requiredRoleLevel = roleHierarchy[role] || 0;

    return userRoleLevel >= requiredRoleLevel;
  }

  /**
   * Check if user has specific team role or higher (only applies to MEMBERS)
   */
  static hasTeamRole(team: Team, userId: string, role: TeamRole): boolean {
    const member = team.members.find(m => m.userId === userId);
    if (!member || member.organizationRole !== OrganizationRole.MEMBER || !member.teamRole) {
      return false;
    }

    const roleHierarchy = {
      [TeamRole.TEAM_ADMIN]: 4,
      [TeamRole.EDITOR]: 3,
      [TeamRole.CONTRIBUTOR]: 2,
      [TeamRole.OBSERVER]: 1
    };

    const userRoleLevel = roleHierarchy[member.teamRole] || 0;
    const requiredRoleLevel = roleHierarchy[role] || 0;

    return userRoleLevel >= requiredRoleLevel;
  }

  /**
   * Check if user has specific permission in team
   */
  static hasPermission(team: Team, userId: string, permission: string): boolean {
    const member = team.members.find(m => m.userId === userId && m.status === 'active');
    return member?.permissions.includes(permission) || false;
  }

  /**
   * Get user's organization role in team
   */
  static getUserOrganizationRole(team: Team, userId: string): OrganizationRole | null {
    const member = team.members.find(m => m.userId === userId && m.status === 'active');
    return member?.organizationRole || null;
  }

  /**
   * Get user's team role in team (only for MEMBERS)
   */
  static getUserTeamRole(team: Team, userId: string): TeamRole | null {
    const member = team.members.find(m => m.userId === userId && m.status === 'active');
    if (member?.organizationRole === OrganizationRole.MEMBER) {
      return member.teamRole || null;
    }
    return null;
  }

  /**
   * Get user's permissions in team
   */
  static getUserPermissions(team: Team, userId: string): string[] {
    const member = team.members.find(m => m.userId === userId && m.status === 'active');
    return member?.permissions || [];
  }

  /**
   * Check if team is at capacity
   */
  static isAtCapacity(team: Team): boolean {
    if (!team.maxMembers) return false;
    return team.members.filter(m => m.status === 'active').length >= team.maxMembers;
  }

  /**
   * Check if team can accept new members
   */
  static canAcceptMembers(team: Team): boolean {
    return !TeamUtils.isAtCapacity(team) && team.settings.allowInvites;
  }

  /**
   * Get active members count
   */
  static getActiveMembersCount(team: Team): number {
    return team.members.filter(m => m.status === 'active').length;
  }

  /**
   * Get pending invites count
   */
  static getPendingInvitesCount(team: Team): number {
    return team.pendingInvites.filter(i => i.status === TeamInviteStatus.PENDING).length;
  }

  /**
   * Check if email has pending invite
   */
  static hasPendingInvite(team: Team, email: string): boolean {
    return team.pendingInvites.some(
      invite => invite.email.toLowerCase() === email.toLowerCase() && 
      invite.status === TeamInviteStatus.PENDING
    );
  }

  /**
   * Check if user is already a member
   */
  static isAlreadyMember(team: Team, userId: string): boolean {
    return team.members.some(member => member.userId === userId);
  }

  /**
   * Get team member by user ID
   */
  static getMember(team: Team, userId: string) {
    return team.members.find(member => member.userId === userId);
  }

  /**
   * Get team invite by email
   */
  static getInviteByEmail(team: Team, email: string) {
    return team.pendingInvites.find(
      invite => invite.email.toLowerCase() === email.toLowerCase() && 
      invite.status === TeamInviteStatus.PENDING
    );
  }

  /**
   * Get team invite by token
   */
  static getInviteByToken(team: Team, token: string) {
    return team.pendingInvites.find(
      invite => invite.token === token && invite.status === TeamInviteStatus.PENDING
    );
  }

  /**
   * Check if invite is expired
   */
  static isInviteExpired(invite: { expiresAt: Date }): boolean {
    return invite.expiresAt < new Date();
  }

  /**
   * Calculate team engagement score (0-100)
   */
  static calculateEngagementScore(team: Team): number {
    const totalMembers = team.activity.totalMembers;
    const activeMembers = team.activity.activeMembers;
    const contentCreated = team.activity.contentCreated;
    const collaborations = team.activity.collaborations;

    if (totalMembers === 0) return 0;

    // Calculate engagement based on activity metrics
    const memberEngagement = (activeMembers / totalMembers) * 100;
    const contentEngagement = Math.min((contentCreated / totalMembers) * 10, 100);
    const collaborationEngagement = Math.min((collaborations / totalMembers) * 20, 100);

    // Weighted average
    return Math.round(
      (memberEngagement * 0.4) + 
      (contentEngagement * 0.3) + 
      (collaborationEngagement * 0.3)
    );
  }

  /**
   * Validate team data
   */
  static validate(team: Partial<Team>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!team.name?.trim()) {
      errors.push('Team name is required');
    } else if (team.name.length < 2) {
      errors.push('Team name must be at least 2 characters');
    } else if (team.name.length > 100) {
      errors.push('Team name must be less than 100 characters');
    }
    
    if (!team.organizationId?.trim()) {
      errors.push('Organization ID is required');
    }
    
    if (!team.ownerId?.trim()) {
      errors.push('Owner ID is required');
    }
    
    if (team.maxMembers && team.maxMembers < 1) {
      errors.push('Maximum members must be at least 1');
    }
    
    if (team.description && team.description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate team invite token
   */
  static generateInviteToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Calculate invite expiry date
   */
  static calculateInviteExpiry(days: number = 7): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry;
  }

  /**
   * Transfer team ownership from current owner to new owner
   * Current owner becomes ORG_ADMIN, new owner becomes OWNER
   */
  static transferOwnership(team: Team, newOwnerId: string): Team {
    const updatedMembers = team.members.map(member => {
      if (member.userId === team.ownerId) {
        // Current owner becomes ORG_ADMIN
        return {
          ...member,
          organizationRole: OrganizationRole.ORG_ADMIN,
          teamRole: undefined // ORG_ADMIN doesn't have team roles
        };
      } else if (member.userId === newOwnerId) {
        // New owner becomes OWNER
        return {
          ...member,
          organizationRole: OrganizationRole.OWNER,
          teamRole: undefined // OWNER doesn't have team roles
        };
      }
      return member;
    });

    return {
      ...team,
      ownerId: newOwnerId,
      members: updatedMembers,
      updatedAt: new Date()
    };
  }

  /**
   * Check if user is a member by email
   */
  static isMemberByEmail(team: Team, email: string): boolean {
    return team.members.some(member => member.email === email);
  }

  /**
   * Add invitations property to team interface for compatibility
   */
  static getInvitations(team: Team): TeamInvitation[] {
    return team.pendingInvites;
  }
} 
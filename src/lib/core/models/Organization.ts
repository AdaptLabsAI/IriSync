import { Timestamp } from 'firebase/firestore';
import { SubscriptionTier } from '../subscription/models/subscription';
import { UserRole } from './User';

/**
 * Organization role types
 */
export enum OrganizationRoleType {
  OWNER = 'owner',
  ADMIN = 'org_admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

/**
 * Organization status
 */
export enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING_DELETION = 'pending_deletion',
  DELETED = 'deleted'
}

/**
 * Interface for organization member
 */
export interface OrganizationMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  joinedAt: Date;
  lastActivityAt?: Date;
  permissions?: string[]; // Specific permissions
}

/**
 * Interface for organization team
 */
export interface Team {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  managers: string[];   // User IDs who can manage the team
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Interface for organization
 */
export interface Organization {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  isPersonalOrg: boolean; // True for freelancer/individual organizations
  ownerUserId: string; // User who owns this organization
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: OrganizationStatus;
  deletionDate?: Timestamp; // Date when organization will be permanently deleted
  members: Record<string, TeamMember>; // Map of userId to member info
  teams?: Record<string, Team>; // Map of teamId to team info
  billing: BillingInfo;
  platformConnections: Record<string, PlatformConnection>; // Map of platformId to connection
  usageQuota: UsageQuota;
  settings: OrganizationSettings;
  customDomain?: string;
  metadata?: Record<string, any>; // Additional organization metadata
}

/**
 * Interface for organization in Firestore
 */
export interface FirestoreOrganization {
  name: string;
  displayName?: string;
  description?: string;
  isPersonalOrg: boolean;
  ownerUserId: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  status: OrganizationStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletionDate?: Timestamp;
  billing: BillingInfo;
  platformConnections: Record<string, PlatformConnection>;
  usageQuota: UsageQuota;
  settings: OrganizationSettings;
  customDomain?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for organization member in Firestore
 */
export interface FirestoreOrganizationMember {
  userId: string;
  email: string;
  displayName: string;
  role: OrganizationRoleType;
  joinedAt: Timestamp;
  invitedBy: string;
  lastActiveAt?: Timestamp;
  permissions?: string[];
  teams?: string[];
}

/**
 * Interface for team in Firestore
 */
export interface FirestoreTeam {
  name: string;
  description?: string;
  memberIds: string[];
  managers: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Team member interface
 */
export interface TeamMember {
  userId: string;
  email: string;
  displayName: string;
  role: OrganizationRoleType;
  joinedAt: Timestamp;
  invitedBy: string; // userId of inviter
  lastActiveAt?: Timestamp;
  permissions?: string[]; // Optional specific permissions
  teams?: string[]; // Optional team assignments
}

/**
 * Billing information
 */
export interface BillingInfo {
  customerId?: string; // Stripe customer ID
  subscriptionId?: string; // Stripe subscription ID
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriodStart?: Timestamp;
  currentPeriodEnd?: Timestamp;
  cancellationRequested?: boolean;
  cancellationDate?: Timestamp;
  paymentMethod?: {
    type: 'card' | 'bank' | 'other';
    lastFour?: string;
    expiryMonth?: number;
    expiryYear?: number;
    brand?: string;
  };
  billingEmail?: string;
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  taxId?: string;
}

/**
 * Platform connection for organization
 */
export interface PlatformConnection {
  platformId: string; // e.g., 'twitter', 'instagram', 'linkedin'
  accountId: string; // Platform's account ID
  accountName: string; // Display name on platform
  accessToken?: string; // Encrypted token
  refreshToken?: string; // Encrypted refresh token
  tokenExpiry?: Timestamp;
  scope?: string; // Permissions granted
  connectedAt: Timestamp;
  connectedBy: string; // userId
  status: 'active' | 'expired' | 'revoked';
  profileUrl?: string;
  avatarUrl?: string;
  metadata?: Record<string, any>; // Platform-specific details
}

/**
 * Usage quota tracking
 */
export interface UsageQuota {
  aiTokens: {
    limit: number;
    used: number;
    resetDate: Timestamp;
    additionalPurchased?: number;
  };
  storage: {
    limitMB: number;
    usedMB: number;
  };
  socialAccounts: {
    limit: number;
    used: number;
  };
  teamMembers: {
    limit: number;
    used: number;
  };
}

/**
 * Organization settings
 */
export interface OrganizationSettings {
  timezone: string;
  defaultContentApproval: boolean;
  autoSchedulingEnabled: boolean;
  preferredPostingTimes?: {
    platform: string;
    times: { day: number; hour: number; minute: number }[]; // 0 = Sunday
  }[];
  mediaSettings?: {
    defaultQuality: 'low' | 'medium' | 'high';
    autoResize: boolean;
    watermarkEnabled: boolean;
    watermarkImageUrl?: string;
  };
  notificationSettings?: {
    email: boolean;
    slack?: boolean;
    slackWebhookUrl?: string;
  };
}

/**
 * Creates a personal organization for a freelance/individual user
 * @param userId User ID for the owner
 * @param displayName User's display name
 * @param email User's email
 * @returns Personal organization object
 */
export function createPersonalOrganization(
  userId: string,
  displayName: string,
  email: string
): Omit<Organization, 'id'> {
  const now = Timestamp.now();
  
  return {
    name: `personal-${userId}`,
    displayName: `${displayName}'s Workspace`,
    isPersonalOrg: true,
    ownerUserId: userId,
    createdAt: now,
    updatedAt: now,
    status: OrganizationStatus.ACTIVE,
    members: {
      [userId]: {
        userId,
        email,
        displayName,
        role: OrganizationRoleType.OWNER,
        joinedAt: now,
        invitedBy: userId // Self-invited
      }
    },
    billing: {
      subscriptionTier: SubscriptionTier.CREATOR, // Start with basic tier
      subscriptionStatus: 'active'
    },
    platformConnections: {},
    usageQuota: {
      aiTokens: {
        limit: 100, // Default token limit for personal orgs
        used: 0,
        resetDate: Timestamp.fromDate(new Date(new Date().setMonth(new Date().getMonth() + 1)))
      },
      storage: {
        limitMB: 500, // Default storage limit for personal orgs
        usedMB: 0
      },
      socialAccounts: {
        limit: 3, // Default social account limit for personal orgs
        used: 0
      },
      teamMembers: {
        limit: 1, // Personal orgs start with just the owner
        used: 1
      }
    },
    settings: {
      timezone: 'UTC',
      defaultContentApproval: false,
      autoSchedulingEnabled: false
    }
  };
}

/**
 * Creates a business organization
 * @param ownerUserId User ID of the owner
 * @param name Organization name
 * @param ownerEmail Owner's email
 * @param ownerDisplayName Owner's display name
 * @param tier Subscription tier
 * @returns Business organization object
 */
export function createBusinessOrganization(
  ownerUserId: string,
  name: string,
  ownerEmail: string,
  ownerDisplayName: string,
  tier: SubscriptionTier = SubscriptionTier.CREATOR
): Omit<Organization, 'id'> {
  const now = Timestamp.now();
  
  // Set quota limits based on tier
  const quotaLimits = getTierQuotaLimits(tier);
  
  return {
    name,
    displayName: name,
    isPersonalOrg: false,
    ownerUserId,
    createdAt: now,
    updatedAt: now,
    status: OrganizationStatus.ACTIVE,
    members: {
      [ownerUserId]: {
        userId: ownerUserId,
        email: ownerEmail,
        displayName: ownerDisplayName,
        role: OrganizationRoleType.OWNER,
        joinedAt: now,
        invitedBy: ownerUserId // Self-invited
      }
    },
    billing: {
      subscriptionTier: tier,
      subscriptionStatus: 'active'
    },
    platformConnections: {},
    usageQuota: {
      aiTokens: {
        limit: quotaLimits.aiTokens,
        used: 0,
        resetDate: Timestamp.fromDate(new Date(new Date().setMonth(new Date().getMonth() + 1)))
      },
      storage: {
        limitMB: quotaLimits.storageMB,
        usedMB: 0
      },
      socialAccounts: {
        limit: quotaLimits.socialAccounts,
        used: 0
      },
      teamMembers: {
        limit: quotaLimits.teamMembers,
        used: 1 // Start with one member (the owner)
      }
    },
    settings: {
      timezone: 'UTC',
      defaultContentApproval: true,
      autoSchedulingEnabled: true
    }
  };
}

/**
 * Get usage quota limits based on subscription tier
 * @param tier Subscription tier
 * @returns Quota limits
 */
function getTierQuotaLimits(tier: SubscriptionTier): {
  aiTokens: number;
  storageMB: number;
  socialAccounts: number;
  teamMembers: number;
} {
  switch (tier) {
    case SubscriptionTier.ENTERPRISE:
      return {
        aiTokens: 5000,
        storageMB: 100000, // 100GB
        socialAccounts: Number.MAX_SAFE_INTEGER, // Unlimited
        teamMembers: 50
      };
    case SubscriptionTier.INFLUENCER:
      return {
        aiTokens: 500,
        storageMB: 10000, // 10GB
        socialAccounts: Number.MAX_SAFE_INTEGER, // Unlimited
        teamMembers: 10
      };
    case SubscriptionTier.CREATOR:
    default:
      return {
        aiTokens: 100,
        storageMB: 1000, // 1GB
        socialAccounts: 5,
        teamMembers: 3
      };
  }
}

/**
 * Check if a user has the specified role in an organization
 * @param organization Organization object
 * @param userId User ID
 * @param minimumRole Minimum required role
 * @returns True if user has the required role or higher
 */
export function hasOrganizationRole(
  organization: Organization,
  userId: string,
  minimumRole: OrganizationRoleType
): boolean {
  const member = organization.members[userId];
  if (!member) return false;
  
  // Define role hierarchy
  const roleValues = {
    [OrganizationRoleType.OWNER]: 4,
    [OrganizationRoleType.ADMIN]: 3,
    [OrganizationRoleType.MEMBER]: 2,
    [OrganizationRoleType.VIEWER]: 1
  };
  
  return roleValues[member.role] >= roleValues[minimumRole];
}

/**
 * Check if a user is in a specific team within an organization
 * @param organization Organization object
 * @param userId User ID
 * @param teamId Team ID
 * @returns True if user is in the team
 */
export function isUserInTeam(
  organization: Organization,
  userId: string,
  teamId: string
): boolean {
  // Check if organization has teams
  if (!organization.teams || !organization.teams[teamId]) {
    return false;
  }
  
  // Check if user is a member of the organization
  const member = organization.members[userId];
  if (!member) {
    return false;
  }
  
  // Check if user has team assignments
  if (member.teams && member.teams.includes(teamId)) {
    return true;
  }
  
  // Check the team's memberIds directly
  return organization.teams[teamId].memberIds.includes(userId);
}

/**
 * Prepare an organization for deletion by marking it for deletion
 * @param organization Organization to prepare for deletion
 * @param userId User requesting deletion
 * @returns Organization with updated deletion status
 */
export function prepareOrganizationForDeletion(
  organization: Organization,
  userId: string
): Organization {
  // Only owner can delete an organization
  if (organization.ownerUserId !== userId) {
    throw new Error('Only the organization owner can request deletion');
  }
  
  // Calculate deletion date (30 days from now)
  const now = Timestamp.now();
  const deletionDate = Timestamp.fromDate(
    new Date(now.toDate().getTime() + 30 * 24 * 60 * 60 * 1000)
  );
  
  return {
    ...organization,
    status: OrganizationStatus.PENDING_DELETION,
    deletionDate,
    updatedAt: now
  };
}

/**
 * Remove a user from an organization
 * @param organization Organization to remove user from
 * @param userId User to remove
 * @param removedByUserId User performing the removal
 * @returns Organization with user removed
 */
export function removeUserFromOrganization(
  organization: Organization,
  userId: string,
  removedByUserId: string
): Organization {
  // Cannot remove the owner
  if (userId === organization.ownerUserId) {
    throw new Error('Cannot remove the organization owner');
  }
  
  // Check if remover has permission (must be admin or owner)
  if (!hasOrganizationRole(organization, removedByUserId, OrganizationRoleType.ADMIN) &&
      removedByUserId !== organization.ownerUserId) {
    throw new Error('Only admins and owners can remove users');
  }
  
  // Check if user exists in organization
  if (!organization.members[userId]) {
    throw new Error('User is not a member of this organization');
  }
  
  // Create updated members object without the user
  const updatedMembers = { ...organization.members };
  delete updatedMembers[userId];
  
  // Update teams to remove the user
  const updatedTeams = { ...organization.teams };
  if (updatedTeams) {
    Object.keys(updatedTeams).forEach(teamId => {
      const team = updatedTeams[teamId];
      
      // Remove user from team's memberIds
      updatedTeams[teamId] = {
        ...team,
        memberIds: team.memberIds.filter(id => id !== userId),
        managers: team.managers.filter(id => id !== userId)
      };
    });
  }
  
  return {
    ...organization,
    members: updatedMembers,
    teams: updatedTeams,
    updatedAt: Timestamp.now(),
    usageQuota: {
      ...organization.usageQuota,
      teamMembers: {
        ...organization.usageQuota.teamMembers,
        used: Math.max(0, organization.usageQuota.teamMembers.used - 1)
      }
    }
  };
}

/**
 * Transfer ownership of an organization to another user
 * @param organization Organization to transfer
 * @param currentOwnerId Current owner ID
 * @param newOwnerId New owner ID
 * @returns Organization with new owner
 */
export function transferOrganizationOwnership(
  organization: Organization,
  currentOwnerId: string,
  newOwnerId: string
): Organization {
  // Verify current owner
  if (organization.ownerUserId !== currentOwnerId) {
    throw new Error('Only the current owner can transfer ownership');
  }
  
  // Verify new owner is a member
  if (!organization.members[newOwnerId]) {
    throw new Error('New owner must be a member of the organization');
  }
  
  // Get current members
  const updatedMembers = { ...organization.members };
  
  // Update roles
  updatedMembers[newOwnerId] = {
    ...updatedMembers[newOwnerId],
    role: OrganizationRoleType.OWNER
  };
  
  updatedMembers[currentOwnerId] = {
    ...updatedMembers[currentOwnerId],
    role: OrganizationRoleType.ADMIN
  };
  
  return {
    ...organization,
    ownerUserId: newOwnerId,
    members: updatedMembers,
    updatedAt: Timestamp.now()
  };
}

/**
 * Convert Firestore data to Organization object
 * @param id Organization ID
 * @param data Organization data from Firestore
 * @param members Organization members
 * @param teams Organization teams
 * @returns Organization
 */
export function firestoreToOrganization(
  id: string,
  data: FirestoreOrganization,
  members: FirestoreOrganizationMember[],
  teams: Record<string, FirestoreTeam>
): Organization {
  // Convert members array to record object
  const membersRecord: Record<string, TeamMember> = {};
  members.forEach(member => {
    membersRecord[member.userId] = {
      userId: member.userId,
      email: member.email,
      displayName: member.displayName,
      role: member.role,
      joinedAt: member.joinedAt,
      invitedBy: member.invitedBy,
      lastActiveAt: member.lastActiveAt,
      permissions: member.permissions,
      teams: member.teams
    };
  });
  
  // Convert teams to record
  const teamsRecord: Record<string, Team> = {};
  Object.entries(teams).forEach(([teamId, team]) => {
    teamsRecord[teamId] = {
      id: teamId,
      name: team.name,
      description: team.description,
      memberIds: team.memberIds,
      managers: team.managers,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    };
  });
  
  return {
    id,
    name: data.name,
    displayName: data.displayName,
    description: data.description,
    isPersonalOrg: data.isPersonalOrg,
    ownerUserId: data.ownerUserId,
    logoUrl: data.logoUrl,
    website: data.website,
    industry: data.industry,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    deletionDate: data.deletionDate,
    members: membersRecord,
    teams: teamsRecord,
    billing: data.billing,
    platformConnections: data.platformConnections || {},
    usageQuota: data.usageQuota,
    settings: data.settings,
    customDomain: data.customDomain,
    metadata: data.metadata
  };
}

/**
 * Convert Organization object to Firestore format
 * @param organization Organization
 * @returns Firestore data
 */
export function organizationToFirestore(organization: Organization): {
  org: FirestoreOrganization;
  members: Record<string, FirestoreOrganizationMember>;
  teams: Record<string, FirestoreTeam>;
} {
  // Convert members record to array
  const members = Object.values(organization.members).reduce((acc, member) => {
    acc[member.userId] = {
      userId: member.userId,
      email: member.email,
      displayName: member.displayName,
      role: member.role,
      joinedAt: member.joinedAt,
      invitedBy: member.invitedBy,
      lastActiveAt: member.lastActiveAt,
      permissions: member.permissions,
      teams: member.teams
    };
    return acc;
  }, {} as Record<string, FirestoreOrganizationMember>);
  
  // Convert teams record
  const teams = organization.teams ? 
    Object.entries(organization.teams).reduce((acc, [teamId, team]) => {
      acc[teamId] = {
        name: team.name,
        description: team.description,
        memberIds: team.memberIds,
        managers: team.managers,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      };
      return acc;
    }, {} as Record<string, FirestoreTeam>) : 
    {};
  
  return {
    org: {
      name: organization.name,
      displayName: organization.displayName,
      description: organization.description,
      isPersonalOrg: organization.isPersonalOrg,
      ownerUserId: organization.ownerUserId,
      logoUrl: organization.logoUrl,
      website: organization.website,
      industry: organization.industry,
      status: organization.status,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      deletionDate: organization.deletionDate,
      billing: organization.billing,
      platformConnections: organization.platformConnections,
      usageQuota: organization.usageQuota,
      settings: organization.settings,
      customDomain: organization.customDomain,
      metadata: organization.metadata
    },
    members,
    teams
  };
}

/**
 * Migration function to convert old role values to new ones
 * @param oldRole Old role value from database
 * @returns New OrganizationRoleType value
 */
export function migrateOrganizationRoleValue(oldRole: string): OrganizationRoleType {
  switch (oldRole) {
    case 'guest':
      return OrganizationRoleType.VIEWER;  // Maps to 'viewer'
    case 'owner':
      return OrganizationRoleType.OWNER;
    case 'member':
      return OrganizationRoleType.MEMBER;
    // Handle new values that might already exist
    case 'org_admin':
      return OrganizationRoleType.ADMIN;
    case 'viewer':
      return OrganizationRoleType.VIEWER;
    case 'admin':
      // SECURITY: 'admin' is reserved for Sybernetics system administrators
      // It should NEVER appear in organization member roles
      throw new Error('Invalid role: "admin" is reserved for system administrators and cannot be used in organization contexts. Use "org_admin" for organization administrators.');
    default:
      console.warn(`Unknown role value: ${oldRole}, defaulting to MEMBER`);
      return OrganizationRoleType.MEMBER;
  }
} 
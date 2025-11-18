/**
 * Team Service
 *
 * Manages team members and collaboration within organizations.
 * Supports role-based access control, invitations, and activity tracking.
 *
 * Team Roles:
 * - Owner: Full access including billing and team management
 * - Admin: All features except billing and ownership transfer
 * - Editor: Create, edit, schedule, and publish content
 * - Contributor: Create and submit content for approval
 * - Viewer: Read-only access to content and analytics
 *
 * Pricing:
 * - Base subscription includes 1 user (Owner)
 * - Additional team members: $15/month per user (Creator), $25/month (Influencer), $40/month (Enterprise)
 */

import { firestore } from '@/lib/core/firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  limit as firestoreLimit,
} from 'firebase/firestore';

/**
 * Team member roles
 */
export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  CONTRIBUTOR = 'contributor',
  VIEWER = 'viewer',
}

/**
 * Team member permissions
 */
export interface TeamPermissions {
  // Content permissions
  canCreateContent: boolean;
  canEditContent: boolean;
  canPublishContent: boolean;
  canDeleteContent: boolean;
  canScheduleContent: boolean;

  // Analytics permissions
  canViewAnalytics: boolean;
  canExportAnalytics: boolean;

  // Media permissions
  canUploadMedia: boolean;
  canDeleteMedia: boolean;
  canManageBrandAssets: boolean;

  // AI toolkit permissions
  canUseAIChat: boolean;
  canGenerateContent: boolean;
  canOptimizeContent: boolean;

  // Social listening permissions
  canViewMentions: boolean;
  canReplyToEngagement: boolean;
  canManageMonitoring: boolean;

  // Team permissions
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canManageRoles: boolean;

  // Workflow permissions
  canCreateWorkflows: boolean;
  canApproveContent: boolean;

  // Organization permissions
  canManageBilling: boolean;
  canManageSettings: boolean;
  canTransferOwnership: boolean;
}

/**
 * Default permissions by role
 */
const ROLE_PERMISSIONS: Record<TeamRole, TeamPermissions> = {
  [TeamRole.OWNER]: {
    canCreateContent: true,
    canEditContent: true,
    canPublishContent: true,
    canDeleteContent: true,
    canScheduleContent: true,
    canViewAnalytics: true,
    canExportAnalytics: true,
    canUploadMedia: true,
    canDeleteMedia: true,
    canManageBrandAssets: true,
    canUseAIChat: true,
    canGenerateContent: true,
    canOptimizeContent: true,
    canViewMentions: true,
    canReplyToEngagement: true,
    canManageMonitoring: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canManageRoles: true,
    canCreateWorkflows: true,
    canApproveContent: true,
    canManageBilling: true,
    canManageSettings: true,
    canTransferOwnership: true,
  },
  [TeamRole.ADMIN]: {
    canCreateContent: true,
    canEditContent: true,
    canPublishContent: true,
    canDeleteContent: true,
    canScheduleContent: true,
    canViewAnalytics: true,
    canExportAnalytics: true,
    canUploadMedia: true,
    canDeleteMedia: true,
    canManageBrandAssets: true,
    canUseAIChat: true,
    canGenerateContent: true,
    canOptimizeContent: true,
    canViewMentions: true,
    canReplyToEngagement: true,
    canManageMonitoring: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canManageRoles: true,
    canCreateWorkflows: true,
    canApproveContent: true,
    canManageBilling: false,
    canManageSettings: true,
    canTransferOwnership: false,
  },
  [TeamRole.EDITOR]: {
    canCreateContent: true,
    canEditContent: true,
    canPublishContent: true,
    canDeleteContent: true,
    canScheduleContent: true,
    canViewAnalytics: true,
    canExportAnalytics: true,
    canUploadMedia: true,
    canDeleteMedia: true,
    canManageBrandAssets: false,
    canUseAIChat: true,
    canGenerateContent: true,
    canOptimizeContent: true,
    canViewMentions: true,
    canReplyToEngagement: true,
    canManageMonitoring: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canManageRoles: false,
    canCreateWorkflows: false,
    canApproveContent: true,
    canManageBilling: false,
    canManageSettings: false,
    canTransferOwnership: false,
  },
  [TeamRole.CONTRIBUTOR]: {
    canCreateContent: true,
    canEditContent: true,
    canPublishContent: false, // Must submit for approval
    canDeleteContent: false,
    canScheduleContent: false,
    canViewAnalytics: true,
    canExportAnalytics: false,
    canUploadMedia: true,
    canDeleteMedia: false,
    canManageBrandAssets: false,
    canUseAIChat: true,
    canGenerateContent: true,
    canOptimizeContent: true,
    canViewMentions: true,
    canReplyToEngagement: false,
    canManageMonitoring: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canManageRoles: false,
    canCreateWorkflows: false,
    canApproveContent: false,
    canManageBilling: false,
    canManageSettings: false,
    canTransferOwnership: false,
  },
  [TeamRole.VIEWER]: {
    canCreateContent: false,
    canEditContent: false,
    canPublishContent: false,
    canDeleteContent: false,
    canScheduleContent: false,
    canViewAnalytics: true,
    canExportAnalytics: false,
    canUploadMedia: false,
    canDeleteMedia: false,
    canManageBrandAssets: false,
    canUseAIChat: true,
    canGenerateContent: false,
    canOptimizeContent: false,
    canViewMentions: true,
    canReplyToEngagement: false,
    canManageMonitoring: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canManageRoles: false,
    canCreateWorkflows: false,
    canApproveContent: false,
    canManageBilling: false,
    canManageSettings: false,
    canTransferOwnership: false,
  },
};

/**
 * Team member status
 */
export enum MemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  REMOVED = 'removed',
}

/**
 * Team member
 */
export interface TeamMember {
  id?: string;
  userId: string;
  organizationId: string;
  email: string;
  name?: string;
  role: TeamRole;
  permissions: TeamPermissions;
  status: MemberStatus;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Team invitation
 */
export interface TeamInvite {
  id?: string;
  organizationId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  invitedByName?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

/**
 * Team activity log
 */
export interface TeamActivity {
  id?: string;
  organizationId: string;
  userId: string;
  userName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  createdAt: Date;
}

/**
 * Per-user pricing by subscription tier
 */
export const ADDITIONAL_USER_PRICING = {
  creator: 1500, // $15.00/month
  influencer: 2500, // $25.00/month
  enterprise: 4000, // $40.00/month
};

class TeamService {
  private readonly MEMBERS_COLLECTION = 'teamMembers';
  private readonly INVITES_COLLECTION = 'teamInvites';
  private readonly ACTIVITY_COLLECTION = 'teamActivity';

  /**
   * Get team members for organization
   */
  async getTeamMembers(organizationId: string): Promise<TeamMember[]> {
    try {
      const membersQuery = query(
        collection(firestore, this.MEMBERS_COLLECTION),
        where('organizationId', '==', organizationId),
        where('status', '!=', MemberStatus.REMOVED),
        orderBy('status'),
        orderBy('createdAt', 'desc')
      );

      const membersDocs = await getDocs(membersQuery);
      const members: TeamMember[] = [];

      membersDocs.forEach((doc) => {
        const data = doc.data();
        members.push({
          id: doc.id,
          userId: data.userId,
          organizationId: data.organizationId,
          email: data.email,
          name: data.name,
          role: data.role,
          permissions: data.permissions,
          status: data.status,
          invitedBy: data.invitedBy,
          invitedAt: data.invitedAt?.toDate(),
          joinedAt: data.joinedAt?.toDate(),
          lastActiveAt: data.lastActiveAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      return members;
    } catch (error) {
      console.error('Error getting team members:', error);
      throw new Error('Failed to get team members');
    }
  }

  /**
   * Get team member by user ID
   */
  async getTeamMember(userId: string, organizationId: string): Promise<TeamMember | null> {
    try {
      const memberQuery = query(
        collection(firestore, this.MEMBERS_COLLECTION),
        where('userId', '==', userId),
        where('organizationId', '==', organizationId),
        firestoreLimit(1)
      );

      const memberDocs = await getDocs(memberQuery);

      if (memberDocs.empty) {
        return null;
      }

      const data = memberDocs.docs[0].data();
      return {
        id: memberDocs.docs[0].id,
        userId: data.userId,
        organizationId: data.organizationId,
        email: data.email,
        name: data.name,
        role: data.role,
        permissions: data.permissions,
        status: data.status,
        invitedBy: data.invitedBy,
        invitedAt: data.invitedAt?.toDate(),
        joinedAt: data.joinedAt?.toDate(),
        lastActiveAt: data.lastActiveAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error getting team member:', error);
      return null;
    }
  }

  /**
   * Add team member
   */
  async addTeamMember(
    userId: string,
    organizationId: string,
    email: string,
    role: TeamRole,
    invitedBy: string,
    name?: string
  ): Promise<TeamMember> {
    try {
      const permissions = ROLE_PERMISSIONS[role];

      const member: Omit<TeamMember, 'id'> = {
        userId,
        organizationId,
        email,
        name,
        role,
        permissions,
        status: MemberStatus.ACTIVE,
        invitedBy,
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const memberRef = await addDoc(collection(firestore, this.MEMBERS_COLLECTION), {
        ...member,
        joinedAt: Timestamp.fromDate(member.joinedAt!),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Log activity
      await this.logActivity(organizationId, invitedBy, 'member_added', 'team_member', memberRef.id, {
        email,
        role,
      });

      return { ...member, id: memberRef.id };
    } catch (error) {
      console.error('Error adding team member:', error);
      throw new Error('Failed to add team member');
    }
  }

  /**
   * Update team member role
   */
  async updateMemberRole(
    memberId: string,
    newRole: TeamRole,
    updatedBy: string
  ): Promise<void> {
    try {
      const memberRef = doc(firestore, this.MEMBERS_COLLECTION, memberId);
      const permissions = ROLE_PERMISSIONS[newRole];

      await updateDoc(memberRef, {
        role: newRole,
        permissions,
        updatedAt: Timestamp.now(),
      });

      // Get member details for logging
      const memberDoc = await getDoc(memberRef);
      const memberData = memberDoc.data();

      // Log activity
      await this.logActivity(
        memberData?.organizationId,
        updatedBy,
        'role_updated',
        'team_member',
        memberId,
        { newRole }
      );
    } catch (error) {
      console.error('Error updating member role:', error);
      throw new Error('Failed to update member role');
    }
  }

  /**
   * Remove team member
   */
  async removeMember(memberId: string, removedBy: string): Promise<void> {
    try {
      const memberRef = doc(firestore, this.MEMBERS_COLLECTION, memberId);

      // Get member details before removal
      const memberDoc = await getDoc(memberRef);
      const memberData = memberDoc.data();

      // Mark as removed instead of deleting
      await updateDoc(memberRef, {
        status: MemberStatus.REMOVED,
        updatedAt: Timestamp.now(),
      });

      // Log activity
      await this.logActivity(
        memberData?.organizationId,
        removedBy,
        'member_removed',
        'team_member',
        memberId,
        { email: memberData?.email }
      );
    } catch (error) {
      console.error('Error removing member:', error);
      throw new Error('Failed to remove member');
    }
  }

  /**
   * Create team invitation
   */
  async createInvite(
    organizationId: string,
    email: string,
    role: TeamRole,
    invitedBy: string,
    invitedByName?: string
  ): Promise<TeamInvite> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const invite: Omit<TeamInvite, 'id'> = {
        organizationId,
        email: email.toLowerCase(),
        role,
        invitedBy,
        invitedByName,
        status: 'pending',
        expiresAt,
        createdAt: new Date(),
      };

      const inviteRef = await addDoc(collection(firestore, this.INVITES_COLLECTION), {
        ...invite,
        expiresAt: Timestamp.fromDate(invite.expiresAt),
        createdAt: Timestamp.now(),
      });

      // Log activity
      await this.logActivity(organizationId, invitedBy, 'invite_sent', 'team_invite', inviteRef.id, {
        email,
        role,
      });

      return { ...invite, id: inviteRef.id };
    } catch (error) {
      console.error('Error creating invite:', error);
      throw new Error('Failed to create invite');
    }
  }

  /**
   * Get pending invites for organization
   */
  async getPendingInvites(organizationId: string): Promise<TeamInvite[]> {
    try {
      const invitesQuery = query(
        collection(firestore, this.INVITES_COLLECTION),
        where('organizationId', '==', organizationId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const invitesDocs = await getDocs(invitesQuery);
      const invites: TeamInvite[] = [];

      invitesDocs.forEach((doc) => {
        const data = doc.data();
        invites.push({
          id: doc.id,
          organizationId: data.organizationId,
          email: data.email,
          role: data.role,
          invitedBy: data.invitedBy,
          invitedByName: data.invitedByName,
          status: data.status,
          expiresAt: data.expiresAt?.toDate() || new Date(),
          acceptedAt: data.acceptedAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      return invites;
    } catch (error) {
      console.error('Error getting pending invites:', error);
      return [];
    }
  }

  /**
   * Accept team invitation
   */
  async acceptInvite(inviteId: string, userId: string, userName?: string): Promise<TeamMember> {
    try {
      const inviteRef = doc(firestore, this.INVITES_COLLECTION, inviteId);
      const inviteDoc = await getDoc(inviteRef);

      if (!inviteDoc.exists()) {
        throw new Error('Invite not found');
      }

      const inviteData = inviteDoc.data();

      // Check if expired
      const expiresAt = inviteData.expiresAt?.toDate() || new Date(0);
      if (expiresAt < new Date()) {
        await updateDoc(inviteRef, {
          status: 'expired',
        });
        throw new Error('Invite has expired');
      }

      // Create team member
      const member = await this.addTeamMember(
        userId,
        inviteData.organizationId,
        inviteData.email,
        inviteData.role,
        inviteData.invitedBy,
        userName
      );

      // Update invite status
      await updateDoc(inviteRef, {
        status: 'accepted',
        acceptedAt: Timestamp.now(),
      });

      // Log activity
      await this.logActivity(
        inviteData.organizationId,
        userId,
        'invite_accepted',
        'team_invite',
        inviteId,
        { email: inviteData.email }
      );

      return member;
    } catch (error) {
      console.error('Error accepting invite:', error);
      throw error;
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvite(inviteId: string, canceledBy: string): Promise<void> {
    try {
      const inviteRef = doc(firestore, this.INVITES_COLLECTION, inviteId);
      const inviteDoc = await getDoc(inviteRef);

      if (!inviteDoc.exists()) {
        throw new Error('Invite not found');
      }

      const inviteData = inviteDoc.data();

      await deleteDoc(inviteRef);

      // Log activity
      await this.logActivity(
        inviteData.organizationId,
        canceledBy,
        'invite_canceled',
        'team_invite',
        inviteId,
        { email: inviteData.email }
      );
    } catch (error) {
      console.error('Error canceling invite:', error);
      throw new Error('Failed to cancel invite');
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    userId: string,
    organizationId: string,
    permission: keyof TeamPermissions
  ): Promise<boolean> {
    try {
      const member = await this.getTeamMember(userId, organizationId);

      if (!member || member.status !== MemberStatus.ACTIVE) {
        return false;
      }

      return member.permissions[permission] || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Get permissions for user
   */
  async getPermissions(userId: string, organizationId: string): Promise<TeamPermissions | null> {
    try {
      const member = await this.getTeamMember(userId, organizationId);

      if (!member || member.status !== MemberStatus.ACTIVE) {
        return null;
      }

      return member.permissions;
    } catch (error) {
      console.error('Error getting permissions:', error);
      return null;
    }
  }

  /**
   * Update member's last active time
   */
  async updateLastActive(userId: string, organizationId: string): Promise<void> {
    try {
      const member = await this.getTeamMember(userId, organizationId);

      if (!member || !member.id) {
        return;
      }

      const memberRef = doc(firestore, this.MEMBERS_COLLECTION, member.id);
      await updateDoc(memberRef, {
        lastActiveAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }

  /**
   * Get team activity log
   */
  async getTeamActivity(
    organizationId: string,
    limitCount: number = 50
  ): Promise<TeamActivity[]> {
    try {
      const activityQuery = query(
        collection(firestore, this.ACTIVITY_COLLECTION),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );

      const activityDocs = await getDocs(activityQuery);
      const activities: TeamActivity[] = [];

      activityDocs.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          organizationId: data.organizationId,
          userId: data.userId,
          userName: data.userName,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      return activities;
    } catch (error) {
      console.error('Error getting team activity:', error);
      return [];
    }
  }

  /**
   * Log team activity
   */
  async logActivity(
    organizationId: string,
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      // Get user name
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      const userName = userDoc.exists() ? userDoc.data().name || userDoc.data().email : undefined;

      await addDoc(collection(firestore, this.ACTIVITY_COLLECTION), {
        organizationId,
        userId,
        userName,
        action,
        resource,
        resourceId,
        details,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  /**
   * Get team member count (active members only)
   */
  async getTeamMemberCount(organizationId: string): Promise<number> {
    try {
      const members = await this.getTeamMembers(organizationId);
      return members.filter((m) => m.status === MemberStatus.ACTIVE).length;
    } catch (error) {
      console.error('Error getting team member count:', error);
      return 0;
    }
  }

  /**
   * Calculate additional user cost for billing
   */
  calculateAdditionalUserCost(memberCount: number, subscriptionTier: string): number {
    // Base subscription includes 1 user (owner)
    const additionalUsers = Math.max(0, memberCount - 1);

    const tierPricing = ADDITIONAL_USER_PRICING[subscriptionTier.toLowerCase() as keyof typeof ADDITIONAL_USER_PRICING];

    if (!tierPricing) {
      return 0;
    }

    return additionalUsers * tierPricing;
  }
}

// Export singleton instance
export const teamService = new TeamService();

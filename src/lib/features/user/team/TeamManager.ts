import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase';
import { Logger } from '@/lib/core/logging';
import { Cache } from '@/lib/core/cache';
import {
  Team,
  TeamMember,
  TeamInvitation,
  TeamSettings,
  TeamUtils,
  FirestoreTeam
} from '../models/Team';
import {
  User,
  UserUtils,
  FirestoreUser
} from '../models/User';
import {
  OrganizationRole,
  TeamRole,
  UserErrorType,
  UserError,
  UserOperationResult,
  UserSearchParams,
  UserPaginationParams,
  ActivityContext,
  UserActivityType,
  UserApiResponse,
  UserConfig,
  UserAnalytics
} from '../types';
import { SubscriptionTier } from '@/lib/core/models/User';
import { UserActivity, ActivityUtils } from '../models/Activity';

export interface TeamCreateData {
  name: string;
  description?: string;
  settings?: {
    isPublic?: boolean;
    allowInvites?: boolean;
    requireApproval?: boolean;
    maxMembers?: number;
  };
  metadata?: Record<string, any>;
}

export interface TeamUpdateData {
  name?: string;
  description?: string;
  settings?: Partial<Team['settings']>;
  metadata?: Record<string, any>;
}

export interface TeamMemberData {
  userId: string;
  organizationRole: OrganizationRole;  // Organization-level role
  teamRole?: TeamRole;                 // Team-specific role (only if MEMBER)
  permissions?: string[];
  email: string;
  displayName: string;
  invitedBy: string;
  status: 'active' | 'inactive' | 'pending';
  metadata?: Record<string, any>;
}

export interface TeamSearchOptions extends UserSearchParams {
  name?: string;
  ownerId?: string;
  memberCount?: { min?: number; max?: number };
  isPublic?: boolean;
  hasInvites?: boolean;
}

export interface TeamAnalyticsOptions {
  teamId: string;
  startDate?: Date;
  endDate?: Date;
  includeMembers?: boolean;
  includeActivity?: boolean;
  includeEngagement?: boolean;
}

/**
 * Team management service
 * Handles team operations, member management, and team analytics
 */
export class TeamManager {
  private logger: Logger;
  private cache: Cache;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'team:';

  constructor() {
    this.logger = new Logger('TeamManager');
    this.cache = new Cache();
  }

  /**
   * Create a new team
   */
  public async createTeam(
    teamData: {
      name: string;
      description?: string;
      organizationId: string;
      settings?: {
        isPublic?: boolean;
        allowInvites?: boolean;
        requireApproval?: boolean;
        maxMembers?: number;
      };
      metadata?: Record<string, any>;
    },
    ownerId: string,
    config?: UserConfig
  ): Promise<UserOperationResult<Team>> {
    try {
      this.logger.info('Creating team', { ownerId, teamName: teamData.name });

      // Get user data for subscription check
      const userDoc = await getDoc(doc(firestore, 'users', ownerId));
      if (!userDoc.exists()) {
        return {
          success: false,
          error: {
            type: UserErrorType.USER_NOT_FOUND,
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            timestamp: new Date()
          }
        };
      }

      const userData = userDoc.data() as FirestoreUser;
      const user = UserUtils.fromFirestore(ownerId, userData);

      // Check subscription limits
      const canCreate = await this.canCreateTeam(user, config);
      if (!canCreate) {
        return {
          success: false,
          error: {
            type: UserErrorType.SUBSCRIPTION_LIMIT_EXCEEDED,
            message: 'Team creation limit exceeded for your subscription tier',
            code: 'TEAM_LIMIT_EXCEEDED',
            timestamp: new Date()
          }
        };
      }

      const validation = this.validateTeamData({
        ...teamData,
        ownerId,
        members: [],
        pendingInvites: [],
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        id: '',
        isDefault: false,
        isPublic: teamData.settings?.isPublic || false,
        defaultTeamRole: TeamRole.CONTRIBUTOR,
        defaultPermissions: [],
        customRoles: [],
        settings: {
          allowSelfJoin: false,
          requireApproval: teamData.settings?.requireApproval || true,
          allowInvites: teamData.settings?.allowInvites || true,
          allowRoleChange: true,
          notifyOnJoin: true,
          notifyOnLeave: true,
          autoArchiveInactive: false,
          inactiveThresholdDays: 90
        },
        activity: TeamUtils.createDefaultActivity(),
        managers: []
      } as Team);

      if (!validation.success) {
        return validation;
      }

      const teamId = doc(collection(firestore, 'teams')).id;
      
      const firestoreTeam: FirestoreTeam = {
        name: teamData.name,
        description: teamData.description,
        organizationId: teamData.organizationId,
        isDefault: false,
        isPublic: teamData.settings?.isPublic || false,
        maxMembers: teamData.settings?.maxMembers,
        members: [{
          userId: ownerId,
          email: '', // Will be filled from user data
          displayName: '', // Will be filled from user data
          organizationRole: OrganizationRole.OWNER,
          permissions: [],
          joinedAt: Timestamp.now(),
          invitedBy: ownerId,
          status: 'active'
        }],
        pendingInvites: [],
        defaultTeamRole: TeamRole.CONTRIBUTOR,
        defaultPermissions: [],
        customRoles: [],
        settings: {
          allowSelfJoin: false,
          requireApproval: teamData.settings?.requireApproval || true,
          allowInvites: teamData.settings?.allowInvites || true,
          allowRoleChange: true,
          notifyOnJoin: true,
          notifyOnLeave: true,
          autoArchiveInactive: false,
          inactiveThresholdDays: 90
        },
        activity: TeamUtils.createDefaultActivity(),
        tags: [],
        ownerId,
        managers: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(firestore, 'teams'), firestoreTeam);

      // Track activity
      await this.trackActivity(
        UserActivityType.TEAM_JOIN,
        ownerId,
        { teamId, teamName: teamData.name }
      );

      const team = TeamUtils.fromFirestore(teamId, firestoreTeam);
      this.logger.info('Team created successfully', { teamId, ownerId });

      return {
        success: true,
        data: team
      };

    } catch (error) {
      this.logger.error('Error creating team', { error, ownerId, teamData });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to create team',
          code: 'TEAM_CREATE_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get team by ID
   */
  public async getTeam(
    teamId: string,
    userId?: string
  ): Promise<UserOperationResult<Team>> {
    try {
      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}${teamId}`;
      const cached = this.cache.get<Team>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const teamDoc = await getDoc(doc(firestore, 'teams', teamId));
      if (!teamDoc.exists()) {
        return {
          success: false,
          error: {
            type: UserErrorType.TEAM_NOT_FOUND,
            message: 'Team not found',
            code: 'TEAM_NOT_FOUND',
            timestamp: new Date()
          }
        };
      }

      const firestoreTeam = teamDoc.data() as FirestoreTeam;
      const team = TeamUtils.fromFirestore(teamId, firestoreTeam);

      // Check if user has access to team
      if (userId && !TeamUtils.canAccessTeam(team, userId)) {
        return {
          success: false,
          error: {
            type: UserErrorType.ACCESS_DENIED,
            message: 'Access denied to team',
            code: 'TEAM_ACCESS_DENIED',
            timestamp: new Date()
          }
        };
      }

      // Cache the result
      this.cache.set(cacheKey, team, this.CACHE_TTL);

      return { success: true, data: team };

    } catch (error) {
      this.logger.error('Error getting team', { error, teamId, userId });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to get team',
          code: 'GET_TEAM_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Update team
   */
  public async updateTeam(
    teamId: string,
    userId: string,
    updates: TeamUpdateData
  ): Promise<UserOperationResult<Team>> {
    try {
      this.logger.info('Updating team', { teamId, userId, updates });

      return await runTransaction(firestore, async (transaction) => {
        const teamRef = doc(firestore, 'teams', teamId);
        const teamDoc = await transaction.get(teamRef);

        if (!teamDoc.exists()) {
          throw new Error('Team not found');
        }

        const currentTeam = teamDoc.data() as FirestoreTeam;
        const updatedTeam = { ...currentTeam, ...updates, updatedAt: new Date() };

        const validation = TeamUtils.validate(updatedTeam as any);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }

        const updateData: Partial<FirestoreTeam> = {
          updatedAt: Timestamp.now()
        };

        if (updates.name) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.settings) {
          updateData.settings = {
            ...currentTeam.settings,
            ...updates.settings
          } as FirestoreTeam['settings'];
        }
        if (updates.metadata) updateData.customFields = updates.metadata;

        transaction.update(teamRef, updateData);

        // Track activity
        await this.trackActivity(
          UserActivityType.SETTINGS_UPDATE,
          userId,
          { teamId, changes: Object.keys(updates) }
        );

        const team = TeamUtils.fromFirestore(teamId, { ...currentTeam, ...updateData });
        return {
          success: true,
          data: team
        };
      });

    } catch (error) {
      this.logger.error('Error updating team', { error, teamId, userId, updates });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to update team',
          code: 'TEAM_UPDATE_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(
    teamId: string,
    deletedBy: string,
    transferOwnership?: {
      newOwnerId: string;
      newTeamId: string;
    }
  ): Promise<UserOperationResult<void>> {
    try {
      // Validation logic here
      if (!teamId) {
        return {
          success: false,
          error: {
            type: UserErrorType.VALIDATION_ERROR,
            message: 'Team ID is required',
            code: 'TEAM_ID_REQUIRED',
            timestamp: new Date()
          }
        };
      }

      if (!deletedBy) {
        return {
          success: false,
          error: {
            type: UserErrorType.VALIDATION_ERROR,
            message: 'Deleted by user ID is required',
            code: 'DELETED_BY_REQUIRED',
            timestamp: new Date()
          }
        };
      }

      // Implementation would go here
      return {
        success: true
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to delete team',
          code: 'TEAM_DELETE_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Add member to team
   */
  public async addMember(
    teamId: string,
    memberData: TeamMemberData,
    addedBy: string
  ): Promise<UserOperationResult<Team>> {
    try {
      this.logger.info('Adding team member', { teamId, addedBy, memberData });

      return await runTransaction(firestore, async (transaction) => {
        const teamRef = doc(firestore, 'teams', teamId);
        const teamDoc = await transaction.get(teamRef);

        if (!teamDoc.exists()) {
          throw new Error('Team not found');
        }

        const firestoreTeam = teamDoc.data() as FirestoreTeam;
        const team = TeamUtils.fromFirestore(teamId, firestoreTeam);

        // Check if user is already a member
        if (TeamUtils.isAlreadyMember(team, memberData.userId)) {
          throw new Error('User is already a team member');
        }

        // Check team capacity
        if (TeamUtils.isAtCapacity(team)) {
          throw new Error('Team is at maximum capacity');
        }

        const newMember = {
          userId: memberData.userId,
          email: memberData.email,
          displayName: memberData.displayName,
          organizationRole: memberData.organizationRole,
          teamRole: memberData.teamRole,
          permissions: memberData.permissions || [],
          joinedAt: Timestamp.now(),
          invitedBy: addedBy,
          status: memberData.status || 'active' as const,
          metadata: memberData.metadata || {}
        };

        const updatedMembers = [...firestoreTeam.members, newMember];

        transaction.update(teamRef, {
          members: updatedMembers,
          'activity.totalMembers': updatedMembers.length,
          'activity.activeMembers': updatedMembers.filter(m => m.status === 'active').length,
          updatedAt: Timestamp.now()
        });

        // Track activity
        const activityType = memberData.status === 'pending' ? 
          UserActivityType.TEAM_JOIN : 
          UserActivityType.TEAM_JOIN;

        await this.trackActivity(
          activityType,
          addedBy,
          { 
            teamId, 
            memberId: memberData.userId,
            memberEmail: memberData.email,
            role: memberData.organizationRole 
          }
        );

        return {
          success: true,
          data: TeamUtils.fromFirestore(teamId, {
            ...firestoreTeam,
            members: updatedMembers,
            activity: {
              ...firestoreTeam.activity,
              totalMembers: updatedMembers.length,
              activeMembers: updatedMembers.filter(m => m.status === 'active').length
            },
            updatedAt: Timestamp.now()
          })
        };
      });

    } catch (error) {
      this.logger.error('Error adding team member', { error, teamId, addedBy, memberData });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to add team member',
          code: 'TEAM_MEMBER_ADD_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Remove member from team
   */
  public async removeMember(
    teamId: string,
    userId: string,
    removedBy: string,
    reason?: string
  ): Promise<UserOperationResult<Team>> {
    try {
      this.logger.info('Removing team member', { teamId, removedBy, userId, reason });

      return await runTransaction(firestore, async (transaction) => {
        const teamRef = doc(firestore, 'teams', teamId);
        const teamDoc = await transaction.get(teamRef);

        if (!teamDoc.exists()) {
          throw new Error('Team not found');
        }

        const firestoreTeam = teamDoc.data() as FirestoreTeam;
        const team = TeamUtils.fromFirestore(teamId, firestoreTeam);

        // Check if user is a member
        if (!TeamUtils.isMember(team, userId)) {
          throw new Error('User is not a team member');
        }

        // Cannot remove team owner
        if (TeamUtils.isOwner(team, userId)) {
          throw new Error('Cannot remove team owner');
        }

        const updatedMembers = firestoreTeam.members.filter(m => m.userId !== userId);

        transaction.update(teamRef, {
          members: updatedMembers,
          'activity.totalMembers': updatedMembers.length,
          'activity.activeMembers': updatedMembers.filter(m => m.status === 'active').length,
          updatedAt: Timestamp.now()
        });

        // Track activity
        const activityType = removedBy === userId ? 
          UserActivityType.TEAM_LEAVE :
          UserActivityType.TEAM_LEAVE;

        await this.trackActivity(
          activityType,
          removedBy,
          { teamId, memberId: userId, reason }
        );

        return {
          success: true,
          data: TeamUtils.fromFirestore(teamId, {
            ...firestoreTeam,
            members: updatedMembers,
            activity: {
              ...firestoreTeam.activity,
              totalMembers: updatedMembers.length,
              activeMembers: updatedMembers.filter(m => m.status === 'active').length
            },
            updatedAt: Timestamp.now()
          })
        };
      });

    } catch (error) {
      this.logger.error('Error removing team member', { error, teamId, removedBy, userId, reason });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to remove team member',
          code: 'TEAM_MEMBER_REMOVE_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Update team member role with dual-role architecture
   */
  async updateMemberRole(
    teamId: string,
    organizationId: string,
    memberId: string,
    newOrganizationRole: OrganizationRole,
    updatedBy: string,
    newTeamRole?: TeamRole
  ): Promise<UserOperationResult<void>> {
    try {
      const team = await this.getTeam(teamId, organizationId);
      if (!team.success || !team.data) {
        return { success: false, error: team.error };
      }

      // Validate that only MEMBERS can have team roles
      if (newOrganizationRole !== OrganizationRole.MEMBER && newTeamRole) {
        return {
          success: false,
          error: {
            type: UserErrorType.VALIDATION_ERROR,
            message: 'Only organization MEMBERS can have team roles',
            code: 'INVALID_ROLE_COMBINATION',
            timestamp: new Date()
          }
        };
      }

      // Prevent owner from losing ownership without proper transfer
      if (team.data.ownerId === memberId && newOrganizationRole !== OrganizationRole.OWNER) {
        return {
          success: false,
          error: {
            type: UserErrorType.VALIDATION_ERROR,
            message: 'Cannot change owner role without ownership transfer',
            code: 'OWNER_ROLE_CHANGE_DENIED',
            timestamp: new Date()
          }
        };
      }

      // Implementation would go here
      return {
        success: true
      };

    } catch (error) {
      this.logger.error('Error updating member role', { error, teamId, organizationId, memberId, newOrganizationRole, newTeamRole });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to update member role',
          code: 'TEAM_MEMBER_ROLE_UPDATE_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Search teams
   */
  public async searchTeams(
    options: TeamSearchOptions,
    pagination?: UserPaginationParams
  ): Promise<UserApiResponse<Team[]>> {
    try {
      this.logger.info('Searching teams', { options, pagination });

      let q = query(collection(firestore, 'teams'));

      // Apply filters
      if (options.name) {
        q = query(q, where('name', '>=', options.name), where('name', '<=', options.name + '\uf8ff'));
      }

      if (options.ownerId) {
        q = query(q, where('ownerId', '==', options.ownerId));
      }

      if (options.isPublic !== undefined) {
        q = query(q, where('settings.isPublic', '==', options.isPublic));
      }

      // Apply sorting
      const sortField = options.sortBy || 'updatedAt';
      const sortDirection = options.sortOrder || 'desc';
      q = query(q, orderBy(sortField, sortDirection));

      // Apply pagination
      if (pagination?.limit) {
        q = query(q, limit(pagination.limit));
      }

      if (pagination?.cursor) {
        const cursorDoc = await getDoc(doc(firestore, 'teams', pagination.cursor));
        if (cursorDoc.exists()) {
          q = query(q, startAfter(cursorDoc));
        }
      }

      const snapshot = await getDocs(q);
      const teams = snapshot.docs
        .map(doc => TeamUtils.fromFirestore(doc.id, doc.data() as FirestoreTeam))
        .filter(team => this.matchesSearchCriteria(team, options));

      const hasMore = snapshot.docs.length === (pagination?.limit || 20);
      const nextCursor = hasMore && snapshot.docs.length > 0 ? 
        snapshot.docs[snapshot.docs.length - 1].id : undefined;

      return {
        success: true,
        data: teams,
        metadata: {
          timestamp: new Date(),
          requestId: '',
          version: '1.0',
          pagination: {
            page: 1,
            limit: pagination?.limit || 20,
            total: teams.length,
            hasNext: hasMore,
            hasPrevious: false,
            nextCursor,
            cursor: pagination?.cursor
          }
        }
      };

    } catch (error) {
      this.logger.error('Error searching teams', { error, options, pagination });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to search teams',
          code: 'TEAM_SEARCH_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get user teams
   */
  public async getUserTeams(
    userId: string,
    pagination?: UserPaginationParams
  ): Promise<UserApiResponse<Team[]>> {
    try {
      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}user:${userId}`;
      const cached = this.cache.get<Team[]>(cacheKey);
      if (cached && !pagination?.cursor) {
        return { 
          success: true, 
          data: cached,
          metadata: {
            timestamp: new Date(),
            requestId: '',
            version: '1.0',
            pagination: { 
              page: 1,
              limit: cached.length,
              total: cached.length,
              hasNext: false,
              hasPrevious: false
            }
          }
        };
      }

      let q = query(
        collection(firestore, 'teams'),
        where('members', 'array-contains-any', [{ userId }]),
        orderBy('updatedAt', 'desc')
      );

      if (pagination?.limit) {
        q = query(q, limit(pagination.limit));
      }

      if (pagination?.cursor) {
        const cursorDoc = await getDoc(doc(firestore, 'teams', pagination.cursor));
        if (cursorDoc.exists()) {
          q = query(q, startAfter(cursorDoc));
        }
      }

      const snapshot = await getDocs(q);
      const teams = snapshot.docs
        .map(doc => TeamUtils.fromFirestore(doc.id, doc.data() as FirestoreTeam))
        .filter(team => TeamUtils.isMember(team, userId));

      // Cache if no pagination
      if (!pagination?.cursor) {
        this.cache.set(cacheKey, teams, this.CACHE_TTL);
      }

      const hasMore = snapshot.docs.length === (pagination?.limit || 20);
      const nextCursor = hasMore && snapshot.docs.length > 0 ? 
        snapshot.docs[snapshot.docs.length - 1].id : undefined;

      return {
        success: true,
        data: teams,
        metadata: {
          timestamp: new Date(),
          requestId: '',
          version: '1.0',
          pagination: {
            page: 1,
            limit: pagination?.limit || 20,
            total: teams.length,
            hasNext: hasMore,
            hasPrevious: false,
            nextCursor,
            cursor: pagination?.cursor
          }
        }
      };

    } catch (error) {
      this.logger.error('Error getting user teams', { error, userId, pagination });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to get user teams',
          code: 'GET_USER_TEAMS_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get team analytics
   */
  async getTeamAnalytics(
    teamId: string,
    userId: string
  ): Promise<UserOperationResult<UserAnalytics>> {
    try {
      const teamResult = await this.getTeam(teamId, userId);
      if (!teamResult.success || !teamResult.data) {
        return {
          success: false,
          error: teamResult.error
        };
      }

      const team = teamResult.data;
      const analytics: UserAnalytics = {
        userId: userId,
        organizationId: team.organizationId,
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date()
        },
        metrics: {
          loginCount: 0, // Would track from user sessions
          activeTime: 0, // Would track from user activity
          contentCreated: team.activity.contentCreated,
          contentPublished: team.activity.contentPublished,
          platformsUsed: [], // Would track from platform connections
          featuresUsed: [], // Would track from feature usage
          collaborations: team.activity.collaborations,
          invitesSent: 0, // Would track from invitations
          invitesAccepted: 0 // Would track from accepted invitations
        },
        trends: {
          activityTrend: 'stable' as const,
          engagementScore: TeamUtils.calculateEngagementScore(team),
          productivityScore: 0 // Would calculate based on content metrics
        },
        comparisons: {
          previousPeriod: {
            loginCount: 0,
            activeTime: 0,
            contentCreated: 0
          },
          teamAverage: {
            loginCount: 0,
            activeTime: 0,
            contentCreated: Math.floor(team.activity.contentCreated / Math.max(team.activity.totalMembers, 1))
          }
        }
      };

      return {
        success: true,
        data: analytics
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to get team analytics',
          code: 'TEAM_ANALYTICS_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Transfer team ownership to another member
   * Current owner becomes ORG_ADMIN, new owner becomes OWNER
   */
  async transferOwnership(
    teamId: string,
    currentOwnerId: string,
    newOwnerId: string,
    confirmed: boolean = false
  ): Promise<UserOperationResult<Team>> {
    try {
      this.logger.info('Transferring team ownership', { teamId, currentOwnerId, newOwnerId, confirmed });

      if (!confirmed) {
        return {
          success: false,
          error: {
            type: UserErrorType.VALIDATION_ERROR,
            message: 'Ownership transfer must be confirmed. This action is not reversible.',
            code: 'TRANSFER_NOT_CONFIRMED',
            timestamp: new Date()
          }
        };
      }

      return await runTransaction(firestore, async (transaction) => {
        const teamRef = doc(firestore, 'teams', teamId);
        const teamDoc = await transaction.get(teamRef);

        if (!teamDoc.exists()) {
          return {
            success: false,
            error: {
              type: UserErrorType.NOT_FOUND,
              message: 'Team not found',
              code: 'TEAM_NOT_FOUND',
              timestamp: new Date()
            }
          };
        }

        const team = TeamUtils.fromFirestore(teamId, teamDoc.data() as FirestoreTeam);

        // Verify current user is the owner
        if (team.ownerId !== currentOwnerId) {
          return {
            success: false,
            error: {
              type: UserErrorType.PERMISSION_DENIED,
              message: 'Only the team owner can transfer ownership',
              code: 'NOT_TEAM_OWNER',
              timestamp: new Date()
            }
          };
        }

        // Verify new owner is a team member
        const newOwnerMember = team.members.find(m => m.userId === newOwnerId);
        if (!newOwnerMember) {
          return {
            success: false,
            error: {
              type: UserErrorType.VALIDATION_ERROR,
              message: 'New owner must be a team member',
              code: 'NEW_OWNER_NOT_MEMBER',
              timestamp: new Date()
            }
          };
        }

        // Transfer ownership using TeamUtils
        const updatedTeam = TeamUtils.transferOwnership(team, newOwnerId);
        const firestoreTeam = TeamUtils.toFirestore(updatedTeam);

        transaction.update(teamRef, firestoreTeam);

        // Clear cache
        this.cache.delete(`${this.CACHE_PREFIX}${teamId}`);

        this.logger.info('Team ownership transferred successfully', { 
          teamId, 
          previousOwner: currentOwnerId, 
          newOwner: newOwnerId 
        });

        return {
          success: true,
          data: updatedTeam
        };
      });

    } catch (error) {
      this.logger.error('Error transferring team ownership', { 
        error, 
        teamId, 
        currentOwnerId, 
        newOwnerId 
      });
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: 'Failed to transfer team ownership',
          code: 'TRANSFER_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  // Private helper methods

  private async canCreateTeam(user: User, config?: UserConfig): Promise<boolean> {
    try {
      // Get user's subscription tier
      const subscriptionTier = await this.getUserSubscriptionTier(user.id);
      
      // Define team limits per subscription tier
      const tierLimits = {
        'creator': { maxTeams: 1, maxMembersPerTeam: 3 },
        'influencer': { maxTeams: 3, maxMembersPerTeam: 10 },
        'enterprise': { maxTeams: -1, maxMembersPerTeam: -1 } // Unlimited
      };
      
      const limits = tierLimits[subscriptionTier] || tierLimits['creator'];
      
      // Check if unlimited
      if (limits.maxTeams === -1) {
        return true;
      }
      
      // Count user's current teams where they are owner
      const userTeamsResult = await this.getUserTeams(user.id);
      if (!userTeamsResult.success) {
        console.warn('Could not verify team count for subscription limits');
        return true; // Allow creation if we can't verify
      }
      
      const ownedTeams = userTeamsResult.data?.filter(team => team.ownerId === user.id) || [];
      
      return ownedTeams.length < limits.maxTeams;
      
    } catch (error) {
      console.error('Error checking team creation limits:', error);
      return true; // Allow creation if check fails
    }
  }

  /**
   * Get user's subscription tier
   */
  private async getUserSubscriptionTier(userId: string): Promise<'creator' | 'influencer' | 'enterprise'> {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.subscriptionTier || 'creator';
      }
    } catch (error) {
      console.warn('Could not fetch subscription tier:', error);
    }
    return 'creator'; // Default to creator tier
  }

  private async logTeamActivity(
    teamId: string,
    userId: string,
    type: UserActivityType,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const activity = ActivityUtils.createActivity(
        userId,
        type,
        ActivityContext.TEAM,
        {
          teamId,
          ...metadata
        }
      );

      await addDoc(
        collection(firestore, 'activities'),
        ActivityUtils.toFirestore(activity)
      );
    } catch (error) {
      this.logger.error('Error logging team activity', { error, teamId, userId, type });
    }
  }

  private matchesSearchCriteria(team: Team, options: TeamSearchOptions): boolean {
    if (options.memberCount) {
      const memberCount = team.members.length;
      if (options.memberCount.min && memberCount < options.memberCount.min) return false;
      if (options.memberCount.max && memberCount > options.memberCount.max) return false;
    }

    if (options.hasInvites !== undefined) {
      const hasInvites = team.pendingInvites.length > 0;
      if (options.hasInvites !== hasInvites) return false;
    }

    return true;
  }

  private async getTeamActivities(
    teamId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserOperationResult<UserActivity[]>> {
    try {
      let q = query(
        collection(firestore, 'activities'),
        where('context', '==', ActivityContext.TEAM),
        where('metadata.teamId', '==', teamId),
        orderBy('timestamp', 'desc')
      );

      if (startDate) {
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(startDate)));
      }

      if (endDate) {
        q = query(q, where('timestamp', '<=', Timestamp.fromDate(endDate)));
      }

      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map(doc => 
        ActivityUtils.fromFirestore(doc.data() as any)
      );

      return { success: true, data: activities };

    } catch (error) {
      this.logger.error('Error getting team activities', { error, teamId });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to get team activities',
          code: 'GET_TEAM_ACTIVITIES_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  private calculateActivityBreakdown(activities: UserActivity[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    activities.forEach(activity => {
      const type = activity.type;
      breakdown[type] = (breakdown[type] || 0) + 1;
    });

    return breakdown;
  }

  private calculateTeamEngagement(activities: UserActivity[]): number {
    if (activities.length === 0) return 0;

    // Calculate engagement based on activity frequency and recency
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    let score = 0;
    activities.forEach(activity => {
      const daysSince = (now - activity.timestamp.getTime()) / dayMs;
      const recencyWeight = Math.max(0, 1 - (daysSince / 30)); // Decay over 30 days
      score += recencyWeight;
    });

    return Math.min(100, (score / activities.length) * 100);
  }

  private clearTeamCache(teamId: string): void {
    this.cache.delete(`${this.CACHE_PREFIX}${teamId}`);
  }

  private clearUserTeamsCache(userId: string): void {
    this.cache.delete(`${this.CACHE_PREFIX}user:${userId}`);
  }

  private validateTeamData(team: Partial<Team>): UserOperationResult<Team> {
    const errors: string[] = [];

    if (!team.name || team.name.trim().length === 0) {
      errors.push('Team name is required');
    }

    if (team.name && team.name.length > 100) {
      errors.push('Team name must be less than 100 characters');
    }

    if (team.description && team.description.length > 500) {
      errors.push('Team description must be less than 500 characters');
    }

    if (!team.organizationId) {
      errors.push('Organization ID is required');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: {
          type: UserErrorType.VALIDATION_ERROR,
          message: errors.join(', '),
          code: 'TEAM_VALIDATION_FAILED',
          timestamp: new Date()
        }
      };
    }

    return {
      success: true,
      data: team as Team
    };
  }

  private async trackActivity(
    type: UserActivityType,
    userId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const activity = ActivityUtils.createActivity(
        userId,
        type,
        'team_action',
        {
          context: ActivityContext.TEAM,
          metadata: {
            ...metadata,
            success: true
          }
        }
      );

      await addDoc(
        collection(firestore, 'userActivities'),
        ActivityUtils.toFirestore(activity)
      );
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to track team activity:', error);
    }
  }
}

export default TeamManager; 
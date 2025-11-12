import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from '../../firebase';
import { 
  Team, 
  FirestoreTeam, 
  TeamUtils,
  User,
  UserActivity,
  ActivityUtils
} from '../models';
import {
  UserError,
  UserErrorType,
  UserApiResponse,
  UserSearchParams,
  UserPaginationParams,
  TeamInviteStatus,
  UserActivityType,
  ActivityContext,
  UserOperationResult,
  UserConfig,
  OrganizationRole,
  TeamRole
} from '../types';

// Simple logger implementation
class SimpleLogger {
  info(message: string, data?: any) {
    console.log(`[INFO] ${message}`, data);
  }
  error(message: string, data?: any) {
    console.error(`[ERROR] ${message}`, data);
  }
  warn(message: string, data?: any) {
    console.warn(`[WARN] ${message}`, data);
  }
}

// Simple cache implementation
class SimpleCache {
  private cache = new Map<string, { data: any; expires: number }>();

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  set(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export interface TeamInviteData {
  teamId: string;
  inviteeEmail: string;
  inviteeId?: string;
  organizationRole: OrganizationRole;  // Organization-level role being invited to
  teamRole?: TeamRole;                 // Team-specific role (only if inviting as MEMBER)
  message?: string;
  permissions?: string[];
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  inviterId: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeId?: string;
  organizationRole: OrganizationRole;  // Organization-level role being invited to
  teamRole?: TeamRole;                 // Team-specific role (only if inviting as MEMBER)
  status: TeamInviteStatus;
  message?: string;
  permissions: string[];
  token: string;
  expiresAt: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  respondedAt?: Date;
}

export interface FirestoreTeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  inviterId: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeId?: string;
  organizationRole: OrganizationRole;  // Organization-level role being invited to
  teamRole?: TeamRole;                 // Team-specific role (only if inviting as MEMBER)
  status: TeamInviteStatus;
  message?: string;
  permissions: string[];
  token: string;
  expiresAt: Timestamp;
  metadata: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  respondedAt?: Timestamp;
}

export interface InviteSearchOptions {
  teamId?: string;
  inviterId?: string;
  inviteeEmail?: string;
  inviteeId?: string;
  status?: TeamInviteStatus;
  organizationRole?: OrganizationRole;
  teamRole?: TeamRole;
  isExpired?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'expiresAt';
  sortOrder?: 'asc' | 'desc';
}

export interface InviteResponse {
  accept: boolean;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Team invitation interface with dual-role architecture
 */
export interface TeamInvitation {
  id: string;
  teamId: string;
  organizationId: string;
  email: string;
  organizationRole: OrganizationRole;  // Organization-level role being invited to
  teamRole?: TeamRole;                 // Team-specific role (only if inviting as MEMBER)
  invitedBy: string;
  invitedByName: string;
  message?: string;
  token: string;
  status: TeamInviteStatus;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
}

/**
 * Firestore representation of team invitation
 */
export interface FirestoreTeamInvitation {
  teamId: string;
  organizationId: string;
  email: string;
  organizationRole: OrganizationRole;  // Organization-level role being invited to
  teamRole?: TeamRole;                 // Team-specific role (only if inviting as MEMBER)
  invitedBy: string;
  invitedByName: string;
  message?: string;
  token: string;
  status: TeamInviteStatus;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  acceptedAt?: Timestamp;
  declinedAt?: Timestamp;
}

/**
 * Invitation data for creating new invitations
 */
export interface InvitationData {
  email: string;
  organizationRole: OrganizationRole;  // Organization-level role
  teamRole?: TeamRole;                 // Team-specific role (only if inviting as MEMBER)
  message?: string;
}

export class InviteManager {
  private static instance: InviteManager;
  private cache: SimpleCache;
  private logger: SimpleLogger;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_PREFIX = 'invite:';
  private readonly DEFAULT_EXPIRY_DAYS = 7;

  private constructor() {
    this.cache = new SimpleCache();
    this.logger = new SimpleLogger();
  }

  public static getInstance(): InviteManager {
    if (!InviteManager.instance) {
      InviteManager.instance = new InviteManager();
    }
    return InviteManager.instance;
  }

  /**
   * Send team invitation
   */
  public async sendInvite(
    inviterId: string,
    inviteData: TeamInviteData,
    config?: UserConfig
  ): Promise<UserOperationResult<TeamInvite>> {
    try {
      this.logger.info('Sending team invite', { inviterId, inviteData });

      // Validate invite data
      const validation = this.validateInviteData(inviteData);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            type: UserErrorType.VALIDATION_ERROR,
            message: validation.errors.join(', '),
            code: 'INVITE_VALIDATION_FAILED',
            timestamp: new Date()
          }
        };
      }

      return await runTransaction(firestore, async (transaction) => {
        // Get team
        const teamRef = doc(firestore, 'teams', inviteData.teamId);
        const teamDoc = await transaction.get(teamRef);

        if (!teamDoc.exists()) {
          throw new Error('Team not found');
        }

        const firestoreTeam = teamDoc.data() as FirestoreTeam;
        const team = TeamUtils.fromFirestore(inviteData.teamId, firestoreTeam);

        // Check permissions
        if (!TeamUtils.canManageMembers(team, inviterId)) {
          throw new Error('Access denied');
        }

        // Check if user is already a member
        if (TeamUtils.isMemberByEmail(team, inviteData.inviteeEmail)) {
          throw new Error('User is already a team member');
        }

        // Check for existing pending invite
        const existingInvite = team.pendingInvites.find(
          inv => inv.email === inviteData.inviteeEmail && 
                 inv.status === TeamInviteStatus.PENDING
        );

        if (existingInvite) {
          throw new Error('Pending invitation already exists for this email');
        }

        // Check team limits (use maxMembers from team root level)
        if (team.maxMembers && team.members.length >= team.maxMembers) {
          throw new Error('Team member limit reached');
        }

        // Get inviter details
        const inviterRef = doc(firestore, 'users', inviterId);
        const inviterDoc = await transaction.get(inviterRef);

        if (!inviterDoc.exists()) {
          throw new Error('Inviter not found');
        }

        const inviter = inviterDoc.data() as User;

        // Check if invitee exists
        let inviteeId: string | undefined;
        const usersQuery = query(
          collection(firestore, 'users'),
          where('email', '==', inviteData.inviteeEmail)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        if (!usersSnapshot.empty) {
          inviteeId = usersSnapshot.docs[0].id;
        }

        const inviteId = doc(collection(firestore, 'invites')).id;
        const now = Timestamp.now();
        const expiresAt = inviteData.expiresAt || 
          new Date(Date.now() + this.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        const invite: FirestoreTeamInvite = {
          id: inviteId,
          teamId: inviteData.teamId,
          teamName: team.name,
          inviterId,
          inviterName: inviter.displayName || inviter.email,
          inviterEmail: inviter.email,
          inviteeEmail: inviteData.inviteeEmail,
          inviteeId,
          organizationRole: inviteData.organizationRole,
          teamRole: inviteData.teamRole,
          status: TeamInviteStatus.PENDING,
          message: inviteData.message,
          permissions: inviteData.permissions || [],
          token: this.generateInviteToken(),
          expiresAt: Timestamp.fromDate(expiresAt),
          metadata: inviteData.metadata || {},
          createdAt: now,
          updatedAt: now
        };

        // Create invite document
        transaction.set(doc(firestore, 'invites', inviteId), invite);

        // Update team pending invites
        const updatedPendingInvites = [...firestoreTeam.pendingInvites, {
          id: inviteId,
          email: inviteData.inviteeEmail,
          organizationRole: inviteData.organizationRole,
          teamRole: inviteData.teamRole,
          permissions: inviteData.permissions || [],
          invitedBy: inviterId,
          invitedByName: inviter.displayName || inviter.email,
          status: TeamInviteStatus.PENDING,
          token: invite.token,
          message: inviteData.message,
          createdAt: now.toDate(),
          expiresAt: expiresAt
        }];

        const updatedActivity = {
          ...firestoreTeam.activity,
          pendingInvites: firestoreTeam.activity.pendingInvites + 1,
          lastActivity: now
        };

        transaction.update(teamRef, {
          pendingInvites: updatedPendingInvites,
          activity: updatedActivity,
          updatedAt: now
        });

        // Log activity
        await this.logInviteActivity(
          inviteId,
          inviterId,
          UserActivityType.TEAM_INVITE_SENT,
          {
            teamId: inviteData.teamId,
            teamName: team.name,
            inviteeEmail: inviteData.inviteeEmail,
            organizationRole: inviteData.organizationRole,
            teamRole: inviteData.teamRole
          }
        );

        // Clear cache
        this.clearInviteCache(inviteId);
        this.clearTeamInvitesCache(inviteData.teamId);
        this.clearUserInvitesCache(inviteData.inviteeEmail);

        const result = this.fromFirestore(invite);
        this.logger.info('Team invite sent successfully', { inviteId, inviterId });

        return {
          success: true,
          data: result
        };
      });

    } catch (error) {
      this.logger.error('Error sending team invite', { error, inviterId, inviteData });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to send team invite',
          code: 'INVITE_SEND_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get invitation by ID
   */
  public async getInvite(
    inviteId: string,
    userId?: string
  ): Promise<UserOperationResult<TeamInvite>> {
    try {
      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}${inviteId}`;
      const cached = this.cache.get(cacheKey) as TeamInvite | null;
      if (cached) {
        return { success: true, data: cached };
      }

      const inviteDoc = await getDoc(doc(firestore, 'invites', inviteId));
      if (!inviteDoc.exists()) {
        return {
          success: false,
          error: {
            type: UserErrorType.INVITE_NOT_FOUND,
            message: 'Invitation not found',
            code: 'INVITE_NOT_FOUND',
            timestamp: new Date()
          }
        };
      }

      const firestoreInvite = inviteDoc.data() as FirestoreTeamInvite;
      const invite = this.fromFirestore(firestoreInvite);

      // Check if user has access to invite
      if (userId && !this.canAccessInvite(invite, userId)) {
        return {
          success: false,
          error: {
            type: UserErrorType.ACCESS_DENIED,
            message: 'Access denied to invitation',
            code: 'INVITE_ACCESS_DENIED',
            timestamp: new Date()
          }
        };
      }

      // Cache the result
      this.cache.set(cacheKey, invite, this.CACHE_TTL);

      return { success: true, data: invite };

    } catch (error) {
      this.logger.error('Error getting invite', { error, inviteId, userId });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to get invitation',
          code: 'INVITE_GET_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get invitation by token
   */
  public async getInviteByToken(
    token: string
  ): Promise<UserOperationResult<TeamInvite>> {
    try {
      const q = query(
        collection(firestore, 'invites'),
        where('token', '==', token),
        where('status', '==', TeamInviteStatus.PENDING)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return {
          success: false,
          error: {
            type: UserErrorType.INVITE_NOT_FOUND,
            message: 'Invalid or expired invitation token',
            code: 'INVALID_INVITE_TOKEN',
            timestamp: new Date()
          }
        };
      }

      const firestoreInvite = snapshot.docs[0].data() as FirestoreTeamInvite;
      const invite = this.fromFirestore(firestoreInvite);

      // Check if invite is expired
      if (this.isInviteExpired(invite)) {
        return {
          success: false,
          error: {
            type: UserErrorType.INVITE_EXPIRED,
            message: 'Invitation has expired',
            code: 'INVITE_EXPIRED',
            timestamp: new Date()
          }
        };
      }

      return { success: true, data: invite };

    } catch (error) {
      this.logger.error('Error getting invite by token', { error, token });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to get invitation',
          code: 'INVITE_TOKEN_GET_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Respond to invitation
   */
  public async respondToInvite(
    inviteId: string,
    userId: string,
    response: InviteResponse
  ): Promise<UserOperationResult<TeamInvite>> {
    try {
      this.logger.info('Responding to invite', { inviteId, userId, response });

      return await runTransaction(firestore, async (transaction) => {
        const inviteRef = doc(firestore, 'invites', inviteId);
        const inviteDoc = await transaction.get(inviteRef);

        if (!inviteDoc.exists()) {
          throw new Error('Invitation not found');
        }

        const firestoreInvite = inviteDoc.data() as FirestoreTeamInvite;
        const invite = this.fromFirestore(firestoreInvite);

        // Check if user can respond to invite
        if (!this.canRespondToInvite(invite, userId)) {
          throw new Error('Access denied');
        }

        // Check if invite is still pending
        if (invite.status !== TeamInviteStatus.PENDING) {
          throw new Error('Invitation is no longer pending');
        }

        // Check if invite is expired
        if (this.isInviteExpired(invite)) {
          throw new Error('Invitation has expired');
        }

        const now = Timestamp.now();
        const newStatus = response.accept ? 
          TeamInviteStatus.ACCEPTED : 
          TeamInviteStatus.DECLINED;

        // Update invite
        const updateData: Partial<FirestoreTeamInvite> = {
          status: newStatus,
          respondedAt: now,
          updatedAt: now,
          metadata: {
            ...firestoreInvite.metadata,
            ...response.metadata,
            responseMessage: response.message
          }
        };

        transaction.update(inviteRef, updateData);

        // Update team
        const teamRef = doc(firestore, 'teams', invite.teamId);
        const teamDoc = await transaction.get(teamRef);

        if (teamDoc.exists()) {
          const firestoreTeam = teamDoc.data() as FirestoreTeam;
          
          // Update team pending invites
          const updatedPendingInvites = firestoreTeam.pendingInvites.map(inv => {
            if (inv.id === inviteId) {
              return { ...inv, status: newStatus };
            }
            return inv;
          });

          let teamUpdates: any = {
            pendingInvites: updatedPendingInvites,
            activity: {
              ...firestoreTeam.activity,
              pendingInvites: Math.max(0, firestoreTeam.activity.pendingInvites - 1),
              lastActivity: now
            },
            updatedAt: now
          };

          // If accepted, add user as team member
          if (response.accept) {
            const newMember = {
              userId,
              email: invite.inviteeEmail,
              displayName: await this.resolveUserDisplayName(userId, invite.inviteeEmail),
              organizationRole: invite.organizationRole,
              teamRole: invite.teamRole,
              joinedAt: now,
              invitedBy: invite.inviterId,
              permissions: invite.permissions,
              status: 'active' as const
            };

            teamUpdates.members = [...firestoreTeam.members, newMember];
            teamUpdates.activity = {
              ...teamUpdates.activity,
              totalMembers: firestoreTeam.members.length + 1,
              activeMembers: firestoreTeam.members.filter(m => m.status === 'active').length + 1
            };
          }

          transaction.update(teamRef, teamUpdates);
        }

        // Log activity
        const activityType = response.accept ? 
          UserActivityType.TEAM_INVITE_ACCEPTED : 
          UserActivityType.TEAM_INVITE_DECLINED;

        await this.logInviteActivity(
          inviteId,
          userId,
          activityType,
          {
            teamId: invite.teamId,
            teamName: invite.teamName,
            inviterId: invite.inviterId,
            organizationRole: invite.organizationRole,
            teamRole: invite.teamRole,
            responseMessage: response.message
          }
        );

        // Clear cache
        this.clearInviteCache(inviteId);
        this.clearTeamInvitesCache(invite.teamId);
        this.clearUserInvitesCache(invite.inviteeEmail);

        const result = this.fromFirestore({
          ...firestoreInvite,
          ...updateData
        });

        return {
          success: true,
          data: result
        };
      });

    } catch (error) {
      this.logger.error('Error responding to invite', { error, inviteId, userId, response });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to respond to invitation',
          code: 'INVITE_RESPONSE_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Cancel invitation
   */
  public async cancelInvite(
    inviteId: string,
    userId: string
  ): Promise<UserOperationResult<void>> {
    try {
      this.logger.info('Canceling invite', { inviteId, userId });

      return await runTransaction(firestore, async (transaction) => {
        const inviteRef = doc(firestore, 'invites', inviteId);
        const inviteDoc = await transaction.get(inviteRef);

        if (!inviteDoc.exists()) {
          throw new Error('Invitation not found');
        }

        const firestoreInvite = inviteDoc.data() as FirestoreTeamInvite;
        const invite = this.fromFirestore(firestoreInvite);

        // Check permissions
        if (!this.canCancelInvite(invite, userId)) {
          throw new Error('Access denied');
        }

        // Check if invite can be canceled
        if (invite.status !== TeamInviteStatus.PENDING) {
          throw new Error('Only pending invitations can be canceled');
        }

        const now = Timestamp.now();

        // Update invite status
        transaction.update(inviteRef, {
          status: TeamInviteStatus.CANCELLED,
          updatedAt: now
        });

        // Update team
        const teamRef = doc(firestore, 'teams', invite.teamId);
        const teamDoc = await transaction.get(teamRef);

        if (teamDoc.exists()) {
          const firestoreTeam = teamDoc.data() as FirestoreTeam;
          
          const updatedInvitations = firestoreTeam.pendingInvites.map(inv => {
            if (inv.id === inviteId) {
              return { ...inv, status: TeamInviteStatus.CANCELLED };
            }
            return inv;
          });

          transaction.update(teamRef, {
            pendingInvites: updatedInvitations,
            activity: {
              ...firestoreTeam.activity,
              pendingInvites: Math.max(0, firestoreTeam.activity.pendingInvites - 1),
              lastActivity: now
            },
            updatedAt: now
          });
        }

        // Log activity
        await this.logInviteActivity(
          inviteId,
          userId,
          UserActivityType.TEAM_INVITE_CANCELLED,
          {
            teamId: invite.teamId,
            teamName: invite.teamName,
            inviteeEmail: invite.inviteeEmail,
            organizationRole: invite.organizationRole,
            teamRole: invite.teamRole
          }
        );

        // Clear cache
        this.clearInviteCache(inviteId);
        this.clearTeamInvitesCache(invite.teamId);
        this.clearUserInvitesCache(invite.inviteeEmail);

        return { success: true };
      });

    } catch (error) {
      this.logger.error('Error canceling invite', { error, inviteId, userId });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to cancel invitation',
          code: 'INVITE_CANCEL_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Search invitations
   */
  public async searchInvites(
    options: InviteSearchOptions,
    pagination?: UserPaginationParams
  ): Promise<UserApiResponse<TeamInvite[]>> {
    try {
      this.logger.info('Searching invites', { options, pagination });

      let q = query(collection(firestore, 'invites'));

      // Apply filters
      if (options.teamId) {
        q = query(q, where('teamId', '==', options.teamId));
      }

      if (options.inviterId) {
        q = query(q, where('inviterId', '==', options.inviterId));
      }

      if (options.inviteeEmail) {
        q = query(q, where('inviteeEmail', '==', options.inviteeEmail));
      }

      if (options.inviteeId) {
        q = query(q, where('inviteeId', '==', options.inviteeId));
      }

      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }

      if (options.organizationRole) {
        q = query(q, where('organizationRole', '==', options.organizationRole));
      }

      if (options.teamRole) {
        q = query(q, where('teamRole', '==', options.teamRole));
      }

      // Apply sorting
      const sortField = options.sortBy || 'createdAt';
      const sortDirection = options.sortOrder || 'desc';
      q = query(q, orderBy(sortField, sortDirection));

      // Apply pagination
      if (pagination?.limit) {
        q = query(q, limit(pagination.limit));
      }

      if (pagination?.cursor) {
        const cursorDoc = await getDoc(doc(firestore, 'invites', pagination.cursor));
        if (cursorDoc.exists()) {
          q = query(q, startAfter(cursorDoc));
        }
      }

      const snapshot = await getDocs(q);
      const invites = snapshot.docs
        .map(doc => this.fromFirestore(doc.data() as FirestoreTeamInvite))
        .filter(invite => this.matchesSearchCriteria(invite, options));

      const hasMore = snapshot.docs.length === (pagination?.limit || 20);
      const nextCursor = hasMore && snapshot.docs.length > 0 ? 
        snapshot.docs[snapshot.docs.length - 1].id : undefined;

      return {
        success: true,
        data: invites,
        metadata: {
          timestamp: new Date(),
          requestId: `search_${Date.now()}`,
          version: '1.0',
          pagination: {
            page: 1,
            limit: pagination?.limit || 20,
            hasNext: hasMore,
            hasPrevious: false,
            nextCursor,
            total: invites.length
          }
        }
      };

    } catch (error) {
      this.logger.error('Error searching invites', { error, options, pagination });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to search invitations',
          code: 'INVITE_SEARCH_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get user invitations
   */
  public async getUserInvites(
    userEmail: string,
    status?: TeamInviteStatus,
    pagination?: UserPaginationParams
  ): Promise<UserApiResponse<TeamInvite[]>> {
    try {
      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}user:${userEmail}:${status || 'all'}`;
      const cached = this.cache.get(cacheKey) as TeamInvite[] | null;
      if (cached && !pagination?.cursor) {
        return { 
          success: true, 
          data: cached,
          metadata: {
            timestamp: new Date(),
            requestId: `user_invites_${Date.now()}`,
            version: '1.0',
            pagination: {
              page: 1,
              limit: 20,
              hasNext: false,
              hasPrevious: false,
              total: cached.length
            }
          }
        };
      }

      let q = query(
        collection(firestore, 'invites'),
        where('inviteeEmail', '==', userEmail),
        orderBy('createdAt', 'desc')
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      if (pagination?.limit) {
        q = query(q, limit(pagination.limit));
      }

      if (pagination?.cursor) {
        const cursorDoc = await getDoc(doc(firestore, 'invites', pagination.cursor));
        if (cursorDoc.exists()) {
          q = query(q, startAfter(cursorDoc));
        }
      }

      const snapshot = await getDocs(q);
      const invites = snapshot.docs.map(doc => 
        this.fromFirestore(doc.data() as FirestoreTeamInvite)
      );

      // Cache if no pagination
      if (!pagination?.cursor) {
        this.cache.set(cacheKey, invites, this.CACHE_TTL);
      }

      const hasMore = snapshot.docs.length === (pagination?.limit || 20);
      const nextCursor = hasMore && snapshot.docs.length > 0 ? 
        snapshot.docs[snapshot.docs.length - 1].id : undefined;

      return {
        success: true,
        data: invites,
        metadata: {
          timestamp: new Date(),
          requestId: `user_invites_${Date.now()}`,
          version: '1.0',
          pagination: {
            page: pagination?.page || 1,
            limit: pagination?.limit || 20,
            hasNext: hasMore,
            hasPrevious: false,
            nextCursor,
            total: invites.length
          }
        }
      };

    } catch (error) {
      this.logger.error('Error getting user invites', { error, userEmail, status, pagination });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to get user invitations',
          code: 'USER_INVITES_GET_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Clean up expired invitations
   */
  public async cleanupExpiredInvites(): Promise<UserOperationResult<number>> {
    try {
      this.logger.info('Cleaning up expired invites');

      const now = Timestamp.now();
      const q = query(
        collection(firestore, 'invites'),
        where('status', '==', TeamInviteStatus.PENDING),
        where('expiresAt', '<', now)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);
      let count = 0;

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: TeamInviteStatus.EXPIRED,
          updatedAt: now
        });
        count++;
      });

      if (count > 0) {
        await batch.commit();
        this.logger.info(`Cleaned up ${count} expired invites`);
      }

      return { success: true, data: count };

    } catch (error) {
      this.logger.error('Error cleaning up expired invites', { error });
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: 'Failed to cleanup expired invitations',
          code: 'INVITE_CLEANUP_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  // Private helper methods

  private validateInviteData(data: TeamInviteData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.teamId) {
      errors.push('Team ID is required');
    }

    if (!data.inviteeEmail || !this.isValidEmail(data.inviteeEmail)) {
      errors.push('Valid invitee email is required');
    }

    if (!Object.values(OrganizationRole).includes(data.organizationRole)) {
      errors.push('Valid organization role is required');
    }

    if (data.teamRole && !Object.values(TeamRole).includes(data.teamRole)) {
      errors.push('Valid team role is required');
    }

    if (data.expiresAt && data.expiresAt <= new Date()) {
      errors.push('Expiry date must be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateInviteToken(): string {
    return Math.random().toString(36).substring(2) + 
           Date.now().toString(36) + 
           Math.random().toString(36).substring(2);
  }

  private canAccessInvite(invite: TeamInvite, userId: string): boolean {
    return invite.inviterId === userId || 
           invite.inviteeId === userId;
  }

  private canRespondToInvite(invite: TeamInvite, userId: string): boolean {
    return invite.inviteeId === userId;
  }

  private canCancelInvite(invite: TeamInvite, userId: string): boolean {
    return invite.inviterId === userId;
  }

  private isInviteExpired(invite: TeamInvite): boolean {
    return invite.expiresAt < new Date();
  }

  private fromFirestore(data: FirestoreTeamInvite): TeamInvite {
    return {
      ...data,
      expiresAt: data.expiresAt.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      respondedAt: data.respondedAt?.toDate()
    };
  }

  private async logInviteActivity(
    inviteId: string,
    userId: string,
    type: UserActivityType,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const activity = ActivityUtils.createActivity(
        userId,
        type,
        'invite_action',
        {
          resource: 'invite',
          resourceId: inviteId,
          context: ActivityContext.WEB,
          metadata: {
            success: true,
            ...(metadata.action && { newValues: { action: metadata.action } }),
            ...(metadata.teamId && { previousValues: { teamId: metadata.teamId } })
          }
        }
      );

      // Save activity to Firestore
      const activitiesRef = collection(firestore, 'userActivities');
      await setDoc(doc(activitiesRef), {
        userId,
        type,
        action: 'invite_action',
        resource: 'invite',
        resourceId: inviteId,
        context: ActivityContext.WEB,
        timestamp: serverTimestamp(),
        metadata: {
          success: true,
          ...metadata
        }
      });

    } catch (error) {
      this.logger.error('Error logging invite activity', { error, inviteId, userId, type });
    }
  }

  private matchesSearchCriteria(invite: TeamInvite, options: InviteSearchOptions): boolean {
    if (options.isExpired !== undefined) {
      const isExpired = this.isInviteExpired(invite);
      if (options.isExpired !== isExpired) return false;
    }

    return true;
  }

  private clearInviteCache(inviteId: string): void {
    this.cache.delete(`${this.CACHE_PREFIX}${inviteId}`);
  }

  private clearTeamInvitesCache(teamId: string): void {
    this.cache.delete(`${this.CACHE_PREFIX}team:${teamId}`);
  }

  private clearUserInvitesCache(userEmail: string): void {
    // Clear all status variations
    this.cache.delete(`${this.CACHE_PREFIX}user:${userEmail}:all`);
    Object.values(TeamInviteStatus).forEach(status => {
      this.cache.delete(`${this.CACHE_PREFIX}user:${userEmail}:${status}`);
    });
  }

  /**
   * Resolve user display name from user ID
   */
  private async resolveUserDisplayName(userId: string, fallbackEmail: string): Promise<string> {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.displayName || 
               `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
               userData.email || 
               fallbackEmail;
      }
    } catch (error) {
      console.warn('Could not resolve user display name:', error);
    }
    return fallbackEmail;
  }
}

export default InviteManager; 
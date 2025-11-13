import { Timestamp } from 'firebase/firestore';
import { UserRole, SubscriptionTier } from '../../core/models/User';
import { OrganizationRoleType } from '../core/models/Organization';

/**
 * User status enumeration
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  DELETION_PENDING = 'deletion_pending',
  DELETED = 'deleted'
}

/**
 * User activity types
 */
export enum UserActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PROFILE_UPDATE = 'profile_update',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_CHANGE = 'email_change',
  TEAM_JOIN = 'team_join',
  TEAM_LEAVE = 'team_leave',
  TEAM_CREATE = 'team_create',
  TEAM_UPDATE = 'team_update',
  TEAM_DELETE = 'team_delete',
  TEAM_INVITE_SENT = 'team_invite_sent',
  TEAM_INVITE_ACCEPTED = 'team_invite_accepted',
  TEAM_INVITE_DECLINED = 'team_invite_declined',
  TEAM_INVITE_CANCELLED = 'team_invite_cancelled',
  ROLE_CHANGE = 'role_change',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  CONTENT_CREATE = 'content_create',
  CONTENT_UPDATE = 'content_update',
  CONTENT_DELETE = 'content_delete',
  CONTENT_PUBLISH = 'content_publish',
  PLATFORM_CONNECT = 'platform_connect',
  PLATFORM_DISCONNECT = 'platform_disconnect',
  SUBSCRIPTION_CHANGE = 'subscription_change',
  BILLING_UPDATE = 'billing_update',
  SETTINGS_UPDATE = 'settings_update',
  EXPORT_REQUEST = 'export_request',
  DELETION_REQUEST = 'deletion_request',
  API_ACCESS = 'api_access',
  SECURITY_EVENT = 'security_event'
}

/**
 * User preference types
 */
export enum UserPreferenceType {
  THEME = 'theme',
  LANGUAGE = 'language',
  TIMEZONE = 'timezone',
  DATE_FORMAT = 'date_format',
  TIME_FORMAT = 'time_format',
  CURRENCY = 'currency',
  DASHBOARD_LAYOUT = 'dashboard_layout',
  DEFAULT_PLATFORM = 'default_platform',
  AUTO_SAVE = 'auto_save',
  KEYBOARD_SHORTCUTS = 'keyboard_shortcuts'
}

/**
 * User notification types
 */
export enum UserNotificationType {
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
  SMS = 'sms',
  SLACK = 'slack',
  WEBHOOK = 'webhook'
}

/**
 * Team invite status
 */
export enum TeamInviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

/**
 * Organization-level roles (seat-based, organization-wide access)
 * These roles determine billing seats and cross-team visibility
 */
export enum OrganizationRole {
  OWNER = 'owner',              // Owns the organization, can delete org/transfer ownership, sees all teams (defacto access)
  ORG_ADMIN = 'org_admin',      // Organization admin, can perform all tasks without team roles, sees all teams
  MEMBER = 'member',            // Team member within organization structure (takes a seat, gets team roles)
  VIEWER = 'viewer'             // Non-team member for executives/leadership (analytics, tokens, audit only)
}

/**
 * Team-level roles (feature-based, team-specific access)
 * These roles are ONLY assigned to MEMBERS within specific teams
 */
export enum TeamRole {
  TEAM_ADMIN = 'team_admin',    // Team leader, admin for that specific team only
  EDITOR = 'editor',            // Senior level role, handles most tasks except adding members
  CONTRIBUTOR = 'contributor',  // Access to AI generation, limited analytics access
  OBSERVER = 'observer'         // Can see everything, cannot perform tasks (learning role)
}

/**
 * Permission scopes
 */
export enum PermissionScope {
  GLOBAL = 'global',
  ORGANIZATION = 'organization',
  TEAM = 'team',
  PROJECT = 'project',
  CONTENT = 'content',
  PLATFORM = 'platform'
}

/**
 * Activity context types
 */
export enum ActivityContext {
  WEB = 'web',
  MOBILE = 'mobile',
  API = 'api',
  WEBHOOK = 'webhook',
  SYSTEM = 'system',
  AUTOMATION = 'automation',
  TEAM = 'team'
}

/**
 * Notification channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
  SMS = 'sms',
  SLACK = 'slack',
  WEBHOOK = 'webhook'
}

/**
 * Session status
 */
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  INVALID = 'invalid',
  TERMINATED = 'terminated'
}

/**
 * Export formats
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  XML = 'xml'
}

/**
 * GDPR request types
 */
export enum GDPRRequestType {
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  DATA_PORTABILITY = 'data_portability',
  ACCESS_REQUEST = 'access_request'
}

/**
 * User error types
 */
export enum UserErrorType {
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  NOT_FOUND = 'not_found',
  USER_NOT_FOUND = 'user_not_found',
  TEAM_NOT_FOUND = 'team_not_found',
  INVITE_NOT_FOUND = 'invite_not_found',
  INVITE_EXPIRED = 'invite_expired',
  ALREADY_EXISTS = 'already_exists',
  PERMISSION_DENIED = 'permission_denied',
  ACCESS_DENIED = 'access_denied',
  QUOTA_EXCEEDED = 'quota_exceeded',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUBSCRIPTION_REQUIRED = 'subscription_required',
  SUBSCRIPTION_LIMIT_EXCEEDED = 'subscription_limit_exceeded',
  TEAM_LIMIT_EXCEEDED = 'team_limit_exceeded',
  INVALID_INVITE = 'invalid_invite',
  EXPIRED_TOKEN = 'expired_token',
  GDPR_COMPLIANCE_ERROR = 'gdpr_compliance_error',
  EXTERNAL_SERVICE_ERROR = 'external_service_error',
  OPERATION_FAILED = 'operation_failed',
  INTERNAL_ERROR = 'internal_error',
  // Additional error types for auth and team managers
  PERMISSION_ERROR = 'permission_error',
  PERMISSION_NOT_FOUND = 'permission_not_found',
  SESSION_ERROR = 'session_error',
  SESSION_NOT_FOUND = 'session_not_found',
  SESSION_EXPIRED = 'session_expired',
  SESSION_INVALID = 'session_invalid'
}

/**
 * User error interface
 */
export interface UserError {
  type: UserErrorType;
  message: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
  context?: ActivityContext;
}

/**
 * User API response interface
 */
export interface UserApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: UserError;
  metadata?: {
    timestamp: Date;
    requestId: string;
    version: string;
    pagination?: UserPaginationParams;
  };
}

/**
 * User search parameters
 */
export interface UserSearchParams {
  query?: string;
  status?: UserStatus[];
  role?: UserRole[];
  organizationId?: string;
  teamId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  lastActiveAfter?: Date;
  lastActiveBefore?: Date;
  subscriptionTier?: SubscriptionTier[];
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastActiveAt' | 'role';
  sortOrder?: 'asc' | 'desc';
}

/**
 * User pagination parameters
 */
export interface UserPaginationParams {
  page: number;
  limit: number;
  total?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  nextCursor?: string;
  previousCursor?: string;
  cursor?: string;  // Current cursor position for pagination
}

/**
 * User profile data interface
 */
export interface UserProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  jobTitle?: string;
  phoneNumber?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  currency?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  customFields?: Record<string, any>;
}

/**
 * User activity data interface
 */
export interface UserActivityData {
  id: string;
  userId: string;
  organizationId?: string;
  teamId?: string;
  type: UserActivityType;
  description: string;
  metadata?: Record<string, any>;
  context: ActivityContext;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  timestamp: Date;
}

/**
 * User preference data interface
 */
export interface UserPreferenceData {
  userId: string;
  organizationId?: string;
  preferences: Record<UserPreferenceType, any>;
  notificationSettings: Record<UserNotificationType, boolean>;
  privacySettings: {
    profileVisibility: 'public' | 'organization' | 'team' | 'private';
    activityVisibility: 'public' | 'organization' | 'team' | 'private';
    allowAnalytics: boolean;
    allowMarketing: boolean;
    allowCookies: boolean;
  };
  accessibilitySettings: {
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
  };
}

/**
 * User notification data interface
 */
export interface UserNotificationData {
  id: string;
  userId: string;
  organizationId?: string;
  type: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

/**
 * User team data interface
 */
export interface UserTeamData {
  teamId: string;
  teamName: string;
  organizationId: string;
  organizationName: string;
  organizationRole: OrganizationRole;  // User's org-level role
  teamRole?: TeamRole;                 // User's team-specific role (only if MEMBER)
  permissions: string[];
  joinedAt: Date;
  invitedBy: string;
  status: 'active' | 'inactive' | 'pending';
}

/**
 * User permission data interface
 */
export interface UserPermissionData {
  id: string;
  userId: string;
  scope: PermissionScope;
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  organizationId?: string;
  teamId?: string;
}

/**
 * User invite data interface
 */
export interface UserInviteData {
  id: string;
  email: string;
  organizationId: string;
  organizationName: string;
  teamId?: string;
  teamName?: string;
  organizationRole: OrganizationRole;  // Org-level role being invited to
  teamRole?: TeamRole;                 // Team-specific role (only if inviting as MEMBER to team)
  permissions: string[];
  invitedBy: string;
  invitedByName: string;
  status: TeamInviteStatus;
  token: string;
  message?: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
}

/**
 * User session data interface
 */
export interface UserSessionData {
  id: string;
  userId: string;
  organizationId?: string;
  status: SessionStatus;
  ipAddress: string;
  userAgent: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  metadata?: Record<string, any>;
}

/**
 * User export data interface
 */
export interface UserExportData {
  requestId: string;
  userId: string;
  type: GDPRRequestType;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  includeData: {
    profile: boolean;
    activities: boolean;
    content: boolean;
    analytics: boolean;
    teams: boolean;
    permissions: boolean;
  };
  metadata?: Record<string, any>;
}

/**
 * User validation result interface
 */
export interface UserValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/**
 * User operation result interface
 */
export interface UserOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: UserError;
  warnings?: string[];
  metadata?: Record<string, any>;
}

/**
 * User sync result interface
 */
export interface UserSyncResult {
  userId: string;
  organizationId?: string;
  syncedAt: Date;
  changes: {
    profile?: boolean;
    permissions?: boolean;
    teams?: boolean;
    preferences?: boolean;
  };
  conflicts?: Array<{
    field: string;
    localValue: any;
    remoteValue: any;
    resolution: 'local' | 'remote' | 'merge';
  }>;
  errors?: UserError[];
}

/**
 * User analytics interface
 */
export interface UserAnalytics {
  userId: string;
  organizationId?: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    loginCount: number;
    activeTime: number; // in minutes
    contentCreated: number;
    contentPublished: number;
    platformsUsed: string[];
    featuresUsed: string[];
    collaborations: number;
    invitesSent: number;
    invitesAccepted: number;
  };
  trends: {
    activityTrend: 'increasing' | 'decreasing' | 'stable';
    engagementScore: number; // 0-100
    productivityScore: number; // 0-100
  };
  comparisons: {
    previousPeriod?: {
      loginCount: number;
      activeTime: number;
      contentCreated: number;
    };
    teamAverage?: {
      loginCount: number;
      activeTime: number;
      contentCreated: number;
    };
  };
}

/**
 * User configuration interface
 */
export interface UserConfig {
  enableActivityTracking: boolean;
  enableAnalytics: boolean;
  enableNotifications: boolean;
  enableGDPRCompliance: boolean;
  sessionTimeout: number; // in minutes
  maxConcurrentSessions: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    maxAge: number; // in days
  };
  inviteExpiry: number; // in days
  exportRetention: number; // in days
  activityRetention: number; // in days
}

/**
 * User tokens interface (for API access, invites, etc.)
 */
export interface UserTokens {
  accessToken?: string;
  refreshToken?: string;
  inviteToken?: string;
  resetToken?: string;
  verificationToken?: string;
  apiKey?: string;
  webhookSecret?: string;
}

/**
 * User's organization membership with seat-based role
 */
export interface UserOrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;          // Seat-based role (OWNER, ORG_ADMIN, MEMBER, VIEWER)
  joinedAt: Date;
  invitedBy: string;
  status: 'active' | 'inactive' | 'pending';
  seatType: 'full' | 'viewer';     // Full seat vs viewer seat for billing
  permissions: string[];           // Organization-level permissions
}

/**
 * User's team membership with feature-based role
 */
export interface UserTeamMembership {
  teamId: string;
  teamName: string;
  organizationId: string;
  role: TeamRole;                  // Feature-based role (TEAM_ADMIN, EDITOR, CONTRIBUTOR, OBSERVER)
  joinedAt: Date;
  assignedBy: string;
  status: 'active' | 'inactive' | 'pending';
  permissions: string[];           // Team-specific permissions
  isDefaultTeam: boolean;          // Whether this is user's default team
}

/**
 * Combined user role context for permission checking
 */
export interface UserRoleContext {
  userId: string;
  organizationRole: OrganizationRole;
  teamRoles: Record<string, TeamRole>; // teamId -> TeamRole mapping
  effectivePermissions: {
    organization: string[];         // Permissions from org role
    teams: Record<string, string[]>; // teamId -> permissions mapping
  };
}

/**
 * Permission matrix for organization roles
 */
export const ORGANIZATION_PERMISSIONS: Record<OrganizationRole, string[]> = {
  [OrganizationRole.OWNER]: [
    'view_all_teams',
    'manage_organization',
    'manage_billing',
    'transfer_ownership',
    'delete_organization',
    'view_analytics',
    'manage_integrations',
    'audit_access',
    'create_content',           // Can perform all tasks without team roles
    'edit_content',
    'publish_content',
    'use_ai_generation',
    'manage_platforms',
    'invite_users',
    'purchase_seats'
  ],
  [OrganizationRole.ORG_ADMIN]: [
    'view_all_teams',
    'manage_teams',
    'manage_members',
    'view_analytics',
    'manage_integrations',
    'audit_access',
    'manage_billing',
    'create_content',           // Can perform all tasks without team roles
    'edit_content',
    'publish_content',
    'use_ai_generation',
    'manage_platforms',
    'invite_users',
    'purchase_seats'
  ],
  [OrganizationRole.MEMBER]: [
    'view_assigned_teams'       // Members get permissions through team roles only
  ],
  [OrganizationRole.VIEWER]: [
    'view_analytics',           // Non-team members for executives/leadership
    'view_tokens',
    'audit_access'              // Cannot perform any content/platform tasks
  ]
};

/**
 * Permission matrix for team roles (ONLY for MEMBERS)
 */
export const TEAM_PERMISSIONS: Record<TeamRole, string[]> = {
  [TeamRole.TEAM_ADMIN]: [
    'manage_team_members',      // Admin for this specific team only
    'manage_team_settings',
    'create_content',
    'edit_content',
    'publish_content',
    'approve_content',
    'use_ai_generation',
    'view_team_analytics',
    'manage_platforms'
  ],
  [TeamRole.EDITOR]: [
    'create_content',
    'edit_content',
    'publish_content',
    'use_ai_generation',
    'view_team_analytics',
    'manage_platforms'
  ],
  [TeamRole.CONTRIBUTOR]: [
    'create_content',
    'edit_own_content',
    'use_ai_generation'
  ],
  [TeamRole.OBSERVER]: [
    'view_content',
    'view_team_activity',
    'view_processes'            // Learning role for team members
  ]
}; 
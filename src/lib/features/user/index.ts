// User Library Main Export
// Centralized exports for all User functionality

// Core Types and Enums from types.ts
export {
  UserStatus,
  UserActivityType,
  UserPreferenceType,
  UserNotificationType,
  UserErrorType,
  TeamInviteStatus,
  OrganizationRole,
  TeamRole,
  PermissionScope,
  ActivityContext,
  NotificationChannel,
  SessionStatus,
  ExportFormat,
  GDPRRequestType,
  ORGANIZATION_PERMISSIONS,
  TEAM_PERMISSIONS
} from './types';

export type {
  UserError,
  UserApiResponse,
  UserSearchParams,
  UserPaginationParams,
  UserProfileData,
  UserActivityData,
  UserPreferenceData,
  UserNotificationData,
  UserTeamData,
  UserPermissionData,
  UserInviteData,
  UserSessionData,
  UserExportData,
  UserValidationResult,
  UserOperationResult,
  UserSyncResult,
  UserAnalytics,
  UserConfig,
  UserTokens,
  UserOrganizationMembership,
  UserTeamMembership,
  UserRoleContext
} from './types';

// Re-export commonly used types from other modules
export type { UserRole, SubscriptionTier } from '../core/models/User';
export type { OrganizationRoleType } from '../core/models/Organization';

// Models - using correct exports
export type {
  User,
  FirestoreUser
} from './models';

export {
  UserUtils,
  PermissionUtils
} from './models';

export type {
  Permission,
  FirestorePermission,
  PermissionCondition,
  RolePermission,
  UserPermission,
  PermissionContext,
  PermissionCheckResult
} from './models';

// Main Service - commenting out until missing dependencies are resolved
// export { UserService } from './UserService';

// Authentication Components - commenting out until missing dependencies are resolved
// export { AuthManager } from './auth/AuthManager';
// export { PermissionManager } from './auth/PermissionManager';
// export { SessionManager } from './auth/SessionManager';

// Team Management Components - commenting out until missing dependencies are resolved
// export { TeamManager } from './team/TeamManager';
// export { InviteManager } from './team/InviteManager';
// export { RoleManager } from './team/RoleManager';

// Profile Management Components - commenting out until missing dependencies are resolved
// export { ProfileManager } from './profile/ProfileManager';
// export { PreferenceManager } from './profile/PreferenceManager';
// export { NotificationManager } from './profile/NotificationManager';

// Utilities - commenting out until missing dependencies are resolved
// export { 
//   UserValidator,
//   ActivityTracker,
//   DataExporter
// } from './utils';

// Utility Types - commenting out until missing dependencies are resolved
// export type { 
//   ValidationResult, 
//   ValidationError, 
//   ValidationWarning,
//   ActivityEvent,
//   ActivityMetrics,
//   ExportOptions,
//   ExportResult,
//   GDPRExportData
// } from './utils'; 
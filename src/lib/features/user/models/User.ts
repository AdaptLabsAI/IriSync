import { Timestamp } from 'firebase/firestore';
import { UserRole, SubscriptionTier } from '../../models/User';
import { 
  UserStatus, 
  UserPreferenceData, 
  UserActivityType,
  UserPreferenceType,
  UserNotificationType,
  OrganizationRole,
  TeamRole,
  ActivityContext
} from '../types';

/**
 * Enhanced User interface for the User Library
 * Extends the base User model with additional user management capabilities
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  jobTitle?: string;
  phoneNumber?: string;
  
  // Core user properties
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  
  // Profile settings
  timezone?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  currency?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  
  // Privacy and preferences
  preferences: UserPreferenceData;
  privacySettings: {
    profileVisibility: 'public' | 'organization' | 'team' | 'private';
    activityVisibility: 'public' | 'organization' | 'team' | 'private';
    allowAnalytics: boolean;
    allowMarketing: boolean;
    allowCookies: boolean;
  };
  
  // Accessibility settings
  accessibilitySettings: {
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
  };
  
  // Organization relationships
  personalOrganizationId?: string;
  organizations: string[];
  currentOrganizationId?: string;
  
  // Team memberships - only MEMBERS have team roles
  teams: Array<{
    teamId: string;
    organizationId: string;
    role: TeamRole;                    // Only present if user is MEMBER
    joinedAt: Date;
    permissions: string[];
  }>;
  
  // Authentication and security
  firebaseAuthId?: string;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  loginCount: number;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  
  // Session management
  activeSessions: Array<{
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    createdAt: Date;
    lastActiveAt: Date;
  }>;
  
  // Activity tracking
  activitySummary: {
    totalLogins: number;
    totalActiveTime: number; // in minutes
    contentCreated: number;
    contentPublished: number;
    collaborations: number;
    invitesSent: number;
    invitesAccepted: number;
    lastActivityType?: UserActivityType;
    lastActivityAt?: Date;
  };
  
  // GDPR and compliance
  gdprConsent: {
    dataProcessing: boolean;
    marketing: boolean;
    analytics: boolean;
    consentDate: Date;
    consentVersion: string;
  };
  
  deletionRequest?: {
    requestedAt: Date;
    scheduledFor: Date;
    reason?: string;
    confirmed: boolean;
  };
  
  // Metadata
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletionRequestedAt?: Date;
}

/**
 * Firestore representation of User
 */
export interface FirestoreUser {
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  jobTitle?: string;
  phoneNumber?: string;
  
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  
  timezone?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  currency?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  
  preferences: {
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
  };
  
  personalOrganizationId?: string;
  organizations: string[];
  currentOrganizationId?: string;
  
  teams: Array<{
    teamId: string;
    organizationId: string;
    role: TeamRole;                    // Only present if user is MEMBER
    joinedAt: Timestamp;
    permissions: string[];
  }>;
  
  firebaseAuthId?: string;
  lastLoginAt?: Timestamp;
  lastActiveAt?: Timestamp;
  loginCount: number;
  failedLoginAttempts: number;
  lockedUntil?: Timestamp;
  passwordChangedAt?: Timestamp;
  
  activeSessions: Array<{
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    createdAt: Timestamp;
    lastActiveAt: Timestamp;
  }>;
  
  activitySummary: {
    totalLogins: number;
    totalActiveTime: number;
    contentCreated: number;
    contentPublished: number;
    collaborations: number;
    invitesSent: number;
    invitesAccepted: number;
    lastActivityType?: UserActivityType;
    lastActivityAt?: Timestamp;
  };
  
  gdprConsent: {
    dataProcessing: boolean;
    marketing: boolean;
    analytics: boolean;
    consentDate: Timestamp;
    consentVersion: string;
  };
  
  deletionRequest?: {
    requestedAt: Timestamp;
    scheduledFor: Timestamp;
    reason?: string;
    confirmed: boolean;
  };
  
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletionRequestedAt?: Timestamp;
}

/**
 * User utility functions
 */
export class UserUtils {
  /**
   * Create a new User object with default values
   */
  static createUser(data: {
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
    status: UserStatus;
    emailVerified: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    const now = new Date();
    
    return {
      id: data.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.displayName || `${data.firstName} ${data.lastName}`,
      photoURL: data.photoURL,
      bio: data.bio,
      jobTitle: data.jobTitle,
      phoneNumber: data.phoneNumber,
      
      role: UserRole.USER,
      status: data.status,
      emailVerified: data.emailVerified,
      phoneVerified: false,
      twoFactorEnabled: false,
      
      timezone: data.timezone || 'UTC',
      language: data.language || 'en',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      currency: 'USD',
      website: undefined,
      socialLinks: {},
      
      preferences: this.createDefaultPreferences(data.id),
      privacySettings: {
        profileVisibility: 'organization',
        activityVisibility: 'team',
        allowAnalytics: true,
        allowMarketing: false,
        allowCookies: true
      },
      
      accessibilitySettings: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: false,
        keyboardNavigation: false
      },
      
      personalOrganizationId: undefined,
      organizations: [],
      currentOrganizationId: undefined,
      
      teams: [],
      
      firebaseAuthId: undefined,
      lastLoginAt: data.lastLoginAt || now,
      lastActiveAt: now,
      loginCount: 1,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      passwordChangedAt: now,
      
      activeSessions: [],
      
      activitySummary: {
        totalLogins: 1,
        totalActiveTime: 0,
        contentCreated: 0,
        contentPublished: 0,
        collaborations: 0,
        invitesSent: 0,
        invitesAccepted: 0,
        lastActivityType: undefined,
        lastActivityAt: undefined
      },
      
      gdprConsent: {
        dataProcessing: true,
        marketing: false,
        analytics: true,
        consentDate: now,
        consentVersion: '1.0'
      },
      
      deletionRequest: undefined,
      
      customFields: {},
      tags: [],
      notes: undefined,
      
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletionRequestedAt: undefined
    };
  }

  /**
   * Convert Firestore user to User interface
   */
  static fromFirestore(id: string, data: FirestoreUser): User {
    return {
      id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.displayName,
      photoURL: data.photoURL,
      bio: data.bio,
      jobTitle: data.jobTitle,
      phoneNumber: data.phoneNumber,
      
      role: data.role,
      status: data.status,
      emailVerified: data.emailVerified,
      phoneVerified: data.phoneVerified,
      twoFactorEnabled: data.twoFactorEnabled,
      
      timezone: data.timezone,
      language: data.language,
      dateFormat: data.dateFormat,
      timeFormat: data.timeFormat,
      currency: data.currency,
      website: data.website,
      socialLinks: data.socialLinks,
      
      preferences: data.preferences,
      privacySettings: data.preferences.privacySettings,
      accessibilitySettings: data.preferences.accessibilitySettings,
      
      personalOrganizationId: data.personalOrganizationId,
      organizations: data.organizations,
      currentOrganizationId: data.currentOrganizationId,
      
      teams: data.teams.map(team => ({
        ...team,
        joinedAt: team.joinedAt.toDate()
      })),
      
      firebaseAuthId: data.firebaseAuthId,
      lastLoginAt: data.lastLoginAt?.toDate(),
      lastActiveAt: data.lastActiveAt?.toDate(),
      loginCount: data.loginCount,
      failedLoginAttempts: data.failedLoginAttempts,
      lockedUntil: data.lockedUntil?.toDate(),
      passwordChangedAt: data.passwordChangedAt?.toDate(),
      
      activeSessions: data.activeSessions.map(session => ({
        ...session,
        createdAt: session.createdAt.toDate(),
        lastActiveAt: session.lastActiveAt.toDate()
      })),
      
      activitySummary: {
        ...data.activitySummary,
        lastActivityAt: data.activitySummary.lastActivityAt?.toDate()
      },
      
      gdprConsent: {
        ...data.gdprConsent,
        consentDate: data.gdprConsent.consentDate.toDate()
      },
      
      deletionRequest: data.deletionRequest ? {
        ...data.deletionRequest,
        requestedAt: data.deletionRequest.requestedAt.toDate(),
        scheduledFor: data.deletionRequest.scheduledFor.toDate()
      } : undefined,
      
      customFields: data.customFields,
      tags: data.tags,
      notes: data.notes,
      
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      deletionRequestedAt: data.deletionRequestedAt?.toDate()
    };
  }

  /**
   * Convert User to Firestore format
   */
  static toFirestore(user: User): Omit<FirestoreUser, 'createdAt' | 'updatedAt'> & {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
  } {
    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      photoURL: user.photoURL,
      bio: user.bio,
      jobTitle: user.jobTitle,
      phoneNumber: user.phoneNumber,
      
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      
      timezone: user.timezone,
      language: user.language,
      dateFormat: user.dateFormat,
      timeFormat: user.timeFormat,
      currency: user.currency,
      website: user.website,
      socialLinks: user.socialLinks,
      
      preferences: user.preferences,
      
      personalOrganizationId: user.personalOrganizationId,
      organizations: user.organizations,
      currentOrganizationId: user.currentOrganizationId,
      
      teams: user.teams.map(team => ({
        ...team,
        joinedAt: Timestamp.fromDate(team.joinedAt)
      })),
      
      firebaseAuthId: user.firebaseAuthId,
      lastLoginAt: user.lastLoginAt ? Timestamp.fromDate(user.lastLoginAt) : undefined,
      lastActiveAt: user.lastActiveAt ? Timestamp.fromDate(user.lastActiveAt) : undefined,
      loginCount: user.loginCount,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil ? Timestamp.fromDate(user.lockedUntil) : undefined,
      passwordChangedAt: user.passwordChangedAt ? Timestamp.fromDate(user.passwordChangedAt) : undefined,
      
      activeSessions: user.activeSessions.map(session => ({
        ...session,
        createdAt: Timestamp.fromDate(session.createdAt),
        lastActiveAt: Timestamp.fromDate(session.lastActiveAt)
      })),
      
      activitySummary: {
        ...user.activitySummary,
        lastActivityAt: user.activitySummary.lastActivityAt ? 
          Timestamp.fromDate(user.activitySummary.lastActivityAt) : undefined
      },
      
      gdprConsent: {
        ...user.gdprConsent,
        consentDate: Timestamp.fromDate(user.gdprConsent.consentDate)
      },
      
      deletionRequest: user.deletionRequest ? {
        ...user.deletionRequest,
        requestedAt: Timestamp.fromDate(user.deletionRequest.requestedAt),
        scheduledFor: Timestamp.fromDate(user.deletionRequest.scheduledFor)
      } : undefined,
      
      customFields: user.customFields,
      tags: user.tags,
      notes: user.notes,
      
      createdAt: Timestamp.fromDate(user.createdAt),
      updatedAt: Timestamp.fromDate(user.updatedAt),
      deletionRequestedAt: user.deletionRequestedAt ? 
        Timestamp.fromDate(user.deletionRequestedAt) : undefined
    };
  }

  /**
   * Create default user preferences
   */
  static createDefaultPreferences(userId: string, organizationId?: string): UserPreferenceData {
    return {
      userId,
      organizationId,
      preferences: {
        [UserPreferenceType.THEME]: 'light',
        [UserPreferenceType.LANGUAGE]: 'en',
        [UserPreferenceType.TIMEZONE]: 'UTC',
        [UserPreferenceType.DATE_FORMAT]: 'MM/DD/YYYY',
        [UserPreferenceType.TIME_FORMAT]: '12h',
        [UserPreferenceType.CURRENCY]: 'USD',
        [UserPreferenceType.DASHBOARD_LAYOUT]: 'default',
        [UserPreferenceType.DEFAULT_PLATFORM]: 'twitter',
        [UserPreferenceType.AUTO_SAVE]: true,
        [UserPreferenceType.KEYBOARD_SHORTCUTS]: true
      },
      notificationSettings: {
        [UserNotificationType.EMAIL]: true,
        [UserNotificationType.IN_APP]: true,
        [UserNotificationType.PUSH]: false,
        [UserNotificationType.SMS]: false,
        [UserNotificationType.SLACK]: false,
        [UserNotificationType.WEBHOOK]: false
      },
      privacySettings: {
        profileVisibility: 'organization',
        activityVisibility: 'team',
        allowAnalytics: true,
        allowMarketing: false,
        allowCookies: true
      },
      accessibilitySettings: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: false,
        keyboardNavigation: false
      }
    };
  }

  /**
   * Check if user has a specific organization role
   */
  static hasOrganizationRole(user: User, organizationId: string, role: OrganizationRole): boolean {
    const roleHierarchy = {
      [OrganizationRole.OWNER]: 4,
      [OrganizationRole.ORG_ADMIN]: 3,
      [OrganizationRole.MEMBER]: 2,
      [OrganizationRole.VIEWER]: 1
    };

    // Check if user is in the organization
    if (!user.organizations.includes(organizationId)) {
      return false;
    }

    // Check if user has a team membership in this organization
    const organizationTeams = user.teams.filter(team => team.organizationId === organizationId);
    
    if (organizationTeams.length === 0) {
      // User is in organization but has no team memberships
      // This could mean they have a direct organization role
      // For now, check if they're the owner of their personal organization
      if (user.personalOrganizationId === organizationId) {
        return role === OrganizationRole.OWNER;
      }
      return false;
    }

    // For users with team memberships, determine their organization role
    // based on their highest team role and organization structure
    const hasAdminTeam = organizationTeams.some(team => 
      team.role === TeamRole.TEAM_ADMIN || 
      team.permissions.includes('organization:admin')
    );

    let userOrganizationRole: OrganizationRole;
    
    if (user.personalOrganizationId === organizationId) {
      userOrganizationRole = OrganizationRole.OWNER;
    } else if (hasAdminTeam || organizationTeams.some(team => team.permissions.includes('organization:manage'))) {
      userOrganizationRole = OrganizationRole.ORG_ADMIN;
    } else if (organizationTeams.length > 0) {
      userOrganizationRole = OrganizationRole.MEMBER;
    } else {
      userOrganizationRole = OrganizationRole.VIEWER;
    }

    const userRoleLevel = roleHierarchy[userOrganizationRole] || 0;
    const requiredRoleLevel = roleHierarchy[role] || 0;

    return userRoleLevel >= requiredRoleLevel;
  }

  /**
   * Check if user has specific team role (only applicable to MEMBERS)
   */
  static hasTeamRole(user: User, teamId: string, role: TeamRole): boolean {
    const roleHierarchy = {
      [TeamRole.TEAM_ADMIN]: 4,
      [TeamRole.EDITOR]: 3,
      [TeamRole.CONTRIBUTOR]: 2,
      [TeamRole.OBSERVER]: 1
    };

    const userTeam = user.teams.find(t => t.teamId === teamId);
    if (!userTeam) return false;

    const userRoleLevel = roleHierarchy[userTeam.role] || 0;
    const requiredRoleLevel = roleHierarchy[role] || 0;

    return userRoleLevel >= requiredRoleLevel;
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(user: User, permission: string, organizationId?: string): boolean {
    if (organizationId) {
      const membership = user.teams.find(team => team.organizationId === organizationId);
      return membership?.permissions.includes(permission) || false;
    }
    
    // Check across all organizations
    return user.teams.some(team => team.permissions.includes(permission));
  }

  /**
   * Get user's display name
   */
  static getDisplayName(user: User): string {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.email.split('@')[0];
  }

  /**
   * Get user's initials for avatar
   */
  static getInitials(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  }

  /**
   * Check if user is active
   */
  static isActive(user: User): boolean {
    return user.status === UserStatus.ACTIVE && !user.lockedUntil;
  }

  /**
   * Check if user account is locked
   */
  static isLocked(user: User): boolean {
    return user.lockedUntil ? user.lockedUntil > new Date() : false;
  }

  /**
   * Check if user has pending deletion request
   */
  static hasPendingDeletion(user: User): boolean {
    return user.status === UserStatus.DELETION_PENDING || !!user.deletionRequest;
  }

  /**
   * Get user's current organization
   */
  static getCurrentOrganization(user: User): string | undefined {
    return user.currentOrganizationId || user.personalOrganizationId;
  }

  /**
   * Calculate user engagement score (0-100)
   */
  static calculateEngagementScore(user: User): number {
    const { activitySummary } = user;
    const daysSinceCreation = Math.max(1, 
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Normalize metrics
    const loginFrequency = Math.min(100, (activitySummary.totalLogins / daysSinceCreation) * 10);
    const contentActivity = Math.min(100, (activitySummary.contentCreated / daysSinceCreation) * 5);
    const collaboration = Math.min(100, (activitySummary.collaborations / daysSinceCreation) * 20);
    
    // Weighted average
    return Math.round((loginFrequency * 0.4 + contentActivity * 0.4 + collaboration * 0.2));
  }

  /**
   * Validate user data
   */
  static validate(user: Partial<User>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!user.email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push('Invalid email format');
    }
    
    if (!user.firstName?.trim()) {
      errors.push('First name is required');
    }
    
    if (!user.lastName?.trim()) {
      errors.push('Last name is required');
    }
    
    if (user.phoneNumber && !/^\+?[\d\s\-\(\)]+$/.test(user.phoneNumber)) {
      errors.push('Invalid phone number format');
    }
    
    if (user.website && !/^https?:\/\/.+/.test(user.website)) {
      errors.push('Website must be a valid URL');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 
import { Timestamp } from 'firebase/firestore';
import { SubscriptionTier as BaseSubscriptionTier } from '../../subscription/models/subscription';

/**
 * User role within the application (system-level role)
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin', // Global admin with access to all system features
  ADMIN = 'admin',             // System admin with limited global access
  USER = 'user'                // Regular user, permissions determined by organization role
}

/**
 * Extended subscription tier that includes the base tiers plus additional internal states
 */
export type SubscriptionTier = BaseSubscriptionTier | 'none';

/**
 * Re-export the base subscription tier values for convenience
 */
export const SubscriptionTierValues = {
  ...BaseSubscriptionTier,
  NONE: 'none' as const
} as const;

/**
 * Profile settings
 */
export interface UserProfileSettings {
  language: string;
  timezone: string;
  emailNotifications: boolean;
  darkMode?: boolean;
  desktopNotifications?: boolean;
}

/**
 * Default tier features and quotas interface
 */
export interface DefaultTierConfig {
  features: {
    hasVideoScheduling: boolean;
    hasBulkScheduling: boolean;
    hasCustomBrandedUrls: boolean;
    hasWorkflowApproval: boolean;
    hasCompetitorBenchmarking: boolean;
    hasCustomReports: boolean;
    hasLinkTracking: boolean;
    hasCustomDashboard: boolean;
    hasSmartReplies: boolean;
    hasBrandRecognition: boolean;
    hasSocialListening: boolean;
    hasAdvancedListening: boolean;
    hasSentimentAnalysis: boolean;
  };
  usageQuota: {
    aiTokens: {
      limit: number;
      used: number;
      purchased: number;
      resetDate: Date;
    };
    socialAccounts: {
      limit: number;
      used: number;
    };
    teamMembers: {
      limit: number;
      used: number;
    };
    storageMB: {
      limit: number;
      used: number;
    };
    competitors: {
      limit: number;
      used: number;
    };
  };
}

/**
 * User model interface
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;                      // System-level role (SUPER_ADMIN, ADMIN, USER)
  status: 'active' | 'inactive' | 'pending' | 'deletion_pending';
  firebaseAuthId?: string;
  phoneNumber?: string;
  photoURL?: string;
  profileSettings?: UserProfileSettings;
  bio?: string;
  jobTitle?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  lastActiveAt?: Timestamp;
  deletionRequestedAt?: Timestamp;     // When user requested account deletion
  
  // Organization relationships
  personalOrganizationId?: string;     // The user's personal organization ID (for freelancers/individuals)
  organizations?: string[];            // IDs of organizations the user belongs to
  currentOrganizationId?: string;      // Currently selected organization
  
  // ==============================================
  // DEPRECATED FIELDS - DO NOT USE IN NEW CODE
  // These fields are being migrated to the organization level
  // Use the organization-level equivalents listed below
  // ==============================================
  
  /** @deprecated Use organization.billing.subscriptionTier instead */
  subscriptionTier?: SubscriptionTier;
  
  /** @deprecated Use organization.usageQuota.socialAccounts.limit instead */
  maxSocialAccounts?: number;
  
  /** @deprecated Use organization.usageQuota.aiTokens.limit instead */
  tokenBalance?: number;
  
  /** @deprecated Use organization.billing.subscriptionStatus instead */
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing';
  
  /** @deprecated Use organization.billing.subscriptionId instead */
  subscriptionId?: string;
  
  /** @deprecated Use organization.billing.currentPeriodStart instead */
  subscriptionStartDate?: Date;
  
  /** @deprecated Use organization.billing.currentPeriodEnd instead */
  subscriptionEndDate?: Date;
  
  /** @deprecated Use organization.billing.renewalDate instead */
  subscriptionRenewalDate?: Date;
  
  /** @deprecated Use organization.usageQuota.aiTokens instead */
  tokenUsage?: number;
  
  /** @deprecated Use organization.usageQuota.aiTokens.resetDate instead */
  tokenReset?: Date;
  
  /** @deprecated Use organization.teamId instead */
  teamId?: string;
  
  /** @deprecated Use organization.isAdmin to check if user is admin in the organization */
  isOrganizationAdmin?: boolean;
  
  /** @deprecated Use organization.id directly from the organization document */
  organizationId?: string;
}

/**
 * Determines if a user has a specified system-level role (not organization role)
 * @param user User to check
 * @param requiredRole Minimum required role
 * @returns True if user has the required role or higher
 */
export function hasSystemRole(user: User, requiredRole: UserRole): boolean {
  // Define role hierarchy
  const roleHierarchy = {
    [UserRole.SUPER_ADMIN]: 3,
    [UserRole.ADMIN]: 2,
    [UserRole.USER]: 1
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Generate default features and quotas based on subscription tier
 * Used to initialize organization-level features and quotas
 * @param tier Subscription tier
 * @returns Default feature and quota settings for that tier
 */
export function getDefaultFeaturesForTier(tier: SubscriptionTier): DefaultTierConfig {
  switch (tier) {
    case BaseSubscriptionTier.CREATOR:
      return {
        features: {
          hasVideoScheduling: false,
          hasBulkScheduling: false,
          hasCustomBrandedUrls: false,
          hasWorkflowApproval: false,
          hasCompetitorBenchmarking: true,
          hasCustomReports: false,
          hasLinkTracking: false,
          hasCustomDashboard: false,
          hasSmartReplies: false,
          hasBrandRecognition: false,
          hasSocialListening: false,
          hasAdvancedListening: false,
          hasSentimentAnalysis: false
        },
        usageQuota: {
          aiTokens: {
            limit: 100,    // Base tokens included with subscription
            used: 0,      // Tokens used in current period
            purchased: 0, // Additional purchased tokens
            resetDate: getNextResetDate()
          },
          socialAccounts: {
            limit: 5,
            used: 0
          },
          teamMembers: {
            limit: 1,
            used: 1 // Owner counts as first member
          },
          storageMB: {
            limit: 1000, // 1GB
            used: 0
          },
          competitors: {
            limit: 5,
            used: 0
          }
        }
      };
      
          case BaseSubscriptionTier.INFLUENCER:
      return {
        features: {
          hasVideoScheduling: true,
          hasBulkScheduling: true,
          hasCustomBrandedUrls: true,
          hasWorkflowApproval: true,
          hasCompetitorBenchmarking: true,
          hasCustomReports: true,
          hasLinkTracking: true,
          hasCustomDashboard: true,
          hasSmartReplies: false,
          hasBrandRecognition: false,
          hasSocialListening: true,
          hasAdvancedListening: false,
          hasSentimentAnalysis: true
        },
        usageQuota: {
          aiTokens: {
            limit: 500,    // Base tokens included with subscription
            used: 0,       // Tokens used in current period
            purchased: 0,  // Additional purchased tokens
            resetDate: getNextResetDate()
          },
          socialAccounts: {
            limit: Number.MAX_SAFE_INTEGER, // Unlimited
            used: 0
          },
          teamMembers: {
            limit: 10,
            used: 1 // Owner counts as first member
          },
          storageMB: {
            limit: 10000, // 10GB
            used: 0
          },
          competitors: {
            limit: 10,
            used: 0
          }
        }
      };
      
          case BaseSubscriptionTier.ENTERPRISE:
      return {
        features: {
          hasVideoScheduling: true,
          hasBulkScheduling: true,
          hasCustomBrandedUrls: true,
          hasWorkflowApproval: true,
          hasCompetitorBenchmarking: true,
          hasCustomReports: true,
          hasLinkTracking: true,
          hasCustomDashboard: true,
          hasSmartReplies: true,
          hasBrandRecognition: true,
          hasSocialListening: true,
          hasAdvancedListening: true,
          hasSentimentAnalysis: true
        },
        usageQuota: {
          aiTokens: {
            limit: 5000,   // Base amount for 5 seats, will be increased based on additional seats
            used: 0,       // Tokens used in current period
            purchased: 0,  // Additional purchased tokens
            resetDate: getNextResetDate()
          },
          socialAccounts: {
            limit: Number.MAX_SAFE_INTEGER, // Unlimited
            used: 0
          },
          teamMembers: {
            limit: Number.MAX_SAFE_INTEGER,
            used: 5 // first 5 members are included
          },
          storageMB: {
            limit: 100000, // 100GB
            used: 0
          },
          competitors: {
            limit: 20,
            used: 0
          }
        }
      };
      
    case 'none':
    default:
      // No subscription - requires paid subscription to access features
      throw new Error('A paid subscription is required to access features. Please upgrade to Creator, Influencer, or Enterprise tier.');
  }
}

/**
 * Get the next billing cycle reset date (first day of next month)
 */
function getNextResetDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/**
 * Check if user is a regular user (not an admin)
 */
export function isRegularUser(role: UserRole): boolean {
  return role === UserRole.USER;
}

/**
 * Map subscription tier to user role
 * Admin and super admin roles are handled separately via custom claims
 * @param tier Subscription tier
 * @returns Corresponding user role
 */
export function mapSubscriptionToRole(tier: SubscriptionTier | null): UserRole {
  // All users with any subscription tier get the basic USER role
  // Admin/super admin roles are set via custom claims in Firebase, not subscription tiers
  return UserRole.USER;
}

/**
 * Interface for subscription data
 */
export interface Subscription {
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  seats?: number; // For Enterprise tier
  features?: string[]; // Enabled features
}

/**
 * Interface for user profile
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role: UserRole;
  emailVerified?: boolean;
  marketingOptIn?: boolean;
  firebaseUid?: string;
  termsAccepted?: boolean;
  privacyPolicyAccepted?: boolean;
  profileImageUrl?: string;
  bio?: string;
  timezone?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Organization relationships
  personalOrganizationId?: string;
  organizations?: string[]; 
  currentOrganizationId?: string;
}

/**
 * Interface for user data in Firestore
 */
export interface FirestoreUser {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'pending' | 'deletion_pending';
  personalOrganizationId?: string;
  organizations?: string[];
  currentOrganizationId?: string;
  profileImageUrl?: string;
  bio?: string;
  timezone?: string;
  lastLoginAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletionRequestedAt?: Timestamp;
}

/**
 * Convert Firestore user data to user profile
 * @param id User ID
 * @param data Firestore user data
 * @returns User profile
 */
export function firestoreToUser(id: string, data: FirestoreUser): UserProfile {
  return {
    id,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: data.displayName || `${data.firstName} ${data.lastName}`,
    role: data.role,
    profileImageUrl: data.profileImageUrl,
    bio: data.bio,
    timezone: data.timezone,
    personalOrganizationId: data.personalOrganizationId,
    organizations: data.organizations,
    currentOrganizationId: data.currentOrganizationId,
    lastLoginAt: data.lastLoginAt?.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate()
  };
}

/**
 * Convert user profile to Firestore format
 * @param user User profile
 * @returns Firestore user data (without password hash)
 */
export function userToFirestore(user: UserProfile): Omit<FirestoreUser, 'passwordHash'> {
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    role: user.role,
    status: 'active',
    personalOrganizationId: user.personalOrganizationId,
    organizations: user.organizations,
    currentOrganizationId: user.currentOrganizationId,
    profileImageUrl: user.profileImageUrl,
    bio: user.bio,
    timezone: user.timezone,
    lastLoginAt: user.lastLoginAt ? Timestamp.fromDate(user.lastLoginAt) : undefined,
    createdAt: Timestamp.fromDate(user.createdAt),
    updatedAt: Timestamp.fromDate(user.updatedAt)
  };
} 
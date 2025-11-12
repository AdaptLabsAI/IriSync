import { UserRole } from '../../models/User';
import { SubscriptionTier } from '../../subscription/models/subscription';
import { OrganizationRole, TeamRole } from '../../user/types';

/**
 * Available permission categories for organization
 */
export enum PermissionCategory {
  TEAM = 'team',
  CONTENT = 'content',
  PLATFORMS = 'platforms',
  ANALYTICS = 'analytics',
  SETTINGS = 'settings',
  CRM = 'crm',
  MESSAGING = 'messaging',
  ADVANCED = 'advanced'
}

/**
 * All available permissions with descriptions
 */
export const AVAILABLE_PERMISSIONS = {
  // Team management
  'manage_users': { 
    category: PermissionCategory.TEAM, 
    description: 'Add, edit, and remove team members' 
  },
  'invite_users': { 
    category: PermissionCategory.TEAM, 
    description: 'Invite new team members' 
  },
  'remove_users': { 
    category: PermissionCategory.TEAM, 
    description: 'Remove team members' 
  },
  'edit_team_settings': { 
    category: PermissionCategory.TEAM, 
    description: 'Edit team settings and preferences' 
  },
  'view_team_members': {
    category: PermissionCategory.TEAM,
    description: 'View team members and their roles'
  },
  'assign_roles': {
    category: PermissionCategory.TEAM,
    description: 'Assign or change roles for team members'
  },
  
  // Content
  'view_content': { 
    category: PermissionCategory.CONTENT, 
    description: 'View published and scheduled content' 
  },
  'create_content': { 
    category: PermissionCategory.CONTENT, 
    description: 'Create new content for publishing' 
  },
  'edit_content': { 
    category: PermissionCategory.CONTENT, 
    description: 'Edit any content in the system' 
  },
  'edit_own_content': { 
    category: PermissionCategory.CONTENT, 
    description: 'Edit only content created by this user' 
  },
  'delete_content': { 
    category: PermissionCategory.CONTENT, 
    description: 'Delete content from the system' 
  },
  'publish_content': { 
    category: PermissionCategory.CONTENT, 
    description: 'Publish content to social platforms' 
  },
  'approve_content': { 
    category: PermissionCategory.CONTENT, 
    description: 'Approve content for publishing' 
  },
  'manage_content_calendar': {
    category: PermissionCategory.CONTENT,
    description: 'Manage and organize content calendar'
  },
  'view_content_drafts': {
    category: PermissionCategory.CONTENT,
    description: 'View draft content created by other team members'
  },
  'export_content': {
    category: PermissionCategory.CONTENT,
    description: 'Export content in different formats'
  },
  
  // Platforms
  'manage_platforms': { 
    category: PermissionCategory.PLATFORMS, 
    description: 'Connect and configure social media platforms' 
  },
  'view_platforms': {
    category: PermissionCategory.PLATFORMS,
    description: 'View connected social media platforms'
  },
  'authorize_platforms': {
    category: PermissionCategory.PLATFORMS,
    description: 'Authorize or deauthorize platform connections'
  },
  'monitor_platform_status': {
    category: PermissionCategory.PLATFORMS,
    description: 'Monitor health and status of platform connections'
  },
  
  // Analytics
  'view_analytics': { 
    category: PermissionCategory.ANALYTICS, 
    description: 'View full analytics and reporting' 
  },
  'view_limited_analytics': { 
    category: PermissionCategory.ANALYTICS, 
    description: 'View limited analytics data' 
  },
  'view_reports': { 
    category: PermissionCategory.ANALYTICS, 
    description: 'View predefined reports' 
  },
  'create_reports': { 
    category: PermissionCategory.ANALYTICS, 
    description: 'Create custom reports' 
  },
  'export_analytics': {
    category: PermissionCategory.ANALYTICS,
    description: 'Export analytics data to external formats'
  },
  'share_analytics': {
    category: PermissionCategory.ANALYTICS,
    description: 'Share analytics reports with others'
  },
  'view_competitor_analytics': {
    category: PermissionCategory.ANALYTICS,
    description: 'View competitor analysis and benchmarks'
  },
  'configure_analytics': {
    category: PermissionCategory.ANALYTICS,
    description: 'Configure analytics settings and tracking'
  },
  
  // CRM
  'view_crm': { 
    category: PermissionCategory.CRM, 
    description: 'View customer relationship data' 
  },
  'manage_leads': { 
    category: PermissionCategory.CRM, 
    description: 'Manage leads and sales opportunities' 
  },
  'edit_crm_data': { 
    category: PermissionCategory.CRM, 
    description: 'Edit customer data and relationships' 
  },
  'import_export_crm': {
    category: PermissionCategory.CRM,
    description: 'Import or export CRM data'
  },
  'view_crm_reports': {
    category: PermissionCategory.CRM,
    description: 'View CRM performance reports'
  },
  'manage_crm_settings': {
    category: PermissionCategory.CRM,
    description: 'Configure CRM settings and integrations'
  },
  
  // Messaging
  'view_messages': { 
    category: PermissionCategory.MESSAGING, 
    description: 'View social media messages and comments' 
  },
  'respond_messages': { 
    category: PermissionCategory.MESSAGING, 
    description: 'Respond to messages and comments' 
  },
  'manage_automated_responses': { 
    category: PermissionCategory.MESSAGING, 
    description: 'Set up automated message responses' 
  },
  'manage_inbox_assignments': {
    category: PermissionCategory.MESSAGING,
    description: 'Assign messages to team members'
  },
  'archive_messages': {
    category: PermissionCategory.MESSAGING,
    description: 'Archive or flag messages'
  },
  'view_message_history': {
    category: PermissionCategory.MESSAGING,
    description: 'View complete message history'
  },
  
  // Settings
  'view_settings': { 
    category: PermissionCategory.SETTINGS, 
    description: 'View organization settings' 
  },
  'edit_settings': { 
    category: PermissionCategory.SETTINGS, 
    description: 'Modify organization settings' 
  },
  'manage_billing': {
    category: PermissionCategory.SETTINGS,
    description: 'Manage billing and subscription details'
  },
  'manage_integrations': {
    category: PermissionCategory.SETTINGS,
    description: 'Configure third-party integrations'
  },
  'manage_branding': {
    category: PermissionCategory.SETTINGS,
    description: 'Configure organization branding settings'
  },
  'manage_security': {
    category: PermissionCategory.SETTINGS,
    description: 'Configure security and access settings'
  },
  
  // Advanced
  'access_advanced_features': { 
    category: PermissionCategory.ADVANCED, 
    description: 'Access to advanced platform features' 
  },
  'api_access': { 
    category: PermissionCategory.ADVANCED, 
    description: 'Access to API endpoints and integrations' 
  },
  'custom_automation': {
    category: PermissionCategory.ADVANCED,
    description: 'Create and manage custom automations'
  },
  'manage_webhooks': {
    category: PermissionCategory.ADVANCED,
    description: 'Configure and manage webhooks'
  },
  'access_beta_features': {
    category: PermissionCategory.ADVANCED,
    description: 'Access to beta and experimental features'
  },
  'development_tools': {
    category: PermissionCategory.ADVANCED,
    description: 'Access to developer tools and debugging features'
  }
};

/**
 * Team member with dual-role architecture
 */
export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  organizationRole: OrganizationRole;  // Organization-level role (seat-based)
  teamRole?: TeamRole;                 // Team-specific role (only if MEMBER)
  permissions: string[];               // Specific permission keys
  // New fields for custom permissions
  additionalPermissions?: string[];    // Permissions granted beyond role defaults
  restrictedPermissions?: string[];    // Permissions removed from role defaults
  addedAt: Date;
  lastActiveAt?: Date;
  profileImage?: string;
}

/**
 * Team structure representing a group within an organization
 */
export interface Team {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  members: TeamMember[];
  workflowEnabled: boolean;
  contentApprovalRequired: boolean;
}

/**
 * Organization structure containing teams
 */
export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: 'active' | 'trial' | 'canceled' | 'past_due';
  teams: string[]; // Team IDs
  adminUserIds: string[];
  totalSeats: number;
  usedSeats: number;
  logoUrl?: string;
  settings: OrganizationSettings;
}

/**
 * Organization-wide settings
 */
export interface OrganizationSettings {
  defaultWorkflowEnabled: boolean;
  contentApprovalRequired: boolean;
  brandingEnabled: boolean;
  customDomain?: string;
  ssoEnabled: boolean;
  ssoProvider?: string;
  analyticsSharing: 'all' | 'admins_only' | 'team_only';
  contentSharingPolicy: 'all' | 'team_only' | 'locked';
  inactivityTimeoutDays: number;
}

/**
 * Default permissions for organization-level roles (seat-based)
 */
export const DEFAULT_ORGANIZATION_PERMISSIONS: Record<OrganizationRole, string[]> = {
  [OrganizationRole.OWNER]: [
    // Full access to everything
    'manage_users',
    'invite_users',
    'remove_users',
    'edit_team_settings',
    'view_team_members',
    'assign_roles',
    'transfer_ownership',
    'delete_organization',
    'view_analytics',
    'view_reports',
    'create_reports',
    'export_analytics',
    'share_analytics',
    'view_competitor_analytics',
    'configure_analytics',
    'create_content',
    'edit_content',
    'delete_content',
    'publish_content',
    'approve_content',
    'view_content',
    'manage_content_calendar',
    'view_content_drafts',
    'export_content',
    'manage_platforms',
    'view_platforms',
    'authorize_platforms',
    'monitor_platform_status',
    'view_crm',
    'manage_leads',
    'edit_crm_data',
    'import_export_crm',
    'view_crm_reports',
    'manage_crm_settings',
    'view_messages',
    'respond_messages',
    'manage_automated_responses',
    'manage_inbox_assignments',
    'archive_messages',
    'view_message_history',
    'view_settings',
    'edit_settings',
    'manage_billing',
    'manage_integrations',
    'manage_branding',
    'manage_security',
    'access_advanced_features',
    'api_access',
    'custom_automation',
    'manage_webhooks',
    'access_beta_features',
    'development_tools'
  ],
  [OrganizationRole.ORG_ADMIN]: [
    // Cross-team administration without team membership required
    'manage_users',
    'invite_users',
    'remove_users',
    'edit_team_settings',
    'view_team_members',
    'assign_roles',
    'view_analytics',
    'view_reports',
    'create_reports',
    'export_analytics',
    'share_analytics',
    'view_competitor_analytics',
    'configure_analytics',
    'create_content',
    'edit_content',
    'delete_content',
    'publish_content',
    'approve_content',
    'view_content',
    'manage_content_calendar',
    'view_content_drafts',
    'export_content',
    'manage_platforms',
    'view_platforms',
    'authorize_platforms',
    'monitor_platform_status',
    'view_crm',
    'manage_leads',
    'edit_crm_data',
    'import_export_crm',
    'view_crm_reports',
    'manage_crm_settings',
    'view_messages',
    'respond_messages',
    'manage_automated_responses',
    'manage_inbox_assignments',
    'archive_messages',
    'view_message_history',
    'view_settings',
    'edit_settings',
    'manage_integrations',
    'manage_branding',
    'access_advanced_features',
    'api_access',
    'custom_automation',
    'manage_webhooks',
    'access_beta_features'
  ],
  [OrganizationRole.MEMBER]: [
    // Basic member permissions - team roles provide additional permissions
    'view_team_members',
    'view_settings'
  ],
  [OrganizationRole.VIEWER]: [
    // Analytics and audit access only
    'view_limited_analytics',
    'view_reports',
    'view_team_members',
    'view_settings'
  ]
};

/**
 * Default permissions for team-level roles (feature-based)
 * These are ONLY assigned to organization MEMBERS within specific teams
 */
export const DEFAULT_TEAM_PERMISSIONS: Record<TeamRole, string[]> = {
  [TeamRole.TEAM_ADMIN]: [
    // Team leadership within specific team
    'manage_users',
    'invite_users',
    'remove_users',
    'edit_team_settings',
    'assign_roles',
    'view_analytics',
    'view_reports',
    'create_reports',
    'export_analytics',
    'share_analytics',
    'view_competitor_analytics',
    'create_content',
    'edit_content',
    'delete_content',
    'publish_content',
    'approve_content',
    'view_content',
    'manage_content_calendar',
    'view_content_drafts',
    'export_content',
    'view_platforms',
    'authorize_platforms',
    'monitor_platform_status',
    'view_crm',
    'manage_leads',
    'edit_crm_data',
    'view_crm_reports',
    'view_messages',
    'respond_messages',
    'manage_automated_responses',
    'manage_inbox_assignments',
    'archive_messages',
    'view_message_history'
  ],
  [TeamRole.EDITOR]: [
    // Senior team member capabilities
    'view_analytics',
    'view_reports',
    'create_reports',
    'export_analytics',
    'share_analytics',
    'view_competitor_analytics',
    'create_content',
    'edit_content',
    'delete_content',
    'publish_content',
    'approve_content',
    'view_content',
    'manage_content_calendar',
    'view_content_drafts',
    'export_content',
    'view_platforms',
    'authorize_platforms',
    'monitor_platform_status',
    'view_crm',
    'manage_leads',
    'edit_crm_data',
    'view_crm_reports',
    'view_messages',
    'respond_messages',
    'manage_automated_responses',
    'manage_inbox_assignments',
    'archive_messages',
    'view_message_history'
  ],
  [TeamRole.CONTRIBUTOR]: [
    // Content creation and basic features
    'create_content',
    'edit_own_content',
    'view_content',
    'view_content_drafts',
    'view_limited_analytics',
    'view_reports',
    'view_platforms',
    'view_messages',
    'respond_messages',
    'view_message_history'
  ],
  [TeamRole.OBSERVER]: [
    // Learning role - view only
    'view_content',
    'view_limited_analytics',
    'view_reports',
    'view_platforms',
    'view_messages'
  ]
};

/**
 * Get allowed team sizes based on subscription tier
 * 
 * These limits define the maximum number of seats an organization can have:
 * - Creator: 3 seats max ($80/seat, 100 tokens/seat)
 * - Influencer: 10 seats max ($200/seat, 500 tokens/seat)
 * - Enterprise: Unlimited seats (custom pricing, 5,000 base tokens + 500/seat)
 */
export function getAllowedTeamSize(tier: SubscriptionTier): number {
  switch (tier) {
    case SubscriptionTier.ENTERPRISE:
      return Number.MAX_SAFE_INTEGER; // Unlimited
    case SubscriptionTier.INFLUENCER:
      return 10;
    case SubscriptionTier.CREATOR:
      return 3;
    default:
      return 1; // Just the owner for free tier
  }
}

/**
 * Get the effective permissions for a team member based on their dual-role architecture
 */
export function getEffectivePermissions(member: TeamMember): string[] {
  // Start with organization-level permissions
  const orgPermissions = [...DEFAULT_ORGANIZATION_PERMISSIONS[member.organizationRole]];
  
  // Add team-level permissions if user is a MEMBER with a team role
  let teamPermissions: string[] = [];
  if (member.organizationRole === OrganizationRole.MEMBER && member.teamRole) {
    teamPermissions = [...DEFAULT_TEAM_PERMISSIONS[member.teamRole]];
  }
  
  // Combine permissions without duplicates
  const basePermissions = new Set([...orgPermissions, ...teamPermissions]);
  
  // Add additional custom permissions
  const additionalPerms = member.additionalPermissions || [];
  additionalPerms.forEach(perm => basePermissions.add(perm));
  
  // Convert to array and remove restricted permissions
  const allPermissions = Array.from(basePermissions);
  const restrictedPerms = member.restrictedPermissions || [];
  return allPermissions.filter(perm => !restrictedPerms.includes(perm));
}

/**
 * Check if a user can perform an action based on their effective permissions
 */
export function hasPermission(member: TeamMember, action: string): boolean {
  // OWNER and ORG_ADMIN have broad access
  if (member.organizationRole === OrganizationRole.OWNER || 
      member.organizationRole === OrganizationRole.ORG_ADMIN) {
    return true;
  }
  
  // Check if the permission exists in the user's effective permissions
  const effectivePermissions = getEffectivePermissions(member);
  return effectivePermissions.includes(action);
}

/**
 * Check if a user can perform an action based on their role and permissions
 * @deprecated Use hasPermission(member, action) instead
 */
export function canUserPerformAction(
  userRole: OrganizationRole, 
  permissions: string[], 
  action: string
): boolean {
  // Direct permission check
  if (permissions.includes(action)) {
    return true;
  }
  
  // Role-based fallbacks
  if (userRole === OrganizationRole.ORG_ADMIN) {
    return true; // Org admins can do everything
  }
  
  // Check default role permissions as a fallback
  return DEFAULT_ORGANIZATION_PERMISSIONS[userRole].includes(action);
}

/**
 * Get subscription features available to a specific role
 */
export function getFeaturesByRoleAndTier(
  role: OrganizationRole,
  tier: SubscriptionTier
): string[] {
  // Base features available to all roles
  const baseFeatures = [
    'content_calendar',
    'social_publishing',
    'analytics_basic'
  ];
  
  // Features by tier
  const tierFeatures: Record<SubscriptionTier, string[]> = {
    [SubscriptionTier.CREATOR]: [
      'content_calendar',
      'social_publishing',
      'analytics_basic',
      'scheduling'
    ],
    [SubscriptionTier.INFLUENCER]: [
      'content_calendar',
      'social_publishing',
      'analytics_basic',
      'scheduling',
      'video_scheduling',
      'team_collaboration',
      'approval_workflows',
      'advanced_analytics',
      'competitor_analysis'
    ],
    [SubscriptionTier.ENTERPRISE]: [
      'content_calendar',
      'social_publishing',
      'analytics_basic',
      'scheduling',
      'video_scheduling',
      'team_collaboration',
      'approval_workflows',
      'advanced_analytics',
      'competitor_analysis',
      'custom_reporting',
      'advanced_permissions',
      'sso_integration',
      'advanced_security',
      'priority_support',
      'custom_branding',
      'api_access'
    ]
  };
  
  // Org admins and editors get all tier features
  if (role === OrganizationRole.ORG_ADMIN) {
    return tierFeatures[tier];
  }
  
  // Contributors get limited access to tier features
  if (role === OrganizationRole.MEMBER) {
    const contributorFeatures = [
      ...baseFeatures,
      'scheduling'
    ];
    
    if (tier === SubscriptionTier.INFLUENCER || tier === SubscriptionTier.ENTERPRISE) {
      contributorFeatures.push('team_collaboration');
    }
    
    return contributorFeatures;
  }
  
  // Viewers get the most limited access
  return [
    'content_calendar',
    'analytics_basic'
  ];
}

/**
 * Get all permissions organized by category
 */
export function getPermissionsByCategory(): Record<PermissionCategory, Array<{id: string, description: string}>> {
  const categories: Record<PermissionCategory, Array<{id: string, description: string}>> = {
    [PermissionCategory.TEAM]: [],
    [PermissionCategory.CONTENT]: [],
    [PermissionCategory.PLATFORMS]: [],
    [PermissionCategory.ANALYTICS]: [],
    [PermissionCategory.SETTINGS]: [],
    [PermissionCategory.CRM]: [],
    [PermissionCategory.MESSAGING]: [],
    [PermissionCategory.ADVANCED]: []
  };

  // Organize permissions by category
  Object.entries(AVAILABLE_PERMISSIONS).forEach(([permId, details]) => {
    categories[details.category].push({
      id: permId,
      description: details.description
    });
  });
  
  return categories;
}

/**
 * Get a role's permission summary for display
 */
export function getRolePermissionSummary(role: OrganizationRole): Record<PermissionCategory, string> {
  const summaries: Record<PermissionCategory, string> = {
    [PermissionCategory.TEAM]: '',
    [PermissionCategory.CONTENT]: '',
    [PermissionCategory.PLATFORMS]: '',
    [PermissionCategory.ANALYTICS]: '',
    [PermissionCategory.SETTINGS]: '',
    [PermissionCategory.CRM]: '',
    [PermissionCategory.MESSAGING]: '',
    [PermissionCategory.ADVANCED]: ''
  };

  // Get permissions by category
  const permissions = getPermissionsByCategory();
  
  // Create a lookup for permission IDs by role
  const rolePermissions = new Set(DEFAULT_ORGANIZATION_PERMISSIONS[role]);
  
  // Generate summaries for each category
  Object.entries(permissions).forEach(([category, perms]) => {
    const totalInCategory = perms.length;
    const enabledInCategory = perms.filter(p => rolePermissions.has(p.id)).length;
    
    if (role === OrganizationRole.ORG_ADMIN) {
      summaries[category as PermissionCategory] = 'Full access';
    } else if (enabledInCategory === 0) {
      summaries[category as PermissionCategory] = 'No access';
    } else if (enabledInCategory === totalInCategory) {
      summaries[category as PermissionCategory] = 'Full access';
    } else if (enabledInCategory < totalInCategory / 3) {
      summaries[category as PermissionCategory] = 'Limited access';
    } else if (enabledInCategory < (2 * totalInCategory) / 3) {
      summaries[category as PermissionCategory] = 'Partial access';
    } else {
      summaries[category as PermissionCategory] = 'Most capabilities';
    }
  });
  
  return summaries;
}

/**
 * Get a team role's permission summary for display
 */
export function getTeamRolePermissionSummary(role: TeamRole): Record<PermissionCategory, string> {
  const summaries: Record<PermissionCategory, string> = {
    [PermissionCategory.TEAM]: '',
    [PermissionCategory.CONTENT]: '',
    [PermissionCategory.PLATFORMS]: '',
    [PermissionCategory.ANALYTICS]: '',
    [PermissionCategory.SETTINGS]: '',
    [PermissionCategory.CRM]: '',
    [PermissionCategory.MESSAGING]: '',
    [PermissionCategory.ADVANCED]: ''
  };
  
  // Get permissions by category
  const permsByCategory = getPermissionsByCategory();
  
  // Create a lookup for permission IDs by role
  const rolePermissions = new Set(DEFAULT_TEAM_PERMISSIONS[role]);
  
  // Generate summaries for each category
  Object.entries(permsByCategory).forEach(([category, perms]) => {
    const enabledInCategory = perms.filter(p => rolePermissions.has(p.id)).length;
    
    if (role === TeamRole.TEAM_ADMIN) {
      summaries[category as PermissionCategory] = 'Full team access';
    } else if (enabledInCategory === 0) {
      summaries[category as PermissionCategory] = 'No access';
    } else if (enabledInCategory === perms.length) {
      summaries[category as PermissionCategory] = 'Full access';
    } else {
      summaries[category as PermissionCategory] = `${enabledInCategory}/${perms.length} features`;
    }
  });
  
  return summaries;
}

/**
 * Check if a user has a specific organization role or higher
 */
export function hasOrganizationRole(member: TeamMember, requiredRole: OrganizationRole): boolean {
  const roleHierarchy = {
    [OrganizationRole.OWNER]: 4,
    [OrganizationRole.ORG_ADMIN]: 3,
    [OrganizationRole.MEMBER]: 2,
    [OrganizationRole.VIEWER]: 1
  };
  
  const userRoleLevel = roleHierarchy[member.organizationRole] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
  
  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Check if a user has a specific team role or higher (only applies to MEMBERS)
 */
export function hasTeamRole(member: TeamMember, requiredRole: TeamRole): boolean {
  // Only MEMBERS can have team roles
  if (member.organizationRole !== OrganizationRole.MEMBER || !member.teamRole) {
    return false;
  }
  
  const roleHierarchy = {
    [TeamRole.TEAM_ADMIN]: 4,
    [TeamRole.EDITOR]: 3,
    [TeamRole.CONTRIBUTOR]: 2,
    [TeamRole.OBSERVER]: 1
  };
  
  const userRoleLevel = roleHierarchy[member.teamRole] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
  
  return userRoleLevel >= requiredRoleLevel;
}

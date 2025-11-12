/**
 * Enterprise Team-based TODO system types
 */

import { OrganizationRole, TeamRole } from '@/lib/user/types';

/**
 * Enterprise TODO Priority Levels
 */
export enum TodoPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Enterprise TODO Status with workflow support
 */
export enum TodoStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING_REVIEW = 'pending_review',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

/**
 * Enterprise TODO Types for categorization
 */
export enum TodoType {
  TASK = 'task',
  BUG = 'bug',
  FEATURE = 'feature',
  IMPROVEMENT = 'improvement',
  RESEARCH = 'research',
  MEETING = 'meeting',
  REVIEW = 'review',
  DEPLOYMENT = 'deployment',
  MAINTENANCE = 'maintenance'
}

/**
 * SLA (Service Level Agreement) Configuration
 */
export interface TodoSLA {
  responseTime: number; // Hours to first response
  resolutionTime: number; // Hours to completion
  escalationTime: number; // Hours before escalation
  escalationRoles: (OrganizationRole | TeamRole)[];
  businessHoursOnly: boolean;
}

/**
 * Custom Field Definition for Enterprise flexibility
 */
export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'url' | 'email';
  required: boolean;
  options?: string[]; // For select/multiselect types
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  visibleToRoles: (OrganizationRole | TeamRole)[];
  editableByRoles: (OrganizationRole | TeamRole)[];
}

/**
 * TODO Dependency for project management
 */
export interface TodoDependency {
  id: string;
  type: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates' | 'parent_of' | 'child_of';
  targetTodoId: string;
  createdAt: number;
  createdBy: string;
}

/**
 * TODO Comment for collaboration
 */
export interface TodoComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt?: number;
  mentions: string[]; // User IDs mentioned in comment
  attachments: TodoAttachment[];
  isInternal: boolean; // Internal team comments vs client-visible
  reactions: {
    emoji: string;
    users: string[];
  }[];
}

/**
 * TODO Attachment with enterprise features
 */
export interface TodoAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: number;
  isConfidential: boolean;
  accessRoles: (OrganizationRole | TeamRole)[];
  virusScanStatus: 'pending' | 'clean' | 'infected' | 'failed';
  version: number;
  previousVersions: string[]; // IDs of previous versions
}

/**
 * TODO Time Entry for detailed tracking
 */
export interface TodoTimeEntry {
  id: string;
  userId: string;
  userName: string;
  startTime: number;
  endTime?: number;
  duration: number; // Minutes
  description: string;
  billable: boolean;
  hourlyRate?: number;
  createdAt: number;
  approvedBy?: string;
  approvedAt?: number;
}

/**
 * TODO Workflow Step
 */
export interface TodoWorkflowStep {
  id: string;
  name: string;
  status: TodoStatus;
  assignedTo?: string;
  requiredRoles: (OrganizationRole | TeamRole)[];
  autoAdvanceConditions?: {
    timeBasedHours?: number;
    approvalRequired?: boolean;
    customConditions?: string[];
  };
  notifications: {
    onEntry: boolean;
    onExit: boolean;
    reminderHours?: number[];
  };
}

/**
 * Enterprise Team-scoped TODO item with advanced features
 */
export interface TeamTodoItem {
  // Core identification
  id: string;
  title: string; // Renamed from 'text' for clarity
  description?: string;
  
  // Status and workflow
  status: TodoStatus;
  type: TodoType;
  priority: TodoPriority;
  completed: boolean; // Derived from status
  
  // Team and organization context (REQUIRED)
  teamId: string;
  organizationId: string;
  teamName: string;
  
  // Assignment and ownership
  createdBy: string;
  assignedTo?: string;
  watchers: string[]; // Users watching for updates
  reviewers: string[]; // Users who need to review/approve
  
  // Categorization and organization
  category?: string;
  tags: string[];
  labels: string[]; // Visual labels for quick identification
  
  // Time management
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  timeEntries: TodoTimeEntry[];
  
  // SLA and escalation
  sla?: TodoSLA;
  slaStatus: 'on_track' | 'at_risk' | 'breached';
  escalatedAt?: number;
  escalatedTo?: string[];
  
  // Project management
  dependencies: TodoDependency[];
  parentTodoId?: string;
  childTodoIds: string[];
  milestoneId?: string;
  sprintId?: string;
  epicId?: string;
  
  // Collaboration
  comments: TodoComment[];
  attachments: TodoAttachment[];
  
  // Custom fields for enterprise flexibility
  customFields: Record<string, any>;
  
  // Workflow and approval
  workflowId?: string;
  currentWorkflowStep?: string;
  workflowHistory: {
    stepId: string;
    status: TodoStatus;
    userId: string;
    timestamp: number;
    comment?: string;
  }[];
  
  // AI and automation
  aiSuggestions: {
    suggestedAssignee?: string;
    suggestedPriority?: TodoPriority;
    suggestedCategory?: string;
    suggestedTags?: string[];
    confidence: number;
    lastUpdated: number;
  };
  autoAssignmentRules: string[]; // Rule IDs that apply
  
  // Compliance and audit
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  complianceFlags: string[]; // GDPR, HIPAA, SOX, etc.
  retentionPolicy?: {
    retainUntil: number;
    autoDelete: boolean;
    archiveAfterDays: number;
  };
  
  // Integration
  externalReferences: {
    system: string; // 'jira', 'asana', 'salesforce', etc.
    id: string;
    url?: string;
    syncStatus: 'synced' | 'pending' | 'failed' | 'disabled';
    lastSyncAt?: number;
  }[];
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  lastActivityAt: number;
  
  // Metrics and analytics
  metrics: {
    viewCount: number;
    editCount: number;
    commentCount: number;
    timeToFirstResponse?: number;
    timeToCompletion?: number;
    reopenCount: number;
    escalationCount: number;
  };
  
  // Notifications and subscriptions
  notificationSettings: {
    emailNotifications: boolean;
    slackNotifications: boolean;
    pushNotifications: boolean;
    digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  };
}

/**
 * Legacy user-scoped TODO (for migration reference)
 * @deprecated Use TeamTodoItem instead
 */
export interface LegacyTodoItem {
  id: string;
  text: string;
  completed: boolean;
  category?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: number;
  userId: string;
}

/**
 * TODO category scoped to team
 */
export interface TeamTodoCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  teamId: string;
  organizationId: string;
  createdBy: string;
  createdAt: number;
  isDefault: boolean;
  isArchived: boolean;
  
  // Enterprise features
  defaultAssignee?: string;
  defaultPriority?: TodoPriority;
  defaultSLA?: TodoSLA;
  workflowId?: string;
  customFields: CustomField[];
  autoAssignmentRules: string[];
  
  // Access control
  visibleToRoles: (OrganizationRole | TeamRole)[];
  editableByRoles: (OrganizationRole | TeamRole)[];
}

/**
 * TODO Template for enterprise efficiency
 */
export interface TodoTemplate {
  id: string;
  name: string;
  templateDescription: string; // Renamed to avoid conflict
  teamId: string;
  organizationId: string;
  createdBy: string;
  createdAt: number;
  isPublic: boolean;
  
  // Template content
  title: string;
  description: string;
  type: TodoType;
  priority: TodoPriority;
  category?: string;
  tags: string[];
  estimatedHours?: number;
  
  // Template features
  customFields: Record<string, any>;
  checklistItems: {
    id: string;
    text: string;
    required: boolean;
    order: number;
  }[];
  
  // Auto-assignment
  defaultAssignee?: string;
  assignmentRules: string[];
  
  // Usage tracking
  usageCount: number;
  lastUsedAt?: number;
}

/**
 * Workflow Definition for enterprise automation
 */
export interface TodoWorkflow {
  id: string;
  name: string;
  description: string;
  teamId: string;
  organizationId: string;
  createdBy: string;
  createdAt: number;
  isActive: boolean;
  
  // Workflow configuration
  steps: TodoWorkflowStep[];
  triggers: {
    onCreation: boolean;
    onStatusChange: boolean;
    onAssignment: boolean;
    onDueDate: boolean;
    customTriggers: string[];
  };
  
  // Conditions
  applicableToTypes: TodoType[];
  applicableToPriorities: TodoPriority[];
  applicableToCategories: string[];
  
  // Automation
  autoAssignmentRules: string[];
  notificationRules: string[];
  escalationRules: string[];
  
  // Usage tracking
  usageCount: number;
  lastUsedAt?: number;
}

/**
 * Bulk Operation for enterprise efficiency
 */
export interface BulkOperation {
  id: string;
  type: 'update' | 'delete' | 'assign' | 'move' | 'export';
  todoIds: string[];
  changes: Partial<TeamTodoItem>;
  executedBy: string;
  executedAt: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  errors: string[];
  results: {
    successful: number;
    failed: number;
    skipped: number;
  };
}

/**
 * TODO filter and sort options for team context
 */
export interface TeamTodoFilter {
  // Basic filters
  status: TodoStatus[] | 'all';
  type: TodoType[] | 'all';
  priority: TodoPriority[] | 'all';
  category?: string[];
  assignedTo?: string[];
  createdBy?: string[];
  watchers?: string[];
  
  // Advanced filters
  tags?: string[];
  labels?: string[];
  hasAttachments?: boolean;
  hasComments?: boolean;
  hasDependencies?: boolean;
  isOverdue?: boolean;
  slaStatus?: ('on_track' | 'at_risk' | 'breached')[];
  confidentialityLevel?: ('public' | 'internal' | 'confidential' | 'restricted')[];
  
  // Date filters
  dateRange?: {
    field: 'createdAt' | 'updatedAt' | 'dueDate' | 'completedAt';
    start: string;
    end: string;
  };
  
  // Time filters
  estimatedHoursRange?: { min: number; max: number };
  actualHoursRange?: { min: number; max: number };
  
  // Custom field filters
  customFields?: Record<string, any>;
  
  // Search
  search: string;
  searchFields: ('title' | 'description' | 'comments' | 'tags')[];
  
  // Saved filters
  savedFilterId?: string;
}

/**
 * Enterprise TODO Sort Options
 */
export type TodoSortOption = 
  | 'createdAt' 
  | 'updatedAt' 
  | 'dueDate' 
  | 'priority' 
  | 'status'
  | 'assignedTo'
  | 'title'
  | 'estimatedHours'
  | 'actualHours'
  | 'slaStatus'
  | 'lastActivityAt'
  | 'custom';

/**
 * Enterprise TODO Statistics with advanced metrics
 */
export interface TeamTodoStats {
  // Basic counts
  total: number;
  completed: number;
  active: number;
  overdue: number;
  
  // Status breakdown
  byStatus: Record<TodoStatus, number>;
  byType: Record<TodoType, number>;
  byPriority: Record<TodoPriority, number>;
  byCategory: Record<string, number>;
  byAssignee: Record<string, number>;
  
  // SLA metrics
  slaMetrics: {
    onTrack: number;
    atRisk: number;
    breached: number;
    averageResponseTime: number;
    averageResolutionTime: number;
  };
  
  // Time metrics
  timeMetrics: {
    totalEstimatedHours: number;
    totalActualHours: number;
    averageCompletionTime: number;
    productivityScore: number;
  };
  
  // Collaboration metrics
  collaborationMetrics: {
    totalComments: number;
    totalAttachments: number;
    averageCommentsPerTodo: number;
    mostActiveCollaborators: { userId: string; activityCount: number }[];
  };
  
  // Trend data (last 30 days)
  trends: {
    createdTrend: number[];
    completedTrend: number[];
    overdueRate: number;
    escalationRate: number;
  };
}

/**
 * Enhanced TODO Permissions for enterprise features
 */
export interface TodoPermissions {
  // Basic permissions
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canManageCategories: boolean;
  
  // Advanced permissions
  canViewConfidential: boolean;
  canEditConfidential: boolean;
  canApprove: boolean;
  canEscalate: boolean;
  canManageWorkflows: boolean;
  canManageCustomFields: boolean;
  canViewTimeEntries: boolean;
  canEditTimeEntries: boolean;
  canApproveTimeEntries: boolean;
  canManageDependencies: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  canManageIntegrations: boolean;
  canViewAuditLogs: boolean;
  canManageRetention: boolean;
  canBulkEdit: boolean;
  canManageNotifications: boolean;
}

/**
 * Get TODO permissions based on user's organization and team roles
 * Supports all subscription tiers with appropriate feature access
 */
export function getTodoPermissions(
  organizationRole: OrganizationRole,
  teamRole?: TeamRole,
  isCreator: boolean = false,
  isAssignee: boolean = false,
  subscriptionTier: 'creator' | 'influencer' | 'enterprise' = 'creator'
): TodoPermissions {
  // OWNER and ORG_ADMIN have full access to all team TODOs
  if (organizationRole === OrganizationRole.OWNER || organizationRole === OrganizationRole.ORG_ADMIN) {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canAssign: true,
      canManageCategories: true,
      canViewConfidential: subscriptionTier === 'enterprise',
      canEditConfidential: subscriptionTier === 'enterprise',
      canApprove: subscriptionTier !== 'creator', // Influencer+ gets approval workflows
      canEscalate: subscriptionTier !== 'creator', // Influencer+ gets escalation
      canManageWorkflows: subscriptionTier === 'enterprise', // Enterprise only
      canManageCustomFields: subscriptionTier === 'enterprise', // Enterprise only
      canViewTimeEntries: true, // All tiers can view time entries
      canEditTimeEntries: true, // All tiers can edit time entries
      canApproveTimeEntries: subscriptionTier !== 'creator', // Influencer+ can approve
      canManageDependencies: true, // All tiers get dependencies
      canViewAnalytics: true, // All tiers get basic analytics
      canExportData: subscriptionTier !== 'creator', // Influencer+ gets export
      canManageIntegrations: subscriptionTier === 'enterprise', // Enterprise only
      canViewAuditLogs: subscriptionTier === 'enterprise', // Enterprise only
      canManageRetention: subscriptionTier === 'enterprise', // Enterprise only
      canBulkEdit: true, // All tiers get bulk operations
      canManageNotifications: true // All tiers get notifications
    };
  }
  
  // VIEWER role has read access across all tiers
  if (organizationRole === OrganizationRole.VIEWER) {
    return {
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canAssign: false,
      canManageCategories: false,
      canViewConfidential: false,
      canEditConfidential: false,
      canApprove: false,
      canEscalate: false,
      canManageWorkflows: false,
      canManageCustomFields: false,
      canViewTimeEntries: true, // All tiers can view time entries
      canEditTimeEntries: false,
      canApproveTimeEntries: false,
      canManageDependencies: false,
      canViewAnalytics: true, // All tiers get basic analytics
      canExportData: false,
      canManageIntegrations: false,
      canViewAuditLogs: false,
      canManageRetention: false,
      canBulkEdit: false,
      canManageNotifications: true // All tiers get notification preferences
    };
  }
  
  // MEMBER role permissions based on team role
  if (organizationRole === OrganizationRole.MEMBER && teamRole) {
    switch (teamRole) {
      case TeamRole.TEAM_ADMIN:
        return {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canAssign: true,
          canManageCategories: true,
          canViewConfidential: subscriptionTier === 'enterprise',
          canEditConfidential: subscriptionTier === 'enterprise',
          canApprove: subscriptionTier !== 'creator', // Influencer+ gets approval
          canEscalate: subscriptionTier !== 'creator', // Influencer+ gets escalation
          canManageWorkflows: subscriptionTier === 'enterprise', // Enterprise only
          canManageCustomFields: subscriptionTier === 'enterprise', // Enterprise only
          canViewTimeEntries: true, // All tiers
          canEditTimeEntries: true, // All tiers
          canApproveTimeEntries: subscriptionTier !== 'creator', // Influencer+
          canManageDependencies: true, // All tiers get dependencies
          canViewAnalytics: true, // All tiers get analytics
          canExportData: subscriptionTier !== 'creator', // Influencer+
          canManageIntegrations: false, // Only org admins/owners
          canViewAuditLogs: subscriptionTier === 'enterprise',
          canManageRetention: false, // Only org admins/owners
          canBulkEdit: true, // All tiers get bulk operations
          canManageNotifications: true // All tiers
        };
        
      case TeamRole.EDITOR:
        return {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: isCreator,
          canAssign: true,
          canManageCategories: false,
          canViewConfidential: false,
          canEditConfidential: false,
          canApprove: subscriptionTier !== 'creator', // Influencer+ gets approval
          canEscalate: subscriptionTier !== 'creator', // Influencer+ gets escalation
          canManageWorkflows: false,
          canManageCustomFields: false,
          canViewTimeEntries: true, // All tiers
          canEditTimeEntries: isCreator || isAssignee,
          canApproveTimeEntries: false,
          canManageDependencies: true, // All tiers get dependencies
          canViewAnalytics: true, // All tiers get analytics
          canExportData: false,
          canManageIntegrations: false,
          canViewAuditLogs: false,
          canManageRetention: false,
          canBulkEdit: subscriptionTier !== 'creator', // Influencer+ gets bulk edit
          canManageNotifications: true // All tiers
        };
        
      case TeamRole.CONTRIBUTOR:
        return {
          canView: true,
          canCreate: true,
          canEdit: isCreator || isAssignee,
          canDelete: isCreator,
          canAssign: false,
          canManageCategories: false,
          canViewConfidential: false,
          canEditConfidential: false,
          canApprove: false,
          canEscalate: false,
          canManageWorkflows: false,
          canManageCustomFields: false,
          canViewTimeEntries: isCreator || isAssignee,
          canEditTimeEntries: isCreator || isAssignee,
          canApproveTimeEntries: false,
          canManageDependencies: subscriptionTier !== 'creator', // Influencer+ gets dependencies
          canViewAnalytics: subscriptionTier !== 'creator', // Influencer+ gets analytics
          canExportData: false,
          canManageIntegrations: false,
          canViewAuditLogs: false,
          canManageRetention: false,
          canBulkEdit: false,
          canManageNotifications: true // All tiers
        };
        
      case TeamRole.OBSERVER:
        return {
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canAssign: false,
          canManageCategories: false,
          canViewConfidential: false,
          canEditConfidential: false,
          canApprove: false,
          canEscalate: false,
          canManageWorkflows: false,
          canManageCustomFields: false,
          canViewTimeEntries: true, // All tiers can view
          canEditTimeEntries: false,
          canApproveTimeEntries: false,
          canManageDependencies: false,
          canViewAnalytics: true, // All tiers get basic analytics
          canExportData: false,
          canManageIntegrations: false,
          canViewAuditLogs: false,
          canManageRetention: false,
          canBulkEdit: false,
          canManageNotifications: true // All tiers
        };
    }
  }
  
  // Default: basic permissions for all authenticated users
  return {
    canView: true, // All users can view TODOs
    canCreate: true, // All users can create TODOs
    canEdit: false,
    canDelete: false,
    canAssign: false,
    canManageCategories: false,
    canViewConfidential: false,
    canEditConfidential: false,
    canApprove: false,
    canEscalate: false,
    canManageWorkflows: false,
    canManageCustomFields: false,
    canViewTimeEntries: false,
    canEditTimeEntries: false,
    canApproveTimeEntries: false,
    canManageDependencies: false,
    canViewAnalytics: false,
    canExportData: false,
    canManageIntegrations: false,
    canViewAuditLogs: false,
    canManageRetention: false,
    canBulkEdit: false,
    canManageNotifications: true // All users can manage their notifications
  };
}

/**
 * Default enterprise TODO categories
 */
export const DEFAULT_TODO_CATEGORIES = [
  'Content Creation',
  'Platform Management', 
  'Analytics Review',
  'Team Coordination',
  'Client Communication',
  'General Tasks',
  'Bug Fixes',
  'Feature Development',
  'Research & Planning',
  'Quality Assurance',
  'Deployment',
  'Maintenance'
];

/**
 * Feature availability by subscription tier - inclusive approach
 */
export const ENTERPRISE_FEATURES = {
  creator: [
    // Core TODO functionality for all users
    'basic_todos',
    'basic_filtering',
    'basic_assignment',
    'basic_categories',
    'time_tracking', // All tiers get time tracking
    'comments', // All tiers get collaboration
    'attachments', // All tiers get file attachments
    'basic_analytics', // All tiers get basic metrics
    'notifications', // All tiers get notifications
    'dependencies', // All tiers get task dependencies
    'bulk_operations' // All tiers get bulk operations
  ],
  influencer: [
    // All creator features plus advanced features
    'basic_todos',
    'basic_filtering',
    'basic_assignment',
    'basic_categories',
    'time_tracking',
    'comments',
    'attachments',
    'basic_analytics',
    'notifications',
    'dependencies',
    'bulk_operations',
    // Influencer additions
    'advanced_filtering',
    'templates',
    'basic_workflows',
    'approval_processes',
    'escalation',
    'time_approval',
    'advanced_analytics',
    'data_export',
    'advanced_notifications',
    'team_collaboration'
  ],
  enterprise: [
    // All influencer features plus enterprise-only features
    'basic_todos',
    'basic_filtering',
    'basic_assignment',
    'basic_categories',
    'time_tracking',
    'comments',
    'attachments',
    'basic_analytics',
    'notifications',
    'dependencies',
    'bulk_operations',
    'advanced_filtering',
    'templates',
    'basic_workflows',
    'approval_processes',
    'escalation',
    'time_approval',
    'advanced_analytics',
    'data_export',
    'advanced_notifications',
    'team_collaboration',
    // Enterprise additions
    'advanced_workflows',
    'custom_fields',
    'sla_tracking',
    'audit_logs',
    'compliance_features',
    'external_integrations',
    'ai_suggestions',
    'data_retention',
    'confidentiality_levels',
    'advanced_reporting',
    'custom_automation'
  ]
} as const; 
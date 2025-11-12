import { Timestamp } from 'firebase/firestore';
import { TeamRole } from '../../auth/roles';

/**
 * Defines the possible states in a content workflow
 */
export enum WorkflowState {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  IN_REVIEW = 'in_review',
  CHANGES_REQUESTED = 'changes_requested',
  APPROVED = 'approved',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  ARCHIVED = 'archived'
}

/**
 * Defines the possible actions that can be taken in a workflow
 */
export enum WorkflowAction {
  CREATE = 'create',
  SUBMIT = 'submit',
  REVIEW = 'review',
  REQUEST_CHANGES = 'request_changes',
  APPROVE = 'approve',
  REJECT = 'reject',
  SCHEDULE = 'schedule',
  PUBLISH = 'publish',
  ARCHIVE = 'archive',
  RESTORE = 'restore'
}

/**
 * Defines a single transition in the workflow
 */
export interface WorkflowTransition {
  fromState: WorkflowState;
  toState: WorkflowState;
  action: WorkflowAction;
  allowedRoles: TeamRole[];
}

/**
 * Defines a workflow template that can be applied to content
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  createdBy: string;
  isDefault: boolean;
  transitions: WorkflowTransition[];
  requiredApprovals: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * History entry for a workflow
 */
export interface WorkflowHistoryEntry {
  id: string;
  contentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  fromState: WorkflowState;
  toState: WorkflowState;
  action: WorkflowAction;
  comments?: string;
  timestamp: Timestamp;
}

/**
 * Current status of a content item in a workflow
 */
export interface WorkflowStatus {
  contentId: string;
  templateId: string;
  currentState: WorkflowState;
  assignedReviewers: {
    userId: string;
    status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
    comments?: string;
    timestamp?: Timestamp;
  }[];
  approvalsReceived: number;
  requiredApprovals: number;
  lastUpdatedBy: string;
  lastUpdateAction: WorkflowAction;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Input for creating a new workflow template
 */
export interface CreateWorkflowTemplateInput {
  name: string;
  description: string;
  organizationId: string;
  transitions: WorkflowTransition[];
  requiredApprovals: number;
  isDefault?: boolean;
}

/**
 * Input for updating a workflow template
 */
export interface UpdateWorkflowTemplateInput {
  name?: string;
  description?: string;
  transitions?: WorkflowTransition[];
  requiredApprovals?: number;
  isDefault?: boolean;
}

/**
 * Input for transitioning content through a workflow
 */
export interface WorkflowTransitionInput {
  contentId: string;
  action: WorkflowAction;
  comments?: string;
  assignReviewers?: string[];
}

/**
 * Input for a reviewer submitting their review
 */
export interface ReviewSubmissionInput {
  contentId: string;
  status: 'approved' | 'rejected' | 'changes_requested';
  comments?: string;
}

/**
 * Defines criteria for filtering workflow items
 */
export interface WorkflowFilter {
  states?: WorkflowState[];
  assignedTo?: string;
  createdBy?: string;
  organizationId?: string;
  fromDate?: Date;
  toDate?: Date;
  searchQuery?: string;
} 
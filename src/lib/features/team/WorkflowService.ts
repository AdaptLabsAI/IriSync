/**
 * Workflow Service
 *
 * Manages content approval workflows for team collaboration.
 * Supports multi-step approval chains, comments, and notifications.
 *
 * Workflow Types:
 * - Simple: Single approver (default)
 * - Sequential: Multi-step with sequential approval
 * - Parallel: Multiple approvers review simultaneously
 *
 * Approval States:
 * - Draft: Content is being created
 * - Pending: Submitted for approval
 * - Approved: Content is approved and ready to publish
 * - Rejected: Content needs changes
 * - Published: Content has been published
 */

import { getFirebaseFirestore  } from '@/lib/core/firebase';
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
import { teamService } from './TeamService';

/**
 * Workflow types
 */
export enum WorkflowType {
  SIMPLE = 'simple', // Single approver
  SEQUENTIAL = 'sequential', // Multi-step sequential
  PARALLEL = 'parallel', // Multiple approvers at once
}

/**
 * Approval states
 */
export enum ApprovalState {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHANGES_REQUESTED = 'changes_requested',
  PUBLISHED = 'published',
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  stepNumber: number;
  approverIds: string[]; // User IDs who can approve this step
  requiredApprovals: number; // Number of approvals needed (for parallel)
  approvedBy: string[]; // User IDs who approved
  rejectedBy?: string; // User ID who rejected
  comments?: WorkflowComment[];
}

/**
 * Workflow comment
 */
export interface WorkflowComment {
  id?: string;
  userId: string;
  userName?: string;
  comment: string;
  createdAt: Date;
}

/**
 * Approval workflow
 */
export interface ApprovalWorkflow {
  id?: string;
  organizationId: string;
  name: string;
  description?: string;
  type: WorkflowType;
  steps: WorkflowStep[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Content submission for approval
 */
export interface ContentSubmission {
  id?: string;
  organizationId: string;
  workflowId: string;
  contentType: 'post' | 'campaign' | 'media';
  contentId?: string; // ID of the content being approved (if exists)
  contentData: Record<string, any>; // Content details
  submittedBy: string;
  submittedByName?: string;
  currentState: ApprovalState;
  currentStep: number;
  steps: WorkflowStep[];
  finalApprovedBy?: string;
  finalRejectedBy?: string;
  approvalCompletedAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Approval action
 */
export interface ApprovalAction {
  userId: string;
  action: 'approve' | 'reject' | 'request_changes';
  comment?: string;
  timestamp: Date;
}

class WorkflowService {
  private readonly WORKFLOWS_COLLECTION = 'approvalWorkflows';
  private readonly SUBMISSIONS_COLLECTION = 'contentSubmissions';

  /**
   * Create approval workflow
   */
  async createWorkflow(
    organizationId: string,
    name: string,
    type: WorkflowType,
    approverIds: string[][],
    createdBy: string,
    description?: string
  ): Promise<ApprovalWorkflow> {
    try {
      // Validate approvers exist
      for (const stepApprovers of approverIds) {
        for (const approverId of stepApprovers) {
          const member = await teamService.getTeamMember(approverId, organizationId);
          if (!member) {
            throw new Error(`User ${approverId} is not a team member`);
          }
          if (!member.permissions.canApproveContent) {
            throw new Error(`User ${approverId} does not have approval permissions`);
          }
        }
      }

      // Create workflow steps
      const steps: WorkflowStep[] = approverIds.map((stepApprovers, index) => ({
        stepNumber: index + 1,
        approverIds: stepApprovers,
        requiredApprovals: type === WorkflowType.PARALLEL ? stepApprovers.length : 1,
        approvedBy: [],
      }));

      const workflow: Omit<ApprovalWorkflow, 'id'> = {
        organizationId,
        name,
        description,
        type,
        steps,
        isActive: true,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const firestore = getFirebaseFirestore();
      if (!firestore) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }
      const workflowRef = await addDoc(collection(firestore, this.WORKFLOWS_COLLECTION), {
        ...workflow,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Log activity
      await teamService.logActivity(organizationId, createdBy, 'workflow_created', 'workflow', workflowRef.id, {
        name,
        type,
      });

      return { ...workflow, id: workflowRef.id };
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflows for organization
   */
  async getWorkflows(organizationId: string): Promise<ApprovalWorkflow[]> {
    try {
      const workflowsQuery = query(
        collection(firestore, this.WORKFLOWS_COLLECTION),
        where('organizationId', '==', organizationId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const workflowsDocs = await getDocs(workflowsQuery);
      const workflows: ApprovalWorkflow[] = [];

      workflowsDocs.forEach((doc) => {
        const data = doc.data();
        workflows.push({
          id: doc.id,
          organizationId: data.organizationId,
          name: data.name,
          description: data.description,
          type: data.type,
          steps: data.steps,
          isActive: data.isActive,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      return workflows;
    } catch (error) {
      console.error('Error getting workflows:', error);
      return [];
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<ApprovalWorkflow | null> {
    try {
      const workflowDoc = await getDoc(doc(firestore, this.WORKFLOWS_COLLECTION, workflowId));

      if (!workflowDoc.exists()) {
        return null;
      }

      const data = workflowDoc.data();
      return {
        id: workflowDoc.id,
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
        type: data.type,
        steps: data.steps,
        isActive: data.isActive,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error getting workflow:', error);
      return null;
    }
  }

  /**
   * Submit content for approval
   */
  async submitForApproval(
    organizationId: string,
    workflowId: string,
    contentType: 'post' | 'campaign' | 'media',
    contentData: Record<string, any>,
    submittedBy: string,
    contentId?: string
  ): Promise<ContentSubmission> {
    try {
      // Get workflow
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Get submitter name
      const userDoc = await getDoc(doc(firestore, 'users', submittedBy));
      const submittedByName = userDoc.exists()
        ? userDoc.data().name || userDoc.data().email
        : undefined;

      // Create submission with workflow steps
      const submission: Omit<ContentSubmission, 'id'> = {
        organizationId,
        workflowId,
        contentType,
        contentId,
        contentData,
        submittedBy,
        submittedByName,
        currentState: ApprovalState.PENDING,
        currentStep: 1,
        steps: JSON.parse(JSON.stringify(workflow.steps)), // Deep copy
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const submissionRef = await addDoc(collection(firestore, this.SUBMISSIONS_COLLECTION), {
        ...submission,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Log activity
      await teamService.logActivity(
        organizationId,
        submittedBy,
        'content_submitted',
        contentType,
        submissionRef.id,
        { workflowId, workflowName: workflow.name }
      );

      // TODO: Send notifications to approvers
      // This would integrate with email/notification service

      return { ...submission, id: submissionRef.id };
    } catch (error) {
      console.error('Error submitting for approval:', error);
      throw error;
    }
  }

  /**
   * Approve content
   */
  async approveContent(
    submissionId: string,
    userId: string,
    comment?: string
  ): Promise<ContentSubmission> {
    try {
      const submissionRef = doc(firestore, this.SUBMISSIONS_COLLECTION, submissionId);
      const submissionDoc = await getDoc(submissionRef);

      if (!submissionDoc.exists()) {
        throw new Error('Submission not found');
      }

      const submission = submissionDoc.data() as ContentSubmission;

      // Verify user can approve current step
      const currentStep = submission.steps[submission.currentStep - 1];
      if (!currentStep.approverIds.includes(userId)) {
        throw new Error('User is not an approver for this step');
      }

      // Check if already approved
      if (currentStep.approvedBy.includes(userId)) {
        throw new Error('User has already approved this step');
      }

      // Add approval
      currentStep.approvedBy.push(userId);

      // Add comment if provided
      if (comment) {
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        const userName = userDoc.exists() ? userDoc.data().name || userDoc.data().email : undefined;

        if (!currentStep.comments) {
          currentStep.comments = [];
        }

        currentStep.comments.push({
          userId,
          userName,
          comment,
          createdAt: new Date(),
        });
      }

      // Check if step is complete
      const isStepComplete = currentStep.approvedBy.length >= currentStep.requiredApprovals;

      let newState = submission.currentState;
      let newStepNumber = submission.currentStep;
      let approvalCompletedAt: Date | undefined;

      if (isStepComplete) {
        // Move to next step or complete
        if (submission.currentStep < submission.steps.length) {
          newStepNumber = submission.currentStep + 1;
        } else {
          newState = ApprovalState.APPROVED;
          approvalCompletedAt = new Date();
        }
      }

      // Update submission
      await updateDoc(submissionRef, {
        steps: submission.steps,
        currentState: newState,
        currentStep: newStepNumber,
        finalApprovedBy: newState === ApprovalState.APPROVED ? userId : undefined,
        approvalCompletedAt: approvalCompletedAt ? Timestamp.fromDate(approvalCompletedAt) : undefined,
        updatedAt: Timestamp.now(),
      });

      // Log activity
      await teamService.logActivity(
        submission.organizationId,
        userId,
        newState === ApprovalState.APPROVED ? 'content_approved' : 'step_approved',
        submission.contentType,
        submissionId,
        { step: submission.currentStep, comment }
      );

      return {
        ...submission,
        currentState: newState,
        currentStep: newStepNumber,
        finalApprovedBy: newState === ApprovalState.APPROVED ? userId : undefined,
        approvalCompletedAt,
      };
    } catch (error) {
      console.error('Error approving content:', error);
      throw error;
    }
  }

  /**
   * Reject content
   */
  async rejectContent(
    submissionId: string,
    userId: string,
    comment: string
  ): Promise<ContentSubmission> {
    try {
      const submissionRef = doc(firestore, this.SUBMISSIONS_COLLECTION, submissionId);
      const submissionDoc = await getDoc(submissionRef);

      if (!submissionDoc.exists()) {
        throw new Error('Submission not found');
      }

      const submission = submissionDoc.data() as ContentSubmission;

      // Verify user can reject current step
      const currentStep = submission.steps[submission.currentStep - 1];
      if (!currentStep.approverIds.includes(userId)) {
        throw new Error('User is not an approver for this step');
      }

      // Add comment
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      const userName = userDoc.exists() ? userDoc.data().name || userDoc.data().email : undefined;

      if (!currentStep.comments) {
        currentStep.comments = [];
      }

      currentStep.comments.push({
        userId,
        userName,
        comment,
        createdAt: new Date(),
      });

      currentStep.rejectedBy = userId;

      // Update submission
      await updateDoc(submissionRef, {
        steps: submission.steps,
        currentState: ApprovalState.REJECTED,
        finalRejectedBy: userId,
        approvalCompletedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Log activity
      await teamService.logActivity(
        submission.organizationId,
        userId,
        'content_rejected',
        submission.contentType,
        submissionId,
        { comment }
      );

      return {
        ...submission,
        currentState: ApprovalState.REJECTED,
        finalRejectedBy: userId,
        approvalCompletedAt: new Date(),
      };
    } catch (error) {
      console.error('Error rejecting content:', error);
      throw error;
    }
  }

  /**
   * Request changes
   */
  async requestChanges(
    submissionId: string,
    userId: string,
    comment: string
  ): Promise<ContentSubmission> {
    try {
      const submissionRef = doc(firestore, this.SUBMISSIONS_COLLECTION, submissionId);
      const submissionDoc = await getDoc(submissionRef);

      if (!submissionDoc.exists()) {
        throw new Error('Submission not found');
      }

      const submission = submissionDoc.data() as ContentSubmission;

      // Verify user can request changes
      const currentStep = submission.steps[submission.currentStep - 1];
      if (!currentStep.approverIds.includes(userId)) {
        throw new Error('User is not an approver for this step');
      }

      // Add comment
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      const userName = userDoc.exists() ? userDoc.data().name || userDoc.data().email : undefined;

      if (!currentStep.comments) {
        currentStep.comments = [];
      }

      currentStep.comments.push({
        userId,
        userName,
        comment,
        createdAt: new Date(),
      });

      // Update submission
      await updateDoc(submissionRef, {
        steps: submission.steps,
        currentState: ApprovalState.CHANGES_REQUESTED,
        updatedAt: Timestamp.now(),
      });

      // Log activity
      await teamService.logActivity(
        submission.organizationId,
        userId,
        'changes_requested',
        submission.contentType,
        submissionId,
        { comment }
      );

      return {
        ...submission,
        currentState: ApprovalState.CHANGES_REQUESTED,
      };
    } catch (error) {
      console.error('Error requesting changes:', error);
      throw error;
    }
  }

  /**
   * Get pending submissions for user
   */
  async getPendingSubmissions(userId: string, organizationId: string): Promise<ContentSubmission[]> {
    try {
      const submissionsQuery = query(
        collection(firestore, this.SUBMISSIONS_COLLECTION),
        where('organizationId', '==', organizationId),
        where('currentState', '==', ApprovalState.PENDING),
        orderBy('createdAt', 'desc')
      );

      const submissionsDocs = await getDocs(submissionsQuery);
      const submissions: ContentSubmission[] = [];

      submissionsDocs.forEach((doc) => {
        const data = doc.data();
        const submission = {
          id: doc.id,
          organizationId: data.organizationId,
          workflowId: data.workflowId,
          contentType: data.contentType,
          contentId: data.contentId,
          contentData: data.contentData,
          submittedBy: data.submittedBy,
          submittedByName: data.submittedByName,
          currentState: data.currentState,
          currentStep: data.currentStep,
          steps: data.steps,
          finalApprovedBy: data.finalApprovedBy,
          finalRejectedBy: data.finalRejectedBy,
          approvalCompletedAt: data.approvalCompletedAt?.toDate(),
          publishedAt: data.publishedAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };

        // Check if user is an approver for current step
        const currentStep = submission.steps[submission.currentStep - 1];
        if (currentStep && currentStep.approverIds.includes(userId)) {
          submissions.push(submission);
        }
      });

      return submissions;
    } catch (error) {
      console.error('Error getting pending submissions:', error);
      return [];
    }
  }

  /**
   * Get all submissions for organization
   */
  async getSubmissions(
    organizationId: string,
    filters?: {
      state?: ApprovalState;
      contentType?: 'post' | 'campaign' | 'media';
      submittedBy?: string;
    },
    limitCount: number = 50
  ): Promise<ContentSubmission[]> {
    try {
      let submissionsQuery = query(
        collection(firestore, this.SUBMISSIONS_COLLECTION),
        where('organizationId', '==', organizationId)
      );

      if (filters?.state) {
        submissionsQuery = query(submissionsQuery, where('currentState', '==', filters.state));
      }

      if (filters?.contentType) {
        submissionsQuery = query(submissionsQuery, where('contentType', '==', filters.contentType));
      }

      if (filters?.submittedBy) {
        submissionsQuery = query(submissionsQuery, where('submittedBy', '==', filters.submittedBy));
      }

      submissionsQuery = query(
        submissionsQuery,
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );

      const submissionsDocs = await getDocs(submissionsQuery);
      const submissions: ContentSubmission[] = [];

      submissionsDocs.forEach((doc) => {
        const data = doc.data();
        submissions.push({
          id: doc.id,
          organizationId: data.organizationId,
          workflowId: data.workflowId,
          contentType: data.contentType,
          contentId: data.contentId,
          contentData: data.contentData,
          submittedBy: data.submittedBy,
          submittedByName: data.submittedByName,
          currentState: data.currentState,
          currentStep: data.currentStep,
          steps: data.steps,
          finalApprovedBy: data.finalApprovedBy,
          finalRejectedBy: data.finalRejectedBy,
          approvalCompletedAt: data.approvalCompletedAt?.toDate(),
          publishedAt: data.publishedAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      return submissions;
    } catch (error) {
      console.error('Error getting submissions:', error);
      return [];
    }
  }

  /**
   * Get submission by ID
   */
  async getSubmission(submissionId: string): Promise<ContentSubmission | null> {
    try {
      const submissionDoc = await getDoc(doc(firestore, this.SUBMISSIONS_COLLECTION, submissionId));

      if (!submissionDoc.exists()) {
        return null;
      }

      const data = submissionDoc.data();
      return {
        id: submissionDoc.id,
        organizationId: data.organizationId,
        workflowId: data.workflowId,
        contentType: data.contentType,
        contentId: data.contentId,
        contentData: data.contentData,
        submittedBy: data.submittedBy,
        submittedByName: data.submittedByName,
        currentState: data.currentState,
        currentStep: data.currentStep,
        steps: data.steps,
        finalApprovedBy: data.finalApprovedBy,
        finalRejectedBy: data.finalRejectedBy,
        approvalCompletedAt: data.approvalCompletedAt?.toDate(),
        publishedAt: data.publishedAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error getting submission:', error);
      return null;
    }
  }

  /**
   * Mark content as published
   */
  async markAsPublished(submissionId: string, publishedBy: string): Promise<void> {
    try {
      const submissionRef = doc(firestore, this.SUBMISSIONS_COLLECTION, submissionId);
      const submissionDoc = await getDoc(submissionRef);

      if (!submissionDoc.exists()) {
        throw new Error('Submission not found');
      }

      const submission = submissionDoc.data() as ContentSubmission;

      if (submission.currentState !== ApprovalState.APPROVED) {
        throw new Error('Content must be approved before publishing');
      }

      await updateDoc(submissionRef, {
        currentState: ApprovalState.PUBLISHED,
        publishedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Log activity
      await teamService.logActivity(
        submission.organizationId,
        publishedBy,
        'content_published',
        submission.contentType,
        submissionId,
        {}
      );
    } catch (error) {
      console.error('Error marking as published:', error);
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string, deletedBy: string): Promise<void> {
    try {
      const workflowRef = doc(firestore, this.WORKFLOWS_COLLECTION, workflowId);
      const workflowDoc = await getDoc(workflowRef);

      if (!workflowDoc.exists()) {
        throw new Error('Workflow not found');
      }

      const workflowData = workflowDoc.data();

      // Mark as inactive instead of deleting
      await updateDoc(workflowRef, {
        isActive: false,
        updatedAt: Timestamp.now(),
      });

      // Log activity
      await teamService.logActivity(
        workflowData.organizationId,
        deletedBy,
        'workflow_deleted',
        'workflow',
        workflowId,
        { name: workflowData.name }
      );
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();

import { firestore } from '../../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  setDoc,
  Timestamp,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  DocumentReference,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  writeBatch
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { 
  WorkflowState, 
  WorkflowAction, 
  WorkflowTemplate, 
  WorkflowStatus, 
  WorkflowHistoryEntry,
  WorkflowTransition,
  CreateWorkflowTemplateInput,
  UpdateWorkflowTemplateInput,
  WorkflowTransitionInput,
  ReviewSubmissionInput,
  WorkflowFilter
} from '../models/workflow';
import { TeamRole } from '../../auth/roles';
import { Logger } from '../../logging/logger';
import { ContentItem } from '../CalendarService';
import { getUserProfile } from '../../auth/userProfile';

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class WorkflowService {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger({
      minLevel: 'info',
      enableConsole: true,
      enableRemote: process.env.NODE_ENV === 'production'
    });
  }
  
  /**
   * Create a new workflow template
   */
  async createTemplate(input: CreateWorkflowTemplateInput, userId: string): Promise<WorkflowTemplate> {
    try {
      // Validate input
      this.validateTemplate(input);
      
      const now = Timestamp.now();
      const templateId = uuidv4();
      
      // If this is set as default, we need to unset any existing default templates
      if (input.isDefault) {
        await this.unsetDefaultTemplate(input.organizationId);
      }
      
      const template: WorkflowTemplate = {
        id: templateId,
        name: input.name,
        description: input.description,
        organizationId: input.organizationId,
        createdBy: userId,
        isDefault: input.isDefault || false,
        transitions: input.transitions,
        requiredApprovals: input.requiredApprovals,
        createdAt: now,
        updatedAt: now
      };
      
      // Use modern Firebase v9 syntax
      await setDoc(doc(firestore, 'workflow_templates', templateId), template);
      
      this.logger.info('Created workflow template', { templateId, organizationId: input.organizationId });
      
      return template;
    } catch (error) {
      this.logger.error('Failed to create workflow template', { error, input });
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError('Failed to create workflow template');
    }
  }
  
  /**
   * Update an existing workflow template
   */
  async updateTemplate(
    templateId: string, 
    input: UpdateWorkflowTemplateInput, 
    userId: string
  ): Promise<WorkflowTemplate> {
    try {
      const templateRef = doc(firestore, 'workflow_templates', templateId);
      const templateSnap = await getDoc(templateRef);
      
      if (!templateSnap.exists()) {
        throw new WorkflowError('Workflow template not found');
      }
      
      const template = templateSnap.data() as WorkflowTemplate;
      
      // Check if this is becoming the default template
      if (input.isDefault && !template.isDefault) {
        await this.unsetDefaultTemplate(template.organizationId);
      }
      
      // Prepare updates
      const updates: Partial<WorkflowTemplate> = {
        ...input,
        updatedAt: Timestamp.now()
      };
      
      // If transitions are being updated, validate them
      if (input.transitions) {
        this.validateTransitions(input.transitions);
      }
      
      await updateDoc(templateRef, updates);
      
      this.logger.info('Updated workflow template', { templateId, organizationId: template.organizationId });
      
      return {
        ...template,
        ...updates
      } as WorkflowTemplate;
    } catch (error) {
      this.logger.error('Failed to update workflow template', { error, templateId, input });
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError('Failed to update workflow template');
    }
  }
  
  /**
   * Get a workflow template by ID
   */
  async getTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    try {
      const templateSnap = await getDoc(doc(firestore, 'workflow_templates', templateId));
      
      if (!templateSnap.exists()) {
        return null;
      }
      
      return templateSnap.data() as WorkflowTemplate;
    } catch (error) {
      this.logger.error('Failed to get workflow template', { error, templateId });
      throw new WorkflowError('Failed to get workflow template');
    }
  }
  
  /**
   * Get all workflow templates for an organization
   */
  async getTemplates(organizationId: string): Promise<WorkflowTemplate[]> {
    try {
      const templatesQuery = query(
        collection(firestore, 'workflow_templates'),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc')
      );
      
      const templatesSnap = await getDocs(templatesQuery);
      
      return templatesSnap.docs.map(doc => doc.data() as WorkflowTemplate);
    } catch (error) {
      this.logger.error('Failed to get workflow templates', { error, organizationId });
      throw new WorkflowError('Failed to get workflow templates');
    }
  }
  
  /**
   * Get the default workflow template for an organization
   */
  async getDefaultTemplate(organizationId: string): Promise<WorkflowTemplate | null> {
    try {
      const defaultQuery = query(
        collection(firestore, 'workflow_templates'),
        where('organizationId', '==', organizationId),
        where('isDefault', '==', true),
        limit(1)
      );
      
      const defaultSnap = await getDocs(defaultQuery);
      
      if (defaultSnap.empty) {
        return null;
      }
      
      return defaultSnap.docs[0].data() as WorkflowTemplate;
    } catch (error) {
      this.logger.error('Failed to get default workflow template', { error, organizationId });
      throw new WorkflowError('Failed to get default workflow template');
    }
  }
  
  /**
   * Delete a workflow template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      // Check if template exists
      const templateRef = doc(firestore, 'workflow_templates', templateId);
      const templateSnap = await getDoc(templateRef);
      
      if (!templateSnap.exists()) {
        throw new WorkflowError('Workflow template not found');
      }
      
      // Check if any content items are using this template
      const contentQuery = query(
        collection(firestore, 'workflow_status'),
        where('templateId', '==', templateId),
        limit(1)
      );
      
      const contentSnap = await getDocs(contentQuery);
      
      if (!contentSnap.empty) {
        throw new WorkflowError('Cannot delete template because it is in use by content items');
      }
      
      // Delete the template
      await updateDoc(templateRef, { isDeleted: true, updatedAt: Timestamp.now() });
      
      this.logger.info('Deleted workflow template', { templateId });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to delete workflow template', { error, templateId });
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError('Failed to delete workflow template');
    }
  }
  
  /**
   * Associate content with a workflow
   */
  async initContentWorkflow(
    contentId: string, 
    templateId: string, 
    userId: string
  ): Promise<WorkflowStatus> {
    try {
      // Get the content and template
      const [contentSnap, templateSnap] = await Promise.all([
        getDoc(doc(firestore, 'content', contentId)),
        getDoc(doc(firestore, 'workflow_templates', templateId))
      ]);
      
      if (!contentSnap.exists()) {
        throw new WorkflowError('Content not found');
      }
      
      if (!templateSnap.exists()) {
        throw new WorkflowError('Workflow template not found');
      }
      
      const content = contentSnap.data() as ContentItem;
      const template = templateSnap.data() as WorkflowTemplate;
      
      // Check if content already has a workflow
      const existingQuery = query(
        collection(firestore, 'workflow_status'),
        where('contentId', '==', contentId),
        limit(1)
      );
      
      const existingSnap = await getDocs(existingQuery);
      
      if (!existingSnap.empty) {
        throw new WorkflowError('Content already has a workflow');
      }
      
      const now = Timestamp.now();
      
      // Create workflow status
      const status: WorkflowStatus = {
        contentId,
        templateId,
        currentState: WorkflowState.DRAFT,
        assignedReviewers: [],
        approvalsReceived: 0,
        requiredApprovals: template.requiredApprovals,
        lastUpdatedBy: userId,
        lastUpdateAction: WorkflowAction.CREATE,
        createdAt: now,
        updatedAt: now
      };
      
      // Create history entry
      const historyEntry: WorkflowHistoryEntry = {
        id: uuidv4(),
        contentId,
        userId,
        userName: await getUserDisplayName(userId),
        fromState: WorkflowState.DRAFT,
        toState: WorkflowState.DRAFT,
        action: WorkflowAction.CREATE,
        timestamp: now
      };
      
      // Create both documents in Firestore using modern syntax
      await Promise.all([
        setDoc(doc(firestore, 'workflow_status', contentId), status),
        addDoc(collection(firestore, 'workflow_history'), historyEntry)
      ]);
      
      this.logger.info('Initialized content workflow', { contentId, templateId });
      
      return status;
    } catch (error) {
      this.logger.error('Failed to initialize content workflow', { error, contentId, templateId });
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError('Failed to initialize content workflow');
    }
  }
  
  /**
   * Get workflow status for a content item
   */
  async getWorkflowStatus(contentId: string): Promise<WorkflowStatus | null> {
    try {
      const statusSnap = await getDoc(doc(firestore, 'workflow_status', contentId));
      
      if (!statusSnap.exists()) {
        return null;
      }
      
      return statusSnap.data() as WorkflowStatus;
    } catch (error) {
      this.logger.error('Failed to get workflow status', { error, contentId });
      throw new WorkflowError('Failed to get workflow status');
    }
  }
  
  /**
   * Get workflow history for a content item
   */
  async getWorkflowHistory(contentId: string): Promise<WorkflowHistoryEntry[]> {
    try {
      const historyQuery = query(
        collection(firestore, 'workflow_history'),
        where('contentId', '==', contentId),
        orderBy('timestamp', 'desc')
      );
      
      const historySnap = await getDocs(historyQuery);
      
      return historySnap.docs.map(doc => doc.data() as WorkflowHistoryEntry);
    } catch (error) {
      this.logger.error('Failed to get workflow history', { error, contentId });
      throw new WorkflowError('Failed to get workflow history');
    }
  }
  
  /**
   * Transition content to a new workflow state
   */
  async transitionWorkflow(
    input: WorkflowTransitionInput, 
    userId: string, 
    userRole: TeamRole
  ): Promise<WorkflowStatus> {
    try {
      const { contentId, action, comments, assignReviewers } = input;
      
      return await runTransaction(firestore, async (transaction) => {
        // Get current workflow status
        const statusRef = doc(firestore, 'workflow_status', contentId);
        const statusSnap = await transaction.get(statusRef);
        
        if (!statusSnap.exists()) {
          throw new WorkflowError('Content workflow not found');
        }
        
        const status = statusSnap.data() as WorkflowStatus;
        
        // Get the template
        const templateRef = doc(firestore, 'workflow_templates', status.templateId);
        const templateSnap = await transaction.get(templateRef);
        
        if (!templateSnap.exists()) {
          throw new WorkflowError('Workflow template not found');
        }
        
        const template = templateSnap.data() as WorkflowTemplate;
        
        // Find valid transition
        const transition = template.transitions.find(t => 
          t.fromState === status.currentState && 
          t.action === action &&
          t.allowedRoles.includes(userRole)
        );
        
        if (!transition) {
          throw new WorkflowError(`Invalid transition: ${status.currentState} -> ${action} for role ${userRole}`);
        }
        
        const fromState = status.currentState;
        const toState = transition.toState;
        const now = Timestamp.now();
        
        // Update assignedReviewers if specified and action is SUBMIT
        let updatedStatus = { ...status };
        if (action === WorkflowAction.SUBMIT && assignReviewers && assignReviewers.length > 0) {
          updatedStatus.assignedReviewers = assignReviewers.map(reviewerId => ({
            userId: reviewerId,
            status: 'pending',
            timestamp: now
          }));
        }
        
        // Update workflow status
        const statusUpdates = {
          currentState: toState,
          lastUpdatedBy: userId,
          lastUpdateAction: action,
          updatedAt: now,
          assignedReviewers: updatedStatus.assignedReviewers
        };
        
        transaction.update(statusRef, statusUpdates);
        
        // Create history entry
        const historyEntry: WorkflowHistoryEntry = {
          id: uuidv4(),
          contentId,
          userId,
          userName: await getUserDisplayName(userId),
          fromState,
          toState,
          action,
          comments,
          timestamp: now
        };
        
        const historyRef = doc(collection(firestore, 'workflow_history'));
        transaction.set(historyRef, historyEntry);
        
        // If transitioning to APPROVED or REJECTED, update content status
        if (toState === WorkflowState.APPROVED || toState === WorkflowState.REJECTED) {
          const contentRef = doc(firestore, 'content', contentId);
          const contentSnap = await transaction.get(contentRef);
          
          if (contentSnap.exists()) {
            const content = contentSnap.data() as ContentItem;
            
            transaction.update(contentRef, {
              status: toState === WorkflowState.APPROVED ? 'scheduled' : 'draft',
              updatedAt: now
            });
          }
        }
        
        this.logger.info('Transitioned content workflow', { 
          contentId, 
          fromState, 
          toState, 
          action,
          userId,
          userRole
        });
        
        return {
          ...status,
          ...statusUpdates
        } as WorkflowStatus;
      });
    } catch (error) {
      this.logger.error('Failed to transition workflow', { error, input });
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError('Failed to transition workflow');
    }
  }
  
  /**
   * Submit a review for content
   */
  async submitReview(
    input: ReviewSubmissionInput, 
    userId: string
  ): Promise<WorkflowStatus> {
    try {
      const { contentId, status: reviewStatus, comments } = input;
      
      return await runTransaction(firestore, async (transaction) => {
        // Get current workflow status
        const statusRef = doc(firestore, 'workflow_status', contentId);
        const statusSnap = await transaction.get(statusRef);
        
        if (!statusSnap.exists()) {
          throw new WorkflowError('Content workflow not found');
        }
        
        const workflowStatus = statusSnap.data() as WorkflowStatus;
        
        // Check if user is an assigned reviewer
        const reviewerIndex = workflowStatus.assignedReviewers.findIndex(r => r.userId === userId);
        
        if (reviewerIndex === -1) {
          throw new WorkflowError('User is not an assigned reviewer for this content');
        }
        
        // Update reviewer status
        const updatedReviewers = [...workflowStatus.assignedReviewers];
        updatedReviewers[reviewerIndex] = {
          ...updatedReviewers[reviewerIndex],
          status: reviewStatus,
          comments,
          timestamp: Timestamp.now()
        };
        
        // Calculate new approvals count
        let approvalsReceived = 0;
        for (const reviewer of updatedReviewers) {
          if (reviewer.status === 'approved') {
            approvalsReceived++;
          }
        }
        
        // Determine if workflow state should change based on reviews
        let newState = workflowStatus.currentState;
        let action: WorkflowAction = WorkflowAction.REVIEW;
        
        if (reviewStatus === 'changes_requested') {
          newState = WorkflowState.CHANGES_REQUESTED;
          action = WorkflowAction.REQUEST_CHANGES;
        } else if (approvalsReceived >= workflowStatus.requiredApprovals) {
          newState = WorkflowState.APPROVED;
          action = WorkflowAction.APPROVE;
        } else if (updatedReviewers.every(r => r.status !== 'pending')) {
          // All reviewers have submitted and not enough approvals
          if (updatedReviewers.some(r => r.status === 'rejected')) {
            newState = WorkflowState.REJECTED;
            action = WorkflowAction.REJECT;
          }
        }
        
        const now = Timestamp.now();
        
        // Update workflow status
        const updates: Partial<WorkflowStatus> = {
          assignedReviewers: updatedReviewers,
          approvalsReceived,
          currentState: newState,
          lastUpdatedBy: userId,
          lastUpdateAction: action,
          updatedAt: now
        };
        
        transaction.update(statusRef, updates);
        
        // Create history entry
        const historyEntry: WorkflowHistoryEntry = {
          id: uuidv4(),
          contentId,
          userId,
          userName: await getUserDisplayName(userId),
          fromState: workflowStatus.currentState,
          toState: newState,
          action,
          comments,
          timestamp: now
        };
        
        const historyRef = doc(collection(firestore, 'workflow_history'));
        transaction.set(historyRef, historyEntry);
        
        // If state changed to APPROVED or REJECTED, update content status
        if (
          (newState === WorkflowState.APPROVED || newState === WorkflowState.REJECTED) && 
          newState !== workflowStatus.currentState
        ) {
          const contentRef = doc(firestore, 'content', contentId);
          const contentSnap = await transaction.get(contentRef);
          
          if (contentSnap.exists()) {
            transaction.update(contentRef, {
              status: newState === WorkflowState.APPROVED ? 'scheduled' : 'draft',
              updatedAt: now
            });
          }
        }
        
        this.logger.info('Submitted content review', { 
          contentId, 
          reviewStatus,
          approvalsReceived,
          requiredApprovals: workflowStatus.requiredApprovals,
          newState
        });
        
        return {
          ...workflowStatus,
          ...updates
        } as WorkflowStatus;
      });
    } catch (error) {
      this.logger.error('Failed to submit review', { error, input });
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError('Failed to submit review');
    }
  }
  
  /**
   * Find content items in specific workflow states
   */
  async findWorkflowItems(filter: WorkflowFilter): Promise<ContentItem[]> {
    try {
      // Build query constraints
      const constraints: any[] = [];
      
      if (filter.organizationId) {
        constraints.push(where('organizationId', '==', filter.organizationId));
      }
      
      // First get workflow status items that match filter
      let workflowQuery = query(collection(firestore, 'workflow_status'));
      
      if (filter.states && filter.states.length > 0) {
        workflowQuery = query(workflowQuery, where('currentState', 'in', filter.states));
      }
      
      if (filter.assignedTo) {
        workflowQuery = query(
          workflowQuery, 
          where('assignedReviewers', 'array-contains', { userId: filter.assignedTo })
        );
      }
      
      const workflowSnap = await getDocs(workflowQuery);
      
      if (workflowSnap.empty) {
        return [];
      }
      
      // Get the content IDs from workflow items
      const contentIds = workflowSnap.docs.map(doc => doc.id);
      
      // Batch get the content items
      const contentItems: ContentItem[] = [];
      
      // Process in batches of 10 to avoid Firestore limitations
      for (let i = 0; i < contentIds.length; i += 10) {
        const batch = contentIds.slice(i, i + 10);
        const contentQuery = query(
          collection(firestore, 'content'),
          where('id', 'in', batch)
        );
        
        const contentSnap = await getDocs(contentQuery);
        
        contentSnap.forEach(doc => {
          contentItems.push(doc.data() as ContentItem);
        });
      }
      
      // Apply additional filters
      let filteredItems = contentItems;
      
      if (filter.createdBy) {
        filteredItems = filteredItems.filter(item => item.userId === filter.createdBy);
      }
      
      if (filter.fromDate) {
        filteredItems = filteredItems.filter(item => {
          // Handle both Timestamp and Date objects
          const itemDate = item.createdAt instanceof Timestamp 
            ? item.createdAt.toDate() 
            : item.createdAt;
          return itemDate >= filter.fromDate!;
        });
      }
      
      if (filter.toDate) {
        filteredItems = filteredItems.filter(item => {
          // Handle both Timestamp and Date objects
          const itemDate = item.createdAt instanceof Timestamp 
            ? item.createdAt.toDate() 
            : item.createdAt;
          return itemDate <= filter.toDate!;
        });
      }
      
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item.title.toLowerCase().includes(query) || 
          item.content.toLowerCase().includes(query)
        );
      }
      
      return filteredItems;
    } catch (error) {
      this.logger.error('Failed to find workflow items', { error, filter });
      throw new WorkflowError('Failed to find workflow items');
    }
  }
  
  /**
   * Validate a workflow template
   */
  private validateTemplate(template: CreateWorkflowTemplateInput): void {
    // Check required fields
    if (!template.name || template.name.trim() === '') {
      throw new WorkflowError('Template name is required');
    }
    
    if (!template.organizationId) {
      throw new WorkflowError('Organization ID is required');
    }
    
    if (!template.transitions || template.transitions.length === 0) {
      throw new WorkflowError('Template must have at least one transition');
    }
    
    if (template.requiredApprovals < 1) {
      throw new WorkflowError('Required approvals must be at least 1');
    }
    
    // Validate transitions
    this.validateTransitions(template.transitions);
  }
  
  /**
   * Validate workflow transitions
   */
  private validateTransitions(transitions: WorkflowTransition[]): void {
    // Ensure draft state exists as a starting point
    const hasDraftStart = transitions.some(t => 
      t.fromState === WorkflowState.DRAFT && 
      t.action === WorkflowAction.CREATE
    );
    
    if (!hasDraftStart) {
      throw new WorkflowError('Template must have a transition from DRAFT state with CREATE action');
    }
    
    // Ensure there's a path from draft to published
    const states = new Set<WorkflowState>([WorkflowState.DRAFT]);
    let changed = true;
    
    while (changed) {
      changed = false;
      
      for (const transition of transitions) {
        if (states.has(transition.fromState) && !states.has(transition.toState)) {
          states.add(transition.toState);
          changed = true;
        }
      }
    }
    
    if (!states.has(WorkflowState.PUBLISHED) && !states.has(WorkflowState.SCHEDULED)) {
      throw new WorkflowError('Template must have a path from DRAFT to either PUBLISHED or SCHEDULED state');
    }
  }
  
  /**
   * Unset any existing default template for an organization
   */
  private async unsetDefaultTemplate(organizationId: string): Promise<void> {
    try {
      const defaultQuery = query(
        collection(firestore, 'workflow_templates'),
        where('organizationId', '==', organizationId),
        where('isDefault', '==', true)
      );
      
      const defaultSnap = await getDocs(defaultQuery);
      
      if (!defaultSnap.empty) {
        // Use modern batch update syntax
        const batch = writeBatch(firestore);
        
        defaultSnap.forEach(docSnap => {
          batch.update(docSnap.ref, { 
            isDefault: false,
            updatedAt: Timestamp.now()
          });
        });
        
        await batch.commit();
      }
    } catch (error) {
      this.logger.error('Failed to unset default template', { error, organizationId });
      throw new WorkflowError('Failed to unset default template');
    }
  }
}

// Create a singleton instance
const workflowService = new WorkflowService();

// Export the singleton as the default export
export default workflowService;

// Helper function to extract display name from user profile
async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return userId.substring(0, 8);
    
    // Cast to any since getUserProfile returns spread Firestore data
    const userData = profile as any;
    
    // Use the actual field names from the Firestore document
    return userData.name || 
           userData.displayName || 
           `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
           userData.email || 
           userId.substring(0, 8);
  } catch (error) {
    console.error('Error getting user display name:', error);
    return userId.substring(0, 8);
  }
} 
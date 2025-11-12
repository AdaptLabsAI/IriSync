/**
 * Team workflow management utilities
 */

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  assigneeId?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependencies?: string[]; // IDs of steps that must be completed first
  metadata?: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdBy: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  steps: Omit<WorkflowStep, 'id' | 'assigneeId' | 'status'>[];
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
}

/**
 * Create a new workflow from a template
 */
export function createWorkflowFromTemplate(
  template: WorkflowTemplate,
  organizationId: string,
  createdBy: string,
  assignments?: Record<string, string> // stepIndex -> assigneeId
): Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'> {
  const steps: WorkflowStep[] = template.steps.map((templateStep, index) => ({
    ...templateStep,
    id: `step_${index + 1}`,
    assigneeId: assignments?.[index.toString()],
    status: 'pending' as const,
  }));

  return {
    name: template.name,
    description: template.description,
    organizationId,
    createdBy,
    steps,
    status: 'draft',
  };
}

/**
 * Update workflow step status
 */
export function updateWorkflowStep(
  workflow: Workflow,
  stepId: string,
  updates: Partial<Pick<WorkflowStep, 'status' | 'assigneeId' | 'dueDate' | 'metadata'>>
): Workflow {
  const updatedSteps = workflow.steps.map(step =>
    step.id === stepId ? { ...step, ...updates } : step
  );

  // Check if workflow is completed
  const allCompleted = updatedSteps.every(step => step.status === 'completed');
  const workflowStatus = allCompleted ? 'completed' : workflow.status;

  return {
    ...workflow,
    steps: updatedSteps,
    status: workflowStatus,
    updatedAt: new Date(),
    completedAt: allCompleted ? new Date() : workflow.completedAt,
  };
}

/**
 * Get next available steps (steps with no incomplete dependencies)
 */
export function getNextAvailableSteps(workflow: Workflow): WorkflowStep[] {
  return workflow.steps.filter(step => {
    if (step.status !== 'pending') return false;
    
    if (!step.dependencies || step.dependencies.length === 0) return true;
    
    return step.dependencies.every(depId => {
      const depStep = workflow.steps.find(s => s.id === depId);
      return depStep?.status === 'completed';
    });
  });
}

/**
 * Get workflow progress percentage
 */
export function getWorkflowProgress(workflow: Workflow): number {
  if (workflow.steps.length === 0) return 0;
  
  const completedSteps = workflow.steps.filter(step => step.status === 'completed').length;
  return Math.round((completedSteps / workflow.steps.length) * 100);
}

/**
 * Get overdue steps
 */
export function getOverdueSteps(workflow: Workflow): WorkflowStep[] {
  const now = new Date();
  return workflow.steps.filter(step => 
    step.dueDate && 
    step.dueDate < now && 
    step.status !== 'completed'
  );
}

/**
 * Assign step to team member
 */
export function assignStep(
  workflow: Workflow,
  stepId: string,
  assigneeId: string
): Workflow {
  return updateWorkflowStep(workflow, stepId, { assigneeId });
}

/**
 * Get steps assigned to a specific user
 */
export function getStepsForUser(workflow: Workflow, userId: string): WorkflowStep[] {
  return workflow.steps.filter(step => step.assigneeId === userId);
} 
import { firestore } from '../core/firebase/admin';
import { v4 as uuidv4 } from 'uuid';
import { 
  Workflow, 
  Action, 
  Trigger, 
  Condition, 
  OperatorType,
  ActionResult,
  WorkflowExecution,
  WorkflowStatus,
  TriggerType,
  ActionType
} from './models';
import { ActionHandler, TriggerHandler } from './handlers';
import { getActionHandler, getTriggerHandler } from './registry';
import logger from '../core/logging/logger';

/**
 * Event data for automation processing
 */
export interface EventData {
  type: string;
  data: Record<string, any>;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Configuration for workflow execution
 */
export interface ExecutionConfig {
  timeout?: number;
  maxRetries?: number;
  logLevel?: 'debug' | 'info' | 'error';
  includeInputData?: boolean;
  includeOutputData?: boolean;
  executeSequentially?: boolean;
}

/**
 * Automation Engine for processing events and executing workflows
 */
export class AutomationEngine {
  private workflowsCollection = firestore.collection('automationWorkflows');
  private executionsCollection = firestore.collection('workflowExecutions');
  
  // Default execution configuration
  private defaultExecutionConfig: ExecutionConfig = {
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    logLevel: 'info',
    includeInputData: true,
    includeOutputData: true,
    executeSequentially: true
  };
  
  /**
   * Process an event and trigger matching workflows
   * @param event Event data
   * @returns Results from workflow executions
   */
  async processEvent(event: EventData): Promise<{
    executedCount: number;
    successCount: number;
    executionIds: string[];
  }> {
    logger.info(`Processing event of type: ${event.type}`, { eventType: event.type });
    
    try {
      // Find workflows with matching triggers
      const workflows = await this.findMatchingWorkflows(event);
      
      if (workflows.length === 0) {
        logger.debug('No matching workflows found for event', { eventType: event.type });
        return {
          executedCount: 0,
          successCount: 0,
          executionIds: []
        };
      }
      
      logger.info(`Found ${workflows.length} matching workflows for event type: ${event.type}`);
      
      // Execute all matching workflows
      const executionResults = await Promise.all(
        workflows.map(workflow => this.executeWorkflow(workflow, event))
      );
      
      // Count successes and return execution IDs
      const successCount = executionResults.filter(result => result.status === 'completed').length;
      const executionIds = executionResults.map(result => result.id);
      
      return {
        executedCount: workflows.length,
        successCount,
        executionIds
      };
    } catch (error) {
      logger.error('Error processing event', { error, eventType: event.type });
      throw error;
    }
  }
  
  /**
   * Find workflows that match the given event
   * @param event Event data
   * @returns List of matching workflows
   */
  private async findMatchingWorkflows(event: EventData): Promise<Workflow[]> {
    try {
      // Query for workflows with the matching trigger type and enabled status
      const querySnapshot = await this.workflowsCollection
        .where('trigger.type', '==', event.type)
        .where('enabled', '==', true)
        .where('status', '==', WorkflowStatus.ACTIVE)
        .get();
      
      if (querySnapshot.empty) {
        return [];
      }
      
      const workflows: Workflow[] = [];
      
      // Check each workflow for condition matches
      for (const doc of querySnapshot.docs) {
        const workflow = doc.data() as Workflow;
        
        // Check organization restrictions
        if (workflow.organizationId && 
            event.organizationId && 
            workflow.organizationId !== event.organizationId) {
          continue;
        }
        
        // Evaluate trigger conditions
        const conditionsMatch = await this.evaluateConditions(
          workflow.trigger.conditions,
          event.data
        );
        
        if (conditionsMatch) {
          workflows.push(workflow);
        }
      }
      
      return workflows;
    } catch (error) {
      logger.error('Error finding matching workflows', { error, eventType: event.type });
      throw error;
    }
  }
  
  /**
   * Execute a workflow with event data
   * @param workflow Workflow to execute
   * @param event Triggering event
   * @param config Execution configuration
   * @returns Execution result
   */
  async executeWorkflow(
    workflow: Workflow,
    event: EventData,
    config: Partial<ExecutionConfig> = {}
  ): Promise<WorkflowExecution> {
    const executionConfig = { ...this.defaultExecutionConfig, ...config };
    const executionId = uuidv4();
    
    // Create execution record
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      triggerData: executionConfig.includeInputData ? event.data : { type: event.type },
      startTime: new Date(),
      status: 'running',
      actionResults: []
    };
    
    try {
      // Save initial execution record
      await this.executionsCollection.doc(executionId).set(execution);
      
      // Get the trigger handler
      const triggerHandler = getTriggerHandler(workflow.trigger.type);
      
      if (!triggerHandler) {
        throw new Error(`No handler found for trigger type: ${workflow.trigger.type}`);
      }
      
      // Process trigger to get initial context
      const context = await triggerHandler.process(event, workflow.trigger.parameters);
      
      // Sort actions by order
      const sortedActions = [...workflow.actions].sort((a, b) => a.order - b.order);
      
      // Execute actions sequentially or in parallel
      let actionResults: ActionResult[] = [];
      
      if (executionConfig.executeSequentially) {
        // Execute actions in sequence
        let currentContext = { ...context };
        
        for (const action of sortedActions) {
          if (!action.enabled) continue;
          
          // Check action conditions
          if (action.conditions && action.conditions.length > 0) {
            const conditionsMatch = await this.evaluateConditions(
              action.conditions,
              currentContext
            );
            
            if (!conditionsMatch) {
              actionResults.push({
                actionId: action.id,
                success: false,
                timestamp: new Date(),
                error: 'Action conditions not met'
              });
              continue;
            }
          }
          
          // Execute the action
          const result = await this.executeAction(action, currentContext);
          actionResults.push(result);
          
          // Update context with action result for next action
          if (result.success && result.data) {
            currentContext = {
              ...currentContext,
              [action.type]: result.data
            };
          }
          
          // Stop execution if action failed
          if (!result.success) {
            break;
          }
        }
      } else {
        // Execute actions in parallel
        const actionPromises = sortedActions
          .filter(action => action.enabled)
          .map(action => this.executeAction(action, context));
        
        actionResults = await Promise.all(actionPromises);
      }
      
      // Update workflow execution count and success rate
      const successCount = actionResults.filter(result => result.success).length;
      const newExecutionCount = (workflow.executionCount || 0) + 1;
      const newSuccessRate = ((workflow.successRate || 0) * (newExecutionCount - 1) + 
        (successCount === actionResults.length ? 1 : 0)) / newExecutionCount;
      
      await this.workflowsCollection.doc(workflow.id).update({
        executionCount: newExecutionCount,
        successRate: newSuccessRate,
        lastExecuted: new Date()
      });
      
      // Determine overall execution status
      const status = actionResults.some(result => !result.success) ? 'failed' : 'completed';
      
      // Update execution record
      const updatedExecution: Partial<WorkflowExecution> = {
        endTime: new Date(),
        status,
        actionResults
      };
      
      await this.executionsCollection.doc(executionId).update(updatedExecution);
      
      return {
        ...execution,
        ...updatedExecution,
        actionResults
      } as WorkflowExecution;
    } catch (error) {
      logger.error('Error executing workflow', { 
        error, 
        workflowId: workflow.id,
        executionId 
      });
      
      // Update execution record with error
      const failedExecution: Partial<WorkflowExecution> = {
        endTime: new Date(),
        status: 'failed',
        error: (error as Error).message
      };
      
      await this.executionsCollection.doc(executionId).update(failedExecution);
      
      return {
        ...execution,
        ...failedExecution
      } as WorkflowExecution;
    }
  }
  
  /**
   * Execute a single action with context
   * @param action Action to execute
   * @param context Execution context
   * @returns Action execution result
   */
  private async executeAction(
    action: Action,
    context: Record<string, any>
  ): Promise<ActionResult> {
    try {
      logger.debug(`Executing action: ${action.type}`, { actionId: action.id });
      
      // Get the appropriate action handler
      const actionHandler = getActionHandler(action.type);
      
      if (!actionHandler) {
        throw new Error(`No handler found for action type: ${action.type}`);
      }
      
      // Execute the action
      const result = await actionHandler.execute(action.parameters, context);
      
      return {
        actionId: action.id,
        success: true,
        timestamp: new Date(),
        data: result
      };
    } catch (error) {
      logger.error('Error executing action', { error, actionId: action.id, actionType: action.type });
      
      return {
        actionId: action.id,
        success: false,
        timestamp: new Date(),
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Evaluate conditions against data
   * @param conditions Conditions to evaluate
   * @param data Data to check against
   * @returns Whether all conditions are satisfied
   */
  private async evaluateConditions(
    conditions: Condition[],
    data: Record<string, any>
  ): Promise<boolean> {
    // If no conditions, return true
    if (!conditions || conditions.length === 0) {
      return true;
    }
    
    // Check all conditions (AND logic)
    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, data);
      
      // If any condition fails, return false
      if (!conditionResult) {
        return false;
      }
    }
    
    // All conditions passed
    return true;
  }
  
  /**
   * Evaluate a single condition
   * @param condition Condition to evaluate
   * @param data Data to check against
   * @returns Whether the condition is satisfied
   */
  private evaluateCondition(
    condition: Condition, 
    data: Record<string, any>
  ): boolean {
    const { field, operator, value, negate } = condition;
    
    // Extract field value using dot notation
    const fieldValue = this.getNestedValue(data, field);
    let result = false;
    
    switch (operator) {
      case OperatorType.EQUALS:
        result = fieldValue === value;
        break;
        
      case OperatorType.NOT_EQUALS:
        result = fieldValue !== value;
        break;
        
      case OperatorType.CONTAINS:
        if (typeof fieldValue === 'string') {
          result = fieldValue.includes(value);
        } else if (Array.isArray(fieldValue)) {
          result = fieldValue.includes(value);
        }
        break;
        
      case OperatorType.NOT_CONTAINS:
        if (typeof fieldValue === 'string') {
          result = !fieldValue.includes(value);
        } else if (Array.isArray(fieldValue)) {
          result = !fieldValue.includes(value);
        }
        break;
        
      case OperatorType.GREATER_THAN:
        result = fieldValue > value;
        break;
        
      case OperatorType.LESS_THAN:
        result = fieldValue < value;
        break;
        
      case OperatorType.REGEX_MATCH:
        if (typeof fieldValue === 'string') {
          const regex = new RegExp(value);
          result = regex.test(fieldValue);
        }
        break;
        
      case OperatorType.IN_LIST:
        if (Array.isArray(value)) {
          result = value.includes(fieldValue);
        }
        break;
        
      case OperatorType.NOT_IN_LIST:
        if (Array.isArray(value)) {
          result = !value.includes(fieldValue);
        }
        break;
        
      case OperatorType.EXISTS:
        result = fieldValue !== undefined && fieldValue !== null;
        break;
        
      case OperatorType.NOT_EXISTS:
        result = fieldValue === undefined || fieldValue === null;
        break;
        
      case OperatorType.BETWEEN:
        if (Array.isArray(value) && value.length === 2) {
          result = fieldValue >= value[0] && fieldValue <= value[1];
        }
        break;
        
      default:
        result = false;
    }
    
    // Apply negation if needed
    return negate ? !result : result;
  }
  
  /**
   * Get a nested value from an object using dot notation
   * @param obj Source object
   * @param path Path using dot notation (e.g., "user.profile.name")
   * @returns Value at the path
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : undefined;
    }, obj);
  }
  
  /**
   * Get a workflow by ID
   * @param workflowId Workflow ID
   * @returns Workflow or null if not found
   */
  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    try {
      const doc = await this.workflowsCollection.doc(workflowId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return doc.data() as Workflow;
    } catch (error) {
      logger.error('Error getting workflow', { error, workflowId });
      throw error;
    }
  }
  
  /**
   * Create a new workflow
   * @param workflow Workflow data
   * @returns Created workflow
   */
  async createWorkflow(workflow: Workflow): Promise<Workflow> {
    try {
      await this.workflowsCollection.doc(workflow.id).set(workflow);
      return workflow;
    } catch (error) {
      logger.error('Error creating workflow', { error, workflowId: workflow.id });
      throw error;
    }
  }
  
  /**
   * Update an existing workflow
   * @param workflowId Workflow ID
   * @param updates Workflow updates
   * @returns Updated workflow
   */
  async updateWorkflow(
    workflowId: string,
    updates: Partial<Workflow>
  ): Promise<Workflow | null> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      
      if (!workflow) {
        return null;
      }
      
      const updatedWorkflow = {
        ...workflow,
        ...updates,
        updatedAt: new Date()
      };
      
      await this.workflowsCollection.doc(workflowId).update(updatedWorkflow);
      return updatedWorkflow;
    } catch (error) {
      logger.error('Error updating workflow', { error, workflowId });
      throw error;
    }
  }
  
  /**
   * Delete a workflow
   * @param workflowId Workflow ID
   * @returns Success indicator
   */
  async deleteWorkflow(workflowId: string): Promise<boolean> {
    try {
      await this.workflowsCollection.doc(workflowId).delete();
      return true;
    } catch (error) {
      logger.error('Error deleting workflow', { error, workflowId });
      throw error;
    }
  }
  
  /**
   * Enable or disable a workflow
   * @param workflowId Workflow ID
   * @param enabled Whether to enable the workflow
   * @returns Updated workflow
   */
  async setWorkflowEnabled(
    workflowId: string,
    enabled: boolean
  ): Promise<Workflow | null> {
    return this.updateWorkflow(workflowId, { enabled });
  }
  
  /**
   * Set the status of a workflow
   * @param workflowId Workflow ID
   * @param status New workflow status
   * @returns Updated workflow
   */
  async setWorkflowStatus(
    workflowId: string,
    status: WorkflowStatus
  ): Promise<Workflow | null> {
    return this.updateWorkflow(workflowId, { status });
  }
  
  /**
   * Get workflow executions
   * @param workflowId Workflow ID
   * @param limit Maximum number of executions to return
   * @param offset Pagination offset
   * @returns List of executions
   */
  async getWorkflowExecutions(
    workflowId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{
    executions: WorkflowExecution[];
    total: number;
  }> {
    try {
      // Get count first
      const countQuery = await this.executionsCollection
        .where('workflowId', '==', workflowId)
        .count()
        .get();
      
      const total = countQuery.data().count;
      
      // Get executions
      const snapshot = await this.executionsCollection
        .where('workflowId', '==', workflowId)
        .orderBy('startTime', 'desc')
        .limit(limit)
        .offset(offset)
        .get();
      
      const executions: WorkflowExecution[] = [];
      
      snapshot.forEach(doc => {
        executions.push(doc.data() as WorkflowExecution);
      });
      
      return { executions, total };
    } catch (error) {
      logger.error('Error getting workflow executions', { error, workflowId });
      throw error;
    }
  }
  
  /**
   * Get workflows by organization ID
   * @param organizationId Organization ID
   * @param limit Maximum number of workflows to return
   * @param offset Pagination offset
   * @returns List of workflows
   */
  async getOrganizationWorkflows(
    organizationId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{
    workflows: Workflow[];
    total: number;
  }> {
    try {
      // Get count first
      const countQuery = await this.workflowsCollection
        .where('organizationId', '==', organizationId)
        .count()
        .get();
      
      const total = countQuery.data().count;
      
      // Get workflows
      const snapshot = await this.workflowsCollection
        .where('organizationId', '==', organizationId)
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();
      
      const workflows: Workflow[] = [];
      
      snapshot.forEach(doc => {
        workflows.push(doc.data() as Workflow);
      });
      
      return { workflows, total };
    } catch (error) {
      logger.error('Error getting organization workflows', { error, organizationId });
      throw error;
    }
  }
}

export default new AutomationEngine(); 
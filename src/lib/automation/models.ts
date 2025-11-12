import { v4 as uuidv4 } from 'uuid';

/**
 * Trigger types for automation
 */
export enum TriggerType {
  // Content triggers
  CONTENT_CREATED = 'content_created',
  CONTENT_PUBLISHED = 'content_published',
  CONTENT_UPDATED = 'content_updated',
  CONTENT_SCHEDULED = 'content_scheduled',
  
  // Engagement triggers
  MENTION_RECEIVED = 'mention_received',
  COMMENT_RECEIVED = 'comment_received',
  MESSAGE_RECEIVED = 'message_received',
  THRESHOLD_REACHED = 'threshold_reached',
  
  // User triggers
  USER_JOINED = 'user_joined',
  USER_UPGRADED = 'user_upgraded',
  USER_CONNECTED_PLATFORM = 'user_connected_platform',
  
  // Temporal triggers
  SCHEDULED_TIME = 'scheduled_time',
  RECURRING_TIME = 'recurring_time',
  INACTIVITY_DETECTED = 'inactivity_detected',
  
  // Custom trigger
  CUSTOM = 'custom'
}

/**
 * Action types for automation
 */
export enum ActionType {
  // Notification actions
  SEND_EMAIL = 'send_email',
  SEND_NOTIFICATION = 'send_notification',
  SEND_WEBHOOK = 'send_webhook',
  
  // Content actions
  CREATE_CONTENT = 'create_content',
  SCHEDULE_CONTENT = 'schedule_content',
  PUBLISH_CONTENT = 'publish_content',
  GENERATE_CONTENT = 'generate_content',
  UPDATE_CONTENT = 'update_content',
  
  // Social media actions
  POST_REPLY = 'post_reply',
  LIKE_CONTENT = 'like_content',
  SHARE_CONTENT = 'share_content',
  FOLLOW_USER = 'follow_user',
  SEND_MESSAGE = 'send_message',
  
  // Data actions
  CREATE_TASK = 'create_task',
  UPDATE_CRM = 'update_crm',
  LOG_EVENT = 'log_event',
  TAG_CONTENT = 'tag_content',
  CATEGORIZE_CONTENT = 'categorize_content',
  
  // AI actions
  ANALYZE_SENTIMENT = 'analyze_sentiment',
  GENERATE_TAGS = 'generate_tags',
  SUMMARIZE_CONTENT = 'summarize_content',
  TRANSLATE_CONTENT = 'translate_content',
  
  // Custom action
  CUSTOM = 'custom'
}

/**
 * Operator types for conditions
 */
export enum OperatorType {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  REGEX_MATCH = 'regex_match',
  IN_LIST = 'in_list',
  NOT_IN_LIST = 'not_in_list',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
  BETWEEN = 'between'
}

/**
 * Condition for rule evaluation
 */
export interface Condition {
  id: string;
  field: string;
  operator: OperatorType;
  value: any;
  negate?: boolean;
}

/**
 * Trigger configuration for automation
 */
export interface Trigger {
  id: string;
  type: TriggerType;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  conditions: Condition[];
}

/**
 * Action configuration for automation
 */
export interface Action {
  id: string;
  type: ActionType;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  order: number;
  enabled: boolean;
  conditions?: Condition[];
}

/**
 * Execution result for an action
 */
export interface ActionResult {
  actionId: string;
  success: boolean;
  timestamp: Date;
  data?: any;
  error?: string;
}

/**
 * Workflow status
 */
export enum WorkflowStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DRAFT = 'draft',
  ARCHIVED = 'archived'
}

/**
 * Automation workflow
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: Trigger;
  actions: Action[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  organizationId?: string;
  status: WorkflowStatus;
  enabled: boolean;
  lastExecuted?: Date;
  executionCount: number;
  successRate: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Workflow execution history
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  triggerData: any;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  actionResults: ActionResult[];
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new trigger
 * @param type Trigger type
 * @param name Trigger name
 * @param parameters Trigger parameters
 * @param conditions Optional conditions
 * @returns New trigger object
 */
export function createTrigger(
  type: TriggerType,
  name: string,
  parameters: Record<string, any> = {},
  conditions: Condition[] = []
): Trigger {
  return {
    id: uuidv4(),
    type,
    name,
    parameters,
    conditions
  };
}

/**
 * Create a new action
 * @param type Action type
 * @param name Action name
 * @param parameters Action parameters
 * @param order Execution order
 * @param conditions Optional conditions
 * @returns New action object
 */
export function createAction(
  type: ActionType,
  name: string,
  parameters: Record<string, any> = {},
  order: number = 0,
  conditions: Condition[] = []
): Action {
  return {
    id: uuidv4(),
    type,
    name,
    parameters,
    order,
    enabled: true,
    conditions
  };
}

/**
 * Create a new condition
 * @param field Field name
 * @param operator Comparison operator
 * @param value Comparison value
 * @param negate Whether to negate the condition
 * @returns New condition object
 */
export function createCondition(
  field: string,
  operator: OperatorType,
  value: any,
  negate: boolean = false
): Condition {
  return {
    id: uuidv4(),
    field,
    operator,
    value,
    negate
  };
}

/**
 * Create a new workflow
 * @param name Workflow name
 * @param trigger Workflow trigger
 * @param actions Workflow actions
 * @param createdBy User ID of creator
 * @param organizationId Optional organization ID
 * @returns New workflow object
 */
export function createWorkflow(
  name: string,
  trigger: Trigger,
  actions: Action[],
  createdBy: string,
  organizationId?: string
): Workflow {
  const now = new Date();
  
  return {
    id: uuidv4(),
    name,
    trigger,
    actions: actions.sort((a, b) => a.order - b.order),
    createdAt: now,
    updatedAt: now,
    createdBy,
    organizationId,
    status: WorkflowStatus.DRAFT,
    enabled: false,
    executionCount: 0,
    successRate: 0
  };
} 
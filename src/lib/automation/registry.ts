import { ActionHandler, TriggerHandler } from './handlers';
import { TriggerType, ActionType } from './models';
import logger from '../logging/logger';

// Storage for registered handlers
const triggerHandlers = new Map<string, TriggerHandler>();
const actionHandlers = new Map<string, ActionHandler>();

/**
 * Register a trigger handler
 * @param type Trigger type
 * @param handler Handler implementation
 */
export function registerTriggerHandler(type: TriggerType | string, handler: TriggerHandler): void {
  if (triggerHandlers.has(type)) {
    logger.warn(`Overriding existing trigger handler for type: ${type}`);
  }
  
  triggerHandlers.set(type, handler);
  logger.debug(`Registered trigger handler for type: ${type}`);
}

/**
 * Register an action handler
 * @param type Action type
 * @param handler Handler implementation
 */
export function registerActionHandler(type: ActionType | string, handler: ActionHandler): void {
  if (actionHandlers.has(type)) {
    logger.warn(`Overriding existing action handler for type: ${type}`);
  }
  
  actionHandlers.set(type, handler);
  logger.debug(`Registered action handler for type: ${type}`);
}

/**
 * Get a trigger handler by type
 * @param type Trigger type
 * @returns Trigger handler or undefined if not found
 */
export function getTriggerHandler(type: TriggerType | string): TriggerHandler | undefined {
  return triggerHandlers.get(type);
}

/**
 * Get an action handler by type
 * @param type Action type
 * @returns Action handler or undefined if not found
 */
export function getActionHandler(type: ActionType | string): ActionHandler | undefined {
  return actionHandlers.get(type);
}

/**
 * Check if a trigger type has a registered handler
 * @param type Trigger type
 * @returns Whether a handler exists
 */
export function hasTriggerHandler(type: TriggerType | string): boolean {
  return triggerHandlers.has(type);
}

/**
 * Check if an action type has a registered handler
 * @param type Action type
 * @returns Whether a handler exists
 */
export function hasActionHandler(type: ActionType | string): boolean {
  return actionHandlers.has(type);
}

/**
 * Get all registered trigger types
 * @returns Array of trigger types with handlers
 */
export function getRegisteredTriggerTypes(): string[] {
  return Array.from(triggerHandlers.keys());
}

/**
 * Get all registered action types
 * @returns Array of action types with handlers
 */
export function getRegisteredActionTypes(): string[] {
  return Array.from(actionHandlers.keys());
} 
import { EventData } from './engine';

/**
 * Interface for trigger handlers
 */
export interface TriggerHandler {
  /**
   * Process event data and trigger parameters to create execution context
   * @param event Event data that triggered the workflow
   * @param parameters Trigger parameters from workflow definition
   * @returns Context data for action execution
   */
  process(
    event: EventData,
    parameters: Record<string, any>
  ): Promise<Record<string, any>>;
}

/**
 * Interface for action handlers
 */
export interface ActionHandler {
  /**
   * Execute an action with given parameters and context
   * @param parameters Action parameters from workflow definition
   * @param context Current execution context
   * @returns Action execution result data
   */
  execute(
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>>;
}

/**
 * Base class for trigger handlers
 */
export abstract class BaseTriggerHandler implements TriggerHandler {
  /**
   * Process event data to create execution context
   * @param event Event data
   * @param parameters Trigger parameters
   * @returns Context data
   */
  abstract process(
    event: EventData,
    parameters: Record<string, any>
  ): Promise<Record<string, any>>;
  
  /**
   * Extract data field safely
   * @param data Source data object
   * @param field Field name
   * @param defaultValue Default value if field is missing
   * @returns Field value or default
   */
  protected getField<T>(
    data: Record<string, any>,
    field: string,
    defaultValue: T
  ): T {
    return data && data[field] !== undefined ? data[field] : defaultValue;
  }
}

/**
 * Base class for action handlers
 */
export abstract class BaseActionHandler implements ActionHandler {
  /**
   * Execute an action
   * @param parameters Action parameters
   * @param context Execution context
   * @returns Action result
   */
  abstract execute(
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>>;
  
  /**
   * Extract parameter safely
   * @param parameters Parameters object
   * @param name Parameter name
   * @param defaultValue Default value if parameter is missing
   * @returns Parameter value or default
   */
  protected getParameter<T>(
    parameters: Record<string, any>,
    name: string,
    defaultValue: T
  ): T {
    return parameters && parameters[name] !== undefined ? parameters[name] : defaultValue;
  }
  
  /**
   * Check if required parameters exist
   * @param parameters Parameters object
   * @param required List of required parameter names
   * @returns Whether all required parameters exist
   */
  protected validateParameters(
    parameters: Record<string, any>,
    required: string[]
  ): boolean {
    if (!parameters) return false;
    
    for (const param of required) {
      if (parameters[param] === undefined) {
        return false;
      }
    }
    
    return true;
  }
} 
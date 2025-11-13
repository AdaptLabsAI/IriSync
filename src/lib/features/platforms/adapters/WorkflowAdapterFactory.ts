import { logger } from '../../../core/logging/logger';
import { SlackAdapter } from './SlackAdapter';

// Note: Other workflow adapters are not yet implemented
// Future implementations: TeamsAdapter, TrelloAdapter, AsanaAdapter, ClickUpAdapter, ZapierAdapter, MakeAdapter, MondayAdapter

export type WorkflowPlatform = 
  | 'slack'
  | 'teams'
  | 'trello'
  | 'asana'
  | 'clickup'
  | 'zapier'
  | 'make'
  | 'monday';

/**
 * Factory for creating workflow platform-specific adapters
 */
export class WorkflowAdapterFactory {
  private static adapters: Map<WorkflowPlatform, any> = new Map();
  
  /**
   * Get the appropriate adapter for the given workflow platform type
   */
  static getAdapter(platform: WorkflowPlatform): any {
    // Check if we already have an instance
    const existingAdapter = this.adapters.get(platform);
    if (existingAdapter) {
      return existingAdapter;
    }
    
    // Create a new adapter instance
    let adapter: any;
    
    try {
      switch (platform) {
        case 'slack':
          adapter = new SlackAdapter();
          break;
        case 'teams':
          throw new Error('Microsoft Teams adapter not yet implemented');
        case 'trello':
          throw new Error('Trello adapter not yet implemented');
        case 'asana':
          throw new Error('Asana adapter not yet implemented');
        case 'clickup':
          throw new Error('ClickUp adapter not yet implemented');
        case 'zapier':
          throw new Error('Zapier adapter not yet implemented');
        case 'make':
          throw new Error('Make adapter not yet implemented');
        case 'monday':
          throw new Error('Monday.com adapter not yet implemented');
        default:
          logger.error(`Unsupported workflow platform type: ${platform}`);
          throw new Error(`Unsupported workflow platform type: ${platform}`);
      }
    } catch (error) {
      logger.error(`Error creating workflow adapter for ${platform}:`, error);
      
      // Re-throw the error for proper handling by caller
      throw error;
    }
    
    // Store the adapter for future use
    this.adapters.set(platform, adapter);
    
    return adapter;
  }
  
  /**
   * Clear cached adapters - useful for testing
   */
  static clearAdapters(): void {
    this.adapters.clear();
  }
  
  /**
   * Check if an adapter is implemented for the given platform
   */
  static isSupported(platform: WorkflowPlatform): boolean {
    try {
      // Currently only Slack is fully implemented
      return platform === 'slack';
    } catch (error) {
      return false;
    }
  }
} 
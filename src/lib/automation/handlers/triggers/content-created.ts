import { BaseTriggerHandler } from '../../handlers';
import { EventData } from '../../engine';
import logger from '../../../../lib/logging/logger';

/**
 * Trigger handler for content creation events
 */
export default class ContentCreatedTrigger extends BaseTriggerHandler {
  /**
   * Process content creation event
   * @param event Event data
   * @param parameters Trigger parameters
   * @returns Context for action execution
   */
  async process(
    event: EventData,
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    if (!event.data || !event.data.content) {
      throw new Error('Invalid event data for ContentCreatedTrigger');
    }
    
    try {
      const content = event.data.content;
      const contentType = this.getField<string>(parameters, 'contentType', '');
      const requiresFields = this.getField<string[]>(parameters, 'requiresFields', []);
      
      // Check content type filter if specified
      if (contentType && content.type !== contentType) {
        throw new Error(`Content type mismatch: expected ${contentType}, got ${content.type}`);
      }
      
      // Check required fields
      for (const field of requiresFields) {
        if (!content[field]) {
          throw new Error(`Required field missing in content: ${field}`);
        }
      }
      
      logger.info('Processing content created trigger', {
        contentId: content.id,
        contentType: content.type
      });
      
      // Create context for actions
      return {
        workflowId: parameters.workflowId,
        trigger: {
          type: 'content_created',
          timestamp: event.timestamp
        },
        content: {
          id: content.id,
          type: content.type,
          title: content.title,
          description: content.description,
          body: content.body,
          tags: content.tags,
          categories: content.categories,
          author: content.author,
          createdAt: content.createdAt || event.timestamp,
          status: content.status,
          url: content.url,
          metadata: content.metadata
        },
        user: {
          id: event.userId,
          organizationId: event.organizationId
        }
      };
    } catch (error) {
      logger.error('Error processing content created trigger', {
        error,
        eventType: event.type
      });
      
      throw error;
    }
  }
} 
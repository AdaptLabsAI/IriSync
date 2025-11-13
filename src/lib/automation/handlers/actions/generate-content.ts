import { BaseActionHandler } from '../../handlers';
import logger from '../../../../lib/logging/logger';
import { tieredModelRouter, TaskType } from '../../../../lib/features/ai/models/tiered-model-router';
import { config } from '../../../../lib/config';
import { User } from '../../../../lib/core/models/User';

/**
 * Action handler for AI content generation
 */
export default class GenerateContentAction extends BaseActionHandler {
  
  constructor() {
    super();
  }
  
  /**
   * Execute the content generation action
   * @param parameters Action parameters
   * @param context Execution context
   * @returns Generated content
   */
  async execute(
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      const { prompt, contentType, maxLength } = parameters;
      
      // Get user info from context (if available)
      const user = context.user as User | undefined;
      
      // Map content type to appropriate task type
      const taskType = this.mapContentTypeToTaskType(contentType);
      
      // Prepare AI task
      const task = {
        type: taskType,
        input: prompt,
        options: {
          maxTokens: maxLength || undefined
        }
      };
      
      // Generate content using tiered model router
      const result = await tieredModelRouter.routeTask(task, user);
      
      logger.info('Generated content via automation', {
        contentType,
        modelUsed: result.modelUsed,
        tokenUsage: result.tokenUsage,
        requestId: context.requestId
      });
      
      return {
        content: result.output,
        metadata: {
          modelUsed: result.modelUsed,
          tokenUsage: result.tokenUsage
        }
      };
    } catch (error) {
      logger.error('Error generating content', {
        error: error instanceof Error ? error.message : String(error),
        parameters,
        requestId: context.requestId
      });
      
      throw error;
    }
  }
  
  /**
   * Map content type to AI task type
   * @param contentType Content type string
   * @returns Task type enum
   */
  private mapContentTypeToTaskType(contentType: string): TaskType {
    // Map content types to appropriate task types
    const contentTypeMap: Record<string, TaskType> = {
      'blog-post': TaskType.LONG_FORM_CONTENT,
      'social-post': TaskType.SOCIAL_MEDIA_POST,
      'caption': TaskType.CAPTION_WRITING,
      'hashtags': TaskType.HASHTAG_GENERATION,
      'comment-reply': TaskType.COMMENT_REPLIES
    };
    
    // Return mapped task type or default to social media post
    return contentTypeMap[contentType] || TaskType.SOCIAL_MEDIA_POST;
  }
} 
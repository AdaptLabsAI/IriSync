import { BaseTriggerHandler } from '../../handlers';
import { EventData } from '../../engine';
import logger from '../../../../lib/logging/logger';

/**
 * Trigger handler for social media mention events
 */
export default class MentionReceivedTrigger extends BaseTriggerHandler {
  /**
   * Process mention received event
   * @param event Event data
   * @param parameters Trigger parameters
   * @returns Context for action execution
   */
  async process(
    event: EventData,
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    if (!event.data || !event.data.mention) {
      throw new Error('Invalid event data for MentionReceivedTrigger');
    }
    
    try {
      const mention = event.data.mention;
      const platform = this.getField<string>(parameters, 'platform', '');
      const keywords = this.getField<string[]>(parameters, 'keywords', []);
      const sentimentFilter = this.getField<string>(parameters, 'sentimentFilter', '');
      
      // Check platform filter if specified
      if (platform && mention.platform !== platform) {
        throw new Error(`Platform mismatch: expected ${platform}, got ${mention.platform}`);
      }
      
      // Check for required keywords if specified
      if (keywords.length > 0) {
        const mentionText = mention.text.toLowerCase();
        const hasKeyword = keywords.some(keyword => 
          mentionText.includes(keyword.toLowerCase())
        );
        
        if (!hasKeyword) {
          throw new Error('Mention does not contain any required keywords');
        }
      }
      
      // Check sentiment filter if specified
      if (sentimentFilter && mention.sentiment) {
        if (sentimentFilter === 'positive' && mention.sentiment < 0.2) {
          throw new Error('Mention sentiment is not positive');
        } else if (sentimentFilter === 'negative' && mention.sentiment > -0.2) {
          throw new Error('Mention sentiment is not negative');
        } else if (sentimentFilter === 'neutral' && 
                  (mention.sentiment < -0.2 || mention.sentiment > 0.2)) {
          throw new Error('Mention sentiment is not neutral');
        }
      }
      
      logger.info('Processing mention received trigger', {
        platform: mention.platform,
        username: mention.username
      });
      
      // Create context for actions
      return {
        workflowId: parameters.workflowId,
        trigger: {
          type: 'mention_received',
          timestamp: event.timestamp
        },
        mention: {
          id: mention.id,
          platform: mention.platform,
          text: mention.text,
          username: mention.username,
          userProfileUrl: mention.userProfileUrl,
          postUrl: mention.postUrl,
          postId: mention.postId,
          createdAt: mention.createdAt || event.timestamp,
          sentiment: mention.sentiment,
          reach: mention.reach,
          engagement: mention.engagement,
          isVerified: mention.isVerified,
          isReply: mention.isReply,
          parentPostId: mention.parentPostId,
          mediaUrls: mention.mediaUrls,
          metadata: mention.metadata
        },
        user: {
          id: event.userId,
          organizationId: event.organizationId
        }
      };
    } catch (error) {
      logger.error('Error processing mention received trigger', {
        error,
        eventType: event.type
      });
      
      throw error;
    }
  }
} 
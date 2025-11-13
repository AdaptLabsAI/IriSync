import { LinkedInProvider } from '../platforms/providers/LinkedInProvider';
import { SocialInboxService, InboxMessage, MessageType, MessageStatus, MessagePriority } from './SocialInboxService';
import { PlatformType } from '../platforms/PlatformProvider';
import { logger } from '../../core/logging/logger';
import { tieredModelRouter, TaskType } from '../ai/models/tiered-model-router';
import { User } from '../../core/models/User';
import { v4 as uuidv4 } from 'uuid';

/**
 * LinkedIn Social Inbox Adapter
 * Integrates LinkedIn social actions (comments, likes) with the unified social inbox
 */
export class LinkedInSocialInboxAdapter {
  private linkedInProvider: LinkedInProvider;
  private socialInboxService: SocialInboxService;
  
  constructor(linkedInProvider: LinkedInProvider) {
    this.linkedInProvider = linkedInProvider;
    this.socialInboxService = new SocialInboxService();
  }

  /**
   * Fetch new LinkedIn comments and add them to the unified inbox
   */
  async syncCommentsToInbox(
    postUrn: string, 
    userId: string, 
    accountId: string, 
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      if (!this.linkedInProvider.isAuthenticated()) {
        throw new Error('LinkedIn provider not authenticated');
      }

      // Get comments from LinkedIn
      const comments = await this.linkedInProvider.getComments(postUrn, 50);
      const inboxMessages: InboxMessage[] = [];

      for (const comment of comments) {
        // Check if this comment already exists in inbox
        const existingMessage = await this.findExistingMessage(comment.id, 'linkedin_comment');
        if (existingMessage) {
          continue; // Skip if already in inbox
        }

        // Convert LinkedIn comment to InboxMessage
        const inboxMessage: Omit<InboxMessage, 'id'> = {
          platformType: PlatformType.LINKEDIN,
          platformId: comment.id,
          accountId,
          userId,
          organizationId,
          type: comment.parentComment ? MessageType.REPLY : MessageType.COMMENT,
          status: MessageStatus.UNREAD,
          priority: MessagePriority.MEDIUM,
          sender: {
            id: comment.actor,
            name: await this.getActorName(comment.actor),
            username: comment.actor.replace('urn:li:person:', ''),
            profilePicture: await this.getActorProfilePicture(comment.actor)
          },
          content: comment.message.text,
          parentId: comment.parentComment,
          contentId: postUrn,
          platformPostId: postUrn,
          receivedAt: new Date(comment.created),
          sentAt: new Date(comment.created),
          sentiment: await this.analyzeSentiment(comment.message.text)
        };

        // Add to inbox
        const message = await this.socialInboxService.addMessage(inboxMessage);
        inboxMessages.push(message);
      }

      logger.info('LinkedIn comments synced to inbox', {
        postUrn,
        commentCount: comments.length,
        newMessages: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing LinkedIn comments to inbox', { error, postUrn });
      return [];
    }
  }

  /**
   * Reply to a LinkedIn comment from the social inbox
   */
  async replyToComment(
    messageId: string, 
    replyContent: string, 
    userId: string
  ): Promise<boolean> {
    try {
      // Get the original message from inbox
      const originalMessage = await this.socialInboxService.getMessage(messageId);
      if (!originalMessage || originalMessage.platformType !== PlatformType.LINKEDIN) {
        throw new Error('Original message not found or not from LinkedIn');
      }

      // Create reply on LinkedIn
      const success = await this.linkedInProvider.createComment(
        originalMessage.contentId || originalMessage.platformPostId || '',
        replyContent
      );

      if (success) {
        // Update message status to replied
        await this.socialInboxService.updateMessageStatus(messageId, MessageStatus.REPLIED);
        
        // Create a new inbox message for our reply
        // Note: LinkedIn API doesn't return comment ID immediately, so we use a temporary ID
        const replyMessage: Omit<InboxMessage, 'id'> = {
          platformType: PlatformType.LINKEDIN,
          platformId: `linkedin_reply_${Date.now()}_${userId}`, // Unique temporary ID
          accountId: originalMessage.accountId,
          userId,
          organizationId: originalMessage.organizationId,
          type: MessageType.REPLY,
          status: MessageStatus.REPLIED,
          priority: MessagePriority.MEDIUM,
          sender: {
            id: userId,
            name: 'You',
            username: 'self'
          },
          content: replyContent,
          parentId: originalMessage.id,
          contentId: originalMessage.contentId,
          platformPostId: originalMessage.platformPostId,
          receivedAt: new Date(),
          sentAt: new Date(),
          sentiment: await this.analyzeSentiment(replyContent)
        };

        await this.socialInboxService.addMessage(replyMessage);
        
        logger.info('Successfully replied to LinkedIn comment from inbox', {
          messageId,
          originalPostUrn: originalMessage.contentId
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error replying to LinkedIn comment from inbox', { error, messageId });
      return false;
    }
  }

  /**
   * Add like to a LinkedIn post/comment from the social inbox
   */
  async addLikeFromInbox(messageId: string, userId: string): Promise<boolean> {
    try {
      const message = await this.socialInboxService.getMessage(messageId);
      if (!message || message.platformType !== PlatformType.LINKEDIN) {
        throw new Error('Message not found or not from LinkedIn');
      }

      const targetUrn = message.contentId || message.platformPostId || '';
      const success = await this.linkedInProvider.addLike(targetUrn);

      if (success) {
        logger.info('Successfully added like from social inbox', {
          messageId,
          targetUrn
        });
      }

      return success;
    } catch (error) {
      logger.error('Error adding like from social inbox', { error, messageId });
      return false;
    }
  }

  /**
   * Sync LinkedIn engagement metrics to inbox
   */
  async syncEngagementMetrics(postUrn: string): Promise<void> {
    try {
      const socialActions = await this.linkedInProvider.getSocialActions(postUrn);
      const socialMetadata = await this.linkedInProvider.getSocialMetadata(postUrn);

      if (socialActions || socialMetadata) {
        // Update engagement metrics in related inbox messages
        // This could be used for sorting, prioritization, etc.
        logger.info('LinkedIn engagement metrics synced', {
          postUrn,
          likes: socialActions?.likesSummary?.totalLikes || socialMetadata?.totalLikes,
          comments: socialActions?.commentsSummary?.totalFirstLevelComments || socialMetadata?.totalComments
        });
      }
    } catch (error) {
      logger.error('Error syncing LinkedIn engagement metrics', { error, postUrn });
    }
  }

  /**
   * Background sync service for LinkedIn social inbox
   */
  async startBackgroundSync(
    userAccounts: Array<{ 
      userId: string; 
      accountId: string; 
      organizationId?: string;
      recentPostUrns: string[];
    }>,
    intervalMinutes: number = 5
  ): Promise<void> {
    const syncInterval = intervalMinutes * 60 * 1000; // Convert to milliseconds

    const syncFunction = async () => {
      for (const account of userAccounts) {
        try {
          for (const postUrn of account.recentPostUrns) {
            await this.syncCommentsToInbox(
              postUrn, 
              account.userId, 
              account.accountId, 
              account.organizationId
            );
            
            await this.syncEngagementMetrics(postUrn);
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          logger.error('Error in LinkedIn background sync for account', {
            error,
            accountId: account.accountId
          });
        }
      }
    };

    // Initial sync
    await syncFunction();

    // Set up interval
    setInterval(syncFunction, syncInterval);

    logger.info('LinkedIn social inbox background sync started', {
      intervalMinutes,
      accountCount: userAccounts.length
    });
  }

  // Helper methods
  private async findExistingMessage(platformId: string, type: string): Promise<InboxMessage | null> {
    try {
      // Query Firestore for existing message with this platform ID
      const { firestore } = await import('../../core/firebase/client');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const messagesQuery = query(
        collection(firestore, 'inboxMessages'),
        where('platformId', '==', platformId),
        where('platformType', '==', PlatformType.LINKEDIN)
      );
      
      const querySnapshot = await getDocs(messagesQuery);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as InboxMessage;
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking for existing message', { error, platformId });
      return null;
    }
  }

  private async getActorName(actorUrn: string): Promise<string> {
    try {
      const personId = actorUrn.replace('urn:li:person:', '');
      const person = await this.linkedInProvider.getPerson(personId);
      if (person?.firstName && person?.lastName) {
        const firstName = Object.values(person.firstName.localized)[0] || '';
        const lastName = Object.values(person.lastName.localized)[0] || '';
        return `${firstName} ${lastName}`.trim();
      }
      return 'LinkedIn User';
    } catch (error) {
      return 'LinkedIn User';
    }
  }

  private async getActorProfilePicture(actorUrn: string): Promise<string | undefined> {
    try {
      const personId = actorUrn.replace('urn:li:person:', '');
      const person = await this.linkedInProvider.getPerson(personId);
      
      if (person?.profilePicture?.['displayImage~']?.elements?.[0]) {
        return person.profilePicture['displayImage~'].elements[0].identifiers?.[0]?.identifier;
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async analyzeSentiment(text: string, user?: User): Promise<'positive' | 'neutral' | 'negative'> {
    try {
      // Use the tiered model router for AI-powered sentiment analysis
      const result = await tieredModelRouter.routeTask({
        type: TaskType.SENTIMENT_ANALYSIS,
        input: text,
        options: {
          temperature: 0.3,
          maxTokens: 150
        }
      }, user);

      // Parse the AI response to extract sentiment
      if (result.output && typeof result.output === 'string') {
        try {
          const parsed = JSON.parse(result.output);
          if (parsed.sentiment && ['positive', 'neutral', 'negative'].includes(parsed.sentiment)) {
            return parsed.sentiment;
          }
        } catch (parseError) {
          // If JSON parsing fails, try to extract sentiment from text
          const output = result.output.toLowerCase();
          if (output.includes('positive')) return 'positive';
          if (output.includes('negative')) return 'negative';
          return 'neutral';
        }
      }

      // Fallback to basic analysis if AI fails
      return this.basicSentimentAnalysis(text);
    } catch (error) {
      logger.error('Error analyzing sentiment with AI', { error, text: text.substring(0, 50) });
      // Fallback to basic analysis if AI fails
      return this.basicSentimentAnalysis(text);
    }
  }

  private basicSentimentAnalysis(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'awesome', 'excellent', 'love', 'amazing', 'fantastic', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'disappointing', 'worst'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
} 
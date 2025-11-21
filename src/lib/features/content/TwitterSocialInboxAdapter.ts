import { TwitterProvider } from '../platforms/providers/TwitterProvider';
import { InboxMessage, MessageType, MessageStatus, MessagePriority } from './SocialInboxService';
import { PlatformType } from '../platforms/PlatformProvider';
import { logger } from '../../core/logging/logger';
import { tieredModelRouter, TaskType } from '../../ai/models/tiered-model-router';
import { User } from '../../core/models/User';
import { v4 as uuidv4 } from 'uuid';

export interface TwitterReplyOptions {
  in_reply_to_tweet_id?: string;
  exclude_reply_user_ids?: string[];
  media_ids?: string[];
  poll?: {
    options: string[];
    duration_minutes: number;
  };
  reply_settings?: 'everyone' | 'mentionedUsers' | 'following';
}

export interface TwitterDirectMessageOptions {
  media_id?: string;
  quick_reply?: {
    type: 'options';
    options: Array<{
      label: string;
      description?: string;
      metadata?: string;
    }>;
  };
}

/**
 * TwitterSocialInboxAdapter handles Twitter-specific social inbox operations
 * including replying to tweets, sending DMs, and processing webhook events
 */
export class TwitterSocialInboxAdapter {
  private provider: TwitterProvider;

  constructor(provider: TwitterProvider) {
    this.provider = provider;
  }

  /**
   * Reply to a tweet or direct message
   */
  async replyToMessage(
    messageId: string,
    content: string,
    userId: string,
    options?: TwitterReplyOptions
  ): Promise<string | undefined> {
    try {
      if (!this.provider.isAuthenticated()) {
        throw new Error('Twitter provider not authenticated');
      }

      // Determine if this is a tweet reply or DM based on message format
      if (messageId.startsWith('dm_')) {
        return await this.sendDirectMessage(messageId, content, options as TwitterDirectMessageOptions);
      } else {
        return await this.replyToTweet(messageId, content, options);
      }
    } catch (error) {
      console.error('Failed to reply to Twitter message:', error);
      throw error;
    }
  }

  /**
   * Reply to a specific tweet
   */
  async replyToTweet(
    tweetId: string,
    content: string,
    options?: TwitterReplyOptions
  ): Promise<string> {
    // Use the provider's replyToComment method which handles authentication internally
    return await this.provider.replyToComment(tweetId, content);
  }

  /**
   * Send a direct message
   */
  async sendDirectMessage(
    recipientId: string,
    content: string,
    options?: TwitterDirectMessageOptions
  ): Promise<string> {
    // Extract recipient ID from DM message ID format
    const actualRecipientId = recipientId.replace('dm_', '').split('_')[0];
    
    // Use the provider's sendDirectMessage method
    const dmResponse = await this.provider.sendDirectMessage(actualRecipientId, content, options?.media_id);
    return dmResponse.id;
  }

  /**
   * Process incoming Twitter webhook event and convert to InboxMessage
   */
  async processWebhookEvent(
    event: any,
    accountId: string,
    userId: string
  ): Promise<InboxMessage | null> {
    try {
      // Handle different Twitter webhook event types
      if (event.tweet_create_events) {
        return await this.processTweetEvent(event.tweet_create_events[0], accountId, userId);
      }
      
      if (event.direct_message_events) {
        return await this.processDirectMessageEvent(event.direct_message_events[0], accountId, userId);
      }

      if (event.favorite_events) {
        return await this.processFavoriteEvent(event.favorite_events[0], accountId, userId);
      }

      if (event.follow_events) {
        return await this.processFollowEvent(event.follow_events[0], accountId, userId);
      }

      return null;
    } catch (error) {
      console.error('Failed to process Twitter webhook event:', error);
      return null;
    }
  }

  /**
   * Process tweet creation events (mentions, replies)
   */
  private async processTweetEvent(
    tweetEvent: any,
    accountId: string,
    userId: string
  ): Promise<InboxMessage | null> {
    const tweet = tweetEvent;
    
    // Skip tweets from the authenticated user
    if (tweet.user?.id_str === accountId) {
      return null;
    }

    // Determine message type
    let messageType = MessageType.MENTION;
    if (tweet.in_reply_to_status_id_str) {
      messageType = MessageType.REPLY;
    }

    const message: InboxMessage = {
      id: `twitter_${tweet.id_str}`,
      platformType: PlatformType.TWITTER,
      platformId: tweet.id_str,
      accountId,
      userId,
      type: messageType,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.MEDIUM,
      sender: {
        id: tweet.user.id_str,
        name: tweet.user.name,
        username: tweet.user.screen_name,
        profilePicture: tweet.user.profile_image_url_https,
        verified: tweet.user.verified,
        followerCount: tweet.user.followers_count
      },
      content: tweet.text || tweet.full_text || '',
      attachments: this.extractMediaAttachments(tweet),
      parentId: tweet.in_reply_to_status_id_str || undefined,
      platformPostId: tweet.id_str,
      receivedAt: new Date(tweet.created_at),
      sentAt: new Date(tweet.created_at),
      sentiment: await this.analyzeSentiment(tweet.text || tweet.full_text || '')
    };

    return message;
  }

  /**
   * Process direct message events
   */
  private async processDirectMessageEvent(
    dmEvent: any,
    accountId: string,
    userId: string
  ): Promise<InboxMessage | null> {
    const dm = dmEvent.message_create;
    
    // Skip DMs sent by the authenticated user
    if (dm.sender_id === accountId) {
      return null;
    }

    const message: InboxMessage = {
      id: `twitter_dm_${dmEvent.id}`,
      platformType: PlatformType.TWITTER,
      platformId: dmEvent.id,
      accountId,
      userId,
      type: MessageType.DIRECT_MESSAGE,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.HIGH, // DMs are typically higher priority
      sender: {
        id: dm.sender_id,
        name: 'Twitter User', // Would need to fetch user details separately
        username: dm.sender_id
      },
      content: dm.message_data.text,
      attachments: this.extractDMAttachments(dm.message_data),
      receivedAt: new Date(parseInt(dmEvent.created_timestamp)),
      sentAt: new Date(parseInt(dmEvent.created_timestamp)),
      sentiment: await this.analyzeSentiment(dm.message_data.text)
    };

    return message;
  }

  /**
   * Process favorite/like events
   */
  private async processFavoriteEvent(
    favoriteEvent: any,
    accountId: string,
    userId: string
  ): Promise<InboxMessage | null> {
    // Only process favorites on our tweets
    if (favoriteEvent.favorited_status?.user?.id_str !== accountId) {
      return null;
    }

    const message: InboxMessage = {
      id: `twitter_fav_${favoriteEvent.id}`,
      platformType: PlatformType.TWITTER,
      platformId: favoriteEvent.id,
      accountId,
      userId,
      type: MessageType.MENTION,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.LOW,
      sender: {
        id: favoriteEvent.user.id_str,
        name: favoriteEvent.user.name,
        username: favoriteEvent.user.screen_name,
        profilePicture: favoriteEvent.user.profile_image_url_https,
        verified: favoriteEvent.user.verified,
        followerCount: favoriteEvent.user.followers_count
      },
      content: `Liked your tweet: "${favoriteEvent.favorited_status.text}"`,
      receivedAt: new Date(favoriteEvent.created_at),
      sentAt: new Date(favoriteEvent.created_at),
      sentiment: await this.analyzeSentiment(favoriteEvent.favorited_status.text)
    };

    return message;
  }

  /**
   * Process follow events
   */
  private async processFollowEvent(
    followEvent: any,
    accountId: string,
    userId: string
  ): Promise<InboxMessage | null> {
    // Only process follows of our account
    if (followEvent.target?.id_str !== accountId) {
      return null;
    }

    const message: InboxMessage = {
      id: `twitter_follow_${followEvent.source.id_str}_${Date.now()}`,
      platformType: PlatformType.TWITTER,
      platformId: `follow_${followEvent.source.id_str}`,
      accountId,
      userId,
      type: MessageType.MENTION,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.LOW,
      sender: {
        id: followEvent.source.id_str,
        name: followEvent.source.name,
        username: followEvent.source.screen_name,
        profilePicture: followEvent.source.profile_image_url_https,
        verified: followEvent.source.verified,
        followerCount: followEvent.source.followers_count
      },
      content: `Started following you`,
      receivedAt: new Date(),
      sentAt: new Date(),
      sentiment: await this.analyzeSentiment(`Started following you`)
    };

    return message;
  }

  /**
   * Extract media attachments from tweet
   */
  private extractMediaAttachments(tweet: any): any[] {
    const attachments: any[] = [];

    if (tweet.entities?.media) {
      tweet.entities.media.forEach((media: any) => {
        attachments.push({
          type: media.type, // photo, video, animated_gif
          url: media.media_url_https,
          thumbnailUrl: media.media_url_https,
          width: media.sizes?.large?.w,
          height: media.sizes?.large?.h
        });
      });
    }

    if (tweet.extended_entities?.media) {
      tweet.extended_entities.media.forEach((media: any) => {
        if (media.video_info) {
          const videoVariant = media.video_info.variants
            .filter((v: any) => v.content_type === 'video/mp4')
            .sort((a: any, b: any) => b.bitrate - a.bitrate)[0];
          
          if (videoVariant) {
            attachments.push({
              type: 'video',
              url: videoVariant.url,
              thumbnailUrl: media.media_url_https,
              width: media.video_info.aspect_ratio?.[0],
              height: media.video_info.aspect_ratio?.[1]
            });
          }
        }
      });
    }

    return attachments;
  }

  /**
   * Extract attachments from direct message
   */
  private extractDMAttachments(messageData: any): any[] {
    const attachments: any[] = [];

    if (messageData.attachment?.media) {
      const media = messageData.attachment.media;
      attachments.push({
        type: media.type,
        url: media.media_url_https,
        thumbnailUrl: media.media_url_https
      });
    }

    return attachments;
  }

  /**
   * AI-powered sentiment analysis
   */
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

  /**
   * Basic sentiment analysis fallback
   */
  private basicSentimentAnalysis(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['love', 'great', 'awesome', 'amazing', 'excellent', 'fantastic', 'wonderful', 'good', 'best', 'perfect'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'worst', 'horrible', 'disgusting', 'annoying', 'stupid', 'useless'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Get user details by ID using the provider's method
   */
  async getUserDetails(userId: string): Promise<any> {
    return await this.provider.getUserProfile(userId);
  }

  /**
   * Search for tweets mentioning the account using the provider's method
   */
  async searchMentions(accountUsername: string, maxResults: number = 10): Promise<any[]> {
    const searchResults = await this.provider.searchTweets({
      query: `@${accountUsername} -is:retweet`,
      max_results: maxResults,
      sort_order: 'recency'
    });
    
    return searchResults.data || [];
  }

  /**
   * Sync Twitter mentions to inbox
   */
  async syncMentionsToInbox(
    userId: string,
    accountId: string,
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      // Get recent mentions using Twitter API
      const mentions = await this.provider.getMentions();
      const messages: InboxMessage[] = [];

      for (const mention of mentions) {
        const message = await this.processTweetEvent(mention, accountId, userId);
        if (message) {
          messages.push(message);
        }
      }

      return messages;
    } catch (error) {
      logger.error('Failed to sync Twitter mentions to inbox', { error, userId, accountId });
      throw error;
    }
  }

  /**
   * Sync Twitter direct messages to inbox
   */
  async syncDirectMessagesToInbox(
    userId: string,
    accountId: string,
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      // Get recent DMs using Twitter API
      const dms = await this.provider.getDirectMessages();
      const messages: InboxMessage[] = [];

      for (const dm of dms) {
        const message = await this.processDirectMessageEvent(dm, accountId, userId);
        if (message) {
          messages.push(message);
        }
      }

      return messages;
    } catch (error) {
      logger.error('Failed to sync Twitter DMs to inbox', { error, userId, accountId });
      throw error;
    }
  }

  /**
   * Sync replies to a specific tweet to inbox
   */
  async syncRepliesToInbox(
    tweetId: string,
    userId: string,
    accountId: string,
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      // Get replies to the specific tweet
      const replies = await this.provider.getConversation(tweetId);
      const messages: InboxMessage[] = [];

      for (const reply of replies) {
        const message = await this.processTweetEvent(reply, accountId, userId);
        if (message) {
          messages.push(message);
        }
      }

      return messages;
    } catch (error) {
      logger.error('Failed to sync Twitter replies to inbox', { error, tweetId, userId, accountId });
      throw error;
    }
  }

  /**
   * Sync engagement metrics for a tweet
   */
  async syncEngagementMetrics(tweetId: string): Promise<void> {
    try {
      // Get tweet metrics using Twitter API
      const metrics = await this.provider.getMetrics(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date());
      
      // Store metrics in database (implementation depends on your metrics storage)
      logger.info('Twitter engagement metrics synced', { tweetId, metrics });
    } catch (error) {
      logger.error('Failed to sync Twitter engagement metrics', { error, tweetId });
      throw error;
    }
  }
} 
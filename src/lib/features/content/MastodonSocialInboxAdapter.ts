import { MastodonProvider } from '../platforms/providers/MastodonProvider';
import { SocialInboxService, InboxMessage, MessageType, MessageStatus, MessagePriority } from './SocialInboxService';
import { PlatformType } from '../platforms/PlatformProvider';
import { logger } from '../../core/logging/logger';
import { tieredModelRouter, TaskType } from '../ai/models/tiered-model-router';
import { User } from '../../core/models/User';
import { v4 as uuidv4 } from 'uuid';

export interface MastodonReplyOptions {
  status_id?: string;
  in_reply_to_id?: string;
  visibility?: 'public' | 'unlisted' | 'private' | 'direct';
  sensitive?: boolean;
  spoiler_text?: string;
  media_ids?: string[];
}

export interface MastodonStatusData {
  id: string;
  uri: string;
  url: string;
  account: {
    id: string;
    username: string;
    acct: string;
    display_name: string;
    locked: boolean;
    bot: boolean;
    discoverable: boolean;
    group: boolean;
    created_at: string;
    note: string;
    url: string;
    avatar: string;
    avatar_static: string;
    header: string;
    header_static: string;
    followers_count: number;
    following_count: number;
    statuses_count: number;
    last_status_at: string;
    verified: boolean;
    fields: Array<{
      name: string;
      value: string;
      verified_at?: string;
    }>;
  };
  in_reply_to_id?: string;
  in_reply_to_account_id?: string;
  reblog?: any;
  content: string;
  created_at: string;
  emojis: any[];
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  reblogged: boolean;
  favourited: boolean;
  muted: boolean;
  sensitive: boolean;
  spoiler_text: string;
  visibility: string;
  media_attachments: Array<{
    id: string;
    type: string;
    url: string;
    preview_url: string;
    remote_url?: string;
    text_url?: string;
    meta?: any;
    description?: string;
    blurhash?: string;
  }>;
  mentions: Array<{
    id: string;
    username: string;
    url: string;
    acct: string;
  }>;
  tags: Array<{
    name: string;
    url: string;
  }>;
  card?: any;
  poll?: any;
  application?: {
    name: string;
    website?: string;
  };
  language?: string;
  pinned: boolean;
  bookmarked: boolean;
}

export interface MastodonNotificationData {
  id: string;
  type: 'mention' | 'status' | 'reblog' | 'follow' | 'follow_request' | 'favourite' | 'poll' | 'update';
  created_at: string;
  account: MastodonStatusData['account'];
  status?: MastodonStatusData;
}

export interface MastodonConversationData {
  id: string;
  unread: boolean;
  accounts: MastodonStatusData['account'][];
  last_status: MastodonStatusData;
}

/**
 * Mastodon Social Inbox Adapter
 * Integrates Mastodon mentions, replies, and direct messages with the unified social inbox
 * Supports custom server instances
 */
export class MastodonSocialInboxAdapter {
  private mastodonProvider: MastodonProvider;
  private socialInboxService: SocialInboxService;
  private serverInstance: string;
  
  constructor(mastodonProvider: MastodonProvider, serverInstance: string = 'mastodon.social') {
    this.mastodonProvider = mastodonProvider;
    this.socialInboxService = new SocialInboxService();
    this.serverInstance = serverInstance;
  }

  /**
   * Sync Mastodon notifications to unified inbox
   */
  async syncNotificationsToInbox(
    userId: string, 
    accountId: string, 
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      if (!this.mastodonProvider.isAuthenticated()) {
        throw new Error('Mastodon provider not authenticated');
      }

      // Get recent notifications
      const notifications = await this.getNotifications();
      const inboxMessages: InboxMessage[] = [];

      for (const notification of notifications) {
        // Skip notifications from the authenticated user
        if (notification.account.id === accountId) {
          continue;
        }

        // Check if this notification already exists in inbox
        const existingMessage = await this.findExistingMessage(notification.id, 'mastodon_notification');
        if (existingMessage) {
          continue;
        }

        // Convert Mastodon notification to InboxMessage
        const inboxMessage = await this.convertNotificationToInboxMessage(
          notification,
          accountId,
          userId,
          organizationId
        );

        if (inboxMessage) {
          // Add to inbox
          const inboxMsg = await this.socialInboxService.addMessage(inboxMessage);
          inboxMessages.push(inboxMsg);
        }
      }

      logger.info('Mastodon notifications synced to inbox', {
        serverInstance: this.serverInstance,
        newNotifications: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing Mastodon notifications to inbox', { error, serverInstance: this.serverInstance });
      return [];
    }
  }

  /**
   * Sync Mastodon direct message conversations to unified inbox
   */
  async syncConversationsToInbox(
    userId: string, 
    accountId: string, 
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      if (!this.mastodonProvider.isAuthenticated()) {
        throw new Error('Mastodon provider not authenticated');
      }

      // Get direct message conversations
      const conversations = await this.getConversations();
      const inboxMessages: InboxMessage[] = [];

      for (const conversation of conversations) {
        // Skip conversations where the last status is from the authenticated user
        if (conversation.last_status.account.id === accountId) {
          continue;
        }

        // Check if this conversation already exists in inbox
        const existingMessage = await this.findExistingMessage(conversation.id, 'mastodon_conversation');
        if (existingMessage) {
          continue;
        }

        // Convert Mastodon conversation to InboxMessage
        const inboxMessage: Omit<InboxMessage, 'id'> = {
          platformType: PlatformType.MASTODON,
          platformId: conversation.id,
          accountId,
          userId,
          organizationId,
          type: MessageType.DIRECT_MESSAGE,
          status: conversation.unread ? MessageStatus.UNREAD : MessageStatus.READ,
          priority: MessagePriority.HIGH, // Direct messages are high priority
          sender: {
            id: conversation.last_status.account.id,
            name: conversation.last_status.account.display_name || conversation.last_status.account.username,
            username: conversation.last_status.account.acct,
            profilePicture: conversation.last_status.account.avatar,
            verified: conversation.last_status.account.verified,
            followerCount: conversation.last_status.account.followers_count
          },
          content: this.stripHtmlTags(conversation.last_status.content),
          contentId: conversation.last_status.id,
          platformPostId: conversation.last_status.id,
          receivedAt: new Date(conversation.last_status.created_at),
          sentAt: new Date(conversation.last_status.created_at),
          sentiment: await this.analyzeSentiment(conversation.last_status.content),
          attachments: this.convertMediaAttachments(conversation.last_status.media_attachments)
        };

        // Add to inbox
        const inboxMsg = await this.socialInboxService.addMessage(inboxMessage);
        inboxMessages.push(inboxMsg);
      }

      logger.info('Mastodon conversations synced to inbox', {
        serverInstance: this.serverInstance,
        newConversations: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing Mastodon conversations to inbox', { error, serverInstance: this.serverInstance });
      return [];
    }
  }

  /**
   * Reply to a Mastodon status or direct message from the social inbox
   */
  async replyToMessage(
    messageId: string, 
    replyContent: string, 
    userId: string,
    options?: MastodonReplyOptions
  ): Promise<string> {
    try {
      const originalMessage = await this.socialInboxService.getMessage(messageId);
      if (!originalMessage || originalMessage.platformType !== PlatformType.MASTODON) {
        throw new Error('Original message not found or not from Mastodon');
      }

      if (!this.mastodonProvider.isAuthenticated()) {
        throw new Error('Mastodon provider not authenticated');
      }

      // Reply to the status using Mastodon API
      const replyId = await this.createStatusReply(
        originalMessage.platformId,
        replyContent,
        options
      );

      if (replyId) {
        // Update message status to replied
        await this.socialInboxService.updateMessageStatus(messageId, MessageStatus.REPLIED);
        
        logger.info('Successfully replied to Mastodon message from inbox', {
          messageId,
          replyId,
          serverInstance: this.serverInstance
        });

        return replyId;
      }

      throw new Error('Failed to get reply ID');
    } catch (error) {
      logger.error('Error replying to Mastodon message from inbox', { error, messageId, serverInstance: this.serverInstance });
      throw error;
    }
  }

  /**
   * Start background sync for Mastodon interactions
   */
  async startBackgroundSync(
    accounts: Array<{
      userId: string;
      accountId: string;
      organizationId?: string;
      serverInstance?: string;
    }>,
    intervalMinutes: number = 10
  ): Promise<void> {
    logger.info('Starting Mastodon background sync', {
      accountCount: accounts.length,
      intervalMinutes,
      serverInstance: this.serverInstance
    });

    // Set up periodic sync
    setInterval(async () => {
      for (const account of accounts) {
        try {
          // Update server instance if specified
          if (account.serverInstance && account.serverInstance !== this.serverInstance) {
            this.serverInstance = account.serverInstance;
          }

          // Sync notifications
          await this.syncNotificationsToInbox(
            account.userId,
            account.accountId,
            account.organizationId
          );

          // Sync conversations
          await this.syncConversationsToInbox(
            account.userId,
            account.accountId,
            account.organizationId
          );
        } catch (error) {
          logger.error('Error in Mastodon background sync', {
            error,
            accountId: account.accountId,
            serverInstance: account.serverInstance || this.serverInstance
          });
        }
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Process Mastodon webhook event and convert to InboxMessage
   */
  async processWebhookEvent(
    event: any,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<InboxMessage | null> {
    try {
      // Handle different Mastodon webhook event types
      if (event.type === 'notification') {
        return await this.processNotificationEvent(event.data, accountId, userId, organizationId);
      }
      
      if (event.type === 'status') {
        return await this.processStatusEvent(event.data, accountId, userId, organizationId);
      }

      return null;
    } catch (error) {
      logger.error('Failed to process Mastodon webhook event', { error, event, serverInstance: this.serverInstance });
      return null;
    }
  }

  // Private helper methods

  private async getNotifications(limit: number = 40): Promise<MastodonNotificationData[]> {
    try {
      if (!this.mastodonProvider.isAuthenticated()) {
        throw new Error('Mastodon provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://${this.serverInstance}/api/v1/notifications`;
      const params = new URLSearchParams({
        limit: limit.toString(),
        types: JSON.stringify(['mention', 'status', 'follow', 'favourite', 'reblog'])
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Mastodon API error: ${response.status}`);
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      logger.error('Error fetching Mastodon notifications', { error, serverInstance: this.serverInstance });
      return [];
    }
  }

  private async getConversations(limit: number = 20): Promise<MastodonConversationData[]> {
    try {
      if (!this.mastodonProvider.isAuthenticated()) {
        throw new Error('Mastodon provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://${this.serverInstance}/api/v1/conversations`;
      const params = new URLSearchParams({
        limit: limit.toString()
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Mastodon API error: ${response.status}`);
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      logger.error('Error fetching Mastodon conversations', { error, serverInstance: this.serverInstance });
      return [];
    }
  }

  private async createStatusReply(
    statusId: string,
    content: string,
    options?: MastodonReplyOptions
  ): Promise<string | null> {
    try {
      if (!this.mastodonProvider.isAuthenticated()) {
        throw new Error('Mastodon provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://${this.serverInstance}/api/v1/statuses`;
      
      const requestBody: any = {
        status: content,
        in_reply_to_id: statusId,
        visibility: options?.visibility || 'public'
      };

      if (options?.sensitive) {
        requestBody.sensitive = options.sensitive;
      }

      if (options?.spoiler_text) {
        requestBody.spoiler_text = options.spoiler_text;
      }

      if (options?.media_ids && options.media_ids.length > 0) {
        requestBody.media_ids = options.media_ids;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Mastodon API error: ${response.status}`);
      }

      const data = await response.json();
      return data.id || null;
    } catch (error) {
      logger.error('Error creating Mastodon status reply', { error, statusId, serverInstance: this.serverInstance });
      return null;
    }
  }

  private async getProviderAuthState(): Promise<any> {
    try {
      return await (this.mastodonProvider as any).getAuthState?.() || null;
    } catch (error) {
      logger.error('Error getting Mastodon provider auth state', { error });
      return null;
    }
  }

  private async convertNotificationToInboxMessage(
    notification: MastodonNotificationData,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<Omit<InboxMessage, 'id'> | null> {
    let messageType: MessageType;
    let content: string;
    let priority: MessagePriority = MessagePriority.MEDIUM;

    switch (notification.type) {
      case 'mention':
        messageType = MessageType.MENTION;
        content = notification.status ? this.stripHtmlTags(notification.status.content) : 'Mentioned you';
        priority = MessagePriority.HIGH;
        break;
      case 'follow':
        messageType = MessageType.MENTION;
        content = 'Started following you';
        priority = MessagePriority.LOW;
        break;
      case 'favourite':
        messageType = MessageType.MENTION;
        content = notification.status ? `Favourited: ${this.stripHtmlTags(notification.status.content).substring(0, 100)}...` : 'Favourited your status';
        priority = MessagePriority.LOW;
        break;
      case 'reblog':
        messageType = MessageType.MENTION;
        content = notification.status ? `Boosted: ${this.stripHtmlTags(notification.status.content).substring(0, 100)}...` : 'Boosted your status';
        priority = MessagePriority.LOW;
        break;
      default:
        return null; // Skip unsupported notification types
    }

    return {
      platformType: PlatformType.MASTODON,
      platformId: notification.id,
      accountId,
      userId,
      organizationId,
      type: messageType,
      status: MessageStatus.UNREAD,
      priority,
      sender: {
        id: notification.account.id,
        name: notification.account.display_name || notification.account.username,
        username: notification.account.acct,
        profilePicture: notification.account.avatar,
        verified: notification.account.verified,
        followerCount: notification.account.followers_count
      },
      content,
      contentId: notification.status?.id,
      platformPostId: notification.status?.id,
      parentId: notification.status?.in_reply_to_id,
      receivedAt: new Date(notification.created_at),
      sentAt: new Date(notification.created_at),
      sentiment: await this.analyzeSentiment(content),
      attachments: notification.status ? this.convertMediaAttachments(notification.status.media_attachments) : []
    };
  }

  private async processNotificationEvent(
    notificationData: any,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<InboxMessage | null> {
    // Skip notifications from the authenticated user
    if (notificationData.account?.id === accountId) {
      return null;
    }

    const inboxMessage = await this.convertNotificationToInboxMessage(
      notificationData,
      accountId,
      userId,
      organizationId
    );

    if (inboxMessage) {
      return {
        id: `mastodon_${notificationData.id}`,
        ...inboxMessage
      };
    }

    return null;
  }

  private async processStatusEvent(
    statusData: any,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<InboxMessage | null> {
    // Skip statuses from the authenticated user
    if (statusData.account?.id === accountId) {
      return null;
    }

    // Only process if it's a mention or reply
    const isMention = statusData.mentions?.some((mention: any) => mention.id === accountId);
    const isReply = statusData.in_reply_to_account_id === accountId;

    if (!isMention && !isReply) {
      return null;
    }

    const message: InboxMessage = {
      id: `mastodon_status_${statusData.id}`,
      platformType: PlatformType.MASTODON,
      platformId: statusData.id,
      accountId,
      userId,
      organizationId,
      type: isReply ? MessageType.REPLY : MessageType.MENTION,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.MEDIUM,
      sender: {
        id: statusData.account.id,
        name: statusData.account.display_name || statusData.account.username,
        username: statusData.account.acct,
        profilePicture: statusData.account.avatar,
        verified: statusData.account.verified,
        followerCount: statusData.account.followers_count
      },
      content: this.stripHtmlTags(statusData.content),
      contentId: statusData.id,
      platformPostId: statusData.id,
      parentId: statusData.in_reply_to_id,
      receivedAt: new Date(statusData.created_at),
      sentAt: new Date(statusData.created_at),
      sentiment: await this.analyzeSentiment(statusData.content),
      attachments: this.convertMediaAttachments(statusData.media_attachments)
    };

    return message;
  }

  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  private convertMediaAttachments(attachments: any[]): any[] {
    return attachments.map(attachment => ({
      type: attachment.type,
      url: attachment.url,
      thumbnailUrl: attachment.preview_url,
      width: attachment.meta?.original?.width,
      height: attachment.meta?.original?.height
    }));
  }

  private calculatePriority(notification: MastodonNotificationData): MessagePriority {
    // High priority for mentions and follows from verified or high-follower accounts
    if (notification.type === 'mention' || 
        (notification.account.verified) ||
        (notification.account.followers_count > 10000)) {
      return MessagePriority.HIGH;
    }
    
    // Medium priority for other interactions from moderate accounts
    if (notification.account.followers_count > 1000) {
      return MessagePriority.MEDIUM;
    }
    
    return MessagePriority.LOW;
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
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'love', 'amazing', 'thanks', 'helpful', '❤️', '😊', '🔥', '👍'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'stupid', '😡', '👎', '😢'];
    
    const lowerText = text.toLowerCase();
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'negative';
    }
    
    return 'neutral';
  }

  private async findExistingMessage(platformId: string, type: string): Promise<InboxMessage | null> {
    try {
      // Query Firestore for existing message with this platform ID
      const { firestore } = await import('../../core/firebase/client');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const messagesQuery = query(
        collection(firestore, 'inboxMessages'),
        where('platformId', '==', platformId),
        where('platformType', '==', PlatformType.MASTODON)
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
      logger.error('Error checking for existing message', { error, platformId, type });
      return null;
    }
  }

  /**
   * Set the Mastodon server instance
   */
  setServerInstance(instance: string): void {
    this.serverInstance = instance;
    logger.info('Mastodon server instance updated', { serverInstance: instance });
  }

  /**
   * Get the current server instance
   */
  getServerInstance(): string {
    return this.serverInstance;
  }
}

// Create singleton instance factory
export const createMastodonSocialInboxAdapter = (serverInstance: string = 'mastodon.social') => {
  return new MastodonSocialInboxAdapter(
    new (require('../platforms/providers/MastodonProvider')).MastodonProvider(
      {
        clientId: process.env.MASTODON_CLIENT_ID || '',
        clientSecret: process.env.MASTODON_CLIENT_SECRET || '',
        redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=mastodon' || '',
        serverInstance
      }
    ),
    serverInstance
  );
};

// Default instance for mastodon.social
const mastodonSocialInboxAdapter = createMastodonSocialInboxAdapter();

export default mastodonSocialInboxAdapter; 
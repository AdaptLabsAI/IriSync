import { RedditProvider } from '../platforms/providers/RedditProvider';
import { SocialInboxService, InboxMessage, MessageType, MessageStatus, MessagePriority } from './SocialInboxService';
import { PlatformType } from '../platforms/PlatformProvider';
import { logger } from '../../core/logging/logger';
import { tieredModelRouter, TaskType } from '../ai/models/tiered-model-router';
import { User } from '../../core/models/User';
import { v4 as uuidv4 } from 'uuid';

export interface RedditReplyOptions {
  post_id?: string;
  comment_id?: string;
  subreddit?: string;
  parent_id?: string;
}

export interface RedditCommentData {
  id: string;
  name: string;
  link_id: string;
  parent_id?: string;
  subreddit: string;
  subreddit_id: string;
  author: string;
  author_fullname: string;
  body: string;
  body_html: string;
  created_utc: number;
  edited: boolean | number;
  score: number;
  ups: number;
  downs: number;
  replies?: {
    data: {
      children: RedditCommentData[];
    };
  };
  distinguished?: string;
  stickied: boolean;
  is_submitter: boolean;
  permalink: string;
  depth: number;
}

export interface RedditPostData {
  id: string;
  name: string;
  title: string;
  selftext: string;
  selftext_html: string;
  url: string;
  subreddit: string;
  subreddit_id: string;
  author: string;
  author_fullname: string;
  created_utc: number;
  edited: boolean | number;
  score: number;
  upvote_ratio: number;
  ups: number;
  downs: number;
  num_comments: number;
  permalink: string;
  thumbnail: string;
  is_video: boolean;
  is_self: boolean;
  distinguished?: string;
  stickied: boolean;
  locked: boolean;
  archived: boolean;
  over_18: boolean;
  spoiler: boolean;
  media?: any;
  preview?: any;
}

export interface RedditMessageData {
  id: string;
  name: string;
  author: string;
  dest: string;
  body: string;
  body_html: string;
  subject: string;
  created_utc: number;
  was_comment: boolean;
  first_message?: string;
  first_message_name?: string;
  subreddit?: string;
  link_title?: string;
  context?: string;
  replies?: any;
  new: boolean;
  distinguished?: string;
}

/**
 * Reddit Social Inbox Adapter
 * Integrates Reddit comments, mentions, and private messages with the unified social inbox
 */
export class RedditSocialInboxAdapter {
  private redditProvider: RedditProvider;
  private socialInboxService: SocialInboxService;
  
  constructor(redditProvider: RedditProvider) {
    this.redditProvider = redditProvider;
    this.socialInboxService = new SocialInboxService();
  }

  /**
   * Sync Reddit post comments to unified inbox
   */
  async syncPostCommentsToInbox(
    userId: string, 
    accountId: string, 
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      if (!this.redditProvider.isAuthenticated()) {
        throw new Error('Reddit provider not authenticated');
      }

      // Get recent posts for the user
      const posts = await this.getRecentPosts(10);
      const inboxMessages: InboxMessage[] = [];

      for (const post of posts) {
        // Get comments for each post
        const comments = await this.getPostComments(post.id);
        
        for (const comment of comments) {
          // Skip comments from the authenticated user
          if (comment.author === accountId) {
            continue;
          }

          // Check if this comment already exists in inbox
          const existingMessage = await this.findExistingMessage(comment.id, 'reddit_comment');
          if (existingMessage) {
            continue;
          }

          // Convert Reddit comment to InboxMessage
          const inboxMessage: Omit<InboxMessage, 'id'> = {
            platformType: PlatformType.REDDIT,
            platformId: comment.id,
            accountId,
            userId,
            organizationId,
            type: comment.parent_id && comment.parent_id !== post.name ? MessageType.REPLY : MessageType.COMMENT,
            status: MessageStatus.UNREAD,
            priority: this.calculatePriority(comment),
            sender: {
              id: comment.author_fullname || comment.author,
              name: comment.author,
              username: comment.author,
              profilePicture: `https://www.reddit.com/user/${comment.author}/avatar.png`
            },
            content: comment.body,
            contentId: post.id,
            platformPostId: post.id,
            parentId: comment.parent_id,
            receivedAt: new Date(comment.created_utc * 1000),
            sentAt: new Date(comment.created_utc * 1000),
            sentiment: await this.analyzeSentiment(comment.body),
            attachments: []
          };

          // Add to inbox
          const inboxMsg = await this.socialInboxService.addMessage(inboxMessage);
          inboxMessages.push(inboxMsg);
        }
      }

      logger.info('Reddit post comments synced to inbox', {
        postCount: posts.length,
        newComments: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing Reddit post comments to inbox', { error });
      return [];
    }
  }

  /**
   * Sync Reddit private messages to unified inbox
   */
  async syncPrivateMessagesToInbox(
    userId: string, 
    accountId: string, 
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      if (!this.redditProvider.isAuthenticated()) {
        throw new Error('Reddit provider not authenticated');
      }

      // Get private messages
      const messages = await this.getPrivateMessages();
      const inboxMessages: InboxMessage[] = [];

      for (const message of messages) {
        // Skip messages sent by the authenticated user
        if (message.author === accountId) {
          continue;
        }

        // Check if this message already exists in inbox
        const existingMessage = await this.findExistingMessage(message.id, 'reddit_message');
        if (existingMessage) {
          continue;
        }

        // Convert Reddit message to InboxMessage
        const inboxMessage: Omit<InboxMessage, 'id'> = {
          platformType: PlatformType.REDDIT,
          platformId: message.id,
          accountId,
          userId,
          organizationId,
          type: MessageType.DIRECT_MESSAGE,
          status: MessageStatus.UNREAD,
          priority: MessagePriority.HIGH, // Private messages are high priority
          sender: {
            id: message.author,
            name: message.author,
            username: message.author,
            profilePicture: `https://www.reddit.com/user/${message.author}/avatar.png`
          },
          content: message.body,
          contentId: message.id,
          platformPostId: message.id,
          parentId: message.first_message_name,
          receivedAt: new Date(message.created_utc * 1000),
          sentAt: new Date(message.created_utc * 1000),
          sentiment: await this.analyzeSentiment(message.body),
          attachments: []
        };

        // Add to inbox
        const inboxMsg = await this.socialInboxService.addMessage(inboxMessage);
        inboxMessages.push(inboxMsg);
      }

      logger.info('Reddit private messages synced to inbox', {
        newMessages: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing Reddit private messages to inbox', { error });
      return [];
    }
  }

  /**
   * Sync Reddit mentions to unified inbox
   */
  async syncMentionsToInbox(
    userId: string, 
    accountId: string, 
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      if (!this.redditProvider.isAuthenticated()) {
        throw new Error('Reddit provider not authenticated');
      }

      // Get mentions
      const mentions = await this.getMentions();
      const inboxMessages: InboxMessage[] = [];

      for (const mention of mentions) {
        // Skip mentions from the authenticated user
        if (mention.author === accountId) {
          continue;
        }

        // Check if this mention already exists in inbox
        const existingMessage = await this.findExistingMessage(mention.id, 'reddit_mention');
        if (existingMessage) {
          continue;
        }

        // Convert Reddit mention to InboxMessage
        const inboxMessage: Omit<InboxMessage, 'id'> = {
          platformType: PlatformType.REDDIT,
          platformId: mention.id,
          accountId,
          userId,
          organizationId,
          type: MessageType.MENTION,
          status: MessageStatus.UNREAD,
          priority: MessagePriority.MEDIUM,
          sender: {
            id: mention.author_fullname || mention.author,
            name: mention.author,
            username: mention.author,
            profilePicture: `https://www.reddit.com/user/${mention.author}/avatar.png`
          },
          content: mention.body,
          contentId: mention.link_id,
          platformPostId: mention.link_id,
          parentId: mention.parent_id,
          receivedAt: new Date(mention.created_utc * 1000),
          sentAt: new Date(mention.created_utc * 1000),
          sentiment: await this.analyzeSentiment(mention.body),
          attachments: []
        };

        // Add to inbox
        const inboxMsg = await this.socialInboxService.addMessage(inboxMessage);
        inboxMessages.push(inboxMsg);
      }

      logger.info('Reddit mentions synced to inbox', {
        newMentions: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing Reddit mentions to inbox', { error });
      return [];
    }
  }

  /**
   * Reply to a Reddit comment or message from the social inbox
   */
  async replyToMessage(
    messageId: string, 
    replyContent: string, 
    userId: string
  ): Promise<string> {
    try {
      const originalMessage = await this.socialInboxService.getMessage(messageId);
      if (!originalMessage || originalMessage.platformType !== PlatformType.REDDIT) {
        throw new Error('Original message not found or not from Reddit');
      }

      if (!this.redditProvider.isAuthenticated()) {
        throw new Error('Reddit provider not authenticated');
      }

      let replyId: string;

      // Handle different message types
      if (originalMessage.type === MessageType.DIRECT_MESSAGE) {
        // Reply to private message
        replyId = await this.replyToPrivateMessage(originalMessage.platformId, replyContent);
      } else {
        // Reply to comment or mention
        replyId = await this.replyToComment(originalMessage.platformId, replyContent);
      }

      if (replyId) {
        // Update message status to replied
        await this.socialInboxService.updateMessageStatus(messageId, MessageStatus.REPLIED);
        
        logger.info('Successfully replied to Reddit message from inbox', {
          messageId,
          replyId,
          type: originalMessage.type
        });

        return replyId;
      }

      throw new Error('Failed to get reply ID');
    } catch (error) {
      logger.error('Error replying to Reddit message from inbox', { error, messageId });
      throw error;
    }
  }

  /**
   * Start background sync for Reddit interactions
   */
  async startBackgroundSync(
    accounts: Array<{
      userId: string;
      accountId: string;
      organizationId?: string;
      subreddits?: string[];
    }>,
    intervalMinutes: number = 15
  ): Promise<void> {
    logger.info('Starting Reddit background sync', {
      accountCount: accounts.length,
      intervalMinutes
    });

    // Set up periodic sync
    setInterval(async () => {
      for (const account of accounts) {
        try {
          // Sync post comments
          await this.syncPostCommentsToInbox(
            account.userId,
            account.accountId,
            account.organizationId
          );

          // Sync private messages
          await this.syncPrivateMessagesToInbox(
            account.userId,
            account.accountId,
            account.organizationId
          );

          // Sync mentions
          await this.syncMentionsToInbox(
            account.userId,
            account.accountId,
            account.organizationId
          );
        } catch (error) {
          logger.error('Error in Reddit background sync', {
            error,
            accountId: account.accountId
          });
        }
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Process Reddit webhook event and convert to InboxMessage
   */
  async processWebhookEvent(
    event: any,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<InboxMessage | null> {
    try {
      // Handle different Reddit webhook event types
      if (event.type === 'comment') {
        return await this.processCommentEvent(event.data, accountId, userId, organizationId);
      }
      
      if (event.type === 'private_message') {
        return await this.processMessageEvent(event.data, accountId, userId, organizationId);
      }

      if (event.type === 'mention') {
        return await this.processMentionEvent(event.data, accountId, userId, organizationId);
      }

      return null;
    } catch (error) {
      logger.error('Failed to process Reddit webhook event', { error, event });
      return null;
    }
  }

  // Private helper methods

  private async getRecentPosts(limit: number = 10): Promise<RedditPostData[]> {
    try {
      const response = await this.redditProvider.getPosts(limit);
      return response.map(post => ({
        id: post.id,
        name: `t3_${post.id}`,
        title: post.platformPostId || post.id,
        selftext: post.url || '',
        selftext_html: '',
        url: post.url || '',
        subreddit: '',
        subreddit_id: '',
        author: post.platformPostId || '',
        author_fullname: `t2_${post.platformPostId}`,
        created_utc: Math.floor((post.publishedTime?.getTime() || Date.now()) / 1000),
        edited: false,
        score: post.analytics?.likes || 0,
        upvote_ratio: 0.5,
        ups: post.analytics?.likes || 0,
        downs: 0,
        num_comments: post.analytics?.comments || 0,
        permalink: '',
        thumbnail: post.url || '',
        is_video: false,
        is_self: true,
        stickied: false,
        locked: false,
        archived: false,
        over_18: false,
        spoiler: false
      }));
    } catch (error) {
      logger.error('Error fetching recent Reddit posts', { error });
      return [];
    }
  }

  private async getPostComments(postId: string): Promise<RedditCommentData[]> {
    try {
      if (!this.redditProvider.isAuthenticated()) {
        throw new Error('Reddit provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://oauth.reddit.com/comments/${postId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'User-Agent': 'IriSync/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      const data = await response.json();
      const comments: RedditCommentData[] = [];

      // Extract comments from Reddit's nested structure
      if (data[1]?.data?.children) {
        this.extractCommentsRecursively(data[1].data.children, comments);
      }

      return comments;
    } catch (error) {
      logger.error('Error fetching Reddit post comments', { error, postId });
      return [];
    }
  }

  private async getPrivateMessages(): Promise<RedditMessageData[]> {
    try {
      if (!this.redditProvider.isAuthenticated()) {
        throw new Error('Reddit provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://oauth.reddit.com/message/inbox`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'User-Agent': 'IriSync/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.children?.map((child: any) => child.data) || [];
    } catch (error) {
      logger.error('Error fetching Reddit private messages', { error });
      return [];
    }
  }

  private async getMentions(): Promise<RedditCommentData[]> {
    try {
      if (!this.redditProvider.isAuthenticated()) {
        throw new Error('Reddit provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://oauth.reddit.com/message/mentions`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'User-Agent': 'IriSync/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.children?.map((child: any) => child.data) || [];
    } catch (error) {
      logger.error('Error fetching Reddit mentions', { error });
      return [];
    }
  }

  private async replyToComment(commentId: string, content: string): Promise<string> {
    try {
      if (!this.redditProvider.isAuthenticated()) {
        throw new Error('Reddit provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://oauth.reddit.com/api/comment`;
      
      const formData = new URLSearchParams({
        thing_id: `t1_${commentId}`,
        text: content,
        api_type: 'json'
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'User-Agent': 'IriSync/1.0',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      const data = await response.json();
      return data.json?.data?.things?.[0]?.data?.id || '';
    } catch (error) {
      logger.error('Error replying to Reddit comment', { error, commentId });
      throw error;
    }
  }

  private async replyToPrivateMessage(messageId: string, content: string): Promise<string> {
    try {
      if (!this.redditProvider.isAuthenticated()) {
        throw new Error('Reddit provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://oauth.reddit.com/api/comment`;
      
      const formData = new URLSearchParams({
        thing_id: `t4_${messageId}`,
        text: content,
        api_type: 'json'
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'User-Agent': 'IriSync/1.0',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      const data = await response.json();
      return data.json?.data?.things?.[0]?.data?.id || '';
    } catch (error) {
      logger.error('Error replying to Reddit private message', { error, messageId });
      throw error;
    }
  }

  private extractCommentsRecursively(children: any[], comments: RedditCommentData[], depth: number = 0): void {
    for (const child of children) {
      if (child.kind === 't1' && child.data) {
        const comment = { ...child.data, depth };
        comments.push(comment);
        
        // Process replies recursively
        if (comment.replies?.data?.children) {
          this.extractCommentsRecursively(comment.replies.data.children, comments, depth + 1);
        }
      }
    }
  }

  private async processCommentEvent(
    commentData: any,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<InboxMessage | null> {
    // Skip comments from the authenticated user
    if (commentData.author === accountId) {
      return null;
    }

    const message: InboxMessage = {
      id: `reddit_${commentData.id}`,
      platformType: PlatformType.REDDIT,
      platformId: commentData.id,
      accountId,
      userId,
      organizationId,
      type: commentData.parent_id ? MessageType.REPLY : MessageType.COMMENT,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.MEDIUM,
      sender: {
        id: commentData.author_fullname || commentData.author,
        name: commentData.author,
        username: commentData.author,
        profilePicture: `https://www.reddit.com/user/${commentData.author}/avatar.png`
      },
      content: commentData.body,
      contentId: commentData.link_id,
      platformPostId: commentData.link_id,
      parentId: commentData.parent_id,
      receivedAt: new Date(commentData.created_utc * 1000),
      sentAt: new Date(commentData.created_utc * 1000),
      sentiment: await this.analyzeSentiment(commentData.body)
    };

    return message;
  }

  private async processMessageEvent(
    messageData: any,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<InboxMessage | null> {
    // Skip messages from the authenticated user
    if (messageData.author === accountId) {
      return null;
    }

    const message: InboxMessage = {
      id: `reddit_msg_${messageData.id}`,
      platformType: PlatformType.REDDIT,
      platformId: messageData.id,
      accountId,
      userId,
      organizationId,
      type: MessageType.DIRECT_MESSAGE,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.HIGH,
      sender: {
        id: messageData.author,
        name: messageData.author,
        username: messageData.author,
        profilePicture: `https://www.reddit.com/user/${messageData.author}/avatar.png`
      },
      content: messageData.body,
      contentId: messageData.id,
      platformPostId: messageData.id,
      receivedAt: new Date(messageData.created_utc * 1000),
      sentAt: new Date(messageData.created_utc * 1000),
      sentiment: await this.analyzeSentiment(messageData.body)
    };

    return message;
  }

  private async processMentionEvent(
    mentionData: any,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<InboxMessage | null> {
    // Skip mentions from the authenticated user
    if (mentionData.author === accountId) {
      return null;
    }

    const message: InboxMessage = {
      id: `reddit_mention_${mentionData.id}`,
      platformType: PlatformType.REDDIT,
      platformId: mentionData.id,
      accountId,
      userId,
      organizationId,
      type: MessageType.MENTION,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.MEDIUM,
      sender: {
        id: mentionData.author_fullname || mentionData.author,
        name: mentionData.author,
        username: mentionData.author,
        profilePicture: `https://www.reddit.com/user/${mentionData.author}/avatar.png`
      },
      content: mentionData.body,
      contentId: mentionData.link_id,
      platformPostId: mentionData.link_id,
      parentId: mentionData.parent_id,
      receivedAt: new Date(mentionData.created_utc * 1000),
      sentAt: new Date(mentionData.created_utc * 1000),
      sentiment: await this.analyzeSentiment(mentionData.body)
    };

    return message;
  }

  private calculatePriority(comment: RedditCommentData): MessagePriority {
    // High priority for highly upvoted comments or distinguished users
    if (comment.score > 50 || comment.distinguished) {
      return MessagePriority.HIGH;
    }
    
    // Medium priority for moderately upvoted comments
    if (comment.score > 5) {
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
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'love', 'amazing', 'thanks', 'helpful', '👍', '😊', '🔥'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'stupid', 'downvote', '👎', '😡'];
    
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
        where('platformType', '==', PlatformType.REDDIT)
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

  private async getProviderAuthState(): Promise<any> {
    try {
      return await (this.redditProvider as any).getAuthState?.() || null;
    } catch (error) {
      logger.error('Error getting Reddit provider auth state', { error });
      return null;
    }
  }
}

// Create singleton instance factory
export const createRedditSocialInboxAdapter = () => {
  const { RedditProvider } = require('../platforms/providers/RedditProvider');
  return new RedditSocialInboxAdapter(
    new RedditProvider({
      clientId: process.env.REDDIT_CLIENT_ID || '',
      clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
      redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=reddit' || ''
    })
  );
};

const redditSocialInboxAdapter = createRedditSocialInboxAdapter();

export default redditSocialInboxAdapter; 
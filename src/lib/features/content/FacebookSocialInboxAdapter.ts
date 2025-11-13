import { FacebookProvider } from '../platforms/providers/FacebookProvider';
import { InstagramProvider } from '../platforms/providers/InstagramProvider';
import { SocialInboxService, InboxMessage, MessageType, MessageStatus, MessagePriority } from './SocialInboxService';
import { PlatformType } from '../platforms/PlatformProvider';
import { logger } from '../../core/logging/logger';
import { v4 as uuidv4 } from 'uuid';
import { tieredModelRouter, TaskType } from '../ai/models/tiered-model-router';
import { User } from '../../core/models/User';

/**
 * Facebook & Instagram Social Inbox Adapter
 * Integrates Facebook and Instagram interactions with the unified social inbox
 */
export class FacebookSocialInboxAdapter {
  private facebookProvider?: FacebookProvider;
  private instagramProvider?: InstagramProvider;
  private socialInboxService: SocialInboxService;
  
  constructor(facebookProvider?: FacebookProvider, instagramProvider?: InstagramProvider) {
    this.facebookProvider = facebookProvider;
    this.instagramProvider = instagramProvider;
    this.socialInboxService = new SocialInboxService();
  }

  /**
   * Sync Facebook page post comments to unified inbox
   */
  async syncFacebookCommentsToInbox(
    pageId: string,
    userId: string, 
    accountId: string, 
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      if (!this.facebookProvider?.isAuthenticated()) {
        throw new Error('Facebook provider not authenticated');
      }

      // Get recent posts for the page first
      const posts = await this.getPagePosts(pageId);
      const inboxMessages: InboxMessage[] = [];

      for (const post of posts) {
        // Get comments for each post
        const comments = await this.getPostComments(post.id);
        
        for (const comment of comments) {
          // Skip comments from the page itself
          if (comment.from?.id === pageId) {
            continue;
          }

          // Check if this comment already exists in inbox
          const existingMessage = await this.findExistingMessage(comment.id, 'facebook_comment');
          if (existingMessage) {
            continue;
          }

          // Convert Facebook comment to InboxMessage
          const inboxMessage: Omit<InboxMessage, 'id'> = {
            platformType: PlatformType.FACEBOOK,
            platformId: comment.id,
            accountId,
            userId,
            organizationId,
            type: comment.parent ? MessageType.REPLY : MessageType.COMMENT,
            status: MessageStatus.UNREAD,
            priority: this.calculatePriority(comment),
            sender: {
              id: comment.from?.id || '',
              name: comment.from?.name || 'Facebook User',
              username: comment.from?.name || '',
              profilePicture: `https://graph.facebook.com/${comment.from?.id}/picture`
            },
            content: comment.message || '',
            contentId: post.id,
            platformPostId: post.id,
            parentId: comment.parent?.id,
            receivedAt: new Date(comment.created_time),
            sentAt: new Date(comment.created_time),
            sentiment: await this.analyzeSentiment(comment.message || ''),
            attachments: this.extractCommentAttachments(comment)
          };

          // Add to inbox
          const inboxMsg = await this.socialInboxService.addMessage(inboxMessage);
          inboxMessages.push(inboxMsg);
        }
      }

      logger.info('Facebook comments synced to inbox', {
        pageId,
        postCount: posts.length,
        newComments: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing Facebook comments to inbox', { error, pageId });
      return [];
    }
  }

  /**
   * Sync Facebook page messages to unified inbox
   */
  async syncFacebookMessagesToInbox(
    pageId: string,
    userId: string, 
    accountId: string, 
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      if (!this.facebookProvider?.isAuthenticated()) {
        throw new Error('Facebook provider not authenticated');
      }

      // Get page conversations
      const conversations = await this.getPageConversations(pageId);
      const inboxMessages: InboxMessage[] = [];

      for (const conversation of conversations) {
        // Get messages in conversation
        const messages = await this.getConversationMessages(conversation.id);
        
        for (const message of messages) {
          // Skip messages sent by the page
          if (message.from.id === pageId) {
            continue;
          }

          // Check if this message already exists in inbox
          const existingMessage = await this.findExistingMessage(message.id, 'facebook_message');
          if (existingMessage) {
            continue;
          }

          // Convert Facebook message to InboxMessage
          const inboxMessage: Omit<InboxMessage, 'id'> = {
            platformType: PlatformType.FACEBOOK,
            platformId: message.id,
            accountId,
            userId,
            organizationId,
            type: MessageType.DIRECT_MESSAGE,
            status: MessageStatus.UNREAD,
            priority: MessagePriority.HIGH, // Messages are typically higher priority
            sender: {
              id: message.from.id,
              name: message.from.name,
              username: message.from.name,
              profilePicture: `https://graph.facebook.com/${message.from.id}/picture?type=large`
            },
            content: message.message,
            contentId: conversation.id,
            platformPostId: message.id,
            receivedAt: new Date(message.created_time),
            sentAt: new Date(message.created_time),
            sentiment: await this.analyzeSentiment(message.message),
            attachments: this.extractMessageAttachments(message)
          };

          // Add to inbox
          const inboxMsg = await this.socialInboxService.addMessage(inboxMessage);
          inboxMessages.push(inboxMsg);
        }
      }

      logger.info('Facebook messages synced to inbox', {
        pageId,
        conversationCount: conversations.length,
        newMessages: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing Facebook messages to inbox', { error, pageId });
      return [];
    }
  }

  /**
   * Sync Instagram comments to unified inbox
   */
  async syncInstagramCommentsToInbox(
    userId: string, 
    accountId: string, 
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      if (!this.instagramProvider?.isAuthenticated()) {
        throw new Error('Instagram provider not authenticated');
      }

      // Get recent Instagram posts
      const posts = await this.instagramProvider.getPosts(10);
      const inboxMessages: InboxMessage[] = [];

      for (const post of posts) {
        // Get comments for each post
        const comments = await this.getInstagramPostComments(post.id);
        
        for (const comment of comments) {
          // Check if this comment already exists in inbox
          const existingMessage = await this.findExistingMessage(comment.id, 'instagram_comment');
          if (existingMessage) {
            continue;
          }

          // Convert Instagram comment to InboxMessage
          const inboxMessage: Omit<InboxMessage, 'id'> = {
            platformType: PlatformType.INSTAGRAM,
            platformId: comment.id,
            accountId,
            userId,
            organizationId,
            type: MessageType.COMMENT,
            status: MessageStatus.UNREAD,
            priority: this.calculatePriority(comment),
            sender: {
              id: comment.from.id,
              name: comment.from.username,
              username: comment.from.username,
              profilePicture: comment.from.profile_picture_url
            },
            content: comment.text,
            contentId: post.id,
            platformPostId: post.id,
            parentId: comment.parent_id,
            receivedAt: new Date(comment.timestamp),
            sentAt: new Date(comment.timestamp),
            sentiment: await this.analyzeSentiment(comment.text),
            attachments: this.extractInstagramCommentAttachments(comment)
          };

          // Add to inbox
          const message = await this.socialInboxService.addMessage(inboxMessage);
          inboxMessages.push(message);
        }
      }

      logger.info('Instagram comments synced to inbox', {
        postCount: posts.length,
        newMessages: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing Instagram comments to inbox', { error });
      return [];
    }
  }

  /**
   * Sync Instagram direct messages to unified inbox
   */
  async syncInstagramMessagesToInbox(
    userId: string, 
    accountId: string, 
    organizationId?: string
  ): Promise<InboxMessage[]> {
    try {
      if (!this.instagramProvider?.isAuthenticated()) {
        throw new Error('Instagram provider not authenticated');
      }

      // Get Instagram conversations
      const conversations = await this.getInstagramConversations();
      const inboxMessages: InboxMessage[] = [];

      for (const conversation of conversations) {
        // Get messages in conversation
        const messages = await this.getInstagramConversationMessages(conversation.id);
        
        for (const message of messages) {
          // Skip messages sent by the account
          if (message.from.id === accountId) {
            continue;
          }

          // Check if this message already exists in inbox
          const existingMessage = await this.findExistingMessage(message.id, 'instagram_message');
          if (existingMessage) {
            continue;
          }

          // Convert Instagram message to InboxMessage
          const inboxMessage: Omit<InboxMessage, 'id'> = {
            platformType: PlatformType.INSTAGRAM,
            platformId: message.id,
            accountId,
            userId,
            organizationId,
            type: MessageType.DIRECT_MESSAGE,
            status: MessageStatus.UNREAD,
            priority: MessagePriority.HIGH,
            sender: {
              id: message.from.id,
              name: message.from.username,
              username: message.from.username,
              profilePicture: message.from.profile_picture_url
            },
            content: message.text,
            contentId: conversation.id,
            platformPostId: message.id,
            receivedAt: new Date(message.timestamp),
            sentAt: new Date(message.timestamp),
            sentiment: await this.analyzeSentiment(message.text),
            attachments: this.extractInstagramMessageAttachments(message)
          };

          // Add to inbox
          const inboxMsg = await this.socialInboxService.addMessage(inboxMessage);
          inboxMessages.push(inboxMsg);
        }
      }

      logger.info('Instagram messages synced to inbox', {
        conversationCount: conversations.length,
        newMessages: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing Instagram messages to inbox', { error });
      return [];
    }
  }

  /**
   * Reply to a Facebook comment from the social inbox
   */
  async replyToFacebookComment(
    messageId: string, 
    replyContent: string, 
    userId: string
  ): Promise<string> {
    try {
      const originalMessage = await this.socialInboxService.getMessage(messageId);
      if (!originalMessage || originalMessage.platformType !== PlatformType.FACEBOOK) {
        throw new Error('Original message not found or not from Facebook');
      }

      if (!this.facebookProvider?.isAuthenticated()) {
        throw new Error('Facebook provider not authenticated');
      }

      // Reply to the comment
      const replyId = await this.createFacebookCommentReply(
        originalMessage.platformId,
        replyContent
      );

      if (replyId) {
        // Update message status to replied
        await this.socialInboxService.updateMessageStatus(messageId, MessageStatus.REPLIED);
        
        logger.info('Successfully replied to Facebook comment from inbox', {
          messageId,
          replyId
        });

        return replyId;
      }

      throw new Error('Failed to get reply ID');
    } catch (error) {
      logger.error('Error replying to Facebook comment from inbox', { error, messageId });
      throw error;
    }
  }

  /**
   * Reply to an Instagram comment from the social inbox
   */
  async replyToInstagramComment(
    messageId: string, 
    replyContent: string, 
    userId: string
  ): Promise<string> {
    try {
      const originalMessage = await this.socialInboxService.getMessage(messageId);
      if (!originalMessage || originalMessage.platformType !== PlatformType.INSTAGRAM) {
        throw new Error('Original message not found or not from Instagram');
      }

      if (!this.instagramProvider?.isAuthenticated()) {
        throw new Error('Instagram provider not authenticated');
      }

      // Reply to the comment
      const replyId = await this.createInstagramCommentReply(
        originalMessage.platformId,
        replyContent
      );

      if (replyId) {
        // Update message status to replied
        await this.socialInboxService.updateMessageStatus(messageId, MessageStatus.REPLIED);
        
        logger.info('Successfully replied to Instagram comment from inbox', {
          messageId,
          replyId
        });

        return replyId;
      }

      throw new Error('Failed to get reply ID');
    } catch (error) {
      logger.error('Error replying to Instagram comment from inbox', { error, messageId });
      throw error;
    }
  }

  // Helper methods for Facebook API calls
  private async getPagePosts(pageId: string): Promise<any[]> {
    try {
      if (!this.facebookProvider?.isAuthenticated()) {
        throw new Error('Facebook provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://graph.facebook.com/v18.0/${pageId}/posts`;
      const params = new URLSearchParams({
        access_token: authState.accessToken,
        fields: 'id,message,created_time,story,full_picture,permalink_url',
        limit: '25'
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.error('Error fetching Facebook page posts', { error, pageId });
      return [];
    }
  }

  private async getPostComments(postId: string): Promise<any[]> {
    try {
      if (!this.facebookProvider?.isAuthenticated()) {
        throw new Error('Facebook provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://graph.facebook.com/v18.0/${postId}/comments`;
      const params = new URLSearchParams({
        access_token: authState.accessToken,
        fields: 'id,message,created_time,from,parent,attachment,like_count,comment_count',
        limit: '50'
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.error('Error fetching Facebook post comments', { error, postId });
      return [];
    }
  }

  private async getPageConversations(pageId: string): Promise<any[]> {
    try {
      if (!this.facebookProvider?.isAuthenticated()) {
        throw new Error('Facebook provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://graph.facebook.com/v18.0/${pageId}/conversations`;
      const params = new URLSearchParams({
        access_token: authState.accessToken,
        fields: 'id,updated_time,message_count,unread_count,participants',
        limit: '25'
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.error('Error fetching Facebook page conversations', { error, pageId });
      return [];
    }
  }

  private async getConversationMessages(conversationId: string): Promise<any[]> {
    try {
      if (!this.facebookProvider?.isAuthenticated()) {
        throw new Error('Facebook provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://graph.facebook.com/v18.0/${conversationId}/messages`;
      const params = new URLSearchParams({
        access_token: authState.accessToken,
        fields: 'id,message,created_time,from,to,attachments',
        limit: '25'
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.error('Error fetching Facebook conversation messages', { error, conversationId });
      return [];
    }
  }

  private async createFacebookCommentReply(commentId: string, content: string): Promise<string> {
    try {
      if (!this.facebookProvider?.isAuthenticated()) {
        throw new Error('Facebook provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://graph.facebook.com/v18.0/${commentId}/comments`;
      const formData = new URLSearchParams({
        access_token: authState.accessToken,
        message: content
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status}`);
      }

      const data = await response.json();
      return data.id || `fb_reply_${Date.now()}`;
    } catch (error) {
      logger.error('Error creating Facebook comment reply', { error, commentId });
      throw error;
    }
  }

  // Helper methods for Instagram API calls
  private async getInstagramPostComments(postId: string): Promise<any[]> {
    try {
      if (!this.instagramProvider?.isAuthenticated()) {
        throw new Error('Instagram provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://graph.facebook.com/v18.0/${postId}/comments`;
      const params = new URLSearchParams({
        access_token: authState.accessToken,
        fields: 'id,text,timestamp,from,replies,like_count',
        limit: '50'
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.error('Error fetching Instagram post comments', { error, postId });
      return [];
    }
  }

  private async getInstagramConversations(): Promise<any[]> {
    try {
      if (!this.instagramProvider?.isAuthenticated()) {
        throw new Error('Instagram provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      // Get Instagram Business Account ID first
      const accountResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${authState.accessToken}`);
      const accountData = await accountResponse.json();
      
      if (!accountData.data || accountData.data.length === 0) {
        return [];
      }

      const pageId = accountData.data[0].id;
      const url = `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${authState.accessToken}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.instagram_business_account) {
        return [];
      }

      // Get conversations for Instagram Business Account
      const conversationsUrl = `https://graph.facebook.com/v18.0/${data.instagram_business_account.id}/conversations`;
      const conversationsParams = new URLSearchParams({
        access_token: authState.accessToken,
        fields: 'id,updated_time,message_count,unread_count,participants',
        limit: '25'
      });

      const conversationsResponse = await fetch(`${conversationsUrl}?${conversationsParams}`);
      const conversationsData = await conversationsResponse.json();
      
      return conversationsData.data || [];
    } catch (error) {
      logger.error('Error fetching Instagram conversations', { error });
      return [];
    }
  }

  private async getInstagramConversationMessages(conversationId: string): Promise<any[]> {
    try {
      if (!this.instagramProvider?.isAuthenticated()) {
        throw new Error('Instagram provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://graph.facebook.com/v18.0/${conversationId}/messages`;
      const params = new URLSearchParams({
        access_token: authState.accessToken,
        fields: 'id,message,created_time,from,to,attachments',
        limit: '25'
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.error('Error fetching Instagram conversation messages', { error, conversationId });
      return [];
    }
  }

  private async createInstagramCommentReply(commentId: string, content: string): Promise<string> {
    try {
      if (!this.instagramProvider?.isAuthenticated()) {
        throw new Error('Instagram provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://graph.facebook.com/v18.0/${commentId}/replies`;
      const formData = new URLSearchParams({
        access_token: authState.accessToken,
        message: content
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      const data = await response.json();
      return data.id || `ig_reply_${Date.now()}`;
    } catch (error) {
      logger.error('Error creating Instagram comment reply', { error, commentId });
      throw error;
    }
  }

  private async getProviderAuthState(): Promise<any> {
    try {
      // Try Facebook provider first, then Instagram
      if (this.facebookProvider?.isAuthenticated()) {
        return await (this.facebookProvider as any).getAuthState?.() || null;
      }
      if (this.instagramProvider?.isAuthenticated()) {
        return await (this.instagramProvider as any).getAuthState?.() || null;
      }
      return null;
    } catch (error) {
      logger.error('Error getting provider auth state', { error });
      return null;
    }
  }

  // Shared helper methods
  private async findExistingMessage(platformId: string, type: string): Promise<InboxMessage | null> {
    try {
      // Query Firestore for existing message with this platform ID
      const { firestore } = await import('../../core/firebase/client');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const platformType = type.includes('instagram') ? PlatformType.INSTAGRAM : PlatformType.FACEBOOK;
      
      const messagesQuery = query(
        collection(firestore, 'inboxMessages'),
        where('platformId', '==', platformId),
        where('platformType', '==', platformType)
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

  private calculatePriority(item: any): MessagePriority {
    // Calculate priority based on various factors
    if (item.like_count > 10 || item.reply_count > 5) {
      return MessagePriority.HIGH;
    }
    return MessagePriority.MEDIUM;
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
    const positiveWords = ['good', 'great', 'awesome', 'love', 'excellent', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'worst'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractCommentAttachments(comment: any): any[] {
    const attachments: any[] = [];
    
    if (comment.attachment) {
      attachments.push({
        type: comment.attachment.type,
        url: comment.attachment.url,
        title: comment.attachment.title,
        description: comment.attachment.description
      });
    }
    
    return attachments;
  }

  private extractMessageAttachments(message: any): any[] {
    const attachments: any[] = [];
    
    if (message.attachments) {
      for (const attachment of message.attachments.data) {
        attachments.push({
          type: attachment.type,
          url: attachment.payload?.url,
          title: attachment.title
        });
      }
    }
    
    return attachments;
  }

  private extractInstagramCommentAttachments(comment: any): any[] {
    // Instagram comments typically don't have attachments
    return [];
  }

  private extractInstagramMessageAttachments(message: any): any[] {
    const attachments: any[] = [];
    
    if (message.attachments) {
      for (const attachment of message.attachments.data) {
        attachments.push({
          type: attachment.type,
          url: attachment.payload?.url
        });
      }
    }
    
    return attachments;
  }
} 
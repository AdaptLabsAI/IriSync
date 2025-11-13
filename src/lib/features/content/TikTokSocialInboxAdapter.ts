import { TikTokProvider } from '../platforms/providers/TikTokProvider';
import { SocialInboxService, InboxMessage, MessageType, MessageStatus, MessagePriority } from './SocialInboxService';
import { PlatformType } from '../platforms/PlatformProvider';
import { logger } from '../../core/logging/logger';
import { tieredModelRouter, TaskType, SubscriptionTier } from '../ai/models/tiered-model-router';
import { User } from '../../core/models/User';
import { v4 as uuidv4 } from 'uuid';

export interface TikTokReplyOptions {
  video_id?: string;
  parent_comment_id?: string;
  reply_to_user_id?: string;
}

export interface TikTokCommentData {
  comment_id: string;
  video_id: string;
  parent_comment_id?: string;
  user: {
    open_id: string;
    union_id: string;
    avatar_url: string;
    display_name: string;
    username: string;
    follower_count: number;
    following_count: number;
    likes_count: number;
    video_count: number;
  };
  text: string;
  like_count: number;
  reply_count: number;
  create_time: number;
  status: string;
}

export interface TikTokVideoData {
  video_id: string;
  title: string;
  cover_image_url: string;
  embed_html: string;
  embed_link: string;
  create_time: number;
  share_url: string;
  video_description: string;
  duration: number;
  height: number;
  width: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
}

/**
 * TikTok Social Inbox Adapter
 * Integrates TikTok comments and interactions with the unified social inbox
 */
export class TikTokSocialInboxAdapter {
  private tikTokProvider: TikTokProvider;
  private socialInboxService: SocialInboxService;
  
  constructor(tikTokProvider: TikTokProvider) {
    this.tikTokProvider = tikTokProvider;
    this.socialInboxService = new SocialInboxService();
  }

  /**
   * Sync TikTok comments to unified inbox
   */
  async syncCommentsToInbox(
    userId: string, 
    accountId: string, 
    organizationId?: string,
    user?: User
  ): Promise<InboxMessage[]> {
    try {
      if (!this.tikTokProvider.isAuthenticated()) {
        throw new Error('TikTok provider not authenticated');
      }

      // Get recent videos for the account
      const videos = await this.getRecentVideos(10);
      const inboxMessages: InboxMessage[] = [];

      for (const video of videos) {
        // Get comments for each video
        const comments = await this.getVideoComments(video.video_id);
        
        for (const comment of comments) {
          // Check if this comment already exists in inbox
          const existingMessage = await this.findExistingMessage(comment.comment_id, 'tiktok_comment');
          if (existingMessage) {
            continue;
          }

          // Convert TikTok comment to InboxMessage
          const inboxMessage: Omit<InboxMessage, 'id'> = {
            platformType: PlatformType.TIKTOK,
            platformId: comment.comment_id,
            accountId,
            userId,
            organizationId,
            type: comment.parent_comment_id ? MessageType.REPLY : MessageType.COMMENT,
            status: MessageStatus.UNREAD,
            priority: this.calculatePriority(comment),
            sender: {
              id: comment.user.open_id,
              name: comment.user.display_name,
              username: comment.user.username,
              profilePicture: comment.user.avatar_url,
              followerCount: comment.user.follower_count
            },
            content: comment.text,
            contentId: video.video_id,
            platformPostId: video.video_id,
            parentId: comment.parent_comment_id,
            receivedAt: new Date(comment.create_time * 1000),
            sentAt: new Date(comment.create_time * 1000),
            sentiment: await this.analyzeSentiment(comment.text, user),
            attachments: []
          };

          // Add to inbox
          const inboxMsg = await this.socialInboxService.addMessage(inboxMessage);
          inboxMessages.push(inboxMsg);
        }
      }

      logger.info('TikTok comments synced to inbox', {
        videoCount: videos.length,
        newComments: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing TikTok comments to inbox', { error });
      return [];
    }
  }

  /**
   * Reply to a TikTok comment from the social inbox
   */
  async replyToComment(
    messageId: string, 
    replyContent: string, 
    userId: string
  ): Promise<string> {
    try {
      const originalMessage = await this.socialInboxService.getMessage(messageId);
      if (!originalMessage || originalMessage.platformType !== PlatformType.TIKTOK) {
        throw new Error('Original message not found or not from TikTok');
      }

      if (!this.tikTokProvider.isAuthenticated()) {
        throw new Error('TikTok provider not authenticated');
      }

      // Reply to the comment using TikTok API
      const replyId = await this.createCommentReply(
        originalMessage.contentId || '',
        originalMessage.platformId,
        replyContent
      );

      if (replyId) {
        // Update message status to replied
        await this.socialInboxService.updateMessageStatus(messageId, MessageStatus.REPLIED);
        
        logger.info('Successfully replied to TikTok comment from inbox', {
          messageId,
          replyId
        });

        return replyId;
      }

      throw new Error('Failed to get reply ID');
    } catch (error) {
      logger.error('Error replying to TikTok comment from inbox', { error, messageId });
      throw error;
    }
  }

  /**
   * Start background sync for TikTok comments
   */
  async startBackgroundSync(
    accounts: Array<{
      userId: string;
      accountId: string;
      organizationId?: string;
      user?: User;
      recentVideoIds?: string[];
    }>,
    intervalMinutes: number = 15
  ): Promise<void> {
    logger.info('Starting TikTok background sync', {
      accountCount: accounts.length,
      intervalMinutes
    });

    // Set up periodic sync
    setInterval(async () => {
      for (const account of accounts) {
        try {
          await this.syncCommentsToInbox(
            account.userId,
            account.accountId,
            account.organizationId,
            account.user
          );
        } catch (error) {
          logger.error('Error in TikTok background sync', {
            error,
            accountId: account.accountId
          });
        }
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Process TikTok webhook event and convert to InboxMessage
   */
  async processWebhookEvent(
    event: any,
    accountId: string,
    userId: string,
    organizationId?: string,
    user?: User
  ): Promise<InboxMessage | null> {
    try {
      // Handle different TikTok webhook event types
      if (event.type === 'comment.created') {
        return await this.processCommentEvent(event.data, accountId, userId, organizationId, user);
      }
      
      if (event.type === 'video.liked') {
        return await this.processLikeEvent(event.data, accountId, userId, organizationId);
      }

      if (event.type === 'user.followed') {
        return await this.processFollowEvent(event.data, accountId, userId, organizationId);
      }

      return null;
    } catch (error) {
      logger.error('Failed to process TikTok webhook event', { error, event });
      return null;
    }
  }

  // Private helper methods

  private async getRecentVideos(limit: number = 10): Promise<TikTokVideoData[]> {
    try {
      const response = await this.tikTokProvider.getPosts(limit);
      return response.map(post => ({
        video_id: post.id,
        title: (post as any).content || post.id,
        cover_image_url: (post as any).attachments?.[0]?.thumbnailUrl || '',
        embed_html: '',
        embed_link: '',
        create_time: Math.floor((post as any).createdAt?.getTime() || Date.now() / 1000),
        share_url: '',
        video_description: (post as any).content || '',
        duration: 0,
        height: 0,
        width: 0,
        like_count: (post as any).metrics?.likes || 0,
        comment_count: (post as any).metrics?.comments || 0,
        share_count: (post as any).metrics?.shares || 0,
        view_count: (post as any).metrics?.views || 0
      }));
    } catch (error) {
      logger.error('Error fetching recent TikTok videos', { error });
      return [];
    }
  }

  private async getVideoComments(videoId: string, cursor?: string): Promise<TikTokCommentData[]> {
    try {
      if (!this.tikTokProvider.isAuthenticated()) {
        throw new Error('TikTok provider not authenticated');
      }

      // Use TikTok API to get comments
      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://open.tiktokapis.com/v1/video/comment/list/`;
      const params = new URLSearchParams({
        video_id: videoId,
        max_count: '50'
      });

      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`TikTok API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.comments || [];
    } catch (error) {
      logger.error('Error fetching TikTok video comments', { error, videoId });
      return [];
    }
  }

  private async createCommentReply(
    videoId: string,
    parentCommentId: string,
    content: string
  ): Promise<string | null> {
    try {
      if (!this.tikTokProvider.isAuthenticated()) {
        throw new Error('TikTok provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://open.tiktokapis.com/v1/video/comment/reply/`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          video_id: videoId,
          parent_comment_id: parentCommentId,
          text: content
        })
      });

      if (!response.ok) {
        throw new Error(`TikTok API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.comment_id || null;
    } catch (error) {
      logger.error('Error creating TikTok comment reply', { error, videoId, parentCommentId });
      return null;
    }
  }

  private async getProviderAuthState(): Promise<any> {
    // Use the provider's public method to get auth state
    try {
      return await (this.tikTokProvider as any).getAuthState?.() || null;
    } catch (error) {
      logger.error('Error getting TikTok provider auth state', { error });
      return null;
    }
  }

  private async processCommentEvent(
    commentData: any,
    accountId: string,
    userId: string,
    organizationId?: string,
    user?: User
  ): Promise<InboxMessage | null> {
    // Skip comments from the authenticated user
    if (commentData.user?.open_id === accountId) {
      return null;
    }

    const message: InboxMessage = {
      id: `tiktok_${commentData.comment_id}`,
      platformType: PlatformType.TIKTOK,
      platformId: commentData.comment_id,
      accountId,
      userId,
      organizationId,
      type: commentData.parent_comment_id ? MessageType.REPLY : MessageType.COMMENT,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.MEDIUM,
      sender: {
        id: commentData.user.open_id,
        name: commentData.user.display_name,
        username: commentData.user.username,
        profilePicture: commentData.user.avatar_url,
        followerCount: commentData.user.follower_count
      },
      content: commentData.text,
      contentId: commentData.video_id,
      platformPostId: commentData.video_id,
      parentId: commentData.parent_comment_id,
      receivedAt: new Date(commentData.create_time * 1000),
      sentAt: new Date(commentData.create_time * 1000),
      sentiment: await this.analyzeSentiment(commentData.text, user)
    };

    return message;
  }

  private async processLikeEvent(
    likeData: any,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<InboxMessage | null> {
    const message: InboxMessage = {
      id: `tiktok_like_${likeData.user.open_id}_${likeData.video_id}_${Date.now()}`,
      platformType: PlatformType.TIKTOK,
      platformId: `like_${likeData.video_id}`,
      accountId,
      userId,
      organizationId,
      type: MessageType.MENTION,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.LOW,
      sender: {
        id: likeData.user.open_id,
        name: likeData.user.display_name,
        username: likeData.user.username,
        profilePicture: likeData.user.avatar_url,
        followerCount: likeData.user.follower_count
      },
      content: `Liked your video`,
      contentId: likeData.video_id,
      platformPostId: likeData.video_id,
      receivedAt: new Date(),
      sentAt: new Date(),
      sentiment: 'positive'
    };

    return message;
  }

  private async processFollowEvent(
    followData: any,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<InboxMessage | null> {
    const message: InboxMessage = {
      id: `tiktok_follow_${followData.user.open_id}_${Date.now()}`,
      platformType: PlatformType.TIKTOK,
      platformId: `follow_${followData.user.open_id}`,
      accountId,
      userId,
      organizationId,
      type: MessageType.MENTION,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.LOW,
      sender: {
        id: followData.user.open_id,
        name: followData.user.display_name,
        username: followData.user.username,
        profilePicture: followData.user.avatar_url,
        followerCount: followData.user.follower_count
      },
      content: `Started following you`,
      receivedAt: new Date(),
      sentAt: new Date(),
      sentiment: 'positive'
    };

    return message;
  }

  private calculatePriority(comment: TikTokCommentData): MessagePriority {
    // High priority for users with large followings or high engagement
    if (comment.user.follower_count > 100000 || comment.like_count > 100) {
      return MessagePriority.HIGH;
    }
    
    // Medium priority for verified users or moderate engagement
    if (comment.user.follower_count > 10000 || comment.like_count > 10) {
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
    const positiveWords = ['love', 'amazing', 'great', 'awesome', 'fantastic', 'excellent', '❤️', '😍', '🔥', '👏'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'worst', 'horrible', '😡', '👎', '😢'];
    
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
        where('platformType', '==', PlatformType.TIKTOK)
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
}

// Create singleton instance factory
export const createTikTokSocialInboxAdapter = () => {
  const { TikTokProvider } = require('../platforms/providers/TikTokProvider');
  return new TikTokSocialInboxAdapter(
    new TikTokProvider({
      clientId: process.env.TIKTOK_CLIENT_KEY || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
      redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=tiktok' || ''
    })
  );
};

const tikTokSocialInboxAdapter = createTikTokSocialInboxAdapter();

export default tikTokSocialInboxAdapter; 
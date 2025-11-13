import { YouTubeProvider } from '../platforms/providers/YouTubeProvider';
import { SocialInboxService, InboxMessage, MessageType, MessageStatus, MessagePriority } from './SocialInboxService';
import { PlatformType } from '../platforms/PlatformProvider';
import { logger } from '../../core/logging/logger';
import { tieredModelRouter, TaskType } from '../ai/models/tiered-model-router';
import { User } from '../../core/models/User';
import { v4 as uuidv4 } from 'uuid';

export interface YouTubeReplyOptions {
  video_id?: string;
  parent_comment_id?: string;
  channel_id?: string;
}

export interface YouTubeCommentData {
  comment_id: string;
  video_id: string;
  parent_comment_id?: string;
  author_display_name: string;
  author_channel_id: string;
  author_profile_image_url: string;
  text_display: string;
  text_original: string;
  like_count: number;
  published_at: string;
  updated_at: string;
}

export interface YouTubeVideoData {
  video_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published_at: string;
  duration: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  channel_id: string;
  channel_title: string;
}

export interface YouTubeCommunityPostData {
  id: string;
  author: {
    channel_id: string;
    display_name: string;
    profile_image_url: string;
  };
  content: string;
  published_at: string;
  like_count: number;
  comment_count: number;
  images?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
}

export interface YouTubeCommunityPostCommentData {
  id: string;
  post_id: string;
  parent_id?: string;
  author: {
    channel_id: string;
    display_name: string;
    profile_image_url: string;
    subscriber_count?: number;
  };
  text_display: string;
  text_original: string;
  like_count: number;
  published_at: string;
  updated_at: string;
}

/**
 * YouTube Social Inbox Adapter
 * Integrates YouTube comments, community posts, and interactions with the unified social inbox
 */
export class YouTubeSocialInboxAdapter {
  private youTubeProvider: YouTubeProvider;
  private socialInboxService: SocialInboxService;
  
  constructor(youTubeProvider: YouTubeProvider) {
    this.youTubeProvider = youTubeProvider;
    this.socialInboxService = new SocialInboxService();
  }

  /**
   * Sync YouTube comments to unified inbox
   */
  async syncCommentsToInbox(
    userId: string, 
    accountId: string, 
    organizationId?: string,
    user?: User
  ): Promise<InboxMessage[]> {
    try {
      if (!this.youTubeProvider.isAuthenticated()) {
        throw new Error('YouTube provider not authenticated');
      }

      // Get recent videos for the channel
      const videos = await this.getRecentVideos(10);
      const inboxMessages: InboxMessage[] = [];

      for (const video of videos) {
        // Get comments for each video
        const comments = await this.getVideoComments(video.video_id);
        
        for (const comment of comments) {
          // Check if this comment already exists in inbox
          const existingMessage = await this.findExistingMessage(comment.comment_id, 'youtube_comment');
          if (existingMessage) {
            continue;
          }

          // Convert YouTube comment to InboxMessage
          const inboxMessage: Omit<InboxMessage, 'id'> = {
            platformType: PlatformType.YOUTUBE,
            platformId: comment.comment_id,
            accountId,
            userId,
            organizationId,
            type: comment.parent_comment_id ? MessageType.REPLY : MessageType.COMMENT,
            status: MessageStatus.UNREAD,
            priority: this.calculatePriority(comment),
            sender: {
              id: comment.author_channel_id,
              name: comment.author_display_name,
              username: comment.author_display_name,
              profilePicture: comment.author_profile_image_url,
              followerCount: 0 // YouTube API doesn't provide this in comments
            },
            content: comment.text_display,
            contentId: video.video_id,
            platformPostId: video.video_id,
            parentId: comment.parent_comment_id,
            receivedAt: new Date(comment.published_at),
            sentAt: new Date(comment.published_at),
            sentiment: await this.analyzeSentiment(comment.text_display, user),
            attachments: []
          };

          // Add to inbox
          const inboxMsg = await this.socialInboxService.addMessage(inboxMessage);
          inboxMessages.push(inboxMsg);
        }
      }

      logger.info('YouTube comments synced to inbox', {
        videoCount: videos.length,
        newComments: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing YouTube comments to inbox', { error });
      return [];
    }
  }

  /**
   * Sync YouTube community post comments to unified inbox
   */
  async syncCommunityCommentsToInbox(
    userId: string, 
    accountId: string, 
    organizationId?: string,
    user?: User
  ): Promise<InboxMessage[]> {
    try {
      if (!this.youTubeProvider.isAuthenticated()) {
        throw new Error('YouTube provider not authenticated');
      }

      // Get recent community posts
      const communityPosts = await this.getRecentCommunityPosts(10);
      const inboxMessages: InboxMessage[] = [];

      for (const post of communityPosts) {
        // Get comments for each community post
        const comments = await this.getCommunityPostComments(post.id);
        
        for (const comment of comments) {
          // Check if this comment already exists in inbox
          const existingMessage = await this.findExistingMessage(comment.id, 'youtube_community_comment');
          if (existingMessage) {
            continue;
          }

          // Convert community post comment to InboxMessage
          const inboxMessage: Omit<InboxMessage, 'id'> = {
            platformType: PlatformType.YOUTUBE,
            platformId: comment.id,
            accountId,
            userId,
            organizationId,
            type: MessageType.COMMENT,
            status: MessageStatus.UNREAD,
            priority: this.calculateCommunityCommentPriority(comment),
            sender: {
              id: comment.author.channel_id,
              name: comment.author.display_name,
              username: comment.author.display_name,
              profilePicture: comment.author.profile_image_url,
              followerCount: comment.author.subscriber_count || 0
            },
            content: comment.text_display,
            contentId: post.id,
            platformPostId: post.id,
            receivedAt: new Date(comment.published_at),
            sentAt: new Date(comment.published_at),
            sentiment: await this.analyzeSentiment(comment.text_display, user),
            attachments: []
          };

          // Add to inbox
          const inboxMsg = await this.socialInboxService.addMessage(inboxMessage);
          inboxMessages.push(inboxMsg);
        }
      }

      logger.info('YouTube community comments synced to inbox', {
        postCount: communityPosts.length,
        newComments: inboxMessages.length
      });

      return inboxMessages;
    } catch (error) {
      logger.error('Error syncing YouTube community comments to inbox', { error });
      return [];
    }
  }

  /**
   * Reply to a YouTube comment from the social inbox
   */
  async replyToComment(
    messageId: string, 
    replyContent: string, 
    userId: string
  ): Promise<string> {
    try {
      const originalMessage = await this.socialInboxService.getMessage(messageId);
      if (!originalMessage || originalMessage.platformType !== PlatformType.YOUTUBE) {
        throw new Error('Original message not found or not from YouTube');
      }

      if (!this.youTubeProvider.isAuthenticated()) {
        throw new Error('YouTube provider not authenticated');
      }

      // Reply to the comment using YouTube API
      const replyId = await this.createCommentReply(
        originalMessage.platformId,
        replyContent
      );

      if (replyId) {
        // Update message status to replied
        await this.socialInboxService.updateMessageStatus(messageId, MessageStatus.REPLIED);
        
        logger.info('Successfully replied to YouTube comment from inbox', {
          messageId,
          replyId
        });

        return replyId;
      }

      throw new Error('Failed to get reply ID');
    } catch (error) {
      logger.error('Error replying to YouTube comment from inbox', { error, messageId });
      throw error;
    }
  }

  /**
   * Start background sync for YouTube comments
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
    logger.info('Starting YouTube background sync', {
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
          logger.error('Error in YouTube background sync', {
            error,
            accountId: account.accountId
          });
        }
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Process YouTube webhook event and convert to InboxMessage
   */
  async processWebhookEvent(
    event: any,
    accountId: string,
    userId: string,
    organizationId?: string,
    user?: User
  ): Promise<InboxMessage | null> {
    try {
      // Handle different YouTube webhook event types
      if (event.type === 'comment.created') {
        return await this.processCommentEvent(event.data, accountId, userId, organizationId, user);
      }
      
      if (event.type === 'video.liked') {
        return await this.processLikeEvent(event.data, accountId, userId, organizationId);
      }

      if (event.type === 'channel.subscribed') {
        return await this.processSubscribeEvent(event.data, accountId, userId, organizationId);
      }

      return null;
    } catch (error) {
      logger.error('Failed to process YouTube webhook event', { error, event });
      return null;
    }
  }

  // Private helper methods

  private async getRecentVideos(limit: number = 10): Promise<YouTubeVideoData[]> {
    try {
      const response = await this.youTubeProvider.getPosts(limit);
      return response.map(post => ({
        video_id: post.id,
        title: (post as any).content || post.id,
        description: (post as any).content || '',
        thumbnail_url: (post as any).attachments?.[0]?.thumbnailUrl || '',
        published_at: (post as any).createdAt?.toISOString() || new Date().toISOString(),
        duration: 'PT0S',
        view_count: (post as any).metrics?.views || 0,
        like_count: (post as any).metrics?.likes || 0,
        comment_count: (post as any).metrics?.comments || 0,
        channel_id: (post as any).authorId || '',
        channel_title: (post as any).authorName || ''
      }));
    } catch (error) {
      logger.error('Error fetching recent YouTube videos', { error });
      return [];
    }
  }

  private async getRecentCommunityPosts(limit: number = 10): Promise<YouTubeCommunityPostData[]> {
    try {
      if (!this.youTubeProvider.isAuthenticated()) {
        throw new Error('YouTube provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      // Get channel's community posts
      const url = `https://www.googleapis.com/youtube/v3/activities`;
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        mine: 'true',
        maxResults: limit.toString(),
        key: process.env.YOUTUBE_API_KEY || ''
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.items || [])
        .filter((item: any) => item.snippet.type === 'bulletin')
        .map((item: any) => ({
          id: item.id,
          author: {
            channel_id: item.snippet.channelId,
            display_name: item.snippet.channelTitle,
            profile_image_url: item.snippet.thumbnails?.default?.url || ''
          },
          content: item.snippet.description || '',
          published_at: item.snippet.publishedAt,
          like_count: 0,
          comment_count: 0,
          images: item.snippet.thumbnails ? [item.snippet.thumbnails.default] : []
        }));
    } catch (error) {
      logger.error('Error fetching recent YouTube community posts', { error });
      return [];
    }
  }

  private async getVideoComments(videoId: string, pageToken?: string): Promise<YouTubeCommentData[]> {
    try {
      if (!this.youTubeProvider.isAuthenticated()) {
        throw new Error('YouTube provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://www.googleapis.com/youtube/v3/commentThreads`;
      const params = new URLSearchParams({
        part: 'snippet,replies',
        videoId: videoId,
        maxResults: '50',
        order: 'time'
      });

      if (pageToken) {
        params.append('pageToken', pageToken);
      }

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      const comments: YouTubeCommentData[] = [];

      // Process top-level comments
      for (const item of data.items || []) {
        const snippet = item.snippet.topLevelComment.snippet;
        comments.push({
          comment_id: item.snippet.topLevelComment.id,
          video_id: videoId,
          parent_comment_id: undefined,
          author_display_name: snippet.authorDisplayName,
          author_channel_id: snippet.authorChannelId?.value || '',
          author_profile_image_url: snippet.authorProfileImageUrl,
          text_display: snippet.textDisplay,
          text_original: snippet.textOriginal,
          like_count: snippet.likeCount,
          published_at: snippet.publishedAt,
          updated_at: snippet.updatedAt
        });

        // Process replies if they exist
        if (item.replies) {
          for (const reply of item.replies.comments) {
            const replySnippet = reply.snippet;
            comments.push({
              comment_id: reply.id,
              video_id: videoId,
              parent_comment_id: item.snippet.topLevelComment.id,
              author_display_name: replySnippet.authorDisplayName,
              author_channel_id: replySnippet.authorChannelId?.value || '',
              author_profile_image_url: replySnippet.authorProfileImageUrl,
              text_display: replySnippet.textDisplay,
              text_original: replySnippet.textOriginal,
              like_count: replySnippet.likeCount,
              published_at: replySnippet.publishedAt,
              updated_at: replySnippet.updatedAt
            });
          }
        }
      }

      return comments;
    } catch (error) {
      logger.error('Error fetching YouTube video comments', { error, videoId });
      return [];
    }
  }

  private async getCommunityPostComments(postId: string): Promise<YouTubeCommunityPostCommentData[]> {
    // Community post comments use the same API structure as video comments
    // but with different endpoint parameters
    try {
      if (!this.youTubeProvider.isAuthenticated()) {
        throw new Error('YouTube provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      // YouTube API v3 doesn't directly support community post comments yet
      // For now, we'll implement a workaround using the activities API
      // This is a limitation of the current YouTube API
      
      // Try to get comments using the activities API approach
      const url = `https://www.googleapis.com/youtube/v3/commentThreads`;
      const params = new URLSearchParams({
        part: 'snippet,replies',
        allThreadsRelatedToChannelId: postId.split('_')[0], // Extract channel ID from post ID
        maxResults: '50',
        order: 'time'
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // If the API call fails, log warning and return empty array
        logger.warn('Community post comments API not available, returning empty array', { 
          postId, 
          status: response.status 
        });
        return [];
      }

      const data = await response.json();
      const comments: YouTubeCommunityPostCommentData[] = [];

      // Process comments and convert to community post comment format
      for (const item of data.items || []) {
        const snippet = item.snippet.topLevelComment.snippet;
        
        // Filter for comments that might be related to community posts
        // This is a best-effort approach given API limitations
        comments.push({
          id: item.snippet.topLevelComment.id,
          post_id: postId,
          parent_id: undefined,
          author: {
            channel_id: snippet.authorChannelId?.value || '',
            display_name: snippet.authorDisplayName,
            profile_image_url: snippet.authorProfileImageUrl,
            subscriber_count: 0 // Not available in this API response
          },
          text_display: snippet.textDisplay,
          text_original: snippet.textOriginal,
          like_count: snippet.likeCount,
          published_at: snippet.publishedAt,
          updated_at: snippet.updatedAt
        });

        // Process replies if they exist
        if (item.replies) {
          for (const reply of item.replies.comments) {
            const replySnippet = reply.snippet;
            comments.push({
              id: reply.id,
              post_id: postId,
              parent_id: item.snippet.topLevelComment.id,
              author: {
                channel_id: replySnippet.authorChannelId?.value || '',
                display_name: replySnippet.authorDisplayName,
                profile_image_url: replySnippet.authorProfileImageUrl,
                subscriber_count: 0
              },
              text_display: replySnippet.textDisplay,
              text_original: replySnippet.textOriginal,
              like_count: replySnippet.likeCount,
              published_at: replySnippet.publishedAt,
              updated_at: replySnippet.updatedAt
            });
          }
        }
      }

      return comments;
    } catch (error) {
      logger.error('Error fetching YouTube community post comments', { error, postId });
      return [];
    }
  }

  private async createCommentReply(
    parentCommentId: string,
    content: string
  ): Promise<string | null> {
    try {
      if (!this.youTubeProvider.isAuthenticated()) {
        throw new Error('YouTube provider not authenticated');
      }

      const authState = await this.getProviderAuthState();
      if (!authState?.accessToken) {
        throw new Error('No access token available');
      }

      const url = `https://www.googleapis.com/youtube/v3/comments?part=snippet`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          snippet: {
            parentId: parentCommentId,
            textOriginal: content
          }
        })
      });

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      return data.id || null;
    } catch (error) {
      logger.error('Error creating YouTube comment reply', { error, parentCommentId });
      return null;
    }
  }

  private async getProviderAuthState(): Promise<any> {
    try {
      return await (this.youTubeProvider as any).getAuthState?.() || null;
    } catch (error) {
      logger.error('Error getting YouTube provider auth state', { error });
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
    // Skip comments from the authenticated channel
    if (commentData.author_channel_id === accountId) {
      return null;
    }

    const message: InboxMessage = {
      id: `youtube_${commentData.comment_id}`,
      platformType: PlatformType.YOUTUBE,
      platformId: commentData.comment_id,
      accountId,
      userId,
      organizationId,
      type: commentData.parent_comment_id ? MessageType.REPLY : MessageType.COMMENT,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.MEDIUM,
      sender: {
        id: commentData.author_channel_id,
        name: commentData.author_display_name,
        username: commentData.author_display_name,
        profilePicture: commentData.author_profile_image_url,
        followerCount: 0
      },
      content: commentData.text_display,
      contentId: commentData.video_id,
      platformPostId: commentData.video_id,
      parentId: commentData.parent_comment_id,
      receivedAt: new Date(commentData.published_at),
      sentAt: new Date(commentData.published_at),
      sentiment: await this.analyzeSentiment(commentData.text_display, user)
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
      id: `youtube_like_${likeData.user_id}_${likeData.video_id}_${Date.now()}`,
      platformType: PlatformType.YOUTUBE,
      platformId: `like_${likeData.video_id}`,
      accountId,
      userId,
      organizationId,
      type: MessageType.MENTION,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.LOW,
      sender: {
        id: likeData.user_id,
        name: likeData.user_name || 'YouTube User',
        username: likeData.user_name || 'YouTube User',
        profilePicture: likeData.user_avatar || '',
        followerCount: 0
      },
      content: `Liked your video: ${likeData.video_title}`,
      contentId: likeData.video_id,
      platformPostId: likeData.video_id,
      receivedAt: new Date(),
      sentAt: new Date(),
      sentiment: 'positive'
    };

    return message;
  }

  private async processSubscribeEvent(
    subscribeData: any,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<InboxMessage | null> {
    const message: InboxMessage = {
      id: `youtube_subscribe_${subscribeData.subscriber_id}_${Date.now()}`,
      platformType: PlatformType.YOUTUBE,
      platformId: `subscribe_${subscribeData.subscriber_id}`,
      accountId,
      userId,
      organizationId,
      type: MessageType.MENTION,
      status: MessageStatus.UNREAD,
      priority: MessagePriority.LOW,
      sender: {
        id: subscribeData.subscriber_id,
        name: subscribeData.subscriber_name || 'YouTube User',
        username: subscribeData.subscriber_name || 'YouTube User',
        profilePicture: subscribeData.subscriber_avatar || '',
        followerCount: 0
      },
      content: `Subscribed to your channel`,
      receivedAt: new Date(),
      sentAt: new Date(),
      sentiment: 'positive'
    };

    return message;
  }

  private calculatePriority(comment: YouTubeCommentData): MessagePriority {
    // High priority for comments with high engagement
    if (comment.like_count > 50) {
      return MessagePriority.HIGH;
    }
    
    // Medium priority for moderate engagement
    if (comment.like_count > 5) {
      return MessagePriority.MEDIUM;
    }
    
    return MessagePriority.LOW;
  }

  private calculateCommunityCommentPriority(comment: YouTubeCommunityPostCommentData): MessagePriority {
    // High priority for comments with high engagement
    if (comment.like_count > 50) {
      return MessagePriority.HIGH;
    }
    
    // Medium priority for moderate engagement
    if (comment.like_count > 5) {
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
    const positiveWords = ['love', 'amazing', 'great', 'awesome', 'fantastic', 'excellent', '❤️', '😍', '🔥', '👏', 'subscribe'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'worst', 'horrible', '😡', '👎', '😢', 'dislike'];
    
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
        where('platformType', '==', PlatformType.YOUTUBE)
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
export const createYouTubeSocialInboxAdapter = () => {
  const { YouTubeProvider } = require('../platforms/providers/YouTubeProvider');
  return new YouTubeSocialInboxAdapter(
    new YouTubeProvider({
      clientId: process.env.YOUTUBE_CLIENT_ID || '',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
      redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=youtube' || ''
    })
  );
};

const youTubeSocialInboxAdapter = createYouTubeSocialInboxAdapter();

export default youTubeSocialInboxAdapter; 
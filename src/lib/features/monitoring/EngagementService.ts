/**
 * Engagement Service
 *
 * Manages social media engagement including comments, direct messages, and replies.
 * Provides unified inbox functionality and smart reply capabilities.
 *
 * Features:
 * - Unified inbox across all platforms
 * - Comment and DM management
 * - Reply tracking and threading
 * - AI-powered smart reply suggestions
 * - Engagement metrics and analytics
 * - Bulk actions (mark as read, archive, etc.)
 */

import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
} from 'firebase/firestore';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';
import { sentimentAnalysisService } from './SentimentAnalysisService';
import { SocialMention } from './SocialListeningService';

/**
 * Engagement item (comment or DM)
 */
export interface EngagementItem {
  id?: string;
  userId: string;
  organizationId: string;
  platformType: PlatformType;
  type: 'comment' | 'direct_message' | 'reply';

  // Platform identifiers
  platformItemId: string;
  platformPostId?: string;
  platformConversationId?: string;

  // Author information
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorProfileUrl?: string;
  authorFollowerCount?: number;

  // Content
  content: string;
  attachments?: {
    type: 'image' | 'video' | 'gif' | 'link';
    url: string;
  }[];

  // Sentiment
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
  requiresResponse?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';

  // Status
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isSpam: boolean;

  // Reply tracking
  hasReplied: boolean;
  replyId?: string;
  replyContent?: string;
  repliedAt?: Date;

  // Engagement metrics
  likes: number;
  replies: number;

  // Timestamps
  receivedAt: Date;
  createdAt: Date;

  metadata?: Record<string, any>;
}

/**
 * Reply template
 */
export interface ReplyTemplate {
  id?: string;
  userId: string;
  organizationId: string;
  name: string;
  content: string;
  category: 'greeting' | 'thanks' | 'apology' | 'information' | 'custom';
  platforms: PlatformType[];
  isActive: boolean;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Engagement statistics
 */
export interface EngagementStats {
  totalItems: number;
  unreadCount: number;
  requiresResponseCount: number;
  averageResponseTime: number; // in hours
  responseRate: number; // percentage
  platformBreakdown: {
    platform: PlatformType;
    count: number;
    unread: number;
    avgResponseTime: number;
  }[];
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  priorityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

class EngagementService {
  private readonly ENGAGEMENT_COLLECTION = 'engagementItems';
  private readonly TEMPLATES_COLLECTION = 'replyTemplates';

  /**
   * Fetch comments from Instagram
   */
  async fetchInstagramComments(
    userId: string,
    organizationId: string,
    accessToken: string,
    lastFetchTime?: Date
  ): Promise<EngagementItem[]> {
    const items: EngagementItem[] = [];

    try {
      // Fetch user's media
      const mediaResponse = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption&access_token=${accessToken}`
      );
      const mediaData = await mediaResponse.json();

      if (!mediaData.data) return items;

      // Fetch comments for each post
      for (const media of mediaData.data) {
        const commentsResponse = await fetch(
          `https://graph.instagram.com/${media.id}/comments?fields=id,text,username,timestamp,like_count,replies&access_token=${accessToken}`
        );
        const commentsData = await commentsResponse.json();

        if (commentsData.data) {
          for (const comment of commentsData.data) {
            const commentTime = new Date(comment.timestamp);
            if (lastFetchTime && commentTime <= lastFetchTime) continue;

            items.push({
              userId,
              organizationId,
              platformType: PlatformType.INSTAGRAM,
              type: 'comment',
              platformItemId: comment.id,
              platformPostId: media.id,
              authorId: comment.from?.id || 'unknown',
              authorUsername: comment.username,
              authorName: comment.username,
              content: comment.text,
              likes: comment.like_count || 0,
              replies: comment.replies?.data?.length || 0,
              isRead: false,
              isStarred: false,
              isArchived: false,
              isSpam: false,
              hasReplied: false,
              receivedAt: commentTime,
              createdAt: commentTime,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Instagram comments:', error);
    }

    return items;
  }

  /**
   * Fetch mentions from Twitter
   */
  async fetchTwitterMentions(
    userId: string,
    organizationId: string,
    accessToken: string,
    lastFetchTime?: Date
  ): Promise<EngagementItem[]> {
    const items: EngagementItem[] = [];

    try {
      const response = await fetch(
        'https://api.twitter.com/2/users/me/mentions?tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username,name,public_metrics&max_results=100',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();

      if (data.data) {
        for (const tweet of data.data) {
          const createdTime = new Date(tweet.created_at);
          if (lastFetchTime && createdTime <= lastFetchTime) continue;

          const author = data.includes?.users?.find((u: any) => u.id === tweet.author_id);

          items.push({
            userId,
            organizationId,
            platformType: PlatformType.TWITTER,
            type: 'comment',
            platformItemId: tweet.id,
            authorId: tweet.author_id,
            authorUsername: author?.username || 'unknown',
            authorName: author?.name || 'unknown',
            authorProfileUrl: `https://twitter.com/${author?.username}`,
            authorFollowerCount: author?.public_metrics?.followers_count,
            content: tweet.text,
            likes: tweet.public_metrics?.like_count || 0,
            replies: tweet.public_metrics?.reply_count || 0,
            isRead: false,
            isStarred: false,
            isArchived: false,
            isSpam: false,
            hasReplied: false,
            receivedAt: createdTime,
            createdAt: createdTime,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Twitter mentions:', error);
    }

    return items;
  }

  /**
   * Fetch all engagement items from configured platforms
   */
  async fetchAllEngagement(
    userId: string,
    organizationId: string,
    platformConnections: any[],
    lastFetchTime?: Date
  ): Promise<{ items: EngagementItem[]; errors: string[] }> {
    const allItems: EngagementItem[] = [];
    const errors: string[] = [];

    for (const connection of platformConnections) {
      try {
        let items: EngagementItem[] = [];

        switch (connection.type) {
          case PlatformType.INSTAGRAM:
            items = await this.fetchInstagramComments(userId, organizationId, connection.accessToken, lastFetchTime);
            break;
          case PlatformType.TWITTER:
            items = await this.fetchTwitterMentions(userId, organizationId, connection.accessToken, lastFetchTime);
            break;
          // Add other platforms as needed
        }

        allItems.push(...items);
      } catch (error) {
        const errorMessage = `Error fetching engagement from ${connection.type}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    return { items: allItems, errors };
  }

  /**
   * Save engagement items to Firestore
   */
  async saveEngagementItems(items: EngagementItem[]): Promise<{ saved: number; errors: string[] }> {
    let saved = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        // Check if item already exists
        const firestore = getFirebaseFirestore();
    if (!firestore) {
      return 0;
    }
    const existingQuery = query(
      collection(firestore, this.ENGAGEMENT_COLLECTION),
          where('userId', '==', item.userId),
          where('platformItemId', '==', item.platformItemId),
          firestoreLimit(1)
        );
        const existingDocs = await getDocs(existingQuery);

        if (existingDocs.empty) {
          await addDoc(collection(firestore, this.ENGAGEMENT_COLLECTION), {
            ...item,
            receivedAt: Timestamp.fromDate(item.receivedAt),
            createdAt: Timestamp.fromDate(item.createdAt),
            repliedAt: item.repliedAt ? Timestamp.fromDate(item.repliedAt) : null,
          });
          saved++;
        }
      } catch (error) {
        errors.push(`Error saving engagement item: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { saved, errors };
  }

  /**
   * Analyze sentiment for engagement items
   */
  async analyzeEngagementSentiment(items: EngagementItem[]): Promise<void> {
    const batchResult = await sentimentAnalysisService.analyzeBatch(
      items.map(item => ({
        id: item.id,
        content: item.content,
        source: {
          platformType: item.platformType,
          authorName: item.authorName,
          authorFollowerCount: item.authorFollowerCount,
        },
        engagementMetrics: {
          likes: item.likes,
          comments: item.replies,
          shares: 0,
        },
      } as SocialMention))
    );

    // Update items with sentiment
    for (const [itemId, sentiment] of batchResult.results.entries()) {
      const item = items.find(i => i.id === itemId);
      if (item && item.id) {
        try {
          await updateDoc(doc(firestore, this.ENGAGEMENT_COLLECTION, item.id), {
            sentiment: sentiment.sentiment,
            sentimentScore: sentiment.score,
            requiresResponse: sentiment.requiresResponse,
            priority: sentiment.priority,
          });
        } catch (error) {
          console.error(`Error updating sentiment for item ${itemId}:`, error);
        }
      }
    }
  }

  /**
   * Get engagement items with filtering
   */
  async getEngagementItems(
    userId: string,
    organizationId: string,
    options: {
      platforms?: PlatformType[];
      type?: 'comment' | 'direct_message' | 'reply';
      isRead?: boolean;
      isStarred?: boolean;
      requiresResponse?: boolean;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      limit?: number;
    } = {}
  ): Promise<EngagementItem[]> {
    try {
      let itemsQuery = query(
        collection(firestore, this.ENGAGEMENT_COLLECTION),
        where('userId', '==', userId),
        where('organizationId', '==', organizationId)
      );

      if (options.isRead !== undefined) {
        itemsQuery = query(itemsQuery, where('isRead', '==', options.isRead));
      }

      if (options.isStarred !== undefined) {
        itemsQuery = query(itemsQuery, where('isStarred', '==', options.isStarred));
      }

      if (options.requiresResponse !== undefined) {
        itemsQuery = query(itemsQuery, where('requiresResponse', '==', options.requiresResponse));
      }

      if (options.type) {
        itemsQuery = query(itemsQuery, where('type', '==', options.type));
      }

      if (options.priority) {
        itemsQuery = query(itemsQuery, where('priority', '==', options.priority));
      }

      itemsQuery = query(itemsQuery, orderBy('receivedAt', 'desc'));

      if (options.limit) {
        itemsQuery = query(itemsQuery, firestoreLimit(options.limit));
      }

      const itemDocs = await getDocs(itemsQuery);
      const items: EngagementItem[] = [];

      itemDocs.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          userId: data.userId,
          organizationId: data.organizationId,
          platformType: data.platformType,
          type: data.type,
          platformItemId: data.platformItemId,
          platformPostId: data.platformPostId,
          platformConversationId: data.platformConversationId,
          authorId: data.authorId,
          authorUsername: data.authorUsername,
          authorName: data.authorName,
          authorProfileUrl: data.authorProfileUrl,
          authorFollowerCount: data.authorFollowerCount,
          content: data.content,
          attachments: data.attachments,
          sentiment: data.sentiment,
          sentimentScore: data.sentimentScore,
          requiresResponse: data.requiresResponse,
          priority: data.priority,
          isRead: data.isRead,
          isStarred: data.isStarred,
          isArchived: data.isArchived,
          isSpam: data.isSpam,
          hasReplied: data.hasReplied,
          replyId: data.replyId,
          replyContent: data.replyContent,
          repliedAt: data.repliedAt?.toDate(),
          likes: data.likes,
          replies: data.replies,
          receivedAt: data.receivedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          metadata: data.metadata,
        });
      });

      return items;
    } catch (error) {
      console.error('Error getting engagement items:', error);
      throw new Error('Failed to get engagement items');
    }
  }

  /**
   * Reply to engagement item
   */
  async replyToItem(
    itemId: string,
    replyContent: string,
    platformType: PlatformType,
    accessToken: string
  ): Promise<{ success: boolean; replyId?: string; error?: string }> {
    try {
      const itemDoc = await getDocs(
        query(
          collection(firestore, this.ENGAGEMENT_COLLECTION),
          where('id', '==', itemId),
          firestoreLimit(1)
        )
      );

      if (itemDoc.empty) {
        return { success: false, error: 'Engagement item not found' };
      }

      const item = itemDoc.docs[0].data() as EngagementItem;
      let replyId: string | undefined;

      // Send reply via platform API
      switch (platformType) {
        case PlatformType.INSTAGRAM:
          const igResponse = await fetch(
            `https://graph.instagram.com/${item.platformItemId}/replies`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: replyContent,
                access_token: accessToken,
              }),
            }
          );
          const igData = await igResponse.json();
          replyId = igData.id;
          break;

        case PlatformType.TWITTER:
          const twitterResponse = await fetch(
            'https://api.twitter.com/2/tweets',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: replyContent,
                reply: {
                  in_reply_to_tweet_id: item.platformItemId,
                },
              }),
            }
          );
          const twitterData = await twitterResponse.json();
          replyId = twitterData.data?.id;
          break;

        default:
          return { success: false, error: 'Platform not supported for replies' };
      }

      // Update item with reply info
      await updateDoc(doc(firestore, this.ENGAGEMENT_COLLECTION, itemId), {
        hasReplied: true,
        replyId,
        replyContent,
        repliedAt: Timestamp.now(),
      });

      return { success: true, replyId };
    } catch (error) {
      console.error('Error replying to item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate smart reply suggestions
   */
  async generateReplySuggestions(
    itemId: string,
    brandVoice: 'professional' | 'casual' | 'friendly' = 'professional'
  ): Promise<string[]> {
    try {
      const itemDoc = await getDocs(
        query(
          collection(firestore, this.ENGAGEMENT_COLLECTION),
          where('id', '==', itemId),
          firestoreLimit(1)
        )
      );

      if (itemDoc.empty) {
        return [];
      }

      const item = itemDoc.docs[0].data() as EngagementItem;

      // Analyze sentiment if not already done
      let sentiment = item.sentiment ? {
        sentiment: item.sentiment,
        score: item.sentimentScore || 0,
        confidence: 0.8,
        emotions: { joy: 0, anger: 0, sadness: 0, fear: 0, surprise: 0 },
        intent: 'other' as const,
        keywords: [],
        requiresResponse: item.requiresResponse || false,
        priority: item.priority || 'medium' as const,
      } : await sentimentAnalysisService.analyzeSentiment(item.content, {
        authorName: item.authorName,
        authorFollowerCount: item.authorFollowerCount,
        engagementMetrics: {
          likes: item.likes,
          comments: item.replies,
          shares: 0,
        },
      });

      return await sentimentAnalysisService.generateSmartReply(
        item.content,
        sentiment,
        brandVoice
      );
    } catch (error) {
      console.error('Error generating reply suggestions:', error);
      return [];
    }
  }

  /**
   * Get engagement statistics
   */
  async getEngagementStats(
    userId: string,
    organizationId: string,
    days: number = 7
  ): Promise<EngagementStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const items = await this.getEngagementItems(userId, organizationId, { limit: 1000 });
    const recentItems = items.filter(i => i.receivedAt >= startDate);

    // Calculate response times
    const repliedItems = recentItems.filter(i => i.hasReplied && i.repliedAt);
    const responseTimes = repliedItems.map(i => {
      const responseTime = i.repliedAt!.getTime() - i.receivedAt.getTime();
      return responseTime / (1000 * 60 * 60); // Convert to hours
    });
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Calculate response rate
    const itemsRequiringResponse = recentItems.filter(i => i.requiresResponse);
    const responseRate = itemsRequiringResponse.length > 0
      ? (repliedItems.length / itemsRequiringResponse.length) * 100
      : 100;

    // Platform breakdown
    const platformMap = new Map<PlatformType, { count: number; unread: number; responseTimes: number[] }>();
    recentItems.forEach(item => {
      const current = platformMap.get(item.platformType) || { count: 0, unread: 0, responseTimes: [] };
      current.count++;
      if (!item.isRead) current.unread++;
      if (item.hasReplied && item.repliedAt) {
        const responseTime = (item.repliedAt.getTime() - item.receivedAt.getTime()) / (1000 * 60 * 60);
        current.responseTimes.push(responseTime);
      }
      platformMap.set(item.platformType, current);
    });

    const platformBreakdown = Array.from(platformMap.entries()).map(([platform, data]) => ({
      platform,
      count: data.count,
      unread: data.unread,
      avgResponseTime: data.responseTimes.length > 0
        ? data.responseTimes.reduce((sum, t) => sum + t, 0) / data.responseTimes.length
        : 0,
    }));

    // Sentiment breakdown
    const sentimentBreakdown = {
      positive: recentItems.filter(i => i.sentiment === 'positive').length,
      neutral: recentItems.filter(i => i.sentiment === 'neutral').length,
      negative: recentItems.filter(i => i.sentiment === 'negative').length,
    };

    // Priority breakdown
    const priorityBreakdown = {
      critical: recentItems.filter(i => i.priority === 'critical').length,
      high: recentItems.filter(i => i.priority === 'high').length,
      medium: recentItems.filter(i => i.priority === 'medium').length,
      low: recentItems.filter(i => i.priority === 'low').length,
    };

    return {
      totalItems: recentItems.length,
      unreadCount: recentItems.filter(i => !i.isRead).length,
      requiresResponseCount: recentItems.filter(i => i.requiresResponse && !i.hasReplied).length,
      averageResponseTime,
      responseRate,
      platformBreakdown,
      sentimentBreakdown,
      priorityBreakdown,
    };
  }

  /**
   * Mark item as read
   */
  async markAsRead(itemId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.ENGAGEMENT_COLLECTION, itemId), {
        isRead: true,
      });
    } catch (error) {
      console.error('Error marking item as read:', error);
      throw new Error('Failed to mark item as read');
    }
  }

  /**
   * Toggle star on item
   */
  async toggleStar(itemId: string, isStarred: boolean): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.ENGAGEMENT_COLLECTION, itemId), {
        isStarred,
      });
    } catch (error) {
      console.error('Error toggling star:', error);
      throw new Error('Failed to toggle star');
    }
  }

  /**
   * Archive item
   */
  async archiveItem(itemId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.ENGAGEMENT_COLLECTION, itemId), {
        isArchived: true,
      });
    } catch (error) {
      console.error('Error archiving item:', error);
      throw new Error('Failed to archive item');
    }
  }

  /**
   * Mark as spam
   */
  async markAsSpam(itemId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.ENGAGEMENT_COLLECTION, itemId), {
        isSpam: true,
        isArchived: true,
      });
    } catch (error) {
      console.error('Error marking as spam:', error);
      throw new Error('Failed to mark as spam');
    }
  }
}

// Export singleton instance
export const engagementService = new EngagementService();

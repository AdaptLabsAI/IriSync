/**
 * Social Listening Service
 *
 * Monitors brand mentions, hashtags, keywords, and engagement across all social platforms.
 * Provides unified listening capabilities for social media monitoring and brand tracking.
 *
 * Features:
 * - Brand mention tracking across platforms
 * - Hashtag performance monitoring
 * - Keyword and topic tracking
 * - Competitor mention detection
 * - Real-time alerts for important mentions
 * - Historical mention storage and analytics
 */

import { getFirebaseFirestore  } from '@/lib/core/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';

/**
 * Types of social listening content
 */
export enum MentionType {
  BRAND_MENTION = 'brand_mention',
  HASHTAG = 'hashtag',
  KEYWORD = 'keyword',
  COMMENT = 'comment',
  DIRECT_MESSAGE = 'direct_message',
  COMPETITOR = 'competitor'
}

/**
 * Mention source information
 */
export interface MentionSource {
  platformType: PlatformType;
  platformUserId: string;
  platformUsername: string;
  platformPostId?: string;
  platformCommentId?: string;
  authorName: string;
  authorProfileUrl?: string;
  authorFollowerCount?: number;
  authorVerified?: boolean;
}

/**
 * Social mention data
 */
export interface SocialMention {
  id?: string;
  userId: string;
  organizationId: string;
  type: MentionType;
  source: MentionSource;
  content: string;
  keywords: string[];
  hashtags: string[];
  mentions: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number; // -1 to 1
  engagementMetrics: {
    likes: number;
    comments: number;
    shares: number;
    reach?: number;
    impressions?: number;
  };
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  repliedTo: boolean;
  replyId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  id?: string;
  userId: string;
  organizationId: string;
  enabled: boolean;
  brandKeywords: string[];
  competitorKeywords: string[];
  trackedHashtags: string[];
  customKeywords: string[];
  platforms: PlatformType[];
  alertThresholds: {
    highEngagement: number; // Minimum engagement count for alert
    negativesentiment: number; // Max negative sentiment score (-1 to 0)
    influencerFollowers: number; // Minimum followers for influencer alert
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Listening statistics
 */
export interface ListeningStats {
  totalMentions: number;
  unreadMentions: number;
  platformBreakdown: {
    platform: PlatformType;
    count: number;
    avgSentiment: number;
  }[];
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  typeBreakdown: {
    type: MentionType;
    count: number;
  }[];
  topHashtags: {
    hashtag: string;
    count: number;
    avgSentiment: number;
  }[];
  topKeywords: {
    keyword: string;
    count: number;
  }[];
  recentMentions: SocialMention[];
}

/**
 * Fetch mentions options
 */
export interface FetchMentionsOptions {
  platforms?: PlatformType[];
  types?: MentionType[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  minPriority?: 'low' | 'medium' | 'high' | 'critical';
  isRead?: boolean;
  isStarred?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

class SocialListeningService {
  private readonly MENTIONS_COLLECTION = 'socialMentions';
  private readonly CONFIGS_COLLECTION = 'monitoringConfigs';

  /**
   * Fetch mentions from Instagram
   */
  private async fetchInstagramMentions(
    userId: string,
    organizationId: string,
    accessToken: string,
    config: MonitoringConfig
  ): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];

    try {
      // Fetch user's media
      const mediaResponse = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,like_count,comments_count,timestamp&access_token=${accessToken}`
      );
      const mediaData = await mediaResponse.json();

      if (!mediaData.data) return mentions;

      // Check each post for mentions and hashtags
      for (const media of mediaData.data) {
        const caption = media.caption || '';

        // Check for brand keywords
        for (const keyword of config.brandKeywords) {
          if (caption.toLowerCase().includes(keyword.toLowerCase())) {
            // Fetch comments on this post
            const commentsResponse = await fetch(
              `https://graph.instagram.com/${media.id}/comments?fields=id,text,username,timestamp,like_count&access_token=${accessToken}`
            );
            const commentsData = await commentsResponse.json();

            if (commentsData.data) {
              for (const comment of commentsData.data) {
                mentions.push({
                  userId,
                  organizationId,
                  type: MentionType.BRAND_MENTION,
                  source: {
                    platformType: PlatformType.INSTAGRAM,
                    platformUserId: comment.from?.id || 'unknown',
                    platformUsername: comment.username,
                    platformPostId: media.id,
                    platformCommentId: comment.id,
                    authorName: comment.username,
                  },
                  content: comment.text,
                  keywords: this.extractKeywords(comment.text, config.brandKeywords),
                  hashtags: this.extractHashtags(comment.text),
                  mentions: this.extractMentions(comment.text),
                  engagementMetrics: {
                    likes: comment.like_count || 0,
                    comments: 0,
                    shares: 0,
                  },
                  isRead: false,
                  isStarred: false,
                  isArchived: false,
                  repliedTo: false,
                  priority: 'medium',
                  detectedAt: new Date(),
                  createdAt: new Date(comment.timestamp),
                });
              }
            }
          }
        }
      }

      // Fetch mentions from Instagram Mentions API (requires specific permissions)
      try {
        const mentionsResponse = await fetch(
          `https://graph.instagram.com/me?fields=mentioned_media.limit(50){id,caption,like_count,comments_count,timestamp,username}&access_token=${accessToken}`
        );
        const mentionsData = await mentionsResponse.json();

        if (mentionsData.mentioned_media?.data) {
          for (const mention of mentionsData.mentioned_media.data) {
            mentions.push({
              userId,
              organizationId,
              type: MentionType.BRAND_MENTION,
              source: {
                platformType: PlatformType.INSTAGRAM,
                platformUserId: 'unknown',
                platformUsername: mention.username || 'unknown',
                platformPostId: mention.id,
                authorName: mention.username || 'unknown',
              },
              content: mention.caption || '',
              keywords: this.extractKeywords(mention.caption || '', config.brandKeywords),
              hashtags: this.extractHashtags(mention.caption || ''),
              mentions: this.extractMentions(mention.caption || ''),
              engagementMetrics: {
                likes: mention.like_count || 0,
                comments: mention.comments_count || 0,
                shares: 0,
              },
              isRead: false,
              isStarred: false,
              isArchived: false,
              repliedTo: false,
              priority: 'medium',
              detectedAt: new Date(),
              createdAt: new Date(mention.timestamp),
            });
          }
        }
      } catch (error) {
        console.error('Error fetching Instagram mentions:', error);
      }

    } catch (error) {
      console.error('Error in fetchInstagramMentions:', error);
    }

    return mentions;
  }

  /**
   * Fetch mentions from Twitter
   */
  private async fetchTwitterMentions(
    userId: string,
    organizationId: string,
    accessToken: string,
    config: MonitoringConfig
  ): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];

    try {
      // Fetch mentions timeline (requires Twitter API v2)
      const mentionsResponse = await fetch(
        'https://api.twitter.com/2/users/me/mentions?tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username,name,public_metrics,verified&max_results=100',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      const mentionsData = await mentionsResponse.json();

      if (mentionsData.data) {
        for (const tweet of mentionsData.data) {
          const author = mentionsData.includes?.users?.find((u: any) => u.id === tweet.author_id);

          mentions.push({
            userId,
            organizationId,
            type: MentionType.BRAND_MENTION,
            source: {
              platformType: PlatformType.TWITTER,
              platformUserId: tweet.author_id,
              platformUsername: author?.username || 'unknown',
              platformPostId: tweet.id,
              authorName: author?.name || 'unknown',
              authorProfileUrl: `https://twitter.com/${author?.username}`,
              authorFollowerCount: author?.public_metrics?.followers_count,
              authorVerified: author?.verified,
            },
            content: tweet.text,
            keywords: this.extractKeywords(tweet.text, config.brandKeywords),
            hashtags: this.extractHashtags(tweet.text),
            mentions: this.extractMentions(tweet.text),
            engagementMetrics: {
              likes: tweet.public_metrics?.like_count || 0,
              comments: tweet.public_metrics?.reply_count || 0,
              shares: tweet.public_metrics?.retweet_count || 0,
              impressions: tweet.public_metrics?.impression_count,
            },
            isRead: false,
            isStarred: false,
            isArchived: false,
            repliedTo: false,
            priority: this.calculatePriority(tweet.public_metrics, author?.public_metrics),
            detectedAt: new Date(),
            createdAt: new Date(tweet.created_at),
          });
        }
      }

      // Search for brand keywords
      for (const keyword of config.brandKeywords) {
        const searchResponse = await fetch(
          `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(keyword)}&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username,name,public_metrics,verified&max_results=100`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        const searchData = await searchResponse.json();

        if (searchData.data) {
          for (const tweet of searchData.data) {
            const author = searchData.includes?.users?.find((u: any) => u.id === tweet.author_id);

            mentions.push({
              userId,
              organizationId,
              type: MentionType.KEYWORD,
              source: {
                platformType: PlatformType.TWITTER,
                platformUserId: tweet.author_id,
                platformUsername: author?.username || 'unknown',
                platformPostId: tweet.id,
                authorName: author?.name || 'unknown',
                authorProfileUrl: `https://twitter.com/${author?.username}`,
                authorFollowerCount: author?.public_metrics?.followers_count,
                authorVerified: author?.verified,
              },
              content: tweet.text,
              keywords: [keyword],
              hashtags: this.extractHashtags(tweet.text),
              mentions: this.extractMentions(tweet.text),
              engagementMetrics: {
                likes: tweet.public_metrics?.like_count || 0,
                comments: tweet.public_metrics?.reply_count || 0,
                shares: tweet.public_metrics?.retweet_count || 0,
                impressions: tweet.public_metrics?.impression_count,
              },
              isRead: false,
              isStarred: false,
              isArchived: false,
              repliedTo: false,
              priority: this.calculatePriority(tweet.public_metrics, author?.public_metrics),
              detectedAt: new Date(),
              createdAt: new Date(tweet.created_at),
            });
          }
        }
      }

    } catch (error) {
      console.error('Error in fetchTwitterMentions:', error);
    }

    return mentions;
  }

  /**
   * Fetch mentions from Facebook
   */
  private async fetchFacebookMentions(
    userId: string,
    organizationId: string,
    accessToken: string,
    config: MonitoringConfig
  ): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];

    try {
      // Fetch page mentions (requires page access token)
      const mentionsResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/tagged?fields=id,message,from,created_time,likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`
      );
      const mentionsData = await mentionsResponse.json();

      if (mentionsData.data) {
        for (const post of mentionsData.data) {
          mentions.push({
            userId,
            organizationId,
            type: MentionType.BRAND_MENTION,
            source: {
              platformType: PlatformType.FACEBOOK,
              platformUserId: post.from?.id || 'unknown',
              platformUsername: post.from?.name || 'unknown',
              platformPostId: post.id,
              authorName: post.from?.name || 'unknown',
            },
            content: post.message || '',
            keywords: this.extractKeywords(post.message || '', config.brandKeywords),
            hashtags: this.extractHashtags(post.message || ''),
            mentions: this.extractMentions(post.message || ''),
            engagementMetrics: {
              likes: post.likes?.summary?.total_count || 0,
              comments: post.comments?.summary?.total_count || 0,
              shares: post.shares?.count || 0,
            },
            isRead: false,
            isStarred: false,
            isArchived: false,
            repliedTo: false,
            priority: 'medium',
            detectedAt: new Date(),
            createdAt: new Date(post.created_time),
          });
        }
      }

    } catch (error) {
      console.error('Error in fetchFacebookMentions:', error);
    }

    return mentions;
  }

  /**
   * Fetch mentions from LinkedIn
   */
  private async fetchLinkedInMentions(
    userId: string,
    organizationId: string,
    accessToken: string,
    config: MonitoringConfig
  ): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];

    try {
      // LinkedIn doesn't have a direct mentions API
      // We'll check comments on user's posts
      const postsResponse = await fetch(
        'https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:person:YOUR_PERSON_ID)',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      const postsData = await postsResponse.json();

      // This is a placeholder - LinkedIn API requires more complex integration
      console.log('LinkedIn mentions fetching requires additional setup');

    } catch (error) {
      console.error('Error in fetchLinkedInMentions:', error);
    }

    return mentions;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string, keywords: string[]): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }

    return found;
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.toLowerCase()) : [];
  }

  /**
   * Extract mentions from text
   */
  private extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(mention => mention.toLowerCase()) : [];
  }

  /**
   * Calculate priority based on engagement and author metrics
   */
  private calculatePriority(
    tweetMetrics: any,
    authorMetrics: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    const engagement = (tweetMetrics?.like_count || 0) +
                      (tweetMetrics?.reply_count || 0) +
                      (tweetMetrics?.retweet_count || 0);
    const followers = authorMetrics?.followers_count || 0;

    if (engagement > 1000 || followers > 100000) {
      return 'critical';
    } else if (engagement > 100 || followers > 10000) {
      return 'high';
    } else if (engagement > 10 || followers > 1000) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Fetch mentions from all configured platforms
   */
  async fetchAllMentions(
    userId: string,
    organizationId: string,
    platformConnections: any[]
  ): Promise<{ mentions: SocialMention[]; errors: string[] }> {
    const config = await this.getMonitoringConfig(userId, organizationId);
    if (!config || !config.enabled) {
      return { mentions: [], errors: ['Monitoring not enabled'] };
    }

    const allMentions: SocialMention[] = [];
    const errors: string[] = [];

    for (const connection of platformConnections) {
      if (!config.platforms.includes(connection.type)) {
        continue;
      }

      try {
        let mentions: SocialMention[] = [];

        switch (connection.type) {
          case PlatformType.INSTAGRAM:
            mentions = await this.fetchInstagramMentions(userId, organizationId, connection.accessToken, config);
            break;
          case PlatformType.TWITTER:
            mentions = await this.fetchTwitterMentions(userId, organizationId, connection.accessToken, config);
            break;
          case PlatformType.FACEBOOK:
            mentions = await this.fetchFacebookMentions(userId, organizationId, connection.accessToken, config);
            break;
          case PlatformType.LINKEDIN:
            mentions = await this.fetchLinkedInMentions(userId, organizationId, connection.accessToken, config);
            break;
        }

        allMentions.push(...mentions);
      } catch (error) {
        const errorMessage = `Error fetching mentions from ${connection.type}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    return { mentions: allMentions, errors };
  }

  /**
   * Save mentions to Firestore
   */
  async saveMentions(mentions: SocialMention[]): Promise<{ saved: number; errors: string[] }> {
    let saved = 0;
    const errors: string[] = [];

    for (const mention of mentions) {
      try {
        // Check if mention already exists (by platform post ID)
        const firestore = getFirebaseFirestore();
    if (!firestore) {
      return 0;
    }
    const existingQuery = query(
      collection(firestore, this.MENTIONS_COLLECTION),
          where('userId', '==', mention.userId),
          where('source.platformPostId', '==', mention.source.platformPostId),
          firestoreLimit(1)
        );
        const existingDocs = await getDocs(existingQuery);

        if (existingDocs.empty) {
          await addDoc(collection(firestore, this.MENTIONS_COLLECTION), {
            ...mention,
            detectedAt: Timestamp.fromDate(mention.detectedAt),
            createdAt: Timestamp.fromDate(mention.createdAt),
          });
          saved++;
        }
      } catch (error) {
        errors.push(`Error saving mention: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { saved, errors };
  }

  /**
   * Get monitoring configuration
   */
  async getMonitoringConfig(userId: string, organizationId: string): Promise<MonitoringConfig | null> {
    try {
      const configQuery = query(
        collection(firestore, this.CONFIGS_COLLECTION),
        where('userId', '==', userId),
        where('organizationId', '==', organizationId),
        firestoreLimit(1)
      );
      const configDocs = await getDocs(configQuery);

      if (configDocs.empty) {
        return null;
      }

      const configDoc = configDocs.docs[0];
      const data = configDoc.data();

      return {
        id: configDoc.id,
        userId: data.userId,
        organizationId: data.organizationId,
        enabled: data.enabled,
        brandKeywords: data.brandKeywords || [],
        competitorKeywords: data.competitorKeywords || [],
        trackedHashtags: data.trackedHashtags || [],
        customKeywords: data.customKeywords || [],
        platforms: data.platforms || [],
        alertThresholds: data.alertThresholds || {
          highEngagement: 100,
          negativesentiment: -0.5,
          influencerFollowers: 10000,
        },
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error getting monitoring config:', error);
      return null;
    }
  }

  /**
   * Update monitoring configuration
   */
  async updateMonitoringConfig(
    userId: string,
    organizationId: string,
    config: Partial<MonitoringConfig>
  ): Promise<string> {
    try {
      const existingConfig = await this.getMonitoringConfig(userId, organizationId);

      if (existingConfig && existingConfig.id) {
        await updateDoc(doc(firestore, this.CONFIGS_COLLECTION, existingConfig.id), {
          ...config,
          updatedAt: Timestamp.now(),
        });
        return existingConfig.id;
      } else {
        const newConfig = {
          userId,
          organizationId,
          enabled: true,
          brandKeywords: [],
          competitorKeywords: [],
          trackedHashtags: [],
          customKeywords: [],
          platforms: [],
          alertThresholds: {
            highEngagement: 100,
            negativesentiment: -0.5,
            influencerFollowers: 10000,
          },
          ...config,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(firestore, this.CONFIGS_COLLECTION), newConfig);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error updating monitoring config:', error);
      throw new Error('Failed to update monitoring configuration');
    }
  }

  /**
   * Get mentions with filtering
   */
  async getMentions(
    userId: string,
    organizationId: string,
    options: FetchMentionsOptions = {}
  ): Promise<SocialMention[]> {
    try {
      let mentionsQuery = query(
        collection(firestore, this.MENTIONS_COLLECTION),
        where('userId', '==', userId),
        where('organizationId', '==', organizationId)
      );

      // Apply filters
      if (options.isRead !== undefined) {
        mentionsQuery = query(mentionsQuery, where('isRead', '==', options.isRead));
      }

      if (options.isStarred !== undefined) {
        mentionsQuery = query(mentionsQuery, where('isStarred', '==', options.isStarred));
      }

      if (options.platforms && options.platforms.length > 0) {
        mentionsQuery = query(mentionsQuery, where('source.platformType', 'in', options.platforms));
      }

      if (options.types && options.types.length > 0) {
        mentionsQuery = query(mentionsQuery, where('type', 'in', options.types));
      }

      if (options.sentiment) {
        mentionsQuery = query(mentionsQuery, where('sentiment', '==', options.sentiment));
      }

      // Order by detected date (newest first)
      mentionsQuery = query(mentionsQuery, orderBy('detectedAt', 'desc'));

      // Apply limit
      if (options.limit) {
        mentionsQuery = query(mentionsQuery, firestoreLimit(options.limit));
      }

      const mentionDocs = await getDocs(mentionsQuery);
      const mentions: SocialMention[] = [];

      mentionDocs.forEach((doc) => {
        const data = doc.data();
        mentions.push({
          id: doc.id,
          userId: data.userId,
          organizationId: data.organizationId,
          type: data.type,
          source: data.source,
          content: data.content,
          keywords: data.keywords || [],
          hashtags: data.hashtags || [],
          mentions: data.mentions || [],
          sentiment: data.sentiment,
          sentimentScore: data.sentimentScore,
          engagementMetrics: data.engagementMetrics,
          isRead: data.isRead,
          isStarred: data.isStarred,
          isArchived: data.isArchived,
          repliedTo: data.repliedTo,
          replyId: data.replyId,
          priority: data.priority,
          detectedAt: data.detectedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          metadata: data.metadata,
        });
      });

      return mentions;
    } catch (error) {
      console.error('Error getting mentions:', error);
      throw new Error('Failed to get mentions');
    }
  }

  /**
   * Get listening statistics
   */
  async getListeningStats(
    userId: string,
    organizationId: string,
    days: number = 7
  ): Promise<ListeningStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const mentions = await this.getMentions(userId, organizationId, {
      startDate,
      limit: 1000,
    });

    // Calculate statistics
    const stats: ListeningStats = {
      totalMentions: mentions.length,
      unreadMentions: mentions.filter(m => !m.isRead).length,
      platformBreakdown: [],
      sentimentBreakdown: {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
      typeBreakdown: [],
      topHashtags: [],
      topKeywords: [],
      recentMentions: mentions.slice(0, 10),
    };

    // Platform breakdown
    const platformCounts: Map<PlatformType, { count: number; sentimentSum: number }> = new Map();
    mentions.forEach(m => {
      const current = platformCounts.get(m.source.platformType) || { count: 0, sentimentSum: 0 };
      platformCounts.set(m.source.platformType, {
        count: current.count + 1,
        sentimentSum: current.sentimentSum + (m.sentimentScore || 0),
      });
    });
    stats.platformBreakdown = Array.from(platformCounts.entries()).map(([platform, data]) => ({
      platform,
      count: data.count,
      avgSentiment: data.count > 0 ? data.sentimentSum / data.count : 0,
    }));

    // Sentiment breakdown
    mentions.forEach(m => {
      if (m.sentiment === 'positive') stats.sentimentBreakdown.positive++;
      else if (m.sentiment === 'negative') stats.sentimentBreakdown.negative++;
      else stats.sentimentBreakdown.neutral++;
    });

    // Type breakdown
    const typeCounts: Map<MentionType, number> = new Map();
    mentions.forEach(m => {
      typeCounts.set(m.type, (typeCounts.get(m.type) || 0) + 1);
    });
    stats.typeBreakdown = Array.from(typeCounts.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    // Top hashtags
    const hashtagCounts: Map<string, { count: number; sentimentSum: number }> = new Map();
    mentions.forEach(m => {
      m.hashtags.forEach(hashtag => {
        const current = hashtagCounts.get(hashtag) || { count: 0, sentimentSum: 0 };
        hashtagCounts.set(hashtag, {
          count: current.count + 1,
          sentimentSum: current.sentimentSum + (m.sentimentScore || 0),
        });
      });
    });
    stats.topHashtags = Array.from(hashtagCounts.entries())
      .map(([hashtag, data]) => ({
        hashtag,
        count: data.count,
        avgSentiment: data.count > 0 ? data.sentimentSum / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top keywords
    const keywordCounts: Map<string, number> = new Map();
    mentions.forEach(m => {
      m.keywords.forEach(keyword => {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      });
    });
    stats.topKeywords = Array.from(keywordCounts.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Mark mention as read
   */
  async markAsRead(mentionId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.MENTIONS_COLLECTION, mentionId), {
        isRead: true,
      });
    } catch (error) {
      console.error('Error marking mention as read:', error);
      throw new Error('Failed to mark mention as read');
    }
  }

  /**
   * Mark mention as starred
   */
  async toggleStar(mentionId: string, isStarred: boolean): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.MENTIONS_COLLECTION, mentionId), {
        isStarred,
      });
    } catch (error) {
      console.error('Error toggling star:', error);
      throw new Error('Failed to toggle star');
    }
  }

  /**
   * Archive mention
   */
  async archiveMention(mentionId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.MENTIONS_COLLECTION, mentionId), {
        isArchived: true,
      });
    } catch (error) {
      console.error('Error archiving mention:', error);
      throw new Error('Failed to archive mention');
    }
  }
}

// Export singleton instance
export const socialListeningService = new SocialListeningService();

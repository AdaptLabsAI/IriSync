import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { firestore } from '../core/firebase';
import { tieredModelRouter, TaskType } from '../ai/models/tiered-model-router';
import { User } from '../core/models/User';
import { logger } from '../logging/logger';

/**
 * Social Listening Configuration
 */
export interface SocialListeningConfig {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  
  // Monitoring keywords
  keywords: {
    brandNames: string[];
    productNames: string[];
    competitorNames: string[];
    industryTerms: string[];
    hashtags: string[];
    customKeywords: string[];
  };
  
  // Platforms to monitor
  platforms: {
    twitter: boolean;
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
    reddit: boolean;
    youtube: boolean;
    tiktok: boolean;
    news: boolean;
    blogs: boolean;
  };
  
  // Filters
  filters: {
    languages: string[];
    countries: string[];
    excludeKeywords: string[];
    minFollowers?: number;
    verified?: boolean;
    sentimentFilter?: 'positive' | 'negative' | 'neutral' | 'all';
  };
  
  // Alerts
  alerts: {
    enabled: boolean;
    channels: ('email' | 'slack' | 'webhook')[];
    triggers: {
      mentionVolume: { threshold: number; timeframe: 'hour' | 'day' };
      sentimentDrop: { threshold: number; timeframe: 'hour' | 'day' };
      viralContent: { threshold: number; metric: 'likes' | 'shares' | 'comments' };
      competitorMention: boolean;
      crisisKeywords: string[];
    };
  };
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Social Mention
 */
export interface SocialMention {
  id: string;
  configId: string;
  organizationId: string;
  
  // Source information
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'reddit' | 'youtube' | 'tiktok' | 'news' | 'blog';
  sourceUrl: string;
  sourceId: string;
  
  // Content
  content: string;
  title?: string;
  author: {
    username: string;
    displayName: string;
    profileUrl?: string;
    avatarUrl?: string;
    verified: boolean;
    followers: number;
  };
  
  // Metadata
  publishedAt: Date;
  language: string;
  country?: string;
  
  // Engagement metrics
  metrics: {
    likes: number;
    shares: number;
    comments: number;
    views?: number;
    reach?: number;
    impressions?: number;
  };
  
  // AI Analysis
  analysis: {
    sentiment: {
      score: number; // -1 to 1
      label: 'positive' | 'negative' | 'neutral';
      confidence: number;
    };
    topics: string[];
    keywords: string[];
    entities: Array<{
      name: string;
      type: 'person' | 'organization' | 'location' | 'product' | 'other';
      confidence: number;
    }>;
    intent: 'complaint' | 'praise' | 'question' | 'recommendation' | 'neutral';
    urgency: 'low' | 'medium' | 'high' | 'critical';
    category: string;
  };
  
  // Classification
  classification: {
    isRelevant: boolean;
    relevanceScore: number;
    category: 'brand_mention' | 'product_mention' | 'competitor_mention' | 'industry_discussion' | 'other';
    tags: string[];
  };
  
  // Response tracking
  response: {
    status: 'pending' | 'responded' | 'ignored' | 'escalated';
    respondedAt?: Date;
    respondedBy?: string;
    responseContent?: string;
    responseUrl?: string;
  };
  
  // Flags
  flags: {
    isInfluencer: boolean;
    isCustomer: boolean;
    isCompetitor: boolean;
    isCrisis: boolean;
    requiresAction: boolean;
  };
  
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Social Listening Analytics
 */
export interface SocialListeningAnalytics {
  timeframe: {
    start: Date;
    end: Date;
  };
  
  // Volume metrics
  volume: {
    total: number;
    byPlatform: Record<string, number>;
    byDay: Array<{ date: string; count: number }>;
    growth: number; // percentage change
  };
  
  // Sentiment analysis
  sentiment: {
    overall: {
      score: number;
      distribution: {
        positive: number;
        negative: number;
        neutral: number;
      };
    };
    byPlatform: Record<string, {
      score: number;
      distribution: { positive: number; negative: number; neutral: number };
    }>;
    trend: Array<{ date: string; score: number }>;
  };
  
  // Engagement metrics
  engagement: {
    totalReach: number;
    totalEngagement: number;
    averageEngagement: number;
    topPosts: Array<{
      id: string;
      content: string;
      platform: string;
      engagement: number;
      url: string;
    }>;
  };
  
  // Topics and themes
  topics: Array<{
    name: string;
    count: number;
    sentiment: number;
    growth: number;
  }>;
  
  // Influencers and key voices
  influencers: Array<{
    username: string;
    platform: string;
    followers: number;
    mentions: number;
    sentiment: number;
    reach: number;
  }>;
  
  // Competitor analysis
  competitors: Array<{
    name: string;
    mentions: number;
    sentiment: number;
    shareOfVoice: number;
  }>;
  
  // Crisis indicators
  crisisIndicators: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    indicators: Array<{
      type: string;
      description: string;
      severity: number;
    }>;
  };
}

/**
 * Alert Configuration
 */
export interface AlertRule {
  id: string;
  configId: string;
  name: string;
  description?: string;
  
  conditions: {
    type: 'volume' | 'sentiment' | 'keyword' | 'influencer' | 'engagement';
    operator: 'greater_than' | 'less_than' | 'equals' | 'contains';
    value: number | string;
    timeframe?: 'hour' | 'day' | 'week';
  }[];
  
  actions: {
    type: 'email' | 'slack' | 'webhook' | 'sms';
    target: string;
    template?: string;
  }[];
  
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Twitter API response interfaces
interface TwitterUser {
  id: string;
  username: string;
  name: string;
  verified?: boolean;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  lang: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
    impression_count?: number;
  };
}

interface TwitterAPIResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

/**
 * Social Listening Service
 * Monitors mentions and brand conversations across platforms with AI-powered analysis
 */
export class SocialListeningService {
  private static instance: SocialListeningService;
  
  private constructor() {}
  
  public static getInstance(): SocialListeningService {
    if (!SocialListeningService.instance) {
      SocialListeningService.instance = new SocialListeningService();
    }
    return SocialListeningService.instance;
  }
  
  /**
   * Create social listening configuration
   */
  async createConfig(
    configData: Omit<SocialListeningConfig, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<SocialListeningConfig> {
    try {
      const configRef = doc(collection(firestore, 'socialListeningConfigs'));
      
      const newConfig: SocialListeningConfig = {
        ...configData,
        id: configRef.id,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(configRef, {
        ...newConfig,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      logger.info('Social listening config created', {
        configId: newConfig.id,
        organizationId: configData.organizationId,
        userId
      });
      
      return newConfig;
    } catch (error) {
      logger.error('Error creating social listening config', { error, userId });
      throw error;
    }
  }
  
  /**
   * Get social listening configurations
   */
  async getConfigs(organizationId: string): Promise<SocialListeningConfig[]> {
    try {
      const q = query(
        collection(firestore, 'socialListeningConfigs'),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as SocialListeningConfig;
      });
    } catch (error) {
      logger.error('Error getting social listening configs', { error, organizationId });
      throw error;
    }
  }
  
  /**
   * Fetch mentions from platforms (simulated implementation)
   */
  async fetchMentions(configId: string, user?: User): Promise<SocialMention[]> {
    try {
      const configDoc = await getDoc(doc(firestore, 'socialListeningConfigs', configId));
      if (!configDoc.exists()) {
        throw new Error('Configuration not found');
      }
      
      const config = configDoc.data() as SocialListeningConfig;
      const mentions: SocialMention[] = [];
      
      // Simulate fetching from different platforms
      for (const [platform, enabled] of Object.entries(config.platforms)) {
        if (enabled) {
          const platformMentions = await this.fetchFromPlatform(
            platform as keyof SocialListeningConfig['platforms'],
            config,
            user
          );
          mentions.push(...platformMentions);
        }
      }
      
      // Save mentions to database
      for (const mention of mentions) {
        await this.saveMention(mention);
      }
      
      logger.info('Mentions fetched', {
        configId,
        mentionCount: mentions.length
      });
      
      return mentions;
    } catch (error) {
      logger.error('Error fetching mentions', { error, configId });
      throw error;
    }
  }
  
  /**
   * Fetch mentions from a specific platform (PRODUCTION IMPLEMENTATION)
   */
  private async fetchFromPlatform(
    platform: keyof SocialListeningConfig['platforms'],
    config: SocialListeningConfig,
    user?: User
  ): Promise<SocialMention[]> {
    logger.info('Fetching real mentions from platform', { platform, configId: config.id });
    
    const mentions: SocialMention[] = [];
    const allKeywords = [
      ...config.keywords.brandNames,
      ...config.keywords.productNames,
      ...config.keywords.hashtags,
      ...config.keywords.customKeywords
    ];
    
    try {
      switch (platform) {
        case 'twitter':
          return await this.fetchTwitterMentions(allKeywords, config, user);
        
        case 'facebook':
          return await this.fetchFacebookMentions(allKeywords, config, user);
        
        case 'instagram':
          return await this.fetchInstagramMentions(allKeywords, config, user);
        
        case 'linkedin':
          return await this.fetchLinkedInMentions(allKeywords, config, user);
        
        case 'reddit':
          return await this.fetchRedditMentions(allKeywords, config, user);
        
        case 'youtube':
          return await this.fetchYouTubeMentions(allKeywords, config, user);
        
        case 'tiktok':
          return await this.fetchTikTokMentions(allKeywords, config, user);
        
        default:
          logger.warn('Platform not supported for real-time monitoring', { platform });
          return [];
      }
    } catch (error) {
      logger.error('Error fetching real platform mentions', { platform, error });
      throw error;
    }
  }

  /**
   * Fetch Twitter mentions using Twitter API v2
   */
  private async fetchTwitterMentions(
    keywords: string[],
    config: SocialListeningConfig,
    user?: User
  ): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];
    
    try {
      // Get Twitter API credentials from environment
      const bearerToken = process.env.TWITTER_BEARER_TOKEN;
      if (!bearerToken) {
        logger.warn('Twitter Bearer Token not configured');
        return [];
      }

      // Build search query
      const query = keywords.map(keyword => `"${keyword}"`).join(' OR ');
      const excludeKeywords = config.filters.excludeKeywords.map(kw => `-"${kw}"`).join(' ');
      const fullQuery = `${query} ${excludeKeywords} -is:retweet lang:${config.filters.languages.join(' OR lang:')}`;

      // Twitter API v2 search endpoint
      const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(fullQuery)}&max_results=100&tweet.fields=created_at,author_id,public_metrics,lang,context_annotations&expansions=author_id&user.fields=username,name,verified,public_metrics`, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
      }

      const data: TwitterAPIResponse = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        const users: TwitterUser[] = data.includes?.users || [];
        const userMap = new Map(users.map((u: TwitterUser) => [u.id, u]));

        for (const tweet of data.data) {
          const author: TwitterUser | undefined = userMap.get(tweet.author_id);
          if (!author || !author.public_metrics) continue;

          // Apply follower filter if specified
          if (config.filters.minFollowers && author.public_metrics.followers_count < config.filters.minFollowers) {
            continue;
          }

          // Apply verified filter if specified
          if (config.filters.verified !== undefined && author.verified !== config.filters.verified) {
            continue;
          }

          // Analyze content with AI
          const analysis = await this.analyzeContent(tweet.text, user);

          const mention: SocialMention = {
            id: `twitter_${tweet.id}`,
            configId: config.id,
            organizationId: config.organizationId,
            platform: 'twitter',
            sourceUrl: `https://twitter.com/${author.username}/status/${tweet.id}`,
            sourceId: tweet.id,
            content: tweet.text,
            author: {
              username: author.username || 'unknown',
              displayName: author.name || 'Unknown User',
              profileUrl: `https://twitter.com/${author.username || 'unknown'}`,
              verified: author.verified || false,
              followers: author.public_metrics.followers_count || 0
            },
            publishedAt: new Date(tweet.created_at),
            language: tweet.lang || 'en',
            metrics: {
              likes: tweet.public_metrics?.like_count || 0,
              shares: tweet.public_metrics?.retweet_count || 0,
              comments: tweet.public_metrics?.reply_count || 0,
              views: tweet.public_metrics?.impression_count || 0
            },
            analysis,
            classification: {
              isRelevant: analysis.sentiment.score > -0.5,
              relevanceScore: this.calculateRelevanceScore(tweet.text, keywords),
              category: this.classifyMention(tweet.text, config),
              tags: this.extractMatchingKeywords(tweet.text, keywords)
            },
            response: {
              status: 'pending'
            },
            flags: {
              isInfluencer: author.public_metrics.followers_count > 10000,
              isCustomer: this.isLikelyCustomer(tweet.text, config),
              isCompetitor: this.isCompetitorMention(tweet.text, config),
              isCrisis: analysis.urgency === 'critical',
              requiresAction: analysis.urgency === 'high' || analysis.urgency === 'critical'
            },
            fetchedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          mentions.push(mention);
        }
      }

      logger.info('Successfully fetched Twitter mentions', { count: mentions.length });
      return mentions;
    } catch (error) {
      logger.error('Error fetching Twitter mentions', { error });
      return [];
    }
  }

  /**
   * Fetch Facebook mentions using Graph API
   */
  private async fetchFacebookMentions(
    keywords: string[],
    config: SocialListeningConfig,
    user?: User
  ): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];
    
    try {
      // Note: Facebook Graph API has limited public search capabilities
      // This would typically require page access tokens for page mentions
      logger.info('Facebook mention monitoring requires page-specific access tokens');
      
      // For now, return empty array as Facebook public search is very limited
      // In production, this would integrate with Facebook's limited search APIs
      // or use Facebook's webhook system for page mentions
      
      return mentions;
    } catch (error) {
      logger.error('Error fetching Facebook mentions', { error });
      return [];
    }
  }

  /**
   * Fetch Instagram mentions using Instagram Basic Display API
   */
  private async fetchInstagramMentions(
    keywords: string[],
    config: SocialListeningConfig,
    user?: User
  ): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];
    
    try {
      // Note: Instagram API has very limited public search capabilities
      // This would typically require business account access for hashtag searches
      logger.info('Instagram mention monitoring requires business account access');
      
      // For now, return empty array as Instagram public search is very limited
      // In production, this would integrate with Instagram Business API
      // for hashtag and mention monitoring on business accounts
      
      return mentions;
    } catch (error) {
      logger.error('Error fetching Instagram mentions', { error });
      return [];
    }
  }

  /**
   * Fetch LinkedIn mentions using LinkedIn API
   */
  private async fetchLinkedInMentions(
    keywords: string[],
    config: SocialListeningConfig,
    user?: User
  ): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];
    
    try {
      // Note: LinkedIn API has limited public search capabilities
      // This would typically require organization page access for mentions
      logger.info('LinkedIn mention monitoring requires organization page access');
      
      // For now, return empty array as LinkedIn public search is very limited
      // In production, this would integrate with LinkedIn's organization APIs
      // for company page mentions and industry discussions
      
      return mentions;
    } catch (error) {
      logger.error('Error fetching LinkedIn mentions', { error });
      return [];
    }
  }

  /**
   * Fetch Reddit mentions using Reddit API
   */
  private async fetchRedditMentions(
    keywords: string[],
    config: SocialListeningConfig,
    user?: User
  ): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];
    
    try {
      // Reddit has a public search API that can be used
      const query = keywords.join(' OR ');
      const response = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=100&t=week`, {
        headers: {
          'User-Agent': 'IriSync Social Listening Bot 1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.data && data.data.children) {
        for (const post of data.data.children) {
          const postData = post.data;
          
          // Skip if content doesn't match our keywords closely enough
          const relevanceScore = this.calculateRelevanceScore(postData.title + ' ' + postData.selftext, keywords);
          if (relevanceScore < 30) continue;

          // Analyze content with AI
          const content = postData.title + (postData.selftext ? '\n\n' + postData.selftext : '');
          const analysis = await this.analyzeContent(content, user);

          const mention: SocialMention = {
            id: `reddit_${postData.id}`,
            configId: config.id,
            organizationId: config.organizationId,
            platform: 'reddit',
            sourceUrl: `https://reddit.com${postData.permalink}`,
            sourceId: postData.id,
            content,
            title: postData.title,
            author: {
              username: postData.author,
              displayName: postData.author,
              profileUrl: `https://reddit.com/u/${postData.author}`,
              verified: false,
              followers: 0 // Reddit doesn't expose follower counts
            },
            publishedAt: new Date(postData.created_utc * 1000),
            language: 'en', // Reddit API doesn't provide language detection
            metrics: {
              likes: postData.ups || 0,
              shares: 0, // Reddit doesn't track shares
              comments: postData.num_comments || 0,
              views: 0 // Reddit doesn't expose view counts
            },
            analysis,
            classification: {
              isRelevant: relevanceScore > 50,
              relevanceScore,
              category: this.classifyMention(content, config),
              tags: this.extractMatchingKeywords(content, keywords)
            },
            response: {
              status: 'pending'
            },
            flags: {
              isInfluencer: postData.ups > 100,
              isCustomer: this.isLikelyCustomer(content, config),
              isCompetitor: this.isCompetitorMention(content, config),
              isCrisis: analysis.urgency === 'critical',
              requiresAction: analysis.urgency === 'high' || analysis.urgency === 'critical'
            },
            fetchedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          mentions.push(mention);
        }
      }

      logger.info('Successfully fetched Reddit mentions', { count: mentions.length });
      return mentions;
    } catch (error) {
      logger.error('Error fetching Reddit mentions', { error });
      return [];
    }
  }

  /**
   * Fetch YouTube mentions using YouTube Data API
   */
  private async fetchYouTubeMentions(
    keywords: string[],
    config: SocialListeningConfig,
    user?: User
  ): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];
    
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        logger.warn('YouTube API key not configured');
        return [];
      }

      // Search for videos mentioning our keywords
      const query = keywords.join(' OR ');
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=50&order=date&key=${apiKey}`);

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.items && Array.isArray(data.items)) {
        for (const video of data.items) {
          const snippet = video.snippet;
          
          // Get video statistics
          const statsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${video.id.videoId}&key=${apiKey}`);
          const statsData = await statsResponse.json();
          const stats = statsData.items?.[0]?.statistics || {};

          // Analyze content with AI
          const content = snippet.title + '\n\n' + snippet.description;
          const analysis = await this.analyzeContent(content, user);

          const mention: SocialMention = {
            id: `youtube_${video.id.videoId}`,
            configId: config.id,
            organizationId: config.organizationId,
            platform: 'youtube',
            sourceUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            sourceId: video.id.videoId,
            content,
            title: snippet.title,
            author: {
              username: snippet.channelTitle,
              displayName: snippet.channelTitle,
              profileUrl: `https://www.youtube.com/channel/${snippet.channelId}`,
              verified: false, // Would need additional API call to check verification
              followers: 0 // Would need additional API call to get subscriber count
            },
            publishedAt: new Date(snippet.publishedAt),
            language: snippet.defaultLanguage || 'en',
            metrics: {
              likes: parseInt(stats.likeCount || '0'),
              shares: 0, // YouTube doesn't expose share count via API
              comments: parseInt(stats.commentCount || '0'),
              views: parseInt(stats.viewCount || '0')
            },
            analysis,
            classification: {
              isRelevant: analysis.sentiment.score > -0.5,
              relevanceScore: this.calculateRelevanceScore(content, keywords),
              category: this.classifyMention(content, config),
              tags: this.extractMatchingKeywords(content, keywords)
            },
            response: {
              status: 'pending'
            },
            flags: {
              isInfluencer: parseInt(stats.viewCount || '0') > 10000,
              isCustomer: this.isLikelyCustomer(content, config),
              isCompetitor: this.isCompetitorMention(content, config),
              isCrisis: analysis.urgency === 'critical',
              requiresAction: analysis.urgency === 'high' || analysis.urgency === 'critical'
            },
            fetchedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          mentions.push(mention);
        }
      }

      logger.info('Successfully fetched YouTube mentions', { count: mentions.length });
      return mentions;
    } catch (error) {
      logger.error('Error fetching YouTube mentions', { error });
      return [];
    }
  }

  /**
   * Fetch TikTok mentions using TikTok API
   */
  private async fetchTikTokMentions(
    keywords: string[],
    config: SocialListeningConfig,
    user?: User
  ): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];
    
    try {
      // Note: TikTok API has limited public search capabilities
      // This would typically require TikTok for Business API access
      logger.info('TikTok mention monitoring requires TikTok for Business API access');
      
      // For now, return empty array as TikTok public search is very limited
      // In production, this would integrate with TikTok's Business API
      // for hashtag and mention monitoring
      
      return mentions;
    } catch (error) {
      logger.error('Error fetching TikTok mentions', { error });
      return [];
    }
  }

  /**
   * Calculate relevance score for content based on keyword matching
   */
  private calculateRelevanceScore(content: string, keywords: string[]): number {
    const contentLower = content.toLowerCase();
    let score = 0;
    let totalKeywords = keywords.length;
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      if (contentLower.includes(keywordLower)) {
        // Exact match gets full points
        score += 100 / totalKeywords;
      } else {
        // Partial match gets partial points
        const words = keywordLower.split(' ');
        const matchedWords = words.filter(word => contentLower.includes(word));
        score += (matchedWords.length / words.length) * (50 / totalKeywords);
      }
    }
    
    return Math.min(100, score);
  }

  /**
   * Extract keywords that actually appear in the content
   */
  private extractMatchingKeywords(content: string, keywords: string[]): string[] {
    const contentLower = content.toLowerCase();
    return keywords.filter(keyword => 
      contentLower.includes(keyword.toLowerCase())
    );
  }

  /**
   * Determine if content is likely from a customer
   */
  private isLikelyCustomer(content: string, config: SocialListeningConfig): boolean {
    const customerIndicators = [
      'bought', 'purchased', 'customer', 'support', 'help',
      'issue', 'problem', 'experience', 'service', 'product'
    ];
    
    const contentLower = content.toLowerCase();
    return customerIndicators.some(indicator => contentLower.includes(indicator));
  }

  /**
   * Determine if content mentions competitors
   */
  private isCompetitorMention(content: string, config: SocialListeningConfig): boolean {
    const contentLower = content.toLowerCase();
    return config.keywords.competitorNames.some(competitor => 
      contentLower.includes(competitor.toLowerCase())
    );
  }
  
  /**
   * Analyze content with AI
   */
  private async analyzeContent(content: string, user?: User): Promise<SocialMention['analysis']> {
    try {
      const prompt = `
        Analyze this social media content for brand monitoring:
        
        CONTENT:
        "${content}"
        
        Please provide:
        1. Sentiment analysis (score from -1 to 1, label, confidence)
        2. Main topics and keywords
        3. Named entities (people, organizations, products, locations)
        4. Intent classification (complaint, praise, question, recommendation, neutral)
        5. Urgency level (low, medium, high, critical)
        6. Content category
        
        Format as JSON:
        {
          "sentiment": {
            "score": 0.3,
            "label": "positive",
            "confidence": 0.85
          },
          "topics": ["customer service", "product quality"],
          "keywords": ["great", "experience", "recommend"],
          "entities": [
            {"name": "iPhone", "type": "product", "confidence": 0.9}
          ],
          "intent": "praise",
          "urgency": "low",
          "category": "product_feedback"
        }
      `;
      
      const result = await tieredModelRouter.routeTask({
        type: TaskType.SENTIMENT_ANALYSIS,
        input: prompt,
        options: {
          temperature: 0.3,
          maxTokens: 500
        }
      }, user);
      
      return JSON.parse(result.output);
    } catch (error) {
      logger.warn('Failed to analyze content with AI', { error });
      
      // Return fallback analysis
      return {
        sentiment: {
          score: 0,
          label: 'neutral',
          confidence: 0.5
        },
        topics: ['general'],
        keywords: [],
        entities: [],
        intent: 'neutral',
        urgency: 'low',
        category: 'general'
      };
    }
  }
  
  /**
   * Classify mention category
   */
  private classifyMention(content: string, config: SocialListeningConfig): SocialMention['classification']['category'] {
    const contentLower = content.toLowerCase();
    
    if (config.keywords.brandNames.some(brand => contentLower.includes(brand.toLowerCase()))) {
      return 'brand_mention';
    }
    
    if (config.keywords.productNames.some(product => contentLower.includes(product.toLowerCase()))) {
      return 'product_mention';
    }
    
    if (config.keywords.competitorNames.some(competitor => contentLower.includes(competitor.toLowerCase()))) {
      return 'competitor_mention';
    }
    
    if (config.keywords.industryTerms.some(term => contentLower.includes(term.toLowerCase()))) {
      return 'industry_discussion';
    }
    
    return 'other';
  }
  
  /**
   * Save mention to database
   */
  private async saveMention(mention: SocialMention): Promise<void> {
    try {
      const mentionRef = doc(collection(firestore, 'socialMentions'));
      
      await setDoc(mentionRef, {
        ...mention,
        id: mentionRef.id,
        publishedAt: Timestamp.fromDate(mention.publishedAt),
        fetchedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      logger.warn('Failed to save mention', { error, mentionId: mention.id });
    }
  }
  
  /**
   * Get mentions for organization
   */
  async getMentions(
    organizationId: string,
    filters: {
      configId?: string;
      platform?: string;
      sentiment?: 'positive' | 'negative' | 'neutral';
      dateRange?: { start: Date; end: Date };
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SocialMention[]> {
    try {
      let q = query(
        collection(firestore, 'socialMentions'),
        where('organizationId', '==', organizationId)
      );
      
      if (filters.configId) {
        q = query(q, where('configId', '==', filters.configId));
      }
      
      if (filters.platform) {
        q = query(q, where('platform', '==', filters.platform));
      }
      
      if (filters.sentiment) {
        q = query(q, where('analysis.sentiment.label', '==', filters.sentiment));
      }
      
      if (filters.dateRange) {
        q = query(
          q,
          where('publishedAt', '>=', Timestamp.fromDate(filters.dateRange.start)),
          where('publishedAt', '<=', Timestamp.fromDate(filters.dateRange.end))
        );
      }
      
      q = query(q, orderBy('publishedAt', 'desc'));
      
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          publishedAt: data.publishedAt?.toDate() || new Date(),
          fetchedAt: data.fetchedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          response: {
            ...data.response,
            respondedAt: data.response?.respondedAt?.toDate()
          }
        } as SocialMention;
      });
    } catch (error) {
      logger.error('Error getting mentions', { error, organizationId });
      throw error;
    }
  }
  
  /**
   * Update mention response status
   */
  async updateMentionResponse(
    mentionId: string,
    response: Partial<SocialMention['response']>,
    userId: string
  ): Promise<void> {
    try {
      const mentionRef = doc(firestore, 'socialMentions', mentionId);
      
      const updateData: any = {
        'response.status': response.status,
        updatedAt: serverTimestamp()
      };
      
      if (response.status === 'responded') {
        updateData['response.respondedAt'] = serverTimestamp();
        updateData['response.respondedBy'] = userId;
        
        if (response.responseContent) {
          updateData['response.responseContent'] = response.responseContent;
        }
        
        if (response.responseUrl) {
          updateData['response.responseUrl'] = response.responseUrl;
        }
      }
      
      await updateDoc(mentionRef, updateData);
      
      logger.info('Mention response updated', {
        mentionId,
        status: response.status,
        userId
      });
    } catch (error) {
      logger.error('Error updating mention response', { error, mentionId, userId });
      throw error;
    }
  }
  
  /**
   * Get social listening analytics
   */
  async getAnalytics(
    organizationId: string,
    timeframe: 'week' | 'month' | 'quarter' = 'month',
    configId?: string
  ): Promise<SocialListeningAnalytics> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
      }
      
      let q = query(
        collection(firestore, 'socialMentions'),
        where('organizationId', '==', organizationId),
        where('publishedAt', '>=', Timestamp.fromDate(startDate)),
        where('publishedAt', '<=', Timestamp.fromDate(endDate))
      );
      
      if (configId) {
        q = query(q, where('configId', '==', configId));
      }
      
      const snapshot = await getDocs(q);
      const mentions = snapshot.docs.map(doc => doc.data() as SocialMention);
      
      // Calculate analytics
      const analytics = this.calculateAnalytics(mentions, startDate, endDate);
      
      return analytics;
    } catch (error) {
      logger.error('Error getting social listening analytics', { error, organizationId });
      throw error;
    }
  }
  
  /**
   * Calculate analytics from mentions
   */
  private calculateAnalytics(
    mentions: SocialMention[],
    startDate: Date,
    endDate: Date
  ): SocialListeningAnalytics {
    const total = mentions.length;
    
    // Volume by platform
    const byPlatform: Record<string, number> = {};
    mentions.forEach(mention => {
      byPlatform[mention.platform] = (byPlatform[mention.platform] || 0) + 1;
    });
    
    // Sentiment analysis
    const sentimentScores = mentions.map(m => m.analysis.sentiment.score);
    const overallSentiment = sentimentScores.length > 0 
      ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length 
      : 0;
    
    const sentimentDistribution = {
      positive: mentions.filter(m => m.analysis.sentiment.label === 'positive').length,
      negative: mentions.filter(m => m.analysis.sentiment.label === 'negative').length,
      neutral: mentions.filter(m => m.analysis.sentiment.label === 'neutral').length
    };
    
    // Top posts by engagement
    const topPosts = mentions
      .sort((a, b) => {
        const aEngagement = a.metrics.likes + a.metrics.shares + a.metrics.comments;
        const bEngagement = b.metrics.likes + b.metrics.shares + b.metrics.comments;
        return bEngagement - aEngagement;
      })
      .slice(0, 10)
      .map(mention => ({
        id: mention.id,
        content: mention.content.substring(0, 100) + '...',
        platform: mention.platform,
        engagement: mention.metrics.likes + mention.metrics.shares + mention.metrics.comments,
        url: mention.sourceUrl
      }));
    
    // Topics analysis
    const topicCounts: Record<string, number> = {};
    mentions.forEach(mention => {
      mention.analysis.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    
    const topics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({
        name,
        count,
        sentiment: mentions
          .filter(m => m.analysis.topics.includes(name))
          .reduce((sum, m) => sum + m.analysis.sentiment.score, 0) / count,
        growth: 0 // Would need historical data
      }));
    
    // Influencers
    const influencerMap: Record<string, any> = {};
    mentions.forEach(mention => {
      if (mention.flags.isInfluencer) {
        const key = `${mention.author.username}_${mention.platform}`;
        if (!influencerMap[key]) {
          influencerMap[key] = {
            username: mention.author.username,
            platform: mention.platform,
            followers: mention.author.followers,
            mentions: 0,
            totalSentiment: 0,
            totalReach: 0
          };
        }
        influencerMap[key].mentions++;
        influencerMap[key].totalSentiment += mention.analysis.sentiment.score;
        influencerMap[key].totalReach += mention.metrics.reach || mention.author.followers;
      }
    });
    
    const influencers = Object.values(influencerMap)
      .map((inf: any) => ({
        ...inf,
        sentiment: inf.totalSentiment / inf.mentions,
        reach: inf.totalReach
      }))
      .sort((a: any, b: any) => b.reach - a.reach)
      .slice(0, 10);
    
    return {
      timeframe: { start: startDate, end: endDate },
      volume: {
        total,
        byPlatform,
        byDay: [], // Would need to group by day
        growth: 0 // Would need historical comparison
      },
      sentiment: {
        overall: {
          score: overallSentiment,
          distribution: sentimentDistribution
        },
        byPlatform: {}, // Would need to calculate per platform
        trend: [] // Would need daily sentiment data
      },
      engagement: {
        totalReach: mentions.reduce((sum, m) => sum + (m.metrics.reach || 0), 0),
        totalEngagement: mentions.reduce((sum, m) => 
          sum + m.metrics.likes + m.metrics.shares + m.metrics.comments, 0),
        averageEngagement: total > 0 ? mentions.reduce((sum, m) => 
          sum + m.metrics.likes + m.metrics.shares + m.metrics.comments, 0) / total : 0,
        topPosts
      },
      topics,
      influencers,
      competitors: [], // Would need competitor analysis
      crisisIndicators: {
        riskLevel: 'low',
        indicators: []
      }
    };
  }
  
  /**
   * Check for crisis indicators
   */
  async checkCrisisIndicators(organizationId: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    indicators: Array<{
      type: string;
      description: string;
      severity: number;
      mentionIds: string[];
    }>;
  }> {
    try {
      // Get recent mentions (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const q = query(
        collection(firestore, 'socialMentions'),
        where('organizationId', '==', organizationId),
        where('publishedAt', '>=', Timestamp.fromDate(oneDayAgo)),
        where('flags.isCrisis', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const crisisMentions = snapshot.docs.map(doc => doc.data() as SocialMention);
      
      const indicators: any[] = [];
      let maxSeverity = 0;
      
      // Check for high volume of negative mentions
      const negativeMentions = crisisMentions.filter(m => 
        m.analysis.sentiment.label === 'negative' && m.analysis.sentiment.score < -0.5
      );
      
      if (negativeMentions.length > 10) {
        const severity = Math.min(100, negativeMentions.length * 5);
        maxSeverity = Math.max(maxSeverity, severity);
        
        indicators.push({
          type: 'negative_volume',
          description: `High volume of negative mentions: ${negativeMentions.length} in 24h`,
          severity,
          mentionIds: negativeMentions.map(m => m.id)
        });
      }
      
      // Check for viral negative content
      const viralNegative = crisisMentions.filter(m => 
        m.analysis.sentiment.label === 'negative' && 
        (m.metrics.likes + m.metrics.shares + m.metrics.comments) > 1000
      );
      
      if (viralNegative.length > 0) {
        const severity = 80;
        maxSeverity = Math.max(maxSeverity, severity);
        
        indicators.push({
          type: 'viral_negative',
          description: `Viral negative content detected: ${viralNegative.length} posts`,
          severity,
          mentionIds: viralNegative.map(m => m.id)
        });
      }
      
      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (maxSeverity >= 90) riskLevel = 'critical';
      else if (maxSeverity >= 70) riskLevel = 'high';
      else if (maxSeverity >= 40) riskLevel = 'medium';
      
      return { riskLevel, indicators };
    } catch (error) {
      logger.error('Error checking crisis indicators', { error, organizationId });
      return { riskLevel: 'low', indicators: [] };
    }
  }
} 
import { 
  AuthState, 
  PlatformCapabilities, 
  PlatformProvider, 
  PlatformProviderConfig, 
  PlatformType 
} from '../PlatformProvider';
import { SocialAccount } from '../models/account';
import { 
  AttachmentType, 
  PlatformPost, 
  PostAttachment,
  PostResponse, 
  PostSchedule
} from '../models/content';
import { PlatformMetrics } from '../models/metrics';
import { withRateLimit } from '../utils/rate-limiter';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Facebook API implementation of the Platform Provider
 * Uses the Facebook Graph API
 */
export class FacebookProvider extends PlatformProvider {
  private apiVersion: string;
  private baseUrl: string;
  
  constructor(config: PlatformProviderConfig, authState?: AuthState) {
    super(config, authState);
    this.apiVersion = config.apiVersion || 'v17.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }
  
  /**
   * Returns the platform type
   */
  getPlatformType(): PlatformType {
    return PlatformType.FACEBOOK;
  }
  
  /**
   * Returns platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return {
      supportsImagePosts: true,
      supportsVideoPosts: true,
      supportsMultipleImages: true,
      supportsScheduling: true,
      supportsThreads: false,
      supportsPolls: false,
      supportsHashtags: true,
      supportsMentions: true,
      maxCharacterCount: 63206, // Facebook's character limit is much higher than Twitter
      maxHashtagCount: 30,
      maxMediaAttachments: 10,
      maxScheduleTimeInDays: 180 // 6 months ahead scheduling
    };
  }
  
  /**
   * Generate OAuth authorization URL for connecting an account
   */
  async getAuthorizationUrl(state: string, codeChallenge?: string): Promise<string> {
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_manage_metadata',
      'public_profile',
      'email'
    ];
    
    return Promise.resolve(`https://www.facebook.com/${this.apiVersion}/dialog/oauth?` +
      `client_id=${encodeURIComponent(this.config.clientId)}` +
      `&redirect_uri=${encodeURIComponent(this.config.redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=${encodeURIComponent(scopes.join(','))}` +
      `&response_type=code`);
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<AuthState> {
    try {
      // Exchange authorization code for access token
      const response = await axios.get(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            redirect_uri: this.config.redirectUri,
            code: code
          }
        }
      );
      
      const data = response.data;
      
      // Exchange short-lived token for long-lived token
      const longLivedResponse = await axios.get(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            fb_exchange_token: data.access_token
          }
        }
      );
      
      const longLivedData = longLivedResponse.data;
      
      // Create auth state
      const authState: AuthState = {
        accessToken: longLivedData.access_token,
        refreshToken: longLivedData.access_token, // Use access token as refresh token for Facebook
        expiresAt: Math.floor(Date.now() / 1000) + longLivedData.expires_in,
        tokenType: 'bearer',
        scope: data.scope?.split(',')
      };
      
      // Update internal auth state
      this.authState = authState;
      
      return authState;
    } catch (error: any) {
      console.error('Error exchanging Facebook code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Refresh the access token if expired
   */
  async refreshAccessToken(): Promise<AuthState> {
    if (!this.authState) {
      throw new Error('No authentication state available');
    }
    
    try {
      // For Facebook, we use the existing token to get a fresh one
      const response = await axios.get(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            fb_exchange_token: this.authState.refreshToken || this.authState.accessToken
          }
        }
      );
      
      const data = response.data;
      
      // Update auth state
      const newAuthState: AuthState = {
        ...this.authState,
        accessToken: data.access_token,
        refreshToken: data.access_token, // Use access token as refresh token
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in
      };
      
      this.authState = newAuthState;
      
      return newAuthState;
    } catch (error: any) {
      console.error('Error refreshing Facebook access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }
  
  /**
   * Check if the provider is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.authState?.accessToken) {
      return false;
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    return this.authState.expiresAt > now;
  }
  
  /**
   * Fetch account details for the authenticated user
   */
  async getAccountDetails(): Promise<SocialAccount> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // First get basic user details
      const userResponse = await axios.get(
        `${this.baseUrl}/me`,
        {
          params: {
            access_token: this.authState!.accessToken,
            fields: 'id,name,email,picture'
          }
        }
      );
      
      const userData = userResponse.data;
      
      // Now get user's Facebook pages
      const pagesResponse = await axios.get(
        `${this.baseUrl}/me/accounts`,
        {
          params: {
            access_token: this.authState!.accessToken,
            fields: 'id,name,access_token,category,picture,fan_count'
          }
        }
      );
      
      // Get user's pages
      const pages = pagesResponse.data.data || [];
      
      // If no pages, just return the user's personal account
      if (pages.length === 0) {
        return {
          id: uuidv4(),
          platformId: userData.id,
          platformType: this.getPlatformType(),
          username: userData.email || userData.name,
          displayName: userData.name,
          profilePictureUrl: userData.picture?.data?.url,
          profileUrl: `https://facebook.com/${userData.id}`,
          isBusinessAccount: false,
          isConnected: true,
          hasValidCredentials: true,
          accountType: 'personal',
          lastConnected: new Date(),
          metadata: {
            hasFacebookPages: false
          }
        };
      }
      
      // Get the current selected page from additional data
      const selectedPageId = this.authState?.additionalData?.selectedPageId;
      const selectedPage = selectedPageId 
        ? pages.find((p: any) => p.id === selectedPageId)
        : pages[0]; // Default to first page if none selected
      
      if (!selectedPage) {
        throw new Error('Selected Facebook page not found');
      }
      
      // Store the selected page info in auth state additional data
      this.authState = {
        ...this.authState!,
        additionalData: {
          ...this.authState?.additionalData,
          selectedPageId: selectedPage.id,
          pageAccessToken: selectedPage.access_token,
          availablePages: pages.map((page: any) => ({
            id: page.id,
            name: page.name,
            category: page.category,
            accessToken: page.access_token,
            followerCount: page.fan_count
          }))
        }
      };
      
      // Return the selected page as the account
      return {
        id: uuidv4(),
        platformId: selectedPage.id,
        platformType: this.getPlatformType(),
        username: selectedPage.name,
        displayName: selectedPage.name,
        profilePictureUrl: selectedPage.picture?.data?.url,
        profileUrl: `https://facebook.com/${selectedPage.id}`,
        isBusinessAccount: true,
        isConnected: true,
        hasValidCredentials: true,
        accountType: 'business',
        followerCount: selectedPage.fan_count,
        lastConnected: new Date(),
        metadata: {
          hasFacebookPages: pages.length > 0,
          pageCategory: selectedPage.category,
          userAccountId: userData.id
        }
      };
    } catch (error) {
      console.error('Error fetching Facebook account details:', error);
      throw new Error('Failed to fetch Facebook account details');
    }
  }
  
  /**
   * Create a post on the platform
   */
  async createPost(post: PlatformPost): Promise<PostResponse> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get the page access token from auth state
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken || this.authState!.accessToken;
      const pageId = this.authState?.additionalData?.selectedPageId;
      
      if (!pageId) {
        throw new Error('No Facebook page selected for posting');
      }
      
      let mediaIds: string[] = [];
      
      // If we have media attachments, upload them first
      if (post.attachments && post.attachments.length > 0) {
        // Upload each attachment and collect media IDs
        const uploadPromises = post.attachments.map(attachment => this.uploadMedia(attachment));
        mediaIds = await Promise.all(uploadPromises);
      }
      
      // Prepare the post data
      const postData: Record<string, any> = {
        message: post.content
      };
      
      // Add media if present
      if (mediaIds.length > 0) {
        if (mediaIds.length === 1) {
          // Single photo or video
          const mediaType = post.attachments![0].type === AttachmentType.VIDEO ? 'video_id' : 'photo_id';
          postData[mediaType] = mediaIds[0];
        } else {
          // Multiple photos in an album
          postData.attached_media = mediaIds.map(id => ({ media_fbid: id }));
        }
      }
      
      // Create the post
      const response = await withRateLimit(
        this.getPlatformType(),
        post.id || 'create-post',
        () => axios.post(
          `${this.baseUrl}/${pageId}/feed`,
          postData,
          {
            params: {
              access_token: pageAccessToken
            }
          }
        )
      );
      
      // Get post ID from response
      const postId = response.data.id;
      
      // Get post details
      const postDetailsResponse = await axios.get(
        `${this.baseUrl}/${postId}`,
        {
          params: {
            access_token: pageAccessToken,
            fields: 'permalink_url,created_time'
          }
        }
      );
      
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: postId,
        status: 'published',
        publishedTime: new Date(postDetailsResponse.data.created_time),
        url: postDetailsResponse.data.permalink_url,
        analytics: {
          likes: 0,
          comments: 0,
          shares: 0
        },
        metadata: {
          content: post.content
        }
      };
    } catch (error) {
      console.error('Error creating Facebook post:', error);
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: '',
        status: 'failed',
        errorMessage: `Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Schedule a post for later publication
   */
  async schedulePost(post: PlatformPost, schedule: PostSchedule): Promise<PostResponse> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get the page access token from auth state
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken || this.authState!.accessToken;
      const pageId = this.authState?.additionalData?.selectedPageId;
      
      if (!pageId) {
        throw new Error('No Facebook page selected for posting');
      }
      
      let mediaIds: string[] = [];
      
      // If we have media attachments, upload them first
      if (post.attachments && post.attachments.length > 0) {
        // Upload each attachment and collect media IDs
        const uploadPromises = post.attachments.map(attachment => this.uploadMedia(attachment));
        mediaIds = await Promise.all(uploadPromises);
      }
      
      // Prepare the post data
      const postData: Record<string, any> = {
        message: post.content,
        published: false,
        scheduled_publish_time: Math.floor(schedule.publishAt.getTime() / 1000)
      };
      
      // Add media if present
      if (mediaIds.length > 0) {
        if (mediaIds.length === 1) {
          // Single photo or video
          const mediaType = post.attachments![0].type === AttachmentType.VIDEO ? 'video_id' : 'photo_id';
          postData[mediaType] = mediaIds[0];
        } else {
          // Multiple photos in an album
          postData.attached_media = mediaIds.map(id => ({ media_fbid: id }));
        }
      }
      
      // Create the scheduled post
      const response = await withRateLimit(
        this.getPlatformType(),
        post.id || 'schedule-post',
        () => axios.post(
          `${this.baseUrl}/${pageId}/feed`,
          postData,
          {
            params: {
              access_token: pageAccessToken
            }
          }
        )
      );
      
      // Get post ID from response
      const postId = response.data.id;
      
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: postId,
        status: 'scheduled',
        scheduledTime: schedule.publishAt,
        metadata: {
          content: post.content,
          scheduledTimezone: schedule.timezone
        }
      };
    } catch (error) {
      console.error('Error scheduling Facebook post:', error);
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: '',
        status: 'failed',
        errorMessage: `Failed to schedule post: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Delete a post from the platform
   */
  async deletePost(postId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get the page access token from auth state
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken || this.authState!.accessToken;
      
      // Delete the post
      await withRateLimit(
        this.getPlatformType(),
        postId,
        () => axios.delete(
          `${this.baseUrl}/${postId}`,
          {
            params: {
              access_token: pageAccessToken
            }
          }
        )
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting Facebook post:', error);
      return false;
    }
  }
  
  /**
   * Get a list of posts for the account
   */
  async getPosts(limit?: number, before?: string, after?: string): Promise<PostResponse[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get the page access token and ID from auth state
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken || this.authState!.accessToken;
      const pageId = this.authState?.additionalData?.selectedPageId;
      
      if (!pageId) {
        throw new Error('No Facebook page selected');
      }
      
      // Prepare the request parameters
      const params: Record<string, any> = {
        access_token: pageAccessToken,
        limit: limit || 25,
        fields: 'id,message,created_time,permalink_url,status_type,type,attachments,likes.summary(true),comments.summary(true),shares'
      };
      
      if (before) {
        params.before = before;
      }
      
      if (after) {
        params.after = after;
      }
      
      // Get posts
      const response = await withRateLimit(
        this.getPlatformType(),
        'get-posts',
        () => axios.get(
          `${this.baseUrl}/${pageId}/posts`,
          { params }
        )
      );
      
      const posts = response.data.data || [];
      
      // Transform the response to our model
      return posts.map((post: any) => ({
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: post.id,
        status: 'published',
        publishedTime: new Date(post.created_time),
        url: post.permalink_url,
        analytics: {
          likes: post.likes?.summary?.total_count || 0,
          comments: post.comments?.summary?.total_count || 0,
          shares: post.shares?.count || 0
        },
        metadata: {
          content: post.message,
          type: post.type,
          statusType: post.status_type,
          hasAttachments: post.attachments ? true : false
        }
      }));
    } catch (error) {
      console.error('Error fetching Facebook posts:', error);
      throw new Error(`Failed to fetch posts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get account metrics and analytics
   */
  async getMetrics(startDate: Date, endDate: Date, metrics?: string[]): Promise<PlatformMetrics> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get the page access token and ID from auth state
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken || this.authState!.accessToken;
      const pageId = this.authState?.additionalData?.selectedPageId;
      
      if (!pageId) {
        throw new Error('No Facebook page selected');
      }
      
      // Format dates for the API
      const since = Math.floor(startDate.getTime() / 1000);
      const until = Math.floor(endDate.getTime() / 1000);
      
      // Get page insights with more comprehensive metrics
      const insightsResponse = await withRateLimit(
        this.getPlatformType(),
        'get-insights',
        () => axios.get(
          `${this.baseUrl}/${pageId}/insights`,
          {
            params: {
              access_token: pageAccessToken,
              metric: 'page_impressions,page_impressions_unique,page_engaged_users,page_fan_adds,page_fan_removes,page_views_total,page_post_engagements,page_video_views,page_actions_post_reactions_total,page_content_activity,page_negative_feedback',
              period: 'day',
              since,
              until
            }
          }
        )
      );
      
      // Get page details for follower count
      const pageResponse = await axios.get(
        `${this.baseUrl}/${pageId}`,
        {
          params: {
            access_token: pageAccessToken,
            fields: 'fan_count,followers_count'
          }
        }
      );
      
      // Get recent posts for more detailed engagement metrics
      const posts = await this.getPosts(30);
      
      // Extract metrics from insights
      const insightsData = insightsResponse.data.data;
      
      const impressions = this.sumMetricValues(insightsData, 'page_impressions');
      const reach = this.sumMetricValues(insightsData, 'page_impressions_unique');
      const engagedUsers = this.sumMetricValues(insightsData, 'page_engaged_users');
      const fanAdds = this.sumMetricValues(insightsData, 'page_fan_adds');
      const fanRemoves = this.sumMetricValues(insightsData, 'page_fan_removes');
      const postEngagements = this.sumMetricValues(insightsData, 'page_post_engagements');
      const totalReactions = this.sumMetricValues(insightsData, 'page_actions_post_reactions_total');
      const videoViews = this.sumMetricValues(insightsData, 'page_video_views');
      const negativeFeedback = this.sumMetricValues(insightsData, 'page_negative_feedback');
      
      // Calculate engagement metrics
      const totalEngagements = posts.reduce((sum, post) => {
        const analytics = post.analytics || {};
        return sum + (analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0);
      }, 0);
      
      const followerCount = pageResponse.data.fan_count || pageResponse.data.followers_count || 0;
      const engagementRate = posts.length > 0 ? totalEngagements / (posts.length * followerCount) : 0;
      
      // Find top posts by engagement and fetch detailed metrics for each
      const topPosts = await Promise.all(
        [...posts]
          .sort((a, b) => {
            const aEngagement = (a.analytics?.likes || 0) + (a.analytics?.comments || 0) + (a.analytics?.shares || 0);
            const bEngagement = (b.analytics?.likes || 0) + (b.analytics?.comments || 0) + (b.analytics?.shares || 0);
            return bEngagement - aEngagement;
          })
          .slice(0, 5)
          .map(async post => {
            // Fetch additional metrics for top posts
            try {
              const postInsights = await axios.get(
                `${this.baseUrl}/${post.platformPostId}/insights`,
                {
                  params: {
                    access_token: pageAccessToken,
                    metric: 'post_impressions,post_impressions_unique,post_reactions_by_type_total,post_video_views,post_video_complete_views,post_clicks,post_engaged_users'
                  }
                }
              );
              
              // Extract metrics from insights
              let reach = 0;
              let impressions = 0;
              let videoViews = 0;
              let videoCompletions = 0;
              let clicks = 0;
              let engagedUsers = 0;
              let reactionsByType: Record<string, number> = {};
              
              if (postInsights.data && postInsights.data.data) {
                const postMetrics = postInsights.data.data;
                
                // Find impressions (total views)
                const impressionsMetric = postMetrics.find((m: any) => m.name === 'post_impressions');
                if (impressionsMetric && impressionsMetric.values && impressionsMetric.values.length > 0) {
                  impressions = impressionsMetric.values[0].value || 0;
                }
                
                // Find reach (unique viewers)
                const reachMetric = postMetrics.find((m: any) => m.name === 'post_impressions_unique');
                if (reachMetric && reachMetric.values && reachMetric.values.length > 0) {
                  reach = reachMetric.values[0].value || 0;
                }
                
                // Find video views if available
                const videoViewsMetric = postMetrics.find((m: any) => m.name === 'post_video_views');
                if (videoViewsMetric && videoViewsMetric.values && videoViewsMetric.values.length > 0) {
                  videoViews = videoViewsMetric.values[0].value || 0;
                }
                
                // Find video completion views if available
                const videoCompletionsMetric = postMetrics.find((m: any) => m.name === 'post_video_complete_views');
                if (videoCompletionsMetric && videoCompletionsMetric.values && videoCompletionsMetric.values.length > 0) {
                  videoCompletions = videoCompletionsMetric.values[0].value || 0;
                }
                
                // Find post clicks
                const clicksMetric = postMetrics.find((m: any) => m.name === 'post_clicks');
                if (clicksMetric && clicksMetric.values && clicksMetric.values.length > 0) {
                  clicks = clicksMetric.values[0].value || 0;
                }
                
                // Find engaged users
                const engagedUsersMetric = postMetrics.find((m: any) => m.name === 'post_engaged_users');
                if (engagedUsersMetric && engagedUsersMetric.values && engagedUsersMetric.values.length > 0) {
                  engagedUsers = engagedUsersMetric.values[0].value || 0;
                }
                
                // Find reactions by type
                const reactionsByTypeMetric = postMetrics.find((m: any) => m.name === 'post_reactions_by_type_total');
                if (reactionsByTypeMetric && reactionsByTypeMetric.values && reactionsByTypeMetric.values.length > 0) {
                  reactionsByType = reactionsByTypeMetric.values[0].value || {};
                }
              }
              
              return {
                postId: post.platformPostId,
                engagements: (post.analytics?.likes || 0) + (post.analytics?.comments || 0) + (post.analytics?.shares || 0),
                reach,
                impressions,
                url: post.url,
                publishedTime: post.publishedTime,
                detailedAnalytics: {
                  videoViews,
                  videoCompletions,
                  clicks,
                  engagedUsers,
                  reactionsByType
                }
              };
            } catch (error) {
              console.warn(`Could not fetch insights for post ${post.platformPostId}:`, error);
              // Return default values if fetching insights fails
              return {
                postId: post.platformPostId,
                engagements: (post.analytics?.likes || 0) + (post.analytics?.comments || 0) + (post.analytics?.shares || 0),
                reach: 0,
                impressions: 0,
                url: post.url,
                publishedTime: post.publishedTime
              };
            }
          })
      );
      
      // Calculate averages for posts
      const totalReach = topPosts.reduce((sum, post) => sum + (post.reach || 0), 0);
      const totalImpressions = topPosts.reduce((sum, post) => sum + (post.impressions || 0), 0);
      
      const averageReachPerPost = topPosts.length > 0 ? totalReach / topPosts.length : 0;
      const averageImpressionsPerPost = topPosts.length > 0 ? totalImpressions / topPosts.length : 0;
      
      return {
        platformType: this.getPlatformType(),
        accountId: pageId,
        period: 'custom',
        startDate,
        endDate,
        engagement: {
          likes: posts.reduce((sum, post) => sum + (post.analytics?.likes || 0), 0),
          comments: posts.reduce((sum, post) => sum + (post.analytics?.comments || 0), 0),
          shares: posts.reduce((sum, post) => sum + (post.analytics?.shares || 0), 0),
          reactions: { total: totalReactions },
          videoViews,
          clicks: 0, // Not available at account level
          totalEngagements: postEngagements || totalEngagements,
          engagementRate
        },
        audience: {
          followers: followerCount,
          followersGained: fanAdds,
          followersLost: fanRemoves,
          followersNetGrowth: fanAdds - fanRemoves,
          followersGrowthRate: followerCount > 0 ? (fanAdds - fanRemoves) / followerCount : 0,
          reach,
          impressions,
          profileViews: this.sumMetricValues(insightsData, 'page_views_total')
        },
        content: {
          topPosts,
          postCount: posts.length,
          averageEngagementPerPost: posts.length > 0 ? totalEngagements / posts.length : 0,
          averageReachPerPost,
          averageImpressionsPerPost
        },
        metadata: {
          insightsData,
          negativeFeedback
        }
      };
    } catch (error) {
      console.error('Error fetching Facebook metrics:', error);
      throw new Error(`Failed to fetch metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Helper method to sum metric values from FB insights
   */
  private sumMetricValues(insightsData: any[], metricName: string): number {
    const metric = insightsData.find(d => d.name === metricName);
    if (!metric || !metric.values) return 0;
    
    return metric.values.reduce((sum: number, value: any) => {
      return sum + (value.value || 0);
    }, 0);
  }
  
  /**
   * Upload media to the platform
   */
  async uploadMedia(media: PostAttachment): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get the page access token from auth state
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken || this.authState!.accessToken;
      const pageId = this.authState?.additionalData?.selectedPageId;
      
      if (!pageId) {
        throw new Error('No Facebook page selected for media upload');
      }
      
      let uploadEndpoint: string;
      let mediaData: Buffer;
      
      // Get the actual media data
      if (media.buffer) {
        mediaData = media.buffer;
      } else if (media.url) {
        const response = await axios.get(media.url, { responseType: 'arraybuffer' });
        mediaData = response.data;
      } else {
        throw new Error('No media data available for upload');
      }
      
      // Determine upload endpoint based on media type
      if (media.type === AttachmentType.VIDEO) {
        uploadEndpoint = `${this.baseUrl}/${pageId}/videos`;
      } else {
        uploadEndpoint = `${this.baseUrl}/${pageId}/photos`;
      }
      
      // Create form data for the upload
      const formData = new FormData();
      formData.append('access_token', pageAccessToken);
      formData.append('published', 'false'); // Don't publish immediately
      
      // Add description if available
      if (media.title) {
        formData.append('caption', media.title);
      }
      
      // Add the file with the appropriate content type
      const blob = new Blob([mediaData], { type: media.mimeType });
      
      if (media.type === AttachmentType.VIDEO) {
        formData.append('source', blob);
      } else {
        formData.append('source', blob);
      }
      
      // Upload the media
      const response = await withRateLimit(
        this.getPlatformType(),
        'upload-media',
        () => axios.post(uploadEndpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
      );
      
      // Return the media ID
      return response.data.id;
    } catch (error) {
      console.error('Error uploading media to Facebook:', error);
      throw new Error(`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Test the connection to ensure API credentials are valid
   */
  async testConnection(): Promise<boolean> {
    if (!this.authState?.accessToken) {
      return false;
    }
    
    try {
      // Try to get basic account info to test connection
      await axios.get(
        `${this.baseUrl}/me`,
        {
          params: {
            access_token: this.authState.accessToken,
            fields: 'id'
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error testing Facebook connection:', error);
      return false;
    }
  }
  
  /**
   * Revoke authentication tokens
   */
  async revokeTokens(): Promise<boolean> {
    if (!this.authState?.accessToken) {
      return true; // Nothing to revoke
    }
    
    try {
      // Revoke the access token
      await axios.delete(
        `${this.baseUrl}/me/permissions`,
        {
          params: {
            access_token: this.authState.accessToken
          }
        }
      );
      
      // Clear auth state
      this.authState = undefined;
      
      return true;
    } catch (error) {
      console.error('Error revoking Facebook tokens:', error);
      return false;
    }
  }
} 
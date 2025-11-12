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
 * Instagram API implementation of the Platform Provider
 * Uses the Instagram Graph API via Facebook
 */
export class InstagramProvider extends PlatformProvider {
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
    return PlatformType.INSTAGRAM;
  }
  
  /**
   * Returns platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return {
      supportsImagePosts: true,
      supportsVideoPosts: true,
      supportsMultipleImages: true, // Instagram supports carousels
      supportsScheduling: false, // Instagram Graph API doesn't support native scheduling
      supportsThreads: false,
      supportsPolls: false, 
      supportsHashtags: true,
      supportsMentions: true,
      maxCharacterCount: 2200, // Instagram caption limit
      maxHashtagCount: 30,
      maxMediaAttachments: 10, // Instagram supports up to 10 images in a carousel
      maxScheduleTimeInDays: 0 // No native scheduling
    };
  }
  
  /**
   * Generate OAuth authorization URL for connecting an account
   */
  async getAuthorizationUrl(state: string, codeChallenge?: string): Promise<string> {
    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
      'public_profile'
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
        refreshToken: longLivedData.access_token, // Use access token as refresh token for Facebook/Instagram
        expiresAt: Math.floor(Date.now() / 1000) + longLivedData.expires_in,
        tokenType: 'bearer',
        scope: data.scope?.split(',')
      };
      
      // Update internal auth state
      this.authState = authState;
      
      return authState;
    } catch (error: any) {
      console.error('Error exchanging Instagram code for token:', error.response?.data || error.message);
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
      // For Instagram/Facebook, we use the existing token to get a fresh one
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
      console.error('Error refreshing Instagram access token:', error.response?.data || error.message);
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
            fields: 'id,name,email'
          }
        }
      );
      
      const userData = userResponse.data;
      
      // Now get user's Facebook pages that have Instagram accounts
      const pagesResponse = await axios.get(
        `${this.baseUrl}/me/accounts`,
        {
          params: {
            access_token: this.authState!.accessToken,
            fields: 'instagram_business_account,name,access_token,picture,id'
          }
        }
      );
      
      // Get Facebook pages with Instagram accounts
      const pages = pagesResponse.data.data || [];
      const instagramAccounts = [];
      
      for (const page of pages) {
        if (page.instagram_business_account) {
          // Get Instagram business account details
          const instagramId = page.instagram_business_account.id;
          
          try {
            const instagramResponse = await axios.get(
              `${this.baseUrl}/${instagramId}`,
              {
                params: {
                  access_token: page.access_token,
                  fields: 'id,username,profile_picture_url,name,biography,website,followers_count,follows_count,media_count'
                }
              }
            );
            
            const instagramData = instagramResponse.data;
            
            instagramAccounts.push({
              id: instagramData.id,
              name: instagramData.name || page.name,
              username: instagramData.username,
              profilePictureUrl: instagramData.profile_picture_url,
              pageId: page.id,
              pageAccessToken: page.access_token,
              pageName: page.name,
              bio: instagramData.biography,
              website: instagramData.website,
              followerCount: instagramData.followers_count,
              followingCount: instagramData.follows_count,
              postCount: instagramData.media_count
            });
          } catch (error) {
            console.warn(`Error fetching details for Instagram account ${instagramId}:`, error);
          }
        }
      }
      
      // If no Instagram accounts, just return an error
      if (instagramAccounts.length === 0) {
        throw new Error('No Instagram business accounts found. Connect an Instagram business account to your Facebook page first.');
      }
      
      // Get the current selected Instagram account from additional data
      const selectedAccountId = this.authState?.additionalData?.selectedInstagramId;
      const selectedAccount = selectedAccountId 
        ? instagramAccounts.find(a => a.id === selectedAccountId)
        : instagramAccounts[0]; // Default to first account if none selected
      
      if (!selectedAccount) {
        throw new Error('Selected Instagram account not found');
      }
      
      // Store the selected account info in auth state additional data
      this.authState = {
        ...this.authState!,
        additionalData: {
          ...this.authState?.additionalData,
          selectedInstagramId: selectedAccount.id,
          instagramUsername: selectedAccount.username,
          pageId: selectedAccount.pageId,
          pageAccessToken: selectedAccount.pageAccessToken,
          availableInstagramAccounts: instagramAccounts
        }
      };
      
      // Return the selected Instagram account
      return {
        id: uuidv4(),
        platformId: selectedAccount.id,
        platformType: this.getPlatformType(),
        username: selectedAccount.username,
        displayName: selectedAccount.name,
        profilePictureUrl: selectedAccount.profilePictureUrl,
        profileUrl: `https://instagram.com/${selectedAccount.username}`,
        bio: selectedAccount.bio,
        isBusinessAccount: true, // Only business accounts can use the API
        isConnected: true,
        hasValidCredentials: true,
        accountType: 'business',
        followerCount: selectedAccount.followerCount,
        followingCount: selectedAccount.followingCount,
        postCount: selectedAccount.postCount,
        lastConnected: new Date(),
        metadata: {
          website: selectedAccount.website,
          facebookPageId: selectedAccount.pageId,
          facebookPageName: selectedAccount.pageName
        }
      };
    } catch (error) {
      console.error('Error fetching Instagram account details:', error);
      throw new Error('Failed to fetch Instagram account details. ' + (error instanceof Error ? error.message : ''));
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
      // Get necessary info from auth state
      const instagramAccountId = this.authState?.additionalData?.selectedInstagramId;
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken;
      const instagramUsername = this.authState?.additionalData?.instagramUsername;
      
      if (!instagramAccountId || !pageAccessToken) {
        throw new Error('Missing Instagram account information');
      }
      
      // Instagram requires at least one media attachment
      if (!post.attachments || post.attachments.length === 0) {
        throw new Error('Instagram posts require at least one media attachment');
      }
      
      let mediaId: string;
      let containerMediaId: string | undefined;
      
      // Check if this is a carousel post
      const isCarousel = post.attachments.length > 1;
      
      if (isCarousel) {
        // Upload each photo for the carousel
        const mediaIds = await Promise.all(
          post.attachments.map(attachment => this.uploadMedia(attachment))
        );
        
        // Create a carousel container
        const carouselResponse = await withRateLimit(
          this.getPlatformType(),
          'create-carousel',
          () => axios.post(
            `${this.baseUrl}/${instagramAccountId}/media`,
            {
              media_type: 'CAROUSEL',
              children: mediaIds,
              caption: post.content
            },
            {
              params: {
                access_token: pageAccessToken
              }
            }
          )
        );
        
        mediaId = carouselResponse.data.id;
      } else {
        // Single photo or video post
        mediaId = await this.uploadMedia(post.attachments[0]);
        
        // Add caption to the media
        if (post.content) {
          await axios.post(
            `${this.baseUrl}/${mediaId}`,
            { caption: post.content },
            {
              params: {
                access_token: pageAccessToken
              }
            }
          );
        }
      }
      
      // Publish the media
      const publishResponse = await withRateLimit(
        this.getPlatformType(),
        'publish-media',
        () => axios.post(
          `${this.baseUrl}/${instagramAccountId}/media_publish`,
          { creation_id: mediaId },
          {
            params: {
              access_token: pageAccessToken
            }
          }
        )
      );
      
      const postId = publishResponse.data.id;
      
      // Get post details
      const postDetailsResponse = await axios.get(
        `${this.baseUrl}/${postId}`,
        {
          params: {
            access_token: pageAccessToken,
            fields: 'permalink,timestamp'
          }
        }
      );
      
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: postId,
        status: 'published',
        publishedTime: new Date(postDetailsResponse.data.timestamp),
        url: postDetailsResponse.data.permalink,
        analytics: {
          likes: 0,
          comments: 0,
          shares: 0
        },
        metadata: {
          content: post.content,
          isCarousel: isCarousel,
          mediaCount: post.attachments.length
        }
      };
    } catch (error) {
      console.error('Error creating Instagram post:', error);
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
      const scheduledId = uuidv4();
      const instagramAccountId = this.authState?.additionalData?.instagramAccountId;
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken;
      
      if (!instagramAccountId || !pageAccessToken) {
        throw new Error('Missing Instagram account information');
      }
      
      // Process media attachments if present
      const mediaData = [];
      
      if (post.attachments && post.attachments.length > 0) {
        // For carousel/multiple images, we need to pre-upload media
        if (post.attachments.length > 1) {
          // Upload each image and collect media IDs
          const mediaIds = [];
          
          for (const attachment of post.attachments) {
            try {
              // Pre-upload media to Instagram
              const mediaId = await this.uploadMedia(attachment);
              mediaIds.push({
                mediaId,
                type: attachment.type,
                url: attachment.url
              });
            } catch (error) {
              console.error('Error pre-uploading media for scheduled post:', error);
              throw new Error(`Failed to pre-upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          
          mediaData.push(...mediaIds);
        } else {
          // For single media posts, store the media information for upload at posting time
          mediaData.push({
            type: post.attachments[0].type,
            url: post.attachments[0].url,
            buffer: post.attachments[0].buffer ? true : false, // Just store if buffer exists, not the buffer itself
            mimeType: post.attachments[0].mimeType
          });
        }
      }

      // Get Firebase Firestore instance from application services
      const response = await fetch('/api/platforms/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduledId,
          platformType: this.getPlatformType(),
          content: post.content,
          platformAccountId: instagramAccountId,
          scheduledTime: schedule.publishAt.toISOString(),
          timezone: schedule.timezone,
          mediaData,
          isCarousel: post.attachments && post.attachments.length > 1,
          hashtags: post.hashtags,
          mentions: post.mentions,
          location: post.location,
          platformSpecificParams: post.platformSpecificParams
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to schedule post: ${response.statusText}`);
      }
      
      // Return a standardized response for the scheduled post
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: scheduledId,
        status: 'scheduled',
        scheduledTime: schedule.publishAt,
        metadata: {
          content: post.content,
          scheduledTimezone: schedule.timezone,
          attachmentCount: post.attachments?.length || 0,
          isCarousel: post.attachments && post.attachments.length > 1
        }
      };
    } catch (error) {
      console.error('Error scheduling Instagram post:', error);
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
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken;
      
      if (!pageAccessToken) {
        throw new Error('Missing page access token');
      }
      
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
      console.error('Error deleting Instagram post:', error);
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
      // Get necessary info from auth state
      const instagramAccountId = this.authState?.additionalData?.selectedInstagramId;
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken;
      
      if (!instagramAccountId || !pageAccessToken) {
        throw new Error('Missing Instagram account information');
      }
      
      // Prepare the request parameters
      const params: Record<string, any> = {
        access_token: pageAccessToken,
        limit: limit || 25,
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_url,media_type},comments_count,like_count'
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
          `${this.baseUrl}/${instagramAccountId}/media`,
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
        publishedTime: new Date(post.timestamp),
        url: post.permalink,
        analytics: {
          likes: post.like_count || 0,
          comments: post.comments_count || 0,
          shares: 0 // Instagram doesn't provide share count
        },
        metadata: {
          content: post.caption,
          mediaType: post.media_type,
          mediaUrl: post.media_url,
          thumbnailUrl: post.thumbnail_url,
          isCarousel: post.media_type === 'CAROUSEL_ALBUM',
          childrenCount: post.children?.data?.length || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching Instagram posts:', error);
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
      // Get necessary info from auth state
      const instagramAccountId = this.authState?.additionalData?.selectedInstagramId;
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken;
      
      if (!instagramAccountId || !pageAccessToken) {
        throw new Error('Missing Instagram account information');
      }
      
      // Format dates for the API
      const since = Math.floor(startDate.getTime() / 1000);
      const until = Math.floor(endDate.getTime() / 1000);
      
      // Get business account insights with comprehensive metrics
      const insightsResponse = await withRateLimit(
        this.getPlatformType(),
        'get-insights',
        () => axios.get(
          `${this.baseUrl}/${instagramAccountId}/insights`,
          {
            params: {
              access_token: pageAccessToken,
              metric: 'impressions,reach,profile_views,follower_count,email_contacts,get_directions_clicks,phone_call_clicks,text_message_clicks,website_clicks',
              period: 'day',
              since: startDate.toISOString().split('T')[0],
              until: endDate.toISOString().split('T')[0]
            }
          }
        )
      );
      
      // Get account details for current follower counts
      const accountResponse = await axios.get(
        `${this.baseUrl}/${instagramAccountId}`,
        {
          params: {
            access_token: pageAccessToken,
            fields: 'followers_count,follows_count,media_count,biography,profile_picture_url,name,username'
          }
        }
      );
      
      // Get historical follower data to track growth
      // We'll fetch data for the 30 days prior to the start date to calculate growth
      const previousDateStart = new Date(startDate.getTime());
      previousDateStart.setDate(previousDateStart.getDate() - 30);
      
      const previousDateEnd = new Date(startDate.getTime());
      previousDateEnd.setDate(previousDateEnd.getDate() - 1);
      
      let previousFollowerCount = 0;
      let followerHistory: { date: Date, count: number }[] = [];
      
      try {
        const previousFollowersResponse = await withRateLimit(
          this.getPlatformType(),
          'get-previous-followers',
          () => axios.get(
            `${this.baseUrl}/${instagramAccountId}/insights`,
            {
              params: {
                access_token: pageAccessToken,
                metric: 'follower_count',
                period: 'day',
                since: previousDateStart.toISOString().split('T')[0],
                until: previousDateEnd.toISOString().split('T')[0]
              }
            }
          )
        );
        
        // Process historical follower data
        const followerData = previousFollowersResponse.data.data.find((d: any) => d.name === 'follower_count');
        if (followerData && followerData.values && followerData.values.length > 0) {
          // Get the last value for growth calculation
          previousFollowerCount = followerData.values[followerData.values.length - 1].value || 0;
          
          // Store daily follower counts for trends
          followerHistory = followerData.values.map((v: any) => ({
            date: new Date(v.end_time),
            count: v.value
          }));
        }
      } catch (error) {
        console.warn('Could not fetch previous follower count:', error);
      }
      
      // Get recent posts for engagement metrics
      const posts = await this.getPosts(50);
      
      // Filter posts within date range
      const postsInRange = posts.filter(post => {
        if (!post.publishedTime) return false;
        return post.publishedTime >= startDate && post.publishedTime <= endDate;
      });
      
      // Get detailed metrics for top posts
      const topPosts = await Promise.all(
        [...postsInRange]
          .sort((a, b) => {
            const aEngagement = (a.analytics?.likes || 0) + (a.analytics?.comments || 0);
            const bEngagement = (b.analytics?.likes || 0) + (b.analytics?.comments || 0);
            return bEngagement - aEngagement;
          })
          .slice(0, 5)
          .map(async post => {
            try {
              // Fetch insights for individual post
              const postInsightsResponse = await withRateLimit(
                this.getPlatformType(),
                `post-insights-${post.platformPostId}`,
                () => axios.get(
                  `${this.baseUrl}/${post.platformPostId}/insights`,
                  {
                    params: {
                      access_token: pageAccessToken,
                      metric: 'impressions,reach,engagement,saved,video_views,shares'
                    }
                  }
                )
              );
              
              let postReach = 0;
              let postImpressions = 0;
              let postSaves = 0;
              let postVideoViews = 0;
              let postShares = 0;
              
              if (postInsightsResponse.data && postInsightsResponse.data.data) {
                const insightsData = postInsightsResponse.data.data;
                
                // Extract each metric systematically
                const extractMetric = (name: string) => {
                  const metric = insightsData.find((d: any) => d.name === name);
                  if (metric && metric.values && metric.values.length > 0) {
                    return metric.values[0].value || 0;
                  }
                  return 0;
                };
                
                postImpressions = extractMetric('impressions');
                postReach = extractMetric('reach');
                postSaves = extractMetric('saved');
                postVideoViews = extractMetric('video_views');
                postShares = extractMetric('shares');
              }
              
              return {
                postId: post.platformPostId,
                engagements: (post.analytics?.likes || 0) + (post.analytics?.comments || 0),
                reach: postReach,
                impressions: postImpressions,
                url: post.url,
                publishedTime: post.publishedTime,
                detailedAnalytics: {
                  saves: postSaves,
                  videoViews: postVideoViews,
                  shares: postShares,
                  mediaType: post.metadata?.mediaType
                }
              };
            } catch (error) {
              console.warn(`Could not fetch insights for Instagram post ${post.platformPostId}:`, error);
              return {
                postId: post.platformPostId,
                engagements: (post.analytics?.likes || 0) + (post.analytics?.comments || 0),
                reach: 0,
                impressions: 0,
                url: post.url,
                publishedTime: post.publishedTime
              };
            }
          })
      );
      
      // Calculate engagement metrics
      const totalLikes = postsInRange.reduce((sum, post) => sum + (post.analytics?.likes || 0), 0);
      const totalComments = postsInRange.reduce((sum, post) => sum + (post.analytics?.comments || 0), 0);
      const totalEngagements = totalLikes + totalComments;
      
      const followerCount = accountResponse.data.followers_count || 0;
      const engagementRate = followerCount > 0 ? totalEngagements / (postsInRange.length * followerCount) : 0;
      
      // Extract metrics from insights
      let reach = 0;
      let impressions = 0;
      let profileViews = 0;
      let websiteClicks = 0;
      let phoneClicks = 0;
      let emailClicks = 0;
      let directionsClicks = 0;
      
      if (insightsResponse.data && insightsResponse.data.data) {
        const insightsData = insightsResponse.data.data;
        
        // Helper function to sum values from a metric
        const sumMetricValues = (metricName: string): number => {
          const metric = insightsData.find((d: any) => d.name === metricName);
          if (!metric || !metric.values) return 0;
          
          return metric.values.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
        };
        
        reach = sumMetricValues('reach');
        impressions = sumMetricValues('impressions');
        profileViews = sumMetricValues('profile_views');
        websiteClicks = sumMetricValues('website_clicks');
        phoneClicks = sumMetricValues('phone_call_clicks');
        emailClicks = sumMetricValues('email_contacts');
        directionsClicks = sumMetricValues('get_directions_clicks');
      }
      
      // Calculate follower growth metrics
      const followersGained = followerCount - previousFollowerCount;
      const followersNetGrowth = followersGained;
      const followersLost = followersGained < 0 ? -followersGained : 0;
      const followersGrowthRate = previousFollowerCount > 0 ? followersGained / previousFollowerCount : 0;
      
      // Calculate average reach and impressions per post
      const postReachValues = topPosts.map(post => post.reach || 0);
      const postImpressionValues = topPosts.map(post => post.impressions || 0);
      
      const averageReachPerPost = postReachValues.length > 0 
        ? postReachValues.reduce((sum, val) => sum + val, 0) / postReachValues.length 
        : 0;
        
      const averageImpressionsPerPost = postImpressionValues.length > 0
        ? postImpressionValues.reduce((sum, val) => sum + val, 0) / postImpressionValues.length
        : 0;
      
      return {
        platformType: this.getPlatformType(),
        accountId: instagramAccountId,
        period: 'custom',
        startDate,
        endDate,
        engagement: {
          likes: totalLikes,
          comments: totalComments,
          shares: 0, // Instagram doesn't have post share metrics in the same way
          totalEngagements,
          engagementRate
        },
        audience: {
          followers: followerCount,
          followersGained: followersGained > 0 ? followersGained : 0,
          followersLost: followersLost,
          followersNetGrowth: followersNetGrowth,
          followersGrowthRate: followersGrowthRate,
          reach,
          impressions,
          profileViews
        },
        content: {
          topPosts,
          postCount: postsInRange.length,
          averageEngagementPerPost: postsInRange.length > 0 ? totalEngagements / postsInRange.length : 0,
          averageReachPerPost,
          averageImpressionsPerPost
        },
        metadata: {
          insights: insightsResponse.data?.data || [],
          followerHistory,
          accountDetails: {
            username: accountResponse.data.username,
            name: accountResponse.data.name,
            profileImage: accountResponse.data.profile_picture_url,
            bio: accountResponse.data.biography
          },
          interactionMetrics: {
            websiteClicks,
            phoneClicks,
            emailClicks,
            directionsClicks
          }
        }
      };
    } catch (error) {
      console.error('Error fetching Instagram metrics:', error);
      throw new Error(`Failed to fetch metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Upload media to the platform
   */
  async uploadMedia(media: PostAttachment): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get the page ID and access token from auth state
      const pageId = this.authState?.additionalData?.selectedPageId;
      const pageAccessToken = this.authState?.additionalData?.pageAccessToken;
      const instagramAccountId = this.authState?.additionalData?.selectedInstagramId;
      
      if (!pageId || !pageAccessToken || !instagramAccountId) {
        throw new Error('Missing required account information');
      }
      
      let mediaUrl = '';
      
      // Handle the various ways media can be provided
      if (media.buffer) {
        // If we have a buffer, we need to handle the binary data
        
        // In a real production implementation, this would upload to a cloud storage
        // service like AWS S3, Azure Blob Storage, or similar, then use the resulting URL
        
        // For this implementation, we'll simulate by checking if there's a URL as fallback
        if (media.url) {
          mediaUrl = media.url;
        } else {
          // In production code, this would integrate with your storage provider
          // Example with AWS S3:
          /*
          const s3 = new AWS.S3();
          const fileExtension = media.mimeType ? media.mimeType.split('/')[1] : 'jpg';
          const key = `uploads/instagram/${Date.now()}-${uuidv4()}.${fileExtension}`;
          
          await s3.putObject({
            Bucket: 'your-media-bucket',
            Key: key,
            Body: media.buffer,
            ContentType: media.mimeType || 'image/jpeg'
          }).promise();
          
          mediaUrl = `https://your-media-bucket.s3.amazonaws.com/${key}`;
          */
          
          throw new Error('Direct buffer uploads are not supported in this implementation. Please provide a URL.');
        }
      } else if (media.url) {
        // Use the URL directly
        mediaUrl = media.url;
      } else if (media.localPath) {
        // In production, this would read from the file system and upload to storage
        throw new Error('Local file uploads are not supported in this implementation. Please provide a URL or buffer.');
      } else {
        throw new Error('No media data available. Provide either a URL, buffer, or local path.');
      }
      
      // Determine the media type
      const isVideo = media.type === AttachmentType.VIDEO;
      const mediaType = isVideo ? 'VIDEO' : 'IMAGE';
      const isCarouselItem = media.metadata?.isCarouselItem === true;
      
      // Parameters for the API call
      const params: Record<string, any> = {
        access_token: pageAccessToken,
        caption: media.title || '',
        is_carousel_item: isCarouselItem,
        media_type: mediaType
      };
      
      // Add the right URL parameter based on media type
      if (isVideo) {
        params.video_url = mediaUrl;
      } else {
        params.image_url = mediaUrl;
      }
      
      // Add alt text if provided
      if (media.altText) {
        params.alt_text = media.altText;
      }
      
      // Create a container for the media on Instagram
      const containerResponse = await withRateLimit(
        this.getPlatformType(),
        'create-container',
        () => axios.post(
          `${this.baseUrl}/${instagramAccountId}/media`,
          null,
          { params }
        )
      );
      
      // For videos, we need to check the status until it's ready
      if (isVideo) {
        const containerCreationId = containerResponse.data.id;
        
        // Poll the status endpoint until the video is ready or fails
        let status = 'IN_PROGRESS';
        const maxAttempts = 60; // 5 minutes (5 seconds interval * 60)
        let attempts = 0;
        
        while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
          // Wait 5 seconds between checks
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Check the status
          const statusResponse = await axios.get(
            `${this.baseUrl}/${containerCreationId}`,
            {
              params: {
                access_token: pageAccessToken,
                fields: 'status_code,status'
              }
            }
          );
          
          status = statusResponse.data.status_code;
          attempts++;
          
          if (status === 'ERROR') {
            throw new Error(`Video processing failed: ${statusResponse.data.status || 'Unknown error'}`);
          }
        }
        
        if (status !== 'FINISHED') {
          throw new Error('Video processing timed out or failed');
        }
      }
      
      return containerResponse.data.id;
    } catch (error) {
      console.error('Error uploading media to Instagram:', error);
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
      console.error('Error testing Instagram connection:', error);
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
      // Revoke the access token (uses Facebook's revocation endpoint)
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
      console.error('Error revoking Instagram tokens:', error);
      return false;
    }
  }
} 
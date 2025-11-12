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
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import FormData from 'form-data';

/**
 * Reddit API implementation of the Platform Provider
 */
export class RedditProvider extends PlatformProvider {
  private baseUrl: string;
  private oauthUrl: string;
  
  constructor(config: PlatformProviderConfig, authState?: AuthState) {
    super(config, authState);
    this.baseUrl = 'https://www.reddit.com/api/v1';
    this.oauthUrl = 'https://oauth.reddit.com/api/v1';
  }
  
  /**
   * Returns the platform type
   */
  getPlatformType(): PlatformType {
    return PlatformType.REDDIT;
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
      supportsPolls: true,
      supportsHashtags: false,
      supportsMentions: true,
      maxCharacterCount: 40000, // Reddit post text limit
      maxHashtagCount: 0,
      maxMediaAttachments: 20, // Reddit gallery limit
      maxScheduleTimeInDays: 90 // Reddit allows scheduling up to 3 months in advance
    };
  }
  
  /**
   * Generate Reddit OAuth authorization URL
   */
  async getAuthorizationUrl(state: string, codeChallenge?: string): Promise<string> {
    const scopes = [
      'identity',
      'edit',
      'read',
      'submit',
      'history',
      'mysubreddits',
      'flair'
    ];
    
    const scopeParam = encodeURIComponent(scopes.join(' '));
    
    return Promise.resolve(
      `${this.baseUrl}/authorize?` +
      `client_id=${encodeURIComponent(this.config.clientId)}` +
      `&response_type=code` +
      `&state=${encodeURIComponent(state)}` +
      `&redirect_uri=${encodeURIComponent(this.config.redirectUri)}` +
      `&duration=permanent` +
      `&scope=${scopeParam}`
    );
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<AuthState> {
    try {
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri
      });
      
      if (codeVerifier) {
        params.append('code_verifier', codeVerifier);
      }
      
      const response = await axios.post(
        `${this.baseUrl}/access_token`,
        params.toString(),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const data = response.data;
      
      // Create auth state
      const authState: AuthState = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        tokenType: data.token_type,
        scope: data.scope?.split(' ')
      };
      
      // Update internal auth state
      this.authState = authState;
      
      return authState;
    } catch (error: any) {
      console.error('Error exchanging Reddit code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Refresh the access token if expired
   */
  async refreshAccessToken(): Promise<AuthState> {
    if (!this.authState?.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.authState.refreshToken
      });
      
      const response = await axios.post(
        `${this.baseUrl}/access_token`,
        params.toString(),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const data = response.data;
      
      // Update auth state
      const authState: AuthState = {
        accessToken: data.access_token,
        refreshToken: this.authState.refreshToken, // Reddit doesn't return a new refresh token
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        tokenType: data.token_type,
        scope: data.scope?.split(' ')
      };
      
      this.authState = authState;
      
      return authState;
    } catch (error: any) {
      console.error('Error refreshing Reddit token:', error.response?.data || error.message);
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
   * Fetch account details
   */
  async getAccountDetails(): Promise<SocialAccount> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get user information
      const userResponse = await axios.get(
        'https://oauth.reddit.com/api/v1/me',
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'User-Agent': 'IriSync/1.0.0'
          }
        }
      );
      
      const userData = userResponse.data;
      
      // Fetch user's subreddits to show where they can post
      const subredditsResponse = await axios.get(
        'https://oauth.reddit.com/subreddits/mine/moderator',
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'User-Agent': 'IriSync/1.0.0'
          }
        }
      );
      
      const subreddits = subredditsResponse.data.data.children.map((child: any) => ({
        id: child.data.id,
        name: child.data.display_name,
        url: `https://www.reddit.com${child.data.url}`,
        icon: child.data.icon_img || child.data.community_icon,
        subscribers: child.data.subscribers
      }));
      
      // Format the response as a SocialAccount
      return {
        id: uuidv4(),
        platformId: userData.id,
        platformType: this.getPlatformType(),
        username: userData.name,
        displayName: userData.name,
        profilePictureUrl: userData.icon_img,
        profileUrl: `https://www.reddit.com/user/${userData.name}`,
        bio: '',
        isBusinessAccount: false,
        isConnected: true,
        hasValidCredentials: true,
        accountType: 'personal',
        followerCount: 0, // Reddit doesn't expose follower count easily
        lastConnected: new Date(),
        metadata: {
          postKarma: userData.link_karma,
          commentKarma: userData.comment_karma,
          totalKarma: userData.total_karma,
          hasPremium: userData.is_gold,
          subreddits: subreddits,
          createdAt: new Date(userData.created_utc * 1000)
        }
      };
    } catch (error) {
      console.error('Error fetching Reddit account details:', error);
      throw new Error('Failed to fetch account details');
    }
  }
  
  /**
   * Upload media to Reddit
   */
  async uploadMedia(media: PostAttachment): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get the media data
      let mediaData: Buffer;
      
      if (media.buffer) {
        mediaData = media.buffer;
      } else if (media.url) {
        // Download the media from URL
        const mediaResponse = await axios.get(media.url, {
          responseType: 'arraybuffer'
        });
        mediaData = Buffer.from(mediaResponse.data);
      } else {
        throw new Error('No media data available. Please provide a URL or buffer.');
      }
      
      // Step 1: Get an upload lease from Reddit
      const leaseResponse = await axios.post(
        'https://oauth.reddit.com/api/media/asset.json',
        new URLSearchParams({
          filepath: `image-${Date.now()}.${media.mimeType?.split('/')[1] || 'jpg'}`
        }),
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'User-Agent': 'IriSync/1.0.0',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const { asset_id, upload_url, upload_lease } = leaseResponse.data.args;
      
      // Step 2: Upload the media to AWS S3
      const formData = new FormData();
      
      // Add each field from the lease
      Object.entries(upload_lease).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      
      // Add the file last with the appropriate content type
      formData.append('file', mediaData, {
        filename: `image-${Date.now()}.${media.mimeType?.split('/')[1] || 'jpg'}`,
        contentType: media.mimeType || 'image/jpeg'
      });
      
      // Upload to S3
      await axios.post(upload_url, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      
      // Step 3: Return the asset ID for use in posts
      return asset_id;
    } catch (error) {
      console.error('Error uploading media to Reddit:', error);
      throw new Error(`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Create a post with gallery (multiple images)
   */
  private async createGalleryPost(post: PlatformPost): Promise<PostResponse> {
    if (!post.attachments || post.attachments.length < 2) {
      throw new Error('Gallery posts require at least 2 image attachments');
    }
    
    try {
      // Upload each image and collect media IDs
      const mediaPromises = post.attachments.map(attachment => this.uploadMedia(attachment));
      const mediaIds = await Promise.all(mediaPromises);
      
      // Prepare the gallery data
      const itemsJson = mediaIds.map((id, index) => ({
        media_id: id,
        caption: post.attachments?.[index].title || '',
        outbound_url: ''
      }));
      
      // Get subreddit if specified
      const subreddit = post.platformSpecificParams?.subreddit || 'u_me'; // Default to user profile
      
      // Create the gallery post
      const response = await axios.post(
        'https://oauth.reddit.com/api/submit',
        new URLSearchParams({
          api_type: 'json',
          kind: 'image',
          sr: subreddit,
          title: post.title || post.content.substring(0, 100), // Reddit requires a title
          items: JSON.stringify(itemsJson),
          text: post.content || '',
          validate_on_submit: 'true'
        }),
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'User-Agent': 'IriSync/1.0.0',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const postData = response.data.json.data;
      
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: postData.id,
        status: 'published',
        publishedTime: new Date(),
        url: postData.url
      };
    } catch (error) {
      console.error('Error creating Reddit gallery post:', error);
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: '',
        status: 'failed',
        errorMessage: `Failed to create gallery post: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      // Get subreddit if specified
      const subreddit = post.platformSpecificParams?.subreddit || 'u_me'; // Default to user profile
      
      // Calculate the timestamp for scheduling (UTC timestamp in seconds)
      const scheduledTimeUtc = Math.floor(schedule.publishAt.getTime() / 1000);
      
      // Check if this is a gallery post
      const isGallery = post.attachments && post.attachments.length > 1;
      
      // For gallery posts, we need to pre-upload media
      let mediaIds: string[] = [];
      let postType = 'self'; // Default to text post
      let mediaUrl = '';
      
      if (post.attachments && post.attachments.length > 0) {
        // Determine post type
        if (isGallery) {
          postType = 'image'; // For galleries
          // Upload each image and collect media IDs
          const mediaPromises = post.attachments.map(attachment => this.uploadMedia(attachment));
          mediaIds = await Promise.all(mediaPromises);
        } else {
          // Single image or link
          const attachment = post.attachments[0];
          
          if (attachment.type === AttachmentType.IMAGE || attachment.type === AttachmentType.VIDEO) {
            // Upload media and get ID
            const mediaId = await this.uploadMedia(attachment);
            mediaIds = [mediaId];
            postType = attachment.type === AttachmentType.IMAGE ? 'image' : 'video';
          } else if (attachment.type === AttachmentType.LINK) {
            // Link post
            postType = 'link';
            mediaUrl = attachment.url || '';
          }
        }
      }
      
      // Build the scheduling data
      const schedulingData: any = {
        sr: subreddit,
        kind: postType,
        title: post.title || post.content.substring(0, 100), // Reddit requires a title
        text: post.content || '',
        api_type: 'json',
        validate_on_submit: 'true',
        post_to_twitter: false,
        sendreplies: true,
        scheduled_time: scheduledTimeUtc,
        timezone: schedule.timezone
      };
      
      // Add media-specific data based on post type
      if (isGallery) {
        const itemsJson = mediaIds.map((id, index) => ({
          media_id: id,
          caption: post.attachments?.[index].title || '',
          outbound_url: ''
        }));
        schedulingData.items = JSON.stringify(itemsJson);
      } else if (postType === 'image' || postType === 'video') {
        schedulingData.media_id = mediaIds[0];
      } else if (postType === 'link') {
        schedulingData.url = mediaUrl;
      }
      
      // Create the scheduled post
      const response = await axios.post(
        'https://oauth.reddit.com/api/schedule_post',
        new URLSearchParams(schedulingData),
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'User-Agent': 'IriSync/1.0.0',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      // Get the scheduled post ID
      const scheduledId = response.data.json?.data?.scheduled_post_id || uuidv4();
      
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: scheduledId,
        status: 'scheduled',
        scheduledTime: schedule.publishAt,
        metadata: {
          subreddit,
          title: post.title,
          content: post.content,
          postType,
          mediaIds,
          isGallery
        }
      };
    } catch (error) {
      console.error('Error scheduling Reddit post:', error);
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
   * Create a post on the platform
   */
  async createPost(post: PlatformPost): Promise<PostResponse> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Check if this is a gallery post (multiple images)
      if (post.attachments && post.attachments.length > 1) {
        return this.createGalleryPost(post);
      }
      
      // Get subreddit if specified
      const subreddit = post.platformSpecificParams?.subreddit || 'u_me'; // Default to user profile
      
      // Prepare the basic post data
      const postData: Record<string, string> = {
        api_type: 'json',
        sr: subreddit,
        title: post.title || post.content.substring(0, 100), // Reddit requires a title
        validate_on_submit: 'true'
      };
      
      // Determine post type and add type-specific data
      let postKind = 'self'; // Default to text post
      
      if (post.attachments && post.attachments.length === 1) {
        const attachment = post.attachments[0];
        
        if (attachment.type === AttachmentType.IMAGE || attachment.type === AttachmentType.VIDEO) {
          postKind = attachment.type === AttachmentType.IMAGE ? 'image' : 'video';
          
          // Upload media to Reddit and get media ID
          const mediaId = await this.uploadMedia(attachment);
          postData.media_id = mediaId;
        } else if (attachment.type === AttachmentType.LINK) {
          postKind = 'link';
          postData.url = attachment.url || '';
        }
      }
      
      // Set the post kind and content
      postData.kind = postKind;
      
      // Add post text if it's not a link-only post
      if (postKind !== 'link' || post.content) {
        postData.text = post.content || '';
      }
      
      // Create the post
      const response = await axios.post(
        'https://oauth.reddit.com/api/submit',
        new URLSearchParams(postData),
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'User-Agent': 'IriSync/1.0.0',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      // Handle the response
      const responseData = response.data.json.data;
      
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: responseData.id,
        status: 'published',
        publishedTime: new Date(),
        url: responseData.url,
        metadata: {
          title: post.title,
          subreddit,
          postType: postKind
        }
      };
    } catch (error) {
      console.error('Error creating Reddit post:', error);
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
   * Delete a post from the platform
   */
  async deletePost(postId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      await axios.post(
        'https://oauth.reddit.com/api/del',
        new URLSearchParams({
          id: `t3_${postId}`
        }),
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'User-Agent': 'IriSync/1.0.0',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting Reddit post:', error);
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
      const params: Record<string, any> = {
        limit: limit || 25
      };
      
      if (before) {
        params.before = before;
      }
      
      if (after) {
        params.after = after;
      }
      
      const response = await axios.get(
        'https://oauth.reddit.com/user/me/submitted',
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'User-Agent': 'IriSync/1.0.0'
          }
        }
      );
      
      const posts = response.data.data.children || [];
      
      return posts.map((post: any) => ({
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: post.data.id,
        status: 'published',
        publishedTime: new Date(post.data.created_utc * 1000),
        url: `https://www.reddit.com${post.data.permalink}`,
        analytics: {
          likes: post.data.score,
          comments: post.data.num_comments,
          shares: 0 // Reddit doesn't track shares
        }
      }));
    } catch (error) {
      console.error('Error fetching Reddit posts:', error);
      throw new Error('Failed to fetch posts');
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
      // Reddit doesn't have a built-in analytics API
      // We'll fetch user info and posts to build metrics
      const userInfo = await axios.get(
        'https://oauth.reddit.com/api/v1/me',
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'User-Agent': 'IriSync/1.0.0'
          }
        }
      );
      
      const userData = userInfo.data;
      
      // Get posts within the date range
      const posts = await this.getPosts(100); // Get a large sample
      const postsInRange = posts.filter(post => {
        if (!post.publishedTime) return false;
        return post.publishedTime >= startDate && post.publishedTime <= endDate;
      });
      
      // Calculate engagement metrics
      const totalLikes = postsInRange.reduce((sum, post) => sum + (post.analytics?.likes || 0), 0);
      const totalComments = postsInRange.reduce((sum, post) => sum + (post.analytics?.comments || 0), 0);
      
      // Sort posts by engagement to find top posts
      const topPosts = [...postsInRange]
        .sort((a, b) => {
          const engagementA = (a.analytics?.likes || 0) + (a.analytics?.comments || 0);
          const engagementB = (b.analytics?.likes || 0) + (b.analytics?.comments || 0);
          return engagementB - engagementA;
        })
        .slice(0, 5)
        .map(post => ({
          postId: post.platformPostId,
          engagements: (post.analytics?.likes || 0) + (post.analytics?.comments || 0)
        }));
      
      return {
        platformType: this.getPlatformType(),
        accountId: userData.id,
        period: 'custom',
        startDate,
        endDate,
        engagement: {
          likes: totalLikes,
          comments: totalComments,
          shares: 0, // Reddit doesn't track shares
          totalEngagements: totalLikes + totalComments,
          engagementRate: 0 // We don't have audience size to calculate rate
        },
        audience: {
          followers: 0, // Reddit doesn't expose follower count easily
          followersGained: 0, // Not available
          followersLost: 0, // Not available
          followersNetGrowth: 0,
          followersGrowthRate: 0,
          reach: 0, // Not available
          impressions: 0 // Not available
        },
        content: {
          topPosts,
          postCount: postsInRange.length,
          averageEngagementPerPost: postsInRange.length > 0 ? 
            (totalLikes + totalComments) / postsInRange.length : 0
        },
        metadata: {
          totalKarma: userData.total_karma,
          linkKarma: userData.link_karma,
          commentKarma: userData.comment_karma
        }
      };
    } catch (error) {
      console.error('Error fetching Reddit metrics:', error);
      throw new Error('Failed to fetch metrics');
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
      await axios.get(
        'https://oauth.reddit.com/api/v1/me',
        {
          headers: {
            'Authorization': `Bearer ${this.authState.accessToken}`,
            'User-Agent': 'IriSync/1.0.0'
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error testing Reddit connection:', error);
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
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      
      // Revoke the access token
      await axios.post(
        'https://www.reddit.com/api/v1/revoke_token',
        new URLSearchParams({
          token: this.authState.accessToken,
          token_type_hint: 'access_token'
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      // Revoke the refresh token if available
      if (this.authState.refreshToken) {
        await axios.post(
          'https://www.reddit.com/api/v1/revoke_token',
          new URLSearchParams({
            token: this.authState.refreshToken,
            token_type_hint: 'refresh_token'
          }),
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      }
      
      // Clear the auth state
      this.authState = undefined;
      
      return true;
    } catch (error) {
      console.error('Error revoking Reddit tokens:', error);
      return false;
    }
  }
} 
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
  PostSchedule, 
  PostStatus 
} from '../models/content';
import { PlatformMetrics } from '../models/metrics';
import { generateOAuthUrl } from '../auth/oauth';
import { withRateLimit } from '../utils/rate-limiter';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * Mastodon API implementation of the Platform Provider
 */
export class MastodonProvider extends PlatformProvider {
  private baseUrl: string;
  private serverUrl: string;
  
  constructor(config?: PlatformProviderConfig, authState?: AuthState, serverUrl?: string) {
    super(config || {
      clientId: process.env.MASTODON_CLIENT_ID || '',
      clientSecret: process.env.MASTODON_CLIENT_SECRET || '',
      redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=mastodon' || '',
      baseUrl: 'https://mastodon.social'
    }, authState);
    // Default to mastodon.social if no server provided
    this.serverUrl = serverUrl || (config?.baseUrl || 'https://mastodon.social');
    this.baseUrl = `${this.serverUrl}/api/v1`;
  }
  
  /**
   * Returns the platform type
   */
  getPlatformType(): PlatformType {
    return PlatformType.MASTODON;
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
      supportsThreads: true,
      supportsPolls: true,
      supportsHashtags: true,
      supportsMentions: true,
      maxCharacterCount: 500, // Standard Mastodon character limit (can vary by instance)
      maxHashtagCount: 20,
      maxMediaAttachments: 4, // Standard Mastodon attachment limit
      maxScheduleTimeInDays: 365 // Mastodon allows far future scheduling
    };
  }
  
  /**
   * Set the Mastodon server URL
   */
  setServerUrl(url: string): void {
    this.serverUrl = url;
    this.baseUrl = `${url}/api/v1`;
  }
  
  /**
   * Register application with Mastodon server
   * This should be called before initiating the OAuth flow
   */
  async registerApplication(redirectUri: string): Promise<{ clientId: string; clientSecret: string }> {
    try {
      const response = await axios.post(
        `${this.serverUrl}/api/v1/apps`,
        {
          client_name: 'IriSync',
          redirect_uris: redirectUri,
          scopes: 'read write follow push',
          website: 'https://irisync.ai'
        }
      );
      
      return {
        clientId: response.data.client_id,
        clientSecret: response.data.client_secret
      };
    } catch (error) {
      console.error('Error registering application with Mastodon:', error);
      throw new Error('Failed to register application with Mastodon server');
    }
  }
  
  /**
   * Generate authorization URL for OAuth flow
   */
  async getAuthorizationUrl(state: string, codeChallenge?: string): Promise<string> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallengeValue = codeChallenge || this.generateCodeChallenge(codeVerifier);
    
    // Store the code verifier in the state
    const stateObj = {
      originalState: state,
      codeVerifier: codeVerifier,
      serverUrl: this.serverUrl // Store the server URL in the state
    };
    
    // Encode the state object
    const encodedState = Buffer.from(JSON.stringify(stateObj)).toString('base64');
    
    // Ensure we have registered the app
    let clientId = this.config.clientId;
    let clientSecret = this.config.clientSecret;
    
    if (!clientId || !clientSecret) {
      const registration = await this.registerApplication(this.config.redirectUri);
      clientId = registration.clientId;
      clientSecret = registration.clientSecret;
    }
    
    const scopes = [
      'read',
      'write',
      'follow'
    ];
    
    return generateOAuthUrl(
      `${this.serverUrl}/oauth/authorize`,
      clientId,
      this.config.redirectUri,
      encodedState,
      scopes,
      codeChallengeValue,
      {
        response_type: 'code'
      }
    );
  }
  
  /**
   * Generate a code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomBytes = crypto.randomBytes(64);
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(randomBytes[i] % chars.length);
    }
    return result;
  }
  
  /**
   * Generate a code challenge for PKCE
   */
  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest('base64');
    return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<AuthState> {
    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.config.redirectUri
      });
      
      if (codeVerifier) {
        params.append('code_verifier', codeVerifier);
      }
      
      const response = await axios.post(
        `${this.serverUrl}/oauth/token`,
        params.toString(),
        {
          headers: {
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
        scope: data.scope?.split(' '),
        additionalData: {
          serverUrl: this.serverUrl
        }
      };
      
      // Update internal auth state
      this.authState = authState;
      
      return authState;
    } catch (error: any) {
      console.error('Error exchanging Mastodon code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Refresh the access token
   */
  async refreshAccessToken(): Promise<AuthState> {
    if (!this.authState?.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.authState.refreshToken
      });
      
      const response = await axios.post(
        `${this.serverUrl}/oauth/token`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const data = response.data;
      
      // Update auth state
      const authState: AuthState = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.authState.refreshToken,
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        tokenType: data.token_type,
        scope: data.scope?.split(' '),
        additionalData: {
          ...this.authState.additionalData,
          serverUrl: this.serverUrl
        }
      };
      
      this.authState = authState;
      
      return authState;
    } catch (error: any) {
      console.error('Error refreshing Mastodon token:', error.response?.data || error.message);
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
      // Get verified credentials
      const response = await axios.get(
        `${this.baseUrl}/accounts/verify_credentials`,
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`
          }
        }
      );
      
      const account = response.data;
      
      // Format the response as a SocialAccount
      return {
        id: uuidv4(),
        platformId: account.id,
        platformType: this.getPlatformType(),
        username: account.acct,
        displayName: account.display_name || account.username,
        profilePictureUrl: account.avatar,
        profileUrl: account.url,
        bio: account.note,
        isBusinessAccount: false,
        isConnected: true,
        hasValidCredentials: true,
        accountType: 'personal',
        followerCount: account.followers_count,
        followingCount: account.following_count,
        postCount: account.statuses_count,
        lastConnected: new Date(),
        metadata: {
          serverUrl: this.serverUrl,
          fields: account.fields,
          headerImage: account.header,
          emojis: account.emojis,
          locked: account.locked,
          bot: account.bot
        }
      };
    } catch (error) {
      console.error('Error fetching Mastodon account details:', error);
      throw new Error('Failed to fetch account details');
    }
  }
  
  /**
   * Create a post on Mastodon
   */
  async createPost(post: PlatformPost): Promise<PostResponse> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Process media attachments
      const mediaIds: string[] = [];
      
      if (post.attachments && post.attachments.length > 0) {
        for (const attachment of post.attachments) {
          const mediaId = await this.uploadMedia(attachment);
          mediaIds.push(mediaId);
        }
      }
      
      // Create status
      const statusParams: Record<string, any> = {
        status: post.content,
        visibility: post.visibility || 'public'
      };
      
      if (mediaIds.length > 0) {
        statusParams.media_ids = mediaIds;
      }
      
      // Add poll if provided
      if (post.platformSpecificParams?.poll) {
        statusParams.poll = {
          options: post.platformSpecificParams.poll.options,
          expires_in: post.platformSpecificParams.poll.expiresInSeconds || 86400 // Default to 24 hours
        };
        if (post.platformSpecificParams.poll.multipleChoice) {
          statusParams.poll.multiple = true;
        }
      }
      
      // Add language if provided
      if (post.platformSpecificParams?.language) {
        statusParams.language = post.platformSpecificParams.language;
      }
      
      // Create the status
      const response = await axios.post(
        `${this.baseUrl}/statuses`,
        statusParams,
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const status = response.data;
      
      // Format the response
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: status.id,
        url: status.url || status.uri,
        status: 'published' as PostStatus,
        publishedTime: new Date(status.created_at),
        analytics: {
          likes: status.favourites_count || 0,
          comments: status.replies_count || 0,
          shares: status.reblogs_count || 0
        },
        metadata: {
          mastodonData: status
        }
      };
    } catch (error: any) {
      console.error('Error creating Mastodon post:', error.response?.data || error.message);
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        status: 'failed' as PostStatus,
        platformPostId: '',
        errorMessage: error.response?.data?.error || 'Failed to create post'
      };
    }
  }
  
  /**
   * Upload media to Mastodon
   */
  async uploadMedia(attachment: PostAttachment): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const formData = new FormData();
      
      // Process media data
      let buffer: Buffer;
      let filename: string;
      
      if (attachment.buffer) {
        buffer = Buffer.from(attachment.buffer);
        filename = attachment.title || `media_${Date.now()}.${this.getExtensionFromMimeType(attachment.mimeType || 'application/octet-stream')}`;
      } else if (attachment.url) {
        // Download the file
        const tempDir = path.join(os.tmpdir(), 'irisync');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        filename = path.join(tempDir, `media_${Date.now()}.${this.getExtensionFromMimeType(attachment.mimeType || 'application/octet-stream')}`);
        await this.downloadFile(attachment.url, filename);
        
        buffer = fs.readFileSync(filename);
        
        // Clean up temp file after use
        fs.unlinkSync(filename);
      } else {
        throw new Error('No media data available for upload');
      }
      
      // Append the file to the form data
      formData.append('file', buffer, {
        filename: path.basename(attachment.title || `media_${Date.now()}.${this.getExtensionFromMimeType(attachment.mimeType || 'application/octet-stream')}`),
        contentType: attachment.mimeType
      });
      
      // Add description if available
      if (attachment.altText) {
        formData.append('description', attachment.altText);
      }
      
      // Upload the media
      const response = await axios.post(
        `${this.baseUrl}/media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            ...formData.getHeaders()
          }
        }
      );
      
      return response.data.id;
    } catch (error) {
      console.error('Error uploading media to Mastodon:', error);
      throw new Error('Failed to upload media');
    }
  }
  
  /**
   * Helper method to download a file
   */
  private async downloadFile(url: string, destination: string): Promise<void> {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(destination);
    
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }
  
  /**
   * Helper method to get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/mp3': 'mp3',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav'
    };
    
    return mimeMap[mimeType] || 'bin';
  }
  
  /**
   * Schedule a post for later publication
   */
  async schedulePost(post: PlatformPost, schedule: PostSchedule): Promise<PostResponse> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Process media attachments
      const mediaIds: string[] = [];
      
      if (post.attachments && post.attachments.length > 0) {
        for (const attachment of post.attachments) {
          const mediaId = await this.uploadMedia(attachment);
          mediaIds.push(mediaId);
        }
      }
      
      // Create scheduled status
      const statusParams: Record<string, any> = {
        status: post.content,
        visibility: post.visibility || 'public',
        scheduled_at: new Date(schedule.publishAt).toISOString()
      };
      
      if (mediaIds.length > 0) {
        statusParams.media_ids = mediaIds;
      }
      
      // Add poll if provided
      if (post.platformSpecificParams?.poll) {
        statusParams.poll = {
          options: post.platformSpecificParams.poll.options,
          expires_in: post.platformSpecificParams.poll.expiresInSeconds || 86400 // Default to 24 hours
        };
        if (post.platformSpecificParams.poll.multipleChoice) {
          statusParams.poll.multiple = true;
        }
      }
      
      // Add language if provided
      if (post.platformSpecificParams?.language) {
        statusParams.language = post.platformSpecificParams.language;
      }
      
      // Schedule the status
      const response = await axios.post(
        `${this.baseUrl}/statuses`,
        statusParams,
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const status = response.data;
      
      // Format the response
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        status: 'scheduled' as PostStatus,
        url: `${this.serverUrl}/@${status.account.username}/${status.id}`,
        platformPostId: status.id
      };
    } catch (error: any) {
      console.error('Error scheduling Mastodon post:', error.response?.data || error.message);
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        status: 'failed' as PostStatus,
        platformPostId: '',
        errorMessage: error.response?.data?.error || 'Failed to schedule post'
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
      await axios.delete(
        `${this.baseUrl}/statuses/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting Mastodon post:', error);
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
      // Build query parameters
      const params: Record<string, any> = {
        limit: limit || 20
      };
      
      if (before) {
        params.max_id = before;
      }
      
      if (after) {
        params.min_id = after;
      }
      
      // Get user account ID
      const account = await this.getAccountDetails();
      
      // Fetch statuses for the account
      const response = await axios.get(
        `${this.baseUrl}/accounts/${account.platformId}/statuses`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`
          }
        }
      );
      
      // Transform the posts to our format
      return response.data.map((status: any) => ({
        id: uuidv4(),
        platformType: this.getPlatformType(),
        status: 'published' as PostStatus,
        platformPostId: status.id,
        url: status.url,
        publishedAt: new Date(status.created_at),
        platformData: {
          mastodon: {
            visibility: status.visibility,
            sensitive: status.sensitive,
            favouritesCount: status.favourites_count,
            reblogsCount: status.reblogs_count,
            repliesCount: status.replies_count
          }
        }
      }));
    } catch (error) {
      console.error('Error fetching Mastodon posts:', error);
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
      // Mastodon doesn't have a built-in analytics API, so we'll build our own from the available data
      
      // Get account details
      const account = await this.getAccountDetails();
      
      // Get recent posts
      const posts = await this.getPosts(40); // Get a good sample
      
      // Filter posts within the date range
      const postsInRange = posts.filter(post => {
        if (!post.publishedTime) return false;
        return post.publishedTime >= startDate && post.publishedTime <= endDate;
      });
      
      // Calculate engagement metrics
      const totalLikes = postsInRange.reduce((sum, post) => sum + (post.analytics?.likes || 0), 0);
      const totalComments = postsInRange.reduce((sum, post) => sum + (post.analytics?.comments || 0), 0);
      const totalShares = postsInRange.reduce((sum, post) => sum + (post.analytics?.shares || 0), 0);
      const totalEngagements = totalLikes + totalComments + totalShares;
      
      // Calculate engagement rate
      const followerCount = account.followerCount || 0;
      const engagementRate = followerCount > 0 ? 
        (totalEngagements / (postsInRange.length * followerCount)) : 0;
      
      // Find top posts based on engagement
      const topPosts = [...postsInRange]
        .sort((a, b) => {
          const engagementA = (a.analytics?.likes || 0) + (a.analytics?.comments || 0) + (a.analytics?.shares || 0);
          const engagementB = (b.analytics?.likes || 0) + (b.analytics?.comments || 0) + (b.analytics?.shares || 0);
          return engagementB - engagementA;
        })
        .slice(0, 5);
      
      return {
        platformType: this.getPlatformType(),
        accountId: account.platformId,
        period: 'custom',
        startDate,
        endDate,
        engagement: {
          likes: totalLikes,
          comments: totalComments,
          shares: totalShares,
          totalEngagements,
          engagementRate
        },
        audience: {
          followers: followerCount,
          followersGained: 0, // We don't have historical data
          followersLost: 0, // We don't have historical data
          followersNetGrowth: 0,
          followersGrowthRate: 0,
          reach: 0, // Mastodon doesn't provide reach metrics
          impressions: 0 // Mastodon doesn't provide impression metrics
        },
        content: {
          topPosts: topPosts.map(post => ({
            postId: post.id,
            engagements: (post.analytics?.likes || 0) + (post.analytics?.comments || 0) + (post.analytics?.shares || 0)
          })),
          postCount: postsInRange.length,
          averageEngagementPerPost: postsInRange.length > 0 ? totalEngagements / postsInRange.length : 0
        },
        metadata: {
          serverUrl: this.serverUrl
        }
      };
    } catch (error) {
      console.error('Error fetching Mastodon metrics:', error);
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
      // Try to verify credentials to test connection
      await axios.get(
        `${this.baseUrl}/accounts/verify_credentials`,
        {
          headers: {
            'Authorization': `Bearer ${this.authState.accessToken}`
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error testing Mastodon connection:', error);
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
      // Prepare the request body
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        token: this.authState.accessToken
      });
      
      // Revoke the token
      await axios.post(
        `${this.serverUrl}/oauth/revoke`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      // Clear the auth state
      this.authState = undefined;
      
      return true;
    } catch (error) {
      console.error('Error revoking Mastodon token:', error);
      return false;
    }
  }
} 
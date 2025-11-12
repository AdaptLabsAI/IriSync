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
import { logger } from '@/lib/core/logging/logger';
import { TwitterRateLimiter, TwitterTier } from '../utils/twitter-rate-limiter';
import { 
  TwitterUser, 
  TwitterDirectMessage, 
  TwitterMention, 
  TwitterTweet,
  TwitterApiResponse,
  TwitterSearchOptions,
  TwitterTrend,
  TwitterTweetCounts
} from '../models/twitter-types';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

// Define the types for OAuth library
interface OAuthToken {
  key: string;
  secret: string;
}

// Remove the custom interface and use any to avoid type conflicts with the library
type OAuthHeader = any;

/**
 * Production-ready Twitter API implementation with dual OAuth support
 * Supports both OAuth 1.0a (legacy) and OAuth 2.0 (primary)
 * Includes endpoint-specific rate limiting based on Twitter API tiers
 */
export class TwitterProvider extends PlatformProvider {
  private baseUrl: string;
  private uploadUrl: string;
  private apiVersion: string;
  private oauth: OAuth;
  private bearerToken: string;
  private useOAuth2: boolean;
  private rateLimiter: TwitterRateLimiter;
  
  constructor(config: PlatformProviderConfig, authState?: AuthState, tier: TwitterTier = 'basic') {
    super(config, authState);
    this.apiVersion = config.apiVersion || '2';
    this.baseUrl = config.baseUrl || 'https://api.twitter.com';
    this.uploadUrl = config.additionalParams?.uploadUrl || 'https://upload.twitter.com/1.1';
    this.bearerToken = config.apiKey || '';
    this.useOAuth2 = true; // Prefer OAuth 2.0 by default
    
    // Initialize Twitter-specific rate limiter
    this.rateLimiter = new TwitterRateLimiter(tier);
    
    // Initialize OAuth 1.0a for legacy endpoints
    this.oauth = new OAuth({
      consumer: {
        key: config.additionalParams?.oAuth1ApiKey || config.clientId,
        secret: config.additionalParams?.oAuth1ApiSecret || config.clientSecret
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      }
    });

    logger.info('TwitterProvider initialized', {
      hasOAuth2Credentials: !!(config.clientId && config.clientSecret),
      hasOAuth1Credentials: !!(config.additionalParams?.oAuth1ApiKey && config.additionalParams?.oAuth1ApiSecret),
      hasBearerToken: !!this.bearerToken,
      hasStaticTokens: !!(config.additionalParams?.oAuth1AccessToken && config.additionalParams?.oAuth1AccessTokenSecret),
      apiVersion: this.apiVersion,
      rateLimitTier: tier
    });
  }
  
  /**
   * Returns the platform type
   */
  getPlatformType(): PlatformType {
    return PlatformType.TWITTER;
  }
  
  /**
   * Returns platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return {
      supportsImagePosts: true,
      supportsVideoPosts: true,
      supportsMultipleImages: true,
      supportsScheduling: false, // Twitter API doesn't support native scheduling
      supportsThreads: true,
      supportsPolls: true,
      supportsHashtags: true,
      supportsMentions: true,
      maxCharacterCount: 280,
      maxHashtagCount: 30,
      maxMediaAttachments: 4,
      maxScheduleTimeInDays: 0 // No native scheduling
    };
  }
  
  /**
   * Get authorization headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    // If user is authenticated with OAuth tokens, use those
    if (this.authState?.accessToken) {
      if (this.useOAuth2) {
        return {
          'Authorization': `Bearer ${this.authState.accessToken}`,
          'Content-Type': 'application/json'
        };
      } else {
        // OAuth 1.0a signing will be handled by signRequest method
        return { 'Content-Type': 'application/json' };
      }
    }
    
    // Fallback to static tokens if available
    const staticToken = this.config.additionalParams?.oAuth1AccessToken;
    const staticSecret = this.config.additionalParams?.oAuth1AccessTokenSecret;
    
    if (staticToken && staticSecret) {
      logger.debug('Using static OAuth 1.0a tokens for request');
      return { 'Content-Type': 'application/json' };
    }
    
    // Final fallback to bearer token for read-only operations
    if (this.bearerToken) {
      logger.debug('Using bearer token for request');
      return {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      };
    }
    
    throw new Error('No valid authentication tokens available');
  }
  
  /**
   * Generate OAuth 2.0 authorization URL (primary method)
   */
  async getAuthorizationUrl(state: string, codeChallenge?: string): Promise<string> {
    try {
      // Use OAuth 2.0 with PKCE
      const scopes = this.config.additionalParams?.scopes || ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
      const authUrl = this.config.additionalParams?.authUrl || 'https://twitter.com/i/oauth2/authorize';
      
      // Generate PKCE challenge if not provided
      if (!codeChallenge) {
        codeChallenge = this.generatePKCEChallenge();
      }
      
      const url = new URL(authUrl);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', this.config.clientId);
      url.searchParams.set('redirect_uri', this.config.redirectUri);
      url.searchParams.set('scope', scopes.join(' '));
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
      
      logger.info('Generated OAuth 2.0 authorization URL', {
        scopes: scopes.join(' '),
        hasCodeChallenge: !!codeChallenge
      });
      
      return url.toString();
    } catch (error) {
      logger.error('Error generating OAuth 2.0 authorization URL', { error });
      
      // Fallback to OAuth 1.0a
      return this.getOAuth1AuthorizationUrl(state);
    }
  }
  
  /**
   * Generate OAuth 1.0a authorization URL (fallback)
   */
  private async getOAuth1AuthorizationUrl(state: string): Promise<string> {
    try {
      logger.info('Falling back to OAuth 1.0a authorization');
      
      // Get OAuth request token
      const requestTokenUrl = `${this.baseUrl}/oauth/request_token`;
      
      const requestData = {
        url: requestTokenUrl,
        method: 'POST',
        data: {
          oauth_callback: this.config.redirectUri
        }
      };
      
      const headers = this.oauth.toHeader(this.oauth.authorize(requestData));
      
      const response = await axios.post(requestTokenUrl, null, {
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Parse the response
      const responseParams = new URLSearchParams(response.data);
      const oauthToken = responseParams.get('oauth_token') || '';
      const oauthTokenSecret = responseParams.get('oauth_token_secret') || '';
      
      // Store the token secret in additionalData
      if (!this.authState) {
        this.authState = {
          accessToken: '',
          expiresAt: 0,
          additionalData: {}
        };
      } else if (!this.authState.additionalData) {
        this.authState.additionalData = {};
      }
      
      if (this.authState.additionalData) {
        this.authState.additionalData.oauthTokenSecret = oauthTokenSecret;
        this.authState.additionalData.state = state;
      }
      
      // Return the authorization URL
      return `${this.baseUrl}/oauth/authorize?oauth_token=${oauthToken}`;
    } catch (error: any) {
      logger.error('Error getting OAuth 1.0a request token', { error: error.response?.data || error.message });
      throw new Error('Failed to generate Twitter authorization URL');
    }
  }
  
  /**
   * Generate PKCE code challenge
   */
  private generatePKCEChallenge(): string {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    // Store code verifier for later use
    if (!this.authState) {
      this.authState = { accessToken: '', expiresAt: 0, additionalData: {} };
    }
    if (!this.authState.additionalData) {
      this.authState.additionalData = {};
    }
    this.authState.additionalData.codeVerifier = codeVerifier;
    
    return codeChallenge;
  }
  
  /**
   * Exchange authorization code for access token (OAuth 2.0 primary)
   */
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<AuthState> {
    try {
      // Try OAuth 2.0 first
      if (this.useOAuth2) {
        return await this.exchangeOAuth2Code(code, codeVerifier);
      } else {
        // Fallback to OAuth 1.0a
        return await this.exchangeOAuth1Code(code);
      }
    } catch (error) {
      logger.error('Error exchanging code for token', { error });
      
      // Try the alternative method
      if (this.useOAuth2) {
        logger.warn('OAuth 2.0 failed, trying OAuth 1.0a');
        return await this.exchangeOAuth1Code(code);
      } else {
        logger.warn('OAuth 1.0a failed, trying OAuth 2.0');
        return await this.exchangeOAuth2Code(code, codeVerifier);
      }
    }
  }
  
  /**
   * Exchange OAuth 2.0 code for tokens
   */
  private async exchangeOAuth2Code(code: string, codeVerifier?: string): Promise<AuthState> {
    const tokenUrl = this.config.additionalParams?.tokenUrl || 'https://api.twitter.com/2/oauth2/token';
    const verifier = codeVerifier || this.authState?.additionalData?.codeVerifier;
    
    if (!verifier) {
      throw new Error('Code verifier is required for OAuth 2.0 PKCE flow');
    }
    
    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      code_verifier: verifier
    });
    
    const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      }
    });
    
    const data = response.data;
    const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 7200);
    
    const authState: AuthState = {
      accessToken: data.access_token,
      expiresAt,
      additionalData: {
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'bearer',
        scope: data.scope,
        oauthVersion: '2.0'
      }
    };
    
    this.authState = authState;
    this.useOAuth2 = true;
    
    logger.info('Successfully exchanged OAuth 2.0 code for tokens', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      expiresIn: data.expires_in
    });
    
    return authState;
  }
  
  /**
   * Exchange OAuth 1.0a code for tokens
   */
  private async exchangeOAuth1Code(code: string): Promise<AuthState> {
    // For Twitter OAuth 1.0a, we need to use the verifier and token
    const [oauthToken, oauthVerifier] = code.split('&');
    const tokenValue = oauthToken.split('=')[1];
    const verifierValue = oauthVerifier.split('=')[1];
    
    // Get the token secret from auth state
    const tokenSecret = this.authState?.additionalData?.oauthTokenSecret;
    
    if (!tokenSecret) {
      throw new Error('Missing OAuth token secret. Authorization flow is incomplete.');
    }
    
    // Get access token
    const accessTokenUrl = `${this.baseUrl}/oauth/access_token`;
    
    const requestData = {
      url: accessTokenUrl,
      method: 'POST',
      data: {
        oauth_token: tokenValue,
        oauth_verifier: verifierValue
      }
    };
    
    const token: OAuthToken = { 
      key: tokenValue,
      secret: tokenSecret 
    };
    
    const headers = this.oauth.toHeader(this.oauth.authorize(requestData, token));
    
    const response = await axios.post(accessTokenUrl, null, {
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // Parse the response
    const responseParams = new URLSearchParams(response.data);
    const accessToken = responseParams.get('oauth_token') || '';
    const accessTokenSecret = responseParams.get('oauth_token_secret') || '';
    const userId = responseParams.get('user_id') || '';
    const screenName = responseParams.get('screen_name') || '';
    
    // Create auth state
    const authState: AuthState = {
      accessToken,
      // Twitter OAuth 1.0a tokens don't expire
      expiresAt: Number.MAX_SAFE_INTEGER,
      additionalData: {
        accessTokenSecret,
        userId,
        screenName,
        oauthVersion: '1.0a',
        state: this.authState?.additionalData?.state
      }
    };
    
    // Update internal auth state
    this.authState = authState;
    this.useOAuth2 = false;
    
    logger.info('Successfully exchanged OAuth 1.0a code for tokens', {
      userId,
      screenName
    });
    
    return authState;
  }
  
  /**
   * Refresh the access token if expired
   */
  async refreshAccessToken(): Promise<AuthState> {
    if (!this.authState) {
      throw new Error('No authentication state available');
    }
    
    // OAuth 1.0a tokens don't expire
    if (this.authState.additionalData?.oauthVersion === '1.0a') {
      logger.debug('OAuth 1.0a tokens do not expire');
      return this.authState;
    }
    
    // Refresh OAuth 2.0 token
    const refreshToken = this.authState.additionalData?.refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const tokenUrl = this.config.additionalParams?.tokenUrl || 'https://api.twitter.com/2/oauth2/token';
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });
      
      const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      
      const response = await axios.post(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`
        }
      });
      
      const data = response.data;
      const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 7200);
      
      // Update auth state with new tokens
      this.authState.accessToken = data.access_token;
      this.authState.expiresAt = expiresAt;
      if (data.refresh_token) {
        this.authState.additionalData!.refreshToken = data.refresh_token;
      }
      
      logger.info('Successfully refreshed OAuth 2.0 access token');
      return this.authState;
      
    } catch (error) {
      logger.error('Error refreshing access token', { error });
      throw new Error('Failed to refresh access token');
    }
  }
  
  /**
   * Check if the provider is authenticated
   */
  isAuthenticated(): boolean {
    // Check user tokens first
    if (this.authState?.accessToken) {
      // OAuth 2.0 tokens expire
      if (this.authState.additionalData?.oauthVersion === '2.0') {
        return this.authState.expiresAt > Math.floor(Date.now() / 1000);
      }
      // OAuth 1.0a tokens need secret
      if (this.authState.additionalData?.oauthVersion === '1.0a') {
        return !!this.authState.additionalData?.accessTokenSecret;
      }
    }
    
    // Check static tokens
    const staticToken = this.config.additionalParams?.oAuth1AccessToken;
    const staticSecret = this.config.additionalParams?.oAuth1AccessTokenSecret;
    if (staticToken && staticSecret) {
      return true;
    }
    
    // Check bearer token for read-only access
    return !!this.bearerToken;
  }
  
  /**
   * Sign a request with OAuth 1.0a (for legacy endpoints)
   */
  private signRequest(url: string, method: string, data?: any): OAuthHeader {
    // Use dynamic tokens if available
    if (this.authState?.accessToken && this.authState?.additionalData?.accessTokenSecret) {
      const token: OAuthToken = {
        key: this.authState.accessToken,
        secret: this.authState.additionalData.accessTokenSecret
      };
      
      const requestData = { url, method, data };
      return this.oauth.toHeader(this.oauth.authorize(requestData, token));
    }
    
    // Fallback to static tokens
    const staticToken = this.config.additionalParams?.oAuth1AccessToken;
    const staticSecret = this.config.additionalParams?.oAuth1AccessTokenSecret;
    
    if (staticToken && staticSecret) {
      const token: OAuthToken = {
        key: staticToken,
        secret: staticSecret
      };
      
      const requestData = { url, method, data };
      return this.oauth.toHeader(this.oauth.authorize(requestData, token));
    }
    
    throw new Error('No OAuth 1.0a tokens available for signing');
  }
  
  /**
   * Make an authenticated API request
   */
  private async makeAuthenticatedRequest(url: string, method: string = 'GET', data?: any) {
    // Check if tokens need refreshing
    if (this.authState?.accessToken && this.authState.additionalData?.oauthVersion === '2.0') {
      const now = Math.floor(Date.now() / 1000);
      if (this.authState.expiresAt <= now + 300) { // Refresh 5 minutes before expiry
        try {
          await this.refreshAccessToken();
        } catch (error) {
          logger.warn('Failed to refresh token, continuing with current token');
        }
      }
    }
    
    try {
      // Try OAuth 2.0 first
      if (this.authState?.accessToken && this.authState.additionalData?.oauthVersion === '2.0') {
        return await axios({
          method,
          url,
          data,
          headers: {
            'Authorization': `Bearer ${this.authState.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Try OAuth 1.0a
      if (this.authState?.accessToken && this.authState.additionalData?.oauthVersion === '1.0a') {
        const headers = this.signRequest(url, method.toUpperCase(), data);
        return await axios({ method, url, data, headers });
      }
      
      // Try static OAuth 1.0a tokens
      const staticToken = this.config.additionalParams?.oAuth1AccessToken;
      const staticSecret = this.config.additionalParams?.oAuth1AccessTokenSecret;
      
      if (staticToken && staticSecret) {
        const headers = this.signRequest(url, method.toUpperCase(), data);
        return await axios({ method, url, data, headers });
      }
      
      // Final fallback to bearer token (read-only)
      if (this.bearerToken && method.toUpperCase() === 'GET') {
        return await axios({
          method,
          url,
          data,
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
      
      throw new Error('No valid authentication method available');
      
    } catch (error: any) {
      logger.error('API request failed', {
        url,
        method,
        status: error.response?.status,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  /**
   * Fetch account details for the authenticated user
   */
  async getAccountDetails(): Promise<SocialAccount> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/users/me`;
      const params = {
        'user.fields': 'id,name,username,profile_image_url,description,public_metrics'
      };
      
      const response = await this.executeRateLimitedRequest('GET_users_me', async () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return await this.makeAuthenticatedRequest(fullUrl, 'GET');
      });
      
      const userData = response.data.data;
      
      return {
        id: uuidv4(),
        platformId: userData.id,
        platformType: this.getPlatformType(),
        username: userData.username,
        displayName: userData.name,
        profilePictureUrl: userData.profile_image_url,
        profileUrl: `https://twitter.com/${userData.username}`,
        bio: userData.description,
        isBusinessAccount: false,
        isConnected: true,
        hasValidCredentials: true,
        accountType: 'personal',
        followerCount: userData.public_metrics?.followers_count,
        followingCount: userData.public_metrics?.following_count,
        postCount: userData.public_metrics?.tweet_count,
        lastConnected: new Date(),
        metadata: {
          metrics: userData.public_metrics
        }
      };
    } catch (error) {
      logger.error('Error fetching Twitter account details', { error });
      throw new Error('Failed to fetch Twitter account details');
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
      let mediaIds: string[] = [];
      
      // Upload media if present
      if (post.attachments && post.attachments.length > 0) {
        const uploadPromises = post.attachments.map(attachment => this.uploadMedia(attachment));
        mediaIds = await Promise.all(uploadPromises);
      }
      
      // Create the tweet data
      const tweetData: any = {
        text: post.content
      };
      
      // Add media if available
      if (mediaIds.length > 0) {
        tweetData.media = { media_ids: mediaIds };
      }
      
      // Send the request
      const url = `${this.baseUrl}/${this.apiVersion}/tweets`;
      
      const response = await this.executeRateLimitedRequest('POST_tweets', () => 
        this.makeAuthenticatedRequest(url, 'POST', tweetData)
      );
      
      const tweetId = response.data.data.id;
      
      // Get screen name for URL construction
      let screenName = 'user';
      if (this.authState?.additionalData?.screenName) {
        screenName = this.authState.additionalData.screenName;
      } else {
        // Try to get it from account details
        try {
          const account = await this.getAccountDetails();
          screenName = account.username;
        } catch (error) {
          logger.warn('Could not get screen name for URL construction');
        }
      }
      
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: tweetId,
        status: 'published',
        publishedTime: new Date(),
        url: `https://twitter.com/${screenName}/status/${tweetId}`,
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
      logger.error('Error creating Twitter post', { error });
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
   * Note: Twitter API doesn't support native scheduling, so this would need to be implemented
   * with a custom scheduling system
   */
  async schedulePost(post: PlatformPost, schedule: PostSchedule): Promise<PostResponse> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get necessary data from auth state
      const userId = this.authState?.additionalData?.userId;
      const screenName = this.authState?.additionalData?.screenName;
      
      if (!userId || !screenName) {
        throw new Error('Missing user information');
      }
      
      // Process media attachments if present - store metadata for later use
      const mediaData = [];
      
      if (post.attachments && post.attachments.length > 0) {
        for (const attachment of post.attachments) {
          // Store media information for later processing
          mediaData.push({
            type: attachment.type,
            url: attachment.url,
            altText: attachment.altText,
            buffer: attachment.buffer ? true : false, // Just store if buffer exists, not the buffer itself
            mimeType: attachment.mimeType
          });
        }
      }
      
      // Generate a unique ID for the scheduled post
      const scheduledId = uuidv4();
      
      // Store the schedule data in Firebase
      const response = await fetch('/api/platforms/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduledId,
          platformType: this.getPlatformType(),
          content: post.content,
          platformAccountId: userId,
          scheduledTime: schedule.publishAt.toISOString(),
          timezone: schedule.timezone,
          mediaData,
          hashtags: post.hashtags,
          mentions: post.mentions,
          platformSpecificParams: post.platformSpecificParams
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to schedule post: ${response.statusText}`);
      }
      
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
          isThreaded: post.isThreaded || false,
          authorScreenName: screenName
        }
      };
    } catch (error) {
      console.error('Error scheduling Twitter post:', error);
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
      const url = `${this.baseUrl}/${this.apiVersion}/tweets/${postId}`;
      
      await this.executeRateLimitedRequest('DELETE_tweets', () => 
        this.makeAuthenticatedRequest(url, 'DELETE')
      );
      
      return true;
    } catch (error) {
      logger.error('Error deleting Twitter post:', { error, postId });
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
      const url = `${this.baseUrl}/${this.apiVersion}/users/${this.authState?.additionalData?.userId}/tweets`;
      
      const params: any = {
        'tweet.fields': 'id,text,created_at,public_metrics,entities',
        'max_results': limit || 10
      };
      
      if (before) {
        params.until_id = before;
      }
      
      if (after) {
        params.since_id = after;
      }
      
      const response = await this.executeRateLimitedRequest('GET_users_tweets', () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });
      
      const tweets = response.data.data || [];
      
      return tweets.map((tweet: any) => ({
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: tweet.id,
        status: 'published',
        publishedTime: new Date(tweet.created_at),
        url: `https://twitter.com/${this.authState?.additionalData?.screenName}/status/${tweet.id}`,
        analytics: {
          likes: tweet.public_metrics?.like_count || 0,
          comments: tweet.public_metrics?.reply_count || 0,
          shares: tweet.public_metrics?.retweet_count || 0
        },
        metadata: {
          content: tweet.text,
          hasMedia: tweet.attachments?.media_keys?.length > 0,
          hasUrls: tweet.entities?.urls?.length > 0,
          hasHashtags: tweet.entities?.hashtags?.length > 0
        }
      }));
    } catch (error) {
      logger.error('Error fetching Twitter posts:', { error });
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
      // Get user metrics
      const userUrl = `${this.baseUrl}/${this.apiVersion}/users/${this.authState?.additionalData?.userId}`;
      const userParams = {
        'user.fields': 'public_metrics'
      };
      const userHeaders = this.signRequest(userUrl, 'GET');
      
      const userResponse = await this.executeRateLimitedRequest('get-user-metrics', () => axios.get(userUrl, { headers: userHeaders, params: userParams }));
      
      const userData = userResponse.data.data;
      
      // Get recent tweets for engagement metrics
      const posts = await this.getPosts(30);
      
      // Calculate engagement metrics
      const totalLikes = posts.reduce((sum, post) => sum + (post.analytics?.likes || 0), 0);
      const totalReplies = posts.reduce((sum, post) => sum + (post.analytics?.comments || 0), 0);
      const totalRetweets = posts.reduce((sum, post) => sum + (post.analytics?.shares || 0), 0);
      const totalEngagements = totalLikes + totalReplies + totalRetweets;
      
      const followerCount = userData.public_metrics?.followers_count || 0;
      const engagementRate = posts.length > 0 ? totalEngagements / (posts.length * followerCount) : 0;
      
      // Find top posts by engagement
      const topPosts = [...posts]
        .sort((a, b) => {
          const aEngagement = (a.analytics?.likes || 0) + (a.analytics?.comments || 0) + (a.analytics?.shares || 0);
          const bEngagement = (b.analytics?.likes || 0) + (b.analytics?.comments || 0) + (b.analytics?.shares || 0);
          return bEngagement - aEngagement;
        })
        .slice(0, 5)
        .map(post => ({
          postId: post.platformPostId,
          engagements: (post.analytics?.likes || 0) + (post.analytics?.comments || 0) + (post.analytics?.shares || 0),
          reach: 0, // Not available in the API
          impressions: 0 // Not available in the API
        }));
      
      return {
        platformType: this.getPlatformType(),
        accountId: this.authState?.additionalData?.userId || '',
        period: 'custom',
        startDate,
        endDate,
        engagement: {
          likes: totalLikes,
          comments: totalReplies,
          shares: totalRetweets,
          totalEngagements,
          engagementRate
        },
        audience: {
          followers: followerCount,
          followersGained: 0, // Not available in the API
          followersLost: 0, // Not available in the API
          followersNetGrowth: 0, // Not available in the API
          followersGrowthRate: 0, // Not available in the API
          reach: 0, // Not available in the API
          impressions: 0 // Not available in the API
        },
        content: {
          topPosts,
          postCount: posts.length,
          averageEngagementPerPost: posts.length > 0 ? totalEngagements / posts.length : 0
        }
      };
    } catch (error) {
      console.error('Error fetching Twitter metrics:', error);
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
      // For Twitter, we need to use their media upload API (v1.1 endpoint)
      const uploadUrl = `${this.uploadUrl}/media/upload.json`;
      
      // Get media data
      let mediaData: Buffer;
      
      if (media.buffer) {
        mediaData = media.buffer;
      } else if (media.url) {
        const response = await axios.get(media.url, { responseType: 'arraybuffer' });
        mediaData = Buffer.from(response.data);
      } else {
        throw new Error('No media data available for upload');
      }
      
      // Determine media type
      let mediaType = 'image/jpeg';
      if (media.mimeType) {
        mediaType = media.mimeType;
      } else if (media.type === AttachmentType.VIDEO) {
        mediaType = 'video/mp4';
      }
      
      // Create form data for the upload
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('media', mediaData, {
        filename: `upload.${mediaType.split('/')[1]}`,
        contentType: mediaType
      });
      
      // For Twitter media upload, we need to use OAuth 1.0a regardless of primary auth method
      let headers: any;
      
      try {
        // Try to sign with OAuth 1.0a (required for media upload)
        headers = this.signRequest(uploadUrl, 'POST');
        
        // Merge form data headers
        headers = {
          ...headers,
          ...formData.getHeaders()
        };
      } catch (oauthError) {
        logger.warn('OAuth 1.0a signing failed for media upload, trying bearer token');
        
        // Fallback to bearer token if available
        if (this.bearerToken) {
          headers = {
            'Authorization': `Bearer ${this.bearerToken}`,
            ...formData.getHeaders()
          };
        } else {
          throw new Error('No valid authentication method for media upload');
        }
      }
      
      // Upload the media with rate limiting
      const response = await this.executeRateLimitedRequest('POST_media_upload', () => 
        axios.post(uploadUrl, formData, { headers })
      );
      
      // Return the media ID
      const mediaId = response.data.media_id_string || response.data.media_id;
      
      if (!mediaId) {
        throw new Error('No media ID returned from upload');
      }
      
      logger.info('Successfully uploaded media to Twitter', {
        mediaId,
        mediaType,
        size: mediaData.length
      });
      
      return mediaId;
    } catch (error) {
      logger.error('Error uploading media to Twitter', { error });
      throw new Error(`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Test the connection to ensure API credentials are valid
   */
  async testConnection(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }
    
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/users/me`;
      const headers = this.signRequest(url, 'GET');
      
      await axios.get(url, { headers });
      
      return true;
    } catch (error) {
      console.error('Error testing Twitter connection:', error);
      return false;
    }
  }
  
  /**
   * Revoke authentication tokens
   * Note: Twitter doesn't provide a direct way to revoke tokens, so we just clear them locally
   */
  async revokeTokens(): Promise<boolean> {
    // Just clear the auth state
    this.authState = undefined;
    
    return true;
  }

  /**
   * Update the Twitter API tier for rate limiting
   */
  updateApiTier(tier: TwitterTier): void {
    this.rateLimiter.updateTier(tier);
    logger.info('Twitter API tier updated', { tier });
  }

  /**
   * Execute a rate-limited request
   */
  private async executeRateLimitedRequest<T>(
    endpointKey: string, 
    requestFn: () => Promise<T>, 
    retryOnLimit = true
  ): Promise<T> {
    // Check if we can make the request
    if (!this.rateLimiter.canMakeRequest(endpointKey)) {
      const timeUntilReset = this.rateLimiter.getTimeUntilReset(endpointKey);
      const usage = this.rateLimiter.getCurrentUsage(endpointKey);
      
      if (retryOnLimit && timeUntilReset > 0 && timeUntilReset < 5 * 60 * 1000) { // If reset is within 5 minutes
        logger.info('Rate limit hit, waiting for reset', {
          endpointKey,
          timeUntilReset,
          usage
        });
        
        await new Promise(resolve => setTimeout(resolve, timeUntilReset + 1000)); // Wait + 1 second buffer
        return this.executeRateLimitedRequest(endpointKey, requestFn, false); // Don't retry again
      }
      
      throw new Error(`Twitter API rate limit exceeded for ${endpointKey}. Usage: ${JSON.stringify(usage)}`);
    }
    
    try {
      // Execute the request
      const result = await requestFn();
      
      // Record successful request
      this.rateLimiter.recordRequest(endpointKey);
      
      return result;
    } catch (error: any) {
      // Check if it's a rate limit error from Twitter's side
      if (error.response?.status === 429) {
        logger.warn('Twitter API returned 429 rate limit error', {
          endpointKey,
          headers: error.response.headers
        });
        
        // Still record the request attempt
        this.rateLimiter.recordRequest(endpointKey);
      }
      
      throw error;
    }
  }

  /**
   * Get rate limiting status for monitoring
   */
  getRateLimitStatus(): Record<string, any> {
    return this.rateLimiter.getStatus();
  }

  // ===================================================================
  // PHASE 1: SOCIAL INBOX FUNCTIONALITY
  // ===================================================================

  /**
   * Get direct messages for the authenticated user
   * Required for Social Inbox functionality
   */
  async getDirectMessages(limit: number = 100, cursor?: string): Promise<TwitterDirectMessage[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/dm_events`;
      const params: any = {
        'dm_event.fields': 'id,text,event_type,created_at,sender_id,dm_conversation_id,referenced_tweet,attachments',
        'user.fields': 'id,name,username,profile_image_url,verified',
        'tweet.fields': 'id,text,created_at,public_metrics',
        'max_results': Math.min(limit, 100), // API limit is 100
        'expansions': 'sender_id,referenced_tweet.id,attachments.media_keys'
      };

      if (cursor) {
        params.pagination_token = cursor;
      }

      const response = await this.executeRateLimitedRequest('GET_dm_events', () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const messages: TwitterDirectMessage[] = response.data.data || [];
      
      logger.info('Successfully fetched direct messages', {
        count: messages.length,
        hasNextToken: !!response.data.meta?.next_token
      });

      return messages;
    } catch (error) {
      logger.error('Error fetching direct messages', { error });
      throw new Error(`Failed to fetch direct messages: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get direct messages for a specific conversation
   * Required for Social Inbox conversation management
   */
  async getConversation(conversationId: string, limit: number = 100, cursor?: string): Promise<TwitterDirectMessage[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/dm_conversations/${conversationId}/dm_events`;
      const params: any = {
        'dm_event.fields': 'id,text,event_type,created_at,sender_id,dm_conversation_id,referenced_tweet,attachments',
        'user.fields': 'id,name,username,profile_image_url,verified',
        'tweet.fields': 'id,text,created_at,public_metrics',
        'max_results': Math.min(limit, 100),
        'expansions': 'sender_id,referenced_tweet.id,attachments.media_keys'
      };

      if (cursor) {
        params.pagination_token = cursor;
      }

      const response = await this.executeRateLimitedRequest('GET_dm_conversations', () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const messages: TwitterDirectMessage[] = response.data.data || [];
      
      logger.info('Successfully fetched conversation messages', {
        conversationId,
        count: messages.length,
        hasNextToken: !!response.data.meta?.next_token
      });

      return messages;
    } catch (error) {
      logger.error('Error fetching conversation messages', { error, conversationId });
      throw new Error(`Failed to fetch conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send a direct message to a user
   * Required for Social Inbox replies
   */
  async sendDirectMessage(recipientId: string, message: string, mediaId?: string): Promise<TwitterDirectMessage> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/dm_conversations/with/${recipientId}/messages`;
      
      const messageData: any = {
        text: message
      };

      // Add media if provided
      if (mediaId) {
        messageData.attachments = {
          media_ids: [mediaId]
        };
      }

      const response = await this.executeRateLimitedRequest('POST_dm_conversations_with_participant_messages', () =>
        this.makeAuthenticatedRequest(url, 'POST', messageData)
      );

      const dmResponse = response.data.data;
      
      logger.info('Successfully sent direct message', {
        recipientId,
        messageId: dmResponse.dm_event_id,
        hasMedia: !!mediaId
      });

      return {
        id: dmResponse.dm_event_id,
        text: message,
        event_type: 'MessageCreate',
        created_at: new Date().toISOString(),
        sender_id: this.authState?.additionalData?.userId,
        dm_conversation_id: dmResponse.dm_conversation_id,
        ...(mediaId && { media_keys: [mediaId] })
      };
    } catch (error) {
      logger.error('Error sending direct message', { error, recipientId });
      throw new Error(`Failed to send direct message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Reply to a direct message in an existing conversation
   * Required for Social Inbox conversation replies
   */
  async replyToDirectMessage(conversationId: string, message: string, mediaId?: string): Promise<TwitterDirectMessage> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/dm_conversations/${conversationId}/messages`;
      
      const messageData: any = {
        text: message
      };

      // Add media if provided
      if (mediaId) {
        messageData.attachments = {
          media_ids: [mediaId]
        };
      }

      const response = await this.executeRateLimitedRequest('POST_dm_conversations_messages', () =>
        this.makeAuthenticatedRequest(url, 'POST', messageData)
      );

      const dmResponse = response.data.data;
      
      logger.info('Successfully replied to direct message', {
        conversationId,
        messageId: dmResponse.dm_event_id,
        hasMedia: !!mediaId
      });

      return {
        id: dmResponse.dm_event_id,
        text: message,
        event_type: 'MessageCreate',
        created_at: new Date().toISOString(),
        sender_id: this.authState?.additionalData?.userId,
        dm_conversation_id: conversationId,
        ...(mediaId && { media_keys: [mediaId] })
      };
    } catch (error) {
      logger.error('Error replying to direct message', { error, conversationId });
      throw new Error(`Failed to reply to direct message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get mentions for the authenticated user
   * Required for Social Inbox mention tracking
   */
  async getMentions(limit: number = 100, cursor?: string): Promise<TwitterMention[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const userId = this.authState?.additionalData?.userId;
      if (!userId) {
        throw new Error('User ID not available in auth state');
      }

      const url = `${this.baseUrl}/${this.apiVersion}/users/${userId}/mentions`;
      const params: any = {
        'tweet.fields': 'id,text,author_id,created_at,conversation_id,in_reply_to_user_id,public_metrics,entities',
        'user.fields': 'id,name,username,profile_image_url,verified',
        'expansions': 'author_id,attachments.media_keys',
        'max_results': Math.min(limit, 100).toString()
      };

      if (cursor) {
        params.pagination_token = cursor;
      }

      const response = await this.executeRateLimitedRequest('GET_users_mentions', () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const mentions: TwitterMention[] = response.data.data || [];
      
      logger.info('Successfully fetched mentions', {
        userId,
        count: mentions.length,
        hasNextToken: !!response.data.meta?.next_token
      });

      return mentions;
    } catch (error) {
      logger.error('Error fetching mentions', { error });
      throw new Error(`Failed to fetch mentions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get users who liked a specific tweet
   * Required for Social Inbox engagement tracking
   */
  async getLikingUsers(tweetId: string, limit: number = 100): Promise<TwitterUser[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/tweets/${tweetId}/liking_users`;
      const params = {
        'user.fields': 'id,name,username,profile_image_url,verified,public_metrics',
        'max_results': Math.min(limit, 100).toString()
      };

      const response = await this.executeRateLimitedRequest('GET_tweets_liking_users', () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const users: TwitterUser[] = response.data.data || [];
      
      logger.info('Successfully fetched liking users', {
        tweetId,
        count: users.length
      });

      return users;
    } catch (error) {
      logger.error('Error fetching liking users', { error, tweetId });
      throw new Error(`Failed to fetch liking users: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get users who retweeted a specific tweet
   * Required for Social Inbox engagement tracking
   */
  async getRetweetUsers(tweetId: string, limit: number = 100): Promise<TwitterUser[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/tweets/${tweetId}/retweeted_by`;
      const params = {
        'user.fields': 'id,name,username,profile_image_url,verified,public_metrics',
        'max_results': Math.min(limit, 100).toString()
      };

      const response = await this.executeRateLimitedRequest('GET_tweets_retweeted_by', () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const users: TwitterUser[] = response.data.data || [];
      
      logger.info('Successfully fetched retweeting users', {
        tweetId,
        count: users.length
      });

      return users;
    } catch (error) {
      logger.error('Error fetching retweeting users', { error, tweetId });
      throw new Error(`Failed to fetch retweeting users: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get quote tweets for a specific tweet
   * Required for Social Inbox engagement tracking
   */
  async getQuoteTweets(tweetId: string, limit: number = 100): Promise<TwitterTweet[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/tweets/${tweetId}/quote_tweets`;
      const params = {
        'tweet.fields': 'id,text,author_id,created_at,conversation_id,public_metrics,entities',
        'user.fields': 'id,name,username,profile_image_url,verified',
        'expansions': 'author_id,attachments.media_keys',
        'max_results': Math.min(limit, 100).toString()
      };

      const response = await this.executeRateLimitedRequest('GET_tweets_quote_tweets', () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const quotes: TwitterTweet[] = response.data.data || [];
      
      logger.info('Successfully fetched quote tweets', {
        tweetId,
        count: quotes.length
      });

      return quotes;
    } catch (error) {
      logger.error('Error fetching quote tweets', { error, tweetId });
      throw new Error(`Failed to fetch quote tweets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ===================================================================
  // PHASE 2: ENGAGEMENT ACTIONS
  // ===================================================================

  /**
   * Like a tweet
   * Required for Social Inbox engagement responses
   */
  async likePost(postId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const userId = this.authState?.additionalData?.userId;
      if (!userId) {
        throw new Error('User ID not available in auth state');
      }

      const url = `${this.baseUrl}/${this.apiVersion}/users/${userId}/likes`;
      const likeData = {
        tweet_id: postId
      };

      const response = await this.executeRateLimitedRequest('POST_users_likes', () =>
        this.makeAuthenticatedRequest(url, 'POST', likeData)
      );

      const success = response.data.data?.liked === true;
      
      logger.info('Successfully liked tweet', {
        tweetId: postId,
        userId,
        success
      });

      return success;
    } catch (error) {
      logger.error('Error liking tweet', { error, postId });
      throw new Error(`Failed to like tweet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Unlike a tweet
   * Required for Social Inbox engagement management
   */
  async unlikePost(postId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const userId = this.authState?.additionalData?.userId;
      if (!userId) {
        throw new Error('User ID not available in auth state');
      }

      const url = `${this.baseUrl}/${this.apiVersion}/users/${userId}/likes/${postId}`;

      const response = await this.executeRateLimitedRequest('DELETE_users_likes', () =>
        this.makeAuthenticatedRequest(url, 'DELETE')
      );

      const success = response.data.data?.liked === false;
      
      logger.info('Successfully unliked tweet', {
        tweetId: postId,
        userId,
        success
      });

      return success;
    } catch (error) {
      logger.error('Error unliking tweet', { error, postId });
      throw new Error(`Failed to unlike tweet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retweet a tweet
   * Required for Social Inbox engagement responses
   */
  async retweetPost(postId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const userId = this.authState?.additionalData?.userId;
      if (!userId) {
        throw new Error('User ID not available in auth state');
      }

      const url = `${this.baseUrl}/${this.apiVersion}/users/${userId}/retweets`;
      const retweetData = {
        tweet_id: postId
      };

      const response = await this.executeRateLimitedRequest('POST_users_retweets', () =>
        this.makeAuthenticatedRequest(url, 'POST', retweetData)
      );

      const success = response.data.data?.retweeted === true;
      
      logger.info('Successfully retweeted tweet', {
        tweetId: postId,
        userId,
        success
      });

      return success;
    } catch (error) {
      logger.error('Error retweeting tweet', { error, postId });
      throw new Error(`Failed to retweet tweet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove a retweet
   * Required for Social Inbox engagement management
   */
  async removeRetweet(postId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const userId = this.authState?.additionalData?.userId;
      if (!userId) {
        throw new Error('User ID not available in auth state');
      }

      const url = `${this.baseUrl}/${this.apiVersion}/users/${userId}/retweets/${postId}`;

      const response = await this.executeRateLimitedRequest('DELETE_users_retweets', () =>
        this.makeAuthenticatedRequest(url, 'DELETE')
      );

      const success = response.data.data?.retweeted === false;
      
      logger.info('Successfully removed retweet', {
        tweetId: postId,
        userId,
        success
      });

      return success;
    } catch (error) {
      logger.error('Error removing retweet', { error, postId });
      throw new Error(`Failed to remove retweet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Reply to a comment/tweet
   * Required for Social Inbox comment responses
   */
  async replyToComment(tweetId: string, content: string): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/tweets`;
      
      const tweetData = {
        text: content,
        reply: {
          in_reply_to_tweet_id: tweetId
        }
      };

      const response = await this.executeRateLimitedRequest('POST_tweets', () =>
        this.makeAuthenticatedRequest(url, 'POST', tweetData)
      );

      const replyId = response.data.data.id;
      
      logger.info('Successfully replied to tweet', {
        originalTweetId: tweetId,
        replyId,
        content: content.substring(0, 50) + '...'
      });

      return replyId;
    } catch (error) {
      logger.error('Error replying to tweet', { error, tweetId });
      throw new Error(`Failed to reply to tweet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ===================================================================
  // PHASE 3: CONTENT DISCOVERY & MONITORING
  // ===================================================================

  /**
   * Search for tweets using Twitter's search API
   * Required for brand monitoring and competitive analysis
   */
  async searchTweets(options: TwitterSearchOptions): Promise<TwitterApiResponse<TwitterTweet[]>> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      // Use recent search for most use cases, upgrade to full archive for Pro+ users if needed
      const endpoint = 'GET_tweets_search_recent';
      const url = `${this.baseUrl}/${this.apiVersion}/tweets/search/recent`;
      
      const params: any = {
        query: options.query,
        'tweet.fields': 'id,text,author_id,created_at,conversation_id,public_metrics,entities,context_annotations',
        'user.fields': 'id,name,username,profile_image_url,verified,public_metrics',
        'expansions': 'author_id,referenced_tweets.id,attachments.media_keys',
        'max_results': Math.min(options.max_results || 100, 100)
      };

      // Add optional parameters
      if (options.since_id) params.since_id = options.since_id;
      if (options.until_id) params.until_id = options.until_id;
      if (options.start_time) params.start_time = options.start_time;
      if (options.end_time) params.end_time = options.end_time;
      if (options.sort_order) params.sort_order = options.sort_order;
      if (options.next_token) params.next_token = options.next_token;

      const response = await this.executeRateLimitedRequest(endpoint, () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const tweets: TwitterTweet[] = response.data.data || [];
      
      logger.info('Successfully searched tweets', {
        query: options.query,
        count: tweets.length,
        hasNextToken: !!response.data.meta?.next_token
      });

      return {
        data: tweets,
        includes: response.data.includes,
        meta: response.data.meta
      };
    } catch (error) {
      logger.error('Error searching tweets', { error, query: options.query });
      throw new Error(`Failed to search tweets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search historical tweets (Pro+ only)
   * Required for comprehensive brand monitoring
   */
  async searchAllTweets(options: TwitterSearchOptions): Promise<TwitterApiResponse<TwitterTweet[]>> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      // Full archive search requires Pro+ subscription
      const endpoint = 'GET_tweets_search_all';
      const url = `${this.baseUrl}/${this.apiVersion}/tweets/search/all`;
      
      const params: any = {
        query: options.query,
        'tweet.fields': 'id,text,author_id,created_at,conversation_id,public_metrics,entities,context_annotations',
        'user.fields': 'id,name,username,profile_image_url,verified,public_metrics',
        'expansions': 'author_id,referenced_tweets.id,attachments.media_keys',
        'max_results': Math.min(options.max_results || 100, 500) // Higher limit for Pro+
      };

      // Add optional parameters
      if (options.since_id) params.since_id = options.since_id;
      if (options.until_id) params.until_id = options.until_id;
      if (options.start_time) params.start_time = options.start_time;
      if (options.end_time) params.end_time = options.end_time;
      if (options.sort_order) params.sort_order = options.sort_order;
      if (options.next_token) params.next_token = options.next_token;

      const response = await this.executeRateLimitedRequest(endpoint, () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const tweets: TwitterTweet[] = response.data.data || [];
      
      logger.info('Successfully searched all tweets', {
        query: options.query,
        count: tweets.length,
        hasNextToken: !!response.data.meta?.next_token
      });

      return {
        data: tweets,
        includes: response.data.includes,
        meta: response.data.meta
      };
    } catch (error) {
      logger.error('Error searching all tweets', { error, query: options.query });
      throw new Error(`Failed to search all tweets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get tweet counts for volume analysis
   * Required for analytics and trend monitoring
   */
  async getTweetCounts(query: string, granularity: 'minute' | 'hour' | 'day' = 'hour', startTime?: string, endTime?: string): Promise<TwitterTweetCounts[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const endpoint = 'GET_tweets_counts_recent';
      const url = `${this.baseUrl}/${this.apiVersion}/tweets/counts/recent`;
      
      const params: any = {
        query,
        granularity
      };

      // Add time range if provided
      if (startTime) params.start_time = startTime;
      if (endTime) params.end_time = endTime;

      const response = await this.executeRateLimitedRequest(endpoint, () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const counts: TwitterTweetCounts[] = response.data.data || [];
      
      logger.info('Successfully fetched tweet counts', {
        query,
        granularity,
        dataPoints: counts.length
      });

      return counts;
    } catch (error) {
      logger.error('Error fetching tweet counts', { error, query });
      throw new Error(`Failed to fetch tweet counts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get historical tweet counts (Pro+ only)
   * Required for comprehensive analytics
   */
  async getAllTweetCounts(query: string, granularity: 'minute' | 'hour' | 'day' = 'hour', startTime?: string, endTime?: string): Promise<TwitterTweetCounts[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const endpoint = 'GET_tweets_counts_all';
      const url = `${this.baseUrl}/${this.apiVersion}/tweets/counts/all`;
      
      const params: any = {
        query,
        granularity
      };

      // Add time range if provided
      if (startTime) params.start_time = startTime;
      if (endTime) params.end_time = endTime;

      const response = await this.executeRateLimitedRequest(endpoint, () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const counts: TwitterTweetCounts[] = response.data.data || [];
      
      logger.info('Successfully fetched all tweet counts', {
        query,
        granularity,
        dataPoints: counts.length
      });

      return counts;
    } catch (error) {
      logger.error('Error fetching all tweet counts', { error, query });
      throw new Error(`Failed to fetch all tweet counts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get trending topics for a location
   * Required for content strategy and competitive analysis
   */
  async getTrends(woeid: string = '1'): Promise<TwitterTrend[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const endpoint = 'GET_trends_by_woeid';
      const url = `${this.baseUrl}/${this.apiVersion}/trends/by/woeid/${woeid}`;

      const response = await this.executeRateLimitedRequest(endpoint, () =>
        this.makeAuthenticatedRequest(url, 'GET')
      );

      const trends: TwitterTrend[] = response.data.data || [];
      
      logger.info('Successfully fetched trends', {
        woeid,
        count: trends.length
      });

      return trends;
    } catch (error) {
      logger.error('Error fetching trends', { error, woeid });
      throw new Error(`Failed to fetch trends: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get personalized trends for the authenticated user
   * Required for personalized content recommendations
   */
  async getPersonalizedTrends(): Promise<TwitterTrend[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const endpoint = 'GET_users_personalized_trends';
      const url = `${this.baseUrl}/${this.apiVersion}/users/personalized_trends`;

      const response = await this.executeRateLimitedRequest(endpoint, () =>
        this.makeAuthenticatedRequest(url, 'GET')
      );

      const trends: TwitterTrend[] = response.data.data || [];
      
      logger.info('Successfully fetched personalized trends', {
        count: trends.length
      });

      return trends;
    } catch (error) {
      logger.error('Error fetching personalized trends', { error });
      throw new Error(`Failed to fetch personalized trends: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ===================================================================
  // PHASE 4: CRM & RELATIONSHIP MANAGEMENT
  // ===================================================================

  /**
   * Follow a user
   * Required for CRM workflows and relationship building
   */
  async followUser(userId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const currentUserId = this.authState?.additionalData?.userId;
      if (!currentUserId) {
        throw new Error('Current user ID not available in auth state');
      }

      const url = `${this.baseUrl}/${this.apiVersion}/users/${currentUserId}/following`;
      const followData = {
        target_user_id: userId
      };

      const response = await this.executeRateLimitedRequest('POST_users_following', () =>
        this.makeAuthenticatedRequest(url, 'POST', followData)
      );

      const success = response.data.data?.following === true;
      
      logger.info('Successfully followed user', {
        targetUserId: userId,
        currentUserId,
        success
      });

      return success;
    } catch (error) {
      logger.error('Error following user', { error, userId });
      throw new Error(`Failed to follow user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Unfollow a user
   * Required for CRM workflows and relationship management
   */
  async unfollowUser(userId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const currentUserId = this.authState?.additionalData?.userId;
      if (!currentUserId) {
        throw new Error('Current user ID not available in auth state');
      }

      const url = `${this.baseUrl}/${this.apiVersion}/users/${currentUserId}/following/${userId}`;

      const response = await this.executeRateLimitedRequest('DELETE_users_following', () =>
        this.makeAuthenticatedRequest(url, 'DELETE')
      );

      const success = response.data.data?.following === false;
      
      logger.info('Successfully unfollowed user', {
        targetUserId: userId,
        currentUserId,
        success
      });

      return success;
    } catch (error) {
      logger.error('Error unfollowing user', { error, userId });
      throw new Error(`Failed to unfollow user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get detailed user profile by ID
   * Required for CRM user analysis and profiling
   */
  async getUserProfile(userId: string): Promise<TwitterUser> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/users/${userId}`;
      const params = {
        'user.fields': 'id,name,username,profile_image_url,description,verified,protected,public_metrics,created_at,location,url,entities'
      };

      const response = await this.executeRateLimitedRequest('GET_users_by_id', () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const user: TwitterUser = response.data.data;
      
      logger.info('Successfully fetched user profile', {
        userId,
        username: user.username,
        verified: user.verified
      });

      return user;
    } catch (error) {
      logger.error('Error fetching user profile', { error, userId });
      throw new Error(`Failed to fetch user profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get user profile by username
   * Required for CRM user lookup and identification
   */
  async getUserByUsername(username: string): Promise<TwitterUser> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      // Remove @ symbol if present
      const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
      
      const url = `${this.baseUrl}/${this.apiVersion}/users/by/username/${cleanUsername}`;
      const params = {
        'user.fields': 'id,name,username,profile_image_url,description,verified,protected,public_metrics,created_at,location,url,entities'
      };

      const response = await this.executeRateLimitedRequest('GET_users_by_username', () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const user: TwitterUser = response.data.data;
      
      logger.info('Successfully fetched user by username', {
        username: cleanUsername,
        userId: user.id,
        verified: user.verified
      });

      return user;
    } catch (error) {
      logger.error('Error fetching user by username', { error, username });
      throw new Error(`Failed to fetch user by username: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search for users by query
   * Required for CRM user discovery and prospecting
   */
  async searchUsers(query: string, limit: number = 100): Promise<TwitterUser[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      // Twitter doesn't have a dedicated user search endpoint in v2 API
      // We'll use tweet search and extract unique authors as a workaround
      const searchOptions: TwitterSearchOptions = {
        query: `from:${query} OR @${query}`,
        max_results: Math.min(limit, 100)
      };

      const searchResult = await this.searchTweets(searchOptions);
      
      // Extract unique users from the search results
      const userMap = new Map<string, TwitterUser>();
      
      // Add users from includes if available
      if (searchResult.includes?.users) {
        searchResult.includes.users.forEach(user => {
          userMap.set(user.id, user);
        });
      }

      const users = Array.from(userMap.values());
      
      logger.info('Successfully searched users', {
        query,
        count: users.length
      });

      return users;
    } catch (error) {
      logger.error('Error searching users', { error, query });
      throw new Error(`Failed to search users: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get tweets liked by a specific user
   * Required for CRM user behavior analysis
   */
  async getUserLikedTweets(userId: string, limit: number = 100): Promise<TwitterTweet[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/users/${userId}/liked_tweets`;
      const params = {
        'tweet.fields': 'id,text,author_id,created_at,conversation_id,public_metrics,entities',
        'user.fields': 'id,name,username,profile_image_url,verified',
        'expansions': 'author_id,attachments.media_keys',
        'max_results': Math.min(limit, 100).toString()
      };

      const response = await this.executeRateLimitedRequest('GET_users_liked_tweets', () => {
        const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(fullUrl, 'GET');
      });

      const tweets: TwitterTweet[] = response.data.data || [];
      
      logger.info('Successfully fetched user liked tweets', {
        userId,
        count: tweets.length
      });

      return tweets;
    } catch (error) {
      logger.error('Error fetching user liked tweets', { error, userId });
      throw new Error(`Failed to fetch user liked tweets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get multiple user profiles by IDs
   * Required for CRM batch user analysis
   */
  async getUserProfiles(userIds: string[]): Promise<TwitterUser[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    if (userIds.length === 0) {
      return [];
    }

    try {
      // Twitter API allows up to 100 user IDs per request
      const batchSize = 100;
      const allUsers: TwitterUser[] = [];

      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        const url = `${this.baseUrl}/${this.apiVersion}/users`;
        const params = {
          ids: batch.join(','),
          'user.fields': 'id,name,username,profile_image_url,description,verified,protected,public_metrics,created_at,location,url,entities'
        };

        const response = await this.executeRateLimitedRequest('GET_users_by_id', () => {
          const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
          return this.makeAuthenticatedRequest(fullUrl, 'GET');
        });

        const users: TwitterUser[] = response.data.data || [];
        allUsers.push(...users);
      }
      
      logger.info('Successfully fetched multiple user profiles', {
        requestedCount: userIds.length,
        foundCount: allUsers.length
      });

      return allUsers;
    } catch (error) {
      logger.error('Error fetching multiple user profiles', { error, userCount: userIds.length });
      throw new Error(`Failed to fetch user profiles: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 
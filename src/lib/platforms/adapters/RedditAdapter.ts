import { PlatformAccountInfo, PlatformAuthData, PlatformType } from '../models';
import { PlatformAdapter } from './PlatformAdapter';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../logging/logger';
import { SocialPlatform } from '../../models/SocialAccount';

/**
 * Reddit adapter for authentication and account information
 * Production-ready implementation with robust error handling
 */
export class RedditAdapter implements PlatformAdapter {
  platformType = SocialPlatform.REDDIT;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private baseUrl: string;
  
  constructor(
    clientId: string = process.env.REDDIT_CLIENT_ID || '',
    clientSecret: string = process.env.REDDIT_CLIENT_SECRET || '',
    redirectUri: string = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=reddit' || ''
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.baseUrl = 'https://www.reddit.com/api/v1';
    
    logger.info('RedditAdapter initialized', {
      hasClientCredentials: !!clientId && !!clientSecret
    });
    
    if (!clientId || !clientSecret) {
      logger.warn('Reddit credentials not properly configured');
    }
  }
  
  /**
   * Initialize the adapter with authentication data
   */
  async initialize(connection: PlatformAuthData): Promise<void> {
    try {
      // Validate the connection
      if (!connection.accessToken) {
        throw new Error('Reddit access token is required');
      }

      // Test the connection by making a simple API call
      const response = await fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'User-Agent': 'IriSync/1.0.0'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate Reddit connection');
      }

      logger.info('Reddit adapter initialized successfully', {
        platformType: this.platformType,
        hasAccessToken: !!connection.accessToken
      });
    } catch (error) {
      logger.error('Failed to initialize Reddit adapter', {
        error: error instanceof Error ? error.message : String(error),
        platformType: this.platformType
      });
      throw error;
    }
  }
  
  /**
   * Generate authorization URL for OAuth flow
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    try {
      // Generate code verifier and challenge for PKCE
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      
      // Store the code verifier in the state
      const stateObj = {
        originalState: state,
        codeVerifier: codeVerifier
      };
      
      // Encode the state object
      const encodedState = Buffer.from(JSON.stringify(stateObj)).toString('base64');
      
      // Generate the OAuth URL
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
      
      const authUrl = `${this.baseUrl}/authorize?` +
        `client_id=${encodeURIComponent(this.clientId)}` +
        `&response_type=code` +
        `&state=${encodeURIComponent(encodedState)}` +
        `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
        `&duration=permanent` +
        `&scope=${scopeParam}`;
        
      logger.debug('Generated Reddit authorization URL', {
        scopes: scopes.join(','),
        hasCodeVerifier: !!codeVerifier
      });
      
      return authUrl;
    } catch (error) {
      logger.error('Error generating Reddit authorization URL', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to generate Reddit authorization URL');
    }
  }
  
  /**
   * Handle the authorization code callback from OAuth 2.0
   */
  async handleAuthorizationCode(code: string, codeVerifier?: string): Promise<PlatformAuthData> {
    try {
      logger.debug('Exchanging code for Reddit token', {
        hasCodeVerifier: !!codeVerifier
      });
      
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri
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
      
      logger.info('Successfully exchanged code for Reddit token', {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        expiresIn: data.expires_in
      });
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        scope: data.scope
      };
    } catch (error: any) {
      logger.error('Error exchanging Reddit code for token', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Handle OAuth 1.0a token exchange (not used by Reddit)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    // Reddit uses OAuth 2.0, not OAuth 1.0a
    logger.warn('Attempt to use OAuth 1.0a with Reddit which is not supported', {
      oauthToken: oauthToken.substring(0, 10) + '...'
    });
    throw new Error('Reddit does not support OAuth 1.0a token flow');
  }
  
  /**
   * Process the authorization callback with PKCE
   */
  async handleAuthorizationCallback(code: string, state: string): Promise<PlatformAuthData> {
    try {
      // Extract the code verifier from the state
      let codeVerifier: string | undefined;
      
      try {
        const stateObj = JSON.parse(Buffer.from(state, 'base64').toString());
        codeVerifier = stateObj.codeVerifier;
        logger.debug('Successfully extracted code verifier from state');
      } catch (error) {
        logger.warn('Could not extract code verifier from state', {
          error: error instanceof Error ? error.message : String(error),
          stateLength: state.length
        });
      }
      
      return this.handleAuthorizationCode(code, codeVerifier);
    } catch (error: any) {
      logger.error('Error handling Reddit authorization callback', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to handle authorization callback');
    }
  }
  
  /**
   * Get account information using an access token
   */
  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    try {
      logger.debug('Fetching Reddit account information');
      
      // Get user information
      const userResponse = await axios.get(
        'https://oauth.reddit.com/api/v1/me',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'IriSync/1.0.0'
          }
        }
      );
      
      const userData = userResponse.data;
      
      // Get user's subreddits to show where they can post
      logger.debug('Fetching Reddit user subreddits');
      
      const subredditsResponse = await axios.get(
        'https://oauth.reddit.com/subreddits/mine/moderator',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'IriSync/1.0.0'
          }
        }
      );
      
      const subreddits = subredditsResponse.data.data.children.map((child: any) => ({
        id: child.data.id,
        name: child.data.display_name,
        url: child.data.url,
        icon: child.data.icon_img || child.data.community_icon,
        subscribers: child.data.subscribers
      }));
      
      logger.info('Successfully fetched Reddit account info', {
        username: userData.name,
        subredditsCount: subreddits.length
      });
      
      return {
        id: userData.id,
        name: userData.name,
        username: userData.name,
        profileImage: userData.icon_img,
        url: `https://www.reddit.com/user/${userData.name}`,
        additionalData: {
          postKarma: userData.link_karma,
          commentKarma: userData.comment_karma,
          totalKarma: userData.total_karma,
          createdAt: new Date(userData.created_utc * 1000).toISOString(),
          hasPremium: userData.is_gold,
          subreddits: subreddits
        }
      };
    } catch (error: any) {
      logger.error('Error fetching Reddit account info', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to fetch account information');
    }
  }
  
  /**
   * Validate an access token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      logger.debug('Validating Reddit token');
      
      // Try to get user account info to validate token
      await axios.get(
        'https://oauth.reddit.com/api/v1/me',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'IriSync/1.0.0'
          }
        }
      );
      
      logger.debug('Reddit token is valid');
      return true;
    } catch (error) {
      logger.warn('Reddit token validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  /**
   * Refresh an access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      logger.debug('Refreshing Reddit token');
      
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
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
      
      logger.info('Successfully refreshed Reddit token');
      
      return response.data.access_token;
    } catch (error: any) {
      logger.error('Error refreshing Reddit token', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to refresh token');
    }
  }
  
  /**
   * Post content to a subreddit
   * @param accessToken Access token for authentication
   * @param subreddit Name of the subreddit to post to
   * @param title Title of the post
   * @param content Content of the post (text or link)
   * @param options Additional posting options
   * @returns Post ID and URL
   */
  async submitPost(
    accessToken: string,
    subreddit: string,
    title: string,
    content: string,
    options?: {
      kind?: 'self' | 'link' | 'image' | 'video'; // self = text post, link = URL
      flair?: string;
      nsfw?: boolean;
      spoiler?: boolean;
      sendReplies?: boolean;
    }
  ): Promise<{ id: string; url: string }> {
    try {
      logger.debug('Submitting Reddit post', {
        subreddit,
        title,
        kind: options?.kind || 'self'
      });
      
      // Determine post kind (default to text post if not specified)
      const kind = options?.kind || (content.startsWith('http') ? 'link' : 'self');
      
      // Prepare the post data
      const formData = new URLSearchParams({
        sr: subreddit,
        title,
        kind,
        [kind === 'self' ? 'text' : 'url']: content,
        api_type: 'json',
        nsfw: options?.nsfw ? 'true' : 'false',
        spoiler: options?.spoiler ? 'true' : 'false',
        sendreplies: options?.sendReplies !== false ? 'true' : 'false'
      });
      
      // Add flair if specified
      if (options?.flair) {
        formData.append('flair_id', options.flair);
      }
      
      const response = await axios.post(
        'https://oauth.reddit.com/api/submit',
        formData.toString(),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'IriSync/1.0.0'
          }
        }
      );
      
      // Check for errors in the response
      const errors = response.data?.json?.errors;
      if (errors && errors.length > 0) {
        logger.error('Reddit API returned errors for post submission', {
          errors: errors,
          subreddit
        });
        throw new Error(`Reddit API error: ${errors[0][1]}`);
      }
      
      const postId = response.data?.json?.data?.id;
      const postUrl = response.data?.json?.data?.url;
      
      if (!postId || !postUrl) {
        logger.error('Reddit post submission succeeded but no post ID or URL returned', {
          response: response.data
        });
        throw new Error('Post submitted but could not get post details');
      }
      
      logger.info('Successfully submitted Reddit post', {
        subreddit,
        postId,
        kind
      });
      
      // If URL is relative, make it absolute
      const fullUrl = postUrl.startsWith('http') ? postUrl : `https://www.reddit.com${postUrl}`;
      
      return {
        id: postId,
        url: fullUrl
      };
      
    } catch (error: any) {
      logger.error('Error submitting Reddit post', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        subreddit
      });
      throw new Error(`Failed to submit Reddit post: ${error.message}`);
    }
  }
  
  /**
   * Get a list of the user's posts
   * @param accessToken Access token for authentication
   * @param limit Maximum number of posts to retrieve (default 25)
   * @returns Array of posts
   */
  async getUserPosts(accessToken: string, limit: number = 25): Promise<any[]> {
    try {
      logger.debug('Fetching user Reddit posts', { limit });
      
      const response = await axios.get(
        'https://oauth.reddit.com/user/me/submitted',
        {
          params: {
            limit: Math.min(limit, 100) // Reddit API max is 100
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'IriSync/1.0.0'
          }
        }
      );
      
      const posts = response.data?.data?.children || [];
      
      logger.info('Successfully retrieved user Reddit posts', {
        count: posts.length
      });
      
      return posts.map((post: any) => post.data);
    } catch (error: any) {
      logger.error('Error fetching user Reddit posts', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      return [];
    }
  }
  
  /**
   * Generate a random code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  /**
   * Generate a code challenge from a verifier using SHA-256
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    try {
      const hash = crypto.createHash('sha256').update(verifier).digest('base64');
      return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch (error) {
      logger.error('Error generating code challenge', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to generate code challenge');
    }
  }
}

import { PlatformAdapter } from './PlatformAdapter';
import { PlatformAccountInfo, PlatformAuthData } from '../models';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../../lib/logging/logger';
import { PlatformType } from '../models/PlatformType';

interface MastodonPost {
  status: string;
  mediaIds?: string[];
  visibility?: 'public' | 'unlisted' | 'private' | 'direct';
  sensitive?: boolean;
  spoilerText?: string;
  scheduledAt?: string;
  language?: string;
}

/**
 * Mastodon adapter for authentication and account information
 * Production-ready implementation with server customization and full content API support
 */
export class MastodonAdapter implements PlatformAdapter {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private serverUrl: string;
  private serverInstance: string;
  
  constructor(
    clientId: string = process.env.MASTODON_CLIENT_ID || '',
    clientSecret: string = process.env.MASTODON_CLIENT_SECRET || '',
    redirectUri: string = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=mastodon' || '',
    serverUrl: string = process.env.MASTODON_DEFAULT_SERVER || 'https://mastodon.social'
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.serverUrl = serverUrl;
    this.serverInstance = this.extractServerInstance(serverUrl);
    
    logger.info('MastodonAdapter initialized', { 
      hasClientCredentials: !!clientId && !!clientSecret,
      serverUrl: this.serverUrl,
      serverInstance: this.serverInstance
    });
  }
  
  /**
   * Extract server instance from URL for storage
   */
  private extractServerInstance(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch (error) {
      logger.warn('Failed to extract server instance from URL', { url });
      return 'mastodon.social'; // Default fallback
    }
  }
  
  /**
   * Set the Mastodon server URL
   */
  setServerUrl(url: string): void {
    this.serverUrl = url;
    this.serverInstance = this.extractServerInstance(url);
    logger.info('Mastodon server URL updated', { serverUrl: url, serverInstance: this.serverInstance });
  }
  
  /**
   * Register application with Mastodon server
   */
  async registerApplication(): Promise<{ clientId: string; clientSecret: string }> {
    try {
      logger.info('Registering application with Mastodon server', { serverUrl: this.serverUrl });
      
      const response = await axios.post(
        `${this.serverUrl}/api/v1/apps`,
        {
          client_name: 'IriSync',
          redirect_uris: this.redirectUri,
          scopes: 'read write follow push',
          website: process.env.NEXT_PUBLIC_APP_URL || 'https://irisync.app'
        }
      );
      
      this.clientId = response.data.client_id;
      this.clientSecret = response.data.client_secret;
      
      logger.info('Successfully registered application with Mastodon server', { 
        serverUrl: this.serverUrl,
        clientIdReceived: !!this.clientId
      });
      
      return {
        clientId: this.clientId,
        clientSecret: this.clientSecret
      };
    } catch (error: any) {
      logger.error('Error registering application with Mastodon', {
        error: error.response?.data || error.message,
        serverUrl: this.serverUrl
      });
      throw new Error('Failed to register application with Mastodon server');
    }
  }
  
  /**
   * Generate authorization URL for OAuth flow with server selection
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    try {
      // Generate code verifier and challenge for PKCE
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);
      
      // Store the code verifier in the state along with server info
      const stateObj = {
        originalState: state,
        codeVerifier: codeVerifier,
        serverUrl: this.serverUrl,
        serverInstance: this.serverInstance
      };
      
      // Encode the state object
      const encodedState = Buffer.from(JSON.stringify(stateObj)).toString('base64');
      
      // Ensure we have registered the app if needed
      if (!this.clientId || !this.clientSecret) {
        logger.debug('No client credentials found, registering app with Mastodon', { serverUrl: this.serverUrl });
        const registration = await this.registerApplication();
        this.clientId = registration.clientId;
        this.clientSecret = registration.clientSecret;
      }
      
      // Generate the OAuth URL
      const scopes = ['read', 'write', 'follow', 'push'];
      const scopeParam = encodeURIComponent(scopes.join(' '));
      
      const authUrl = `${this.serverUrl}/oauth/authorize?` +
        `client_id=${encodeURIComponent(this.clientId)}` +
        `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
        `&response_type=code` +
        `&scope=${scopeParam}` +
        `&state=${encodeURIComponent(encodedState)}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256`;
      
      logger.debug('Generated Mastodon authorization URL', { 
        serverUrl: this.serverUrl,
        authUrlLength: authUrl.length
      });
      
      return authUrl;
    } catch (error: any) {
      logger.error('Error generating Mastodon authorization URL', {
        error: error.message,
        serverUrl: this.serverUrl
      });
      throw new Error(`Failed to generate Mastodon authorization URL: ${error.message}`);
    }
  }
  
  /**
   * Handle the authorization code callback from OAuth 2.0
   */
  async handleAuthorizationCode(code: string, codeVerifier?: string): Promise<PlatformAuthData> {
    try {
      logger.debug('Exchanging code for Mastodon access token', { 
        serverUrl: this.serverUrl,
        hasCodeVerifier: !!codeVerifier
      });
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri
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
      
      // Add server info to token metadata to know which server to use in future
      const metadata = {
        serverUrl: this.serverUrl,
        serverInstance: this.serverInstance
      };
      
      logger.info('Successfully exchanged code for Mastodon token', { 
        serverUrl: this.serverUrl, 
        tokenReceived: !!data.access_token,
        hasRefreshToken: !!data.refresh_token
      });
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresIn: data.expires_in || 0,
        scope: data.scope || '',
        metadata: metadata
      };
    } catch (error: any) {
      logger.error('Error exchanging Mastodon code for token', {
        error: error.response?.data || error.message,
        serverUrl: this.serverUrl
      });
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Handle OAuth 1.0a token exchange (not used by Mastodon)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    // Mastodon uses OAuth 2.0, not OAuth 1.0a
    logger.warn('Attempt to use OAuth 1.0a flow with Mastodon', { oauthToken });
    throw new Error('Mastodon does not support OAuth 1.0a token flow');
  }
  
  /**
   * Process the authorization callback with PKCE and server info
   */
  async handleAuthorizationCallback(code: string, state: string): Promise<PlatformAuthData> {
    try {
      // Extract the code verifier and server URL from the state
      let codeVerifier: string | undefined;
      let serverUrl: string | undefined;
      let serverInstance: string | undefined;
      
      try {
        const stateObj = JSON.parse(Buffer.from(state, 'base64').toString());
        codeVerifier = stateObj.codeVerifier;
        serverUrl = stateObj.serverUrl;
        serverInstance = stateObj.serverInstance;
        
        // Update the server URL if it was provided
        if (serverUrl) {
          logger.debug('Updating Mastodon server URL from callback state', {
            serverUrl,
            serverInstance
          });
          this.setServerUrl(serverUrl);
        }
      } catch (error) {
        logger.warn('Could not extract code verifier from state', {
          error: error instanceof Error ? error.message : String(error),
          state: state.substring(0, 20) + '...'
        });
      }
      
      return this.handleAuthorizationCode(code, codeVerifier);
    } catch (error: any) {
      logger.error('Error handling Mastodon authorization callback', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to handle authorization callback');
    }
  }
  
  /**
   * Get account information using an access token
   */
  async getAccountInfo(accessToken: string, authData?: PlatformAuthData): Promise<PlatformAccountInfo> {
    try {
      // If auth data contains server info, update our server URL
      if (authData?.metadata?.serverUrl) {
        logger.debug('Updating server URL from auth data', { 
          serverUrl: authData.metadata.serverUrl 
        });
        this.setServerUrl(authData.metadata.serverUrl);
      }
      
      logger.debug('Fetching Mastodon account info', { 
        serverUrl: this.serverUrl
      });
      
      // Get user account information
      const accountResponse = await axios.get(
        `${this.serverUrl}/api/v1/accounts/verify_credentials`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      
      const accountData = accountResponse.data;
      
      // Get instance information
      const instanceResponse = await axios.get(
        `${this.serverUrl}/api/v1/instance`
      );
      
      const instanceData = instanceResponse.data;
      
      logger.info('Successfully fetched Mastodon account info', { 
        username: accountData.username,
        serverUrl: this.serverUrl
      });
      
      return {
        id: `${accountData.id}@${this.serverInstance}`,
        name: accountData.display_name || accountData.username,
        username: `${accountData.username}@${this.serverInstance}`,
        profileImage: accountData.avatar || accountData.avatar_static,
        url: accountData.url,
        additionalData: {
          serverUrl: this.serverUrl,
          serverInstance: this.serverInstance,
          serverName: instanceData.title,
          serverDescription: instanceData.description,
          serverVersion: instanceData.version,
          followersCount: accountData.followers_count,
          followingCount: accountData.following_count,
          statusesCount: accountData.statuses_count,
          note: accountData.note,
          fields: accountData.fields
        }
      };
    } catch (error: any) {
      logger.error('Error fetching Mastodon account info', {
        error: error.response?.data || error.message,
        serverUrl: this.serverUrl
      });
      throw new Error('Failed to fetch account information');
    }
  }
  
  /**
   * Validate an access token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      logger.debug('Validating Mastodon token', { serverUrl: this.serverUrl });
      
      // Use verify_credentials to check if token is valid
      await axios.get(
        `${this.serverUrl}/api/v1/accounts/verify_credentials`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return true;
    } catch (error) {
      logger.warn('Mastodon token validation failed', { 
        error: error instanceof Error ? error.message : String(error),
        serverUrl: this.serverUrl
      });
      return false;
    }
  }
  
  /**
   * Refresh an access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      logger.debug('Refreshing Mastodon token', { serverUrl: this.serverUrl });
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
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
      
      logger.info('Successfully refreshed Mastodon token', { 
        serverUrl: this.serverUrl,
        tokenReceived: !!response.data.access_token
      });
      
      return response.data.access_token;
    } catch (error: any) {
      logger.error('Error refreshing Mastodon token', {
        error: error.response?.data || error.message,
        serverUrl: this.serverUrl
      });
      throw new Error('Failed to refresh token');
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
   * Generate a code challenge from the code verifier for PKCE
   */
  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest('base64');
    return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  
  /**
   * Post content to Mastodon
   * @param accessToken The access token to use
   * @param content The text content to post
   * @param options Additional options
   * @returns The posted status ID and URL
   */
  async postContent(
    accessToken: string,
    content: string,
    options?: {
      mediaIds?: string[];
      visibility?: 'public' | 'unlisted' | 'private' | 'direct';
      sensitive?: boolean;
      spoilerText?: string;
      scheduledAt?: Date;
      language?: string;
      serverUrl?: string;
    }
  ): Promise<{ id: string; url: string }> {
    try {
      // If server URL is provided in options, use it
      if (options?.serverUrl) {
        this.setServerUrl(options.serverUrl);
      }
      
      logger.debug('Posting content to Mastodon', { 
        contentLength: content.length,
        hasMedia: options?.mediaIds && options.mediaIds.length > 0,
        visibility: options?.visibility,
        scheduledAt: options?.scheduledAt,
        serverUrl: this.serverUrl
      });
      
      const postData: MastodonPost = {
        status: content
      };
      
      if (options?.mediaIds && options.mediaIds.length > 0) {
        postData.mediaIds = options.mediaIds;
      }
      
      if (options?.visibility) {
        postData.visibility = options.visibility;
      }
      
      if (options?.sensitive !== undefined) {
        postData.sensitive = options.sensitive;
      }
      
      if (options?.spoilerText) {
        postData.spoilerText = options.spoilerText;
      }
      
      if (options?.language) {
        postData.language = options.language;
      }
      
      // Handle scheduling
      if (options?.scheduledAt && options.scheduledAt > new Date()) {
        postData.scheduledAt = options.scheduledAt.toISOString();
      }
      
      // Convert to snake_case for Mastodon API
      const formattedPostData = {
        status: postData.status,
        media_ids: postData.mediaIds,
        visibility: postData.visibility,
        sensitive: postData.sensitive,
        spoiler_text: postData.spoilerText,
        scheduled_at: postData.scheduledAt,
        language: postData.language
      };
      
      const response = await axios.post(
        `${this.serverUrl}/api/v1/statuses`,
        formattedPostData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info('Successfully posted content to Mastodon', {
        id: response.data.id,
        url: response.data.url,
        visibility: response.data.visibility,
        serverUrl: this.serverUrl
      });
      
      return {
        id: response.data.id,
        url: response.data.url
      };
    } catch (error: any) {
      logger.error('Error posting content to Mastodon', {
        error: error.response?.data || error.message,
        serverUrl: this.serverUrl
      });
      throw new Error(`Failed to post content to Mastodon: ${error.message}`);
    }
  }
  
  /**
   * Upload media to Mastodon
   * @param accessToken The access token to use
   * @param file The file buffer or path to upload
   * @param description Optional description for accessibility
   * @returns The media ID
   */
  async uploadMedia(
    accessToken: string,
    file: Buffer | string,
    description?: string
  ): Promise<string> {
    try {
      logger.debug('Uploading media to Mastodon', {
        hasDescription: !!description,
        serverUrl: this.serverUrl
      });
      
      const formData = new FormData();
      
      // Handle both path strings and buffers
      if (typeof file === 'string') {
        formData.append('file', file);
      } else {
        // Convert Buffer to Blob for formdata-node
        const blob = new Blob([file], { type: 'image/jpeg' });
        formData.append('file', blob, 'media.jpg');
      }
      
      if (description) {
        formData.append('description', description);
      }
      
      const response = await axios.post(
        `${this.serverUrl}/api/v2/media`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      logger.info('Successfully uploaded media to Mastodon', {
        mediaId: response.data.id,
        serverUrl: this.serverUrl
      });
      
      return response.data.id;
    } catch (error: any) {
      logger.error('Error uploading media to Mastodon', {
        error: error.response?.data || error.message,
        serverUrl: this.serverUrl
      });
      throw new Error(`Failed to upload media to Mastodon: ${error.message}`);
    }
  }
  
  /**
   * Get a list of recent posts
   * @param accessToken The access token to use
   * @param limit Maximum number of posts to retrieve
   * @returns Array of posts
   */
  async getPosts(accessToken: string, limit: number = 20): Promise<any[]> {
    try {
      logger.debug('Getting recent Mastodon posts', {
        limit,
        serverUrl: this.serverUrl
      });
      
      const response = await axios.get(
        `${this.serverUrl}/api/v1/accounts/verify_credentials/statuses`,
        {
          params: { limit },
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      
      logger.debug('Successfully retrieved Mastodon posts', {
        count: response.data.length,
        serverUrl: this.serverUrl
      });
      
      return response.data;
    } catch (error: any) {
      logger.error('Error getting Mastodon posts', {
        error: error.response?.data || error.message,
        serverUrl: this.serverUrl
      });
      return [];
    }
  }

  /**
   * Initialize the adapter with authentication data
   */
  async initialize(connection: PlatformAuthData): Promise<void> {
    try {
      // Validate the connection
      if (!connection.accessToken) {
        throw new Error('Mastodon access token is required');
      }

      // Get the instance URL from connection or use default
      const instanceUrl = (connection as any).instanceUrl || process.env.MASTODON_INSTANCE_URL || 'https://mastodon.social';

      // Test the connection by making a simple API call
      const response = await fetch(`${instanceUrl}/api/v1/accounts/verify_credentials`, {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate Mastodon connection');
      }

      logger.info('Mastodon adapter initialized successfully', {
        platformType: 'mastodon' as PlatformType,
        userId: (connection as any).platformUserId,
        instanceUrl
      });
    } catch (error) {
      logger.error('Failed to initialize Mastodon adapter', {
        error: error instanceof Error ? error.message : String(error),
        platformType: 'mastodon' as PlatformType
      });
      throw error;
    }
  }
}


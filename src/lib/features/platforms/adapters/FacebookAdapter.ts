import { PlatformAccountInfo, PlatformAuthData, PlatformType } from '../models';
import { PlatformAdapter } from './PlatformAdapter';
import axios from 'axios';
import { logger } from '../../../core/logging/logger';
import { SocialPlatform } from '../../../core/models/SocialAccount';

/**
 * Production-ready Facebook platform adapter implementation
 */
export class FacebookAdapter implements PlatformAdapter {
  platformType = SocialPlatform.FACEBOOK;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private apiVersion: string;
  private baseUrl: string;
  
  constructor() {
    // Load configuration from environment variables
    this.clientId = process.env.FACEBOOK_CLIENT_ID || '';
    this.clientSecret = process.env.FACEBOOK_CLIENT_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=facebook' || '';
    this.apiVersion = 'v17.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }
  
  /**
   * Initialize the adapter with authentication data
   */
  async initialize(connection: PlatformAuthData): Promise<void> {
    try {
      // Validate the connection
      if (!connection.accessToken) {
        throw new Error('Facebook access token is required');
      }

      // Test the connection by making a simple API call
      const response = await fetch(`https://graph.facebook.com/me?access_token=${connection.accessToken}`);
      
      if (!response.ok) {
        throw new Error('Failed to validate Facebook connection');
      }

      logger.info('Facebook adapter initialized successfully', {
        platformType: this.platformType,
        userId: (connection as any).platformUserId
      });
    } catch (error) {
      logger.error('Failed to initialize Facebook adapter', {
        error: error instanceof Error ? error.message : String(error),
        platformType: this.platformType
      });
      throw error;
    }
  }
  
  /**
   * Generate Facebook OAuth authorization URL
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_manage_metadata',
      'public_profile',
      'email'
    ];
    
    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?` +
      `client_id=${encodeURIComponent(this.clientId)}` +
      `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=${encodeURIComponent(scopes.join(','))}` +
      `&response_type=code`;
  }
  
  /**
   * Default implementation for handling authorization callback
   */
  async handleAuthorizationCallback(code: string, state: string): Promise<PlatformAuthData> {
    // For Facebook, just call handleAuthorizationCode
    return this.handleAuthorizationCode(code);
  }
  
  /**
   * Handle OAuth 2.0 authorization code flow
   */
  async handleAuthorizationCode(code: string, oauthVerifier?: string): Promise<PlatformAuthData> {
    try {
      // Exchange authorization code for access token
      const response = await axios.get(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.redirectUri,
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
            client_id: this.clientId,
            client_secret: this.clientSecret,
            fb_exchange_token: data.access_token
          }
        }
      );
      
      const longLivedData = longLivedResponse.data;
      
      return {
        accessToken: longLivedData.access_token,
        expiresIn: longLivedData.expires_in,
        scope: data.scope
      };
    } catch (error: any) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Handle OAuth 1.0a token exchange (not used by Facebook)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    // Facebook doesn't use OAuth 1.0a
    throw new Error('Facebook does not support OAuth 1.0a token flow');
  }
  
  /**
   * Get account information using an access token
   */
  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    try {
      // First get basic user details
      const userResponse = await axios.get(
        `${this.baseUrl}/me`,
        {
          params: {
            access_token: accessToken,
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
            access_token: accessToken,
            fields: 'id,name,access_token,category,picture'
          }
        }
      );
      
      // Return both user data and pages data so the UI can let users choose
      const pages = pagesResponse.data.data || [];
      
      // Include pages in the additional data so the frontend can present choices
      const accountInfo: PlatformAccountInfo = {
        id: userData.id,
        name: userData.name,
        username: userData.email || userData.name,
        profileImage: userData.picture?.data?.url,
        email: userData.email,
        url: `https://facebook.com/${userData.id}`,
        additionalData: {
          // Include available pages so the UI can display them for selection
          availablePages: pages.map((page: any) => ({
            id: page.id,
            name: page.name,
            category: page.category,
            accessToken: page.access_token,
            profileImage: page.picture?.data?.url
          })),
          // Flag to indicate this account has pages that need selection
          requiresPageSelection: pages.length > 0
        }
      };
      
      return accountInfo;
    } catch (error: any) {
      console.error('Error fetching Facebook account info:', error.response?.data || error.message);
      throw new Error('Failed to fetch account information');
    }
  }
  
  /**
   * Validate an access token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      // Use the debug_token endpoint to validate the token
      const response = await axios.get(
        `${this.baseUrl}/debug_token`,
        {
          params: {
            input_token: token,
            access_token: `${this.clientId}|${this.clientSecret}`
          }
        }
      );
      
      // Check if token is valid and not expired
      const data = response.data.data;
      const isValid = data.is_valid && (!data.expires_at || data.expires_at > Math.floor(Date.now() / 1000));
      
      return isValid;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Refresh an access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      // For Facebook, refreshToken parameter is actually a long-lived access token
      // that we need to exchange for a new one
      const response = await axios.get(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            fb_exchange_token: refreshToken
          }
        }
      );
      
      return response.data.access_token;
    } catch (error: any) {
      console.error('Error refreshing Facebook token:', error.response?.data || error.message);
      throw new Error('Failed to refresh token');
    }
  }
}

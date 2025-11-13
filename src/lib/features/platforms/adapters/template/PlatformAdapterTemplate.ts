import { PlatformAccountInfo, PlatformAuthData, PlatformType } from '../../models';
import { PlatformAdapter } from '../PlatformAdapter';
import axios from 'axios';
import { logger } from '../../../../core/logging/logger';

/**
 * Template for platform adapter implementation
 * Copy this file for each new platform and replace PLATFORM_NAME with the actual platform name
 */
export class PlatformNameAdapter implements PlatformAdapter {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private apiBaseUrl: string;
  
  constructor() {
    // Load configuration from environment variables
    this.clientId = process.env.PLATFORM_NAME_CLIENT_ID || '';
    this.clientSecret = process.env.PLATFORM_NAME_CLIENT_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=platform_name' || '';
    this.apiBaseUrl = 'https://api.platform-name.com/v1';
  }
  
  /**
   * Initialize the adapter with authentication data
   */
  async initialize(connection: PlatformAuthData): Promise<void> {
    try {
      // Validate the connection
      if (!connection.accessToken) {
        throw new Error('Platform access token is required');
      }

      // Test the connection by making a simple API call
      // const response = await fetch('platform-api-endpoint', {
      //   headers: {
      //     'Authorization': `Bearer ${connection.accessToken}`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to validate platform connection');
      // }

      logger.info('Platform adapter initialized successfully', {
        userId: connection.platformUserId
      });
    } catch (error) {
      logger.error('Failed to initialize platform adapter', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Generate authorization URL for OAuth flow
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    const scope = 'read_user,write_posts'; // Adjust scopes based on platform requirements
    
    // Build the authorization URL with appropriate parameters
    return `${this.apiBaseUrl}/oauth/authorize?` +
      `client_id=${encodeURIComponent(this.clientId)}` +
      `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}`;
  }
  
  /**
   * Handle OAuth 2.0 authorization code flow
   */
  async handleAuthorizationCode(code: string, oauthVerifier?: string): Promise<PlatformAuthData> {
    try {
      // Exchange authorization code for access token
      const response = await axios.post(`${this.apiBaseUrl}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Process the response and return PlatformAuthData
      if (response.data.access_token) {
        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresIn: response.data.expires_in,
          scope: response.data.scope
        };
      } else {
        throw new Error('Invalid response from API: missing access token');
      }
    } catch (error: any) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Process the authorization callback (wrapper method)
   * Default implementation simply calls handleAuthorizationCode
   */
  async handleAuthorizationCallback(code: string, state: string): Promise<PlatformAuthData> {
    return this.handleAuthorizationCode(code);
  }
  
  /**
   * Handle OAuth 1.0a token exchange
   * Implement this if the platform uses OAuth 1.0a (like Twitter)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    // For OAuth 2.0 platforms, this method isn't used
    throw new Error('This platform does not support OAuth 1.0a token flow');
  }
  
  /**
   * Get account information using an access token
   */
  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    try {
      // Fetch user profile information
      const response = await axios.get(`${this.apiBaseUrl}/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const data = response.data;
      
      // Map API response to PlatformAccountInfo
      return {
        id: data.id,
        name: data.name || data.full_name || 'User',
        username: data.username || data.screen_name || data.login,
        profileImage: data.profile_image || data.avatar_url || data.picture,
        email: data.email,
        url: data.url || `https://platform-name.com/${data.username}`
      };
    } catch (error: any) {
      console.error('Error fetching account info:', error.response?.data || error.message);
      throw new Error('Failed to fetch account information');
    }
  }
  
  /**
   * Validate an access token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      // Check if the token is valid by making a simple API call
      await axios.get(`${this.apiBaseUrl}/validate_token`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Refresh an expired access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });
      
      if (response.data.access_token) {
        return response.data.access_token;
      } else {
        throw new Error('Invalid response when refreshing token');
      }
    } catch (error: any) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh token');
    }
  }
} 
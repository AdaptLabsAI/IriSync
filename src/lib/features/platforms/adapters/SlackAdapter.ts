import { PlatformAccountInfo, PlatformAuthData } from '../models';
import axios from 'axios';
import { logger } from '../../../core/logging/logger';

/**
 * Slack platform adapter implementation
 * Handles OAuth2.0 authentication with Slack API
 */
export class SlackAdapter {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private apiBaseUrl: string = 'https://slack.com/api';
  
  constructor() {
    // Load configuration from environment variables
    this.clientId = process.env.SLACK_CLIENT_ID || '';
    this.clientSecret = process.env.SLACK_CLIENT_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/workflow?platform=slack' || '';
    
    // Validate configuration
    if (!this.clientId || !this.clientSecret) {
      logger.warn('Slack adapter initialized with missing credentials. OAuth flows will fail.');
    }
  }
  
  /**
   * Get the authorization URL for Slack's OAuth flow
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    const queryParams = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'channels:read,channels:write,chat:write,users:read',
      user_scope: 'identity.basic',
    });
    
    return `https://slack.com/oauth/v2/authorize?${queryParams}`;
  }
  
  /**
   * Handle the authorization code callback from Slack OAuth
   */
  async handleAuthorizationCode(code: string): Promise<PlatformAuthData> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/oauth.v2.access`, 
        null,
        {
          params: {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code,
            redirect_uri: this.redirectUri,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }
      
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
        scope: response.data.scope,
        userId: response.data.authed_user?.id,
        accountId: response.data.team?.id,
        // Store additional data for Slack
        additionalData: {
          teamId: response.data.team?.id,
          teamName: response.data.team?.name,
          userId: response.data.authed_user?.id,
          botUserId: response.data.bot_user_id,
        }
      };
    } catch (error) {
      logger.error('Failed to exchange code for Slack token', error);
      throw new Error('Failed to authenticate with Slack');
    }
  }
  
  /**
   * Handle OAuth 1.0a authorization token (not used by Slack)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    // Slack uses OAuth 2.0, not 1.0a
    throw new Error('OAuth 1.0a not supported for Slack');
  }
  
  /**
   * Get account information using the access token
   */
  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    try {
      // First get the auth user's info
      const userResponse = await axios.get(`${this.apiBaseUrl}/users.info`, {
        params: {
          token: accessToken,
          user: 'me', // Get info about the authed user
        },
      });
      
      if (!userResponse.data.ok) {
        throw new Error(`Slack API error: ${userResponse.data.error}`);
      }
      
      // Then get the team info
      const teamResponse = await axios.get(`${this.apiBaseUrl}/team.info`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (!teamResponse.data.ok) {
        throw new Error(`Slack API error: ${teamResponse.data.error}`);
      }
      
      const user = userResponse.data.user;
      const team = teamResponse.data.team;
      
      return {
        id: user.id,
        name: user.real_name || user.name,
        username: user.name,
        email: user.profile?.email,
        profileImage: user.profile?.image_192,
        additionalData: {
          teamId: team.id,
          teamName: team.name,
          teamDomain: team.domain,
          isPrimaryOwner: user.is_primary_owner,
          isAdmin: user.is_admin,
        }
      };
    } catch (error) {
      logger.error('Failed to get Slack account info', error);
      throw new Error('Failed to retrieve Slack account information');
    }
  }
  
  /**
   * Validate an access token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/auth.test`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data.ok === true;
    } catch (error) {
      logger.error('Slack token validation failed', error);
      return false;
    }
  }
  
  /**
   * Refresh an access token (Slack tokens don't expire by default)
   */
  async refreshToken(refreshToken: string): Promise<string> {
    // Slack tokens don't expire by default, so this is usually not needed
    // However, for completeness, we can implement token refresh if available
    throw new Error('Token refresh not typically needed for Slack');
  }
  
  /**
   * List workspaces/channels available for the user
   */
  async listChannels(accessToken: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/conversations.list`, {
        params: {
          token: accessToken,
          types: 'public_channel,private_channel',
          exclude_archived: true,
        },
      });
      
      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }
      
      return response.data.channels || [];
    } catch (error) {
      logger.error('Failed to list Slack channels', error);
      throw new Error('Failed to retrieve Slack channels');
    }
  }
  
  /**
   * Post a message to a Slack channel
   */
  async postMessage(accessToken: string, channelId: string, message: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/chat.postMessage`,
        {
          channel: channelId,
          text: message.text,
          blocks: message.blocks,
          attachments: message.attachments,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }
      
      return response.data;
    } catch (error) {
      logger.error('Failed to post Slack message', error);
      throw new Error('Failed to post message to Slack channel');
    }
  }
} 
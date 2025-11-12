import { PlatformAccountInfo, PlatformAuthData } from '../../models';
import axios from 'axios';

/**
 * Template for workflow adapter implementation
 * This adapter interfaces with collaboration tools like Slack, Microsoft Teams, Trello, Asana, etc.
 * Copy this file for each new workflow platform and replace WORKFLOW_NAME with the actual platform name
 */
export class WorkflowNameAdapter {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private apiBaseUrl: string;
  
  constructor() {
    // Load configuration from environment variables
    this.clientId = process.env.WORKFLOW_NAME_CLIENT_ID || '';
    this.clientSecret = process.env.WORKFLOW_NAME_CLIENT_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/workflow?platform=workflow_name' || '';
    this.apiBaseUrl = 'https://api.workflow-name.com/v1';
  }
  
  /**
   * Get the authorization URL for the platform's OAuth flow
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    const queryParams = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      response_type: 'code',
      scope: 'read write', // Adjust scopes as needed for each platform
    });
    
    return `${this.apiBaseUrl}/oauth/authorize?${queryParams}`;
  }
  
  /**
   * Handle the authorization code callback from OAuth
   */
  async handleAuthorizationCode(code: string): Promise<PlatformAuthData> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      });
      
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        scope: response.data.scope,
      };
    } catch (error) {
      console.error('Failed to exchange code for token:', error);
      throw new Error('Failed to authenticate with workflow platform');
    }
  }
  
  /**
   * Handle OAuth 1.0a authorization token (for platforms that use OAuth 1.0a)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    // Implementation for OAuth 1.0a, if needed
    throw new Error('OAuth 1.0a not supported for this platform');
  }
  
  /**
   * Get account information using the access token
   */
  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      return {
        id: response.data.id,
        name: response.data.name || response.data.username,
        username: response.data.username || response.data.email,
        email: response.data.email,
        profileImage: response.data.profile_image || response.data.avatar,
      };
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw new Error('Failed to retrieve account information');
    }
  }
  
  /**
   * Validate an access token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      await axios.get(`${this.apiBaseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }
  
  /**
   * Refresh an access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });
      
      return response.data.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw new Error('Failed to refresh authentication token');
    }
  }
  
  /**
   * List workspaces/teams available for the user
   */
  async listWorkspaces(accessToken: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/workspaces`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      return response.data.workspaces || [];
    } catch (error) {
      console.error('Failed to list workspaces:', error);
      throw new Error('Failed to retrieve workspaces');
    }
  }
  
  /**
   * Create a task/card in the platform
   */
  async createTask(accessToken: string, workspaceId: string, task: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/workspaces/${workspaceId}/tasks`,
        task,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw new Error('Failed to create task in workflow platform');
    }
  }
  
  /**
   * Post a message to a channel/board
   */
  async postMessage(accessToken: string, channelId: string, message: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/channels/${channelId}/messages`,
        message,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to post message:', error);
      throw new Error('Failed to post message to channel');
    }
  }
} 
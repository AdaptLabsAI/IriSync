// Adobe Express Integration Adapter
// Expects env vars: ADOBE_EXPRESS_CLIENT_ID, ADOBE_EXPRESS_CLIENT_SECRET, ADOBE_EXPRESS_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { TokenRefreshService, TokenData, PlatformConfig } from './TokenRefreshService';

const clientId = process.env.ADOBE_EXPRESS_CLIENT_ID;
const clientSecret = process.env.ADOBE_EXPRESS_CLIENT_SECRET;
const redirectUri = process.env.ADOBE_EXPRESS_REDIRECT_URI;

export interface AdobeExpressProject {
  id: string;
  name: string;
  description?: string;
  lastModified: string;
  created: string;
  thumbnail?: {
    url: string;
    width: number;
    height: number;
  };
  owner?: {
    id: string;
    name?: string;
    email?: string;
  }
}

const ADOBE_CONFIG: PlatformConfig = {
  platform: 'adobe-express',
  clientId,
  clientSecret,
  redirectUri,
  tokenUrl: 'https://ims-na1.adobelogin.com/ims/token/v3'
};

export class AdobeExpressAdapter {
  static getAuthUrl(state: string) {
    if (!clientId || !redirectUri) {
      throw new Error('Missing required environment variables for Adobe Express authentication');
    }
    
    return TokenRefreshService.generateAuthUrl({
      authUrl: 'https://ims-na1.adobelogin.com/ims/authorize/v2',
      clientId,
      redirectUri,
      scopes: ['openid', 'creative_sdk', 'express_api', 'profile', 'address', 'AdobeID', 'email'],
      state,
      additionalParams: {
        // Add any Adobe-specific parameters
      }
    });
  }

  static async handleOAuthCallback(code: string): Promise<TokenData> {
    if (!code) {
      throw new Error('Authorization code is required');
    }

    try {
      return await TokenRefreshService.exchangeCodeForToken(ADOBE_CONFIG, code);
    } catch (error: any) {
      TokenRefreshService.logError('adobe-express', 'oauth_callback', error);
      throw new Error(`Adobe Express authentication failed: ${error.message}`);
    }
  }

  static async refreshToken(refreshToken: string): Promise<TokenData> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const result = await TokenRefreshService.refreshToken(ADOBE_CONFIG, refreshToken);
    
    if (!result.success || !result.tokens) {
      throw new Error(result.error || 'Failed to refresh Adobe Express token');
    }
    
    return result.tokens;
  }

  static async validateToken(accessToken: string): Promise<boolean> {
    if (!accessToken) {
      return false;
    }
    
    if (!clientId) {
      throw new Error('Missing required environment variable ADOBE_EXPRESS_CLIENT_ID');
    }
    
    try {
      const response = await axios.get('https://ims-na1.adobelogin.com/ims/validate_token/v1', {
        params: {
          client_id: clientId,
          token: accessToken
        }
      });
      return response.status === 200;
    } catch (error) {
      TokenRefreshService.logError('adobe-express', 'validate_token', error);
      return false;
    }
  }

  static async getAccountInfo(accessToken: string) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    try {
      // Get user profile info
      const userInfoResponse = await axios.get('https://ims-na1.adobelogin.com/ims/profile/v1', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const userInfo = userInfoResponse.data;

      return {
        id: userInfo.userId || userInfo.sub,
        name: userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim() || 'Adobe Express User',
        email: userInfo.email || '',
        profileUrl: 'https://express.adobe.com',
        accountType: 'storage',
        accountDetails: {
          accountType: userInfo.account_type || 'free',
          country: userInfo.country || '',
          adobeEntitlements: userInfo.entitlements || []
        }
      };
    } catch (error: any) {
      TokenRefreshService.logError('adobe-express', 'get_account_info', error);
      throw new Error(`Failed to retrieve Adobe Express account information: ${error.response?.data?.message || error.message}`);
    }
  }

  static async listFiles(tokens: TokenData, folderId: string | null = null, limit = 100): Promise<any[]> {
    if (!tokens?.access_token) {
      throw new Error('Valid access token is required');
    }

    if (!clientId) {
      throw new Error('Missing required environment variable ADOBE_EXPRESS_CLIENT_ID');
    }

    try {
      // Adobe Express API for projects
      const endpoint = 'https://express.adobe.io/v2/accounts/self/projects';
      
      const response = await axios.get(endpoint, {
        params: {
          limit: limit,
          orderBy: 'lastModified',
          orderDirection: 'desc'
        },
        headers: {
          'x-api-key': clientId,
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      // Map response to our standard file format
      return response.data.projects.map((project: AdobeExpressProject) => ({
        id: project.id,
        name: project.name || 'Untitled Project',
        description: project.description || '',
        type: 'file',  // All Adobe Express items are considered files
        mimeType: 'application/adobe-express-project',
        size: 0,  // Adobe Express API doesn't provide file size
        lastModified: project.lastModified,
        createdTime: project.created,
        thumbnailUrl: project.thumbnail?.url || null,
        editUrl: `https://express.adobe.com/post/edit/${project.id}`,
        owner: project.owner,
        platform: 'adobe-express'
      }));
    } catch (error: any) {
      TokenRefreshService.logError('adobe-express', 'list_files', error);
      
      if (error.response?.status === 401) {
        throw new Error('Unauthorized: Invalid or expired access token');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied: You do not have permission to list projects');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Failed to list Adobe Express projects: ${error.response?.data?.message || error.message}`);
    }
  }

  static async downloadFile(tokens: TokenData, fileId: string): Promise<any> {
    if (!tokens?.access_token) {
      throw new Error('Valid access token is required');
    }

    if (!fileId) {
      throw new Error('File ID is required');
    }

    if (!clientId) {
      throw new Error('Missing required environment variable ADOBE_EXPRESS_CLIENT_ID');
    }

    try {
      // Get project details first
      const projectResponse = await axios.get(`https://express.adobe.io/v2/accounts/self/projects/${fileId}`, {
        headers: {
          'x-api-key': clientId,
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const project = projectResponse.data;
      
      // Adobe Express doesn't provide direct project downloads through their API
      // Instead, they provide a URL to view/edit the project
      // We'll return metadata and include the edit link
      
      const jsonData = JSON.stringify({
        message: 'Adobe Express does not support direct file downloads via API. Please use the editLink to access this project.',
        project: project,
        editLink: `https://express.adobe.com/post/edit/${fileId}`
      }, null, 2);
      
      return {
        data: Buffer.from(jsonData),
        name: `${project.name || 'Untitled'}.json`,
        mimeType: 'application/json',
        editLink: `https://express.adobe.com/post/edit/${fileId}`
      };
    } catch (error: any) {
      TokenRefreshService.logError('adobe-express', 'download_file', error);
      
      if (error.response?.status === 404) {
        throw new Error(`Project not found: ${fileId}`);
      } else if (error.response?.status === 401) {
        throw new Error('Unauthorized: Invalid or expired access token');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied: You do not have permission to access this project');
      }
      
      throw new Error(`Failed to access project from Adobe Express: ${error.response?.data?.message || error.message}`);
    }
  }
} 

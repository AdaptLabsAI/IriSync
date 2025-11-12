// Notion Integration Adapter
// Expects env vars: NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const clientId = process.env.NOTION_CLIENT_ID;
const clientSecret = process.env.NOTION_CLIENT_SECRET;
const redirectUri = process.env.NOTION_REDIRECT_URI;

export interface NotionTokens {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string;
  workspace_icon?: string;
  workspace_id: string;
  owner?: {
    type: string;
    user?: {
      id: string;
      name: string;
      avatar_url?: string;
      object: string;
    }
  }
}

export interface NotionBlock {
  id: string;
  type: string;
  created_time: string;
  last_edited_time: string;
  has_children: boolean;
  object: string;
  [key: string]: any;
}

export interface NotionIcon {
  type: 'emoji' | 'file' | 'external';
  emoji?: string;
  file?: { url: string };
  external?: { url: string };
}

export interface NotionCover {
  type: 'file' | 'external';
  file?: { url: string };
  external?: { url: string };
}

export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  url: string;
  parent: {
    type: string;
    [key: string]: any;
  };
  properties: Record<string, any>;
  object: string;
  archived: boolean;
  cover?: NotionCover | null;
  icon?: NotionIcon | null;
}

export interface NotionDatabase {
  id: string;
  created_time: string;
  last_edited_time: string;
  title: any[];
  properties: Record<string, any>;
  parent: {
    type: string;
    [key: string]: any;
  };
  url: string;
  object: string;
  archived: boolean;
}

export class NotionAdapter {
  static getAuthUrl(state: string) {
    if (!clientId || !redirectUri) {
      throw new Error('Missing required environment variables for Notion authentication');
    }
    
    const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('owner', 'user');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', state || uuidv4());
    
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string): Promise<NotionTokens> {
    if (!code) {
      throw new Error('Authorization code is required');
    }

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing required environment variables for Notion token exchange');
    }

    try {
      const response = await axios.post(
        'https://api.notion.com/v1/oauth/token',
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        },
        {
          auth: {
            username: clientId,
            password: clientSecret
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Notion OAuth error:', error.response?.data || error.message);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Notion authentication failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  static async getWorkspaceInfo(accessToken: string) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    try {
      // Get user information
      const response = await axios.get('https://api.notion.com/v1/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Notion-Version': '2022-06-28'
        }
      });

      return {
        id: response.data.bot?.owner?.workspace_id || response.data.id,
        name: response.data.bot?.owner?.workspace_name || 'Notion Workspace',
        owner: response.data.bot?.owner?.user || response.data,
        botId: response.data.bot?.id
      };
    } catch (error: any) {
      console.error('Error fetching Notion workspace info:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Unauthorized: Invalid or expired access token');
      }
      
      throw new Error(`Failed to fetch Notion workspace info: ${error.response?.data?.message || error.message}`);
    }
  }

  static async listFiles(tokens: any, limit = 100): Promise<any[]> {
    if (!tokens?.access_token) {
      throw new Error('Valid access token is required');
    }

    try {
      const response = await axios.post(
        'https://api.notion.com/v1/search',
        {
          filter: {
            value: 'page',
            property: 'object'
          },
          page_size: limit
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          }
        }
      );

      // Transform to our standard file format
      return response.data.results.map((page: NotionPage) => {
        let title = 'Untitled';
        
        // Extract title from properties
        for (const key in page.properties) {
          const prop = page.properties[key];
          if (prop.type === 'title' && prop.title?.length > 0) {
            title = prop.title.map((t: any) => t.plain_text).join('');
            break;
          }
        }
        
        return {
          id: page.id,
          name: title,
          type: 'page',
          url: page.url,
          lastModified: page.last_edited_time,
          createdTime: page.created_time,
          iconUrl: page.icon?.type === 'emoji' ? null : (page.icon?.type === 'file' ? page.icon.file?.url : (page.icon?.type === 'external' ? page.icon.external?.url : null)),
          coverUrl: page.cover?.type === 'external' ? page.cover.external?.url : (page.cover?.type === 'file' ? page.cover.file?.url : null),
          platform: 'notion'
        };
      });
    } catch (error: any) {
      console.error('Error listing Notion pages:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Unauthorized: Invalid or expired access token');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Failed to list Notion pages: ${error.response?.data?.message || error.message}`);
    }
  }

  static async getPageContent(tokens: any, pageId: string): Promise<NotionBlock[]> {
    if (!tokens?.access_token) {
      throw new Error('Valid access token is required');
    }
    
    if (!pageId) {
      throw new Error('Page ID is required');
    }
    
    try {
      // First, get page metadata
      const pageResponse = await axios.get(`https://api.notion.com/v1/pages/${pageId}`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Notion-Version': '2022-06-28'
        }
      });
      
      // Then, get page blocks
      const blocksResponse = await axios.get(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Notion-Version': '2022-06-28'
        }
      });
      
      return blocksResponse.data.results;
    } catch (error: any) {
      console.error('Error fetching Notion page content:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        throw new Error(`Page not found: ${pageId}`);
      } else if (error.response?.status === 401) {
        throw new Error('Unauthorized: Invalid or expired access token');
      }
      
      throw new Error(`Failed to fetch page content: ${error.response?.data?.message || error.message}`);
    }
  }

  static async downloadFile(tokens: any, pageId: string): Promise<any> {
    if (!tokens?.access_token) {
      throw new Error('Valid access token is required');
    }
    
    if (!pageId) {
      throw new Error('Page ID is required');
    }
    
    try {
      // Get page and its content
      const pageContent = await this.getPageContent(tokens, pageId);
      
      // Get page metadata
      const pageResponse = await axios.get(`https://api.notion.com/v1/pages/${pageId}`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Notion-Version': '2022-06-28'
        }
      });
      
      // Extract title from properties
      let title = 'Untitled';
      for (const key in pageResponse.data.properties) {
        const prop = pageResponse.data.properties[key];
        if (prop.type === 'title' && prop.title?.length > 0) {
          title = prop.title.map((t: any) => t.plain_text).join('');
          break;
        }
      }
      
      // Since Notion doesn't provide a direct download API, we create a JSON representation
      const pageData = {
        id: pageId,
        title: title,
        url: pageResponse.data.url,
        created_time: pageResponse.data.created_time,
        last_edited_time: pageResponse.data.last_edited_time,
        content: pageContent,
        properties: pageResponse.data.properties
      };
      
      // Convert to string for download
      const jsonData = JSON.stringify(pageData, null, 2);
      
      return {
        data: Buffer.from(jsonData),
        name: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.json`,
        mimeType: 'application/json'
      };
    } catch (error: any) {
      console.error('Error exporting Notion page:', error.response?.data || error.message);
      
      // Correct error message since Notion API doesn't provide direct file downloads
      if (error.message === 'Notion file download not supported via public API') {
        throw new Error('Notion page export is provided as JSON. Direct file download is not available via Notion API.');
      }
      
      throw new Error(`Failed to export Notion page: ${error.response?.data?.message || error.message}`);
    }
  }
} 
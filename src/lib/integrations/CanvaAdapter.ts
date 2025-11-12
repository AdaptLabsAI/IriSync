// Canva Integration Adapter
// Expects env vars: CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const clientId = process.env.CANVA_CLIENT_ID;
const clientSecret = process.env.CANVA_CLIENT_SECRET;
const redirectUri = process.env.CANVA_REDIRECT_URI;

export interface CanvaDesign {
  id: string;
  title: string;
  thumbnail: {
    url: string;
    width: number;
    height: number;
  };
  urls: {
    view_url: string;
    edit_url: string;
  };
  created_at: string;
  updated_at: string;
  owner: {
    id: string;
    display_name: string;
  };
  can_edit: boolean;
}

export interface CanvaFolder {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  items: {
    designs: CanvaDesign[];
    folders: CanvaFolder[];
  };
}

export interface CanvaTemplate {
  id: string;
  title: string;
  thumbnail: {
    url: string;
    width: number;
    height: number;
  };
  tags: string[];
  category: string;
  is_premium: boolean;
}

export interface CanvaFile {
  id: string;
  name: string;
  type: 'design' | 'folder' | 'template';
  mimeType: string;
  size?: number;
  lastModified: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  platform: 'canva';
  metadata?: any;
}

export class CanvaAdapter {
  private static baseUrl = 'https://api.canva.com/rest/v1';

  static getAuthUrl(state: string) {
    const authUrl = new URL('https://www.canva.com/api/oauth/authorize');
    authUrl.searchParams.append('client_id', clientId || '');
    authUrl.searchParams.append('redirect_uri', redirectUri || '');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'designs:read designs.metadata:read account:read');
    authUrl.searchParams.append('state', state || uuidv4());
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string) {
    try {
      const response = await axios.post('https://api.canva.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Canva token:', error);
      throw new Error('Failed to authenticate with Canva');
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const response = await axios.post('https://api.canva.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error refreshing Canva token:', error);
      throw new Error('Failed to refresh Canva token');
    }
  }

  static async validateToken(accessToken: string) {
    try {
      await axios.get('https://api.canva.com/v1/accounts/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getAccountInfo(accessToken: string) {
    try {
      const userInfoResponse = await axios.get('https://api.canva.com/v1/accounts/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const userInfo = userInfoResponse.data;

      return {
        id: userInfo.id,
        name: userInfo.name || 'Canva User',
        email: userInfo.email || '',
        profileUrl: userInfo.profileUrl || 'https://www.canva.com/',
        accountType: 'storage',
        accountDetails: {
          accountType: userInfo.accountType || 'free',
          country: userInfo.country || '',
          language: userInfo.language || 'en'
        }
      };
    } catch (error) {
      console.error('Error getting Canva account info:', error);
      throw new Error('Failed to retrieve Canva account information');
    }
  }

  static async downloadFile(accessToken: string, fileId: string) {
    try {
      const metadataResponse = await axios.get(`https://api.canva.com/v1/designs/${fileId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const design = metadataResponse.data;
      
      return {
        downloadUrl: design.urls?.view_url || design.thumbnailUrl,
        filename: `${design.title || 'canva-design'}.png`,
        mimeType: 'image/png'
      };
    } catch (error) {
      console.error('Error downloading Canva file:', error);
      throw new Error('Failed to download Canva design');
    }
  }

  static async getUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Canva user profile:', error);
      throw error;
    }
  }

  static async listDesigns(accessToken: string, folderId?: string, page?: string): Promise<CanvaDesign[]> {
    try {
      const params: any = {};
      if (folderId) params.folder_id = folderId;
      if (page) params.continuation = page;

      const response = await axios.get(`${this.baseUrl}/designs`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error listing Canva designs:', error);
      throw error;
    }
  }

  static async listFolders(accessToken: string, parentId?: string): Promise<CanvaFolder[]> {
    try {
      const params: any = {};
      if (parentId) params.parent_folder_id = parentId;

      const response = await axios.get(`${this.baseUrl}/folders`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error listing Canva folders:', error);
      throw error;
    }
  }

  static async searchTemplates(query: string, category?: string, page?: string): Promise<CanvaTemplate[]> {
    try {
      const params: any = { query };
      if (category) params.category = category;
      if (page) params.continuation = page;

      const response = await axios.get(`${this.baseUrl}/templates`, {
        params
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error searching Canva templates:', error);
      throw error;
    }
  }

  static async createDesign(accessToken: string, templateId?: string, title?: string): Promise<CanvaDesign> {
    try {
      const data: any = {};
      if (templateId) data.template_id = templateId;
      if (title) data.title = title;

      const response = await axios.post(`${this.baseUrl}/designs`, data, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error creating Canva design:', error);
      throw error;
    }
  }

  static async getDesign(accessToken: string, designId: string): Promise<CanvaDesign> {
    try {
      const response = await axios.get(`${this.baseUrl}/designs/${designId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Canva design:', error);
      throw error;
    }
  }

  static async exportDesign(accessToken: string, designId: string, format: 'png' | 'jpg' | 'pdf' | 'mp4' = 'png'): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/designs/${designId}/export`, {
        format
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error exporting Canva design:', error);
      throw error;
    }
  }

  static async listFiles(accessToken: string | null, query?: string, page?: number, type?: 'designs' | 'folders' | 'templates'): Promise<CanvaFile[]> {
    if (!accessToken) {
      throw new Error('Access token required for Canva integration');
    }

    try {
      let files: CanvaFile[] = [];

      switch (type) {
        case 'folders':
          const folders = await this.listFolders(accessToken);
          files = folders.map(folder => this.formatFolderAsFile(folder));
          break;
          
        case 'templates':
          if (query) {
            const templates = await this.searchTemplates(query);
            files = templates.map(template => this.formatTemplateAsFile(template));
          }
          break;
          
        case 'designs':
        default:
          const designs = await this.listDesigns(accessToken);
          files = designs.map(design => this.formatDesignAsFile(design));
          break;
      }

      if (query && type !== 'templates') {
        files = files.filter(file => 
          file.name.toLowerCase().includes(query.toLowerCase())
        );
      }

      return files;
    } catch (error) {
      console.error('Error listing Canva files:', error);
      throw error;
    }
  }

  static formatDesignAsFile(design: CanvaDesign): CanvaFile {
    return {
      id: design.id,
      name: design.title,
      type: 'design',
      mimeType: 'application/x-canva-design',
      lastModified: design.updated_at,
      thumbnailUrl: design.thumbnail.url,
      downloadUrl: design.urls.view_url,
      platform: 'canva',
      metadata: {
        editUrl: design.urls.edit_url,
        owner: design.owner,
        canEdit: design.can_edit,
        dimensions: {
          width: design.thumbnail.width,
          height: design.thumbnail.height
        }
      }
    };
  }

  static formatFolderAsFile(folder: CanvaFolder): CanvaFile {
    return {
      id: folder.id,
      name: folder.name,
      type: 'folder',
      mimeType: 'application/x-folder',
      lastModified: folder.updated_at,
      platform: 'canva',
      metadata: {
        itemCount: (folder.items?.designs?.length || 0) + (folder.items?.folders?.length || 0)
      }
    };
  }

  static formatTemplateAsFile(template: CanvaTemplate): CanvaFile {
    return {
      id: template.id,
      name: template.title,
      type: 'template',
      mimeType: 'application/x-canva-template',
      lastModified: new Date().toISOString(),
      thumbnailUrl: template.thumbnail.url,
      platform: 'canva',
      metadata: {
        tags: template.tags,
        category: template.category,
        isPremium: template.is_premium,
        dimensions: {
          width: template.thumbnail.width,
          height: template.thumbnail.height
        }
      }
    };
  }
} 
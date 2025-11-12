// OneDrive Integration Adapter
// Expects env vars: ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, ONEDRIVE_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const clientId = process.env.ONEDRIVE_CLIENT_ID;
const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
const redirectUri = process.env.ONEDRIVE_REDIRECT_URI;

export class OneDriveAdapter {
  static getAuthUrl(state: string) {
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.append('client_id', clientId || '');
    authUrl.searchParams.append('redirect_uri', redirectUri || '');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'offline_access Files.Read User.Read');
    authUrl.searchParams.append('state', state || uuidv4());
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string) {
    try {
      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: clientId || '',
          client_secret: clientSecret || '',
          redirect_uri: redirectUri || '',
          code: code,
          grant_type: 'authorization_code'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting OneDrive token:', error);
      throw new Error('Failed to authenticate with OneDrive');
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: clientId || '',
          client_secret: clientSecret || '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error refreshing OneDrive token:', error);
      throw new Error('Failed to refresh OneDrive token');
    }
  }

  static async validateToken(accessToken: string) {
    try {
      await axios.get('https://graph.microsoft.com/v1.0/me', {
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
      // Get user profile info
      const userInfoResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      // Get drive info
      const driveResponse = await axios.get('https://graph.microsoft.com/v1.0/me/drive', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const userInfo = userInfoResponse.data;
      const driveInfo = driveResponse.data;

      return {
        id: userInfo.id,
        name: userInfo.displayName || 'OneDrive User',
        email: userInfo.userPrincipalName || userInfo.mail || '',
        profileUrl: '',
        accountType: 'storage',
        accountDetails: {
          driveId: driveInfo.id,
          driveType: driveInfo.driveType,
          usedStorage: driveInfo.quota?.used || 0,
          totalStorage: driveInfo.quota?.total || 0
        }
      };
    } catch (error) {
      console.error('Error getting OneDrive account info:', error);
      throw new Error('Failed to retrieve OneDrive account information');
    }
  }

  static async listFiles(accessToken: string, folderId: string | null = null) {
    try {
      let endpoint;
      
      if (!folderId || folderId === '/') {
        // Root folder
        endpoint = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
      } else {
        // Specific folder
        endpoint = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;
      }

      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      // Map response to our standard file format
      return response.data.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.folder ? 'folder' : 'file',
        mimeType: item.file ? item.file.mimeType : 'folder',
        size: item.size || 0,
        lastModified: item.lastModifiedDateTime,
        thumbnailUrl: item.thumbnailUrl || null,
        platform: 'onedrive'
      }));
    } catch (error) {
      console.error('Error listing OneDrive files:', error);
      throw new Error('Failed to list OneDrive files');
    }
  }

  static async downloadFile(accessToken: string, fileId: string) {
    try {
      // Get file metadata first
      const metadataResponse = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const metadata = metadataResponse.data;

      // Download the file content
      const response = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        responseType: 'arraybuffer'
      });

      return {
        data: response.data,
        name: metadata.name,
        mimeType: metadata.file?.mimeType || 'application/octet-stream'
      };
    } catch (error) {
      console.error('Error downloading OneDrive file:', error);
      throw new Error('Failed to download file from OneDrive');
    }
  }
} 
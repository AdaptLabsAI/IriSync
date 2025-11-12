// Dropbox Integration Adapter
// Expects env vars: DROPBOX_CLIENT_ID, DROPBOX_CLIENT_SECRET, DROPBOX_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const clientId = process.env.DROPBOX_CLIENT_ID;
const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
const redirectUri = process.env.DROPBOX_REDIRECT_URI;

export class DropboxAdapter {
  static getAuthUrl(state: string) {
    const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
    authUrl.searchParams.append('client_id', clientId || '');
    authUrl.searchParams.append('redirect_uri', redirectUri || '');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('token_access_type', 'offline');
    authUrl.searchParams.append('state', state || uuidv4());
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string) {
    try {
      const response = await axios.post('https://api.dropboxapi.com/oauth2/token', null, {
        params: {
          code,
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Dropbox token:', error);
      throw new Error('Failed to authenticate with Dropbox');
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const response = await axios.post('https://api.dropboxapi.com/oauth2/token', null, {
        params: {
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error refreshing Dropbox token:', error);
      throw new Error('Failed to refresh Dropbox token');
    }
  }

  static async validateToken(accessToken: string) {
    try {
      await axios.post('https://api.dropboxapi.com/2/users/get_current_account', null, {
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
      const userInfoResponse = await axios.post(
        'https://api.dropboxapi.com/2/users/get_current_account',
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const userInfo = userInfoResponse.data;
      
      // Get space usage
      const spaceUsageResponse = await axios.post(
        'https://api.dropboxapi.com/2/users/get_space_usage',
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const spaceUsage = spaceUsageResponse.data;

      return {
        id: userInfo.account_id,
        name: userInfo.name?.display_name || 'Dropbox User',
        email: userInfo.email || '',
        profileUrl: userInfo.profile_photo_url || '',
        accountType: 'storage',
        accountDetails: {
          usedStorage: spaceUsage.used,
          totalStorage: spaceUsage.allocation?.allocated || 0,
          country: userInfo.country,
          accountTypeString: userInfo.account_type ? userInfo.account_type['.tag'] : 'basic'
        }
      };
    } catch (error) {
      console.error('Error getting Dropbox account info:', error);
      throw new Error('Failed to retrieve Dropbox account information');
    }
  }

  static async listFiles(accessToken: string, folderId: string | null = null) {
    try {
      // Dropbox uses paths rather than IDs for folders, but we'll use IDs in our interface for consistency
      // The root folder has a null or "/" folderId
      const path = folderId === null ? '' : folderId;

      const response = await axios.post(
        'https://api.dropboxapi.com/2/files/list_folder',
        {
          path: path,
          recursive: false,
          include_media_info: true,
          include_deleted: false,
          include_has_explicit_shared_members: false
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Map response to our standard file format
      return response.data.entries.map((entry: any) => ({
        id: entry.path_display,
        name: entry.name,
        type: entry['.tag'] === 'folder' ? 'folder' : 'file',
        mimeType: entry['.tag'] === 'file' ? entry.media_info?.metadata?.media_type || 'application/octet-stream' : 'folder',
        size: entry.size || 0,
        lastModified: entry.server_modified,
        // Thumbnails require a separate API call, so we'll leave this empty for now
        thumbnailUrl: null,
        platform: 'dropbox'
      }));
    } catch (error) {
      console.error('Error listing Dropbox files:', error);
      throw new Error('Failed to list Dropbox files');
    }
  }

  static async downloadFile(accessToken: string, fileId: string) {
    try {
      // Get file metadata first
      const metadataResponse = await axios.post(
        'https://api.dropboxapi.com/2/files/get_metadata',
        {
          path: fileId,
          include_media_info: true
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const metadata = metadataResponse.data;

      // Download the file
      const response = await axios.post(
        'https://content.dropboxapi.com/2/files/download',
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Dropbox-API-Arg': JSON.stringify({ path: fileId })
          },
          responseType: 'arraybuffer'
        }
      );

      // Determine mime type from metadata or file extension
      let mimeType = 'application/octet-stream'; // Default
      if (metadata.media_info?.metadata?.media_type) {
        mimeType = metadata.media_info.metadata.media_type;
      } else {
        // Try to infer from file extension
        const extension = metadata.name.split('.').pop()?.toLowerCase();
        if (extension) {
          const mimeTypeMap: { [key: string]: string } = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'txt': 'text/plain',
            'html': 'text/html',
            'csv': 'text/csv'
          };
          mimeType = mimeTypeMap[extension] || mimeType;
        }
      }

      return {
        data: response.data,
        name: metadata.name,
        mimeType
      };
    } catch (error) {
      console.error('Error downloading Dropbox file:', error);
      throw new Error('Failed to download file from Dropbox');
    }
  }

  static async getThumbnail(accessToken: string, path: string, size: 'w32h32' | 'w64h64' | 'w128h128' | 'w640h480' | 'w1024h768' = 'w128h128') {
    try {
      const response = await axios.post(
        'https://content.dropboxapi.com/2/files/get_thumbnail_v2',
        {
          resource: { '.tag': 'path', path },
          format: 'jpeg',
          size,
          mode: 'strict'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      return {
        data: response.data,
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      console.error('Error getting Dropbox thumbnail:', error);
      // Return null instead of throwing since thumbnails are optional
      return null;
    }
  }

  // Additional methods for file operations could be added here:
  // - uploadFile
  // - createFolder
  // - deleteFile
  // - searchFiles
} 
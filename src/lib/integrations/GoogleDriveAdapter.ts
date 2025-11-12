// Google Drive Integration Adapter
// Expects env vars: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { getGoogleOAuthClientId } from '@/lib/server/env';

const clientId = getGoogleOAuthClientId();
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

export class GoogleDriveAdapter {
  static getAuthUrl(state: string) {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
    authUrl.searchParams.append('client_id', clientId || '');
    authUrl.searchParams.append('redirect_uri', redirectUri || '');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', state || uuidv4());
    authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Google token:', error);
      throw new Error('Failed to authenticate with Google Drive');
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token'
      });

      return response.data;
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      throw new Error('Failed to refresh Google Drive token');
    }
  }

  static async validateToken(accessToken: string) {
    try {
      await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
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
      const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const userInfo = userInfoResponse.data;

      // Get Drive storage info
      const aboutResponse = await axios.get('https://www.googleapis.com/drive/v3/about', {
        params: {
          fields: 'user,storageQuota'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const aboutInfo = aboutResponse.data;

      return {
        id: userInfo.sub,
        name: userInfo.name || 'Google User',
        email: userInfo.email || '',
        profileUrl: userInfo.picture || '',
        accountType: 'storage',
        accountDetails: {
          usedStorage: aboutInfo.storageQuota?.usageInDrive,
          totalStorage: aboutInfo.storageQuota?.limit,
          emailVerified: userInfo.email_verified
        }
      };
    } catch (error) {
      console.error('Error getting Google account info:', error);
      throw new Error('Failed to retrieve Google account information');
    }
  }

  static async listFiles(accessToken: string, folderId: string | null = null) {
    try {
      let query = "trashed = false";
      if (folderId === null) {
        query += " and 'root' in parents";
      } else {
        query += ` and '${folderId}' in parents`;
      }

      const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
        params: {
          q: query,
          fields: 'files(id,name,mimeType,size,modifiedTime,thumbnailLink)',
          pageSize: 100
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
        mimeType: file.mimeType,
        size: parseInt(file.size || '0', 10),
        lastModified: file.modifiedTime,
        thumbnailUrl: file.thumbnailLink,
        platform: 'google-drive'
      }));
    } catch (error) {
      console.error('Error listing Google Drive files:', error);
      throw new Error('Failed to list Google Drive files');
    }
  }

  static async downloadFile(accessToken: string, fileId: string) {
    try {
      // First, get file metadata to determine the type
      const metadataResponse = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        params: {
          fields: 'name,mimeType'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const { mimeType, name } = metadataResponse.data;

      // Check if this is a Google Apps file that needs export
      if (mimeType.startsWith('application/vnd.google-apps')) {
        // Map Google document types to export formats
        let exportMimeType = 'application/pdf'; // Default export format
        if (mimeType === 'application/vnd.google-apps.document') {
          exportMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; // Export as DOCX
        } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
          exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; // Export as XLSX
        } else if (mimeType === 'application/vnd.google-apps.presentation') {
          exportMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'; // Export as PPTX
        }

        // Export the file
        const response = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}/export`, {
          params: {
            mimeType: exportMimeType
          },
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          responseType: 'arraybuffer'
        });

        return {
          data: response.data,
          name: `${name}.${exportMimeType.split('/').pop()}`, // Add appropriate extension
          mimeType: exportMimeType
        };
      } else {
        // For regular files, download directly
        const response = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
          params: {
            alt: 'media'
          },
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          responseType: 'arraybuffer'
        });

        return {
          data: response.data,
          name,
          mimeType
        };
      }
    } catch (error) {
      console.error('Error downloading Google Drive file:', error);
      throw new Error('Failed to download file from Google Drive');
    }
  }

  // Additional methods for file operations could be added here:
  // - uploadFile
  // - createFolder
  // - deleteFile
  // - searchFiles
} 
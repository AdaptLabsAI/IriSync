// Airtable Integration Adapter
// Expects env vars: AIRTABLE_CLIENT_ID, AIRTABLE_CLIENT_SECRET, AIRTABLE_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const clientId = process.env.AIRTABLE_CLIENT_ID;
const clientSecret = process.env.AIRTABLE_CLIENT_SECRET;
const redirectUri = process.env.AIRTABLE_REDIRECT_URI;

export interface AirtableTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  workspace_id?: string;
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
}

export class AirtableAdapter {
  static getAuthUrl(state: string) {
    if (!clientId || !redirectUri) {
      throw new Error('Missing required environment variables for Airtable authentication');
    }
    
    const authUrl = new URL('https://airtable.com/oauth2/v1/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', 'data.records:read data.records:write schema.bases:read');
    authUrl.searchParams.append('state', state || uuidv4());
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string): Promise<AirtableTokens> {
    if (!code) {
      throw new Error('Authorization code is required');
    }

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing required environment variables for Airtable token exchange');
    }

    try {
      const response = await axios.post(
        'https://airtable.com/oauth2/v1/token',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded' 
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Airtable OAuth error:', error.response?.data || error.message);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Airtable authentication failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  static async refreshToken(refreshToken: string): Promise<AirtableTokens> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    if (!clientId || !clientSecret) {
      throw new Error('Missing required environment variables for Airtable token refresh');
    }

    try {
      const response = await axios.post(
        'https://airtable.com/oauth2/v1/token',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded' 
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Airtable token refresh error:', error.response?.data || error.message);
      throw new Error(`Failed to refresh Airtable token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  static async getBases(accessToken: string) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    try {
      const response = await axios.get('https://api.airtable.com/v0/meta/bases', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data.bases.map((base: any) => ({
        id: base.id,
        name: base.name,
        permission: base.permission,
      }));
    } catch (error: any) {
      console.error('Error fetching Airtable bases:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Unauthorized: Invalid or expired access token');
      }
      
      throw new Error(`Failed to fetch Airtable bases: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  static async getTables(accessToken: string, baseId: string) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }
    
    if (!baseId) {
      throw new Error('Base ID is required');
    }

    try {
      const response = await axios.get(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data.tables.map((table: any) => ({
        id: table.id,
        name: table.name,
        primaryFieldId: table.primaryFieldId,
        fields: table.fields,
      }));
    } catch (error: any) {
      console.error('Error fetching Airtable tables:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        throw new Error(`Base not found: ${baseId}`);
      }
      
      throw new Error(`Failed to fetch tables from base ${baseId}: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  static async listFiles(tokens: any, baseId: string, tableId: string, limit = 100) {
    if (!tokens?.access_token) {
      throw new Error('Valid access token is required');
    }
    
    if (!baseId) {
      throw new Error('Base ID is required');
    }
    
    if (!tableId) {
      throw new Error('Table ID is required');
    }

    try {
      const response = await axios.get(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        },
        params: {
          maxRecords: limit,
          view: 'Grid view' // Default view
        }
      });

      // Transform the response to our standard file format
      return response.data.records.map((record: AirtableRecord) => {
        // Find attachment fields
        const attachments: AirtableAttachment[] = [];
        
        for (const [fieldName, value] of Object.entries(record.fields)) {
          if (Array.isArray(value) && value.length > 0 && value[0].url) {
            value.forEach((attachment: any) => {
              if (attachment.url) {
                attachments.push({
                  id: attachment.id || `${record.id}-${fieldName}`,
                  url: attachment.url,
                  filename: attachment.filename || 'Unknown filename',
                  size: attachment.size || 0,
                  type: attachment.type || 'application/octet-stream'
                });
              }
            });
          }
        }

        return {
          id: record.id,
          recordData: record.fields,
          attachments: attachments,
          createdTime: record.createdTime,
          platform: 'airtable'
        };
      });
    } catch (error: any) {
      console.error('Error listing Airtable records:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Unauthorized: Invalid or expired access token');
      } else if (error.response?.status === 404) {
        throw new Error(`Base or table not found: ${baseId}/${tableId}`);
      } else if (error.response?.status === 403) {
        throw new Error('Permission denied: You do not have access to this base or table');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Failed to list Airtable records: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  static async downloadFile(tokens: any, attachmentUrl: string) {
    if (!tokens?.access_token) {
      throw new Error('Valid access token is required');
    }
    
    if (!attachmentUrl) {
      throw new Error('Attachment URL is required');
    }

    try {
      const response = await axios.get(attachmentUrl, {
        responseType: 'arraybuffer'
      });

      // Extract filename from URL or use a default
      const urlParts = attachmentUrl.split('/');
      const filename = urlParts[urlParts.length - 1].split('?')[0] || 'airtable_file';
      
      return {
        data: response.data,
        name: filename,
        mimeType: response.headers['content-type'] || 'application/octet-stream'
      };
    } catch (error: any) {
      console.error('Error downloading Airtable attachment:', error.message);
      
      if (error.response?.status === 404) {
        throw new Error('File not found or has been deleted');
      }
      
      throw new Error(`Failed to download Airtable attachment: ${error.message}`);
    }
  }
} 
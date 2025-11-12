// Zoho CRM Integration Adapter
// Expects env vars: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const clientId = process.env.ZOHO_CLIENT_ID;
const clientSecret = process.env.ZOHO_CLIENT_SECRET;
const redirectUri = process.env.ZOHO_REDIRECT_URI;

// Zoho requires a specific region for API endpoints
const zohoRegion = process.env.ZOHO_REGION || 'com'; // Default to US region

export class ZohoCRMAdapter {
  static getAuthUrl(state: string) {
    const authUrl = new URL(`https://accounts.zoho.${zohoRegion}/oauth/v2/auth`);
    authUrl.searchParams.append('client_id', clientId || '');
    authUrl.searchParams.append('redirect_uri', redirectUri || '');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('state', state || uuidv4());
    authUrl.searchParams.append('scope', 'ZohoCRM.modules.ALL,ZohoCRM.users.ALL');
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string) {
    try {
      const response = await axios.post(`https://accounts.zoho.${zohoRegion}/oauth/v2/token`, null, {
        params: {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Zoho token:', error);
      throw new Error('Failed to authenticate with Zoho CRM');
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const response = await axios.post(`https://accounts.zoho.${zohoRegion}/oauth/v2/token`, null, {
        params: {
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error refreshing Zoho token:', error);
      throw new Error('Failed to refresh Zoho CRM token');
    }
  }

  static async validateToken(accessToken: string) {
    try {
      await axios.get(`https://www.zohoapis.${zohoRegion}/crm/v3/org`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getAccountInfo(accessToken: string) {
    try {
      // Get user info
      const userResponse = await axios.get(`https://www.zohoapis.${zohoRegion}/crm/v3/users?type=CurrentUser`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        }
      });
      
      // Get org info
      const orgResponse = await axios.get(`https://www.zohoapis.${zohoRegion}/crm/v3/org`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        }
      });

      const user = userResponse.data.users[0] || {};
      const org = orgResponse.data.org[0] || {};

      return {
        id: user.id || '',
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Zoho User',
        email: user.email || '',
        profileUrl: user.profile_url || '',
        accountType: 'crm',
        accountDetails: {
          companyName: org.company_name || '',
          orgId: org.id,
          licenseDetails: org.license_details
        }
      };
    } catch (error) {
      console.error('Error getting Zoho account info:', error);
      throw new Error('Failed to retrieve Zoho account information');
    }
  }

  static async getContacts(accessToken: string, limit = 100) {
    try {
      const response = await axios.get(`https://www.zohoapis.${zohoRegion}/crm/v3/Contacts`, {
        params: {
          per_page: limit
        },
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error getting Zoho contacts:', error);
      throw new Error('Failed to retrieve Zoho contacts');
    }
  }

  static async getDeals(accessToken: string, limit = 100) {
    try {
      const response = await axios.get(`https://www.zohoapis.${zohoRegion}/crm/v3/Deals`, {
        params: {
          per_page: limit
        },
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error getting Zoho deals:', error);
      throw new Error('Failed to retrieve Zoho deals');
    }
  }
} 
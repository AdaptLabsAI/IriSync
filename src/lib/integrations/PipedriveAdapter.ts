// Pipedrive Integration Adapter
// Expects env vars: PIPEDRIVE_CLIENT_ID, PIPEDRIVE_CLIENT_SECRET, PIPEDRIVE_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const clientId = process.env.PIPEDRIVE_CLIENT_ID;
const clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET;
const redirectUri = process.env.PIPEDRIVE_REDIRECT_URI;

export class PipedriveAdapter {
  static getAuthUrl(state: string) {
    const authUrl = new URL('https://oauth.pipedrive.com/oauth/authorize');
    authUrl.searchParams.append('client_id', clientId || '');
    authUrl.searchParams.append('redirect_uri', redirectUri || '');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state || uuidv4());
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string) {
    try {
      const response = await axios.post('https://oauth.pipedrive.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Pipedrive token:', error);
      throw new Error('Failed to authenticate with Pipedrive');
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const response = await axios.post('https://oauth.pipedrive.com/oauth/token', {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error refreshing Pipedrive token:', error);
      throw new Error('Failed to refresh Pipedrive token');
    }
  }

  static async validateToken(accessToken: string) {
    try {
      await axios.get('https://api.pipedrive.com/v1/users/me', {
        params: {
          api_token: accessToken
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
      const userResponse = await axios.get('https://api.pipedrive.com/v1/users/me', {
        params: {
          api_token: accessToken
        }
      });

      // Get company info
      const companyResponse = await axios.get('https://api.pipedrive.com/v1/userSettings', {
        params: {
          api_token: accessToken
        }
      });

      const user = userResponse.data.data;
      const company = companyResponse.data.data;

      return {
        id: user.id.toString(),
        name: `${user.name}`,
        email: user.email,
        profileUrl: user.icon_url || '',
        accountType: 'crm',
        accountDetails: {
          companyName: company.company_name || '',
          companyDomain: company.company_domain || '',
          locale: company.locale || 'en_US'
        }
      };
    } catch (error) {
      console.error('Error getting Pipedrive account info:', error);
      throw new Error('Failed to retrieve Pipedrive account information');
    }
  }

  static async getContacts(accessToken: string, limit = 100) {
    try {
      const response = await axios.get('https://api.pipedrive.com/v1/persons', {
        params: {
          api_token: accessToken,
          limit
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error getting Pipedrive contacts:', error);
      throw new Error('Failed to retrieve Pipedrive contacts');
    }
  }

  static async getDeals(accessToken: string, limit = 100) {
    try {
      const response = await axios.get('https://api.pipedrive.com/v1/deals', {
        params: {
          api_token: accessToken,
          limit,
          status: 'open'
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error getting Pipedrive deals:', error);
      throw new Error('Failed to retrieve Pipedrive deals');
    }
  }
} 
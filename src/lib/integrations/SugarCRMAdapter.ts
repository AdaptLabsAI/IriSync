// SugarCRM Integration Adapter
// Expects env vars: SUGARCRM_URL, SUGARCRM_CLIENT_ID, SUGARCRM_CLIENT_SECRET, SUGARCRM_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const sugarCrmUrl = process.env.SUGARCRM_URL; // URL to your SugarCRM instance
const clientId = process.env.SUGARCRM_CLIENT_ID;
const clientSecret = process.env.SUGARCRM_CLIENT_SECRET;
const redirectUri = process.env.SUGARCRM_REDIRECT_URI;

export class SugarCRMAdapter {
  static getAuthUrl(state: string) {
    if (!sugarCrmUrl) {
      throw new Error('SUGARCRM_URL environment variable is not set');
    }
    
    const authUrl = new URL(`${sugarCrmUrl}/oauth2/authorize`);
    authUrl.searchParams.append('client_id', clientId || '');
    authUrl.searchParams.append('redirect_uri', redirectUri || '');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state || uuidv4());
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string) {
    try {
      if (!sugarCrmUrl) {
        throw new Error('SUGARCRM_URL environment variable is not set');
      }
      
      const response = await axios.post(`${sugarCrmUrl}/oauth2/token`, {
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
      console.error('Error getting SugarCRM token:', error);
      throw new Error('Failed to authenticate with SugarCRM');
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      if (!sugarCrmUrl) {
        throw new Error('SUGARCRM_URL environment variable is not set');
      }
      
      const response = await axios.post(`${sugarCrmUrl}/oauth2/token`, {
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
      console.error('Error refreshing SugarCRM token:', error);
      throw new Error('Failed to refresh SugarCRM token');
    }
  }

  static async validateToken(accessToken: string) {
    try {
      if (!sugarCrmUrl) {
        throw new Error('SUGARCRM_URL environment variable is not set');
      }
      
      await axios.get(`${sugarCrmUrl}/rest/v11/me`, {
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
      if (!sugarCrmUrl) {
        throw new Error('SUGARCRM_URL environment variable is not set');
      }
      
      // Get current user info
      const userResponse = await axios.get(`${sugarCrmUrl}/rest/v11/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      // Get system info (for company details)
      const systemInfoResponse = await axios.get(`${sugarCrmUrl}/rest/v11/system/info`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const user = userResponse.data;
      const systemInfo = systemInfoResponse.data;

      return {
        id: user.current_user.id || '',
        name: `${user.current_user.first_name || ''} ${user.current_user.last_name || ''}`.trim() || 'SugarCRM User',
        email: user.current_user.email || '',
        profileUrl: `${sugarCrmUrl}/#Users/${user.current_user.id}`,
        accountType: 'crm',
        accountDetails: {
          companyName: systemInfo.system_info?.flavor?.name || '',
          sugarVersion: systemInfo.system_info?.version || '',
          instanceUrl: sugarCrmUrl || ''
        }
      };
    } catch (error) {
      console.error('Error getting SugarCRM account info:', error);
      throw new Error('Failed to retrieve SugarCRM account information');
    }
  }

  static async getContacts(accessToken: string, limit = 100) {
    try {
      if (!sugarCrmUrl) {
        throw new Error('SUGARCRM_URL environment variable is not set');
      }
      
      const response = await axios.get(`${sugarCrmUrl}/rest/v11/Contacts`, {
        params: {
          max_num: limit,
          fields: 'id,first_name,last_name,email,phone_work,account_name'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data.records || [];
    } catch (error) {
      console.error('Error getting SugarCRM contacts:', error);
      throw new Error('Failed to retrieve SugarCRM contacts');
    }
  }

  static async getDeals(accessToken: string, limit = 100) {
    try {
      if (!sugarCrmUrl) {
        throw new Error('SUGARCRM_URL environment variable is not set');
      }
      
      // In SugarCRM, "Opportunities" are the equivalent of deals
      const response = await axios.get(`${sugarCrmUrl}/rest/v11/Opportunities`, {
        params: {
          max_num: limit,
          fields: 'id,name,amount,sales_stage,date_closed,account_name',
          order_by: 'date_modified:desc'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data.records || [];
    } catch (error) {
      console.error('Error getting SugarCRM opportunities:', error);
      throw new Error('Failed to retrieve SugarCRM opportunities');
    }
  }
}
// Salesforce Integration Adapter
// Expects env vars: SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, SALESFORCE_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const clientId = process.env.SALESFORCE_CLIENT_ID;
const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
const redirectUri = process.env.SALESFORCE_REDIRECT_URI;

export class SalesforceAdapter {
  static getAuthUrl(state: string) {
    // Using the login URL for all Salesforce instances (login.salesforce.com)
    // Production environments could switch to using login.salesforce.com
    const authUrl = new URL('https://login.salesforce.com/services/oauth2/authorize');
    authUrl.searchParams.append('client_id', clientId || '');
    authUrl.searchParams.append('redirect_uri', redirectUri || '');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state || uuidv4());
    // Add the standard API access scope
    authUrl.searchParams.append('scope', 'api refresh_token');
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string) {
    try {
      const response = await axios.post('https://login.salesforce.com/services/oauth2/token', null, {
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

      // Salesforce returns additional information like instance_url that we'll need
      return response.data;
    } catch (error) {
      console.error('Error getting Salesforce token:', error);
      throw new Error('Failed to authenticate with Salesforce');
    }
  }

  static async refreshToken(refreshToken: string, instanceUrl: string) {
    try {
      const response = await axios.post(`${instanceUrl}/services/oauth2/token`, null, {
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
      console.error('Error refreshing Salesforce token:', error);
      throw new Error('Failed to refresh Salesforce token');
    }
  }

  static async validateToken(accessToken: string, instanceUrl: string) {
    try {
      await axios.get(`${instanceUrl}/services/data/v57.0/sobjects/Account`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getAccountInfo(accessToken: string, instanceUrl: string) {
    try {
      // Get current user info
      const userResponse = await axios.get(`${instanceUrl}/services/data/v57.0/chatter/users/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      // Get organization info
      const orgResponse = await axios.get(`${instanceUrl}/services/data/v57.0/sobjects/Organization/describe`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const user = userResponse.data;

      return {
        id: user.id || '',
        name: user.displayName || 'Salesforce User',
        email: user.email || '',
        profileUrl: user.photo?.photoUrl || '',
        accountType: 'crm',
        accountDetails: {
          companyName: user.companyName || '',
          organizationId: user.organizationId,
          instanceUrl
        }
      };
    } catch (error) {
      console.error('Error getting Salesforce account info:', error);
      throw new Error('Failed to retrieve Salesforce account information');
    }
  }

  static async getContacts(accessToken: string, instanceUrl: string, limit = 100) {
    try {
      const response = await axios.get(
        `${instanceUrl}/services/data/v57.0/query/?q=SELECT Id, Name, Email, Phone, Account.Name FROM Contact LIMIT ${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.records;
    } catch (error) {
      console.error('Error getting Salesforce contacts:', error);
      throw new Error('Failed to retrieve Salesforce contacts');
    }
  }

  static async getDeals(accessToken: string, instanceUrl: string, limit = 100) {
    try {
      const response = await axios.get(
        `${instanceUrl}/services/data/v57.0/query/?q=SELECT Id, Name, Amount, StageName, CloseDate, Account.Name FROM Opportunity LIMIT ${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.records;
    } catch (error) {
      console.error('Error getting Salesforce opportunities:', error);
      throw new Error('Failed to retrieve Salesforce opportunities');
    }
  }
} 
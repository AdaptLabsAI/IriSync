// HubSpot Integration Adapter
// Expects env vars: HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, HUBSPOT_REDIRECT_URI
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const clientId = process.env.HUBSPOT_CLIENT_ID;
const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
const redirectUri = process.env.HUBSPOT_REDIRECT_URI;

export class HubspotAdapter {
  static getAuthUrl(state: string) {
    const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
    authUrl.searchParams.append('client_id', clientId || '');
    authUrl.searchParams.append('redirect_uri', redirectUri || '');
    authUrl.searchParams.append('scope', 'contacts crm.objects.contacts.read crm.objects.deals.read');
    authUrl.searchParams.append('state', state || uuidv4());
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string) {
    try {
      const response = await axios.post('https://api.hubapi.com/oauth/v1/token', null, {
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
      console.error('Error getting HubSpot token:', error);
      throw new Error('Failed to authenticate with HubSpot');
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const response = await axios.post('https://api.hubapi.com/oauth/v1/token', null, {
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
      console.error('Error refreshing HubSpot token:', error);
      throw new Error('Failed to refresh HubSpot token');
    }
  }

  static async validateToken(accessToken: string) {
    try {
      await axios.get('https://api.hubapi.com/oauth/v1/access-tokens', {
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
      // Get user info
      const userResponse = await axios.get('https://api.hubapi.com/integrations/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      // Get account info
      const accountResponse = await axios.get('https://api.hubapi.com/integrations/v1/me/accounts', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const user = userResponse.data;
      const account = accountResponse.data[0] || {};

      return {
        id: user.user_id || '',
        name: user.user || account.name || 'HubSpot User',
        email: user.email || '',
        profileUrl: `https://app.hubspot.com/`,
        accountType: 'crm',
        accountDetails: {
          portalId: account.portalId,
          companyName: account.name
        }
      };
    } catch (error) {
      console.error('Error getting HubSpot account info:', error);
      throw new Error('Failed to retrieve HubSpot account information');
    }
  }

  static async getContacts(accessToken: string, limit = 10) {
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        params: {
          limit: limit,
          properties: ['firstname', 'lastname', 'email', 'phone', 'company']
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.results;
    } catch (error) {
      console.error('Error getting HubSpot contacts:', error);
      throw new Error('Failed to retrieve HubSpot contacts');
    }
  }

  static async getDeals(accessToken: string, limit = 10) {
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/deals', {
        params: {
          limit: limit,
          properties: ['dealname', 'amount', 'dealstage', 'closedate', 'hubspot_owner_id', 'pipeline'],
          associations: ['companies']
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.results;
    } catch (error) {
      console.error('Error getting HubSpot deals:', error);
      throw new Error('Failed to retrieve HubSpot deals');
    }
  }

  static async createContact(accessToken: string, contactData: Record<string, any>) {
    try {
      const response = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        {
          properties: contactData
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating HubSpot contact:', error);
      throw new Error('Failed to create HubSpot contact');
    }
  }
} 
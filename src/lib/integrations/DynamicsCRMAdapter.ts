// Microsoft Dynamics 365 CRM Integration Adapter
// Expects env vars: DYNAMICS_CLIENT_ID, DYNAMICS_CLIENT_SECRET, DYNAMICS_REDIRECT_URI, DYNAMICS_TENANT_ID
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const clientId = process.env.DYNAMICS_CLIENT_ID;
const clientSecret = process.env.DYNAMICS_CLIENT_SECRET;
const redirectUri = process.env.DYNAMICS_REDIRECT_URI;
const tenantId = process.env.DYNAMICS_TENANT_ID || 'common';

// The dynamics instance URL will be obtained during OAuth flow
// It typically looks like: https://org12345.api.crm.dynamics.com/

export class DynamicsCRMAdapter {
  static getAuthUrl(state: string) {
    const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
    authUrl.searchParams.append('client_id', clientId || '');
    authUrl.searchParams.append('redirect_uri', redirectUri || '');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state || uuidv4());
    authUrl.searchParams.append('scope', 'https://dynamics.microsoft.com/user_impersonation offline_access');
    return authUrl.toString();
  }

  static async handleOAuthCallback(code: string) {
    try {
      const response = await axios.post(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, 
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId || '',
          client_secret: clientSecret || '',
          redirect_uri: redirectUri || '',
          code
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting Dynamics CRM token:', error);
      throw new Error('Failed to authenticate with Dynamics CRM');
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const response = await axios.post(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, 
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId || '',
          client_secret: clientSecret || '',
          refresh_token: refreshToken
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error refreshing Dynamics CRM token:', error);
      throw new Error('Failed to refresh Dynamics CRM token');
    }
  }

  static async validateToken(accessToken: string, instanceUrl: string) {
    try {
      await axios.get(`${instanceUrl}/api/data/v9.2/WhoAmI()`, {
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
      // Get user info using the WhoAmI endpoint
      const whoAmIResponse = await axios.get(`${instanceUrl}/api/data/v9.2/WhoAmI()`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      // Get user details
      const userId = whoAmIResponse.data.UserId;
      const userDetailsResponse = await axios.get(`${instanceUrl}/api/data/v9.2/systemusers(${userId})`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      // Get organization info
      const orgResponse = await axios.get(`${instanceUrl}/api/data/v9.2/organizations`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      const userData = userDetailsResponse.data;
      const orgData = orgResponse.data.value[0] || {};

      return {
        id: userId,
        name: `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || 'Dynamics User',
        email: userData.internalemailaddress || '',
        profileUrl: '',
        accountType: 'crm',
        accountDetails: {
          companyName: orgData.name || '',
          organizationId: orgData.organizationid,
          instanceUrl: instanceUrl
        }
      };
    } catch (error) {
      console.error('Error getting Dynamics CRM account info:', error);
      throw new Error('Failed to retrieve Dynamics CRM account information');
    }
  }

  static async getContacts(accessToken: string, instanceUrl: string, limit = 100) {
    try {
      const response = await axios.get(`${instanceUrl}/api/data/v9.2/contacts`, {
        params: {
          $top: limit,
          $select: 'contactid,fullname,emailaddress1,telephone1,_parentcustomerid_value'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      // If we need account/company names, we would need to make additional calls
      // or use $expand, but keeping it simple for this implementation
      return response.data.value || [];
    } catch (error) {
      console.error('Error getting Dynamics CRM contacts:', error);
      throw new Error('Failed to retrieve Dynamics CRM contacts');
    }
  }

  static async getDeals(accessToken: string, instanceUrl: string, limit = 100) {
    try {
      // In Dynamics CRM, "opportunities" are equivalent to deals in other CRMs
      const response = await axios.get(`${instanceUrl}/api/data/v9.2/opportunities`, {
        params: {
          $top: limit,
          $select: 'opportunityid,name,estimatedvalue,stepname,actualclosedate,_parentaccountid_value',
          $orderby: 'createdon desc'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      return response.data.value || [];
    } catch (error) {
      console.error('Error getting Dynamics CRM opportunities:', error);
      throw new Error('Failed to retrieve Dynamics CRM opportunities');
    }
  }
} 
// HubSpot CRM Adapter
// Integration with HubSpot CRM API for data synchronization

import { logger } from '@/lib/logging/logger';
import { 
  CRMPlatform, 
  CRMError, 
  CRMErrorType, 
  CRMApiResponse,
  CRMTokens 
} from '../types';
import { ContactData } from '../models/Contact';
import { DealData } from '../models/Deal';
import { LeadData } from '../models/Lead';

/**
 * HubSpot API configuration
 */
interface HubSpotConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * HubSpot CRM Adapter
 * Handles all interactions with HubSpot CRM API
 */
export class HubSpotAdapter {
  private config: HubSpotConfig;

  constructor() {
    this.config = {
      apiUrl: process.env.HUBSPOT_API_URL || 'https://api.hubapi.com',
      clientId: process.env.HUBSPOT_CLIENT_ID || '',
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
      redirectUri: process.env.HUBSPOT_REDIRECT_URI || '',
      scopes: (process.env.HUBSPOT_SCOPES || 'contacts,deals,leads').split(',')
    };
  }

  // ==================== AUTHENTICATION ====================

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      response_type: 'code'
    });

    if (state) {
      params.append('state', state);
    }

    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<CRMTokens> {
    try {
      const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          code
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const data = await response.json();
      
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: data.token_type || 'Bearer',
        scope: data.scope
      };
    } catch (error) {
      logger.error('HubSpot token exchange failed', { error });
      throw new CRMError(
        'Failed to exchange authorization code for token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.HUBSPOT,
        400,
        error
      );
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<CRMTokens> {
    try {
      const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      const data = await response.json();
      
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_in: data.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: data.token_type || 'Bearer',
        scope: data.scope
      };
    } catch (error) {
      logger.error('HubSpot token refresh failed', { error });
      throw new CRMError(
        'Failed to refresh access token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.HUBSPOT,
        400,
        error
      );
    }
  }

  // ==================== CONTACT OPERATIONS ====================

  /**
   * Get contacts from HubSpot
   */
  async getContacts(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.apiUrl}/crm/v3/objects/contacts`;
      const params = new URLSearchParams({
        limit: limit.toString(),
        properties: 'firstname,lastname,email,phone,company,jobtitle,createdate,lastmodifieddate'
      });

      const response = await this.makeRequest(
        `${url}?${params.toString()}`,
        'GET',
        accessToken
      );

      return response.results || [];
    } catch (error) {
      logger.error('Error fetching HubSpot contacts', { error });
      throw new CRMError(
        'Failed to fetch contacts from HubSpot',
        CRMErrorType.API_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  /**
   * Create contact in HubSpot
   */
  async createContact(accessToken: string, contactData: ContactData): Promise<any> {
    try {
      const url = `${this.config.apiUrl}/crm/v3/objects/contacts`;
      
      const hubspotData = {
        properties: {
          firstname: contactData.firstName,
          lastname: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
          mobilephone: contactData.mobilePhone,
          company: contactData.company,
          jobtitle: contactData.jobTitle,
          address: contactData.address?.street,
          city: contactData.address?.city,
          state: contactData.address?.state,
          zip: contactData.address?.postalCode,
          country: contactData.address?.country,
          lifecyclestage: contactData.status,
          lead_status: contactData.leadStatus,
          notes_last_contacted: contactData.notes
        }
      };

      // Remove undefined properties
      Object.keys(hubspotData.properties).forEach(key => {
        if ((hubspotData.properties as any)[key] === undefined) {
          delete (hubspotData.properties as any)[key];
        }
      });

      return await this.makeRequest(url, 'POST', accessToken, hubspotData);
    } catch (error) {
      logger.error('Error creating HubSpot contact', { contactData, error });
      throw new CRMError(
        'Failed to create contact in HubSpot',
        CRMErrorType.API_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  /**
   * Update contact in HubSpot
   */
  async updateContact(accessToken: string, contactId: string, contactData: Partial<ContactData>): Promise<any> {
    try {
      const url = `${this.config.apiUrl}/crm/v3/objects/contacts/${contactId}`;
      
      const hubspotData = {
        properties: {
          firstname: contactData.firstName,
          lastname: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
          mobilephone: contactData.mobilePhone,
          company: contactData.company,
          jobtitle: contactData.jobTitle,
          address: contactData.address?.street,
          city: contactData.address?.city,
          state: contactData.address?.state,
          zip: contactData.address?.postalCode,
          country: contactData.address?.country,
          lifecyclestage: contactData.status,
          lead_status: contactData.leadStatus,
          notes_last_contacted: contactData.notes
        }
      };

      // Remove undefined properties
      Object.keys(hubspotData.properties).forEach(key => {
        if ((hubspotData.properties as any)[key] === undefined) {
          delete (hubspotData.properties as any)[key];
        }
      });

      return await this.makeRequest(url, 'PATCH', accessToken, hubspotData);
    } catch (error) {
      logger.error('Error updating HubSpot contact', { contactId, contactData, error });
      throw new CRMError(
        'Failed to update contact in HubSpot',
        CRMErrorType.API_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  // ==================== DEAL OPERATIONS ====================

  /**
   * Get deals from HubSpot
   */
  async getDeals(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.apiUrl}/crm/v3/objects/deals`;
      const params = new URLSearchParams({
        limit: limit.toString(),
        properties: 'dealname,amount,dealstage,pipeline,closedate,createdate,hs_lastmodifieddate,dealtype,description,hubspot_owner_id'
      });

      const response = await this.makeRequest(
        `${url}?${params.toString()}`,
        'GET',
        accessToken
      );

      return response.results || [];
    } catch (error) {
      logger.error('Error fetching HubSpot deals', { error });
      throw new CRMError(
        'Failed to fetch deals from HubSpot',
        CRMErrorType.API_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  /**
   * Create deal in HubSpot
   */
  async createDeal(accessToken: string, dealData: DealData): Promise<any> {
    try {
      const url = `${this.config.apiUrl}/crm/v3/objects/deals`;
      
      const hubspotData = {
        properties: {
          dealname: dealData.name,
          amount: dealData.amount?.toString(),
          dealstage: dealData.stage,
          pipeline: dealData.pipelineId,
          closedate: dealData.closeDate?.toISOString(),
          dealtype: dealData.dealSource,
          description: dealData.description,
          hubspot_owner_id: dealData.ownerId
        }
      };

      // Remove undefined properties
      Object.keys(hubspotData.properties).forEach(key => {
        if ((hubspotData.properties as any)[key] === undefined) {
          delete (hubspotData.properties as any)[key];
        }
      });

      return await this.makeRequest(url, 'POST', accessToken, hubspotData);
    } catch (error) {
      logger.error('Error creating HubSpot deal', { dealData, error });
      throw new CRMError(
        'Failed to create deal in HubSpot',
        CRMErrorType.API_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  // ==================== LEAD OPERATIONS ====================

  /**
   * Get leads from HubSpot (contacts with lead lifecycle stage)
   */
  async getLeads(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.apiUrl}/crm/v3/objects/contacts/search`;
      
      const searchData = {
        filterGroups: [{
          filters: [{
            propertyName: 'lifecyclestage',
            operator: 'EQ',
            value: 'lead'
          }]
        }],
        properties: ['firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle', 'lifecyclestage', 'lead_status', 'hubspotscore'],
        limit
      };

      const response = await this.makeRequest(url, 'POST', accessToken, searchData);
      return response.results || [];
    } catch (error) {
      logger.error('Error fetching HubSpot leads', { error });
      throw new CRMError(
        'Failed to fetch leads from HubSpot',
        CRMErrorType.API_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Test connection to HubSpot
   */
  async testConnection(accessToken: string): Promise<boolean> {
    try {
      const url = `${this.config.apiUrl}/crm/v3/objects/contacts`;
      const params = new URLSearchParams({ limit: '1' });

      await this.makeRequest(`${url}?${params.toString()}`, 'GET', accessToken);
      return true;
    } catch (error) {
      logger.error('HubSpot connection test failed', { error });
      return false;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(accessToken: string): Promise<any> {
    try {
      const url = `${this.config.apiUrl}/account-info/v3/details`;
      return await this.makeRequest(url, 'GET', accessToken);
    } catch (error) {
      logger.error('Error getting HubSpot account info', { error });
      throw new CRMError(
        'Failed to get account information',
        CRMErrorType.API_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Make authenticated request to HubSpot API
   */
  private async makeRequest(
    url: string,
    method: string,
    accessToken: string,
    data?: any
  ): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };

      const options: RequestInit = {
        method,
        headers
      };

      if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        throw new CRMError(
          errorData.message || `HubSpot API error: ${response.status}`,
          this.getErrorType(response.status),
          CRMPlatform.HUBSPOT,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof CRMError) {
        throw error;
      }

      logger.error('HubSpot API request failed', { url, method, error });
      throw new CRMError(
        'HubSpot API request failed',
        CRMErrorType.NETWORK_ERROR,
        CRMPlatform.HUBSPOT,
        500,
        error
      );
    }
  }

  /**
   * Map HTTP status codes to CRM error types
   */
  private getErrorType(statusCode: number): CRMErrorType {
    switch (statusCode) {
      case 401:
        return CRMErrorType.AUTHENTICATION_ERROR;
      case 403:
        return CRMErrorType.AUTHORIZATION_ERROR;
      case 429:
        return CRMErrorType.RATE_LIMIT_ERROR;
      case 400:
        return CRMErrorType.VALIDATION_ERROR;
      default:
        return CRMErrorType.API_ERROR;
    }
  }
} 
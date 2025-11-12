// Zoho CRM Adapter
// Integration with Zoho CRM API for data synchronization

import { logger } from '@/lib/logging/logger';
import { 
  CRMPlatform, 
  CRMError, 
  CRMErrorType, 
  CRMTokens 
} from '../types';
import { ContactData } from '../models/Contact';
import { DealData } from '../models/Deal';
import { LeadData } from '../models/Lead';

/**
 * Zoho CRM Adapter
 * Handles all interactions with Zoho CRM API
 */
export class ZohoAdapter {
  private config = {
    clientId: process.env.ZOHO_CLIENT_ID || '',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
    redirectUri: process.env.ZOHO_REDIRECT_URI || '',
    apiUrl: process.env.ZOHO_API_URL || 'https://www.zohoapis.com/crm/v2',
    authUrl: process.env.ZOHO_AUTH_URL || 'https://accounts.zoho.com/oauth/v2'
  };

  // ==================== AUTHENTICATION ====================

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL',
      access_type: 'offline'
    });

    if (state) params.append('state', state);
    return `${this.config.authUrl}/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<CRMTokens> {
    try {
      const response = await fetch(`${this.config.authUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          code
        })
      });

      if (!response.ok) throw new Error(`Token exchange failed: ${await response.text()}`);
      const data = await response.json();
      
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: data.token_type || 'Bearer'
      };
    } catch (error) {
      logger.error('Zoho token exchange failed', { error });
      throw new CRMError(
        'Failed to exchange authorization code for token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.ZOHO,
        400,
        error
      );
    }
  }

  async refreshToken(refreshToken: string): Promise<CRMTokens> {
    try {
      const response = await fetch(`${this.config.authUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken
        })
      });

      if (!response.ok) throw new Error(`Token refresh failed: ${await response.text()}`);
      const data = await response.json();
      
      return {
        access_token: data.access_token,
        refresh_token: refreshToken,
        expires_in: data.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: data.token_type || 'Bearer'
      };
    } catch (error) {
      logger.error('Zoho token refresh failed', { error });
      throw new CRMError(
        'Failed to refresh access token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.ZOHO,
        400,
        error
      );
    }
  }

  // ==================== CONTACT OPERATIONS ====================

  async getContacts(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.apiUrl}/Contacts?per_page=${limit}`;
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching Zoho contacts', { error });
      throw new CRMError(
        'Failed to fetch contacts from Zoho',
        CRMErrorType.API_ERROR,
        CRMPlatform.ZOHO,
        500,
        error
      );
    }
  }

  async createContact(accessToken: string, contactData: ContactData): Promise<any> {
    try {
      const zohoData = {
        data: [{
          First_Name: contactData.firstName,
          Last_Name: contactData.lastName,
          Email: contactData.email,
          Phone: contactData.phone,
          Mobile: contactData.mobilePhone,
          Account_Name: contactData.company,
          Title: contactData.jobTitle,
          Department: contactData.department,
          Mailing_Street: contactData.address?.street,
          Mailing_City: contactData.address?.city,
          Mailing_State: contactData.address?.state,
          Mailing_Zip: contactData.address?.postalCode,
          Mailing_Country: contactData.address?.country,
          Lead_Source: contactData.leadSource,
          Description: contactData.notes
        }]
      };

      return await this.makeRequest(`${this.config.apiUrl}/Contacts`, 'POST', accessToken, zohoData);
    } catch (error) {
      logger.error('Error creating Zoho contact', { contactData, error });
      throw new CRMError(
        'Failed to create contact in Zoho',
        CRMErrorType.API_ERROR,
        CRMPlatform.ZOHO,
        500,
        error
      );
    }
  }

  // ==================== DEAL OPERATIONS ====================

  async getDeals(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.apiUrl}/Deals?per_page=${limit}`;
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching Zoho deals', { error });
      throw new CRMError(
        'Failed to fetch deals from Zoho',
        CRMErrorType.API_ERROR,
        CRMPlatform.ZOHO,
        500,
        error
      );
    }
  }

  async createDeal(accessToken: string, dealData: DealData): Promise<any> {
    try {
      const zohoData = {
        data: [{
          Deal_Name: dealData.name,
          Description: dealData.description,
          Amount: dealData.amount,
          Stage: dealData.stage,
          Probability: dealData.probability,
          Closing_Date: dealData.closeDate?.toISOString().split('T')[0],
          Account_Name: dealData.companyName,
          Contact_Name: dealData.contactName,
          Lead_Source: dealData.leadSource,
          Deal_Category: dealData.dealSource
        }]
      };

      return await this.makeRequest(`${this.config.apiUrl}/Deals`, 'POST', accessToken, zohoData);
    } catch (error) {
      logger.error('Error creating Zoho deal', { dealData, error });
      throw new CRMError(
        'Failed to create deal in Zoho',
        CRMErrorType.API_ERROR,
        CRMPlatform.ZOHO,
        500,
        error
      );
    }
  }

  // ==================== LEAD OPERATIONS ====================

  async getLeads(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.apiUrl}/Leads?per_page=${limit}`;
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching Zoho leads', { error });
      throw new CRMError(
        'Failed to fetch leads from Zoho',
        CRMErrorType.API_ERROR,
        CRMPlatform.ZOHO,
        500,
        error
      );
    }
  }

  // ==================== UTILITY METHODS ====================

  async testConnection(accessToken: string): Promise<boolean> {
    try {
      await this.makeRequest(`${this.config.apiUrl}/org`, 'GET', accessToken);
      return true;
    } catch (error) {
      logger.error('Zoho connection test failed', { error });
      return false;
    }
  }

  async getAccountInfo(accessToken: string): Promise<any> {
    try {
      return await this.makeRequest(`${this.config.apiUrl}/org`, 'GET', accessToken);
    } catch (error) {
      logger.error('Error getting Zoho account info', { error });
      throw new CRMError(
        'Failed to get account information',
        CRMErrorType.API_ERROR,
        CRMPlatform.ZOHO,
        500,
        error
      );
    }
  }

  // ==================== PRIVATE METHODS ====================

  private async makeRequest(url: string, method: string, accessToken: string, data?: any): Promise<any> {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
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
          errorData.message || `Zoho API error: ${response.status}`,
          this.getErrorType(response.status),
          CRMPlatform.ZOHO,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof CRMError) throw error;

      logger.error('Zoho API request failed', { url, method, error });
      throw new CRMError(
        'Zoho API request failed',
        CRMErrorType.NETWORK_ERROR,
        CRMPlatform.ZOHO,
        500,
        error
      );
    }
  }

  private getErrorType(statusCode: number): CRMErrorType {
    switch (statusCode) {
      case 401: return CRMErrorType.AUTHENTICATION_ERROR;
      case 403: return CRMErrorType.AUTHORIZATION_ERROR;
      case 429: return CRMErrorType.RATE_LIMIT_ERROR;
      case 400: return CRMErrorType.VALIDATION_ERROR;
      default: return CRMErrorType.API_ERROR;
    }
  }
} 
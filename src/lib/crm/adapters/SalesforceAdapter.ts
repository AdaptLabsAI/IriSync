// Salesforce CRM Adapter
// Integration with Salesforce CRM API for data synchronization

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
 * Salesforce API configuration
 */
interface SalesforceConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  loginUrl: string;
  apiVersion: string;
}

/**
 * Salesforce CRM Adapter
 * Handles all interactions with Salesforce CRM API
 */
export class SalesforceAdapter {
  private config: SalesforceConfig;

  constructor() {
    this.config = {
      clientId: process.env.SALESFORCE_CLIENT_ID || '',
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
      redirectUri: process.env.SALESFORCE_REDIRECT_URI || '',
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
      apiVersion: process.env.SALESFORCE_API_VERSION || 'v58.0'
    };
  }

  // ==================== AUTHENTICATION ====================

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'api refresh_token'
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.config.loginUrl}/services/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<CRMTokens> {
    try {
      const response = await fetch(`${this.config.loginUrl}/services/oauth2/token`, {
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
        expires_in: 7200, // Salesforce tokens typically last 2 hours
        expires_at: Math.floor(Date.now() / 1000) + 7200,
        token_type: data.token_type || 'Bearer',
        scope: data.scope,
        instance_url: data.instance_url
      };
    } catch (error) {
      logger.error('Salesforce token exchange failed', { error });
      throw new CRMError(
        'Failed to exchange authorization code for token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.SALESFORCE,
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
      const response = await fetch(`${this.config.loginUrl}/services/oauth2/token`, {
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
        refresh_token: refreshToken, // Refresh token doesn't change
        expires_in: 7200,
        expires_at: Math.floor(Date.now() / 1000) + 7200,
        token_type: data.token_type || 'Bearer',
        scope: data.scope,
        instance_url: data.instance_url
      };
    } catch (error) {
      logger.error('Salesforce token refresh failed', { error });
      throw new CRMError(
        'Failed to refresh access token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.SALESFORCE,
        400,
        error
      );
    }
  }

  // ==================== CONTACT OPERATIONS ====================

  /**
   * Get contacts from Salesforce
   */
  async getContacts(accessToken: string, limit: number = 100, instanceUrl?: string): Promise<any[]> {
    try {
      const baseUrl = instanceUrl || this.extractInstanceUrl(accessToken);
      const query = `SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, Account.Name, Title, Department, MailingStreet, MailingCity, MailingState, MailingPostalCode, MailingCountry, LeadSource, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Contact LIMIT ${limit}`;
      
      const url = `${baseUrl}/services/data/${this.config.apiVersion}/query/?q=${encodeURIComponent(query)}`;
      
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.records || [];
    } catch (error) {
      logger.error('Error fetching Salesforce contacts', { error });
      throw new CRMError(
        'Failed to fetch contacts from Salesforce',
        CRMErrorType.API_ERROR,
        CRMPlatform.SALESFORCE,
        500,
        error
      );
    }
  }

  /**
   * Create contact in Salesforce
   */
  async createContact(accessToken: string, contactData: ContactData, instanceUrl?: string): Promise<any> {
    try {
      const baseUrl = instanceUrl || this.extractInstanceUrl(accessToken);
      const url = `${baseUrl}/services/data/${this.config.apiVersion}/sobjects/Contact/`;
      
      const salesforceData = {
        FirstName: contactData.firstName,
        LastName: contactData.lastName,
        Email: contactData.email,
        Phone: contactData.phone,
        MobilePhone: contactData.mobilePhone,
        Title: contactData.jobTitle,
        Department: contactData.department,
        MailingStreet: contactData.address?.street,
        MailingCity: contactData.address?.city,
        MailingState: contactData.address?.state,
        MailingPostalCode: contactData.address?.postalCode,
        MailingCountry: contactData.address?.country,
        LeadSource: contactData.leadSource,
        Description: contactData.notes
      };

      // Remove undefined properties
      Object.keys(salesforceData).forEach(key => {
        if ((salesforceData as any)[key] === undefined) {
          delete (salesforceData as any)[key];
        }
      });

      return await this.makeRequest(url, 'POST', accessToken, salesforceData);
    } catch (error) {
      logger.error('Error creating Salesforce contact', { contactData, error });
      throw new CRMError(
        'Failed to create contact in Salesforce',
        CRMErrorType.API_ERROR,
        CRMPlatform.SALESFORCE,
        500,
        error
      );
    }
  }

  /**
   * Update contact in Salesforce
   */
  async updateContact(accessToken: string, contactId: string, contactData: Partial<ContactData>, instanceUrl?: string): Promise<any> {
    try {
      const baseUrl = instanceUrl || this.extractInstanceUrl(accessToken);
      const url = `${baseUrl}/services/data/${this.config.apiVersion}/sobjects/Contact/${contactId}`;
      
      const salesforceData = {
        FirstName: contactData.firstName,
        LastName: contactData.lastName,
        Email: contactData.email,
        Phone: contactData.phone,
        MobilePhone: contactData.mobilePhone,
        Title: contactData.jobTitle,
        Department: contactData.department,
        MailingStreet: contactData.address?.street,
        MailingCity: contactData.address?.city,
        MailingState: contactData.address?.state,
        MailingPostalCode: contactData.address?.postalCode,
        MailingCountry: contactData.address?.country,
        LeadSource: contactData.leadSource,
        Description: contactData.notes
      };

      // Remove undefined properties
      Object.keys(salesforceData).forEach(key => {
        if ((salesforceData as any)[key] === undefined) {
          delete (salesforceData as any)[key];
        }
      });

      return await this.makeRequest(url, 'PATCH', accessToken, salesforceData);
    } catch (error) {
      logger.error('Error updating Salesforce contact', { contactId, contactData, error });
      throw new CRMError(
        'Failed to update contact in Salesforce',
        CRMErrorType.API_ERROR,
        CRMPlatform.SALESFORCE,
        500,
        error
      );
    }
  }

  // ==================== DEAL OPERATIONS (OPPORTUNITIES) ====================

  /**
   * Get opportunities (deals) from Salesforce
   */
  async getDeals(accessToken: string, limit: number = 100, instanceUrl?: string): Promise<any[]> {
    try {
      const baseUrl = instanceUrl || this.extractInstanceUrl(accessToken);
      const query = `SELECT Id, Name, Description, Amount, StageName, Probability, CloseDate, CreatedDate, LastModifiedDate, LastActivityDate, AccountId, Account.Name, ContactId, Contact.Name, OwnerId, Owner.Name, LeadSource, Type, CurrencyIsoCode FROM Opportunity LIMIT ${limit}`;
      
      const url = `${baseUrl}/services/data/${this.config.apiVersion}/query/?q=${encodeURIComponent(query)}`;
      
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.records || [];
    } catch (error) {
      logger.error('Error fetching Salesforce opportunities', { error });
      throw new CRMError(
        'Failed to fetch opportunities from Salesforce',
        CRMErrorType.API_ERROR,
        CRMPlatform.SALESFORCE,
        500,
        error
      );
    }
  }

  /**
   * Create opportunity (deal) in Salesforce
   */
  async createDeal(accessToken: string, dealData: DealData, instanceUrl?: string): Promise<any> {
    try {
      const baseUrl = instanceUrl || this.extractInstanceUrl(accessToken);
      const url = `${baseUrl}/services/data/${this.config.apiVersion}/sobjects/Opportunity/`;
      
      const salesforceData = {
        Name: dealData.name,
        Description: dealData.description,
        Amount: dealData.amount,
        StageName: dealData.stage,
        Probability: dealData.probability,
        CloseDate: dealData.closeDate?.toISOString().split('T')[0], // YYYY-MM-DD format
        AccountId: dealData.accountId,
        ContactId: dealData.contactId,
        OwnerId: dealData.ownerId,
        LeadSource: dealData.leadSource,
        Type: dealData.dealSource
      };

      // Remove undefined properties
      Object.keys(salesforceData).forEach(key => {
        if ((salesforceData as any)[key] === undefined) {
          delete (salesforceData as any)[key];
        }
      });

      return await this.makeRequest(url, 'POST', accessToken, salesforceData);
    } catch (error) {
      logger.error('Error creating Salesforce opportunity', { dealData, error });
      throw new CRMError(
        'Failed to create opportunity in Salesforce',
        CRMErrorType.API_ERROR,
        CRMPlatform.SALESFORCE,
        500,
        error
      );
    }
  }

  // ==================== LEAD OPERATIONS ====================

  /**
   * Get leads from Salesforce
   */
  async getLeads(accessToken: string, limit: number = 100, instanceUrl?: string): Promise<any[]> {
    try {
      const baseUrl = instanceUrl || this.extractInstanceUrl(accessToken);
      const query = `SELECT Id, FirstName, LastName, Name, Email, Phone, MobilePhone, Company, Title, Industry, Website, Street, City, State, PostalCode, Country, Status, LeadSource, Rating, IsConverted, ConvertedDate, ConvertedContactId, ConvertedAccountId, ConvertedOpportunityId, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Lead LIMIT ${limit}`;
      
      const url = `${baseUrl}/services/data/${this.config.apiVersion}/query/?q=${encodeURIComponent(query)}`;
      
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.records || [];
    } catch (error) {
      logger.error('Error fetching Salesforce leads', { error });
      throw new CRMError(
        'Failed to fetch leads from Salesforce',
        CRMErrorType.API_ERROR,
        CRMPlatform.SALESFORCE,
        500,
        error
      );
    }
  }

  /**
   * Create lead in Salesforce
   */
  async createLead(accessToken: string, leadData: LeadData, instanceUrl?: string): Promise<any> {
    try {
      const baseUrl = instanceUrl || this.extractInstanceUrl(accessToken);
      const url = `${baseUrl}/services/data/${this.config.apiVersion}/sobjects/Lead/`;
      
      const salesforceData = {
        FirstName: leadData.firstName,
        LastName: leadData.lastName,
        Email: leadData.email,
        Phone: leadData.phone,
        MobilePhone: leadData.mobilePhone,
        Company: leadData.company,
        Title: leadData.jobTitle,
        Industry: leadData.industry,
        Website: leadData.website,
        Street: leadData.address?.street,
        City: leadData.address?.city,
        State: leadData.address?.state,
        PostalCode: leadData.address?.postalCode,
        Country: leadData.address?.country,
        Status: leadData.status,
        LeadSource: leadData.leadSource,
        Rating: leadData.rating,
        OwnerId: leadData.ownerId,
        Description: leadData.notes
      };

      // Remove undefined properties
      Object.keys(salesforceData).forEach(key => {
        if ((salesforceData as any)[key] === undefined) {
          delete (salesforceData as any)[key];
        }
      });

      return await this.makeRequest(url, 'POST', accessToken, salesforceData);
    } catch (error) {
      logger.error('Error creating Salesforce lead', { leadData, error });
      throw new CRMError(
        'Failed to create lead in Salesforce',
        CRMErrorType.API_ERROR,
        CRMPlatform.SALESFORCE,
        500,
        error
      );
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Test connection to Salesforce
   */
  async testConnection(accessToken: string, instanceUrl?: string): Promise<boolean> {
    try {
      const baseUrl = instanceUrl || this.extractInstanceUrl(accessToken);
      const url = `${baseUrl}/services/data/${this.config.apiVersion}/limits/`;
      
      await this.makeRequest(url, 'GET', accessToken);
      return true;
    } catch (error) {
      logger.error('Salesforce connection test failed', { error });
      return false;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(accessToken: string, instanceUrl?: string): Promise<any> {
    try {
      const baseUrl = instanceUrl || this.extractInstanceUrl(accessToken);
      const url = `${baseUrl}/services/data/${this.config.apiVersion}/sobjects/Organization/`;
      
      return await this.makeRequest(url, 'GET', accessToken);
    } catch (error) {
      logger.error('Error getting Salesforce account info', { error });
      throw new CRMError(
        'Failed to get account information',
        CRMErrorType.API_ERROR,
        CRMPlatform.SALESFORCE,
        500,
        error
      );
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Make authenticated request to Salesforce API
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
          errorData.message || `Salesforce API error: ${response.status}`,
          this.getErrorType(response.status),
          CRMPlatform.SALESFORCE,
          response.status,
          errorData
        );
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return {};
      }

      return await response.json();
    } catch (error) {
      if (error instanceof CRMError) {
        throw error;
      }

      logger.error('Salesforce API request failed', { url, method, error });
      throw new CRMError(
        'Salesforce API request failed',
        CRMErrorType.NETWORK_ERROR,
        CRMPlatform.SALESFORCE,
        500,
        error
      );
    }
  }

  /**
   * Extract instance URL from token or use default
   */
  private extractInstanceUrl(accessToken: string): string {
    // In a real implementation, you would store the instance URL from the OAuth response
    // For now, using a default
    return process.env.SALESFORCE_INSTANCE_URL || 'https://na1.salesforce.com';
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
// Microsoft Dynamics CRM Adapter
// Integration with Microsoft Dynamics 365 CRM API for data synchronization

import { logger } from '@/lib/core/logging/logger';
import { CRMPlatform, CRMError, CRMErrorType, CRMTokens } from '../types';

export class DynamicsAdapter {
  private config = {
    clientId: process.env.DYNAMICS_CLIENT_ID || '',
    clientSecret: process.env.DYNAMICS_CLIENT_SECRET || '',
    redirectUri: process.env.DYNAMICS_REDIRECT_URI || '',
    tenantId: process.env.DYNAMICS_TENANT_ID || '',
    resource: process.env.DYNAMICS_RESOURCE || 'https://org.crm.dynamics.com'
  };

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      resource: this.config.resource,
      state: state || ''
    });
    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<CRMTokens> {
    try {
      const response = await fetch(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri,
          resource: this.config.resource
        })
      });

      if (!response.ok) throw new Error(`Token exchange failed: ${await response.text()}`);
      const data = await response.json();
      
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: 'Bearer'
      };
    } catch (error) {
      logger.error('Dynamics token exchange failed', { error });
      throw new CRMError(
        'Failed to exchange authorization code for token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.DYNAMICS,
        400,
        error
      );
    }
  }

  async refreshToken(refreshToken: string): Promise<CRMTokens> {
    try {
      const response = await fetch(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          resource: this.config.resource
        })
      });

      if (!response.ok) throw new Error(`Token refresh failed: ${await response.text()}`);
      const data = await response.json();
      
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_in: data.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: 'Bearer'
      };
    } catch (error) {
      logger.error('Dynamics token refresh failed', { error });
      throw new CRMError(
        'Failed to refresh access token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.DYNAMICS,
        400,
        error
      );
    }
  }

  async getContacts(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.resource}/api/data/v9.2/contacts?$top=${limit}`;
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.value || [];
    } catch (error) {
      logger.error('Error fetching Dynamics contacts', { error });
      throw new CRMError(
        'Failed to fetch contacts from Dynamics',
        CRMErrorType.API_ERROR,
        CRMPlatform.DYNAMICS,
        500,
        error
      );
    }
  }

  async getDeals(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.resource}/api/data/v9.2/opportunities?$top=${limit}`;
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.value || [];
    } catch (error) {
      logger.error('Error fetching Dynamics opportunities', { error });
      throw new CRMError(
        'Failed to fetch opportunities from Dynamics',
        CRMErrorType.API_ERROR,
        CRMPlatform.DYNAMICS,
        500,
        error
      );
    }
  }

  async testConnection(accessToken: string): Promise<boolean> {
    try {
      await this.makeRequest(`${this.config.resource}/api/data/v9.2/WhoAmI`, 'GET', accessToken);
      return true;
    } catch (error) {
      logger.error('Dynamics connection test failed', { error });
      return false;
    }
  }

  private async makeRequest(url: string, method: string, accessToken: string, data?: any): Promise<any> {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        }
      };

      if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      if (!response.ok) {
        throw new CRMError(
          `Dynamics API error: ${response.status}`,
          this.getErrorType(response.status),
          CRMPlatform.DYNAMICS,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof CRMError) throw error;
      throw new CRMError(
        'Dynamics API request failed',
        CRMErrorType.NETWORK_ERROR,
        CRMPlatform.DYNAMICS,
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
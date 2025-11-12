// SugarCRM Adapter
// Integration with SugarCRM API for data synchronization

import { logger } from '@/lib/logging/logger';
import { CRMPlatform, CRMError, CRMErrorType, CRMTokens } from '../types';

export class SugarCRMAdapter {
  private config = {
    clientId: process.env.SUGARCRM_CLIENT_ID || '',
    clientSecret: process.env.SUGARCRM_CLIENT_SECRET || '',
    redirectUri: process.env.SUGARCRM_REDIRECT_URI || '',
    baseUrl: process.env.SUGARCRM_BASE_URL || 'https://your-instance.sugarcrm.com'
  };

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'offline_access',
      state: state || ''
    });
    return `${this.config.baseUrl}/rest/v11_1/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<CRMTokens> {
    try {
      const response = await fetch(`${this.config.baseUrl}/rest/v11_1/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        token_type: 'Bearer'
      };
    } catch (error) {
      logger.error('SugarCRM token exchange failed', { error });
      throw new CRMError(
        'Failed to exchange authorization code for token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.SUGARCRM,
        400,
        error
      );
    }
  }

  async refreshToken(refreshToken: string): Promise<CRMTokens> {
    try {
      const response = await fetch(`${this.config.baseUrl}/rest/v11_1/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        refresh_token: data.refresh_token || refreshToken,
        expires_in: data.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: 'Bearer'
      };
    } catch (error) {
      logger.error('SugarCRM token refresh failed', { error });
      throw new CRMError(
        'Failed to refresh access token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.SUGARCRM,
        400,
        error
      );
    }
  }

  async getContacts(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.baseUrl}/rest/v11_1/Contacts?max_num=${limit}`;
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.records || [];
    } catch (error) {
      logger.error('Error fetching SugarCRM contacts', { error });
      throw new CRMError(
        'Failed to fetch contacts from SugarCRM',
        CRMErrorType.API_ERROR,
        CRMPlatform.SUGARCRM,
        500,
        error
      );
    }
  }

  async getDeals(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.baseUrl}/rest/v11_1/Opportunities?max_num=${limit}`;
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.records || [];
    } catch (error) {
      logger.error('Error fetching SugarCRM opportunities', { error });
      throw new CRMError(
        'Failed to fetch opportunities from SugarCRM',
        CRMErrorType.API_ERROR,
        CRMPlatform.SUGARCRM,
        500,
        error
      );
    }
  }

  async testConnection(accessToken: string): Promise<boolean> {
    try {
      await this.makeRequest(`${this.config.baseUrl}/rest/v11_1/me`, 'GET', accessToken);
      return true;
    } catch (error) {
      logger.error('SugarCRM connection test failed', { error });
      return false;
    }
  }

  private async makeRequest(url: string, method: string, accessToken: string, data?: any): Promise<any> {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      if (!response.ok) {
        throw new CRMError(
          `SugarCRM API error: ${response.status}`,
          this.getErrorType(response.status),
          CRMPlatform.SUGARCRM,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof CRMError) throw error;
      throw new CRMError(
        'SugarCRM API request failed',
        CRMErrorType.NETWORK_ERROR,
        CRMPlatform.SUGARCRM,
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
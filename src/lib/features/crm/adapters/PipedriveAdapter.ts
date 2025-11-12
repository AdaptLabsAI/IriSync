// Pipedrive CRM Adapter
// Integration with Pipedrive CRM API for data synchronization

import { logger } from '@/lib/core/logging/logger';
import { CRMPlatform, CRMError, CRMErrorType, CRMTokens } from '../types';
import { ContactData } from '../models/Contact';
import { DealData } from '../models/Deal';

export class PipedriveAdapter {
  private config = {
    clientId: process.env.PIPEDRIVE_CLIENT_ID || '',
    clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET || '',
    redirectUri: process.env.PIPEDRIVE_REDIRECT_URI || '',
    apiUrl: process.env.PIPEDRIVE_API_URL || 'https://api.pipedrive.com/v1'
  };

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state: state || ''
    });
    return `https://oauth.pipedrive.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<CRMTokens> {
    try {
      const response = await fetch('https://oauth.pipedrive.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
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
      logger.error('Pipedrive token exchange failed', { error });
      throw new CRMError(
        'Failed to exchange authorization code for token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.PIPEDRIVE,
        400,
        error
      );
    }
  }

  async refreshToken(refreshToken: string): Promise<CRMTokens> {
    try {
      const response = await fetch('https://oauth.pipedrive.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
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
      logger.error('Pipedrive token refresh failed', { error });
      throw new CRMError(
        'Failed to refresh access token',
        CRMErrorType.AUTHENTICATION_ERROR,
        CRMPlatform.PIPEDRIVE,
        400,
        error
      );
    }
  }

  async getContacts(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.apiUrl}/persons?limit=${limit}`;
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching Pipedrive contacts', { error });
      throw new CRMError(
        'Failed to fetch contacts from Pipedrive',
        CRMErrorType.API_ERROR,
        CRMPlatform.PIPEDRIVE,
        500,
        error
      );
    }
  }

  async getDeals(accessToken: string, limit: number = 100): Promise<any[]> {
    try {
      const url = `${this.config.apiUrl}/deals?limit=${limit}`;
      const response = await this.makeRequest(url, 'GET', accessToken);
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching Pipedrive deals', { error });
      throw new CRMError(
        'Failed to fetch deals from Pipedrive',
        CRMErrorType.API_ERROR,
        CRMPlatform.PIPEDRIVE,
        500,
        error
      );
    }
  }

  async testConnection(accessToken: string): Promise<boolean> {
    try {
      await this.makeRequest(`${this.config.apiUrl}/users/me`, 'GET', accessToken);
      return true;
    } catch (error) {
      logger.error('Pipedrive connection test failed', { error });
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
          `Pipedrive API error: ${response.status}`,
          this.getErrorType(response.status),
          CRMPlatform.PIPEDRIVE,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof CRMError) throw error;
      throw new CRMError(
        'Pipedrive API request failed',
        CRMErrorType.NETWORK_ERROR,
        CRMPlatform.PIPEDRIVE,
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
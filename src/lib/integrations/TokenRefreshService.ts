import { firestore } from '@/lib/firebase/client';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { HubspotAdapter } from './HubspotAdapter';
import { SalesforceAdapter } from './SalesforceAdapter';
import { ZohoCRMAdapter } from './ZohoCRMAdapter';
import { PipedriveAdapter } from './PipedriveAdapter';
import { DynamicsCRMAdapter } from './DynamicsCRMAdapter';
import { SugarCRMAdapter } from './SugarCRMAdapter';
import { logger } from '@/lib/logging/logger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export interface TokenData {
  access_token: string; 
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  instanceUrl?: string;
  [key: string]: any;
}

export interface RefreshResult {
  success: boolean;
  tokens?: TokenData;
  error?: string;
}

export interface PlatformConfig {
  platform: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  redirectUri: string | undefined;
  tokenUrl: string;
}

/**
 * Centralized service for handling token refresh across different integrations
 */
export class TokenRefreshService {
  private static readonly ERROR_LOG_LIMIT = 50;
  private static errorLogs: Map<string, { count: number; lastError: string; timestamp: number }> = new Map();
  
  /**
   * Check if a token is expired
   */
  static isTokenExpired(expiresAt: number, bufferSeconds = 60): boolean {
    const currentTime = Date.now();
    const bufferMs = bufferSeconds * 1000;
    return currentTime + bufferMs > expiresAt;
  }
  
  /**
   * Generates a standardized OAuth2 authorization URL
   */
  static generateAuthUrl(config: {
    authUrl: string;
    clientId: string | undefined;
    redirectUri: string | undefined;
    scopes: string[];
    state?: string;
    additionalParams?: Record<string, string>;
  }): string {
    if (!config.clientId || !config.redirectUri) {
      throw new Error(`Missing required environment variables for authentication: clientId or redirectUri`);
    }
    
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('redirect_uri', config.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', config.scopes.join(' '));
    authUrl.searchParams.append('state', config.state || uuidv4());
    
    // Add additional parameters if provided
    if (config.additionalParams) {
      Object.entries(config.additionalParams).forEach(([key, value]) => {
        authUrl.searchParams.append(key, value);
      });
    }
    
    return authUrl.toString();
  }
  
  /**
   * Handles OAuth2 token exchange using authorization code
   */
  static async exchangeCodeForToken(config: PlatformConfig, code: string): Promise<TokenData> {
    if (!code) {
      throw new Error('Authorization code is required');
    }

    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new Error(`Missing required environment variables for ${config.platform} token exchange`);
    }

    try {
      const response = await axios.post(
        config.tokenUrl,
        {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectUri,
        },
        {
          headers: { 
            'Content-Type': 'application/json' 
          }
        }
      );

      // Add expires_at if expires_in is provided
      const tokens = response.data;
      if (tokens.expires_in) {
        tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
      }
      
      return tokens;
    } catch (error: any) {
      this.logError(config.platform, 'token_exchange', error);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`${config.platform} authentication failed: ${error.response?.data?.error_description || error.message}`);
    }
  }
  
  /**
   * Refreshes an OAuth2 access token using a refresh token
   */
  static async refreshToken(config: PlatformConfig, refreshToken: string): Promise<RefreshResult> {
    if (!refreshToken) {
      return {
        success: false,
        error: 'Refresh token is required'
      };
    }

    if (!config.clientId || !config.clientSecret) {
      return {
        success: false,
        error: `Missing required environment variables for ${config.platform} token refresh`
      };
    }

    try {
      const response = await axios.post(
        config.tokenUrl,
        {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        },
        {
          headers: { 
            'Content-Type': 'application/json' 
          }
        }
      );

      // Add expires_at if expires_in is provided
      const tokens = response.data;
      if (tokens.expires_in) {
        tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
      }
      
      // Some providers don't return the refresh token in the refresh response
      // In this case, we should preserve the original refresh token
      if (!tokens.refresh_token && refreshToken) {
        tokens.refresh_token = refreshToken;
      }
      
      return {
        success: true,
        tokens
      };
    } catch (error: any) {
      this.logError(config.platform, 'token_refresh', error);
      
      return {
        success: false,
        error: `Failed to refresh ${config.platform} token: ${error.response?.data?.error_description || error.message}`
      };
    }
  }
  
  /**
   * Check if a token needs to be refreshed based on its expiration time
   */
  static shouldRefreshToken(tokens: TokenData, bufferSeconds = 300): boolean {
    if (!tokens.expires_at) {
      return false; // Can't determine if refresh is needed
    }
    
    const currentTime = Date.now();
    const expiresAt = tokens.expires_at;
    const bufferMs = bufferSeconds * 1000;
    
    // Return true if the token expires within the buffer time
    return (expiresAt - currentTime) < bufferMs;
  }
  
  /**
   * Validates if a token is still valid through an API call
   */
  static async validateToken(validationUrl: string, accessToken: string, tokenType = 'Bearer'): Promise<boolean> {
    try {
      await axios.get(validationUrl, {
        headers: {
          Authorization: `${tokenType} ${accessToken}`
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Logs errors with rate limiting to prevent log flooding
   */
  static logError(platform: string, operation: string, error: any): void {
    const errorKey = `${platform}:${operation}`;
    const errorMessage = error.response?.data?.error_description || error.response?.data?.error || error.message;
    const now = Date.now();
    
    if (this.errorLogs.has(errorKey)) {
      const log = this.errorLogs.get(errorKey)!;
      
      // If it's been more than an hour since the last error, reset the count
      if (now - log.timestamp > 3600000) {
        log.count = 1;
        log.lastError = errorMessage;
        log.timestamp = now;
      } else {
        log.count++;
        log.lastError = errorMessage;
        
        // Only log if we haven't exceeded the limit
        if (log.count <= this.ERROR_LOG_LIMIT) {
          console.error(`[${platform}] ${operation} error (${log.count}):`, errorMessage);
        } else if (log.count === this.ERROR_LOG_LIMIT + 1) {
          console.error(`[${platform}] ${operation} errors: Rate limited, suppressing further errors of this type`);
        }
      }
    } else {
      this.errorLogs.set(errorKey, {
        count: 1,
        lastError: errorMessage,
        timestamp: now
      });
      console.error(`[${platform}] ${operation} error:`, errorMessage);
    }
  }
  
  /**
   * Standardizes error responses for API endpoints
   */
  static standardizeError(platform: string, operation: string, error: any): string {
    const errorMessage = error.response?.data?.error_description || 
                        error.response?.data?.error?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        `Unknown ${platform} ${operation} error`;
    
    this.logError(platform, operation, error);
    return `Error loading data: ${errorMessage}`;
  }
  
  /**
   * Refreshes a token if it's about to expire or has expired
   */
  static async refreshTokenIfNeeded(
    userId: string,
    connectionId: string,
    platform: string,
    currentTokens: TokenData
  ): Promise<TokenData> {
    // If no expiration or refresh token, just return the current tokens
    if (!currentTokens.expires_at || !currentTokens.refresh_token) {
      return currentTokens;
    }
    
    // If token is not about to expire, just return the current tokens
    if (!this.shouldRefreshToken(currentTokens)) {
      return currentTokens;
    }
    
    // Get platform-specific configuration
    const config = this.getPlatformConfig(platform);
    
    // Try to refresh the token
    const refreshResult = await this.refreshToken(config, currentTokens.refresh_token);
    
    if (refreshResult.success && refreshResult.tokens) {
      // Update the stored tokens in Firestore
      try {
        const connectionRef = doc(firestore, 'crmConnections', connectionId);
        await updateDoc(connectionRef, { tokens: refreshResult.tokens });
        
        logger.info(`Successfully refreshed ${platform} token for user ${userId}`);
        return refreshResult.tokens;
      } catch (error) {
        logger.error(`Failed to update ${platform} tokens in database`, { error });
        // Still return the refreshed tokens even if we couldn't update the database
        return refreshResult.tokens;
      }
    } else {
      // If refresh failed, log the error but return the current tokens
      logger.warn(`Failed to refresh ${platform} token: ${refreshResult.error}`);
      return currentTokens;
    }
  }
  
  /**
   * Get platform-specific configuration for token operations
   */
  private static getPlatformConfig(platform: string): PlatformConfig {
    switch (platform.toLowerCase()) {
      case 'hubspot':
        return {
          platform: 'hubspot',
          clientId: process.env.HUBSPOT_CLIENT_ID,
          clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
          redirectUri: process.env.HUBSPOT_REDIRECT_URI,
          tokenUrl: 'https://api.hubapi.com/oauth/v1/token'
        };
      case 'salesforce':
        return {
          platform: 'salesforce',
          clientId: process.env.SALESFORCE_CLIENT_ID,
          clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
          redirectUri: process.env.SALESFORCE_REDIRECT_URI,
          tokenUrl: 'https://login.salesforce.com/services/oauth2/token'
        };
      case 'zoho':
        return {
          platform: 'zoho',
          clientId: process.env.ZOHO_CLIENT_ID,
          clientSecret: process.env.ZOHO_CLIENT_SECRET,
          redirectUri: process.env.ZOHO_REDIRECT_URI,
          tokenUrl: 'https://accounts.zoho.com/oauth/v2/token'
        };
      case 'pipedrive':
        return {
          platform: 'pipedrive',
          clientId: process.env.PIPEDRIVE_CLIENT_ID,
          clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET,
          redirectUri: process.env.PIPEDRIVE_REDIRECT_URI,
          tokenUrl: 'https://oauth.pipedrive.com/oauth/token'
        };
      // Add other platforms as needed
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
} 
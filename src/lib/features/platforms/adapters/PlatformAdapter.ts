import { PlatformAccountInfo, PlatformAuthData } from '../models';

/**
 * Abstract base class for all platform adapters
 */
export abstract class PlatformAdapter {
  /**
   * Get the authorization URL for the platform's OAuth flow
   */
  abstract getAuthorizationUrl(state: string): Promise<string>;
  
  /**
   * Handle the authorization code callback from OAuth 2.0
   */
  abstract handleAuthorizationCode(code: string, oauthVerifier?: string): Promise<PlatformAuthData>;
  
  /**
   * Handle the authorization token from OAuth 1.0a
   */
  abstract handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData>;
  
  /**
   * Process the authorization callback (wrapper method)
   */
  async handleAuthorizationCallback(code: string, state: string): Promise<PlatformAuthData> {
    // Default implementation calls handleAuthorizationCode
    return this.handleAuthorizationCode(code);
  }
  
  /**
   * Get account information using the access token
   */
  abstract getAccountInfo(accessToken: string): Promise<PlatformAccountInfo>;
  
  /**
   * Validate an access token
   */
  abstract validateToken(token: string): Promise<boolean>;
  
  /**
   * Refresh an access token
   */
  abstract refreshToken(refreshToken: string): Promise<string>;

  /**
   * Initialize the adapter with connection details
   * This method should be called after the adapter is instantiated.
   */
  abstract initialize(connection: PlatformAuthData): Promise<void>;
} 
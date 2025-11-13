import { PlatformAccountInfo, PlatformAuthData, PlatformType } from '../models';
import { PlatformAdapter } from './PlatformAdapter';
import axios from 'axios';
import crypto from 'crypto';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import fs from 'fs';
import { logger } from '../../../core/logging/logger';
import { SocialPlatform } from '../../../core/models/SocialAccount';

/**
 * Threads platform adapter implementation
 * Production-ready implementation with robust error handling and logging
 * Note: Since Threads uses the same API as Instagram, this adapter
 * extends/modifies the Instagram API endpoints for Threads posting.
 */
export class ThreadsAdapter implements PlatformAdapter {
  platformType = SocialPlatform.THREADS;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private apiBaseUrl: string;
  
  constructor() {
    // Load configuration from environment variables
    this.clientId = process.env.INSTAGRAM_CLIENT_ID || ''; // Threads uses Instagram credentials
    this.clientSecret = process.env.INSTAGRAM_CLIENT_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=threads' || '';
    this.apiBaseUrl = 'https://graph.instagram.com';
    
    logger.info('ThreadsAdapter initialized', {
      hasClientCredentials: !!this.clientId && !!this.clientSecret
    });
    
    if (!this.clientId || !this.clientSecret) {
      logger.warn('Threads (Instagram) credentials not properly configured');
    }
  }
  
  /**
   * Initialize the adapter with authentication data
   */
  async initialize(connection: PlatformAuthData): Promise<void> {
    try {
      // Validate the connection
      if (!connection.accessToken) {
        throw new Error('Threads access token is required');
      }

      // Test the connection by making a simple API call
      // Threads uses Instagram's API infrastructure
      const response = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${connection.accessToken}`);
      
      if (!response.ok) {
        throw new Error('Failed to validate Threads connection');
      }

      logger.info('Threads adapter initialized successfully', {
        platformType: this.platformType,
        hasAccessToken: !!connection.accessToken
      });
    } catch (error) {
      logger.error('Failed to initialize Threads adapter', {
        error: error instanceof Error ? error.message : String(error),
        platformType: this.platformType
      });
      throw error;
    }
  }
  
  /**
   * Generate authorization URL for OAuth flow
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    try {
      const scopes = [
        'user_profile',
        'user_media',
        'threads_basic',
        'posts_upload', // For Threads API posting permission
      ];
      
      logger.debug('Generating Threads authorization URL', {
        scopes: scopes.join(',')
      });
      
      return `https://api.instagram.com/oauth/authorize?` +
        `client_id=${this.clientId}` +
        `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
        `&scope=${encodeURIComponent(scopes.join(','))}` +
        `&response_type=code` +
        `&state=${encodeURIComponent(state)}`;
    } catch (error) {
      logger.error('Error generating Threads authorization URL', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to generate Threads authorization URL');
    }
  }
  
  /**
   * Handle the authorization code callback from OAuth 2.0
   */
  async handleAuthorizationCode(code: string): Promise<PlatformAuthData> {
    try {
      logger.debug('Exchanging code for Threads token');
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri
      });
      
      const response = await axios.post(
        'https://api.instagram.com/oauth/access_token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      if (!response.data || !response.data.access_token) {
        logger.error('Invalid response from Threads token exchange', {
          response: response.data
        });
        throw new Error('Invalid response from Threads token exchange');
      }
      
      // Exchange short-lived token for long-lived token
      const longLivedTokenResponse = await axios.get(
        'https://graph.instagram.com/access_token',
        {
          params: {
            grant_type: 'ig_exchange_token',
            client_secret: this.clientSecret,
            access_token: response.data.access_token
          }
        }
      );
      
      if (!longLivedTokenResponse.data || !longLivedTokenResponse.data.access_token) {
        logger.error('Invalid response from Threads long-lived token exchange', {
          response: longLivedTokenResponse.data
        });
        throw new Error('Invalid response from Threads long-lived token exchange');
      }
      
      logger.info('Successfully exchanged code for Threads token', {
        hasLongLivedToken: !!longLivedTokenResponse.data.access_token,
        expiresIn: longLivedTokenResponse.data.expires_in
      });
      
      return {
        accessToken: longLivedTokenResponse.data.access_token,
        refreshToken: '',
        expiresIn: longLivedTokenResponse.data.expires_in || 5184000, // Default to 60 days
        scope: 'user_profile,user_media,threads_basic,posts_upload'
      };
    } catch (error: any) {
      logger.error('Error exchanging Threads code for token', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Handle OAuth callback (wrapper method)
   */
  async handleAuthorizationCallback(code: string, state: string): Promise<PlatformAuthData> {
    try {
      logger.debug('Handling Threads authorization callback');
      return await this.handleAuthorizationCode(code);
    } catch (error: any) {
      logger.error('Error handling Threads authorization callback', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to handle authorization callback');
    }
  }
  
  /**
   * Handle OAuth 1.0a token exchange (not used for Threads)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    logger.warn('Attempt to use OAuth 1.0a with Threads which is not supported', {
      oauthToken: oauthToken.substring(0, 10) + '...'
    });
    throw new Error('Threads does not support OAuth 1.0a token flow');
  }
  
  /**
   * Get account information using an access token
   */
  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    try {
      logger.debug('Fetching Threads account information');
      
      const response = await axios.get(`${this.apiBaseUrl}/me`, {
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: accessToken
        }
      });
      
      if (!response.data || !response.data.id) {
        logger.error('Invalid response from Threads account info API', {
          response: response.data
        });
        throw new Error('Invalid response from Threads account info API');
      }
      
      logger.info('Successfully fetched Threads account info', {
        id: response.data.id,
        username: response.data.username
      });
      
      return {
        id: response.data.id,
        name: response.data.username,
        username: response.data.username,
        profileImage: await this.getProfilePicture(accessToken, response.data.id),
        url: `https://threads.net/@${response.data.username}`,
        additionalData: {
          accountType: response.data.account_type,
          mediaCount: response.data.media_count
        }
      };
    } catch (error: any) {
      logger.error('Error fetching Threads account info', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to fetch account information');
    }
  }
  
  /**
   * Get a user's profile picture URL
   * @param accessToken Access token for authentication
   * @param userId User ID to get profile picture for 
   * @returns URL of profile picture
   */
  private async getProfilePicture(accessToken: string, userId: string): Promise<string> {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${userId}/picture`, {
        params: {
          access_token: accessToken,
          redirect: 'false',
          height: 320,
          width: 320
        }
      });
      
      if (response.data && response.data.data && response.data.data.url) {
        return response.data.data.url;
      }
      
      return '';
    } catch (error) {
      logger.warn('Failed to fetch Threads profile picture', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return '';
    }
  }
  
  /**
   * Validate an access token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      logger.debug('Validating Threads token');
      
      // Use a simple API call to check if the token is valid
      await axios.get(`${this.apiBaseUrl}/me`, {
        params: {
          fields: 'id',
          access_token: token
        }
      });
      
      logger.debug('Threads token is valid');
      return true;
    } catch (error) {
      logger.warn('Threads token validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  /**
   * Refresh an access token by extending it
   */
  async refreshToken(accessToken: string): Promise<string> {
    try {
      logger.debug('Refreshing Threads token');
      
      const response = await axios.get(`${this.apiBaseUrl}/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: accessToken
        }
      });
      
      if (response.data && response.data.access_token) {
        logger.info('Successfully refreshed Threads token', {
          expiresIn: response.data.expires_in
        });
        return response.data.access_token;
      } else {
        logger.error('Invalid response when refreshing Threads token', {
          response: response.data
        });
        throw new Error('Invalid response when refreshing token');
      }
    } catch (error: any) {
      logger.error('Error refreshing Threads token', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to refresh token');
    }
  }
  
  /**
   * Post a text-only thread
   * @param accessToken Access token for authentication
   * @param text Text content of the thread
   * @returns Object containing thread ID and URL
   */
  async postText(accessToken: string, text: string): Promise<{ id: string; url?: string }> {
    try {
      logger.debug('Posting text thread', {
        textLength: text.length
      });
      
      const response = await axios.post(
        `${this.apiBaseUrl}/me/threads_messages`,
        {
          text: text
        },
        {
          params: {
            access_token: accessToken
          }
        }
      );
      
      if (!response.data || !response.data.id) {
        logger.error('Invalid response when posting thread', {
          response: response.data
        });
        throw new Error('Invalid response when posting thread');
      }
      
      // Get user info to build thread URL
      const userInfo = await this.getAccountInfo(accessToken);
      const threadUrl = `https://threads.net/@${userInfo.username}/post/${response.data.id}`;
      
      logger.info('Successfully posted thread', {
        threadId: response.data.id
      });
      
      return {
        id: response.data.id,
        url: threadUrl
      };
    } catch (error: any) {
      logger.error('Error posting thread', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to post thread: ${error.message}`);
    }
  }
  
  /**
   * Upload an image to Threads/Instagram
   * @param accessToken Access token for authentication
   * @param imageFile Path to image file or Buffer containing image data
   * @returns Object containing the image ID
   */
  private async uploadImage(
    accessToken: string,
    imageFile: string | Buffer
  ): Promise<string> {
    try {
      logger.debug('Uploading image to Threads', {
        isBuffer: imageFile instanceof Buffer
      });
      
      let formData = new FormData();
      
      if (typeof imageFile === 'string') {
        try {
          // Add file from path
          const file = await fileFromPath(imageFile);
          formData.append('image', file);
        } catch (error) {
          logger.error('Error reading image file', {
            error: error instanceof Error ? error.message : String(error),
            filePath: imageFile
          });
          throw new Error('Error reading image file');
        }
      } else {
        // Create a temporary file from buffer
        const tempFilePath = `/tmp/threads_upload_${Date.now()}.jpg`;
        try {
          fs.writeFileSync(tempFilePath, imageFile);
          const file = await fileFromPath(tempFilePath);
          formData.append('image', file);
          
          // Clean up temp file after use
          fs.unlinkSync(tempFilePath);
        } catch (error) {
          logger.error('Error handling image buffer', {
            error: error instanceof Error ? error.message : String(error)
          });
          throw new Error('Error handling image buffer');
        }
      }
      
      // Upload the image
      const response = await axios.post(
        `${this.apiBaseUrl}/me/media`,
        formData,
        {
          params: {
            access_token: accessToken,
            media_type: 'IMAGE'
          },
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (!response.data || !response.data.id) {
        logger.error('Invalid response when uploading image', {
          response: response.data
        });
        throw new Error('Invalid response when uploading image');
      }
      
      logger.info('Successfully uploaded image to Threads', {
        imageId: response.data.id
      });
      
      return response.data.id;
    } catch (error: any) {
      logger.error('Error uploading image to Threads', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }
  
  /**
   * Post a thread with text and an image
   * @param accessToken Access token for authentication
   * @param text Text content of the thread
   * @param image Path to image file or Buffer containing image data
   * @returns Object containing thread ID and URL
   */
  async postWithImage(
    accessToken: string,
    text: string,
    image: string | Buffer
  ): Promise<{ id: string; url?: string }> {
    try {
      logger.debug('Posting thread with image', {
        textLength: text.length,
        isBuffer: image instanceof Buffer
      });
      
      // Step 1: Upload the image
      const mediaId = await this.uploadImage(accessToken, image);
      
      // Step 2: Create a thread with the image
      const response = await axios.post(
        `${this.apiBaseUrl}/me/threads_messages`,
        {
          text: text,
          media_id: mediaId
        },
        {
          params: {
            access_token: accessToken
          }
        }
      );
      
      if (!response.data || !response.data.id) {
        logger.error('Invalid response when posting thread with image', {
          response: response.data
        });
        throw new Error('Invalid response when posting thread with image');
      }
      
      // Get user info to build thread URL
      const userInfo = await this.getAccountInfo(accessToken);
      const threadUrl = `https://threads.net/@${userInfo.username}/post/${response.data.id}`;
      
      logger.info('Successfully posted thread with image', {
        threadId: response.data.id
      });
      
      return {
        id: response.data.id,
        url: threadUrl
      };
    } catch (error: any) {
      logger.error('Error posting thread with image', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to post thread with image: ${error.message}`);
    }
  }
  
  /**
   * Reply to a thread
   * @param accessToken Access token for authentication
   * @param threadId ID of the thread to reply to
   * @param text Text content of the reply
   * @param image Optional path to image file or Buffer
   * @returns Object containing reply ID and URL
   */
  async replyToThread(
    accessToken: string,
    threadId: string,
    text: string,
    image?: string | Buffer
  ): Promise<{ id: string; url?: string }> {
    try {
      logger.debug('Replying to thread', {
        threadId,
        textLength: text.length,
        hasImage: !!image
      });
      
      let mediaId: string | undefined;
      
      // Upload image if provided
      if (image) {
        mediaId = await this.uploadImage(accessToken, image);
      }
      
      // Create the reply payload
      const replyData: any = {
        text: text,
        replied_to_media_id: threadId
      };
      
      if (mediaId) {
        replyData.media_id = mediaId;
      }
      
      // Post the reply
      const response = await axios.post(
        `${this.apiBaseUrl}/me/threads_messages`,
        replyData,
        {
          params: {
            access_token: accessToken
          }
        }
      );
      
      if (!response.data || !response.data.id) {
        logger.error('Invalid response when replying to thread', {
          response: response.data
        });
        throw new Error('Invalid response when replying to thread');
      }
      
      // Get user info to build reply URL
      const userInfo = await this.getAccountInfo(accessToken);
      const replyUrl = `https://threads.net/@${userInfo.username}/post/${response.data.id}`;
      
      logger.info('Successfully replied to thread', {
        threadId,
        replyId: response.data.id
      });
      
      return {
        id: response.data.id,
        url: replyUrl
      };
    } catch (error: any) {
      logger.error('Error replying to thread', {
        error: error.response?.data || error.message,
        threadId,
        status: error.response?.status
      });
      throw new Error(`Failed to reply to thread: ${error.message}`);
    }
  }
  
  /**
   * Delete a thread
   * @param accessToken Access token for authentication
   * @param threadId ID of the thread to delete
   * @returns True if deletion was successful
   */
  async deleteThread(accessToken: string, threadId: string): Promise<boolean> {
    try {
      logger.debug('Deleting thread', { threadId });
      
      await axios.delete(`${this.apiBaseUrl}/${threadId}`, {
        params: {
          access_token: accessToken
        }
      });
      
      logger.info('Successfully deleted thread', { threadId });
      return true;
    } catch (error: any) {
      logger.error('Error deleting thread', {
        error: error.response?.data || error.message,
        threadId,
        status: error.response?.status
      });
      return false;
    }
  }
  
  /**
   * Get recent threads from user's feed
   * @param accessToken Access token for authentication
   * @param limit Number of threads to retrieve
   * @returns Array of threads
   */
  async getRecentThreads(accessToken: string, limit: number = 10): Promise<any[]> {
    try {
      logger.debug('Fetching recent threads', { limit });
      
      const response = await axios.get(`${this.apiBaseUrl}/me/threads_messages`, {
        params: {
          access_token: accessToken,
          limit: Math.min(limit, 50) // Cap at 50 per API limitations
        }
      });
      
      if (!response.data || !response.data.data) {
        logger.warn('No threads found or invalid response', {
          response: response.data
        });
        return [];
      }
      
      logger.info('Successfully fetched recent threads', {
        count: response.data.data.length
      });
      
      return response.data.data;
    } catch (error: any) {
      logger.error('Error fetching recent threads', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      return [];
    }
  }
}

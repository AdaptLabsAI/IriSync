import { PlatformAccountInfo, PlatformAuthData, PlatformType } from '../models';
import { PlatformAdapter } from './PlatformAdapter';
import axios from 'axios';
import { logger } from '../../../core/logging/logger';
import { SocialPlatform } from '../../../core/models/SocialAccount';

/**
 * Instagram platform adapter implementation
 * Uses the Facebook Graph API for Instagram
 */
export class InstagramAdapter implements PlatformAdapter {
  platformType = SocialPlatform.INSTAGRAM;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private apiVersion: string;
  private baseUrl: string;
  
  constructor() {
    // Load configuration from environment variables
    this.clientId = process.env.FACEBOOK_CLIENT_ID || '';
    this.clientSecret = process.env.FACEBOOK_CLIENT_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=instagram' || '';
    this.apiVersion = 'v17.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }
  
  /**
   * Initialize the adapter with authentication data
   */
  async initialize(connection: PlatformAuthData): Promise<void> {
    try {
      // Validate the connection
      if (!connection.accessToken) {
        throw new Error('Instagram access token is required');
      }

      // Test the connection by making a simple API call to Instagram Basic Display API
      const response = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${connection.accessToken}`);
      
      if (!response.ok) {
        throw new Error('Failed to validate Instagram connection');
      }

      logger.info('Instagram adapter initialized successfully', {
        platformType: this.platformType,
        userId: (connection as any).platformUserId
      });
    } catch (error) {
      logger.error('Failed to initialize Instagram adapter', {
        error: error instanceof Error ? error.message : String(error),
        platformType: this.platformType
      });
      throw error;
    }
  }
  
  /**
   * Generate Instagram OAuth authorization URL via Facebook OAuth
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
      'public_profile'
    ];
    
    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?` +
      `client_id=${encodeURIComponent(this.clientId)}` +
      `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=${encodeURIComponent(scopes.join(','))}` +
      `&response_type=code`;
  }
  
  /**
   * Handle OAuth 2.0 authorization code flow
   */
  async handleAuthorizationCode(code: string, oauthVerifier?: string): Promise<PlatformAuthData> {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code: code
      });
      
      if (oauthVerifier) {
        params.append('code_verifier', oauthVerifier);
      }
      
      // Exchange code for short-lived access token
      const response = await axios.get(
        `${this.baseUrl}/oauth/access_token?${params.toString()}`
      );
      
      const data = response.data;
      
      // Exchange short-lived token for long-lived token
      const longLivedResponse = await axios.get(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            fb_exchange_token: data.access_token
          }
        }
      );
      
      const longLivedData = longLivedResponse.data;
      
      return {
        accessToken: longLivedData.access_token,
        expiresIn: longLivedData.expires_in,
        scope: data.scope
      };
    } catch (error: any) {
      logger.error('Error exchanging Instagram code for token', {
        error: error.response?.data || error.message
      });
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Process the authorization callback (wrapper method)
   */
  async handleAuthorizationCallback(code: string, state: string): Promise<PlatformAuthData> {
    // For Instagram, we just call handleAuthorizationCode
    return this.handleAuthorizationCode(code);
  }
  
  /**
   * Handle OAuth 1.0a token exchange (not used by Instagram)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    // Instagram doesn't use OAuth 1.0a
    throw new Error('Instagram does not support OAuth 1.0a token flow');
  }
  
  /**
   * Get account information using an access token
   */
  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    try {
      // First get Facebook user's ID
      const userResponse = await axios.get(
        `${this.baseUrl}/me`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,name,email'
          }
        }
      );
      
      const userData = userResponse.data;
      
      // Get user's Facebook pages that have Instagram accounts
      const pagesResponse = await axios.get(
        `${this.baseUrl}/me/accounts`,
        {
          params: {
            access_token: accessToken,
            fields: 'instagram_business_account,name,access_token,picture,id'
          }
        }
      );
      
      // Process connected Instagram business accounts
      const pages = pagesResponse.data.data || [];
      const instagramAccounts = [];
      
      for (const page of pages) {
        if (page.instagram_business_account) {
          // Get Instagram business account details
          const instagramId = page.instagram_business_account.id;
          
          try {
            const instagramResponse = await axios.get(
              `${this.baseUrl}/${instagramId}`,
              {
                params: {
                  access_token: page.access_token,
                  fields: 'id,username,profile_picture_url,name,biography,website,followers_count,follows_count,media_count'
                }
              }
            );
            
            const instagramData = instagramResponse.data;
            
            instagramAccounts.push({
              id: instagramData.id,
              name: instagramData.name || page.name,
              username: instagramData.username,
              profilePictureUrl: instagramData.profile_picture_url || page.picture?.data?.url,
              pageId: page.id,
              pageAccessToken: page.access_token,
              pageName: page.name,
              bio: instagramData.biography,
              website: instagramData.website,
              followerCount: instagramData.followers_count,
              followingCount: instagramData.follows_count,
              postCount: instagramData.media_count
            });
          } catch (error) {
            logger.warn(`Error fetching details for Instagram account ${instagramId}:`, error);
          }
        }
      }
      
      // Return a structure that includes both Facebook user info and available Instagram accounts
      return {
        id: userData.id,
        name: userData.name,
        username: userData.email || userData.name,
        profileImage: pages[0]?.picture?.data?.url,
        email: userData.email,
        url: `https://www.facebook.com/${userData.id}`,
        additionalData: {
          // Include available Instagram accounts so the UI can display them for selection
          availableAccounts: instagramAccounts,
          // Flag to indicate this account has Instagram accounts that need selection
          requiresAccountSelection: instagramAccounts.length > 0
        }
      };
    } catch (error: any) {
      logger.error('Error fetching Instagram account info', {
        error: error.response?.data || error.message
      });
      throw new Error('Failed to fetch account information');
    }
  }
  
  /**
   * Validate an access token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      // Use the debug_token endpoint to validate the token
      const response = await axios.get(
        `${this.baseUrl}/debug_token`,
        {
          params: {
            input_token: token,
            access_token: `${this.clientId}|${this.clientSecret}`
          }
        }
      );
      
      // Check if token is valid and not expired
      const data = response.data.data;
      const isValid = data.is_valid && (!data.expires_at || data.expires_at > Math.floor(Date.now() / 1000));
      
      return isValid;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Refresh an access token (Facebook long-lived tokens can be refreshed)
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      // For Facebook/Instagram, refreshToken parameter is actually a long-lived access token
      // that we need to exchange for a new one
      const response = await axios.get(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            fb_exchange_token: refreshToken
          }
        }
      );
      
      return response.data.access_token;
    } catch (error: any) {
      logger.error('Error refreshing Instagram token', {
        error: error.response?.data || error.message
      });
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Schedule a post to Instagram
   * @param pageToken The page access token
   * @param instagramAccountId The Instagram account ID
   * @param mediaUrl The URL of the media to post (must be accessible publicly)
   * @param caption The post caption
   * @param scheduledPublishTime Optional timestamp for scheduled publishing
   */
  async scheduleInstagramPost(
    pageToken: string, 
    instagramAccountId: string, 
    mediaUrl: string, 
    caption: string,
    scheduledPublishTime?: number
  ): Promise<{ id: string; status: string }> {
    try {
      logger.debug('Scheduling Instagram post', { 
        instagramAccountId,
        hasMediaUrl: !!mediaUrl,
        captionLength: caption?.length,
        scheduledPublishTime
      });

      // Step 1: Create a media container
      const containerParams = new URLSearchParams({
        access_token: pageToken,
        image_url: mediaUrl,
        caption: caption,
      });

      // Add scheduled publishing if provided
      if (scheduledPublishTime) {
        containerParams.append('scheduled_publish_time', scheduledPublishTime.toString());
        containerParams.append('published', 'false');
      }

      const containerResponse = await axios.post(
        `${this.baseUrl}/${instagramAccountId}/media`,
        containerParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (!containerResponse.data || !containerResponse.data.id) {
        logger.error('Failed to create Instagram media container', {
          response: containerResponse.data
        });
        throw new Error('Failed to create Instagram media container');
      }

      const containerId = containerResponse.data.id;
      
      // Step 2: Publish the container
      const publishParams = new URLSearchParams({
        access_token: pageToken,
        creation_id: containerId
      });

      const publishResponse = await axios.post(
        `${this.baseUrl}/${instagramAccountId}/media_publish`,
        publishParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (!publishResponse.data || !publishResponse.data.id) {
        logger.error('Failed to publish Instagram post', {
          response: publishResponse.data,
          containerId
        });
        throw new Error('Failed to publish Instagram post');
      }

      logger.info('Successfully scheduled Instagram post', {
        instagramAccountId,
        postId: publishResponse.data.id,
        scheduledPublishTime
      });

      return {
        id: publishResponse.data.id,
        status: scheduledPublishTime ? 'SCHEDULED' : 'PUBLISHED'
      };
    } catch (error: any) {
      logger.error('Error scheduling Instagram post', {
        error: error.response?.data || error.message,
        instagramAccountId,
        hasMediaUrl: !!mediaUrl
      });
      throw new Error(`Failed to schedule Instagram post: ${error.message}`);
    }
  }

  /**
   * Get a list of scheduled posts
   * @param pageToken The page access token
   * @param instagramAccountId The Instagram account ID
   */
  async getScheduledPosts(pageToken: string, instagramAccountId: string): Promise<any[]> {
    try {
      logger.debug('Getting scheduled Instagram posts', { instagramAccountId });
      
      const response = await axios.get(
        `${this.baseUrl}/${instagramAccountId}/scheduled_posts`,
        {
          params: {
            access_token: pageToken,
            fields: 'id,status,scheduled_publish_time,media_type,permalink,caption'
          }
        }
      );

      if (!response.data || !response.data.data) {
        return [];
      }

      logger.debug('Successfully retrieved scheduled Instagram posts', {
        instagramAccountId,
        count: response.data.data.length
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Error getting scheduled Instagram posts', {
        error: error.response?.data || error.message,
        instagramAccountId
      });
      return [];
    }
  }
}

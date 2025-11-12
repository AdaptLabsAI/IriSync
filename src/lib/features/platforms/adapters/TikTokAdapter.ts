import { PlatformAccountInfo, PlatformAuthData, PlatformType } from '../models';
import { PlatformAdapter } from './PlatformAdapter';
import axios from 'axios';
import crypto from 'crypto';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from '../../logging/logger';
import { PostData, PostResult, PlatformAnalytics } from '../models';
import { SocialPlatform } from '../../models/SocialAccount';

/**
 * TikTok platform adapter implementation with content publishing
 * Production-ready implementation with robust error handling and logging
 */
export class TikTokAdapter implements PlatformAdapter {
  platformType = SocialPlatform.TIKTOK;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private apiVersion: string;
  private baseUrl: string;
  
  constructor() {
    this.clientId = process.env.TIKTOK_CLIENT_KEY || '';
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=tiktok' || '';
    this.apiVersion = 'v2';
    this.baseUrl = 'https://open.tiktokapis.com/v2';
    
    logger.info('TikTokAdapter initialized', {
      hasClientCredentials: !!this.clientId && !!this.clientSecret
    });
    
    if (!this.clientId || !this.clientSecret) {
      logger.warn('TikTok credentials not properly configured');
    }
  }
  
  /**
   * Initialize the adapter with authentication data
   */
  async initialize(connection: PlatformAuthData): Promise<void> {
    try {
      // Validate the connection
      if (!connection.accessToken) {
        throw new Error('TikTok access token is required');
      }

      // Test the connection by making a simple API call
      const response = await fetch('https://open.tiktokapis.com/v2/user/info/', {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate TikTok connection');
      }

      logger.info('TikTok adapter initialized successfully', {
        platformType: this.platformType,
        hasAccessToken: !!connection.accessToken
      });
    } catch (error) {
      logger.error('Failed to initialize TikTok adapter', {
        error: error instanceof Error ? error.message : String(error),
        platformType: this.platformType
      });
      throw error;
    }
  }
  
  /**
   * Generate authorization URL for OAuth flow with PKCE
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      
      // Store code verifier in state
      const stateObj = {
        originalState: state,
        codeVerifier: codeVerifier
      };
      
      // Encode state object
      const encodedState = Buffer.from(JSON.stringify(stateObj)).toString('base64');
      
      const scopes = [
        'user.info.basic',
        'video.list',
        'video.upload',
        'video.publish',
        'video.delete'
      ];
      
      logger.debug('Generating TikTok authorization URL', {
        scopes: scopes.join(','),
        hasCodeChallenge: !!codeChallenge
      });
      
      return `https://www.tiktok.com/auth/authorize/?` +
        `client_key=${this.clientId}` +
        `&scope=${encodeURIComponent(scopes.join(','))}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
        `&state=${encodedState}` + 
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256`;
    } catch (error) {
      logger.error('Error generating TikTok authorization URL', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to generate TikTok authorization URL');
    }
  }
  
  /**
   * Handle OAuth 2.0 authorization code flow
   */
  async handleAuthorizationCode(code: string, codeVerifier?: string): Promise<PlatformAuthData> {
    try {
      logger.debug('Exchanging code for TikTok token', {
        hasCodeVerifier: !!codeVerifier
      });
      
      const params = new URLSearchParams({
        client_key: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri
      });
      
      // Add code verifier if provided (PKCE)
      if (codeVerifier) {
        params.append('code_verifier', codeVerifier);
      }
      
      const tokenResponse = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      if (tokenResponse.data.data && tokenResponse.data.data.access_token) {
        logger.info('Successfully exchanged code for TikTok token', {
          hasAccessToken: !!tokenResponse.data.data.access_token,
          hasRefreshToken: !!tokenResponse.data.data.refresh_token,
          expiresIn: tokenResponse.data.data.expires_in
        });
        
        // Define scopes for token response
        const scopes = [
          'user.info.basic',
          'video.list',
          'video.upload',
          'video.publish',
          'video.delete'
        ];
        
        return {
          accessToken: tokenResponse.data.data.access_token,
          refreshToken: tokenResponse.data.data.refresh_token,
          expiresIn: tokenResponse.data.data.expires_in,
          scope: scopes.join(',')
        };
      } else {
        logger.error('Invalid response from TikTok API', {
          response: tokenResponse.data
        });
        throw new Error('Invalid response from TikTok API');
      }
    } catch (error: any) {
      logger.error('Error exchanging TikTok code for token', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Process the authorization callback with PKCE
   */
  async handleAuthorizationCallback(code: string, state: string): Promise<PlatformAuthData> {
    try {
      // Extract the code verifier from the state
      let codeVerifier: string | undefined;
      
      try {
        const stateObj = JSON.parse(Buffer.from(state, 'base64').toString());
        codeVerifier = stateObj.codeVerifier;
        logger.debug('Successfully extracted code verifier from state');
      } catch (error) {
        logger.warn('Could not extract code verifier from state', {
          error: error instanceof Error ? error.message : String(error),
          stateLength: state.length
        });
      }
      
      return this.handleAuthorizationCode(code, codeVerifier);
    } catch (error: any) {
      logger.error('Error handling TikTok authorization callback', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to handle authorization callback');
    }
  }
  
  /**
   * Handle OAuth 1.0a token exchange (not used by TikTok)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    // TikTok uses OAuth 2.0, not OAuth 1.0a, so this method shouldn't be used
    logger.warn('Attempt to use OAuth 1.0a with TikTok which is not supported', {
      oauthToken: oauthToken.substring(0, 10) + '...'
    });
    throw new Error('TikTok does not support OAuth 1.0a token flow');
  }
  
  /**
   * Get account information using an access token
   */
  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    try {
      logger.debug('Fetching TikTok account information');
      
      const response = await axios.get(`${this.baseUrl}/user/info/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.data) {
        const userData = response.data.data;
        
        logger.info('Successfully fetched TikTok account info', {
          username: userData.username || userData.display_name
        });
        
        return {
          id: userData.open_id,
          name: userData.display_name || 'TikTok User',
          username: userData.username || userData.display_name,
          profileImage: userData.avatar_url,
          url: `https://www.tiktok.com/@${userData.username || userData.open_id}`,
          additionalData: {
            openId: userData.open_id,
            unionId: userData.union_id,
            followerCount: userData.follower_count,
            followingCount: userData.following_count,
            videoCount: userData.video_count,
            isVerified: userData.is_verified,
            profileDeepLink: userData.profile_deep_link
          }
        };
      } else {
        logger.error('Invalid response from TikTok API', {
          response: response.data
        });
        throw new Error('Invalid response from TikTok API');
      }
    } catch (error: any) {
      logger.error('Error fetching TikTok user info', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to fetch account information');
    }
  }
  
  /**
   * Validate an access token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      logger.debug('Validating TikTok token');
      
      // Use a simple API call to check if the token is still valid
      await axios.get(`${this.baseUrl}/user/info/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      logger.debug('TikTok token is valid');
      return true;
    } catch (error) {
      logger.warn('TikTok token validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  /**
   * Refresh an expired access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      logger.debug('Refreshing TikTok token');
      
      const params = new URLSearchParams({
        client_key: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });
      
      const response = await axios.post(
        `${this.baseUrl}/oauth/token/`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      if (response.data.data && response.data.data.access_token) {
        logger.info('Successfully refreshed TikTok token');
        return response.data.data.access_token;
      } else {
        logger.error('Invalid response when refreshing token', {
          response: response.data
        });
        throw new Error('Invalid response when refreshing token');
      }
    } catch (error: any) {
      logger.error('Error refreshing TikTok token', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to refresh token');
    }
  }
  
  /**
   * Upload a video to TikTok
   * @param accessToken Access token for authentication
   * @param videoFile Path to video file or Buffer containing video data
   * @param options Additional upload options
   * @returns Object containing upload ID and source ID
   */
  async uploadVideo(
    accessToken: string,
    videoFile: string | Buffer,
    options?: {
      title?: string;
      privacy?: 'PUBLIC' | 'SELF_ONLY' | 'MUTUAL_FOLLOW_FRIENDS';
    }
  ): Promise<{ upload_id: string; source_info: { source_id: string } }> {
    try {
      logger.debug('Initiating TikTok video upload', {
        isFilePath: typeof videoFile === 'string'
      });
      
      // Step 1: Create upload endpoint
      const createResponse = await axios.post(
        `${this.baseUrl}/video/upload/`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!createResponse.data?.data?.upload_url) {
        logger.error('Failed to get TikTok upload URL', {
          response: createResponse.data
        });
        throw new Error('Failed to get TikTok upload URL');
      }
      
      const uploadUrl = createResponse.data.data.upload_url;
      
      // Step 2: Upload the video
      let videoBuffer: Buffer;
      
      if (typeof videoFile === 'string') {
        // Read file from path
        videoBuffer = fs.readFileSync(videoFile);
      } else {
        // Use provided buffer
        videoBuffer = videoFile;
      }
      
      const formData = new FormData();
      formData.append('video', videoBuffer, {
        filename: 'video.mp4',
        contentType: 'video/mp4'
      });
      
      const uploadResponse = await axios.post(
        uploadUrl,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${accessToken}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      if (!uploadResponse.data?.data?.upload_id) {
        logger.error('Failed to upload TikTok video', {
          response: uploadResponse.data
        });
        throw new Error('Failed to upload TikTok video');
      }
      
      const uploadResult = {
        upload_id: uploadResponse.data.data.upload_id,
        source_info: {
          source_id: uploadResponse.data.data.source_info.source_id
        }
      };
      
      logger.info('Successfully uploaded TikTok video', {
        uploadId: uploadResult.upload_id,
        sourceId: uploadResult.source_info.source_id
      });
      
      return uploadResult;
    } catch (error: any) {
      logger.error('Error uploading TikTok video', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to upload TikTok video: ${error.message}`);
    }
  }
  
  /**
   * Publish a previously uploaded video
   * @param accessToken Access token for authentication
   * @param uploadId Upload ID from the uploadVideo response
   * @param options Additional publishing options
   * @returns Object containing the published video details
   */
  async publishVideo(
    accessToken: string,
    uploadId: string,
    options?: {
      title?: string;
      description?: string;
      privacy?: 'PUBLIC' | 'SELF_ONLY' | 'MUTUAL_FOLLOW_FRIENDS';
      disableComment?: boolean;
      disableDuet?: boolean;
      disableStitch?: boolean;
      terms?: string[];
      thumbnailUrl?: string;
    }
  ): Promise<{ id: string; url?: string }> {
    try {
      logger.debug('Publishing TikTok video', {
        uploadId,
        hasTitle: !!options?.title,
        privacy: options?.privacy || 'PUBLIC'
      });
      
      const publishData: any = {
        upload_id: uploadId,
        title: options?.title || '',
        privacy_level: options?.privacy || 'PUBLIC',
        disable_comment: options?.disableComment || false,
        disable_duet: options?.disableDuet || false,
        disable_stitch: options?.disableStitch || false
      };
      
      if (options?.description) {
        publishData.description = options.description;
      }
      
      if (options?.terms && options.terms.length > 0) {
        publishData.terms = options.terms;
      }
      
      if (options?.thumbnailUrl) {
        publishData.thumbnail_url = options.thumbnailUrl;
      }
      
      const publishResponse = await axios.post(
        `${this.baseUrl}/video/publish/`,
        publishData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!publishResponse.data?.data?.video_id) {
        logger.error('Failed to publish TikTok video', {
          response: publishResponse.data
        });
        throw new Error('Failed to publish TikTok video');
      }
      
      const videoId = publishResponse.data.data.video_id;
      const videoUrl = publishResponse.data.data.video_url || `https://www.tiktok.com/post/${videoId}`;
      
      logger.info('Successfully published TikTok video', {
        videoId,
        hasUrl: !!publishResponse.data.data.video_url
      });
      
      return {
        id: videoId,
        url: videoUrl
      };
    } catch (error: any) {
      logger.error('Error publishing TikTok video', {
        error: error.response?.data || error.message,
        uploadId,
        status: error.response?.status
      });
      throw new Error(`Failed to publish TikTok video: ${error.message}`);
    }
  }
  
  /**
   * Upload and publish a video to TikTok in one operation
   * @param accessToken Access token for authentication
   * @param videoFile Path to video file or Buffer containing video data
   * @param options Additional publishing options
   * @returns Object containing the published video details
   */
  async uploadAndPublishVideo(
    accessToken: string,
    videoFile: string | Buffer,
    options?: {
      title?: string;
      description?: string;
      privacy?: 'PUBLIC' | 'SELF_ONLY' | 'MUTUAL_FOLLOW_FRIENDS';
      disableComment?: boolean;
      disableDuet?: boolean;
      disableStitch?: boolean;
      terms?: string[];
      thumbnailUrl?: string;
    }
  ): Promise<{ id: string; url?: string }> {
    try {
      logger.debug('Initiating TikTok video upload and publish', {
        isFilePath: typeof videoFile === 'string',
        hasTitle: !!options?.title,
        privacy: options?.privacy || 'PUBLIC'
      });
      
      // First upload the video
      const uploadResult = await this.uploadVideo(accessToken, videoFile);
      
      // Then publish it
      return await this.publishVideo(accessToken, uploadResult.upload_id, options);
    } catch (error: any) {
      logger.error('Error uploading and publishing TikTok video', {
        error: error.response?.data || error.message,
        isFilePath: typeof videoFile === 'string',
        status: error.response?.status
      });
      throw new Error(`Failed to upload and publish TikTok video: ${error.message}`);
    }
  }
  
  /**
   * Get a list of the user's videos
   * @param accessToken Access token for authentication
   * @param options Additional query options
   * @returns Array of videos
   */
  async getUserVideos(
    accessToken: string,
    options?: {
      cursor?: number;
      limit?: number;
      fields?: string[];
    }
  ): Promise<any[]> {
    try {
      logger.debug('Fetching TikTok user videos', {
        limit: options?.limit || 20
      });
      
      const params: any = {
        cursor: options?.cursor || 0,
        limit: Math.min(options?.limit || 20, 50), // Max 50 per TikTok API
        fields: options?.fields || ['id', 'cover_image_url', 'share_url', 'title', 'create_time', 'stats']
      };
      
      const response = await axios.get(`${this.baseUrl}/video/list/`, {
        params,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.data?.data?.videos) {
        logger.warn('No TikTok videos found or invalid response', {
          response: response.data
        });
        return [];
      }
      
      logger.info('Successfully fetched TikTok user videos', {
        count: response.data.data.videos.length,
        hasCursor: !!response.data.data.cursor
      });
      
      return response.data.data.videos;
    } catch (error: any) {
      logger.error('Error fetching TikTok user videos', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      return [];
    }
  }
  
  /**
   * Delete a TikTok video
   * @param accessToken Access token for authentication
   * @param videoId ID of the video to delete
   * @returns True if deletion was successful
   */
  async deleteVideo(accessToken: string, videoId: string): Promise<boolean> {
    try {
      logger.debug('Deleting TikTok video', { videoId });
      
      const response = await axios.post(
        `${this.baseUrl}/video/delete/`,
        { video_id: videoId },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info('Successfully deleted TikTok video', { videoId });
      return true;
    } catch (error: any) {
      logger.error('Error deleting TikTok video', {
        error: error.response?.data || error.message,
        videoId,
        status: error.response?.status
      });
      return false;
    }
  }
  
  /**
   * Generate a random code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  /**
   * Generate a code challenge from a verifier using SHA-256
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = crypto.createHash('sha256').update(verifier).digest('base64');
    return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

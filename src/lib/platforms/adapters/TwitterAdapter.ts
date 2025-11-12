import { PlatformAccountInfo, PlatformAuthData, PlatformType } from '../models';
import { PlatformAdapter } from './PlatformAdapter';
import axios from 'axios';
import crypto from 'crypto';
import FormData from 'form-data';
import { logger } from '../../../lib/logging/logger';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

/**
 * Twitter platform adapter implementation with X API v2 support
 * Production-ready implementation with robust error handling and logging
 */
export class TwitterAdapter implements PlatformAdapter {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private apiBaseUrl: string;
  
  constructor() {
    // Load configuration from environment variables
    this.clientId = process.env.TWITTER_API_KEY || '';
    this.clientSecret = process.env.TWITTER_API_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=twitter' || '';
    this.apiBaseUrl = 'https://api.twitter.com/2';
    
    logger.info('TwitterAdapter initialized', {
      hasClientCredentials: !!this.clientId && !!this.clientSecret
    });
    
    if (!this.clientId || !this.clientSecret) {
      logger.warn('Twitter credentials not properly configured');
    }
  }
  
  /**
   * Generate authorization URL for OAuth flow with PKCE
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);
      
      // Store the code verifier in state for later use
      const stateObj = {
        originalState: state,
        codeVerifier: codeVerifier
      };
      
      // Encode the state object
      const encodedState = Buffer.from(JSON.stringify(stateObj)).toString('base64');
      
      // Define scopes needed for Twitter API v2
      const scopes = [
        'tweet.read',
        'tweet.write',
        'users.read',
        'offline.access'
      ];
      
      const authUrl = `https://twitter.com/i/oauth2/authorize?` +
        `response_type=code` +
        `&client_id=${encodeURIComponent(this.clientId)}` +
        `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
        `&scope=${encodeURIComponent(scopes.join(' '))}` +
        `&state=${encodeURIComponent(encodedState)}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256`;
      
      logger.debug('Generated Twitter authorization URL', {
        scopes: scopes.join(' '),
        hasCodeChallenge: !!codeChallenge
      });
      
      return authUrl;
    } catch (error) {
      logger.error('Error generating Twitter authorization URL', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to generate Twitter authorization URL');
    }
  }
  
  /**
   * Handle the authorization code callback from OAuth 2.0
   */
  async handleAuthorizationCode(code: string, codeVerifier?: string): Promise<PlatformAuthData> {
    try {
      logger.debug('Exchanging code for Twitter token', {
        hasCodeVerifier: !!codeVerifier
      });
      
      const params = new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri
      });
      
      if (codeVerifier) {
        params.append('code_verifier', codeVerifier);
      }
      
      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
          }
        }
      );
      
      logger.info('Successfully exchanged code for Twitter token', {
        hasAccessToken: !!response.data.access_token,
        hasRefreshToken: !!response.data.refresh_token
      });
      
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || '',
        expiresIn: response.data.expires_in,
        scope: response.data.scope
      };
    } catch (error: any) {
      logger.error('Error exchanging Twitter code for token', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Handle OAuth 1.0a token exchange (Twitter v2 API uses OAuth 2.0)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    // Twitter API v2 uses OAuth 2.0, not OAuth 1.0a
    logger.warn('Attempt to use OAuth 1.0a with Twitter which is not supported', {
      oauthToken: oauthToken.substring(0, 10) + '...'
    });
    throw new Error('Twitter API v2 does not support OAuth 1.0a token flow');
  }
  
  /**
   * Initialize the adapter with connection details
   */
  async initialize(connection: PlatformAuthData): Promise<void> {
    try {
      logger.debug('Initializing TwitterAdapter with connection data', {
        hasAccessToken: !!connection.accessToken,
        hasRefreshToken: !!connection.refreshToken,
        scope: connection.scope
      });
      
      // Validate the token during initialization
      const isValid = await this.validateToken(connection.accessToken);
      if (!isValid) {
        logger.warn('Twitter connection initialized with invalid token');
        throw new Error('Invalid access token provided for Twitter initialization');
      }
      
      logger.info('TwitterAdapter successfully initialized');
    } catch (error) {
      logger.error('Error initializing TwitterAdapter', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to initialize Twitter adapter');
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
      logger.error('Error handling Twitter authorization callback', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to handle authorization callback');
    }
  }
  
  /**
   * Get account information using an access token
   */
  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    try {
      logger.debug('Fetching Twitter account information');
      
      const response = await axios.get(
        `${this.apiBaseUrl}/users/me`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            'user.fields': 'id,name,username,profile_image_url,description,entities,public_metrics'
          }
        }
      );
      
      const userData = response.data.data;
      
      logger.info('Successfully fetched Twitter account info', {
        id: userData.id,
        username: userData.username
      });
      
      return {
        id: userData.id,
        name: userData.name,
        username: userData.username,
        profileImage: userData.profile_image_url,
        url: `https://twitter.com/${userData.username}`,
        additionalData: {
          bio: userData.description,
          followers: userData.public_metrics?.followers_count,
          following: userData.public_metrics?.following_count,
          tweets: userData.public_metrics?.tweet_count
        }
      };
    } catch (error: any) {
      logger.error('Error fetching Twitter account info', {
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
      logger.debug('Validating Twitter token');
      
      // Make a simple API call to check if the token is valid
      await axios.get(`${this.apiBaseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      logger.debug('Twitter token is valid');
      return true;
    } catch (error) {
      logger.warn('Twitter token validation failed', {
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
      logger.debug('Refreshing Twitter token');
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });
      
      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`
          }
        }
      );
      
      if (response.data.access_token) {
        logger.info('Successfully refreshed Twitter token');
        return response.data.access_token;
      } else {
        logger.error('Invalid response when refreshing token', {
          response: response.data
        });
        throw new Error('Invalid response when refreshing token');
      }
    } catch (error: any) {
      logger.error('Error refreshing Twitter token', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to refresh token');
    }
  }
  
  /**
   * Create and post a tweet
   * @param accessToken Access token for authentication
   * @param text Tweet text content
   * @param options Additional options for the tweet
   * @returns Object containing tweet ID and URL
   */
  async postTweet(
    accessToken: string,
    text: string,
    options?: {
      replyToTweetId?: string;
      mediaIds?: string[];
      pollOptions?: string[];
      pollDurationMinutes?: number;
      quoteTweetId?: string;
    }
  ): Promise<{ id: string; url: string }> {
    try {
      logger.debug('Posting tweet', {
        textLength: text.length,
        hasReply: !!options?.replyToTweetId,
        hasMedia: options?.mediaIds && options?.mediaIds.length > 0,
        hasPoll: options?.pollOptions && options?.pollOptions.length > 0
      });
      
      // Prepare tweet payload
      const tweetPayload: any = {
        text: text
      };
      
      // Handle reply to tweets
      if (options?.replyToTweetId) {
        tweetPayload.reply = {
          in_reply_to_tweet_id: options.replyToTweetId
        };
      }
      
      // Handle media attachments
      if (options?.mediaIds && options?.mediaIds.length > 0) {
        tweetPayload.media = {
          media_ids: options.mediaIds
        };
      }
      
      // Handle polls
      if (options?.pollOptions && options?.pollOptions.length >= 2) {
        tweetPayload.poll = {
          options: options.pollOptions,
          duration_minutes: options.pollDurationMinutes || 1440 // Default to 24 hours
        };
      }
      
      // Handle quote tweets
      if (options?.quoteTweetId) {
        tweetPayload.quote_tweet_id = options.quoteTweetId;
      }
      
      // Send the tweet
      const response = await axios.post(
        `${this.apiBaseUrl}/tweets`,
        tweetPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data || !response.data.data || !response.data.data.id) {
        logger.error('Invalid response when posting tweet', {
          response: response.data
        });
        throw new Error('Invalid response when posting tweet');
      }
      
      const tweetId = response.data.data.id;
      const tweetUrl = `https://twitter.com/user/status/${tweetId}`;
      
      logger.info('Successfully posted tweet', {
        tweetId: tweetId
      });
      
      return {
        id: tweetId,
        url: tweetUrl
      };
    } catch (error: any) {
      logger.error('Error posting tweet', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to post tweet: ${error.message}`);
    }
  }
  
  /**
   * Upload media to Twitter
   * @param accessToken Access token for authentication
   * @param media Buffer or filepath containing media
   * @param options Additional media options
   * @returns Media ID to use in tweet
   */
  async uploadMedia(
    accessToken: string,
    media: Buffer | string,
    options?: {
      mediaType?: 'image' | 'video' | 'gif';
      altText?: string;
    }
  ): Promise<string> {
    try {
      logger.debug('Uploading media to Twitter', {
        mediaType: options?.mediaType || 'image',
        hasAltText: !!options?.altText
      });
      
      // Twitter v2 API doesn't have a direct media upload endpoint
      // We need to use v1.1 API for media uploads
      const formData = new FormData();
      
      if (typeof media === 'string') {
        // File path - use readable stream
        formData.append('media', fs.createReadStream(media));
      } else {
        // Buffer - append as buffer
        formData.append('media', media, {
          filename: 'media.jpg',
          contentType: options?.mediaType === 'video' ? 'video/mp4' : 'image/jpeg'
        });
      }
      
      // Upload the media using Twitter v1.1 API
      const uploadResponse = await axios.post(
        'https://upload.twitter.com/1.1/media/upload.json',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...formData.getHeaders()
          }
        }
      );
      
      if (!uploadResponse.data || !uploadResponse.data.media_id_string) {
        logger.error('Invalid response when uploading media', {
          response: uploadResponse.data
        });
        throw new Error('Invalid response when uploading media');
      }
      
      const mediaId = uploadResponse.data.media_id_string;
      
      // Add alt text if provided
      if (options?.altText) {
        await axios.post(
          'https://upload.twitter.com/1.1/media/metadata/create.json',
          {
            media_id: mediaId,
            alt_text: { text: options.altText }
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      
      logger.info('Successfully uploaded media to Twitter', {
        mediaId: mediaId,
        mediaType: options?.mediaType || 'image'
      });
      
      return mediaId;
    } catch (error: any) {
      logger.error('Error uploading media to Twitter', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to upload media: ${error.message}`);
    }
  }
  
  /**
   * Delete a tweet
   * @param accessToken Access token for authentication
   * @param tweetId ID of the tweet to delete
   * @returns True if deletion was successful
   */
  async deleteTweet(accessToken: string, tweetId: string): Promise<boolean> {
    try {
      logger.debug('Deleting tweet', { tweetId });
      
      await axios.delete(
        `${this.apiBaseUrl}/tweets/${tweetId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      logger.info('Successfully deleted tweet', { tweetId });
      return true;
    } catch (error: any) {
      logger.error('Error deleting tweet', {
        error: error.response?.data || error.message,
        tweetId,
        status: error.response?.status
      });
      return false;
    }
  }
  
  /**
   * Get tweets from a user's timeline
   * @param accessToken Access token for authentication
   * @param userId User ID to get tweets for (defaults to authenticated user)
   * @param options Additional options for the request
   * @returns Array of tweets
   */
  async getUserTweets(
    accessToken: string,
    userId?: string,
    options?: {
      maxResults?: number;
      sinceId?: string;
      untilId?: string;
      startTime?: Date;
      endTime?: Date;
      excludeRetweets?: boolean;
      excludeReplies?: boolean;
    }
  ): Promise<any[]> {
    try {
      // If no userId provided, get the authenticated user's ID
      if (!userId) {
        const userResponse = await axios.get(
          `${this.apiBaseUrl}/users/me`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        userId = userResponse.data.data.id;
      }
      
      logger.debug('Fetching user tweets', {
        userId,
        maxResults: options?.maxResults
      });
      
      // Prepare query parameters
      const params: any = {
        'max_results': options?.maxResults || 10,
        'tweet.fields': 'created_at,public_metrics,text,entities,attachments',
        'exclude': []
      };
      
      if (options?.sinceId) params.since_id = options.sinceId;
      if (options?.untilId) params.until_id = options.untilId;
      if (options?.startTime) params.start_time = options.startTime.toISOString();
      if (options?.endTime) params.end_time = options.endTime.toISOString();
      if (options?.excludeRetweets) params.exclude.push('retweets');
      if (options?.excludeReplies) params.exclude.push('replies');
      
      // Convert exclude array to string if not empty
      if (params.exclude.length > 0) {
        params.exclude = params.exclude.join(',');
      } else {
        delete params.exclude;
      }
      
      // Get user tweets
      const response = await axios.get(
        `${this.apiBaseUrl}/users/${userId}/tweets`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params
        }
      );
      
      const tweets = response.data.data || [];
      
      logger.info('Successfully fetched user tweets', {
        userId,
        count: tweets.length
      });
      
      return tweets;
    } catch (error: any) {
      logger.error('Error fetching user tweets', {
        error: error.response?.data || error.message,
        userId,
        status: error.response?.status
      });
      return [];
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
   * Generate a code challenge from the code verifier for PKCE
   */
  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest('base64');
    return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

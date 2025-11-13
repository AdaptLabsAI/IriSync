import { PlatformAdapter } from './PlatformAdapter';
import { PlatformAccountInfo, PlatformAuthData } from '../models';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../../core/logging/logger';
import FormData from 'form-data';
import fs from 'fs';
import { Readable } from 'stream';
import { setTimeout } from 'timers/promises';

interface VideoUploadOptions {
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: 'private' | 'public' | 'unlisted';
  notifySubscribers?: boolean;
  scheduledPublishTime?: Date;
  language?: string;
  location?: {
    latitude: number;
    longitude: number;
    description?: string;
  };
}

/**
 * YouTube adapter for authentication and account information
 * Production-ready implementation with robust content publishing
 */
export class YouTubeAdapter implements PlatformAdapter {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  
  constructor(
    clientId: string = process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: string = process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: string = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=youtube' || ''
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    
    logger.info('YouTubeAdapter initialized', {
      hasClientCredentials: !!clientId && !!clientSecret
    });
  }
  
  /**
   * Generate authorization URL for OAuth flow
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    try {
      // Generate code verifier and challenge for PKCE
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);
      
      // Store the code verifier in the state
      const stateObj = {
        originalState: state,
        codeVerifier: codeVerifier
      };
      
      // Encode the state object
      const encodedState = Buffer.from(JSON.stringify(stateObj)).toString('base64');
      
      // Define scopes needed for YouTube API
      const scopes = [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ];
      
      // Generate the OAuth URL
      const authUrl = 'https://accounts.google.com/o/oauth2/auth' +
        `?client_id=${encodeURIComponent(this.clientId)}` +
        `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
        `&scope=${encodeURIComponent(scopes.join(' '))}` +
        `&response_type=code` +
        `&access_type=offline` +
        `&state=${encodeURIComponent(encodedState)}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256` +
        `&prompt=consent`; // Force consent to get refresh token
        
      logger.debug('Generated YouTube authorization URL', {
        scopes: scopes.join(' '),
        hasCodeChallenge: !!codeChallenge
      });
      
      return authUrl;
    } catch (error) {
      logger.error('Error generating YouTube authorization URL', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to generate authorization URL');
    }
  }
  
  /**
   * Handle the authorization code callback from OAuth 2.0
   */
  async handleAuthorizationCode(code: string, codeVerifier?: string): Promise<PlatformAuthData> {
    try {
      logger.debug('Exchanging code for YouTube token', {
        hasCodeVerifier: !!codeVerifier
      });
      
      const params = new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      });
      
      if (codeVerifier) {
        params.append('code_verifier', codeVerifier);
      }
      
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const data = response.data;
      
      logger.info('Successfully exchanged code for YouTube token', {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token
      });
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresIn: data.expires_in,
        scope: data.scope
      };
    } catch (error: any) {
      logger.error('Error exchanging YouTube code for token', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Handle OAuth 1.0a token exchange (not used by YouTube)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    // YouTube uses OAuth 2.0, not OAuth 1.0a
    logger.warn('Attempt to use OAuth 1.0a with YouTube which is not supported');
    throw new Error('YouTube does not support OAuth 1.0a token flow');
  }
  
  /**
   * Initialize the adapter with connection details
   */
  async initialize(connection: PlatformAuthData): Promise<void> {
    try {
      logger.debug('Initializing YouTubeAdapter with connection data', {
        hasAccessToken: !!connection.accessToken,
        hasRefreshToken: !!connection.refreshToken,
        scope: connection.scope
      });
      
      // Validate the token during initialization
      const isValid = await this.validateToken(connection.accessToken);
      if (!isValid) {
        logger.warn('YouTube connection initialized with invalid token');
        throw new Error('Invalid access token provided for YouTube initialization');
      }
      
      logger.info('YouTubeAdapter successfully initialized');
    } catch (error) {
      logger.error('Error initializing YouTubeAdapter', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to initialize YouTube adapter');
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
      logger.error('Error handling YouTube authorization callback', {
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
      logger.debug('Fetching YouTube channel information');
      
      // Get channel information
      const response = await axios.get(
        'https://www.googleapis.com/youtube/v3/channels',
        {
          params: {
            part: 'snippet,statistics,contentDetails',
            mine: true
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      if (!response.data.items || response.data.items.length === 0) {
        logger.error('No YouTube channel found for this account');
        throw new Error('No YouTube channel found for this account');
      }
      
      const channelData = response.data.items[0];
      const snippet = channelData.snippet;
      const statistics = channelData.statistics;
      
      logger.info('Successfully fetched YouTube channel info', {
        channelId: channelData.id,
        title: snippet.title
      });
      
      return {
        id: channelData.id,
        name: snippet.title,
        username: snippet.customUrl || snippet.title,
        profileImage: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        url: `https://www.youtube.com/channel/${channelData.id}`,
        additionalData: {
          description: snippet.description,
          subscriberCount: statistics.subscriberCount,
          videoCount: statistics.videoCount,
          viewCount: statistics.viewCount,
          country: snippet.country,
          publishedAt: snippet.publishedAt,
          uploadPlaylistId: channelData.contentDetails?.relatedPlaylists?.uploads
        }
      };
    } catch (error: any) {
      logger.error('Error fetching YouTube account info', {
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
      logger.debug('Validating YouTube token');
      
      // Try to make a simple API call to check token validity
      await axios.get(
        'https://www.googleapis.com/youtube/v3/channels',
        {
          params: {
            part: 'snippet',
            mine: true
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      logger.debug('YouTube token is valid');
      return true;
    } catch (error) {
      logger.warn('YouTube token validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  /**
   * Refresh an access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      logger.debug('Refreshing YouTube token');
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });
      
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      logger.info('Successfully refreshed YouTube token');
      
      return response.data.access_token;
    } catch (error: any) {
      logger.error('Error refreshing YouTube token', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to refresh token');
    }
  }
  
  /**
   * Upload a video to YouTube
   * Production-ready implementation with resumable uploads and error handling
   * @param accessToken Access token for authentication
   * @param videoFile Path to the video file or Buffer containing video data
   * @param options Video upload options
   * @returns Video ID and URL
   */
  async uploadVideo(
    accessToken: string,
    videoFile: string | Buffer | Readable,
    options: VideoUploadOptions
  ): Promise<{ id: string; url: string }> {
    try {
      logger.info('Starting YouTube video upload', {
        title: options.title,
        isFilePath: typeof videoFile === 'string',
        hasScheduledTime: !!options.scheduledPublishTime
      });
      
      let fileSize: number;
      let fileStream: Readable;
      
      // Handle different input types for the video file
      if (typeof videoFile === 'string') {
        // Path to file
        const stats = fs.statSync(videoFile);
        fileSize = stats.size;
        fileStream = fs.createReadStream(videoFile);
        logger.debug('Using file stream for upload', {
          path: videoFile,
          size: fileSize
        });
      } else if (Buffer.isBuffer(videoFile)) {
        // Buffer
        fileSize = videoFile.length;
        fileStream = Readable.from(videoFile);
        logger.debug('Using buffer for upload', {
          size: fileSize
        });
      } else {
        // Already a Readable stream
        fileStream = videoFile;
        fileSize = -1; // Unknown size, chunked upload will be used
        logger.debug('Using provided stream for upload');
      }
      
      // Prepare video metadata
      const videoMetadata = {
        snippet: {
          title: options.title,
          description: options.description || '',
          tags: options.tags || [],
          categoryId: options.categoryId || '22', // People & Blogs by default
          defaultLanguage: options.language
        },
        status: {
          privacyStatus: options.privacyStatus || 'private',
          publishAt: options.scheduledPublishTime?.toISOString(),
          selfDeclaredMadeForKids: false
        },
        recordingDetails: options.location ? {
          location: {
            latitude: options.location.latitude,
            longitude: options.location.longitude,
            locationDescription: options.location.description
          }
        } : undefined
      };
      
      // Start a resumable upload session
      logger.debug('Initializing resumable upload session');
      
      const initResponse = await axios({
        method: 'POST',
        url: 'https://www.googleapis.com/upload/youtube/v3/videos',
        params: {
          uploadType: 'resumable',
          part: 'snippet,status,recordingDetails'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': fileSize,
          'X-Upload-Content-Type': 'video/*'
        },
        data: videoMetadata
      });
      
      // Get the resumable upload URL from the response headers
      const uploadUrl = initResponse.headers?.location;
      
      if (!uploadUrl) {
        logger.error('Failed to get upload URL from YouTube API');
        throw new Error('Failed to initialize upload: No upload URL received');
      }
      
      logger.debug('Received upload URL from YouTube API');
      
      // Define upload chunk size (5MB)
      const chunkSize = 5 * 1024 * 1024;
      
      // If we're using a file path, let's do a chunked upload
      if (typeof videoFile === 'string') {
        let uploadedBytes = 0;
        const totalBytes = fileSize;
        const chunks = Math.ceil(totalBytes / chunkSize);
        
        logger.debug('Starting chunked upload', {
          totalBytes,
          chunks
        });
        
        for (let i = 0; i < chunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(totalBytes, start + chunkSize) - 1;
          const chunkLength = end - start + 1;
          
          const readStream = fs.createReadStream(videoFile, { start, end });
          
          try {
            const chunkResponse = await axios({
              method: 'PUT',
              url: uploadUrl,
              headers: {
                'Content-Length': chunkLength,
                'Content-Range': `bytes ${start}-${end}/${totalBytes}`
              },
              data: readStream,
              maxContentLength: Infinity,
              maxBodyLength: Infinity
            });
            
            // If we get a response with a status, the upload is complete
            if (chunkResponse.status === 200 || chunkResponse.status === 201) {
              const videoId = chunkResponse.data.id;
              const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
              
              logger.info('YouTube video upload completed successfully', {
                videoId,
                title: options.title
              });
              
              return { id: videoId, url: videoUrl };
            }
            
            uploadedBytes += chunkLength;
            logger.debug(`Uploaded chunk ${i+1}/${chunks}`, {
              progress: Math.floor((uploadedBytes / totalBytes) * 100) + '%'
            });
            
          } catch (error: any) {
            // Check if it's a recoverable error
            if (error.response?.status === 308) {
              // Resume broken upload
              const range = error.response.headers['range'];
              if (range) {
                const match = range.match(/bytes=0-(\d+)/);
                if (match) {
                  uploadedBytes = parseInt(match[1], 10) + 1;
                  logger.debug('Resuming upload from byte position', { position: uploadedBytes });
                  i = Math.floor(uploadedBytes / chunkSize) - 1; // Adjust chunk counter
                  continue;
                }
              }
            }
            
            logger.error('Error during chunked upload', {
              error: error.response?.data || error.message,
              chunk: i+1,
              status: error.response?.status
            });
            
            // Retry logic for transient errors
            if (error.response?.status >= 500 || error.response?.status === 429) {
              logger.debug('Retrying chunk upload after server error', { chunk: i+1 });
              await setTimeout(2000); // Wait 2 seconds before retry
              i--; // Retry the same chunk
              continue;
            }
            
            throw new Error(`Failed to upload video chunk: ${error.message}`);
          }
        }
        
        // If we exit the loop without returning, something went wrong
        throw new Error('Upload completed without receiving video ID');
      } else {
        // For streams and buffers, upload in one go
        try {
          logger.debug('Starting stream upload');
          
          const uploadResponse = await axios({
            method: 'PUT',
            url: uploadUrl,
            headers: fileSize > 0 ? {
              'Content-Length': fileSize,
              'Content-Range': `bytes 0-${fileSize-1}/${fileSize}`
            } : {},
            data: fileStream,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          });
          
          const videoId = uploadResponse.data.id;
          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          
          logger.info('YouTube video upload completed successfully', {
            videoId,
            title: options.title
          });
          
          return { id: videoId, url: videoUrl };
        } catch (error: any) {
          logger.error('Error during stream upload', {
            error: error.response?.data || error.message,
            status: error.response?.status
          });
          throw new Error(`Failed to upload video: ${error.message}`);
        }
      }
    } catch (error: any) {
      logger.error('Error uploading video to YouTube', {
        error: error.response?.data || error.message,
        title: options.title
      });
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }
  
  /**
   * Update an existing video's metadata
   * @param accessToken Access token for authentication
   * @param videoId YouTube video ID
   * @param options Video metadata options
   * @returns Updated video details
   */
  async updateVideo(
    accessToken: string,
    videoId: string,
    options: Partial<VideoUploadOptions>
  ): Promise<any> {
    try {
      logger.debug('Updating YouTube video metadata', {
        videoId,
        hasTitleUpdate: !!options.title,
        hasDescriptionUpdate: !!options.description,
        hasPrivacyUpdate: !!options.privacyStatus
      });
      
      // Prepare video metadata for update
      const videoMetadata: any = { id: videoId };
      
      // Only include parts that need updating
      if (options.title || options.description || options.tags || options.categoryId || options.language) {
        videoMetadata.snippet = {
          title: options.title,
          description: options.description,
          tags: options.tags,
          categoryId: options.categoryId,
          defaultLanguage: options.language
        };
        
        // Remove undefined properties
        Object.keys(videoMetadata.snippet).forEach(key => {
          if (videoMetadata.snippet[key] === undefined) {
            delete videoMetadata.snippet[key];
          }
        });
      }
      
      if (options.privacyStatus || options.scheduledPublishTime || options.notifySubscribers !== undefined) {
        videoMetadata.status = {
          privacyStatus: options.privacyStatus,
          publishAt: options.scheduledPublishTime?.toISOString(),
          selfDeclaredMadeForKids: false
        };
        
        // Remove undefined properties
        Object.keys(videoMetadata.status).forEach(key => {
          if (videoMetadata.status[key] === undefined) {
            delete videoMetadata.status[key];
          }
        });
      }
      
      if (options.location) {
        videoMetadata.recordingDetails = {
          location: {
            latitude: options.location.latitude,
            longitude: options.location.longitude,
            locationDescription: options.location.description
          }
        };
      }
      
      // Determine which parts we're updating
      const parts = [];
      if (videoMetadata.snippet) parts.push('snippet');
      if (videoMetadata.status) parts.push('status');
      if (videoMetadata.recordingDetails) parts.push('recordingDetails');
      
      if (parts.length === 0) {
        logger.warn('No metadata updates specified for YouTube video');
        throw new Error('No metadata updates specified');
      }
      
      const response = await axios({
        method: 'PUT',
        url: 'https://www.googleapis.com/youtube/v3/videos',
        params: {
          part: parts.join(',')
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: videoMetadata
      });
      
      logger.info('Successfully updated YouTube video metadata', {
        videoId,
        updatedParts: parts.join(',')
      });
      
      return response.data;
    } catch (error: any) {
      logger.error('Error updating YouTube video metadata', {
        error: error.response?.data || error.message,
        videoId,
        status: error.response?.status
      });
      throw new Error(`Failed to update video metadata: ${error.message}`);
    }
  }
  
  /**
   * Get a list of videos from the authenticated user's channel
   * @param accessToken Access token for authentication
   * @param maxResults Maximum number of videos to return (default 50)
   * @returns List of videos
   */
  async getVideos(accessToken: string, maxResults: number = 50): Promise<any[]> {
    try {
      logger.debug('Fetching YouTube videos', { maxResults });
      
      // First get the user's upload playlist ID
      const channelResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/channels',
        {
          params: {
            part: 'contentDetails',
            mine: true
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        logger.error('No YouTube channel found for this account');
        throw new Error('No YouTube channel found for this account');
      }
      
      const uploadPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;
      
      if (!uploadPlaylistId) {
        logger.warn('No upload playlist found for this YouTube channel');
        return [];
      }
      
      // Now get the videos from the upload playlist
      const videosResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/playlistItems',
        {
          params: {
            part: 'snippet,contentDetails,status',
            playlistId: uploadPlaylistId,
            maxResults: Math.min(maxResults, 50) // YouTube API limit is 50
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      logger.info('Successfully fetched YouTube videos', {
        count: videosResponse.data.items?.length || 0
      });
      
      return videosResponse.data.items || [];
    } catch (error: any) {
      logger.error('Error fetching YouTube videos', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      return [];
    }
  }
  
  /**
   * Delete a YouTube video
   * @param accessToken Access token for authentication
   * @param videoId YouTube video ID
   * @returns True if deletion was successful
   */
  async deleteVideo(accessToken: string, videoId: string): Promise<boolean> {
    try {
      logger.debug('Deleting YouTube video', { videoId });
      
      await axios({
        method: 'DELETE',
        url: 'https://www.googleapis.com/youtube/v3/videos',
        params: {
          id: videoId
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      logger.info('Successfully deleted YouTube video', { videoId });
      return true;
    } catch (error: any) {
      logger.error('Error deleting YouTube video', {
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
   * Generate a code challenge from the code verifier for PKCE
   */
  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest('base64');
    return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

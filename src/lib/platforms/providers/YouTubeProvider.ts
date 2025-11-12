import { 
  AuthState, 
  PlatformCapabilities, 
  PlatformProvider, 
  PlatformProviderConfig, 
  PlatformType 
} from '../PlatformProvider';
import { SocialAccount } from '../models/account';
import { 
  AttachmentType, 
  PlatformPost, 
  PostAttachment,
  PostResponse, 
  PostSchedule
} from '../models/content';
import { PlatformMetrics } from '../models/metrics';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * YouTube API implementation of the Platform Provider
 */
export class YouTubeProvider extends PlatformProvider {
  private baseUrl: string;
  private uploadUrl: string;
  
  constructor(config: PlatformProviderConfig, authState?: AuthState) {
    super(config, authState);
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    this.uploadUrl = 'https://www.googleapis.com/upload/youtube/v3';
  }
  
  /**
   * Returns the platform type
   */
  getPlatformType(): PlatformType {
    return PlatformType.YOUTUBE;
  }
  
  /**
   * Returns platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return {
      supportsImagePosts: false,
      supportsVideoPosts: true,
      supportsMultipleImages: false,
      supportsScheduling: true,
      supportsThreads: false,
      supportsPolls: false,
      supportsHashtags: true,
      supportsMentions: false,
      maxCharacterCount: 5000, // YouTube description limit
      maxHashtagCount: 100,
      maxMediaAttachments: 1, // YouTube only allows one video per post
      maxScheduleTimeInDays: 365 // YouTube allows far future scheduling
    };
  }
  
  /**
   * Generate authorization URL for OAuth flow
   */
  async getAuthorizationUrl(state: string, codeChallenge?: string): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ];
    
    const scopeParam = encodeURIComponent(scopes.join(' '));
    
    let url = 'https://accounts.google.com/o/oauth2/auth' +
      `?client_id=${encodeURIComponent(this.config.clientId)}` +
      `&redirect_uri=${encodeURIComponent(this.config.redirectUri)}` +
      `&scope=${scopeParam}` +
      `&response_type=code` +
      `&access_type=offline` +
      `&state=${encodeURIComponent(state)}` +
      `&prompt=consent`; // Force consent to get refresh token
    
    if (codeChallenge) {
      url += `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256`;
    }
    
    return Promise.resolve(url);
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<AuthState> {
    try {
      const params = new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
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
      
      // Create auth state
      const authState: AuthState = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        tokenType: data.token_type,
        scope: data.scope?.split(' ')
      };
      
      // Update internal auth state
      this.authState = authState;
      
      return authState;
    } catch (error: any) {
      console.error('Error exchanging YouTube code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Refresh the access token if expired
   */
  async refreshAccessToken(): Promise<AuthState> {
    if (!this.authState?.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const params = new URLSearchParams({
        refresh_token: this.authState.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
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
      
      const data = response.data;
      
      // Update auth state
      const authState: AuthState = {
        accessToken: data.access_token,
        refreshToken: this.authState.refreshToken, // Preserve refresh token as Google doesn't return it on refresh
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        tokenType: data.token_type,
        scope: data.scope?.split(' ') || this.authState.scope
      };
      
      this.authState = authState;
      
      return authState;
    } catch (error: any) {
      console.error('Error refreshing YouTube token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }
  
  /**
   * Check if the provider is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.authState?.accessToken) {
      return false;
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    return this.authState.expiresAt > now;
  }
  
  /**
   * Fetch account details
   */
  async getAccountDetails(): Promise<SocialAccount> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get channel information
      const response = await axios.get(
        `${this.baseUrl}/channels`,
        {
          params: {
            part: 'snippet,statistics,contentDetails',
            mine: true
          },
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`
          }
        }
      );
      
      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No YouTube channel found for this account');
      }
      
      const channelData = response.data.items[0];
      const snippet = channelData.snippet;
      const statistics = channelData.statistics;
      
      // Format the response as a SocialAccount
      return {
        id: uuidv4(),
        platformId: channelData.id,
        platformType: this.getPlatformType(),
        username: snippet.customUrl || snippet.title,
        displayName: snippet.title,
        profilePictureUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        profileUrl: `https://www.youtube.com/channel/${channelData.id}`,
        bio: snippet.description,
        isBusinessAccount: false, // YouTube doesn't have a business/personal distinction
        isConnected: true,
        hasValidCredentials: true,
        accountType: snippet.customUrl ? 'creator' : 'personal',
        followerCount: parseInt(statistics.subscriberCount) || 0,
        followingCount: 0, // YouTube doesn't expose following count via API
        postCount: parseInt(statistics.videoCount) || 0,
        lastConnected: new Date(),
        metadata: {
          viewCount: statistics.viewCount,
          commentCount: statistics.commentCount,
          uploadPlaylistId: channelData.contentDetails?.relatedPlaylists?.uploads,
          country: snippet.country,
          publishedAt: snippet.publishedAt
        }
      };
    } catch (error) {
      console.error('Error fetching YouTube account details:', error);
      throw new Error('Failed to fetch account details');
    }
  }
  
  /**
   * Create a post on YouTube
   */
  async createPost(post: PlatformPost): Promise<PostResponse> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    // Ensure we have a video attachment
    if (!post.attachments || post.attachments.length === 0 || post.attachments[0].type !== AttachmentType.VIDEO) {
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: '',
        status: 'failed',
        errorMessage: 'YouTube requires a video attachment for posting'
      };
    }
    
    try {
      const videoAttachment = post.attachments[0];
      
      // First, create metadata for the video
      const videoMetadata = {
        snippet: {
          title: post.title || 'Video Title',
          description: post.content || '',
          tags: post.hashtags || [],
          categoryId: '22' // Default to "People & Blogs" category
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false
        }
      };
      
      // If platform specific params are provided, use them
      if (post.platformSpecificParams) {
        // Merge with user-provided specific settings
        if (post.platformSpecificParams.categoryId) {
          videoMetadata.snippet.categoryId = post.platformSpecificParams.categoryId;
        }
        
        if (post.platformSpecificParams.privacyStatus) {
          videoMetadata.status.privacyStatus = post.platformSpecificParams.privacyStatus;
        }
        
        if (post.platformSpecificParams.madeForKids !== undefined) {
          videoMetadata.status.selfDeclaredMadeForKids = post.platformSpecificParams.madeForKids;
        }
      }
      
      // Get the video data
      let videoData: Buffer;
      
      if (videoAttachment.buffer) {
        videoData = Buffer.from(videoAttachment.buffer);
      } else if (videoAttachment.url) {
        // Download the video
        const videoResponse = await axios.get(videoAttachment.url, {
          responseType: 'arraybuffer'
        });
        videoData = Buffer.from(videoResponse.data);
      } else {
        throw new Error('No video data available');
      }
      
      // Upload the video using the resumable upload protocol
      // Step 1: Initiate the upload
      const initiateResponse = await axios.post(
        `${this.uploadUrl}/videos?uploadType=resumable&part=snippet,status`,
        videoMetadata,
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Length': videoData.length,
            'X-Upload-Content-Type': videoAttachment.mimeType || 'video/mp4'
          }
        }
      );
      
      // Get the resumable upload URL
      const uploadUrl = initiateResponse.headers['location'];
      if (!uploadUrl) {
        throw new Error('Failed to get upload URL from YouTube');
      }
      
      // Step 2: Upload the video data
      const uploadResponse = await axios.put(
        uploadUrl,
        videoData,
        {
          headers: {
            'Content-Type': videoAttachment.mimeType || 'video/mp4',
            'Content-Length': videoData.length
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      const videoId = uploadResponse.data.id;
      
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: videoId,
        status: 'published',
        publishedTime: new Date(),
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
    } catch (error) {
      console.error('Error creating YouTube post:', error);
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: '',
        status: 'failed',
        errorMessage: `Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Schedule a post for later publication
   */
  async schedulePost(post: PlatformPost, schedule: PostSchedule): Promise<PostResponse> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    // Ensure we have a video attachment
    if (!post.attachments || post.attachments.length === 0 || post.attachments[0].type !== AttachmentType.VIDEO) {
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: '',
        status: 'failed',
        errorMessage: 'YouTube requires a video attachment for scheduling'
      };
    }
    
    try {
      const videoAttachment = post.attachments[0];
      
      // Set up the scheduled time in ISO 8601 format
      const publishTime = new Date(schedule.publishAt).toISOString();
      
      // Create metadata for the video
      const videoMetadata = {
        snippet: {
          title: post.title || 'Scheduled Video',
          description: post.content || '',
          tags: post.hashtags || [],
          categoryId: '22' // Default to "People & Blogs" category
        },
        status: {
          privacyStatus: 'private', // Start as private
          selfDeclaredMadeForKids: false,
          publishAt: publishTime // Schedule the publish time
        }
      };
      
      // If platform specific params are provided, use them
      if (post.platformSpecificParams) {
        if (post.platformSpecificParams.categoryId) {
          videoMetadata.snippet.categoryId = post.platformSpecificParams.categoryId;
        }
        
        // For scheduled videos, the privacy status after publishing
        if (post.platformSpecificParams.privacyStatus) {
          videoMetadata.status.privacyStatus = post.platformSpecificParams.privacyStatus;
        }
        
        if (post.platformSpecificParams.madeForKids !== undefined) {
          videoMetadata.status.selfDeclaredMadeForKids = post.platformSpecificParams.madeForKids;
        }
      }
      
      // Get the video data
      let videoData: Buffer;
      
      if (videoAttachment.buffer) {
        videoData = Buffer.from(videoAttachment.buffer);
      } else if (videoAttachment.url) {
        // Download the video
        const videoResponse = await axios.get(videoAttachment.url, {
          responseType: 'arraybuffer'
        });
        videoData = Buffer.from(videoResponse.data);
      } else {
        throw new Error('No video data available');
      }
      
      // Upload the video using the resumable upload protocol
      // Step 1: Initiate the upload
      const initiateResponse = await axios.post(
        `${this.uploadUrl}/videos?uploadType=resumable&part=snippet,status`,
        videoMetadata,
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Length': videoData.length,
            'X-Upload-Content-Type': videoAttachment.mimeType || 'video/mp4'
          }
        }
      );
      
      // Get the resumable upload URL
      const uploadUrl = initiateResponse.headers['location'];
      if (!uploadUrl) {
        throw new Error('Failed to get upload URL from YouTube');
      }
      
      // Step 2: Upload the video data
      const uploadResponse = await axios.put(
        uploadUrl,
        videoData,
        {
          headers: {
            'Content-Type': videoAttachment.mimeType || 'video/mp4',
            'Content-Length': videoData.length
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      const videoId = uploadResponse.data.id;
      
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: videoId,
        status: 'scheduled',
        scheduledTime: new Date(schedule.publishAt),
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
    } catch (error) {
      console.error('Error scheduling YouTube post:', error);
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: '',
        status: 'failed',
        errorMessage: `Failed to schedule post: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Delete a post from the platform
   */
  async deletePost(postId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      await axios.delete(
        `${this.baseUrl}/videos`,
        {
          params: {
            id: postId
          },
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting YouTube post:', error);
      return false;
    }
  }
  
  /**
   * Get a list of posts for the account
   */
  async getPosts(limit?: number, before?: string, after?: string): Promise<PostResponse[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // First, get the uploads playlist ID
      const channelResponse = await axios.get(
        `${this.baseUrl}/channels`,
        {
          params: {
            part: 'contentDetails',
            mine: true
          },
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`
          }
        }
      );
      
      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw new Error('No YouTube channel found for this account');
      }
      
      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;
      
      // Build params for playlist items request
      const params: Record<string, any> = {
        part: 'snippet,status,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: limit || 50
      };
      
      if (before) {
        params.pageToken = before;
      }
      
      // Get videos from the uploads playlist
      const playlistResponse = await axios.get(
        `${this.baseUrl}/playlistItems`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`
          }
        }
      );
      
      const items = playlistResponse.data.items || [];
      
      // Get video IDs to fetch statistics
      const videoIds = items.map((item: any) => item.snippet.resourceId.videoId).join(',');
      
      // Get video statistics if we have videos
      let videoStats: Record<string, any> = {};
      
      if (videoIds) {
        const statsResponse = await axios.get(
          `${this.baseUrl}/videos`,
          {
            params: {
              part: 'statistics',
              id: videoIds
            },
            headers: {
              'Authorization': `Bearer ${this.authState!.accessToken}`
            }
          }
        );
        
        // Create a map of videoId -> statistics
        statsResponse.data.items.forEach((video: any) => {
          videoStats[video.id] = video.statistics;
        });
      }
      
      // Map playlist items to posts
      return items.map((item: any) => {
        const videoId = item.snippet.resourceId.videoId;
        const stats = videoStats[videoId] || {};
        
        return {
          id: uuidv4(),
          platformType: this.getPlatformType(),
          platformPostId: videoId,
          status: item.status.privacyStatus === 'private' && item.status.publishAt ? 'scheduled' : 'published',
          publishedTime: new Date(item.snippet.publishedAt),
          scheduledTime: item.status.publishAt ? new Date(item.status.publishAt) : undefined,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          analytics: {
            views: parseInt(stats.viewCount) || 0,
            likes: parseInt(stats.likeCount) || 0,
            comments: parseInt(stats.commentCount) || 0,
            shares: 0, // YouTube doesn't provide share metrics through this API
          },
          metadata: {
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
            duration: item.contentDetails?.duration,
            privacyStatus: item.status.privacyStatus
          }
        };
      });
    } catch (error) {
      console.error('Error fetching YouTube posts:', error);
      throw new Error('Failed to fetch posts');
    }
  }
  
  /**
   * Get account metrics and analytics
   */
  async getMetrics(startDate: Date, endDate: Date, metrics?: string[]): Promise<PlatformMetrics> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get channel information for basic metrics
      const channelResponse = await axios.get(
        `${this.baseUrl}/channels`,
        {
          params: {
            part: 'snippet,statistics',
            mine: true
          },
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`
          }
        }
      );
      
      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw new Error('No YouTube channel found for this account');
      }
      
      const channelData = channelResponse.data.items[0];
      const channelId = channelData.id;
      const statistics = channelData.statistics;
      
      // Format dates for YouTube Analytics API
      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = endDate.toISOString().split('T')[0];
      
      // Get videos published in the time range
      const posts = await this.getPosts(100);
      const postsInRange = posts.filter(post => {
        if (!post.publishedTime) return false;
        return post.publishedTime >= startDate && post.publishedTime <= endDate;
      });
      
      // Use YouTube Analytics API to get comprehensive metrics
      // This requires the youtube.analytics scope
      let viewsByDay: {date: string, views: number}[] = [];
      let subscribersGained = 0;
      let subscribersLost = 0;
      let averageViewDuration = 0;
      let watchTimeMinutes = 0;
      let viewsByCountry: Record<string, number> = {};
      let viewsByTrafficSource: Record<string, number> = {};
      let viewsByDevice: Record<string, number> = {};
      
      try {
        // Get view and watch time metrics
        const analyticsResponse = await axios.get(
          'https://youtubeanalytics.googleapis.com/v2/reports',
          {
            params: {
              dimensions: 'day',
              endDate: endDateString,
              ids: `channel==${channelId}`,
              metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost',
              startDate: startDateString
            },
            headers: {
              'Authorization': `Bearer ${this.authState!.accessToken}`
            }
          }
        );
        
        if (analyticsResponse.data && analyticsResponse.data.rows) {
          // Process the data
          viewsByDay = analyticsResponse.data.rows.map((row: any) => ({
            date: row[0],
            views: row[1]
          }));
          
          // Get totals
          watchTimeMinutes = analyticsResponse.data.rows.reduce(
            (sum: number, row: any) => sum + (row[2] || 0), 0
          );
          
          // Get average view duration (in seconds)
          averageViewDuration = analyticsResponse.data.rows.reduce(
            (sum: number, row: any) => sum + (row[3] || 0), 0
          ) / analyticsResponse.data.rows.length;
          
          // Get subscriber changes
          subscribersGained = analyticsResponse.data.rows.reduce(
            (sum: number, row: any) => sum + (row[4] || 0), 0
          );
          
          subscribersLost = analyticsResponse.data.rows.reduce(
            (sum: number, row: any) => sum + (row[5] || 0), 0
          );
        }
        
        // Get demographics and traffic sources
        const demographicsResponse = await axios.get(
          'https://youtubeanalytics.googleapis.com/v2/reports',
          {
            params: {
              dimensions: 'country',
              endDate: endDateString,
              ids: `channel==${channelId}`,
              metrics: 'views',
              sort: '-views',
              startDate: startDateString,
              maxResults: 25
            },
            headers: {
              'Authorization': `Bearer ${this.authState!.accessToken}`
            }
          }
        );
        
        if (demographicsResponse.data && demographicsResponse.data.rows) {
          // Process country data
          demographicsResponse.data.rows.forEach((row: any) => {
            viewsByCountry[row[0]] = row[1];
          });
        }
        
        // Get traffic sources
        const trafficSourceResponse = await axios.get(
          'https://youtubeanalytics.googleapis.com/v2/reports',
          {
            params: {
              dimensions: 'insightTrafficSourceType',
              endDate: endDateString,
              ids: `channel==${channelId}`,
              metrics: 'views',
              sort: '-views',
              startDate: startDateString
            },
            headers: {
              'Authorization': `Bearer ${this.authState!.accessToken}`
            }
          }
        );
        
        if (trafficSourceResponse.data && trafficSourceResponse.data.rows) {
          // Process traffic source data
          trafficSourceResponse.data.rows.forEach((row: any) => {
            viewsByTrafficSource[row[0]] = row[1];
          });
        }
        
        // Get device metrics
        const deviceResponse = await axios.get(
          'https://youtubeanalytics.googleapis.com/v2/reports',
          {
            params: {
              dimensions: 'deviceType',
              endDate: endDateString,
              ids: `channel==${channelId}`,
              metrics: 'views',
              sort: '-views',
              startDate: startDateString
            },
            headers: {
              'Authorization': `Bearer ${this.authState!.accessToken}`
            }
          }
        );
        
        if (deviceResponse.data && deviceResponse.data.rows) {
          // Process device data
          deviceResponse.data.rows.forEach((row: any) => {
            viewsByDevice[row[0]] = row[1];
          });
        }
      } catch (error) {
        console.warn('Error fetching YouTube analytics data:', error);
        // Continue with basic metrics if analytics API fails
      }
      
      // Calculate top posts by views
      const topPosts = [...postsInRange]
        .sort((a, b) => {
          const viewsA = a.analytics?.views || 0;
          const viewsB = b.analytics?.views || 0;
          return viewsB - viewsA;
        })
        .slice(0, 5)
        .map(post => ({
          postId: post.platformPostId,
          engagements: (post.analytics?.likes || 0) + (post.analytics?.comments || 0),
          reach: post.analytics?.views || 0,
          impressions: post.analytics?.views || 0, // Same as reach for YouTube
          url: post.url,
          publishedTime: post.publishedTime,
          title: post.metadata?.title || ''
        }));
      
      // Calculate total engagements for posts in range
      const totalLikes = postsInRange.reduce((sum, post) => sum + (post.analytics?.likes || 0), 0);
      const totalComments = postsInRange.reduce((sum, post) => sum + (post.analytics?.comments || 0), 0);
      const totalViews = postsInRange.reduce((sum, post) => sum + (post.analytics?.views || 0), 0);
      const totalEngagements = totalLikes + totalComments;
      
      // Get the follower count
      const followerCount = parseInt(statistics.subscriberCount) || 0;
      
      return {
        platformType: this.getPlatformType(),
        accountId: channelId,
        period: 'custom',
        startDate,
        endDate,
        engagement: {
          likes: totalLikes,
          comments: totalComments,
          shares: 0, // Not directly available
          totalEngagements,
          engagementRate: totalViews > 0 ? totalEngagements / totalViews : 0
        },
        audience: {
          followers: followerCount,
          followersGained: subscribersGained,
          followersLost: subscribersLost,
          followersNetGrowth: subscribersGained - subscribersLost,
          followersGrowthRate: followerCount > 0 ? (subscribersGained - subscribersLost) / followerCount : 0,
          reach: totalViews,
          impressions: totalViews
        },
        content: {
          topPosts,
          postCount: postsInRange.length,
          averageEngagementPerPost: postsInRange.length > 0 ? totalEngagements / postsInRange.length : 0
        },
        metadata: {
          totalViews: parseInt(statistics.viewCount) || 0,
          totalVideos: parseInt(statistics.videoCount) || 0,
          channelDetails: {
            name: channelData.snippet.title,
            description: channelData.snippet.description,
            thumbnails: channelData.snippet.thumbnails,
            publishedAt: channelData.snippet.publishedAt
          },
          analytics: {
            viewsByDay,
            watchTimeMinutes,
            averageViewDuration,
            viewsByCountry,
            viewsByTrafficSource,
            viewsByDevice
          }
        }
      };
    } catch (error) {
      console.error('Error fetching YouTube metrics:', error);
      throw new Error('Failed to fetch metrics');
    }
  }
  
  /**
   * Test the connection to ensure API credentials are valid
   */
  async testConnection(): Promise<boolean> {
    if (!this.authState?.accessToken) {
      return false;
    }
    
    try {
      await axios.get(
        `${this.baseUrl}/channels`,
        {
          params: {
            part: 'snippet',
            mine: true
          },
          headers: {
            'Authorization': `Bearer ${this.authState.accessToken}`
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error testing YouTube connection:', error);
      return false;
    }
  }
  
  /**
   * Revoke authentication tokens
   */
  async revokeTokens(): Promise<boolean> {
    if (!this.authState?.accessToken) {
      return true; // Nothing to revoke
    }
    
    try {
      // Revoke the access token
      await axios.post(
        `https://oauth2.googleapis.com/revoke?token=${this.authState.accessToken}`
      );
      
      // Clear the auth state
      this.authState = undefined;
      
      return true;
    } catch (error) {
      console.error('Error revoking YouTube tokens:', error);
      return false;
    }
  }
  
  /**
   * Upload media to the platform
   * This method is primarily used for uploading attachments to be used in posts
   */
  async uploadMedia(media: PostAttachment): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get the media data
      let mediaData: Buffer;
      
      if (media.buffer) {
        mediaData = Buffer.from(media.buffer);
      } else if (media.url) {
        // Download the media
        const mediaResponse = await axios.get(media.url, {
          responseType: 'arraybuffer'
        });
        mediaData = Buffer.from(mediaResponse.data);
      } else {
        throw new Error('No media data available');
      }
      
      // Create basic metadata for the media
      const mediaMetadata = {
        snippet: {
          title: media.title || 'Uploaded Media',
        },
        status: {
          privacyStatus: 'private' // Start as private
        }
      };
      
      // Upload the media using the resumable upload protocol
      // Step 1: Initiate the upload
      const initiateResponse = await axios.post(
        `${this.uploadUrl}/videos?uploadType=resumable&part=snippet,status`,
        mediaMetadata,
        {
          headers: {
            'Authorization': `Bearer ${this.authState!.accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Length': mediaData.length,
            'X-Upload-Content-Type': media.mimeType || 'video/mp4'
          }
        }
      );
      
      // Get the resumable upload URL
      const uploadUrl = initiateResponse.headers['location'];
      if (!uploadUrl) {
        throw new Error('Failed to get upload URL from YouTube');
      }
      
      // Step 2: Upload the media data
      const uploadResponse = await axios.put(
        uploadUrl,
        mediaData,
        {
          headers: {
            'Content-Type': media.mimeType || 'video/mp4',
            'Content-Length': mediaData.length
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      const videoId = uploadResponse.data.id;
      return videoId;
    } catch (error) {
      console.error('Error uploading media to YouTube:', error);
      throw new Error(`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 
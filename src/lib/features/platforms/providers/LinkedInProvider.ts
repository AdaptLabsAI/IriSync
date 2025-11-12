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
import { logger } from '@/lib/core/logging/logger';
import { LinkedInRateLimiter, LinkedInTier } from '../utils/linkedin-rate-limiter';
import { 
  LinkedInRestPost,
  LinkedInImage,
  LinkedInVideo,
  LinkedInDocument,
  LinkedInEvent,
  LinkedInLeadForm,
  LinkedInReaction,
  LinkedInApiResponse,
  LinkedInSearchOptions,
  LinkedInEventSearchOptions,
  LinkedInMediaUploadRequest,
  LinkedInMediaUploadResponse,
  LinkedInError,
  LinkedInSocialAction,
  LinkedInComment,
  LinkedInLike,
  LinkedInSocialMetadata,
  LinkedInAnalyticsOptions,
  LinkedInOrganizationalEntityFollowerStatistics,
  LinkedInOrganizationalEntityShareStatistics,
  LinkedInOrganizationPageStatistics,
  LinkedInMemberCreatorPostAnalytics,
  LinkedInMemberFollowersCount,
  LinkedInVideoAnalytics,
  LinkedInOrganization,
  LinkedInOrganizationBrand,
  LinkedInOrganizationAcl,
  LinkedInPerson,
  LinkedInConnection,
  LinkedInPeopleSearchOptions,
  LinkedInPeopleTypeaheadResult,
  LinkedInAdSearchOptions,
  LinkedInAdAccount,
  LinkedInAdCampaign,
  LinkedInAdAnalytics,
  LinkedInIndustry,
  LinkedInGeoLocation,
  LinkedInFunction,
  LinkedInSkill
} from '../models/linkedin-types';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Production-ready LinkedIn API implementation with complete REST API coverage
 * Supports modern content management, events, lead forms, and advanced media handling
 */
export class LinkedInProvider extends PlatformProvider {
  private baseUrl: string;
  private restApiUrl: string;
  private apiVersion: string;
  private useModernRestApi: boolean;
  private rateLimiter: LinkedInRateLimiter;
  
  constructor(config: PlatformProviderConfig, authState?: AuthState, tier: LinkedInTier = 'standard') {
    super(config, authState);
    this.apiVersion = config.apiVersion || 'v2';
    this.baseUrl = config.baseUrl || 'https://api.linkedin.com/v2';
    this.restApiUrl = config.additionalParams?.restApiUrl || 'https://api.linkedin.com/rest';
    this.useModernRestApi = config.additionalParams?.useModernRestApi !== false;
    
    // Initialize LinkedIn-specific rate limiter
    this.rateLimiter = new LinkedInRateLimiter(tier);

    logger.info('LinkedInProvider initialized', {
      hasCredentials: !!(config.clientId && config.clientSecret),
      useModernRestApi: this.useModernRestApi,
      apiVersion: this.apiVersion,
      rateLimitTier: tier
    });
  }
  
  /**
   * Returns the platform type
   */
  getPlatformType(): PlatformType {
    return PlatformType.LINKEDIN;
  }
  
  /**
   * Returns platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return {
      supportsImagePosts: true,
      supportsVideoPosts: true,
      supportsMultipleImages: true,
      supportsScheduling: false, // LinkedIn API doesn't support native scheduling
      supportsThreads: false,
      supportsPolls: true,
      supportsHashtags: true,
      supportsMentions: true,
      maxCharacterCount: 3000,
      maxHashtagCount: 30,
      maxMediaAttachments: 9,
      maxScheduleTimeInDays: 0 // No native scheduling
    };
  }
  
  /**
   * Get authorization headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    if (!this.authState?.accessToken) {
      throw new Error('No access token available');
    }
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.authState.accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0'
    };
    
    // Set appropriate content type based on API
    if (this.useModernRestApi) {
      headers['Content-Type'] = 'application/json';
      headers['LinkedIn-Version'] = process.env.LINKEDIN_REST_API_VERSION || '202401';
    } else {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }
  
  /**
   * Generate OAuth authorization URL for connecting an account
   */
  async getAuthorizationUrl(state: string, codeChallenge?: string): Promise<string> {
    try {
      // Use comprehensive scopes for full functionality
      const scopes = this.config.additionalParams?.scopes || [
        'openid',
        'profile', 
        'email',
      'w_member_social',
      'r_organization_social',
      'w_organization_social',
        'rw_organization_admin',
        'r_events',
        'rw_events'
      ];
      
      logger.info('Generated LinkedIn authorization URL', {
        scopes: scopes.join(' ')
      });
      
      return `https://www.linkedin.com/oauth/v2/authorization?` +
      `client_id=${encodeURIComponent(this.config.clientId)}` +
      `&redirect_uri=${encodeURIComponent(this.config.redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
        `&response_type=code`;
    } catch (error) {
      logger.error('Error generating LinkedIn authorization URL', { error });
      throw new Error('Failed to generate LinkedIn authorization URL');
    }
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<AuthState> {
    try {
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        null,
        {
          params: {
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.config.redirectUri,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const data = response.data;
      
      // Create auth state
      const authState: AuthState = {
        accessToken: data.access_token,
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        additionalData: {
          refreshToken: data.refresh_token,
        tokenType: data.token_type,
        scope: data.scope?.split(' ')
        }
      };
      
      // Update internal auth state
      this.authState = authState;
      
      logger.info('Successfully exchanged LinkedIn code for tokens', {
        hasAccessToken: !!data.access_token,
        expiresIn: data.expires_in
      });
      
      return authState;
    } catch (error: any) {
      logger.error('Error exchanging LinkedIn code for token', { error: error.response?.data || error.message });
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Refresh the access token if expired
   */
  async refreshAccessToken(): Promise<AuthState> {
    if (!this.authState?.additionalData?.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        null,
        {
          params: {
            grant_type: 'refresh_token',
            refresh_token: this.authState.additionalData.refreshToken,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const data = response.data;
      
      // Update auth state
      const newAuthState: AuthState = {
        ...this.authState,
        accessToken: data.access_token,
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        additionalData: {
          ...this.authState.additionalData,
          refreshToken: data.refresh_token || this.authState.additionalData.refreshToken
        }
      };
      
      this.authState = newAuthState;
      
      logger.info('Successfully refreshed LinkedIn access token');
      return newAuthState;
    } catch (error: any) {
      logger.error('Error refreshing LinkedIn access token', { error: error.response?.data || error.message });
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
   * Make an authenticated API request with rate limiting
   */
  private async makeAuthenticatedRequest(url: string, method: string = 'GET', data?: any, endpointKey?: string) {
    // Check if tokens need refreshing
    if (this.authState?.expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      if (this.authState.expiresAt <= now + 300) { // Refresh 5 minutes before expiry
        try {
          await this.refreshAccessToken();
        } catch (error) {
          logger.warn('Failed to refresh LinkedIn token, continuing with current token');
        }
      }
    }
    
    try {
      return await axios({
        method,
        url,
        data,
        headers: this.getAuthHeaders()
      });
    } catch (error: any) {
      logger.error('LinkedIn API request failed', {
        url,
        method,
        status: error.response?.status,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }
  
  /**
   * Execute a rate-limited request
   */
  private async executeRateLimitedRequest<T>(
    endpointKey: string, 
    requestFn: () => Promise<T>, 
    retryOnLimit = true
  ): Promise<T> {
    // Check if we can make the request
    if (!this.rateLimiter.canMakeRequest(endpointKey)) {
      const timeUntilReset = this.rateLimiter.getTimeUntilReset(endpointKey);
      const usage = this.rateLimiter.getCurrentUsage(endpointKey);
      
      if (retryOnLimit && timeUntilReset > 0 && timeUntilReset < 60 * 60 * 1000) { // If reset is within 1 hour
        logger.info('LinkedIn rate limit hit, waiting for reset', {
          endpointKey,
          timeUntilReset,
          usage
        });
        
        await new Promise(resolve => setTimeout(resolve, Math.min(timeUntilReset + 1000, 60000))); // Wait max 1 minute
        return this.executeRateLimitedRequest(endpointKey, requestFn, false); // Don't retry again
      }
      
      throw new Error(`LinkedIn API rate limit exceeded for ${endpointKey}. Usage: ${JSON.stringify(usage)}`);
    }
    
    try {
      // Execute the request
      const result = await requestFn();
      
      // Record successful request
      this.rateLimiter.recordRequest(endpointKey);
      
      return result;
    } catch (error: any) {
      // Check if it's a rate limit error from LinkedIn's side
      if (error.response?.status === 429) {
        logger.warn('LinkedIn API returned 429 rate limit error', {
          endpointKey,
          headers: error.response.headers
        });
        
        // Still record the request attempt
        this.rateLimiter.recordRequest(endpointKey);
      }
      
      throw error;
    }
  }

  // ===================================================================
  // CORE PROFILE & AUTHENTICATION
  // ===================================================================

  /**
   * Fetch account details for the authenticated user
   */
  async getAccountDetails(): Promise<SocialAccount> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const profileResponse = await this.executeRateLimitedRequest('GET_v2_me', () =>
        this.makeAuthenticatedRequest(`${this.baseUrl}/me`, 'GET')
      );
      
      const profileData = profileResponse.data;
      
      // Get profile picture with projection
      const profilePictureResponse = await this.executeRateLimitedRequest('GET_v2_me', () =>
        this.makeAuthenticatedRequest(
          `${this.baseUrl}/me?projection=(id,profilePicture(displayImage~:playableStreams))`,
          'GET'
        )
      );
      
      let profilePictureUrl = '';
      if (profilePictureResponse.data.profilePicture?.['displayImage~']?.elements) {
        const elements = profilePictureResponse.data.profilePicture['displayImage~'].elements;
        const highestResImage = elements.sort((a: any, b: any) => {
          const aWidth = a.data?.['com.linkedin.digitalmedia.mediaartifact.StillImage']?.storageSize?.width || 0;
          const bWidth = b.data?.['com.linkedin.digitalmedia.mediaartifact.StillImage']?.storageSize?.width || 0;
          return bWidth - aWidth;
        })[0];
        
        if (highestResImage?.identifiers?.[0]) {
          profilePictureUrl = highestResImage.identifiers[0].identifier;
        }
      }
      
      // Get network size (connections)
      let connectionCount = 0;
      try {
        const networkResponse = await this.executeRateLimitedRequest('GET_v2_me', () =>
          this.makeAuthenticatedRequest(
            `${this.baseUrl}/networkSizes/urn:li:person:${profileData.id}?edgeType=CompanyFollowedByMember`,
            'GET'
          )
        );
        connectionCount = networkResponse.data.firstDegreeSize || 0;
      } catch (error) {
        logger.warn('Could not fetch LinkedIn network size');
      }
      
      return {
        id: uuidv4(),
        platformId: profileData.id,
        platformType: this.getPlatformType(),
        username: profileData.vanityName || `${profileData.localizedFirstName}.${profileData.localizedLastName}`,
        displayName: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
        profilePictureUrl,
        profileUrl: `https://www.linkedin.com/in/${profileData.vanityName || profileData.id}`,
        bio: profileData.localizedHeadline || '',
        isBusinessAccount: false,
        isConnected: true,
        hasValidCredentials: true,
        accountType: 'personal',
        followerCount: 0, // LinkedIn doesn't provide follower count for personal profiles
        followingCount: connectionCount,
        postCount: 0, // Would require separate API call
        lastConnected: new Date(),
        metadata: {
          headline: profileData.localizedHeadline,
          firstName: profileData.localizedFirstName,
          lastName: profileData.localizedLastName,
          vanityName: profileData.vanityName,
          industryName: profileData.industryName
        }
      };
    } catch (error) {
      logger.error('Error fetching LinkedIn account details', { error });
      throw new Error('Failed to fetch LinkedIn account details');
    }
  }

  // ===================================================================
  // MODERN CONTENT MANAGEMENT (/rest/posts)
  // ===================================================================

  /**
   * Create a post using the modern REST API
   */
  async createPost(post: PlatformPost): Promise<PostResponse> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Get user profile for author URN
      const accountDetails = await this.getAccountDetails();
      const authorUrn = `urn:li:person:${accountDetails.platformId}`;
      
      let mediaUrns: string[] = [];
      
      // Upload media if present
      if (post.attachments && post.attachments.length > 0) {
        const uploadPromises = post.attachments.map(attachment => 
          this.uploadMediaModern(attachment, authorUrn)
        );
        mediaUrns = await Promise.all(uploadPromises);
      }
      
      // Create the post data for modern REST API
      const postData: Partial<LinkedInRestPost> = {
        author: authorUrn,
        commentary: post.content,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED'
        },
        lifecycleState: 'PUBLISHED'
      };
      
      // Add media if available
      if (mediaUrns.length > 0) {
        postData.content = {
          media: {
            id: mediaUrns[0], // Use first media item
            title: post.attachments?.[0]?.altText
          }
        };
      }
      
      const url = this.useModernRestApi ? `${this.restApiUrl}/posts` : `${this.baseUrl}/ugcPosts`;
      
      const response = await this.executeRateLimitedRequest(
        this.useModernRestApi ? 'CREATE_rest_posts' : 'CREATE_v2_ugcPosts',
        () => this.makeAuthenticatedRequest(url, 'POST', postData)
      );
      
      const postId = response.data.id || response.data.data?.id;
      
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: postId,
        status: 'published',
        publishedTime: new Date(),
        url: `https://www.linkedin.com/feed/update/urn:li:activity:${postId}`,
        analytics: {
          likes: 0,
          comments: 0,
          shares: 0
        },
        metadata: {
          content: post.content,
          mediaCount: mediaUrns.length,
          useModernApi: this.useModernRestApi
        }
      };
    } catch (error) {
      logger.error('Error creating LinkedIn post', { error });
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
   * Update/edit an existing post (modern REST API only)
   */
  async updatePost(postId: string, updates: Partial<PlatformPost>): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    if (!this.useModernRestApi) {
      throw new Error('Post editing requires modern REST API');
    }
    
    try {
      const updateData: any = {};
      
      if (updates.content) {
        updateData.commentary = updates.content;
      }
      
      const url = `${this.restApiUrl}/posts/${encodeURIComponent(postId)}`;
      
      await this.executeRateLimitedRequest('UPDATE_rest_posts', () =>
        this.makeAuthenticatedRequest(url, 'PATCH', updateData)
      );
      
      logger.info('Successfully updated LinkedIn post', { postId });
      return true;
    } catch (error) {
      logger.error('Error updating LinkedIn post', { error, postId });
      return false;
    }
  }
  
  /**
   * Get a specific post details
   */
  async getPost(postId: string): Promise<LinkedInRestPost | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const url = this.useModernRestApi 
        ? `${this.restApiUrl}/posts/${encodeURIComponent(postId)}`
        : `${this.baseUrl}/ugcPosts/${encodeURIComponent(postId)}`;
      
      const response = await this.executeRateLimitedRequest(
        this.useModernRestApi ? 'GET_rest_posts' : 'GET_v2_ugcPosts',
        () => this.makeAuthenticatedRequest(url, 'GET')
      );
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn post', { error, postId });
      return null;
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
      // Ensure URN format
      let formattedPostId = postId;
      if (!postId.startsWith('urn:li:')) {
        formattedPostId = `urn:li:share:${postId}`;
      }
      
      const url = this.useModernRestApi
        ? `${this.restApiUrl}/posts/${encodeURIComponent(formattedPostId)}`
        : `${this.baseUrl}/ugcPosts/${encodeURIComponent(formattedPostId)}`;
      
      await this.executeRateLimitedRequest(
        this.useModernRestApi ? 'DELETE_rest_posts' : 'DELETE_v2_ugcPosts',
        () => this.makeAuthenticatedRequest(url, 'DELETE')
      );
      
      return true;
    } catch (error) {
      logger.error('Error deleting LinkedIn post', { error, postId });
      return false;
    }
  }

  // ===================================================================
  // MODERN MEDIA MANAGEMENT (/rest/images, /rest/videos, /rest/documents)
  // ===================================================================
  
  /**
   * Upload media using modern REST API
   */
  async uploadMediaModern(media: PostAttachment, ownerUrn: string): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Determine media type and endpoint
      let endpoint: string;
      let endpointKey: string;
      
      if (media.type === AttachmentType.IMAGE) {
        endpoint = `${this.restApiUrl}/images?action=initializeUpload`;
        endpointKey = 'ACTION_rest_images_initializeUpload';
      } else if (media.type === AttachmentType.VIDEO) {
        endpoint = `${this.restApiUrl}/videos?action=initializeUpload`;
        endpointKey = 'ACTION_rest_videos_initializeUpload';
      } else {
        endpoint = `${this.restApiUrl}/documents?action=initializeUpload`;
        endpointKey = 'ACTION_rest_documents_initializeUpload';
      }
      
      // Get media data
      let mediaData: Buffer;
      
      if (media.buffer) {
        mediaData = media.buffer;
      } else if (media.url) {
        const response = await axios.get(media.url, { responseType: 'arraybuffer' });
        mediaData = Buffer.from(response.data);
      } else {
        throw new Error('No media data available for upload');
      }
      
      // Step 1: Initialize upload
      const initRequest: LinkedInMediaUploadRequest = {
        initializeUploadRequest: {
          owner: ownerUrn,
          fileSizeBytes: mediaData.length
        }
      };
      
      const initResponse = await this.executeRateLimitedRequest(endpointKey, () =>
        this.makeAuthenticatedRequest(endpoint, 'POST', initRequest)
      );
      
      const uploadData: LinkedInMediaUploadResponse = initResponse.data;
      
      // Step 2: Upload the media binary data
      if (uploadData.value?.uploadInstructions) {
        for (const instruction of uploadData.value.uploadInstructions) {
          const chunk = mediaData.slice(instruction.firstByte, instruction.lastByte + 1);
          
          await axios.put(instruction.uploadUrl, chunk, {
              headers: {
              'Content-Type': 'application/octet-stream'
            }
          });
        }
      }
      
      // Step 3: Finalize upload for videos
      if (media.type === AttachmentType.VIDEO && uploadData.value?.digitalmediaAsset) {
        const finalizeEndpoint = `${this.restApiUrl}/videos?action=finalizeUpload`;
        const finalizeRequest = {
          finalizeUploadRequest: {
            video: uploadData.value.digitalmediaAsset,
            uploadCertificate: uploadData.value.asset
          }
        };
        
        await this.executeRateLimitedRequest('ACTION_rest_videos_finalizeUpload', () =>
          this.makeAuthenticatedRequest(finalizeEndpoint, 'POST', finalizeRequest)
        );
      }
      
      const mediaUrn = uploadData.value?.digitalmediaAsset || uploadData.value?.asset || '';
      
      logger.info('Successfully uploaded media to LinkedIn', {
        mediaType: media.type,
        size: mediaData.length,
        mediaUrn
      });
      
      return mediaUrn;
        } catch (error) {
      logger.error('Error uploading media to LinkedIn', { error });
      throw new Error(`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get media details
   */
  async getMedia(mediaId: string, mediaType: 'image' | 'video' | 'document'): Promise<LinkedInImage | LinkedInVideo | LinkedInDocument | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const endpoint = `${this.restApiUrl}/${mediaType}s/${encodeURIComponent(mediaId)}`;
      const endpointKey = `GET_rest_${mediaType}s`;
      
      const response = await this.executeRateLimitedRequest(endpointKey, () =>
        this.makeAuthenticatedRequest(endpoint, 'GET')
      );
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn media', { error, mediaId, mediaType });
      return null;
    }
  }

  // ===================================================================
  // EVENTS MANAGEMENT (/rest/events)
  // ===================================================================

  /**
   * Create a LinkedIn event
   */
  async createEvent(eventData: Partial<LinkedInEvent>): Promise<string | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const accountDetails = await this.getAccountDetails();
      const organizerUrn = `urn:li:person:${accountDetails.platformId}`;
      
      const event: Partial<LinkedInEvent> = {
        ...eventData,
        organizer: organizerUrn,
        status: eventData.status || 'DRAFT'
      };
      
      const response = await this.executeRateLimitedRequest('CREATE_rest_events', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/events`, 'POST', event)
      );
      
      const eventId = response.data.id;
      
      logger.info('Successfully created LinkedIn event', { eventId });
      return eventId;
    } catch (error) {
      logger.error('Error creating LinkedIn event', { error });
      return null;
    }
  }
  
  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, updates: Partial<LinkedInEvent>): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const url = `${this.restApiUrl}/events/${encodeURIComponent(eventId)}`;
      
      await this.executeRateLimitedRequest('UPDATE_rest_events', () =>
        this.makeAuthenticatedRequest(url, 'PATCH', updates)
      );
      
      logger.info('Successfully updated LinkedIn event', { eventId });
      return true;
    } catch (error) {
      logger.error('Error updating LinkedIn event', { error, eventId });
      return false;
    }
  }
  
  /**
   * Get event details
   */
  async getEvent(eventId: string): Promise<LinkedInEvent | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await this.executeRateLimitedRequest('GET_rest_events', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/events/${encodeURIComponent(eventId)}`, 'GET')
      );
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn event', { error, eventId });
      return null;
    }
  }
  
  /**
   * Get events by organizer
   */
  async getEventsByOrganizer(organizerUrn?: string, options?: LinkedInEventSearchOptions): Promise<LinkedInEvent[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const accountDetails = await this.getAccountDetails();
      const organizer = organizerUrn || `urn:li:person:${accountDetails.platformId}`;
      
      const params = new URLSearchParams({
        q: 'eventsByOrganizer',
        organizer,
        count: String(options?.count || 25)
      });
      
      if (options?.start) {
        params.set('start', String(options.start));
      }
      
      const response = await this.executeRateLimitedRequest('FINDER_rest_events_eventsByOrganizer', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/events?${params.toString()}`, 'GET')
      );
      
      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn events by organizer', { error });
      return [];
    }
  }

  // ===================================================================
  // LEAD FORMS MANAGEMENT (/rest/leadForms)
  // ===================================================================

  /**
   * Create a lead generation form
   */
  async createLeadForm(formData: Partial<LinkedInLeadForm>): Promise<string | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const accountDetails = await this.getAccountDetails();
      const accountUrn = `urn:li:person:${accountDetails.platformId}`;
      
      const leadForm: Partial<LinkedInLeadForm> = {
        ...formData,
        account: accountUrn,
        status: formData.status || 'ACTIVE'
      };
      
      const response = await this.executeRateLimitedRequest('CREATE_rest_leadForms', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/leadForms`, 'POST', leadForm)
      );
      
      const formId = response.data.id;
      
      logger.info('Successfully created LinkedIn lead form', { formId });
      return formId;
    } catch (error) {
      logger.error('Error creating LinkedIn lead form', { error });
      return null;
    }
  }
  
  /**
   * Get lead form details
   */
  async getLeadForm(formId: string): Promise<LinkedInLeadForm | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await this.executeRateLimitedRequest('GET_rest_leadForms', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/leadForms/${encodeURIComponent(formId)}`, 'GET')
      );
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn lead form', { error, formId });
      return null;
    }
  }
  
  /**
   * Get lead forms by owner
   */
  async getLeadFormsByOwner(ownerUrn?: string): Promise<LinkedInLeadForm[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const accountDetails = await this.getAccountDetails();
      const owner = ownerUrn || `urn:li:person:${accountDetails.platformId}`;
      
      const params = new URLSearchParams({
        q: 'owner',
        owner
      });
      
      const response = await this.executeRateLimitedRequest('FINDER_rest_leadForms_owner', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/leadForms?${params.toString()}`, 'GET')
      );
      
      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn lead forms by owner', { error });
      return [];
    }
  }

  // ===================================================================
  // REACTIONS MANAGEMENT (/rest/reactions)
  // ===================================================================

  /**
   * Add reaction to a post
   */
  async addReaction(entityUrn: string, reactionType: string = 'LIKE'): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const accountDetails = await this.getAccountDetails();
      const actorUrn = `urn:li:person:${accountDetails.platformId}`;
      
      const reactionData = {
        actor: actorUrn,
        entity: entityUrn,
        reactionType
      };
      
      await this.executeRateLimitedRequest('CREATE_rest_reactions', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/reactions`, 'POST', reactionData)
      );
      
      logger.info('Successfully added LinkedIn reaction', { entityUrn, reactionType });
      return true;
    } catch (error) {
      logger.error('Error adding LinkedIn reaction', { error, entityUrn });
      return false;
    }
  }
  
  /**
   * Remove reaction from a post
   */
  async removeReaction(reactionId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      await this.executeRateLimitedRequest('DELETE_rest_reactions', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/reactions/${encodeURIComponent(reactionId)}`, 'DELETE')
      );
      
      logger.info('Successfully removed LinkedIn reaction', { reactionId });
      return true;
    } catch (error) {
      logger.error('Error removing LinkedIn reaction', { error, reactionId });
      return false;
    }
  }
  
  /**
   * Get reactions for an entity
   */
  async getReactions(entityUrn: string): Promise<LinkedInReaction[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      const params = new URLSearchParams({
        q: 'entity',
        entity: entityUrn
      });
      
      const response = await this.executeRateLimitedRequest('FINDER_rest_reactions_entity', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/reactions?${params.toString()}`, 'GET')
      );
      
      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn reactions', { error, entityUrn });
      return [];
    }
  }

  // ===================================================================
  // LEGACY METHODS (for backward compatibility)
  // ===================================================================

  /**
   * Schedule a post for later publication
   */
  async schedulePost(post: PlatformPost, schedule: PostSchedule): Promise<PostResponse> {
    try {
      const scheduledId = uuidv4();
      
      const response = await fetch('/api/platforms/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduledId,
          platformType: this.getPlatformType(),
          content: post.content,
          scheduledTime: schedule.publishAt.toISOString(),
          timezone: schedule.timezone
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to schedule post: ${response.statusText}`);
      }
      
      return {
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: scheduledId,
        status: 'scheduled',
        scheduledTime: schedule.publishAt,
        metadata: {
          content: post.content,
          scheduledTimezone: schedule.timezone
        }
      };
    } catch (error) {
      logger.error('Error scheduling LinkedIn post', { error });
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
   * Get a list of posts for the account
   */
  async getPosts(limit?: number, before?: string, after?: string): Promise<PostResponse[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Implementation would depend on the specific endpoint used
      // This is a simplified version for compatibility
      const accountDetails = await this.getAccountDetails();
      const authorUrn = `urn:li:person:${accountDetails.platformId}`;
      
      // Use legacy endpoint for now
      const params: any = {
        q: 'authors',
        authors: `List(${authorUrn})`,
        count: limit || 10
      };
      
      if (before) params.before = before;
      if (after) params.after = after;
      
      const response = await this.executeRateLimitedRequest('GET_v2_ugcPosts', () => {
        const url = `${this.baseUrl}/ugcPosts?${new URLSearchParams(params).toString()}`;
        return this.makeAuthenticatedRequest(url, 'GET');
      });
      
      const posts = response.data.elements || [];
      
      return posts.map((post: any) => ({
        id: uuidv4(),
        platformType: this.getPlatformType(),
        platformPostId: post.id,
        status: 'published',
        publishedTime: new Date(post.created?.time || Date.now()),
        url: `https://www.linkedin.com/feed/update/urn:li:activity:${post.id}`,
        analytics: {
          likes: 0,
          comments: 0,
          shares: 0
        },
        metadata: {
          content: post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || ''
        }
      }));
    } catch (error) {
      logger.error('Error fetching LinkedIn posts', { error });
      throw new Error(`Failed to fetch posts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload media (legacy method)
   */
  async uploadMedia(media: PostAttachment): Promise<string> {
    const accountDetails = await this.getAccountDetails();
    const ownerUrn = `urn:li:person:${accountDetails.platformId}`;
    
    if (this.useModernRestApi) {
      return this.uploadMediaModern(media, ownerUrn);
    } else {
      // Legacy upload implementation
      throw new Error('Legacy media upload not implemented - please use modern REST API');
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
      // Basic metrics implementation
      const posts = await this.getPosts(30);
      
      const totalLikes = posts.reduce((sum, post) => sum + (post.analytics?.likes || 0), 0);
      const totalComments = posts.reduce((sum, post) => sum + (post.analytics?.comments || 0), 0);
      const totalShares = posts.reduce((sum, post) => sum + (post.analytics?.shares || 0), 0);
      const totalEngagements = totalLikes + totalComments + totalShares;
      
      return {
        platformType: this.getPlatformType(),
        accountId: '',
        period: 'custom',
        startDate,
        endDate,
        engagement: {
          likes: totalLikes,
          comments: totalComments,
          shares: totalShares,
          totalEngagements,
          engagementRate: posts.length > 0 ? totalEngagements / posts.length : 0
        },
        audience: {
          followers: 0,
          followersGained: 0,
          followersLost: 0,
          followersNetGrowth: 0,
          followersGrowthRate: 0,
          reach: 0,
          impressions: 0
        },
        content: {
          topPosts: [],
          postCount: posts.length,
          averageEngagementPerPost: posts.length > 0 ? totalEngagements / posts.length : 0
        }
      };
    } catch (error) {
      logger.error('Error fetching LinkedIn metrics', { error });
      throw new Error(`Failed to fetch metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Test the connection to ensure API credentials are valid
   */
  async testConnection(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }
    
    try {
      await this.getAccountDetails();
      return true;
    } catch (error) {
      logger.error('Error testing LinkedIn connection', { error });
      return false;
    }
  }
  
  /**
   * Revoke authentication tokens
   */
  async revokeTokens(): Promise<boolean> {
    if (!this.authState?.accessToken) {
      return true;
    }
    
    try {
      await axios.post(
        'https://www.linkedin.com/oauth/v2/revoke',
        new URLSearchParams({
          token: this.authState.accessToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      this.authState = undefined;
      
      logger.info('Successfully revoked LinkedIn tokens');
      return true;
    } catch (error) {
      logger.error('Error revoking LinkedIn tokens', { error });
      this.authState = undefined; // Clear locally even if API call fails
      return false;
    }
  }

  /**
   * Update the LinkedIn API tier for rate limiting
   */
  updateApiTier(tier: LinkedInTier): void {
    this.rateLimiter.updateTier(tier);
    logger.info('LinkedIn API tier updated', { tier });
  }

  /**
   * Get rate limiting status for monitoring
   */
  getRateLimitStatus(): Record<string, any> {
    return this.rateLimiter.getStatus();
  }

  // ===================================================================
  // SOCIAL INBOX & ENGAGEMENT (/rest/socialActions, /rest/socialMetadata)
  // ===================================================================

  /**
   * Get social actions for an entity (comments, likes summary)
   */
  async getSocialActions(targetUrn: string): Promise<LinkedInSocialAction | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.executeRateLimitedRequest('GET_rest_socialActions', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/socialActions/${encodeURIComponent(targetUrn)}`, 'GET')
      );

      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn social actions', { error, targetUrn });
      return null;
    }
  }

  /**
   * Get comments for a post or entity
   */
  async getComments(targetUrn: string, count: number = 25, start: number = 0): Promise<LinkedInComment[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({
        count: String(count),
        start: String(start)
      });

      const response = await this.executeRateLimitedRequest('GET_rest_socialActions_comments', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/socialActions/${encodeURIComponent(targetUrn)}/comments?${params.toString()}`,
          'GET'
        )
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn comments', { error, targetUrn });
      return [];
    }
  }

  /**
   * Create a comment on a post
   */
  async createComment(targetUrn: string, message: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const accountDetails = await this.getAccountDetails();
      const actorUrn = `urn:li:person:${accountDetails.platformId}`;

      const commentData = {
        actor: actorUrn,
        object: targetUrn,
        message: {
          text: message
        }
      };

      await this.executeRateLimitedRequest('CREATE_rest_socialActions_comments', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/socialActions/${encodeURIComponent(targetUrn)}/comments`,
          'POST',
          commentData
        )
      );

      logger.info('Successfully created LinkedIn comment', { targetUrn });
      return true;
    } catch (error) {
      logger.error('Error creating LinkedIn comment', { error, targetUrn });
      return false;
    }
  }

  /**
   * Update a comment
   */
  async updateComment(targetUrn: string, commentId: string, message: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const updateData = {
        message: {
          text: message
        }
      };

      await this.executeRateLimitedRequest('UPDATE_rest_socialActions_comments', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/socialActions/${encodeURIComponent(targetUrn)}/comments/${encodeURIComponent(commentId)}`,
          'PATCH',
          updateData
        )
      );

      logger.info('Successfully updated LinkedIn comment', { targetUrn, commentId });
      return true;
    } catch (error) {
      logger.error('Error updating LinkedIn comment', { error, targetUrn, commentId });
      return false;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(targetUrn: string, commentId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      await this.executeRateLimitedRequest('DELETE_rest_socialActions_comments', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/socialActions/${encodeURIComponent(targetUrn)}/comments/${encodeURIComponent(commentId)}`,
          'DELETE'
        )
      );

      logger.info('Successfully deleted LinkedIn comment', { targetUrn, commentId });
      return true;
    } catch (error) {
      logger.error('Error deleting LinkedIn comment', { error, targetUrn, commentId });
      return false;
    }
  }

  /**
   * Add like to a post
   */
  async addLike(targetUrn: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const accountDetails = await this.getAccountDetails();
      const likerUrn = `urn:li:person:${accountDetails.platformId}`;

      await this.executeRateLimitedRequest('CREATE_rest_socialActions_likes', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/socialActions/${encodeURIComponent(targetUrn)}/likes`,
          'POST',
          { liker: likerUrn }
        )
      );

      logger.info('Successfully added LinkedIn like', { targetUrn });
      return true;
    } catch (error) {
      logger.error('Error adding LinkedIn like', { error, targetUrn });
      return false;
    }
  }

  /**
   * Remove like from a post
   */
  async removeLike(targetUrn: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const accountDetails = await this.getAccountDetails();
      const likerUrn = `urn:li:person:${accountDetails.platformId}`;

      await this.executeRateLimitedRequest('DELETE_rest_socialActions_likes', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/socialActions/${encodeURIComponent(targetUrn)}/likes/${encodeURIComponent(likerUrn)}`,
          'DELETE'
        )
      );

      logger.info('Successfully removed LinkedIn like', { targetUrn });
      return true;
    } catch (error) {
      logger.error('Error removing LinkedIn like', { error, targetUrn });
      return false;
    }
  }

  /**
   * Get likes for a post
   */
  async getLikes(targetUrn: string, count: number = 25, start: number = 0): Promise<LinkedInLike[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({
        count: String(count),
        start: String(start)
      });

      const response = await this.executeRateLimitedRequest('GET_rest_socialActions_likes', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/socialActions/${encodeURIComponent(targetUrn)}/likes?${params.toString()}`,
          'GET'
        )
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn likes', { error, targetUrn });
      return [];
    }
  }

  /**
   * Get social metadata for an entity (engagement stats)
   */
  async getSocialMetadata(entityUrn: string): Promise<LinkedInSocialMetadata | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.executeRateLimitedRequest('GET_rest_socialMetadata', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/socialMetadata/${encodeURIComponent(entityUrn)}`, 'GET')
      );

      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn social metadata', { error, entityUrn });
      return null;
    }
  }

  // ===================================================================
  // ADVANCED ANALYTICS (/rest/organizationalEntity*, /rest/memberCreator*)
  // ===================================================================

  /**
   * Get follower statistics for an organization
   */
  async getOrganizationFollowerStatistics(
    organizationUrn: string, 
    options: LinkedInAnalyticsOptions
  ): Promise<LinkedInOrganizationalEntityFollowerStatistics | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({
        q: 'organizationalEntity',
        organizationalEntity: organizationUrn,
        'timeIntervals.timeGranularityType': options.timeGranularity || 'DAY',
        'timeIntervals.timeRange.start': new Date(options.startDate).getTime().toString(),
        'timeIntervals.timeRange.end': new Date(options.endDate).getTime().toString()
      });

      if (options.count) params.set('count', String(options.count));
      if (options.start) params.set('start', String(options.start));

      const response = await this.executeRateLimitedRequest('FINDER_rest_organizationalEntityFollowerStatistics', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/organizationalEntityFollowerStatistics?${params.toString()}`,
          'GET'
        )
      );

      return response.data.elements?.[0] || null;
    } catch (error) {
      logger.error('Error fetching LinkedIn organization follower statistics', { error, organizationUrn });
      return null;
    }
  }

  /**
   * Get share statistics for an organization
   */
  async getOrganizationShareStatistics(
    organizationUrn: string,
    options: LinkedInAnalyticsOptions
  ): Promise<LinkedInOrganizationalEntityShareStatistics | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({
        q: 'organizationalEntity',
        organizationalEntity: organizationUrn,
        'timeIntervals.timeGranularityType': options.timeGranularity || 'DAY',
        'timeIntervals.timeRange.start': new Date(options.startDate).getTime().toString(),
        'timeIntervals.timeRange.end': new Date(options.endDate).getTime().toString()
      });

      if (options.count) params.set('count', String(options.count));
      if (options.start) params.set('start', String(options.start));

      const response = await this.executeRateLimitedRequest('FINDER_rest_organizationalEntityShareStatistics', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/organizationalEntityShareStatistics?${params.toString()}`,
          'GET'
        )
      );

      return response.data.elements?.[0] || null;
    } catch (error) {
      logger.error('Error fetching LinkedIn organization share statistics', { error, organizationUrn });
      return null;
    }
  }

  /**
   * Get page statistics for an organization
   */
  async getOrganizationPageStatistics(
    organizationUrn: string,
    options: LinkedInAnalyticsOptions
  ): Promise<LinkedInOrganizationPageStatistics | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({
        q: 'organization',
        organization: organizationUrn,
        'timeIntervals.timeGranularityType': options.timeGranularity || 'DAY',
        'timeIntervals.timeRange.start': new Date(options.startDate).getTime().toString(),
        'timeIntervals.timeRange.end': new Date(options.endDate).getTime().toString()
      });

      const response = await this.executeRateLimitedRequest('FINDER_rest_organizationPageStatistics', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/organizationPageStatistics?${params.toString()}`,
          'GET'
        )
      );

      return response.data.elements?.[0] || null;
    } catch (error) {
      logger.error('Error fetching LinkedIn organization page statistics', { error, organizationUrn });
      return null;
    }
  }

  /**
   * Get member creator post analytics
   */
  async getMemberPostAnalytics(
    entityUrn?: string,
    options?: LinkedInAnalyticsOptions
  ): Promise<LinkedInMemberCreatorPostAnalytics | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams();
      
      if (entityUrn) {
        params.set('q', 'entity');
        params.set('entity', entityUrn);
      } else {
        params.set('q', 'me');
      }

      if (options?.startDate && options?.endDate) {
        params.set('timeIntervals.timeGranularityType', options.timeGranularity || 'DAY');
        params.set('timeIntervals.timeRange.start', new Date(options.startDate).getTime().toString());
        params.set('timeIntervals.timeRange.end', new Date(options.endDate).getTime().toString());
      }

      const response = await this.executeRateLimitedRequest('FINDER_rest_memberCreatorPostAnalytics', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/memberCreatorPostAnalytics?${params.toString()}`,
          'GET'
        )
      );

      return response.data.elements?.[0] || null;
    } catch (error) {
      logger.error('Error fetching LinkedIn member post analytics', { error, entityUrn });
      return null;
    }
  }

  /**
   * Get member follower count analytics
   */
  async getMemberFollowersCount(options?: LinkedInAnalyticsOptions): Promise<LinkedInMemberFollowersCount | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({ q: 'me' });

      if (options?.startDate && options?.endDate) {
        params.set('timeIntervals.timeGranularityType', options.timeGranularity || 'DAY');
        params.set('timeIntervals.timeRange.start', new Date(options.startDate).getTime().toString());
        params.set('timeIntervals.timeRange.end', new Date(options.endDate).getTime().toString());
      }

      const response = await this.executeRateLimitedRequest('FINDER_rest_memberFollowersCount', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/memberFollowersCount?${params.toString()}`,
          'GET'
        )
      );

      return response.data.elements?.[0] || null;
    } catch (error) {
      logger.error('Error fetching LinkedIn member followers count', { error });
      return null;
    }
  }

  /**
   * Get video analytics for an entity
   */
  async getVideoAnalytics(
    entityUrn: string,
    options: LinkedInAnalyticsOptions
  ): Promise<LinkedInVideoAnalytics | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({
        q: 'entity',
        entity: entityUrn,
        'timeIntervals.timeGranularityType': options.timeGranularity || 'DAY',
        'timeIntervals.timeRange.start': new Date(options.startDate).getTime().toString(),
        'timeIntervals.timeRange.end': new Date(options.endDate).getTime().toString()
      });

      const response = await this.executeRateLimitedRequest('FINDER_rest_videoAnalytics', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/videoAnalytics?${params.toString()}`,
          'GET'
        )
      );

      return response.data.elements?.[0] || null;
    } catch (error) {
      logger.error('Error fetching LinkedIn video analytics', { error, entityUrn });
      return null;
    }
  }

  // ===================================================================
  // ORGANIZATION MANAGEMENT (/rest/organizations, /rest/organizationBrands)
  // ===================================================================

  /**
   * Get organization details
   */
  async getOrganization(organizationId: string): Promise<LinkedInOrganization | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.executeRateLimitedRequest('GET_rest_organizations', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/organizations/${encodeURIComponent(organizationId)}`, 'GET')
      );

      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn organization', { error, organizationId });
      return null;
    }
  }

  /**
   * Search organizations by vanity name
   */
  async searchOrganizationsByVanityName(vanityName: string): Promise<LinkedInOrganization[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({
        q: 'vanityName',
        vanityName
      });

      const response = await this.executeRateLimitedRequest('FINDER_rest_organizations_vanityName', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/organizations?${params.toString()}`, 'GET')
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error searching LinkedIn organizations by vanity name', { error, vanityName });
      return [];
    }
  }

  /**
   * Get organization brands
   */
  async getOrganizationBrands(organizationUrn: string): Promise<LinkedInOrganizationBrand[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({
        q: 'parentOrganization',
        parentOrganization: organizationUrn
      });

      const response = await this.executeRateLimitedRequest('FINDER_rest_organizationBrands_parentOrganization', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/organizationBrands?${params.toString()}`, 'GET')
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn organization brands', { error, organizationUrn });
      return [];
    }
  }

  /**
   * Get organization access control list (ACLs)
   */
  async getOrganizationAcls(organizationUrn: string): Promise<LinkedInOrganizationAcl[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({
        q: 'organization',
        organization: organizationUrn
      });

      const response = await this.executeRateLimitedRequest('FINDER_rest_organizationAcls_organization', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/organizationAcls?${params.toString()}`, 'GET')
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn organization ACLs', { error, organizationUrn });
      return [];
    }
  }

  // ===================================================================
  // PEOPLE & CONNECTIONS (/rest/people, /rest/connections)
  // ===================================================================

  /**
   * Get person details
   */
  async getPerson(personId: string): Promise<LinkedInPerson | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.executeRateLimitedRequest('GET_rest_people', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/people/${encodeURIComponent(personId)}`, 'GET')
      );

      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn person', { error, personId });
      return null;
    }
  }

  /**
   * Get connection details
   */
  async getConnection(connectionId: string): Promise<LinkedInConnection | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.executeRateLimitedRequest('GET_rest_connections', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/connections/${encodeURIComponent(connectionId)}`, 'GET')
      );

      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn connection', { error, connectionId });
      return null;
    }
  }

  /**
   * Search people with typeahead
   */
  async searchPeople(options: LinkedInPeopleSearchOptions): Promise<LinkedInPeopleTypeaheadResult> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams();
      
      if (options.organization) {
        params.set('q', 'organizationFollowers');
        params.set('organization', options.organization);
      } else if (options.connectionOf) {
        params.set('q', 'memberConnections');
        params.set('connectionOf', options.connectionOf);
      }

      if (options.keywords) params.set('keywords', options.keywords);
      if (options.count) params.set('count', String(options.count));
      if (options.start) params.set('start', String(options.start));

      const response = await this.executeRateLimitedRequest('FINDER_rest_peopleTypeahead', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/peopleTypeahead?${params.toString()}`, 'GET')
      );

      return response.data;
    } catch (error) {
      logger.error('Error searching LinkedIn people', { error });
      return { elements: [] };
    }
  }

  // ===================================================================
  // ADVERTISING ENDPOINTS (/rest/adAccounts, /rest/adCampaigns)
  // ===================================================================

  /**
   * Search ad accounts
   */
  async searchAdAccounts(options?: LinkedInAdSearchOptions): Promise<LinkedInAdAccount[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({ q: 'search' });
      
      if (options?.search) params.set('search', options.search);
      if (options?.count) params.set('count', String(options.count));
      if (options?.start) params.set('start', String(options.start));

      const response = await this.executeRateLimitedRequest('FINDER_rest_adAccounts_search', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/adAccounts?${params.toString()}`, 'GET')
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error searching LinkedIn ad accounts', { error });
      return [];
    }
  }

  /**
   * Get ad account details
   */
  async getAdAccount(accountId: string): Promise<LinkedInAdAccount | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.executeRateLimitedRequest('GET_rest_adAccounts', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/adAccounts/${encodeURIComponent(accountId)}`, 'GET')
      );

      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn ad account', { error, accountId });
      return null;
    }
  }

  /**
   * Search ad campaigns
   */
  async searchAdCampaigns(accountId: string, options?: LinkedInAdSearchOptions): Promise<LinkedInAdCampaign[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({ q: 'search' });
      
      if (options?.search) params.set('search', options.search);
      if (options?.status) params.set('status', options.status.join(','));
      if (options?.type) params.set('type', options.type.join(','));
      if (options?.count) params.set('count', String(options.count));
      if (options?.start) params.set('start', String(options.start));

      const response = await this.executeRateLimitedRequest('FINDER_rest_adCampaigns_search', () =>
        this.makeAuthenticatedRequest(
          `${this.restApiUrl}/adAccounts/${encodeURIComponent(accountId)}/adCampaigns?${params.toString()}`,
          'GET'
        )
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error searching LinkedIn ad campaigns', { error, accountId });
      return [];
    }
  }

  /**
   * Get ad analytics
   */
  async getAdAnalytics(
    pivotType: string,
    pivotValues: string[],
    options: LinkedInAnalyticsOptions
  ): Promise<LinkedInAdAnalytics[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const params = new URLSearchParams({
        q: 'analytics',
        pivot: pivotType,
        'dateRange.start.day': new Date(options.startDate).getDate().toString(),
        'dateRange.start.month': (new Date(options.startDate).getMonth() + 1).toString(),
        'dateRange.start.year': new Date(options.startDate).getFullYear().toString(),
        'dateRange.end.day': new Date(options.endDate).getDate().toString(),
        'dateRange.end.month': (new Date(options.endDate).getMonth() + 1).toString(),
        'dateRange.end.year': new Date(options.endDate).getFullYear().toString()
      });

      pivotValues.forEach(value => params.append('pivotValues', value));
      if (options.count) params.set('count', String(options.count));
      if (options.start) params.set('start', String(options.start));

      const response = await this.executeRateLimitedRequest('FINDER_rest_adAnalytics_analytics', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/adAnalytics?${params.toString()}`, 'GET')
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn ad analytics', { error });
      return [];
    }
  }

  // ===================================================================
  // REFERENCE DATA ENDPOINTS
  // ===================================================================

  /**
   * Get all industries
   */
  async getIndustries(): Promise<LinkedInIndustry[]> {
    try {
      const response = await this.executeRateLimitedRequest('GET_rest_industries', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/industries`, 'GET')
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn industries', { error });
      return [];
    }
  }

  /**
   * Get geographic locations
   */
  async getGeoLocations(ids?: string[]): Promise<LinkedInGeoLocation[]> {
    try {
      let url = `${this.restApiUrl}/geo`;
      
      if (ids && ids.length > 0) {
        const params = new URLSearchParams();
        ids.forEach(id => params.append('ids', id));
        url += `?${params.toString()}`;
      }

      const response = await this.executeRateLimitedRequest('GET_rest_geo', () =>
        this.makeAuthenticatedRequest(url, 'GET')
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn geo locations', { error });
      return [];
    }
  }

  /**
   * Get job functions
   */
  async getFunctions(): Promise<LinkedInFunction[]> {
    try {
      const response = await this.executeRateLimitedRequest('GET_rest_functions', () =>
        this.makeAuthenticatedRequest(`${this.restApiUrl}/functions`, 'GET')
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn functions', { error });
      return [];
    }
  }

  /**
   * Get skills
   */
  async getSkills(ids?: string[]): Promise<LinkedInSkill[]> {
    try {
      let url = `${this.restApiUrl}/skills`;
      
      if (ids && ids.length > 0) {
        const params = new URLSearchParams();
        ids.forEach(id => params.append('ids', id));
        url += `?${params.toString()}`;
      }

      const response = await this.executeRateLimitedRequest('GET_rest_skills', () =>
        this.makeAuthenticatedRequest(url, 'GET')
      );

      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn skills', { error });
      return [];
    }
  }
} 
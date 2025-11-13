import { PlatformAccountInfo, PlatformAuthData, PlatformType } from '../models';
import { PlatformAdapter } from './PlatformAdapter';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../../core/logging/logger';
import { SocialPlatform } from '../../../core/models/SocialAccount';

/**
 * LinkedIn platform adapter implementation with company pages support
 * Production-ready implementation with robust error handling and logging
 */
export class LinkedInAdapter implements PlatformAdapter {
  platformType = SocialPlatform.LINKEDIN;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private apiVersion: string;
  private baseUrl: string;
  
  constructor() {
    // Load configuration from environment variables
    this.clientId = process.env.LINKEDIN_CLIENT_ID || '';
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=linkedin' || '';
    this.apiVersion = 'v2';
    this.baseUrl = 'https://api.linkedin.com';
    
    logger.info('LinkedInAdapter initialized', {
      hasClientCredentials: !!this.clientId && !!this.clientSecret
    });
    
    if (!this.clientId || !this.clientSecret) {
      logger.warn('LinkedIn credentials not properly configured');
    }
  }
  
  /**
   * Initialize the adapter with authentication data
   */
  async initialize(connection: PlatformAuthData): Promise<void> {
    try {
      // Validate the connection
      if (!connection.accessToken) {
        throw new Error('LinkedIn access token is required');
      }

      // Test the connection by making a simple API call
      const response = await fetch('https://api.linkedin.com/v2/people/~', {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate LinkedIn connection');
      }

      logger.info('LinkedIn adapter initialized successfully', {
        platformType: this.platformType,
        hasAccessToken: !!connection.accessToken
      });
    } catch (error) {
      logger.error('Failed to initialize LinkedIn adapter', {
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
      // Define scopes for LinkedIn API
      const scopes = [
        'r_liteprofile',
        'r_emailaddress',
        'w_member_social',
        'r_organization_admin',
        'w_organization_social',
        'rw_organization_admin'
      ];
      
      logger.debug('Generating LinkedIn authorization URL', {
        scopes: scopes.join(' ')
      });
      
      return `https://www.linkedin.com/oauth/v2/authorization?` +
        `client_id=${encodeURIComponent(this.clientId)}` +
        `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(scopes.join(' '))}` +
        `&response_type=code`;
    } catch (error) {
      logger.error('Error generating LinkedIn authorization URL', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to generate LinkedIn authorization URL');
    }
  }
  
  /**
   * Handle the authorization code callback from OAuth 2.0
   */
  async handleAuthorizationCode(code: string): Promise<PlatformAuthData> {
    try {
      logger.debug('Exchanging code for LinkedIn token');
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      });
      
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      logger.info('Successfully exchanged code for LinkedIn token', {
        hasAccessToken: !!response.data.access_token,
        expiresIn: response.data.expires_in
      });
      
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || '',
        expiresIn: response.data.expires_in,
        scope: response.data.scope || ''
      };
    } catch (error: any) {
      logger.error('Error exchanging LinkedIn code for token', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to exchange authorization code for token');
    }
  }
  
  /**
   * Process the OAuth callback (wrapper method)
   */
  async handleAuthorizationCallback(code: string, state: string): Promise<PlatformAuthData> {
    try {
      // For LinkedIn, we just call handleAuthorizationCode
      return this.handleAuthorizationCode(code);
    } catch (error: any) {
      logger.error('Error handling LinkedIn authorization callback', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to handle authorization callback');
    }
  }
  
  /**
   * Handle OAuth 1.0a token exchange (not used by LinkedIn)
   */
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    // LinkedIn doesn't use OAuth 1.0a
    logger.warn('Attempt to use OAuth 1.0a with LinkedIn which is not supported', {
      oauthToken: oauthToken.substring(0, 10) + '...'
    });
    throw new Error('LinkedIn does not support OAuth 1.0a token flow');
  }
  
  /**
   * Get account information using an access token
   */
  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    try {
      logger.debug('Fetching LinkedIn account information');
      
      // First get the user's profile
      const profileResponse = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      const profileData = profileResponse.data;
      
      // Get email address
      const emailResponse = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/emailAddress?q=members&projection=(elements*(handle~))`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      // Get profile picture if available
      const pictureResponse = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/me?projection=(profilePicture(displayImage~:playableStreams))`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      // Get organizations/company pages the user can manage
      const organizationsResponse = await axios.get(
        `${this.baseUrl}/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      // Try to extract email
      let email = '';
      try {
        if (emailResponse.data.elements && emailResponse.data.elements.length > 0) {
          email = emailResponse.data.elements[0]['handle~'].emailAddress;
        }
      } catch (e) {
        logger.warn('Could not extract LinkedIn email', {
          error: e instanceof Error ? e.message : String(e)
        });
      }
      
      // Try to extract profile picture
      let profilePictureUrl = '';
      try {
        const displayImageData = pictureResponse.data.profilePicture['displayImage~'];
        if (displayImageData.elements && displayImageData.elements.length > 0) {
          // Get the highest resolution image
          const sortedImages = [...displayImageData.elements].sort((a, b) => {
            return b.data['com.linkedin.digitalmedia.mediaartifact.StillImage'].storageSize.width - 
                   a.data['com.linkedin.digitalmedia.mediaartifact.StillImage'].storageSize.width;
          });
          
          profilePictureUrl = sortedImages[0].identifiers[0].identifier;
        }
      } catch (e) {
        logger.warn('Could not extract LinkedIn profile picture', {
          error: e instanceof Error ? e.message : String(e)
        });
      }
      
      // Extract available company pages
      const companyPages = [];
      try {
        if (organizationsResponse.data.elements && organizationsResponse.data.elements.length > 0) {
          // Use for...of to handle async operations in a loop more cleanly
          for (const org of organizationsResponse.data.elements) {
            const orgId = org.organizationalTarget.split(':')[1];
            
            // Get organization details
            try {
              const orgResponse = await axios.get(
                `${this.baseUrl}/v2/organizations/${orgId}`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0'
                  }
                }
              );
              
              companyPages.push({
                id: orgId,
                name: orgResponse.data.localizedName,
                logoUrl: orgResponse.data.logoV2?.original?.url || '',
                url: `https://www.linkedin.com/company/${orgId}`
              });
            } catch (e) {
              logger.warn(`Error fetching details for organization ${orgId}`, {
                error: e instanceof Error ? e.message : String(e)
              });
              companyPages.push({
                id: orgId,
                name: `Organization ${orgId}`,
                url: `https://www.linkedin.com/company/${orgId}`
              });
            }
          }
        }
      } catch (e) {
        logger.warn('Could not extract LinkedIn company pages', {
          error: e instanceof Error ? e.message : String(e)
        });
      }
      
      logger.info('Successfully fetched LinkedIn account info', {
        id: profileData.id,
        name: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
        companyCount: companyPages.length
      });
      
      return {
        id: profileData.id,
        name: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
        username: email || `${profileData.localizedFirstName}.${profileData.localizedLastName}`,
        profileImage: profilePictureUrl,
        email: email,
        url: `https://www.linkedin.com/in/${profileData.id}`,
        additionalData: {
          firstName: profileData.localizedFirstName,
          lastName: profileData.localizedLastName,
          availableCompanyPages: companyPages,
          requiresCompanySelection: companyPages.length > 0
        }
      };
    } catch (error: any) {
      logger.error('Error fetching LinkedIn account info', {
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
      logger.debug('Validating LinkedIn token');
      
      // LinkedIn doesn't have a dedicated endpoint to validate tokens
      // We can verify by making a simple API call
      await axios.get(
        `${this.baseUrl}/${this.apiVersion}/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      logger.debug('LinkedIn token is valid');
      return true;
    } catch (error) {
      logger.warn('LinkedIn token validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  /**
   * Refresh an access token
   * LinkedIn doesn't support refresh tokens in their standard OAuth flow
   */
  async refreshToken(refreshToken: string): Promise<string> {
    // LinkedIn OAuth flow doesn't provide refresh tokens
    // Users must re-authorize when tokens expire
    logger.warn('LinkedIn does not support refreshing tokens, user must re-authorize');
    throw new Error('LinkedIn does not support refreshing tokens. User must re-authorize.');
  }
  
  /**
   * Post content to a user's LinkedIn profile
   * @param accessToken Access token for authentication
   * @param content Text content of the post
   * @param options Additional options for the post
   * @returns Object containing post ID and URL
   */
  async postToProfile(
    accessToken: string,
    content: string,
    options?: {
      imageUrl?: string;
      linkUrl?: string;
      linkTitle?: string;
      linkDescription?: string;
      linkThumbnailUrl?: string;
      visibility?: 'PUBLIC' | 'CONNECTIONS';
    }
  ): Promise<{ id: string; url?: string }> {
    try {
      logger.debug('Posting to LinkedIn profile', {
        contentLength: content.length,
        hasImage: !!options?.imageUrl,
        hasLink: !!options?.linkUrl,
        visibility: options?.visibility || 'PUBLIC'
      });
      
      // Build the post content
      const postData: any = {
        author: `urn:li:person:${await this.getUserId(accessToken)}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': options?.visibility || 'PUBLIC'
        }
      };
      
      // Handle article/link share
      if (options?.linkUrl) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            description: {
              text: options.linkDescription || ''
            },
            originalUrl: options.linkUrl,
            title: {
              text: options.linkTitle || options.linkUrl
            },
            thumbnails: options.linkThumbnailUrl ? [
              {
                url: options.linkThumbnailUrl
              }
            ] : undefined
          }
        ];
      }
      
      // Handle image share (note: this is a different API call for images)
      if (options?.imageUrl && !options?.linkUrl) {
        // For images, we first need to register/upload the image, then create the share
        const registerImageResult = await this.registerImage(accessToken, options.imageUrl);
        
        // Now create a share with the image
        postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            description: {
              text: ''
            },
            media: registerImageResult.asset,
            title: {
              text: ''
            }
          }
        ];
      }
      
      // Make the API request to create the post
      const response = await axios.post(
        `${this.baseUrl}/v2/ugcPosts`,
        postData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      // Extract the post ID from the response
      const postId = response.data.id;
      
      logger.info('Successfully posted to LinkedIn profile', {
        postId: postId
      });
      
      // LinkedIn doesn't provide a direct URL to the post in the API response
      // We need to construct it using the user profile ID
      const userId = await this.getUserId(accessToken);
      const postUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${postId.split(':').pop()}`;
      
      return {
        id: postId,
        url: postUrl
      };
    } catch (error: any) {
      logger.error('Error posting to LinkedIn profile', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to post to LinkedIn profile: ${error.message}`);
    }
  }
  
  /**
   * Post content to a LinkedIn company page
   * @param accessToken Access token for authentication
   * @param organizationId LinkedIn organization/company ID
   * @param content Text content of the post
   * @param options Additional options for the post
   * @returns Object containing post ID and URL
   */
  async postToCompanyPage(
    accessToken: string,
    organizationId: string,
    content: string,
    options?: {
      imageUrl?: string;
      linkUrl?: string;
      linkTitle?: string;
      linkDescription?: string;
      linkThumbnailUrl?: string;
      visibility?: 'PUBLIC' | 'CONNECTIONS';
    }
  ): Promise<{ id: string; url?: string }> {
    try {
      logger.debug('Posting to LinkedIn company page', {
        organizationId,
        contentLength: content.length,
        hasImage: !!options?.imageUrl,
        hasLink: !!options?.linkUrl,
        visibility: options?.visibility || 'PUBLIC'
      });
      
      // Build the post content
      const postData: any = {
        author: `urn:li:organization:${organizationId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': options?.visibility || 'PUBLIC'
        }
      };
      
      // Handle article/link share
      if (options?.linkUrl) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            description: {
              text: options.linkDescription || ''
            },
            originalUrl: options.linkUrl,
            title: {
              text: options.linkTitle || options.linkUrl
            },
            thumbnails: options.linkThumbnailUrl ? [
              {
                url: options.linkThumbnailUrl
              }
            ] : undefined
          }
        ];
      }
      
      // Handle image share (note: this is a different API call for images)
      if (options?.imageUrl && !options?.linkUrl) {
        // For images, we first need to register/upload the image, then create the share
        const registerImageResult = await this.registerImage(accessToken, options.imageUrl, `urn:li:organization:${organizationId}`);
        
        // Now create a share with the image
        postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            description: {
              text: ''
            },
            media: registerImageResult.asset,
            title: {
              text: ''
            }
          }
        ];
      }
      
      // Make the API request to create the post
      const response = await axios.post(
        `${this.baseUrl}/v2/ugcPosts`,
        postData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      // Extract the post ID from the response
      const postId = response.data.id;
      
      logger.info('Successfully posted to LinkedIn company page', {
        organizationId,
        postId: postId
      });
      
      // LinkedIn doesn't provide a direct URL to the post in the API response
      // We need to construct it using the organization ID
      const postUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${postId.split(':').pop()}`;
      
      return {
        id: postId,
        url: postUrl
      };
    } catch (error: any) {
      logger.error('Error posting to LinkedIn company page', {
        error: error.response?.data || error.message,
        organizationId,
        status: error.response?.status
      });
      throw new Error(`Failed to post to LinkedIn company page: ${error.message}`);
    }
  }
  
  /**
   * Get list of company pages for the authenticated user
   * @param accessToken Access token for authentication
   * @returns Array of company pages with their details
   */
  async getCompanyPages(accessToken: string): Promise<any[]> {
    try {
      logger.debug('Fetching LinkedIn company pages');
      
      // Get organizations/company pages the user can manage
      const organizationsResponse = await axios.get(
        `${this.baseUrl}/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      // Extract available company pages
      const companyPages = [];
      
      if (organizationsResponse.data.elements && organizationsResponse.data.elements.length > 0) {
        // Use for...of to handle async operations in a loop more cleanly
        for (const org of organizationsResponse.data.elements) {
          const orgId = org.organizationalTarget.split(':')[1];
          
          // Get organization details
          try {
            const orgResponse = await axios.get(
              `${this.baseUrl}/v2/organizations/${orgId}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'X-Restli-Protocol-Version': '2.0.0'
                }
              }
            );
            
            companyPages.push({
              id: orgId,
              name: orgResponse.data.localizedName,
              logoUrl: orgResponse.data.logoV2?.original?.url || '',
              url: `https://www.linkedin.com/company/${orgId}`,
              description: orgResponse.data.localizedDescription,
              vanityName: orgResponse.data.vanityName,
              locations: orgResponse.data.locations
            });
          } catch (e) {
            logger.warn(`Error fetching details for organization ${orgId}`, {
              error: e instanceof Error ? e.message : String(e)
            });
            companyPages.push({
              id: orgId,
              name: `Organization ${orgId}`,
              url: `https://www.linkedin.com/company/${orgId}`
            });
          }
        }
      }
      
      logger.info('Successfully fetched LinkedIn company pages', {
        count: companyPages.length
      });
      
      return companyPages;
    } catch (error: any) {
      logger.error('Error fetching LinkedIn company pages', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      return [];
    }
  }
  
  /**
   * Get the user's LinkedIn ID (needed for posting)
   * @param accessToken Access token for authentication
   * @returns User ID string
   */
  private async getUserId(accessToken: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      return response.data.id;
    } catch (error: any) {
      logger.error('Error fetching LinkedIn user ID', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to get LinkedIn user ID');
    }
  }
  
  /**
   * Register and upload an image for sharing on LinkedIn
   * @param accessToken Access token for authentication
   * @param imageUrl URL of the image to register
   * @param author URN of the author (person or organization)
   * @returns Object containing the registered asset URN
   */
  private async registerImage(
    accessToken: string,
    imageUrl: string,
    author?: string
  ): Promise<{ asset: string }> {
    try {
      logger.debug('Registering image with LinkedIn', {
        imageUrl: imageUrl,
        hasAuthor: !!author
      });
      
      // Step 1: Register the image with LinkedIn
      const registerResponse = await axios.post(
        `${this.baseUrl}/v2/assets?action=registerUpload`,
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: author || `urn:li:person:${await this.getUserId(accessToken)}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent'
              }
            ]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      // Step 2: Get the upload URL and parameters
      const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerResponse.data.value.asset;
      
      // Step 3: Fetch the image content (if it's a URL)
      let imageContent;
      try {
        if (imageUrl.startsWith('http')) {
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          imageContent = imageResponse.data;
        } else {
          imageContent = imageUrl; // Assume it's a base64 string or file path
        }
      } catch (error: any) {
        logger.error('Error fetching image for LinkedIn upload', {
          error: error.message,
          imageUrl
        });
        throw new Error('Failed to fetch image for upload');
      }
      
      // Step 4: Upload the image to the provided URL
      await axios.put(
        uploadUrl,
        imageContent,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream'
          }
        }
      );
      
      logger.info('Successfully registered and uploaded image to LinkedIn', {
        asset: asset
      });
      
      return { asset };
    } catch (error: any) {
      logger.error('Error registering image with LinkedIn', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        imageUrl
      });
      throw new Error('Failed to register image with LinkedIn');
    }
  }
}

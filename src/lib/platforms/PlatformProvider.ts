import { SocialAccount } from './models/account';
import { PlatformPost, PostAttachment, PostResponse, PostSchedule } from './models/content';
import { PlatformMetrics } from './models/metrics';

/**
 * Configuration options for social platform providers
 */
export interface PlatformProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiKey?: string;
  apiVersion?: string;
  baseUrl?: string;
  additionalParams?: Record<string, any>;
}

/**
 * Supported social media platforms
 */
export enum PlatformType {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  REDDIT = 'reddit',
  MASTODON = 'mastodon',
  THREADS = 'threads'
}

/**
 * Platform capabilities 
 */
export interface PlatformCapabilities {
  supportsImagePosts: boolean;
  supportsVideoPosts: boolean;
  supportsMultipleImages: boolean;
  supportsScheduling: boolean;
  supportsThreads: boolean;
  supportsPolls: boolean;
  supportsHashtags: boolean;
  supportsMentions: boolean;
  maxCharacterCount?: number;
  maxHashtagCount?: number;
  maxMediaAttachments?: number;
  maxScheduleTimeInDays?: number;
}

/**
 * Authentication state for a platform
 */
export interface AuthState {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp when token expires
  tokenType?: string;
  scope?: string[];
  additionalData?: Record<string, any>;
}

/**
 * Abstract class that all platform providers must implement
 */
export abstract class PlatformProvider {
  protected config: PlatformProviderConfig;
  protected authState?: AuthState;
  
  constructor(config: PlatformProviderConfig, authState?: AuthState) {
    this.config = config;
    this.authState = authState;
  }
  
  /**
   * Get the provider's platform type (Facebook, Twitter, etc.)
   */
  abstract getPlatformType(): PlatformType;
  
  /**
   * Get platform capabilities
   */
  abstract getCapabilities(): PlatformCapabilities;
  
  /**
   * Generate OAuth authorization URL for connecting an account
   * Returns a Promise for consistency with PlatformAdapter interface
   */
  abstract getAuthorizationUrl(state: string, codeChallenge?: string): Promise<string>;
  
  /**
   * Exchange authorization code for access token
   */
  abstract exchangeCodeForToken(code: string, codeVerifier?: string): Promise<AuthState>;
  
  /**
   * Refresh the access token if expired
   */
  abstract refreshAccessToken(): Promise<AuthState>;
  
  /**
   * Check if the provider is properly authenticated
   */
  abstract isAuthenticated(): boolean;
  
  /**
   * Fetch account details
   */
  abstract getAccountDetails(): Promise<SocialAccount>;
  
  /**
   * Create a post on the platform
   */
  abstract createPost(post: PlatformPost): Promise<PostResponse>;
  
  /**
   * Schedule a post for later publication
   */
  abstract schedulePost(post: PlatformPost, schedule: PostSchedule): Promise<PostResponse>;
  
  /**
   * Delete a post from the platform
   */
  abstract deletePost(postId: string): Promise<boolean>;
  
  /**
   * Get a list of posts for the account
   */
  abstract getPosts(limit?: number, before?: string, after?: string): Promise<PostResponse[]>;
  
  /**
   * Get account metrics and analytics
   */
  abstract getMetrics(startDate: Date, endDate: Date, metrics?: string[]): Promise<PlatformMetrics>;
  
  /**
   * Upload media to the platform
   */
  abstract uploadMedia(media: PostAttachment): Promise<string>;
  
  /**
   * Test the connection to ensure API credentials are valid
   */
  abstract testConnection(): Promise<boolean>;
  
  /**
   * Revoke authentication tokens
   */
  abstract revokeTokens(): Promise<boolean>;
  
  /**
   * Get the provider's configuration
   */
  getConfig(): PlatformProviderConfig {
    return this.config;
  }
}

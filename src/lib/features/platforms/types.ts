/**
 * Platform types and interfaces for social media platform integrations
 */

export interface PlatformAuthData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string[];
  platformUserId?: string;
  platformUsername?: string;
  instanceUrl?: string; // For Mastodon
}

export interface PlatformConnection {
  id: string;
  userId: string;
  organizationId: string;
  platform: string;
  platformUserId: string;
  platformUsername: string;
  authData: PlatformAuthData;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
  followerCount?: number;
  followingCount?: number;
  profileImageUrl?: string;
  profileUrl?: string;
}

export interface PostData {
  content: string;
  mediaUrls?: string[];
  scheduledFor?: Date;
  hashtags?: string[];
  mentions?: string[];
  location?: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
  threadData?: {
    isThread: boolean;
    threadParts?: string[];
  };
}

export interface PostResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
  publishedAt?: Date;
}

export interface PlatformAnalytics {
  followers: number;
  following: number;
  posts: number;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  reach?: number;
  impressions?: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface PlatformCapabilities {
  canPost: boolean;
  canSchedule: boolean;
  canUploadMedia: boolean;
  canUploadVideo: boolean;
  canCreateThreads: boolean;
  canAddLocation: boolean;
  canMention: boolean;
  canHashtag: boolean;
  maxTextLength: number;
  maxMediaCount: number;
  supportedMediaTypes: string[];
}

export interface PlatformAdapter {
  platform: string;
  capabilities: PlatformCapabilities;
  
  // Authentication
  initialize(authData: PlatformAuthData): Promise<void>;
  refreshAuth?(): Promise<PlatformAuthData>;
  
  // Content operations
  createPost(postData: PostData): Promise<PostResult>;
  schedulePost?(postData: PostData): Promise<PostResult>;
  deletePost?(platformPostId: string): Promise<boolean>;
  
  // Analytics
  getAnalytics?(period?: { start: Date; end: Date }): Promise<PlatformAnalytics>;
  getPostAnalytics?(platformPostId: string): Promise<any>;
  
  // Profile operations
  getProfile?(): Promise<any>;
  updateProfile?(data: any): Promise<boolean>;
}

export interface PlatformProvider {
  platform: string;
  
  // OAuth flow
  getAuthUrl(redirectUri: string, state?: string): string;
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<PlatformAuthData>;
  refreshTokens?(refreshToken: string): Promise<PlatformAuthData>;
  
  // Validation
  validateTokens(authData: PlatformAuthData): Promise<boolean>;
  
  // User info
  getUserInfo(authData: PlatformAuthData): Promise<any>;
}

export type PlatformType =
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'reddit'
  | 'mastodon'
  | 'threads';

export interface PlatformConfig {
  platform: PlatformType;
  name: string;
  icon: string;
  color: string;
  authType: 'oauth1' | 'oauth2' | 'api_key';
  capabilities: PlatformCapabilities;
  endpoints: {
    auth?: string;
    api: string;
    webhook?: string;
  };
}

// Export aliases for backward compatibility
export type Platform = PlatformType; 
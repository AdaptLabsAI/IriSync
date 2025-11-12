/**
 * Enum for all supported platform types
 */
export enum PlatformType {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  REDDIT = 'reddit',
  MASTODON = 'mastodon',
  THREADS = 'threads'
}

/**
 * Interface for platform account information
 */
export interface PlatformAccountInfo {
  id: string;
  name: string;
  username: string;
  profileImage?: string;
  email?: string;
  url?: string;
  additionalData?: Record<string, any>; // For platform-specific data like page selection options
}

/**
 * Interface for authorization data returned after OAuth flow
 */
export interface PlatformAuthData {
  accessToken: string;
  refreshToken?: string;
  tokenSecret?: string; // For OAuth 1.0a (Twitter)
  expiresIn?: number;
  scope?: string;
  metadata?: Record<string, any>; // For platform-specific data like server URLs
}

/**
 * Interface for post data when creating content
 */
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

/**
 * Interface for post creation result
 */
export interface PostResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
  publishedAt?: Date;
}

/**
 * Interface for platform analytics data
 */
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
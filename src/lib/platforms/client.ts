/**
 * Client-side safe platforms module
 */

/**
 * Platform types
 */
export enum PlatformType {
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  REDDIT = 'reddit',
  MASTODON = 'mastodon',
  THREADS = 'threads'
}

/**
 * Authentication state for a platform
 */
export interface AuthState {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  userId?: string;
  accountId?: string;
  additionalData?: Record<string, any>;
}

/**
 * Platform provider interface
 */
export interface PlatformProvider {
  platformType: PlatformType;
  name: string;
  description: string;
  logoUrl: string;
  capabilities: PlatformCapability[];
}

/**
 * Platform capability
 */
export enum PlatformCapability {
  POST_TEXT = 'post_text',
  POST_IMAGE = 'post_image',
  POST_VIDEO = 'post_video',
  POST_LINK = 'post_link',
  SCHEDULE_POSTS = 'schedule_posts',
  READ_MESSAGES = 'read_messages',
  SEND_MESSAGES = 'send_messages',
  READ_ANALYTICS = 'read_analytics',
}

/**
 * Attachment types
 */
export enum AttachmentType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  LINK = 'link'
}

/**
 * Platform capabilities map
 */
export const PLATFORM_CAPABILITIES: Record<PlatformType, PlatformCapability[]> = {
  [PlatformType.FACEBOOK]: [
    PlatformCapability.POST_TEXT,
    PlatformCapability.POST_IMAGE,
    PlatformCapability.POST_VIDEO,
    PlatformCapability.POST_LINK,
    PlatformCapability.SCHEDULE_POSTS,
    PlatformCapability.READ_MESSAGES,
    PlatformCapability.SEND_MESSAGES,
    PlatformCapability.READ_ANALYTICS,
  ],
  [PlatformType.INSTAGRAM]: [
    PlatformCapability.POST_TEXT,
    PlatformCapability.POST_IMAGE,
    PlatformCapability.POST_VIDEO,
    PlatformCapability.SCHEDULE_POSTS,
    PlatformCapability.READ_MESSAGES,
    PlatformCapability.READ_ANALYTICS,
  ],
  [PlatformType.TWITTER]: [
    PlatformCapability.POST_TEXT,
    PlatformCapability.POST_IMAGE,
    PlatformCapability.POST_VIDEO,
    PlatformCapability.POST_LINK,
    PlatformCapability.SCHEDULE_POSTS,
    PlatformCapability.READ_MESSAGES,
    PlatformCapability.SEND_MESSAGES,
    PlatformCapability.READ_ANALYTICS,
  ],
  [PlatformType.LINKEDIN]: [
    PlatformCapability.POST_TEXT,
    PlatformCapability.POST_IMAGE,
    PlatformCapability.POST_LINK
  ],
  [PlatformType.TIKTOK]: [
    PlatformCapability.POST_VIDEO,
    PlatformCapability.READ_ANALYTICS
  ],
  [PlatformType.YOUTUBE]: [
    PlatformCapability.POST_VIDEO,
    PlatformCapability.READ_ANALYTICS
  ],
  [PlatformType.REDDIT]: [
    PlatformCapability.POST_TEXT,
    PlatformCapability.POST_LINK,
    PlatformCapability.READ_MESSAGES
  ],
  [PlatformType.MASTODON]: [
    PlatformCapability.POST_TEXT,
    PlatformCapability.POST_IMAGE
  ],
  [PlatformType.THREADS]: [
    PlatformCapability.POST_TEXT,
    PlatformCapability.POST_IMAGE
  ]
};

/**
 * Platform metrics
 */
export interface PlatformMetrics {
  engagement: number;
  growth: number;
  reachPerPost: number;
}

/**
 * Social account interface
 */
export interface SocialAccount {
  id: string;
  platformId: string;
  platformType: PlatformType;
  name: string;
  username: string;
  profileImage: string;
  isConnected: boolean;
  followerCount: number;
  metrics: PlatformMetrics;
} 
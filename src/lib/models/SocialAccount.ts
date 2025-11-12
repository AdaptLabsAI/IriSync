import { Timestamp } from 'firebase/firestore';

/**
 * Enum for social platforms
 */
export enum SocialPlatform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  REDDIT = 'reddit',
  MASTODON = 'mastodon',
  THREADS = 'threads',
  OTHER = 'other'
}

/**
 * Interface for platform-specific features
 */
export interface PlatformFeatures {
  supportsScheduling: boolean;
  supportsVideoUpload: boolean;
  supportsCarousel: boolean;
  supportsStories: boolean;
  supportsDrafts: boolean;
  supportsReels: boolean;
  maxVideoLength?: number; // In seconds
  maxImageSize?: number;   // In bytes
  maxVideoSize?: number;   // In bytes
  maxImagesPerPost?: number;
  characterLimit?: number;
}

/**
 * Interface for social account
 */
export interface SocialAccount {
  id: string;
  userId: string;
  organizationId?: string;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  username: string;
  profileUrl: string;
  profileImageUrl?: string;
  isConnected: boolean;
  features: PlatformFeatures;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for encrypted auth tokens
 */
export interface SocialAccountTokens {
  accountId: string;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: Date;
  scopes?: string[];
}

/**
 * Interface for social account in Firestore
 */
export interface FirestoreSocialAccount {
  userId: string;
  organizationId?: string;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  username: string;
  profileUrl: string;
  profileImageUrl?: string;
  isConnected: boolean;
  features: PlatformFeatures;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Interface for encrypted auth tokens in Firestore
 */
export interface FirestoreSocialAccountTokens {
  accountId: string;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: Timestamp;
  scopes?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Convert Firestore social account data to social account
 * @param id Social account ID
 * @param data Firestore social account data
 * @returns Social account
 */
export function firestoreToSocialAccount(id: string, data: FirestoreSocialAccount): SocialAccount {
  return {
    id,
    userId: data.userId,
    organizationId: data.organizationId,
    platform: data.platform,
    accountId: data.accountId,
    accountName: data.accountName,
    username: data.username,
    profileUrl: data.profileUrl,
    profileImageUrl: data.profileImageUrl,
    isConnected: data.isConnected,
    features: data.features,
    lastSyncedAt: data.lastSyncedAt.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate()
  };
}

/**
 * Convert social account to Firestore data
 * @param account Social account
 * @returns Firestore social account data
 */
export function socialAccountToFirestore(account: SocialAccount): FirestoreSocialAccount {
  return {
    userId: account.userId,
    organizationId: account.organizationId,
    platform: account.platform,
    accountId: account.accountId,
    accountName: account.accountName,
    username: account.username,
    profileUrl: account.profileUrl,
    profileImageUrl: account.profileImageUrl,
    isConnected: account.isConnected,
    features: account.features,
    lastSyncedAt: Timestamp.fromDate(account.lastSyncedAt),
    createdAt: Timestamp.fromDate(account.createdAt),
    updatedAt: Timestamp.fromDate(account.updatedAt)
  };
}

/**
 * Convert Firestore token data to token object
 * @param data Firestore token data
 * @returns Token object
 */
export function firestoreToTokens(data: FirestoreSocialAccountTokens): SocialAccountTokens {
  return {
    accountId: data.accountId,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    tokenType: data.tokenType,
    expiresAt: data.expiresAt?.toDate(),
    scopes: data.scopes
  };
}

/**
 * Convert token object to Firestore data
 * @param tokens Token object
 * @returns Firestore token data
 */
export function tokensToFirestore(tokens: SocialAccountTokens): FirestoreSocialAccountTokens {
  const now = new Date();
  return {
    accountId: tokens.accountId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenType: tokens.tokenType,
    expiresAt: tokens.expiresAt ? Timestamp.fromDate(tokens.expiresAt) : undefined,
    scopes: tokens.scopes,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now)
  };
}

/**
 * Get default features for a platform
 * @param platform Social platform
 * @returns Platform features
 */
export function getDefaultPlatformFeatures(platform: SocialPlatform): PlatformFeatures {
  switch (platform) {
    case SocialPlatform.INSTAGRAM:
      return {
        supportsScheduling: true,
        supportsVideoUpload: true,
        supportsCarousel: true,
        supportsStories: true,
        supportsDrafts: true,
        supportsReels: true,
        maxVideoLength: 60, // 1 minute for regular posts
        maxImageSize: 30 * 1024 * 1024, // 30MB
        maxVideoSize: 100 * 1024 * 1024, // 100MB
        maxImagesPerPost: 10,
        characterLimit: 2200
      };
    case SocialPlatform.FACEBOOK:
      return {
        supportsScheduling: true,
        supportsVideoUpload: true,
        supportsCarousel: true,
        supportsStories: true,
        supportsDrafts: true,
        supportsReels: true,
        maxVideoLength: 240 * 60, // 4 hours
        maxImageSize: 30 * 1024 * 1024, // 30MB
        maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
        maxImagesPerPost: 10,
        characterLimit: 63206 // Much longer character limit
      };
    case SocialPlatform.TWITTER:
      return {
        supportsScheduling: true,
        supportsVideoUpload: true,
        supportsCarousel: false,
        supportsStories: false,
        supportsDrafts: true,
        supportsReels: false,
        maxVideoLength: 140, // 2:20
        maxImageSize: 20 * 1024 * 1024, // 20MB
        maxVideoSize: 512 * 1024 * 1024, // 512MB
        maxImagesPerPost: 4,
        characterLimit: 280
      };
    case SocialPlatform.LINKEDIN:
      return {
        supportsScheduling: true,
        supportsVideoUpload: true,
        supportsCarousel: true,
        supportsStories: false,
        supportsDrafts: true,
        supportsReels: false,
        maxVideoLength: 10 * 60, // 10 minutes
        maxImageSize: 100 * 1024 * 1024, // 100MB
        maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
        maxImagesPerPost: 9,
        characterLimit: 3000
      };
    case SocialPlatform.YOUTUBE:
      return {
        supportsScheduling: true,
        supportsVideoUpload: true,
        supportsCarousel: false,
        supportsStories: true,
        supportsDrafts: true,
        supportsReels: true, // YouTube Shorts
        maxVideoLength: 12 * 60 * 60, // 12 hours
        maxImageSize: 2 * 1024 * 1024, // 2MB (thumbnail)
        maxVideoSize: 256 * 1024 * 1024 * 1024, // 256GB
        maxImagesPerPost: 1,
        characterLimit: 5000 // Description limit
      };
    case SocialPlatform.TIKTOK:
      return {
        supportsScheduling: true,
        supportsVideoUpload: true,
        supportsCarousel: false,
        supportsStories: true,
        supportsDrafts: true,
        supportsReels: true,
        maxVideoLength: 10 * 60, // 10 minutes
        maxImageSize: 30 * 1024 * 1024, // 30MB
        maxVideoSize: 500 * 1024 * 1024, // 500MB
        maxImagesPerPost: 1,
        characterLimit: 2200
      };
    case SocialPlatform.REDDIT:
      return {
        supportsScheduling: true,
        supportsVideoUpload: true,
        supportsCarousel: true,
        supportsStories: false,
        supportsDrafts: true,
        supportsReels: false,
        maxVideoLength: 15 * 60, // 15 minutes
        maxImageSize: 20 * 1024 * 1024, // 20MB
        maxVideoSize: 1 * 1024 * 1024 * 1024, // 1GB
        maxImagesPerPost: 20,
        characterLimit: 40000
      };
    case SocialPlatform.MASTODON:
      return {
        supportsScheduling: true,
        supportsVideoUpload: true,
        supportsCarousel: false,
        supportsStories: false,
        supportsDrafts: true,
        supportsReels: false,
        maxVideoLength: 40 * 60, // 40 minutes (instance dependent)
        maxImageSize: 10 * 1024 * 1024, // 10MB (instance dependent)
        maxVideoSize: 40 * 1024 * 1024, // 40MB (instance dependent)
        maxImagesPerPost: 4,
        characterLimit: 500 // Depends on instance
      };
    case SocialPlatform.THREADS:
      return {
        supportsScheduling: true,
        supportsVideoUpload: true,
        supportsCarousel: false,
        supportsStories: false,
        supportsDrafts: true,
        supportsReels: false,
        maxVideoLength: 5 * 60, // 5 minutes
        maxImageSize: 30 * 1024 * 1024, // 30MB
        maxVideoSize: 100 * 1024 * 1024, // 100MB
        maxImagesPerPost: 1,
        characterLimit: 500
      };
    default:
      // Default values for any other platform
      return {
        supportsScheduling: true,
        supportsVideoUpload: true,
        supportsCarousel: false,
        supportsStories: false,
        supportsDrafts: true,
        supportsReels: false
      };
  }
}

export function getPlatformIcon(platform: SocialPlatform): string {
  switch (platform) {
    case SocialPlatform.FACEBOOK:
      return '📘';
    case SocialPlatform.INSTAGRAM:
      return '📷';
    case SocialPlatform.TWITTER:
      return '🐦';
    case SocialPlatform.LINKEDIN:
      return '💼';
    case SocialPlatform.TIKTOK:
      return '🎵';
    case SocialPlatform.YOUTUBE:
      return '📺';
    case SocialPlatform.REDDIT:
      return '🤖';
    case SocialPlatform.MASTODON:
      return '🐘';
    case SocialPlatform.THREADS:
      return '🧵';
    case SocialPlatform.OTHER:
      return '🌐';
    default:
      return '🌐';
  }
} 
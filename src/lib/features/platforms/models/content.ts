import { PlatformType } from '../PlatformProvider';

/**
 * Media attachment types for posts
 */
export enum AttachmentType {
  IMAGE = 'image',
  VIDEO = 'video',
  GIF = 'gif',
  LINK = 'link',
  DOCUMENT = 'document',
  AUDIO = 'audio'
}

/**
 * Represents a media attachment for a post
 */
export interface PostAttachment {
  id?: string;
  type: AttachmentType;
  url?: string;
  localPath?: string;
  buffer?: Buffer;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
  altText?: string;
  title?: string;
  size?: number;
  metadata?: Record<string, any>;
}

/**
 * Targeting options for posts
 */
export interface PostTargeting {
  countries?: string[];
  regions?: string[];
  cities?: string[];
  age?: {
    min?: number;
    max?: number;
  };
  gender?: 'male' | 'female' | 'all';
  interests?: string[];
  languages?: string[];
  keywords?: string[];
  excludedKeywords?: string[];
}

/**
 * Post visibility types
 */
export type PostVisibility = 'public' | 'followers' | 'private' | 'custom';

/**
 * Post publishing status
 */
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'deleted';

/**
 * Schedule configuration for posts
 */
export interface PostSchedule {
  publishAt: Date;
  timezone: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
    endAfterOccurrences?: number;
    weekdays?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  };
}

/**
 * Common post structure across platforms
 */
export interface PlatformPost {
  id?: string;
  platformType: PlatformType;
  content: string;
  title?: string;
  attachments?: PostAttachment[];
  targeting?: PostTargeting;
  visibility?: PostVisibility;
  hashtags?: string[];
  mentions?: string[];
  links?: string[];
  location?: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
  replyToPostId?: string;
  threadIds?: string[];
  isThreaded?: boolean;
  customBrandedUrl?: string;
  isPinned?: boolean;
  isPaidPartnership?: boolean;
  metadata?: Record<string, any>;
  platformSpecificParams?: Record<string, any>;
}

/**
 * Response from platform after post creation/scheduling
 */
export interface PostResponse {
  id: string;
  platformType: PlatformType;
  platformPostId: string;
  url?: string;
  status: PostStatus;
  scheduledTime?: Date;
  publishedTime?: Date;
  errorMessage?: string;
  analytics?: {
    impressions?: number;
    engagements?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  metadata?: Record<string, any>;
}

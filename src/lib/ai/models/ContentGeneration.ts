import { AITaskParams } from './AITask';

/**
 * Supported social media platforms
 */
export enum Platform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  PINTEREST = 'pinterest',
  REDDIT = 'reddit',
  MASTODON = 'mastodon',
  THREADS = 'threads'
}

/**
 * Content tone options
 */
export enum ContentTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  HUMOROUS = 'humorous',
  INFORMATIVE = 'informative',
  INSPIRATIONAL = 'inspirational',
  PERSUASIVE = 'persuasive',
  EDUCATIONAL = 'educational',
  PROMOTIONAL = 'promotional'
}

/**
 * Content length options
 */
export enum ContentLength {
  SHORT = 'short',
  MEDIUM = 'medium',
  LONG = 'long'
}

/**
 * Hashtag relevance options
 */
export enum HashtagRelevance {
  HIGH = 'high',
  MEDIUM = 'medium',
  BROAD = 'broad'
}

/**
 * Parameters for post generation
 */
export interface GeneratePostParams extends AITaskParams {
  topic: string;
  platform: Platform;
  tone: ContentTone;
  length: ContentLength;
  includeHashtags: boolean;
  includeEmojis: boolean;
  keyMessages: string[];
}

/**
 * Result from post generation
 */
export interface GeneratePostResult {
  content: string;
  suggestedHashtags?: string[];
  analysis?: {
    estimatedEngagement: number;
    readabilityScore: number;
    targetAudience: string[];
  };
}

/**
 * Parameters for caption generation
 */
export interface GenerateCaptionParams extends AITaskParams {
  imageDescription: string;
  brandVoice: string;
  purpose: 'engagement' | 'sales' | 'awareness';
  length: ContentLength;
  includeHashtags: boolean;
  imageUrl?: string;
}

/**
 * Result from caption generation
 */
export interface GenerateCaptionResult {
  caption: string;
  suggestedHashtags?: string[];
}

/**
 * Parameters for hashtag generation
 */
export interface GenerateHashtagsParams extends AITaskParams {
  content: string;
  platform: Platform;
  count: number;
  relevance: HashtagRelevance;
}

/**
 * Result from hashtag generation
 */
export interface GenerateHashtagsResult {
  hashtags: string[];
  popularityEstimates?: {
    [key: string]: number;
  };
}

/**
 * Parameters for content improvement
 */
export interface ImproveContentParams extends AITaskParams {
  content: string;
  platform: Platform;
  improvementType: 'clarity' | 'engagement' | 'brevity' | 'seo';
  targetAudience?: string;
}

/**
 * Result from content improvement
 */
export interface ImproveContentResult {
  improvedContent: string;
  changes: {
    original: string;
    improved: string;
    reason: string;
  }[];
} 
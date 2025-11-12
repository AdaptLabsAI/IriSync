import { Timestamp } from 'firebase/firestore';

/**
 * Enum for content status
 */
export enum ContentStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed'
}

/**
 * Enum for content type
 */
export enum ContentType {
  POST = 'post',
  STORY = 'story',
  REEL = 'reel',
  VIDEO = 'video',
  ARTICLE = 'article',
  POLL = 'poll'
}

/**
 * Interface for platform-specific content data
 */
export interface PlatformContent {
  platform: string;
  postId?: string;
  url?: string;
  status: ContentStatus;
  scheduledFor?: Date;
  publishedAt?: Date;
  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    engagement?: number;
  };
  platformSpecificData?: Record<string, any>;
}

/**
 * Interface for content
 */
export interface Content {
  id: string;
  userId: string;
  organizationId?: string;
  type: ContentType;
  title?: string;
  body: string;
  tags: string[];
  mediaIds: string[];
  status: ContentStatus;
  platforms: PlatformContent[];
  aiGenerated: boolean;
  aiPrompt?: string;
  scheduledFor?: Date;
  publishedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for content in Firestore
 */
export interface FirestoreContent {
  userId: string;
  organizationId?: string;
  type: ContentType;
  title?: string;
  body: string;
  tags: string[];
  mediaIds: string[];
  status: ContentStatus;
  platforms: Array<Omit<PlatformContent, 'scheduledFor' | 'publishedAt'> & {
    scheduledFor?: Timestamp;
    publishedAt?: Timestamp;
  }>;
  aiGenerated: boolean;
  aiPrompt?: string;
  scheduledFor?: Timestamp;
  publishedAt?: Timestamp;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Convert Firestore content data to content
 * @param id Content ID
 * @param data Firestore content data
 * @returns Content
 */
export function firestoreToContent(id: string, data: FirestoreContent): Content {
  return {
    id,
    userId: data.userId,
    organizationId: data.organizationId,
    type: data.type,
    title: data.title,
    body: data.body,
    tags: data.tags,
    mediaIds: data.mediaIds,
    status: data.status,
    platforms: data.platforms.map(p => ({
      platform: p.platform,
      postId: p.postId,
      url: p.url,
      status: p.status,
      scheduledFor: p.scheduledFor?.toDate(),
      publishedAt: p.publishedAt?.toDate(),
      metrics: p.metrics,
      platformSpecificData: p.platformSpecificData
    })),
    aiGenerated: data.aiGenerated,
    aiPrompt: data.aiPrompt,
    scheduledFor: data.scheduledFor?.toDate(),
    publishedAt: data.publishedAt?.toDate(),
    metadata: data.metadata,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate()
  };
}

/**
 * Convert content to Firestore data
 * @param content Content
 * @returns Firestore content data
 */
export function contentToFirestore(content: Content): FirestoreContent {
  return {
    userId: content.userId,
    organizationId: content.organizationId,
    type: content.type,
    title: content.title,
    body: content.body,
    tags: content.tags,
    mediaIds: content.mediaIds,
    status: content.status,
    platforms: content.platforms.map(p => ({
      platform: p.platform,
      postId: p.postId,
      url: p.url,
      status: p.status,
      scheduledFor: p.scheduledFor ? Timestamp.fromDate(p.scheduledFor) : undefined,
      publishedAt: p.publishedAt ? Timestamp.fromDate(p.publishedAt) : undefined,
      metrics: p.metrics,
      platformSpecificData: p.platformSpecificData
    })),
    aiGenerated: content.aiGenerated,
    aiPrompt: content.aiPrompt,
    scheduledFor: content.scheduledFor ? Timestamp.fromDate(content.scheduledFor) : undefined,
    publishedAt: content.publishedAt ? Timestamp.fromDate(content.publishedAt) : undefined,
    metadata: content.metadata,
    createdAt: Timestamp.fromDate(content.createdAt),
    updatedAt: Timestamp.fromDate(content.updatedAt)
  };
} 
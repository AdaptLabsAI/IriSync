import { Timestamp } from 'firebase/firestore';
import { PlatformType } from '../../platforms';

/**
 * Message type enumeration
 */
export enum MessageType {
  DIRECT = 'direct',
  COMMENT = 'comment',
  MENTION = 'mention',
  REPLY = 'reply',
  LIKE = 'like',
  SHARE = 'share',
  FOLLOW = 'follow',
  TAG = 'tag',
  SYSTEM = 'system',
  OTHER = 'other'
}

/**
 * Message priority level
 */
export enum MessagePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Message read status
 */
export enum MessageStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
  SPAM = 'spam',
  DELETED = 'deleted',
  HIDDEN = 'hidden'
}

/**
 * Message sentiment
 */
export enum MessageSentiment {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  MIXED = 'mixed',
  UNKNOWN = 'unknown'
}

/**
 * Message engagement action
 */
export enum MessageAction {
  NONE = 'none',
  REPLIED = 'replied',
  LIKED = 'liked',
  REACTED = 'reacted',
  FLAGGED = 'flagged',
  FOLLOWED = 'followed',
  BLOCKED = 'blocked',
  REPORTED = 'reported'
}

/**
 * Message attachment type
 */
export enum AttachmentType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LINK = 'link',
  GIF = 'gif',
  STICKER = 'sticker',
  EMOJI = 'emoji',
  LOCATION = 'location',
  CONTACT = 'contact',
  OTHER = 'other'
}

/**
 * Message sender information
 */
export interface MessageSender {
  id: string;
  name: string;
  username?: string;
  profileUrl?: string;
  profileImageUrl?: string;
  verified?: boolean;
  isFollower?: boolean;
  isFollowing?: boolean;
  followerCount?: number;
  bio?: string;
  location?: string;
  metadata?: Record<string, any>;
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  id: string;
  type: AttachmentType;
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  title?: string;
  description?: string;
  altText?: string;
  metadata?: Record<string, any>;
}

/**
 * Message geolocation data
 */
export interface MessageGeolocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  placeId?: string;
}

/**
 * Post reference data
 */
export interface PostReference {
  id: string;
  platformId: string;
  content: string;
  url?: string;
  createdAt: Timestamp | Date;
  attachments?: MessageAttachment[];
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
}

/**
 * Message statistics
 */
export interface MessageStats {
  sentiment?: MessageSentiment;
  sentimentScore?: number;
  urgency?: number;
  engagement?: number;
  influencerScore?: number;
  aiCategories?: string[];
  aiTags?: string[];
  aiSummary?: string;
}

/**
 * Response template
 */
export interface ResponseTemplate {
  id: string;
  name: string;
  content: string;
  tags?: string[];
  category?: string;
  tone?: string;
}

/**
 * Message entity (mention, hashtag, etc.)
 */
export interface MessageEntity {
  type: 'mention' | 'hashtag' | 'url' | 'email' | 'phone' | 'bold' | 'italic' | 'code' | 'pre' | 'emoji';
  offset: number;
  length: number;
  url?: string;
  text: string;
}

/**
 * Primary message interface
 */
export interface SocialMessage {
  id: string;
  platformType: PlatformType;
  platformId: string;
  platformAccountId: string;
  externalId: string;
  parentId?: string;
  rootId?: string;
  threadId?: string;
  type: MessageType;
  content: string;
  contentHtml?: string;
  entities?: MessageEntity[];
  sender: MessageSender;
  recipient?: MessageSender;
  attachments?: MessageAttachment[];
  location?: MessageGeolocation;
  referencedPost?: PostReference;
  priority: MessagePriority;
  status: MessageStatus;
  sentiment?: MessageSentiment;
  action: MessageAction;
  stats?: MessageStats;
  suggestedTemplates?: ResponseTemplate[];
  assignedTo?: string;
  tags?: string[];
  notes?: string;
  isHidden?: boolean;
  createdAt: Timestamp | Date;
  receivedAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  readAt?: Timestamp | Date;
  respondedAt?: Timestamp | Date;
  metadata?: Record<string, any>;
}

/**
 * Interface for creating a message response
 */
export interface MessageResponse {
  threadId: string;
  parentId: string;
  platformType: PlatformType;
  platformAccountId: string;
  content: string;
  attachments?: MessageAttachment[];
}

/**
 * Message filter options
 */
export interface MessageFilter {
  platformTypes?: PlatformType[];
  platformAccountIds?: string[];
  messageTypes?: MessageType[];
  status?: MessageStatus[];
  priority?: MessagePriority[];
  sentiment?: MessageSentiment[];
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasAttachments?: boolean;
  searchQuery?: string;
  hasTags?: string[];
  sortBy?: 'createdAt' | 'receivedAt' | 'priority' | 'engagement';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  lastVisible?: any;
}

/**
 * Social inbox folder
 */
export enum InboxFolder {
  INBOX = 'inbox',
  SENT = 'sent',
  ARCHIVED = 'archived',
  FLAGGED = 'flagged',
  SPAM = 'spam',
  TRASH = 'trash',
  ALL = 'all'
}

/**
 * Inbox statistics
 */
export interface InboxStats {
  total: number;
  unread: number;
  byPriority: Record<MessagePriority, number>;
  byPlatform: Record<PlatformType, number>;
  byType: Record<MessageType, number>;
  bySentiment: Record<MessageSentiment, number>;
  responseRate: number;
  responseTime: number; // Average in minutes
  lastUpdated: Timestamp | Date;
}

/**
 * Helper to convert timestamps to dates for messages
 */
export function normalizeMessage(message: SocialMessage): SocialMessage {
  const normalized = { ...message };
  
  if (normalized.createdAt && 'toDate' in normalized.createdAt) {
    normalized.createdAt = (normalized.createdAt as Timestamp).toDate();
  }
  
  if (normalized.receivedAt && 'toDate' in normalized.receivedAt) {
    normalized.receivedAt = (normalized.receivedAt as Timestamp).toDate();
  }
  
  if (normalized.updatedAt && 'toDate' in normalized.updatedAt) {
    normalized.updatedAt = (normalized.updatedAt as Timestamp).toDate();
  }
  
  if (normalized.readAt && 'toDate' in normalized.readAt) {
    normalized.readAt = (normalized.readAt as Timestamp).toDate();
  }
  
  if (normalized.respondedAt && 'toDate' in normalized.respondedAt) {
    normalized.respondedAt = (normalized.respondedAt as Timestamp).toDate();
  }
  
  if (normalized.referencedPost?.createdAt && 'toDate' in normalized.referencedPost.createdAt) {
    normalized.referencedPost.createdAt = (normalized.referencedPost.createdAt as Timestamp).toDate();
  }
  
  return normalized;
}

import { Timestamp } from 'firebase/firestore';

/**
 * Forum category type
 */
export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  iconName?: string; // Name of the icon to use from MUI
  color?: string;
  slug: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  postCount: number;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Status of a forum post
 */
export enum ForumPostStatus {
  ACTIVE = 'active',
  LOCKED = 'locked',
  HIDDEN = 'hidden',
  DELETED = 'deleted'
}

/**
 * Forum post model
 */
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  categoryId: string;
  tags: string[];
  status: ForumPostStatus;
  isPinned: boolean;
  isAnnouncement: boolean;
  isSolved: boolean;
  commentCount: number;
  viewCount: number;
  lastCommentAt: Timestamp | null;
  lastCommentBy: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  slug: string;
}

/**
 * Status of a comment
 */
export enum CommentStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  DELETED = 'deleted'
}

/**
 * Forum comment model
 */
export interface ForumComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  parentId?: string; // For replies to comments
  isAnswer: boolean; // Marked as the accepted answer
  status: CommentStatus;
  likeCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Create forum post input
 */
export interface CreateForumPostInput {
  title: string;
  content: string;
  categoryId: string;
  tags?: string[];
  isPinned?: boolean;
  isAnnouncement?: boolean;
}

/**
 * Create forum comment input
 */
export interface CreateForumCommentInput {
  postId: string;
  content: string;
  parentId?: string;
}

/**
 * Update forum post input
 */
export interface UpdateForumPostInput {
  title?: string;
  content?: string;
  categoryId?: string;
  tags?: string[];
  status?: ForumPostStatus;
  isPinned?: boolean;
  isAnnouncement?: boolean;
  isSolved?: boolean;
}

/**
 * Update forum comment input
 */
export interface UpdateForumCommentInput {
  content?: string;
  isAnswer?: boolean;
  status?: CommentStatus;
}

/**
 * Forum post list filters
 */
export interface ForumPostFilter {
  categoryId?: string;
  authorId?: string;
  tags?: string[];
  status?: ForumPostStatus;
  isPinned?: boolean;
  isAnnouncement?: boolean;
  isSolved?: boolean;
  searchQuery?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastCommentAt' | 'commentCount' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

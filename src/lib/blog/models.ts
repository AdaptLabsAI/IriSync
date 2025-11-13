import { Timestamp } from 'firebase/firestore';
import { User } from '../core/models/User';

export enum BlogPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface BlogPostMetadata {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  publishedAt: Timestamp | null;
  updatedAt: Timestamp;
  createdAt: Timestamp;
  status: BlogPostStatus;
  tags: string[];
  featuredImage?: string;
  readTime: number; // in minutes
}

export interface BlogPost extends BlogPostMetadata {
  content: string; // Rich text content in HTML format
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

export interface BlogComment {
  id: string;
  postId: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: CommentStatus;
  parentId?: string; // For nested comments
  likes: number;
  isEdited: boolean;
  reportCount: number;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  featuredImage?: string;
  postCount: number;
} 
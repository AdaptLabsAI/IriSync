import { Timestamp } from 'firebase/firestore';

/**
 * Knowledge content types
 */
export enum KnowledgeContentType {
  FAQ = 'faq',
  DOCUMENTATION = 'documentation',
  TUTORIAL = 'tutorial',
  TROUBLESHOOTING = 'troubleshooting',
  GUIDE = 'guide'
}

/**
 * Knowledge content status
 */
export enum KnowledgeStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

/**
 * Knowledge access levels
 */
export enum KnowledgeAccessLevel {
  PUBLIC = 'public',     // Available to anyone
  REGISTERED = 'registered', // Available to all registered users
  PAID = 'paid',        // Available to paid users only
  INFLUENCER = 'influencer', // Available to Influencer tier and above
  ENTERPRISE = 'enterprise', // Available to Enterprise tier only
  PRIVATE = 'private'    // Available only to specific users/orgs
}

/**
 * Knowledge content metadata
 */
export interface KnowledgeContentMetadata {
  id: string;
  title: string;
  slug: string;
  contentType: KnowledgeContentType;
  category: string;
  tags: string[];
  status: KnowledgeStatus;
  accessLevel: KnowledgeAccessLevel;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt: Timestamp | null;
  createdBy: string;
  vectorIds: string[]; // IDs in vector database for RAG
}

/**
 * Knowledge content
 */
export interface KnowledgeContent extends KnowledgeContentMetadata {
  content: string;
  excerpt?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  relatedContentIds?: string[];
}

/**
 * Create knowledge content input
 */
export type CreateKnowledgeContentInput = Omit<KnowledgeContent, 
  'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'slug' | 'vectorIds'>;

/**
 * Update knowledge content input
 */
export type UpdateKnowledgeContentInput = Partial<Omit<KnowledgeContent, 
  'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'slug' | 'vectorIds'>>;

/**
 * Knowledge content filter
 */
export interface KnowledgeContentFilter {
  contentType?: KnowledgeContentType | KnowledgeContentType[];
  category?: string | string[];
  status?: KnowledgeStatus | KnowledgeStatus[];
  accessLevel?: KnowledgeAccessLevel | KnowledgeAccessLevel[];
  tags?: string[];
  createdBy?: string;
  page?: number;
  limit?: number;
}

/**
 * Search result for knowledge content
 */
export interface KnowledgeSearchResult {
  content: KnowledgeContent;
  score: number;
  relevantSection?: string;
} 
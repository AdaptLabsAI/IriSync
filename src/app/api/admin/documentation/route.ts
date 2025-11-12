import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { 
  KnowledgeContent, 
  KnowledgeContentType, 
  KnowledgeStatus, 
  KnowledgeAccessLevel,
  KnowledgeContentFilter
} from '@/lib/features/knowledge/models';
import { KnowledgeRepository } from '@/lib/features/knowledge/repository';
import { z } from 'zod';
import { logger } from '@/lib/core/logging/logger';

/**
 * Documentation filter schema
 */
const documentationFilterSchema = z.object({
  category: z.string().optional(),
  status: z.enum([
    KnowledgeStatus.DRAFT,
    KnowledgeStatus.PUBLISHED,
    KnowledgeStatus.ARCHIVED
  ]).optional(),
  accessLevel: z.enum([
    KnowledgeAccessLevel.PUBLIC,
    KnowledgeAccessLevel.REGISTERED,
    KnowledgeAccessLevel.PAID,
    KnowledgeAccessLevel.INFLUENCER,
    KnowledgeAccessLevel.ENTERPRISE,
    KnowledgeAccessLevel.PRIVATE
  ]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10)
});

/**
 * Create documentation schema
 */
const createDocumentationSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  content: z.string().min(20, 'Content must be at least 20 characters'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum([
    KnowledgeStatus.DRAFT,
    KnowledgeStatus.PUBLISHED,
    KnowledgeStatus.ARCHIVED
  ]).optional().default(KnowledgeStatus.DRAFT),
  accessLevel: z.enum([
    KnowledgeAccessLevel.PUBLIC,
    KnowledgeAccessLevel.REGISTERED,
    KnowledgeAccessLevel.PAID,
    KnowledgeAccessLevel.INFLUENCER,
    KnowledgeAccessLevel.ENTERPRISE,
    KnowledgeAccessLevel.PRIVATE
  ]).optional().default(KnowledgeAccessLevel.PUBLIC),
  excerpt: z.string().optional(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).optional()
});

/**
 * Process documentation item for response
 */
function processDocumentationForResponse(doc: KnowledgeContent) {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    content: doc.content,
    contentType: doc.contentType,
    category: doc.category,
    tags: doc.tags,
    status: doc.status,
    accessLevel: doc.accessLevel,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    publishedAt: doc.publishedAt,
    seo: doc.seo
  };
}

/**
 * GET handler for fetching documentation items with filtering and pagination
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    
    // Validate and parse query parameters
    const validatedParams = documentationFilterSchema.safeParse(searchParams);
    
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: validatedParams.error.flatten() },
        { status: 400 }
      );
    }
    
    const filters = validatedParams.data;
    
    // Build filter for KnowledgeRepository
    const knowledgeFilter: KnowledgeContentFilter = {
      contentType: KnowledgeContentType.DOCUMENTATION,
      category: filters.category,
      status: filters.status,
      accessLevel: filters.accessLevel,
      page: filters.page,
      limit: filters.limit
    };
    
    // Get documentation content
    const { contents, lastDoc, hasMore } = await KnowledgeRepository.getAll(knowledgeFilter);
    
    // If search term is provided, filter results (client-side since there's no native full-text search)
    let filteredContents = contents;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredContents = contents.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm) || 
        doc.content.toLowerCase().includes(searchTerm) ||
        (doc.excerpt && doc.excerpt.toLowerCase().includes(searchTerm)) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    // Count total based on content type
    const countByType = await KnowledgeRepository.getCountByType();
    const total = countByType[KnowledgeContentType.DOCUMENTATION] || 0;
    
    // Process items for response
    const items = filteredContents.map(processDocumentationForResponse);
    
    // Log admin action
    logger.info('Admin fetched documentation items', {
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      filters: knowledgeFilter,
      resultCount: items.length
    });
    
    return NextResponse.json({
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      hasMore
    });
    
  } catch (error) {
    logger.error('Error fetching documentation items', { error });
    return NextResponse.json(
      { error: 'Failed to fetch documentation items' },
      { status: 500 }
    );
  }
});

/**
 * POST handler for creating a new documentation item
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createDocumentationSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid documentation data', details: validatedData.error.flatten() },
        { status: 400 }
      );
    }
    
    const documentationData = validatedData.data;
    
    // Set content type to DOCUMENTATION
    const contentData = {
      ...documentationData,
      contentType: KnowledgeContentType.DOCUMENTATION,
      createdBy: adminUser.id
    };
    
    // Create the documentation item
    const createdDoc = await KnowledgeRepository.create(contentData, adminUser.id);
    
    // Log admin action
    logger.info('Admin created documentation item', {
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      documentationId: createdDoc.id,
      documentationTitle: createdDoc.title
    });
    
    return NextResponse.json(processDocumentationForResponse(createdDoc), { status: 201 });
    
  } catch (error) {
    logger.error('Error creating documentation item', { error });
    return NextResponse.json(
      { error: 'Failed to create documentation item' },
      { status: 500 }
    );
  }
}); 
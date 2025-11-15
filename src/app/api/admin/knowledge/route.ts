import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { firestore } from '@/lib/core/firebase';
import { firebaseAdmin, getFirestore, serverTimestamp } from '@/lib/core/firebase/admin';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  Timestamp 
} from 'firebase/firestore';
import { z } from 'zod';
import { logger } from '@/lib/core/logging/logger';
import { 
  KnowledgeContent, 
  KnowledgeContentFilter,
  KnowledgeContentType, 
  KnowledgeStatus, 
  KnowledgeAccessLevel 
} from '@/lib/knowledge/models';
import { generateSlug } from '@/lib/core/utils/slug';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Collection name constants
const KNOWLEDGE_COLLECTION = 'knowledgeContent';
const AUDIT_LOGS_COLLECTION = 'auditLogs';

/**
 * Log admin actions for audit trail
 */
async function logAdminAction(adminUser: { id: string, email: string, role: string }, action: string, details: any) {
  try {
    const adminFirestore = getFirestore();
    const logRef = adminFirestore.collection(AUDIT_LOGS_COLLECTION).doc();
    await logRef.set({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminRole: adminUser.role,
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // Log but don't fail the request if audit logging fails
    logger.error('Failed to create audit log', { error, action, adminId: adminUser.id });
  }
}

/**
 * Format knowledge content for API response
 */
function formatKnowledgeForResponse(content: KnowledgeContent) {
  // Convert timestamps to ISO strings for consistent API responses
  return {
    ...content,
    createdAt: content.createdAt instanceof Timestamp 
      ? content.createdAt.toDate().toISOString() 
      : content.createdAt,
    updatedAt: content.updatedAt instanceof Timestamp 
      ? content.updatedAt.toDate().toISOString() 
      : content.updatedAt,
    publishedAt: content.publishedAt instanceof Timestamp 
      ? content.publishedAt.toDate().toISOString() 
      : content.publishedAt,
  };
}

/**
 * Creation validation schema
 */
const createKnowledgeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  content: z.string().min(20, 'Content must be at least 20 characters'),
  contentType: z.enum([
    KnowledgeContentType.FAQ,
    KnowledgeContentType.DOCUMENTATION,
    KnowledgeContentType.TUTORIAL,
    KnowledgeContentType.TROUBLESHOOTING,
    KnowledgeContentType.GUIDE
  ]),
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
  ]).optional().default(KnowledgeAccessLevel.PRIVATE),
  excerpt: z.string().optional(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).optional(),
  relatedContentIds: z.array(z.string()).optional()
});

/**
 * Filter validation schema
 */
const knowledgeFilterSchema = z.object({
  contentType: z.union([
    z.enum([
      KnowledgeContentType.FAQ,
      KnowledgeContentType.DOCUMENTATION,
      KnowledgeContentType.TUTORIAL,
      KnowledgeContentType.TROUBLESHOOTING,
      KnowledgeContentType.GUIDE
    ]),
    z.array(z.enum([
      KnowledgeContentType.FAQ,
      KnowledgeContentType.DOCUMENTATION,
      KnowledgeContentType.TUTORIAL,
      KnowledgeContentType.TROUBLESHOOTING,
      KnowledgeContentType.GUIDE
    ]))
  ]).optional(),
  category: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  status: z.union([
    z.enum([
      KnowledgeStatus.DRAFT,
      KnowledgeStatus.PUBLISHED,
      KnowledgeStatus.ARCHIVED
    ]),
    z.array(z.enum([
      KnowledgeStatus.DRAFT,
      KnowledgeStatus.PUBLISHED,
      KnowledgeStatus.ARCHIVED
    ]))
  ]).optional(),
  accessLevel: z.union([
    z.enum([
      KnowledgeAccessLevel.PUBLIC,
      KnowledgeAccessLevel.REGISTERED,
      KnowledgeAccessLevel.PAID,
      KnowledgeAccessLevel.INFLUENCER,
      KnowledgeAccessLevel.ENTERPRISE,
      KnowledgeAccessLevel.PRIVATE
    ]),
    z.array(z.enum([
      KnowledgeAccessLevel.PUBLIC,
      KnowledgeAccessLevel.REGISTERED,
      KnowledgeAccessLevel.PAID,
      KnowledgeAccessLevel.INFLUENCER,
      KnowledgeAccessLevel.ENTERPRISE,
      KnowledgeAccessLevel.PRIVATE
    ]))
  ]).optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(25),
  sortField: z.string().optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  lastDocId: z.string().optional()
});

/**
 * GET handler for knowledge content with filtering, pagination, and sorting
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Dynamically import KnowledgeRepository to avoid build-time Firebase initialization
    const { KnowledgeRepository } = await import('@/lib/knowledge/repository');
    
    // Get query parameters
    const url = new URL(request.url);
    
    // Extract and validate filter parameters
    const filterParams: Record<string, any> = {
      contentType: url.searchParams.get('contentType'),
      category: url.searchParams.get('category'),
      status: url.searchParams.get('status'),
      accessLevel: url.searchParams.get('accessLevel'),
      tags: url.searchParams.getAll('tag'),
      createdBy: url.searchParams.get('createdBy'),
      search: url.searchParams.get('search'),
      page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
      sortField: url.searchParams.get('sortField'),
      sortOrder: url.searchParams.get('sortOrder'),
      lastDocId: url.searchParams.get('lastDocId')
    };
    
    // Remove undefined values from filter
    Object.keys(filterParams).forEach(key => {
      if (filterParams[key] === null || filterParams[key] === undefined) {
        delete filterParams[key];
      }
    });
    
    // Handle special array parameters
    if (url.searchParams.get('contentType')?.includes(',')) {
      filterParams.contentType = url.searchParams.get('contentType')!.split(',');
    }
    
    if (url.searchParams.get('category')?.includes(',')) {
      filterParams.category = url.searchParams.get('category')!.split(',');
    }
    
    if (url.searchParams.get('status')?.includes(',')) {
      filterParams.status = url.searchParams.get('status')!.split(',');
    }
    
    if (url.searchParams.get('accessLevel')?.includes(',')) {
      filterParams.accessLevel = url.searchParams.get('accessLevel')!.split(',');
    }
    
    // Validate filter parameters
    const validationResult = knowledgeFilterSchema.safeParse(filterParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid filter parameters',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }
    
    const validFilter = validationResult.data;
    
    // Default page size and other parameters
    const pageSize = validFilter.limit || 25;
    const page = validFilter.page || 1;
    const sortField = validFilter.sortField || 'updatedAt';
    const sortOrder = validFilter.sortOrder || 'desc';
    const lastDocId = validFilter.lastDocId;
    
    // Create filter for repository
    const filter: KnowledgeContentFilter = {
      contentType: validFilter.contentType,
      category: validFilter.category,
      status: validFilter.status,
      accessLevel: validFilter.accessLevel,
      tags: validFilter.tags,
      createdBy: validFilter.createdBy,
      page,
      limit: pageSize
    };
    
    // Get knowledge content from repository with cursor-based pagination
    let knowledgeResults: { 
      items: KnowledgeContent[]; 
      totalCount: number; 
      hasMore: boolean;
      lastDocId?: string 
    };
    
    try {
      if (lastDocId) {
        // Use cursor-based pagination if lastDocId is provided
        const lastDocRef = doc(firestore, KNOWLEDGE_COLLECTION, lastDocId);
        const lastDocSnapshot = await getDoc(lastDocRef);
        
        if (!lastDocSnapshot.exists()) {
          return NextResponse.json(
            { error: 'Invalid lastDocId provided for pagination' },
            { status: 400 }
          );
        }
        
        // Build query with filters
        let queryRef: any = collection(firestore, KNOWLEDGE_COLLECTION);
        
        // Apply filters
        if (filter.contentType) {
          const contentTypes = Array.isArray(filter.contentType) 
            ? filter.contentType 
            : [filter.contentType];
          
          if (contentTypes.length === 1) {
            queryRef = query(queryRef, where('contentType', '==', contentTypes[0]));
          } else if (contentTypes.length > 1) {
            queryRef = query(queryRef, where('contentType', 'in', contentTypes));
          }
        }
        
        if (filter.category) {
          const categories = Array.isArray(filter.category) 
            ? filter.category 
            : [filter.category];
          
          if (categories.length === 1) {
            queryRef = query(queryRef, where('category', '==', categories[0]));
          } else if (categories.length > 1) {
            queryRef = query(queryRef, where('category', 'in', categories));
          }
        }
        
        if (filter.status) {
          const statuses = Array.isArray(filter.status) 
            ? filter.status 
            : [filter.status];
          
          if (statuses.length === 1) {
            queryRef = query(queryRef, where('status', '==', statuses[0]));
          } else if (statuses.length > 1) {
            queryRef = query(queryRef, where('status', 'in', statuses));
          }
        }
        
        if (filter.accessLevel) {
          const accessLevels = Array.isArray(filter.accessLevel) 
            ? filter.accessLevel 
            : [filter.accessLevel];
          
          if (accessLevels.length === 1) {
            queryRef = query(queryRef, where('accessLevel', '==', accessLevels[0]));
          } else if (accessLevels.length > 1) {
            queryRef = query(queryRef, where('accessLevel', 'in', accessLevels));
          }
        }
        
        if (filter.createdBy) {
          queryRef = query(queryRef, where('createdBy', '==', filter.createdBy));
        }
        
        // Apply sorting and pagination
        queryRef = query(queryRef, orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc'));
        queryRef = query(queryRef, startAfter(lastDocSnapshot));
        queryRef = query(queryRef, limit(pageSize));
        
        const querySnapshot = await getDocs(queryRef);
        
        // Fetch the documents
        const items: KnowledgeContent[] = [];
        querySnapshot.docs.forEach(doc => {
          const data = doc.data() as Omit<KnowledgeContent, 'id'>;
          items.push({ id: doc.id, ...data } as KnowledgeContent);
        });
        
        // Filter by tags if specified (client-side filtering since Firestore doesn't support array contains any easily)
        let filteredItems = items;
        if (filter.tags && filter.tags.length > 0) {
          filteredItems = items.filter((item: KnowledgeContent) => 
            filter.tags!.some((tag: string) => item.tags.includes(tag))
          );
        }
        
        // Filter by search term if provided
        if (validFilter.search) {
          const searchLower = validFilter.search.toLowerCase();
          filteredItems = filteredItems.filter((item: KnowledgeContent) => 
            item.title.toLowerCase().includes(searchLower) ||
            item.content.toLowerCase().includes(searchLower) ||
            item.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
          );
        }
        
        // Get the last document for next page cursor
        const lastVisible = querySnapshot.docs.length > 0 
          ? querySnapshot.docs[querySnapshot.docs.length - 1].id 
          : null;
        
        knowledgeResults = {
          items: filteredItems,
          totalCount: -1, // Set a default or calculate if possible
          hasMore: !querySnapshot.empty && querySnapshot.docs.length === pageSize,
          lastDocId: lastVisible || undefined
        };
      } else {
        // Use regular pagination if no cursor
        const result = await KnowledgeRepository.getAll(filter);
        
        // Add text search filter if needed (client-side filtering)
        let filteredItems = result.contents;
        if (validFilter.search) {
          const searchLower = validFilter.search.toLowerCase();
          filteredItems = result.contents.filter((item: KnowledgeContent) => 
            item.title.toLowerCase().includes(searchLower) ||
            item.content.toLowerCase().includes(searchLower) ||
            item.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
          );
        }
        
        // Get the last document for next page cursor
        const lastVisible = filteredItems.length > 0 
          ? filteredItems[filteredItems.length - 1].id 
          : undefined;
        
        knowledgeResults = {
          items: filteredItems,
          totalCount: -1, // Set a default or calculate if possible
          hasMore: result.hasMore,
          lastDocId: lastVisible
        };
      }
    } catch (error) {
      logger.error('Error fetching knowledge content', {
        error: error instanceof Error ? error.message : String(error),
        filter
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch knowledge content', 
          message: 'An error occurred while fetching knowledge content.' 
        },
        { status: 500 }
      );
    }
    
    // Format items for API response
    const formattedItems = knowledgeResults.items.map(formatKnowledgeForResponse);
    
    // Log admin action
    await logAdminAction(adminUser, 'LIST_KNOWLEDGE', {
      filter,
      sortField,
      sortOrder,
      resultCount: formattedItems.length
    });
    
    // Return formatted response
    return NextResponse.json({
      items: formattedItems,
      pagination: {
        totalCount: knowledgeResults.totalCount,
        page,
        pageSize,
        hasMore: knowledgeResults.hasMore,
        lastDocId: knowledgeResults.lastDocId
      }
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin knowledge GET handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to retrieve knowledge content',
        message: 'An unexpected error occurred while retrieving knowledge content. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * POST handler for creating new knowledge content
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Dynamically import KnowledgeRepository to avoid build-time Firebase initialization
    const { KnowledgeRepository } = await import('@/lib/knowledge/repository');
    
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = createKnowledgeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const knowledgeData = validationResult.data;
    
    // Generate a slug from the title
    const baseSlug = generateSlug(knowledgeData.title);
    let slug = baseSlug;
    let iteration = 1;
    
    // Check if slug already exists, if so, append a number
    while (await KnowledgeRepository.slugExists(slug)) {
      slug = `${baseSlug}-${iteration}`;
      iteration++;
    }
    
    // Set publishedAt timestamp if status is PUBLISHED
    const now = new Date();
    const publishedAt = knowledgeData.status === KnowledgeStatus.PUBLISHED
      ? Timestamp.fromDate(now)
      : null;
    
    // Prepare knowledge content for storage
    const newKnowledgeData = {
      title: knowledgeData.title,
      slug,
      content: knowledgeData.content,
      contentType: knowledgeData.contentType,
      category: knowledgeData.category,
      tags: knowledgeData.tags || [],
      status: knowledgeData.status || KnowledgeStatus.DRAFT,
      accessLevel: knowledgeData.accessLevel || KnowledgeAccessLevel.PRIVATE,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      publishedAt,
      createdBy: adminUser.id,
      excerpt: knowledgeData.excerpt,
      seo: knowledgeData.seo,
      relatedContentIds: knowledgeData.relatedContentIds || [],
      vectorIds: [] // Will be populated if article is published and indexed
    };
    
    // Create the knowledge content
    const createdId = await KnowledgeRepository.create(newKnowledgeData, adminUser.id) as unknown as string;
    
    // Get the created content with ID
    const createdContent = await KnowledgeRepository.getById(createdId);
    
    if (!createdContent) {
      logger.error('Knowledge content created but not found when retrieving', { 
        id: createdId
      });
      
      return NextResponse.json(
        { 
          error: 'Knowledge content created but could not be retrieved',
          message: 'The knowledge content was created but could not be retrieved.'
        },
        { status: 500 }
      );
    }
    
    // Log admin action
    await logAdminAction(adminUser, 'CREATE_KNOWLEDGE', {
      id: createdId,
      title: createdContent.title,
      contentType: createdContent.contentType,
      status: createdContent.status
    });
    
    // Return success response with created content
    return NextResponse.json(
      { 
        message: 'Knowledge content created successfully', 
        content: formatKnowledgeForResponse(createdContent)
      },
      { status: 201 }
    );
  } catch (error) {
    // Log error details
    logger.error('Error in admin knowledge POST handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to create knowledge content',
        message: 'An unexpected error occurred while creating the knowledge content. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE handler for bulk deleting knowledge content
 * Requires IDs in the request body
 */
export const DELETE = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate that IDs array is provided
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: 'No knowledge content IDs provided for deletion' },
        { status: 400 }
      );
    }
    
    const ids = body.ids as string[];
    
    // Delete each knowledge content
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    for (const id of ids) {
      try {
        // Check if content exists
        const content = await KnowledgeRepository.getById(id);
        
        if (!content) {
          results.push({ 
            id, 
            success: false, 
            error: 'Knowledge content not found'
          });
          continue;
        }
        
        // Delete the content
        await KnowledgeRepository.delete(id);
        
        // Log admin action
        await logAdminAction(adminUser, 'DELETE_KNOWLEDGE', {
          id,
          title: content.title,
          contentType: content.contentType
        });
        
        results.push({ id, success: true });
      } catch (error) {
        logger.error('Error deleting knowledge content', {
          error: error instanceof Error ? error.message : String(error),
          id
        });
        
        results.push({ 
          id, 
          success: false, 
          error: 'Error deleting knowledge content'
        });
      }
    }
    
    // Check if all deletions were successful
    const allSuccessful = results.every(result => result.success);
    
    // Return response with results
    return NextResponse.json({
      message: allSuccessful
        ? 'All knowledge content deleted successfully'
        : 'Some knowledge content could not be deleted',
      results
    }, {
      status: allSuccessful ? 200 : 207 // Use 207 Multi-Status for partial success
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin knowledge DELETE handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to delete knowledge content',
        message: 'An unexpected error occurred while deleting the knowledge content. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});
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
  updateDoc, 
  deleteDoc, 
  setDoc,
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { z } from 'zod';
import { logger } from '@/lib/core/logging/logger';

// Collection name constants
const CONTENT_COLLECTION = 'content';
const AUDIT_LOGS_COLLECTION = 'auditLogs';

/**
 * Content status enum
 */
enum ContentStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

/**
 * Content type enum
 */
enum ContentType {
  POST = 'post',
  IMAGE = 'image',
  VIDEO = 'video',
  STORY = 'story',
  REEL = 'reel',
  ARTICLE = 'article',
  CAROUSEL = 'carousel'
}

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
 * Format content data for API response
 */
function formatContentForResponse(id: string, data: any) {
  return {
    id,
    title: data.title,
    description: data.description,
    type: data.type,
    status: data.status,
    platforms: data.platforms || [],
    content: data.content,
    assets: data.assets || [],
    tags: data.tags || [],
    categories: data.categories || [],
    userId: data.userId,
    organizationId: data.organizationId,
    metadata: data.metadata || {},
    metrics: data.metrics || {},
    publishedAt: data.publishedAt instanceof Timestamp 
      ? data.publishedAt.toDate().toISOString() 
      : data.publishedAt,
    scheduledAt: data.scheduledAt instanceof Timestamp 
      ? data.scheduledAt.toDate().toISOString() 
      : data.scheduledAt,
    createdAt: data.createdAt instanceof Timestamp 
      ? data.createdAt.toDate().toISOString() 
      : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp 
      ? data.updatedAt.toDate().toISOString() 
      : data.updatedAt
  };
}

/**
 * Validation schema for creating a new content item
 */
const createContentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum([
    ContentType.POST,
    ContentType.IMAGE,
    ContentType.VIDEO,
    ContentType.STORY,
    ContentType.REEL,
    ContentType.ARTICLE,
    ContentType.CAROUSEL
  ]),
  status: z.enum([
    ContentStatus.DRAFT,
    ContentStatus.SCHEDULED,
    ContentStatus.PUBLISHED,
    ContentStatus.ARCHIVED
  ]).default(ContentStatus.DRAFT),
  platforms: z.array(z.string()).optional(),
  content: z.string().optional(),
  assets: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    filename: z.string(),
    size: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    alt: z.string().optional()
  })).optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  userId: z.string().min(1, 'User ID is required'),
  organizationId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  publishedAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional()
});

/**
 * Validation schema for updating content
 */
const updateContentSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional().nullable(),
  type: z.enum([
    ContentType.POST,
    ContentType.IMAGE,
    ContentType.VIDEO,
    ContentType.STORY,
    ContentType.REEL,
    ContentType.ARTICLE,
    ContentType.CAROUSEL
  ]).optional(),
  status: z.enum([
    ContentStatus.DRAFT,
    ContentStatus.SCHEDULED,
    ContentStatus.PUBLISHED,
    ContentStatus.ARCHIVED
  ]).optional(),
  platforms: z.array(z.string()).optional(),
  content: z.string().optional().nullable(),
  assets: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    filename: z.string(),
    size: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    alt: z.string().optional()
  })).optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable()
});

/**
 * GET handler for listing content with pagination, filtering, and sorting
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '25');
    const page = parseInt(url.searchParams.get('page') || '1');
    const sortField = url.searchParams.get('sortField') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const status = url.searchParams.get('status') || null;
    const type = url.searchParams.get('type') || null;
    const userId = url.searchParams.get('userId') || null;
    const platform = url.searchParams.get('platform') || null;
    const category = url.searchParams.get('category') || null;
    const tag = url.searchParams.get('tag') || null;
    const search = url.searchParams.get('search') || '';
    const lastDocId = url.searchParams.get('lastDocId') || null;
    
    // Validate parameters
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'Invalid pageSize parameter. Must be between 1 and 100.' },
        { status: 400 }
      );
    }

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'Invalid page parameter. Must be greater than 0.' },
        { status: 400 }
      );
    }

    // Build query with filters
    let contentQuery: any = query(collection(firestore, CONTENT_COLLECTION));
    
    // Apply filters
    if (status) {
      contentQuery = query(contentQuery, where('status', '==', status));
    }
    
    if (type) {
      contentQuery = query(contentQuery, where('type', '==', type));
    }
    
    if (userId) {
      contentQuery = query(contentQuery, where('userId', '==', userId));
    }
    
    // Apply sorting
    contentQuery = query(contentQuery, orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc'));
    
    // Apply pagination using cursor if provided
    if (lastDocId) {
      try {
        const lastDocSnapshot = await getDoc(doc(firestore, CONTENT_COLLECTION, lastDocId));
        if (lastDocSnapshot.exists()) {
          contentQuery = query(contentQuery, startAfter(lastDocSnapshot));
        }
      } catch (error) {
        logger.warn('Invalid lastDocId provided for pagination', { lastDocId, error });
      }
    } else if (page > 1) {
      // Skip records if no cursor is provided but page is > 1
      contentQuery = query(contentQuery, limit((page - 1) * pageSize));
      const skipSnapshot = await getDocs(contentQuery);
      if (!skipSnapshot.empty) {
        const lastVisible = skipSnapshot.docs[skipSnapshot.docs.length - 1];
        contentQuery = query(
          collection(firestore, CONTENT_COLLECTION),
          orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc'),
          startAfter(lastVisible),
          limit(pageSize)
        );
      } else {
        // If we've skipped all documents, return empty array
        return NextResponse.json({ items: [], totalCount: 0, hasMore: false });
      }
    }
    
    // Apply final page size limit
    contentQuery = query(contentQuery, limit(pageSize));
    
    // Execute query
    const contentSnapshot = await getDocs(contentQuery);
    
    // Get total count (for pagination info)
    let totalCount = 0;
    let countQuery;
    
    if (status) {
      countQuery = query(collection(firestore, CONTENT_COLLECTION), where('status', '==', status));
    } else {
      countQuery = collection(firestore, CONTENT_COLLECTION);
    }
    
    try {
      const countSnapshot = await getDocs(countQuery);
      totalCount = countSnapshot.size;
    } catch (error) {
      logger.warn('Error getting total content count', { error });
    }
    
    // Format content data for response
    const items = contentSnapshot.docs
      .map(doc => formatContentForResponse(doc.id, doc.data()))
      // Apply client-side filtering for more complex filters
      .filter(item => {
        // Filter by platform
        if (platform && !item.platforms.includes(platform)) {
          return false;
        }
        
        // Filter by category
        if (category && !item.categories.includes(category)) {
          return false;
        }
        
        // Filter by tag
        if (tag && !item.tags.includes(tag)) {
          return false;
        }
        
        // Filter by search term
        if (search) {
          const searchLower = search.toLowerCase();
          return (
            item.title.toLowerCase().includes(searchLower) ||
            (item.description && item.description.toLowerCase().includes(searchLower)) ||
            (item.content && item.content.toLowerCase().includes(searchLower)) ||
            item.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
          );
        }
        
        return true;
      });
    
    // Calculate if there are more results
    const hasMore = !contentSnapshot.empty && items.length === pageSize;
    
    // Get the last document ID for cursor pagination
    const lastVisible = contentSnapshot.docs.length > 0 
      ? contentSnapshot.docs[contentSnapshot.docs.length - 1].id 
      : null;
    
    // Log admin action
    await logAdminAction(adminUser, 'LIST_CONTENT', {
      filters: { status, type, userId, platform, category, tag, search },
      pagination: { page, pageSize },
      sorting: { field: sortField, order: sortOrder },
      resultCount: items.length
    });
    
    // Return formatted response
    return NextResponse.json({
      items,
      pagination: {
        totalCount,
        pageSize,
        currentPage: page,
        hasMore,
        lastDocId: lastVisible
      }
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin content GET handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to retrieve content',
        message: 'An unexpected error occurred while retrieving content. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * POST handler for creating a new content item
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = createContentSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.format();
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    const contentData = validationResult.data;
    
    // Prepare data for Firestore
    const now = new Date();
    
    // Handle date fields
    let publishedAt = null;
    let scheduledAt = null;
    
    if (contentData.publishedAt) {
      publishedAt = Timestamp.fromDate(new Date(contentData.publishedAt));
    } else if (contentData.status === ContentStatus.PUBLISHED) {
      publishedAt = Timestamp.fromDate(now);
    }
    
    if (contentData.scheduledAt) {
      scheduledAt = Timestamp.fromDate(new Date(contentData.scheduledAt));
    }
    
    const firestoreData = {
      title: contentData.title,
      description: contentData.description || null,
      type: contentData.type,
      status: contentData.status,
      platforms: contentData.platforms || [],
      content: contentData.content || null,
      assets: contentData.assets || [],
      tags: contentData.tags || [],
      categories: contentData.categories || [],
      userId: contentData.userId,
      organizationId: contentData.organizationId || null,
      metadata: contentData.metadata || {},
      metrics: {},
      publishedAt,
      scheduledAt,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };
    
    // Add item to Firestore
    const docRef = await addDoc(collection(firestore, CONTENT_COLLECTION), firestoreData);
    
    // Log admin action
    await logAdminAction(adminUser, 'CREATE_CONTENT', {
      id: docRef.id,
      title: contentData.title,
      type: contentData.type,
      status: contentData.status
    });
    
    // Return success response
    return NextResponse.json(
      { 
        message: 'Content created successfully', 
        content: formatContentForResponse(docRef.id, firestoreData) 
      },
      { status: 201 }
    );
  } catch (error) {
    // Log error details
    logger.error('Error in admin content POST handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to create content',
        message: 'An unexpected error occurred while creating content. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH handler for updating content
 */
export const PATCH = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Ensure ID is provided
    if (!body.id) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      );
    }
    
    const id = body.id;
    delete body.id; // Remove ID from the data to be updated
    
    // Validate update data
    const validationResult = updateContentSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.format();
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    const updateData = validationResult.data;
    
    // Check if content exists
    const docRef = doc(firestore, CONTENT_COLLECTION, id);
    const docSnapshot = await getDoc(docRef);
    
    if (!docSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    const existingData = docSnapshot.data();
    
    // Prepare update data for Firestore
    const firestoreUpdateData: any = {
      ...updateData,
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    // Handle publishedAt field
    if (updateData.status === ContentStatus.PUBLISHED && 
        existingData.status !== ContentStatus.PUBLISHED && 
        !updateData.publishedAt) {
      // Automatically set publishedAt when status changes to published
      firestoreUpdateData.publishedAt = Timestamp.fromDate(new Date());
    } else if (updateData.publishedAt === null) {
      firestoreUpdateData.publishedAt = null;
    } else if (updateData.publishedAt) {
      firestoreUpdateData.publishedAt = Timestamp.fromDate(new Date(updateData.publishedAt));
    }
    
    // Handle scheduledAt field
    if (updateData.scheduledAt === null) {
      firestoreUpdateData.scheduledAt = null;
    } else if (updateData.scheduledAt) {
      firestoreUpdateData.scheduledAt = Timestamp.fromDate(new Date(updateData.scheduledAt));
    }
    
    // Update content in Firestore
    await updateDoc(docRef, firestoreUpdateData);
    
    // Get updated data
    const updatedDoc = await getDoc(docRef);
    const updatedData = updatedDoc.exists() ? updatedDoc.data() : existingData;
    
    // Log admin action
    await logAdminAction(adminUser, 'UPDATE_CONTENT', {
      id,
      title: updatedData.title,
      updatedFields: Object.keys(updateData),
      statusChange: updateData.status ? {
        from: existingData.status,
        to: updateData.status
      } : undefined
    });
    
    // Return success response
    return NextResponse.json({
      message: 'Content updated successfully',
      content: formatContentForResponse(id, updatedData)
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin content PATCH handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to update content',
        message: 'An unexpected error occurred while updating content. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE handler for removing content
 */
export const DELETE = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get ID from query params
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      );
    }
    
    // Check if content exists
    const docRef = doc(firestore, CONTENT_COLLECTION, id);
    const docSnapshot = await getDoc(docRef);
    
    if (!docSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    const contentData = docSnapshot.data();
    
    // Delete content from Firestore
    await deleteDoc(docRef);
    
    // Log admin action
    await logAdminAction(adminUser, 'DELETE_CONTENT', {
      id,
      title: contentData.title,
      type: contentData.type,
      status: contentData.status
    });
    
    // Return success response
    return NextResponse.json({
      message: 'Content deleted successfully'
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin content DELETE handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to delete content',
        message: 'An unexpected error occurred while deleting content. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});
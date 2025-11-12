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
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { z } from 'zod';
import { logger } from '@/lib/core/logging/logger';

// Collection name constants
const KNOWLEDGE_BASE_COLLECTION = 'knowledgeBase';
const KNOWLEDGE_CONTENT_COLLECTION = 'knowledgeContent';
const AUDIT_LOGS_COLLECTION = 'auditLogs';

/**
 * Knowledge base category status enum
 */
enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
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
 * Format category data for API response
 */
function formatCategoryForResponse(id: string, data: any) {
  return {
    id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    parentId: data.parentId,
    status: data.status,
    order: data.order,
    metadata: data.metadata || {},
    contentCount: data.contentCount || 0,
    createdAt: data.createdAt instanceof Timestamp 
      ? data.createdAt.toDate().toISOString() 
      : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp 
      ? data.updatedAt.toDate().toISOString() 
      : data.updatedAt
  };
}

/**
 * Generate a slug from a category name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

/**
 * Validation schema for creating a new category
 */
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
  status: z.enum([
    CategoryStatus.ACTIVE,
    CategoryStatus.INACTIVE,
    CategoryStatus.ARCHIVED
  ]).default(CategoryStatus.ACTIVE),
  order: z.number().int().optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Validation schema for updating a category
 */
const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  status: z.enum([
    CategoryStatus.ACTIVE,
    CategoryStatus.INACTIVE,
    CategoryStatus.ARCHIVED
  ]).optional(),
  order: z.number().int().optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * GET handler for listing categories with pagination, filtering, and sorting
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const sortField = url.searchParams.get('sortField') || 'order';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';
    const status = url.searchParams.get('status') || null;
    const parentId = url.searchParams.get('parentId') || null;
    const search = url.searchParams.get('search') || '';
    const lastDocId = url.searchParams.get('lastDocId') || null;
    const includeContentCount = url.searchParams.get('includeContentCount') === 'true';
    
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
    let categoriesQuery: any = query(collection(firestore, KNOWLEDGE_BASE_COLLECTION));
    
    // Apply filters
    if (status) {
      categoriesQuery = query(categoriesQuery, where('status', '==', status));
    }
    
    if (parentId === 'null' || parentId === 'undefined') {
      // Get root-level categories
      categoriesQuery = query(categoriesQuery, where('parentId', '==', null));
    } else if (parentId) {
      // Get child categories of a specific parent
      categoriesQuery = query(categoriesQuery, where('parentId', '==', parentId));
    }
    
    // Apply sorting
    categoriesQuery = query(categoriesQuery, orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc'));
    
    // Apply secondary sorting by name for consistent ordering
    if (sortField !== 'name') {
      categoriesQuery = query(categoriesQuery, orderBy('name', 'asc'));
    }
    
    // Apply pagination using cursor if provided
    if (lastDocId) {
      try {
        const lastDocSnapshot = await getDoc(doc(firestore, KNOWLEDGE_BASE_COLLECTION, lastDocId));
        if (lastDocSnapshot.exists()) {
          categoriesQuery = query(categoriesQuery, startAfter(lastDocSnapshot));
        }
      } catch (error) {
        logger.warn('Invalid lastDocId provided for pagination', { lastDocId, error });
      }
    } else if (page > 1) {
      // Skip records if no cursor is provided but page is > 1
      categoriesQuery = query(categoriesQuery, limit((page - 1) * pageSize));
      const skipSnapshot = await getDocs(categoriesQuery);
      if (!skipSnapshot.empty) {
        const lastVisible = skipSnapshot.docs[skipSnapshot.docs.length - 1];
        categoriesQuery = query(
          collection(firestore, KNOWLEDGE_BASE_COLLECTION),
          orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc'),
          startAfter(lastVisible),
          limit(pageSize)
        );
      } else {
        // If we've skipped all documents, return empty array
        return NextResponse.json({ categories: [], totalCount: 0, hasMore: false });
      }
    }
    
    // Apply final page size limit
    categoriesQuery = query(categoriesQuery, limit(pageSize));
    
    // Execute query
    const categoriesSnapshot = await getDocs(categoriesQuery);
    
    // Get total count (for pagination info)
    let totalCount = 0;
    let countQuery;
    
    if (status) {
      countQuery = query(collection(firestore, KNOWLEDGE_BASE_COLLECTION), where('status', '==', status));
    } else if (parentId === 'null' || parentId === 'undefined') {
      countQuery = query(collection(firestore, KNOWLEDGE_BASE_COLLECTION), where('parentId', '==', null));
    } else if (parentId) {
      countQuery = query(collection(firestore, KNOWLEDGE_BASE_COLLECTION), where('parentId', '==', parentId));
    } else {
      countQuery = collection(firestore, KNOWLEDGE_BASE_COLLECTION);
    }
    
    try {
      const countSnapshot = await getDocs(countQuery);
      totalCount = countSnapshot.size;
    } catch (error) {
      logger.warn('Error getting total category count', { error });
    }
    
    // Get content counts if requested
    let contentCounts: Record<string, number> = {};
    
    if (includeContentCount) {
      const ids = categoriesSnapshot.docs.map(doc => doc.id);
      
      if (ids.length > 0) {
        try {
          // Count content for each category
          for (const categoryId of ids) {
            const contentCountQuery = query(
              collection(firestore, KNOWLEDGE_CONTENT_COLLECTION),
              where('category', '==', categoryId)
            );
            
            const contentSnapshot = await getDocs(contentCountQuery);
            contentCounts[categoryId] = contentSnapshot.size;
          }
        } catch (error) {
          logger.warn('Error getting content counts', { error });
        }
      }
    }
    
    // Format category data for response
    const categories = categoriesSnapshot.docs
      .map(doc => {
        const data: any = doc.data();
        if (includeContentCount) {
          data.contentCount = contentCounts[doc.id] || 0;
        }
        return formatCategoryForResponse(doc.id, data);
      })
      // Apply search filter if provided
      .filter(category => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
          category.name.toLowerCase().includes(searchLower) ||
          category.slug.toLowerCase().includes(searchLower) ||
          (category.description && category.description.toLowerCase().includes(searchLower))
        );
      });
    
    // Calculate if there are more results
    const hasMore = !categoriesSnapshot.empty && categories.length === pageSize;
    
    // Get the last document ID for cursor pagination
    const lastVisible = categoriesSnapshot.docs.length > 0 
      ? categoriesSnapshot.docs[categoriesSnapshot.docs.length - 1].id 
      : null;
    
    // Log admin action
    await logAdminAction(adminUser, 'LIST_KNOWLEDGE_BASE_CATEGORIES', {
      filters: { status, parentId, search },
      pagination: { page, pageSize },
      sorting: { field: sortField, order: sortOrder },
      resultCount: categories.length
    });
    
    // Return formatted response
    return NextResponse.json({
      categories,
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
    logger.error('Error in admin knowledge-base GET handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to retrieve knowledge base categories',
        message: 'An unexpected error occurred while retrieving categories. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * POST handler for creating a new category
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = createCategorySchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.format();
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    const categoryData = validationResult.data;
    
    // Generate slug if not provided
    if (!categoryData.slug) {
      categoryData.slug = generateSlug(categoryData.name);
    }
    
    // Check if the category with the same slug already exists
    const slugCheckQuery = query(
      collection(firestore, KNOWLEDGE_BASE_COLLECTION),
      where('slug', '==', categoryData.slug)
    );
    
    const slugCheck = await getDocs(slugCheckQuery);
    
    if (!slugCheck.empty) {
      return NextResponse.json(
        { error: 'A category with this slug already exists' },
        { status: 409 }
      );
    }
    
    // Validate parent category if provided
    if (categoryData.parentId) {
      const parentDoc = await getDoc(doc(firestore, KNOWLEDGE_BASE_COLLECTION, categoryData.parentId));
      
      if (!parentDoc.exists()) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        );
      }
    }
    
    // Prepare data for Firestore
    const now = new Date();
    const firestoreData = {
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description || null,
      parentId: categoryData.parentId || null,
      status: categoryData.status || CategoryStatus.ACTIVE,
      order: categoryData.order !== undefined ? categoryData.order : 0,
      metadata: categoryData.metadata || {},
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: adminUser.id
    };
    
    // Add item to Firestore
    const docRef = await addDoc(collection(firestore, KNOWLEDGE_BASE_COLLECTION), firestoreData);
    
    // Log admin action
    await logAdminAction(adminUser, 'CREATE_KNOWLEDGE_BASE_CATEGORY', {
      id: docRef.id,
      name: categoryData.name,
      slug: categoryData.slug,
      parentId: categoryData.parentId
    });
    
    // Return success response
    return NextResponse.json(
      { 
        message: 'Category created successfully', 
        category: formatCategoryForResponse(docRef.id, firestoreData) 
      },
      { status: 201 }
    );
  } catch (error) {
    // Log error details
    logger.error('Error in admin knowledge-base POST handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to create category',
        message: 'An unexpected error occurred while creating the category. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH handler for updating a category
 */
export const PATCH = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Ensure ID is provided
    if (!body.id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    const id = body.id;
    delete body.id; // Remove ID from the data to be updated
    
    // Validate update data
    const validationResult = updateCategorySchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.format();
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    const updateData = validationResult.data;
    
    // Check if category exists
    const docRef = doc(firestore, KNOWLEDGE_BASE_COLLECTION, id);
    const docSnapshot = await getDoc(docRef);
    
    if (!docSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    const existingData = docSnapshot.data();
    
    // Generate slug if name is updated and slug is not provided
    if (updateData.name && !updateData.slug && updateData.name !== existingData.name) {
      updateData.slug = generateSlug(updateData.name);
    }
    
    // Check if the new slug already exists (if slug is being updated)
    if (updateData.slug && updateData.slug !== existingData.slug) {
      const slugCheckQuery = query(
        collection(firestore, KNOWLEDGE_BASE_COLLECTION),
        where('slug', '==', updateData.slug)
      );
      
      const slugCheck = await getDocs(slugCheckQuery);
      
      if (!slugCheck.empty && slugCheck.docs[0].id !== id) {
        return NextResponse.json(
          { error: 'A category with this slug already exists' },
          { status: 409 }
        );
      }
    }
    
    // Check for circular references if updating parentId
    if (updateData.parentId && updateData.parentId !== existingData.parentId) {
      // Don't allow setting self as parent
      if (updateData.parentId === id) {
        return NextResponse.json(
          { error: 'A category cannot be its own parent' },
          { status: 400 }
        );
      }
      
      // Check if parent exists
      const parentDoc = await getDoc(doc(firestore, KNOWLEDGE_BASE_COLLECTION, updateData.parentId));
      
      if (!parentDoc.exists()) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        );
      }
      
      // Check for circular references
      let currentParentId = parentDoc.data().parentId;
      let depth = 0;
      const maxDepth = 10; // Prevent infinite loops
      
      while (currentParentId && depth < maxDepth) {
        if (currentParentId === id) {
          return NextResponse.json(
            { error: 'Circular reference detected - cannot set a descendant as parent' },
            { status: 400 }
          );
        }
        
        const parentDoc = await getDoc(doc(firestore, KNOWLEDGE_BASE_COLLECTION, currentParentId));
        
        if (!parentDoc.exists()) {
          break;
        }
        
        currentParentId = parentDoc.data().parentId;
        depth++;
      }
    }
    
    // Prepare update data for Firestore
    const firestoreUpdateData = {
      ...updateData,
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    // Update category in Firestore
    await updateDoc(docRef, firestoreUpdateData);
    
    // Get updated data
    const updatedDoc = await getDoc(docRef);
    const updatedData = updatedDoc.exists() ? updatedDoc.data() : existingData;
    
    // Log admin action
    await logAdminAction(adminUser, 'UPDATE_KNOWLEDGE_BASE_CATEGORY', {
      id,
      name: updatedData.name,
      updatedFields: Object.keys(updateData),
      statusChange: updateData.status ? {
        from: existingData.status,
        to: updateData.status
      } : undefined
    });
    
    // Return success response
    return NextResponse.json({
      message: 'Category updated successfully',
      category: formatCategoryForResponse(id, updatedData)
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin knowledge-base PATCH handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to update category',
        message: 'An unexpected error occurred while updating the category. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE handler for removing a category
 */
export const DELETE = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get ID from query params
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    // Check if category exists
    const docRef = doc(firestore, KNOWLEDGE_BASE_COLLECTION, id);
    const docSnapshot = await getDoc(docRef);
    
    if (!docSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    const categoryData = docSnapshot.data();
    
    // Check if the category has content
    const contentQuery = query(
      collection(firestore, KNOWLEDGE_CONTENT_COLLECTION),
      where('category', '==', id),
      limit(1)
    );
    
    const contentSnapshot = await getDocs(contentQuery);
    
    if (!contentSnapshot.empty) {
      return NextResponse.json(
        { 
          error: 'Cannot delete category with content',
          message: 'This category has associated content. Please remove or reassign the content before deleting this category.'
        },
        { status: 400 }
      );
    }
    
    // Check if the category has subcategories
    const subcategoryQuery = query(
      collection(firestore, KNOWLEDGE_BASE_COLLECTION),
      where('parentId', '==', id),
      limit(1)
    );
    
    const subcategorySnapshot = await getDocs(subcategoryQuery);
    
    if (!subcategorySnapshot.empty) {
      return NextResponse.json(
        { 
          error: 'Cannot delete category with subcategories',
          message: 'This category has subcategories. Please remove or reassign the subcategories before deleting this category.'
        },
        { status: 400 }
      );
    }
    
    // Delete category from Firestore
    await deleteDoc(docRef);
    
    // Log admin action
    await logAdminAction(adminUser, 'DELETE_KNOWLEDGE_BASE_CATEGORY', {
      id,
      name: categoryData.name,
      status: categoryData.status
    });
    
    // Return success response
    return NextResponse.json({
      message: 'Category deleted successfully'
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin knowledge-base DELETE handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to delete category',
        message: 'An unexpected error occurred while deleting the category. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import ForumService from '@/lib/features/content/ForumService';
import { logger } from '@/lib/core/logging/logger';
import { z } from 'zod';
import { getCurrentUser, isAdmin } from '@/lib/features/auth/token';
import { UserRole } from '@/lib/core/models/User';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { getCategories } from '@/lib/features/forum/categories';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Schema for category creation
const createCategorySchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().min(10).max(500),
  iconName: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional()
});

// Schema for category update
const updateCategorySchema = z.object({
  name: z.string().min(3).max(50).optional(),
  description: z.string().min(10).max(500).optional(),
  iconName: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional()
});

// Helper to check if user is admin
async function checkUserIsAdmin(userId: string): Promise<boolean> {
  try {
    // First check if the user exists
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (!userDoc.exists()) {
      logger.warn(`User not found during admin check: ${userId}`);
      return false;
    }
    
    const userData = userDoc.data();
    const userRole = userData?.role;
    
    // Check if user has ADMIN or SUPER_ADMIN role
    return userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
  } catch (error) {
    logger.error(`Error checking if user is admin: ${userId}`, error);
    return false;
  }
}

/**
 * GET handler - List all categories or get a specific category by slug
 */
export async function GET() {
  try {
    // Fetch forum categories from the database
    const categories = await getCategories();
    
    return NextResponse.json({ 
      success: true, 
      categories
    });
  } catch (error) {
    console.error('Error fetching forum categories:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch forum categories' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Create a new category (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user ID - use email as unique identifier if id is not available
    const userId = (session.user as any).id || session.user.email || 'unknown';
    
    // Check if user is admin
    if (!(await checkUserIsAdmin(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    const validationResult = createCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, description, iconName, color, sortOrder } = validationResult.data;
    
    // Create the category
    const category = await ForumService.createCategory(
      name,
      description,
      userId,
      {
        iconName,
        color,
        sortOrder
      }
    );
    
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/forum/categories', error);
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

/**
 * Route handlers for specific category ID
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const categoryId = params.id;
    
    const session = await getServerSession();
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user ID - use email as unique identifier if id is not available
    const userId = (session.user as any).id || session.user.email || 'unknown';
    
    // Check if user is admin
    if (!(await checkUserIsAdmin(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    const validationResult = updateCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Update the category
    const category = await ForumService.updateCategory(categoryId, validationResult.data);
    
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    return NextResponse.json({ category });
  } catch (error) {
    logger.error(`Error in PUT /api/forum/categories/${params.id}`, error);
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Delete a category (admin only)
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const categoryId = params.id;
    
    const session = await getServerSession();
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user ID - use email as unique identifier if id is not available
    const userId = (session.user as any).id || session.user.email || 'unknown';
    
    // Check if user is admin
    if (!(await checkUserIsAdmin(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete the category
    const success = await ForumService.deleteCategory(categoryId);
    
    if (!success) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`Error in DELETE /api/forum/categories/${params.id}`, error);
    
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import ForumService from '@/lib/features/content/ForumService';
import { logger } from '@/lib/core/logging/logger';
import { z } from 'zod';
import { ForumPostStatus } from '@/lib/features/content/models/post';
import { getCurrentUser, isAdmin } from '@/lib/features/auth/token';
import { UserRole } from '@/lib/core/models/User';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Schema for post creation
const createPostSchema = z.object({
  title: z.string().min(5).max(150),
  content: z.string().min(20).max(20000),
  categoryId: z.string().uuid(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isAnnouncement: z.boolean().optional()
});

// Schema for post update
const updatePostSchema = z.object({
  title: z.string().min(5).max(150).optional(),
  content: z.string().min(20).max(20000).optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  status: z.nativeEnum(ForumPostStatus).optional(),
  isPinned: z.boolean().optional(),
  isAnnouncement: z.boolean().optional(),
  isSolved: z.boolean().optional()
});

// Schema for post filters
const filterPostsSchema = z.object({
  categoryId: z.string().optional(),
  authorId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.nativeEnum(ForumPostStatus).optional(),
  isPinned: z.boolean().optional(),
  isAnnouncement: z.boolean().optional(),
  isSolved: z.boolean().optional(),
  searchQuery: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastCommentAt', 'commentCount', 'viewCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

// Helper to check if user is admin
async function checkUserIsAdmin(userId: string): Promise<boolean> {
  try {
    // First check if the user exists
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (!userDoc.exists()) {
      logger.warn(`User not found during admin check: ${userId}`);
      return false;
    }
    
    const userData = userDoc.data();
    const userRole = userData?.role;
    
    // Check if user has ADMIN or SUPER_ADMIN role (IriSync platform admin)
    return userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
  } catch (error) {
    logger.error(`Error checking if user is admin: ${userId}`, error);
    return false;
  }
}

/**
 * GET handler - List posts or get a specific post by slug
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (slug) {
      // Get a specific post by slug
      const post = await ForumService.getPostBySlug(slug);
      
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      
      // Get comments for this post
      const comments = await ForumService.getCommentsByPostId(post.id);
      
      // Increment view count
      await ForumService.incrementViewCount(post.id);
      
      return NextResponse.json({ post, comments });
    } else {
      // Parse filter parameters
      const filterParams: Record<string, any> = {};
      
      // Extract parameters from query string
      if (searchParams.has('categoryId')) filterParams.categoryId = searchParams.get('categoryId');
      if (searchParams.has('authorId')) filterParams.authorId = searchParams.get('authorId');
      if (searchParams.has('searchQuery')) filterParams.searchQuery = searchParams.get('searchQuery');
      if (searchParams.has('isPinned')) filterParams.isPinned = searchParams.get('isPinned') === 'true';
      if (searchParams.has('isAnnouncement')) filterParams.isAnnouncement = searchParams.get('isAnnouncement') === 'true';
      if (searchParams.has('isSolved')) filterParams.isSolved = searchParams.get('isSolved') === 'true';
      if (searchParams.has('sortBy')) filterParams.sortBy = searchParams.get('sortBy');
      if (searchParams.has('sortOrder')) filterParams.sortOrder = searchParams.get('sortOrder');
      if (searchParams.has('limit')) filterParams.limit = parseInt(searchParams.get('limit') || '10', 10);
      if (searchParams.has('offset')) filterParams.offset = parseInt(searchParams.get('offset') || '0', 10);
      
      // Handle tags as a comma-separated string
      if (searchParams.has('tags')) {
        const tagsString = searchParams.get('tags');
        if (tagsString) {
          filterParams.tags = tagsString.split(',');
        }
      }
      
      // Validate filters
      const validationResult = filterPostsSchema.safeParse(filterParams);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid filter parameters', details: validationResult.error.format() },
          { status: 400 }
        );
      }
      
      // Get trending posts for the main page
      if (searchParams.has('trending') && searchParams.get('trending') === 'true') {
        const categoryId = searchParams.get('categoryId') || undefined;
        const limit = searchParams.has('limit') 
          ? parseInt(searchParams.get('limit') || '10', 10) 
          : 10;
          
        const posts = await ForumService.getTrendingPosts(categoryId, limit);
        return NextResponse.json({ posts });
      }
      
      // Get posts with filters
      const { posts, total } = await ForumService.getPosts(validationResult.data);
      return NextResponse.json({ posts, total });
    }
  } catch (error) {
    logger.error('Error in GET /api/forum/posts', error);
    return NextResponse.json(
      { error: 'Failed to get posts' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Create a new post
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user info
    const userId = (session.user as any).id || session.user.email || 'unknown';
    const userName = session.user.name || 'Anonymous';
    const userAvatar = session.user.image;
    
    // Parse and validate request body
    const body = await request.json();
    
    const validationResult = createPostSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Check if user is admin for pinned/announcement posts
    if ((validationResult.data.isPinned || validationResult.data.isAnnouncement) && !(await checkUserIsAdmin(userId))) {
      return NextResponse.json({ error: 'Forbidden: Only admins can create pinned or announcement posts' }, { status: 403 });
    }
    
    // Create the post
    const post = await ForumService.createPost(
      validationResult.data,
      userId,
      userName,
      userAvatar || undefined
    );
    
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/forum/posts', error);
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('Category not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}

/**
 * Route handler for a specific post ID
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const postId = params.id;
    
    const session = await getServerSession();
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user ID
    const userId = (session.user as any).id || session.user.email || 'unknown';
    
    // Parse and validate request body
    const body = await request.json();
    
    const validationResult = updatePostSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Check if user is admin for certain operations
    const requiresAdmin = 
      validationResult.data.isPinned !== undefined || 
      validationResult.data.isAnnouncement !== undefined ||
      validationResult.data.status !== undefined;
      
    if (requiresAdmin && !(await checkUserIsAdmin(userId))) {
      return NextResponse.json({ error: 'Forbidden: Admin privileges required for this operation' }, { status: 403 });
    }
    
    // Update the post
    const post = await ForumService.updatePost(postId, validationResult.data, userId);
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    return NextResponse.json({ post });
  } catch (error) {
    logger.error(`Error in PUT /api/forum/posts/${params.id}`, error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes('Category not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Delete a post
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const postId = params.id;
    
    const session = await getServerSession();
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user ID
    const userId = (session.user as any).id || session.user.email || 'unknown';
    
    // Delete the post
    const success = await ForumService.deletePost(postId, userId);
    
    if (!success) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`Error in DELETE /api/forum/posts/${params.id}`, error);
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
} 
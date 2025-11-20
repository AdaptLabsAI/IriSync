import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';
import { BlogPost, BlogPostStatus } from '@/lib/blog/models';
import { z } from 'zod';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Validation schema for updating blog posts
const updateBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  excerpt: z.string().min(1, 'Excerpt is required').optional(),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().url().optional(),
  status: z.enum([BlogPostStatus.DRAFT, BlogPostStatus.PUBLISHED, BlogPostStatus.ARCHIVED]).optional(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    ogImage: z.string().url().optional()
  }).optional()
});

/**
 * Calculate estimated read time based on content length
 */
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Check if user has admin or editor privileges
 */
async function checkBlogAccess(userId: string): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) {
    console.error('Firestore not configured');
    return false;
  }
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return false;
  
  const userData = userDoc.data();
  const role = userData.role;
  return role === 'admin' || role === 'super_admin' || role === 'editor';
}

/**
 * Format blog post for API response
 */
function formatBlogPost(id: string, data: any): BlogPost {
  return {
    id,
    title: data.title,
    slug: data.slug,
    content: data.content,
    excerpt: data.excerpt,
    author: data.author,
    publishedAt: data.publishedAt,
    updatedAt: data.updatedAt,
    createdAt: data.createdAt,
    status: data.status,
    tags: data.tags || [],
    featuredImage: data.featuredImage,
    readTime: data.readTime,
    seo: data.seo
  };
}

/**
 * GET - Retrieve a specific blog post
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getFirebaseFirestore();
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const postDoc = await getDoc(doc(db, 'blogPosts', params.id));
    
    if (!postDoc.exists()) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    const post = formatBlogPost(params.id, postDoc.data());
    return NextResponse.json(post);

  } catch (error) {
    logger.error('Error fetching blog post', { error, postId: params.id });
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a blog post
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check blog access
    const hasBlogAccess = await checkBlogAccess(session.user.id);
    if (!hasBlogAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Blog access required' },
        { status: 403 }
      );
    }

    // Check if post exists
    const db = getFirebaseFirestore();
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const postRef = doc(db, 'blogPosts', params.id);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateBlogPostSchema.parse(body);

    // Build update data
    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    // Add fields that are being updated
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.content !== undefined) {
      updateData.content = validatedData.content;
      updateData.readTime = calculateReadTime(validatedData.content);
    }
    if (validatedData.excerpt !== undefined) updateData.excerpt = validatedData.excerpt;
    if (validatedData.tags !== undefined) updateData.tags = validatedData.tags;
    if (validatedData.featuredImage !== undefined) updateData.featuredImage = validatedData.featuredImage;
    if (validatedData.seo !== undefined) updateData.seo = validatedData.seo;
    
    // Handle status changes
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      
      const currentData = postDoc.data();
      
      // If changing to published and wasn't published before, set publishedAt
      if (validatedData.status === BlogPostStatus.PUBLISHED && 
          currentData.status !== BlogPostStatus.PUBLISHED) {
        updateData.publishedAt = serverTimestamp();
      }
      
      // If changing from published to draft/archived, keep publishedAt
      // (This preserves the original publish date for historical purposes)
    }

    // Update the post
    await updateDoc(postRef, updateData);

    // Fetch and return updated post
    const updatedPostDoc = await getDoc(postRef);
    const updatedPost = formatBlogPost(params.id, updatedPostDoc.data());

    logger.info('Blog post updated', { 
      postId: params.id, 
      updatedFields: Object.keys(validatedData),
      authorId: session.user.id 
    });

    return NextResponse.json(updatedPost);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error updating blog post', { error, postId: params.id });
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a blog post (soft delete by archiving)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check blog access
    const hasBlogAccess = await checkBlogAccess(session.user.id);
    if (!hasBlogAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Blog access required' },
        { status: 403 }
      );
    }

    // Check if post exists
    const db = getFirebaseFirestore();
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const postRef = doc(db, 'blogPosts', params.id);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check if we should soft delete (archive) or hard delete
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    if (hardDelete) {
      // Hard delete - actually remove the document
      await deleteDoc(postRef);
      
      logger.info('Blog post hard deleted', { 
        postId: params.id, 
        authorId: session.user.id 
      });

      return NextResponse.json({ 
        message: 'Blog post permanently deleted',
        deleted: true,
        hard: true
      });
    } else {
      // Soft delete - archive the post
      await updateDoc(postRef, {
        status: BlogPostStatus.ARCHIVED,
        archivedAt: serverTimestamp(),
        archivedBy: session.user.id,
        updatedAt: serverTimestamp()
      });

      logger.info('Blog post archived', { 
        postId: params.id, 
        authorId: session.user.id 
      });

      return NextResponse.json({ 
        message: 'Blog post archived',
        archived: true,
        hard: false
      });
    }

  } catch (error) {
    logger.error('Error deleting blog post', { error, postId: params.id });
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }
} 
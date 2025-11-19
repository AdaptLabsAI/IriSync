import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp
} from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';
import { BlogPost, BlogPostStatus, BlogPostMetadata } from '@/lib/blog/models';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schemas
const createBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().min(1, 'Excerpt is required'),
  tags: z.array(z.string()).default([]),
  featuredImage: z.string().url().optional(),
  status: z.enum([BlogPostStatus.DRAFT, BlogPostStatus.PUBLISHED, BlogPostStatus.ARCHIVED]).default(BlogPostStatus.DRAFT),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    ogImage: z.string().url().optional()
  }).optional()
});

const updateBlogPostSchema = createBlogPostSchema.partial();

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

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
  const userDoc = await getDoc(doc(firestore, 'users', userId));
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
 * GET - Retrieve blog posts with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const sortField = searchParams.get('sortField') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const lastDocId = searchParams.get('lastDoc');

    // Build query
    let blogQuery = collection(firestore, 'blogPosts');
    
    const constraints: any[] = [];
    
    // Add status filter if provided
    if (status && Object.values(BlogPostStatus).includes(status as BlogPostStatus)) {
      constraints.push(where('status', '==', status));
    }
    
    // Add ordering
    constraints.push(orderBy(sortField, sortOrder as 'asc' | 'desc'));
    
    // Add limit
    constraints.push(limit(limitParam));
    
    // Add cursor for pagination if provided
    if (lastDocId) {
      const lastDoc = await getDoc(doc(firestore, 'blogPosts', lastDocId));
      if (lastDoc.exists()) {
        constraints.push(startAfter(lastDoc));
      }
    }

    const finalQuery = query(blogQuery, ...constraints);
    const snapshot = await getDocs(finalQuery);
    
    const posts: BlogPost[] = [];
    let lastDoc: any = null;
    
    snapshot.forEach((doc) => {
      posts.push(formatBlogPost(doc.id, doc.data()));
      lastDoc = doc;
    });

    return NextResponse.json({
      posts,
      hasMore: posts.length === limitParam,
      lastDoc: lastDoc?.id || null
    });

  } catch (error) {
    logger.error('Error fetching blog posts', { error });
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new blog post
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = createBlogPostSchema.parse(body);

    // Generate slug from title
    const baseSlug = generateSlug(validatedData.title);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness
    while (true) {
      const existingPost = await getDocs(
        query(collection(firestore, 'blogPosts'), where('slug', '==', slug))
      );
      
      if (existingPost.empty) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Calculate read time
    const readTime = calculateReadTime(validatedData.content);

    // Get author info
    const userDoc = await getDoc(doc(firestore, 'users', session.user.id));
    const userData = userDoc.data();
    
    const author = {
      id: session.user.id,
      name: `${userData?.firstName} ${userData?.lastName}` || session.user.email || 'Unknown Author',
      avatar: userData?.profileImageUrl
    };

    // Create blog post
    const blogPostData = {
      title: validatedData.title,
      slug,
      content: validatedData.content,
      excerpt: validatedData.excerpt,
      author,
      status: validatedData.status,
      tags: validatedData.tags,
      featuredImage: validatedData.featuredImage,
      readTime,
      seo: validatedData.seo,
      publishedAt: validatedData.status === BlogPostStatus.PUBLISHED ? serverTimestamp() : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = doc(collection(firestore, 'blogPosts'));
    await setDoc(docRef, blogPostData);

    // Return the created post
    const createdPost = await getDoc(docRef);
    const responsePost = formatBlogPost(docRef.id, createdPost.data());

    logger.info('Blog post created', { 
      postId: docRef.id, 
      title: validatedData.title, 
      authorId: session.user.id 
    });

    return NextResponse.json(responsePost, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error creating blog post', { error });
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
} 
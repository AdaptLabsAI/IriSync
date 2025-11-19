import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication, handleApiError } from '@/lib/features/auth/utils';
import { PlatformType, AttachmentType } from '@/lib/features/platforms/client';
import { getFirestore, serverTimestamp } from '@/lib/core/firebase/admin';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * GET handler for retrieving content posts
 */
export async function GET(request: NextRequest) {
  const startTime = process.hrtime();
  try {
    // Verify user authentication
    const userId = await verifyAuthentication(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get('platformId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = searchParams.get('sortBy') || 'scheduledFor';
    const sortDir = searchParams.get('sortDir') || 'desc';
    
    // Initialize Firestore query
    const firestore = getFirestore();
    let query: any = firestore.collection('users').doc(userId).collection('posts');
    
    // Apply filters if provided
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Apply sorting
    query = query.orderBy(sortBy, sortDir === 'desc' ? 'desc' : 'asc');
    
    // Apply pagination
    query = query.limit(limit).offset(offset);
    
    // Execute query
    const snapshot = await query.get();
    
    // Transform results
    let posts = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        content: data.content,
        platformIds: data.platformIds || [],
        scheduledFor: data.scheduledFor?.toDate?.() || data.scheduledFor,
        status: data.status,
        attachments: data.attachments || [],
        hashtags: data.hashtags || [],
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    });
    
    // Additional filter for platformId (more efficient to do in memory for this case)
    if (platformId) {
      posts = posts.filter((post: any) => 
        post.platformIds.includes(platformId)
      );
    }
    
    // Get total count for pagination info
    const countSnapshot = await firestore.collection('users').doc(userId).collection('posts').count().get();
    const total = countSnapshot.data().count;
    
    // Log success and return result
    logger.info('Info operation', { userId, 
      method: 'GET', 
      path: '/api/content/posts', 
      filters: { platformId, status }, 
      resultCount: posts.length 
    });
    
    return NextResponse.json({
      posts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + posts.length < total
      }
    });
  } catch (error) {
    console.error('Error getting posts:', error);
    const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
    
    logger.error('Error occurred', { error: errorMsg, 
      method: 'GET', 
      path: '/api/content/posts' 
    });
    
    return NextResponse.json(
      handleApiError(error, '/api/content/posts', 'retrieving posts'),
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new content post
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const userId = await verifyAuthentication(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.content && (!body.attachments || body.attachments.length === 0)) {
      return NextResponse.json(
        { error: 'Content or attachments are required' },
        { status: 400 }
      );
    }
    
    if (!body.platformIds || body.platformIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one platform must be selected' },
        { status: 400 }
      );
    }
    
    // Initialize Firestore
    const firestore = getFirestore();
    
    // Create new post document
    const newPost = {
      content: body.content || '',
      platformIds: body.platformIds,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : new Date(),
      status: body.scheduledFor ? 'scheduled' : 'draft',
      attachments: body.attachments || [],
      hashtags: body.hashtags || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userId: userId,
      publishedUrl: null,
      analytics: {
        impressions: 0,
        engagements: 0,
        clicks: 0,
        shares: 0,
        lastUpdated: null
      }
    };
    
    // Add post to Firestore
    const docRef = await firestore.collection('users').doc(userId).collection('posts').add(newPost);
    
    // Update media usage counts if attachments are present
    if (body.attachments && body.attachments.length > 0) {
      const mediaUpdates = body.attachments
        .filter((attachment: any) => attachment.id)
        .map(async (attachment: any) => {
          const mediaRef = firestore.collection('users').doc(userId).collection('media').doc(attachment.id);
          return firestore.runTransaction(async (transaction) => {
            const mediaDoc = await transaction.get(mediaRef);
            if (mediaDoc.exists) {
              const currentCount = mediaDoc.data()?.usageCount || 0;
              transaction.update(mediaRef, { usageCount: currentCount + 1 });
            }
          });
        });
      
      await Promise.all(mediaUpdates);
    }
    
    // Create activity log entry
    await firestore.collection('users').doc(userId).collection('activity').add({
      action: 'create_post',
      resourceId: docRef.id,
      resourceType: 'post',
      timestamp: serverTimestamp(),
      details: {
        platformIds: body.platformIds,
        scheduledFor: body.scheduledFor,
        status: body.scheduledFor ? 'scheduled' : 'draft'
      }
    });
    
    // Log success
    logger.info('Info operation', { userId, 
      method: 'POST', 
      path: '/api/content/posts', 
      postId: docRef.id,
      platforms: body.platformIds,
      status: body.scheduledFor ? 'scheduled' : 'draft'
    });
    
    // Return the created post with its ID
    return NextResponse.json({
      post: {
        id: docRef.id,
        ...newPost,
        createdAt: new Date().toISOString(), // Convert server timestamp for immediate display
        updatedAt: new Date().toISOString()
      },
      message: 'Post created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
    
    logger.error('Error occurred', { error: errorMsg, 
      method: 'POST', 
      path: '/api/content/posts' 
    });
    
    return NextResponse.json(
      handleApiError(error, '/api/content/posts', 'creating post'),
      { status: 500 }
    );
  }
} 
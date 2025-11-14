import { NextRequest, NextResponse } from 'next/server';
import { auth, firestore, collection, serverTimestamp } from '../../../../lib/core/firebase/admin';
import { User } from '../../../../lib/core/models/User';
import { TieredModelRouter, TaskType } from '../../../../lib/features/ai/models/tiered-model-router';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Production-ready Smart Content Publisher
class SmartContentPublisher {
  private router: TieredModelRouter;

  constructor() {
    this.router = new TieredModelRouter();
  }

  async generatePostTitle(content: string, user: User): Promise<string> {
    try {
      const titlePrompt = `Generate a compelling, SEO-friendly title for this social media content:

"${content.substring(0, 200)}..."

Requirements:
- Maximum 60 characters
- Engaging and clickable
- Include relevant keywords
- Professional tone

Return only the title, no quotes or explanations.`;

      const response = await this.router.routeTask({
        type: TaskType.CAPTION_WRITING,
        input: titlePrompt,
        options: {
          temperature: 0.7,
          maxTokens: 100
        }
      }, user);

      return response.output.trim().replace(/['"]/g, '');
    } catch (error) {
      console.error('Title generation error:', error);
      return `Social Media Post - ${new Date().toLocaleDateString()}`;
    }
  }

  async createSmartContent(contentData: any, userId: string, user: User) {
    try {
      // Generate post title
      const title = await this.generatePostTitle(contentData.content, user);

      // Prepare content document
      const contentDoc = {
        userId,
        title,
        content: contentData.content,
        hashtags: contentData.hashtags || [],
        platforms: contentData.platforms || [],
        
        // AI Metadata
        aiGenerated: true,
        aiMetadata: {
          tone: contentData.tone,
          audience: contentData.audience,
          contentType: contentData.contentType,
          confidence: contentData.confidence,
          modelUsed: contentData.metadata?.modelUsed,
          tokensUsed: contentData.metadata?.totalTokens || 0,
          generatedAt: new Date().toISOString()
        },
        
        // Scheduling
        scheduledAt: contentData.scheduledAt || null,
        publishImmediately: contentData.publishImmediately || false,
        
        // Media
        mediaRecommendations: contentData.mediaRecommendations || [],
        attachedMedia: contentData.attachedMedia || [],
        
        // Status and metadata
        status: contentData.scheduledAt ? 'scheduled' : 'draft',
        type: 'social_media_post',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        
        // Performance tracking (will be updated when published)
        performance: {
          views: 0,
          likes: 0,
          shares: 0,
          comments: 0,
          lastUpdated: null
        },
        
        // Publication tracking
        publications: [] // Will be populated when published to platforms
      };

      // Save to Firestore using admin SDK
      const contentRef = await collection('content').add(contentDoc);
      
      console.log(`Smart content created: ${contentRef.id} for user ${userId}`);
      
      return {
        id: contentRef.id,
        ...contentDoc,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Smart content creation error:', error);
      throw new Error('Failed to create smart content');
    }
  }

  async updateExistingContent(contentId: string, updates: any, userId: string) {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      };

      await firestore.collection('content').doc(contentId).update(updateData);
      
      console.log(`Content updated: ${contentId} by user ${userId}`);
      
      return { success: true, contentId, updates: updateData };
      
    } catch (error) {
      console.error('Content update error:', error);
      throw new Error('Failed to update content');
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate with Firebase Admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user data from Firestore
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const user: User = {
      id: userId,
      email: userData?.email || '',
      role: userData?.role || 'user',
      subscriptionTier: userData?.subscriptionTier,
      ...userData
    } as User;

    // Parse request data
    const { contentData, action = 'create', contentId } = await request.json();
    
    // Validate input
    if (!contentData || typeof contentData !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Content data is required' },
        { status: 400 }
      );
    }
    
    if (!contentData.content || typeof contentData.content !== 'string' || contentData.content.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Content must be at least 5 characters long' },
        { status: 400 }
      );
    }
    
    // Initialize publisher
    const publisher = new SmartContentPublisher();
    
    let result;
    
    if (action === 'update' && contentId) {
      // Update existing content
      result = await publisher.updateExistingContent(contentId, contentData, userId);
    } else {
      // Create new content
      result = await publisher.createSmartContent(contentData, userId, user);
    }
    
    // Log creation/update
    console.log(`Smart content ${action} for user ${userId}:`, {
      contentId: 'id' in result ? result.id : ('contentId' in result ? result.contentId : contentId),
      contentLength: contentData.content.length,
      platforms: contentData.platforms?.length || 0,
      scheduled: !!contentData.scheduledAt,
      aiGenerated: true
    });
    
    // Return successful response
    return NextResponse.json({
      success: true,
      content: result,
      message: action === 'update' ? 'Content updated successfully' : 'Smart content created successfully'
    });
    
  } catch (error) {
    console.error('Smart content creation API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('access')) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions to create content' },
          { status: 403 }
        );
      }
      
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return NextResponse.json(
          { success: false, error: 'Content creation limit exceeded' },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create smart content. Please try again.' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Handle content updates via PUT method
  const url = new URL(request.url);
  const contentId = url.searchParams.get('id');
  
  if (!contentId) {
    return NextResponse.json(
      { success: false, error: 'Content ID is required for updates' },
      { status: 400 }
    );
  }

  // Modify request body to include action and contentId
  const body = await request.json();
  const modifiedRequest = new NextRequest(request.url, {
    ...request,
    body: JSON.stringify({
      ...body,
      action: 'update',
      contentId
    })
  });

  return POST(modifiedRequest);
} 
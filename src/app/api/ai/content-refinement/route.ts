import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/core/firebase/admin';
import { firestore } from '../../../../lib/core/firebase/admin';
import { TieredModelRouter, TaskType, SubscriptionTier } from '../../../../lib/features/ai/models/tiered-model-router';
import { User } from '../../../../lib/core/models/User';

// Production-ready Content Refinement Service
class ContentRefinementService {
  private router: TieredModelRouter;

  constructor() {
    this.router = new TieredModelRouter();
  }

  private mapUserRequest(request: string): { intent: string; pattern: string } {
    const patterns = [
      { keywords: ['funnier', 'funny', 'humor', 'humorous', 'witty'], pattern: 'humor', intent: 'make it more humorous and engaging' },
      { keywords: ['shorter', 'brief', 'concise', 'compact'], pattern: 'length', intent: 'make it more concise and brief' },
      { keywords: ['longer', 'detailed', 'expand', 'elaborate'], pattern: 'length', intent: 'expand with more detail and context' },
      { keywords: ['professional', 'formal', 'business'], pattern: 'tone', intent: 'make it more professional and business-appropriate' },
      { keywords: ['casual', 'informal', 'relaxed', 'friendly'], pattern: 'tone', intent: 'make it more casual and conversational' },
      { keywords: ['emoji', 'emojis', '🎉', '😊'], pattern: 'emoji', intent: 'add relevant emojis to make it more engaging' },
      { keywords: ['hashtag', 'hashtags', 'tags'], pattern: 'hashtag', intent: 'improve hashtag selection for better reach' },
      { keywords: ['engagement', 'engaging', 'interactive'], pattern: 'engagement', intent: 'make it more engaging and interactive' },
      { keywords: ['call-to-action', 'cta', 'action'], pattern: 'cta', intent: 'strengthen the call-to-action' },
      { keywords: ['audience', 'target', 'demographic'], pattern: 'audience', intent: 'better target the intended audience' }
    ];

    const lowerRequest = request.toLowerCase();
    
    for (const { keywords, pattern, intent } of patterns) {
      if (keywords.some(keyword => lowerRequest.includes(keyword))) {
        return { intent, pattern };
      }
    }
    
    // Default fallback
    return { 
      intent: 'improve the overall quality and engagement of this content', 
      pattern: 'general' 
    };
  }

  async refineContent(
    originalContent: string,
    refinementRequest: string,
    context: any,
    user: User
  ) {
    try {
      const { intent } = this.mapUserRequest(refinementRequest);
      
      const refinementPrompt = `Original content:
"${originalContent}"

User wants to: ${intent}

Context:
- Platform: ${context.platform || 'general'}
- Tone: ${context.tone || 'professional'}
- Audience: ${context.audience || 'general'}
- Character limit: ${context.characterLimit || 'no limit'}

Please refine the content according to the user's request. Maintain the core message while implementing the requested changes. Return only the refined content without explanations.`;

      const response = await this.router.routeTask({
        type: TaskType.SOCIAL_MEDIA_POST,
        input: refinementPrompt,
        options: {
          temperature: 0.7,
          maxTokens: 600
        }
      }, user);

      // Extract hashtags if present
      const refinedContent = response.output.trim();
      const hashtagMatches = refinedContent.match(/#\w+/g) || [];
      const hashtags = Array.from(new Set(hashtagMatches.map((tag: string) => tag.slice(1))));
      
      // Clean content
      const cleanContent = refinedContent.replace(/#\w+/g, '').trim();

      return {
        content: cleanContent,
        hashtags: hashtags.slice(0, 10),
        changesSummary: `Applied: ${intent}`,
        modelUsed: response.modelUsed,
        tokenUsage: response.tokenUsage
      };
      
    } catch (error) {
      console.error('Content refinement error:', error);
      throw new Error('Failed to refine content');
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
      subscriptionTier: userData?.subscriptionTier || SubscriptionTier.ANONYMOUS,
      ...userData
    } as User;

    // Parse request data
    const { content, refinementRequest, context } = await request.json();
    
    // Validate input
    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Content must be at least 5 characters long' },
        { status: 400 }
      );
    }
    
    if (!refinementRequest || typeof refinementRequest !== 'string' || refinementRequest.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Refinement request must be at least 3 characters long' },
        { status: 400 }
      );
    }
    
    // Initialize refinement service
    const refinementService = new ContentRefinementService();
    
    // Refine content
    const refinedData = await refinementService.refineContent(
      content.trim(),
      refinementRequest.trim(),
      context || {},
      user
    );
    
    // Log usage
    console.log(`Content refined for user ${userId}:`, {
      originalLength: content.length,
      refinedLength: refinedData.content.length,
      request: refinementRequest.substring(0, 30) + '...',
      tokensUsed: (refinedData.tokenUsage?.input || 0) + (refinedData.tokenUsage?.output || 0)
    });
    
    // Return successful response
    return NextResponse.json({
      success: true,
      refinedContent: refinedData.content,
      hashtags: refinedData.hashtags,
      changesSummary: refinedData.changesSummary,
      metadata: {
        modelUsed: refinedData.modelUsed,
        tokensUsed: (refinedData.tokenUsage?.input || 0) + (refinedData.tokenUsage?.output || 0)
      }
    });
    
  } catch (error) {
    console.error('Content refinement API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('access')) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions for AI features' },
          { status: 403 }
        );
      }
      
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return NextResponse.json(
          { success: false, error: 'AI usage limit exceeded' },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refine content. Please try again.' 
      },
      { status: 500 }
    );
  }
} 
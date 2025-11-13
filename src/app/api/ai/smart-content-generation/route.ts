import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/firebase/admin';
import { firestore } from '../../../../lib/firebase/admin';
import { TieredModelRouter, TaskType, SubscriptionTier } from '../../../../lib/ai/models/tiered-model-router';
import { PlatformType } from '../../../../lib/features/platforms/client';
import { User } from '../../../../lib/models/User';

// Production-ready Smart Content Generation Service
class SmartContentGenerationService {
  private router: TieredModelRouter;

  constructor() {
    this.router = new TieredModelRouter();
  }

  private async analyzeUserIntent(intent: string, userContext: any, user: User) {
    const analysisPrompt = `Analyze this user intent for social media content creation:
"${intent}"

User Context:
- Industry: ${userContext.industry || 'general'}
- Brand Voice: ${userContext.brandVoice || 'professional'}

Extract and provide:
1. Content category (announcement, behind-scenes, product-feature, team-update, industry-news, tips-advice, celebration, question-poll)
2. Emotional tone (professional, friendly, casual, enthusiastic, informative, humorous, inspirational)
3. Target audience (general, young-adults, professionals, parents, entrepreneurs, students, seniors)
4. Best platforms based on content type (twitter, instagram, linkedin, facebook)
5. Confidence score (0-100)

Respond in JSON format with these exact fields:
{
  "contentType": "announcement",
  "tone": "professional", 
  "audience": "professionals",
  "platforms": ["linkedin", "twitter"],
  "confidence": 85,
  "reasoning": "Brief explanation of the analysis"
}`;

    try {
      const response = await this.router.routeTask({
        type: TaskType.CONTENT_STRATEGY,
        input: analysisPrompt,
        options: {
          temperature: 0.3,
          maxTokens: 500
        }
      }, user);

      // Parse the AI response
      const analysis = JSON.parse(response.output);
      return {
        ...analysis,
        modelUsed: response.modelUsed,
        tokenUsage: response.tokenUsage
      };
    } catch (error) {
      console.error('Intent analysis error:', error);
      throw new Error('Failed to analyze user intent');
    }
  }

  private async generatePlatformContent(intent: string, analysis: any, availablePlatforms: PlatformType[], user: User) {
    const contentPrompt = `Create social media content for: "${intent}"

Context:
- Tone: ${analysis.tone}
- Audience: ${analysis.audience}
- Content Type: ${analysis.contentType}
- Platforms: ${analysis.platforms.filter((p: string) => availablePlatforms.includes(p as PlatformType)).join(', ')}

Create engaging content that:
1. Matches the specified tone and audience
2. Is optimized for the target platforms
3. Includes 3-5 relevant hashtags
4. Has a clear message and call-to-action

Respond with clean, ready-to-post content (hashtags will be extracted separately).`;

    try {
      const response = await this.router.routeTask({
        type: TaskType.SOCIAL_MEDIA_POST,
        input: contentPrompt,
        options: {
          temperature: 0.8,
          maxTokens: 800
        }
      }, user);

      // Extract hashtags from generated content
      const content = response.output;
      const hashtagMatches = content.match(/#\w+/g) || [];
      const hashtags = Array.from(new Set(hashtagMatches.map((tag: string) => tag.slice(1))));
      
      // Clean content (remove hashtags for editing)
      const cleanContent = content.replace(/#\w+/g, '').trim();

      return {
        content: cleanContent,
        hashtags: hashtags.slice(0, 10),
        mediaRecommendations: this.generateMediaRecommendations(analysis.contentType),
        modelUsed: response.modelUsed,
        tokenUsage: response.tokenUsage
      };
    } catch (error) {
      console.error('Content generation error:', error);
      throw new Error('Failed to generate content');
    }
  }

  private generateMediaRecommendations(contentType: string): string[] {
    const mediaMap: Record<string, string[]> = {
      'announcement': ['Branded graphics', 'Behind-the-scenes photos', 'Product screenshots'],
      'behind-scenes': ['Process photos', 'Team photos', 'Workspace shots'],
      'product-feature': ['Product screenshots', 'Demo videos', 'Before/after comparisons'],
      'team-update': ['Team photos', 'Office photos', 'Achievement graphics'],
      'industry-news': ['Infographics', 'News graphics', 'Data visualizations'],
      'tips-advice': ['Infographics', 'Step-by-step visuals', 'Quote graphics'],
      'celebration': ['Achievement graphics', 'Team photos', 'Milestone visuals'],
      'question-poll': ['Poll graphics', 'Question visuals', 'Interactive content']
    };
    
    return mediaMap[contentType] || ['Branded graphics', 'Stock photos', 'Custom visuals'];
  }

  async generateSmartSuggestion(
    intent: string, 
    availablePlatforms: PlatformType[], 
    userContext: any,
    user: User
  ) {
    try {
      // Step 1: Analyze user intent
      const analysis = await this.analyzeUserIntent(intent, userContext, user);
      
      // Step 2: Generate platform-specific content
      const contentData = await this.generatePlatformContent(intent, analysis, availablePlatforms, user);
      
      // Step 3: Compile smart suggestion
      const suggestion = {
        platforms: analysis.platforms.filter((p: string) => 
          availablePlatforms.includes(p as PlatformType)
        ) as PlatformType[],
        tone: analysis.tone,
        audience: analysis.audience,
        contentType: analysis.contentType,
        content: contentData.content,
        hashtags: contentData.hashtags,
        mediaRecommendations: contentData.mediaRecommendations,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        metadata: {
          modelUsed: contentData.modelUsed,
          totalTokens: (analysis.tokenUsage?.input || 0) + (analysis.tokenUsage?.output || 0) + 
                      (contentData.tokenUsage?.input || 0) + (contentData.tokenUsage?.output || 0)
        }
      };
      
      return suggestion;
      
    } catch (error) {
      console.error('Smart content generation error:', error);
      throw error;
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
    const { intent, availablePlatforms, userContext } = await request.json();
    
    // Validate input
    if (!intent || typeof intent !== 'string' || intent.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Intent must be at least 10 characters long' },
        { status: 400 }
      );
    }
    
    if (!availablePlatforms || !Array.isArray(availablePlatforms) || availablePlatforms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one platform must be available' },
        { status: 400 }
      );
    }
    
    // Initialize service
    const smartService = new SmartContentGenerationService();
    
    // Generate smart suggestion
    const suggestion = await smartService.generateSmartSuggestion(
      intent.trim(),
      availablePlatforms,
      userContext || {},
      user
    );
    
    // Log usage for analytics
    console.log(`Smart content generated for user ${userId}:`, {
      intent: intent.substring(0, 50) + '...',
      platforms: availablePlatforms,
      confidence: suggestion.confidence,
      tokensUsed: suggestion.metadata.totalTokens
    });
    
    // Return successful response
    return NextResponse.json({
      success: true,
      suggestion,
      message: 'Smart suggestions generated successfully'
    });
    
  } catch (error) {
    console.error('Smart content generation API error:', error);
    
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
        error: 'Failed to generate smart suggestions. Please try again.' 
      },
      { status: 500 }
    );
  }
} 
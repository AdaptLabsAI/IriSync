import { NextRequest, NextResponse } from 'next/server';
import { auth, firestore } from '../../../../lib/firebase/admin';
import { TieredModelRouter, TaskType, SubscriptionTier } from '../../../../lib/ai/models/tiered-model-router';
import { User, SubscriptionTierValues } from '../../../../lib/models/User';
import { getUserSubscriptionTier } from '../../../../lib/subscription';
import { SubscriptionTier as BaseSubscriptionTier } from '../../../../lib/subscription/models/subscription';

// Production-ready Content Repurposing Engine
class ContentRepurposingEngine {
  private router: TieredModelRouter;

  constructor() {
    this.router = new TieredModelRouter();
  }

  async repurposeContent(
    originalContent: string,
    originalPlatform: string,
    targetFormats: string[],
    contentTheme: string,
    user: User
  ) {
    try {
      const repurposingPrompt = `Repurpose this ${originalPlatform} content into ${targetFormats.length} different formats:

Original Content: "${originalContent}"
Original Platform: ${originalPlatform}
Content Theme: ${contentTheme}

Target Formats: ${targetFormats.join(', ')}

For each format, create content that:
1. Maintains the core message and value
2. Adapts to platform-specific best practices
3. Optimizes for platform audience expectations
4. Adjusts length and style appropriately
5. Includes platform-specific engagement tactics

Format Guidelines:
- LinkedIn: Professional, thought leadership, 1300-1900 chars
- Twitter: Concise, conversational, thread-worthy, 280 chars per tweet
- Instagram: Visual-first, story-driven, 2200 chars max
- Facebook: Community-focused, longer form allowed, 63,206 chars max
- TikTok: Trend-aware, younger audience, bite-sized insights
- Blog Post: Detailed, SEO-friendly, educational
- Email Newsletter: Personal, actionable, segmented value
- YouTube Script: Engaging intro, structured content, clear CTA

Respond in JSON format:
{
  "repurposedContent": [
    {
      "platform": "linkedin",
      "format": "professional_post",
      "content": "repurposed content here",
      "hashtags": ["tag1", "tag2"],
      "keyAdaptations": ["Professional tone", "Industry insights"],
      "engagementTactics": ["Question at end", "Industry statistics"],
      "estimatedReach": "1000-5000",
      "optimalPostTime": "9 AM - 11 AM weekdays"
    }
  ],
  "contentStrategy": {
    "recommendedSequence": ["linkedin", "twitter", "instagram"],
    "timingStrategy": "Stagger over 3-5 days",
    "crossPromotionTips": ["Reference LinkedIn post in Twitter", "Use Instagram story to highlight Twitter thread"],
    "contentPillars": ["education", "engagement", "entertainment"]
  },
  "repurposingInsights": {
    "coreMessageRetention": "95%",
    "platformOptimization": "High",
    "audienceReach": "3x wider reach potential",
    "effortMultiplier": "1 idea → 5 pieces of content"
  }
}`;

      const response = await this.router.routeTask({
        type: TaskType.CONTENT_STRATEGY,
        input: repurposingPrompt,
        options: {
          temperature: 0.7,
          maxTokens: 1500
        }
      }, user);

      const result = JSON.parse(response.output);
      
      return {
        ...result,
        metadata: {
          originalContent: originalContent.substring(0, 100) + '...',
          originalPlatform,
          targetFormats,
          contentTheme,
          modelUsed: response.modelUsed,
          tokensUsed: response.tokenUsage,
          repurposedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Content repurposing error:', error);
      throw new Error('Failed to repurpose content');
    }
  }

  async generateContentSeries(
    coreIdea: string,
    seriesLength: number,
    platforms: string[],
    contentGoal: string,
    user: User
  ) {
    try {
      const seriesPrompt = `Create a ${seriesLength}-part content series based on this core idea:

Core Idea: "${coreIdea}"
Platforms: ${platforms.join(', ')}
Content Goal: ${contentGoal}
Series Length: ${seriesLength} pieces

Create a cohesive content series that:
1. Builds upon each piece logically
2. Maintains audience interest throughout
3. Drives toward the content goal
4. Varies format and approach
5. Includes cross-references between pieces

For each piece, provide:
- Content for each platform
- Series position and purpose
- Connection to previous/next pieces
- Engagement hooks
- Call-to-action

Respond in JSON format with series structure and individual pieces.`;

      const response = await this.router.routeTask({
        type: TaskType.CONTENT_STRATEGY,
        input: seriesPrompt,
        options: {
          temperature: 0.8,
          maxTokens: 2000
        }
      }, user);

      return {
        series: JSON.parse(response.output),
        metadata: {
          coreIdea,
          seriesLength,
          platforms,
          contentGoal,
          modelUsed: response.modelUsed,
          tokensUsed: response.tokenUsage
        }
      };

    } catch (error) {
      console.error('Content series generation error:', error);
      throw new Error('Failed to generate content series');
    }
  }

  async analyzeRepurposingOpportunities(userId: string, user: User) {
    try {
      // Get user's top-performing content
      const topContent = await firestore.collection('content')
        .where('userId', '==', userId)
        .where('status', '==', 'published')
        .orderBy('performance.engagement', 'desc')
        .limit(5)
        .get();

      if (topContent.empty) {
        return {
          opportunities: [],
          message: 'No published content found for analysis'
        };
      }

      const contentData = topContent.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<{
        id: string;
        title?: string;
        platform?: string;
        content?: string;
        performance?: {
          engagement?: number;
        };
        [key: string]: any;
      }>;

      const analysisPrompt = `Analyze these top-performing content pieces for repurposing opportunities:

${contentData.map((content, index) => `
Content ${index + 1}:
- Title: ${content.title}
- Platform: ${content.platform}
- Content: ${content.content?.substring(0, 200)}...
- Engagement: ${content.performance?.engagement || 0}
`).join('\n')}

Identify:
1. Repurposing opportunities for each piece
2. Content gaps that could be filled
3. Series potential
4. Cross-platform adaptation strategies
5. Trending angles to leverage

Provide actionable recommendations.`;

      const response = await this.router.routeTask({
        type: TaskType.ANALYTICS,
        input: analysisPrompt,
        options: {
          temperature: 0.6,
          maxTokens: 1000
        }
      }, user);

      return {
        opportunities: response.output,
        analyzedContent: contentData.length,
        metadata: {
          modelUsed: response.modelUsed,
          tokensUsed: response.tokenUsage,
          analysisDate: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Repurposing opportunities analysis error:', error);
      throw new Error('Failed to analyze repurposing opportunities');
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate
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

    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    
    // Get subscription tier from organization billing (not deprecated user field)
    const subscriptionTier = await getUserSubscriptionTier(userId);

    const user: User = {
      id: userId,
      email: userData?.email || '',
      role: userData?.role || 'user',
      subscriptionTier, // Use the proper organization-based subscription tier
      ...userData
    } as User;

    // Parse request
    const { 
      action = 'repurpose',
      content,
      originalPlatform,
      targetFormats = ['linkedin', 'twitter', 'instagram', 'facebook'],
      contentTheme = 'general',
      coreIdea,
      seriesLength = 5,
      platforms = ['linkedin', 'twitter'],
      contentGoal = 'engagement',
      seriesCount = 3
    } = await request.json();

    // Subscription tier validation with different access levels
    if (!subscriptionTier || subscriptionTier === SubscriptionTierValues.NONE) {
      return NextResponse.json(
        { success: false, error: 'Content Repurposing requires a Creator subscription or higher. Upgrade to access content multiplication features.' },
        { status: 403 }
      );
    }

    // CREATOR tier limitations
    if (subscriptionTier === BaseSubscriptionTier.CREATOR) {
      if (targetFormats.length > 2) {
        targetFormats.length = 2; // Limit to 2 platforms
      }
      if (action === 'series' && seriesCount > 3) {
        return NextResponse.json(
          { success: false, error: 'Content Series generation is limited to 3 posts for Creator tier. Upgrade to Influencer for unlimited series generation.' },
          { status: 403 }
        );
      }
    }

    // Initialize engine
    const engine = new ContentRepurposingEngine();
    
    let result;

    switch (action) {
      case 'repurpose':
        // Validate repurpose input
        if (!content || typeof content !== 'string' || content.trim().length < 20) {
          return NextResponse.json(
            { success: false, error: 'Content must be at least 20 characters long' },
            { status: 400 }
          );
        }

        if (!originalPlatform || typeof originalPlatform !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Original platform is required' },
            { status: 400 }
          );
        }

        result = await engine.repurposeContent(
          content.trim(),
          originalPlatform.toLowerCase(),
          targetFormats,
          contentTheme,
          user
        );
        break;

      case 'series':
        // Validate series input
        if (!coreIdea || typeof coreIdea !== 'string' || coreIdea.trim().length < 10) {
          return NextResponse.json(
            { success: false, error: 'Core idea must be at least 10 characters long' },
            { status: 400 }
          );
        }

        if (seriesLength < 3 || seriesLength > 10) {
          return NextResponse.json(
            { success: false, error: 'Series length must be between 3 and 10' },
            { status: 400 }
          );
        }

        result = await engine.generateContentSeries(
          coreIdea.trim(),
          seriesLength,
          platforms,
          contentGoal,
          user
        );
        break;

      case 'analyze':
        // Analyze repurposing opportunities
        result = await engine.analyzeRepurposingOpportunities(userId, user);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: repurpose, series, or analyze' },
          { status: 400 }
        );
    }

    // Log operation
    console.log(`Content repurposing ${action} for user ${userId}:`, {
      originalPlatform: originalPlatform || 'N/A',
      targetFormats: targetFormats?.length || 0,
      seriesLength: action === 'series' ? seriesLength : 0
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Content ${action} completed successfully`
    });

  } catch (error) {
    console.error('Content repurposing API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('access')) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions for repurposing features' },
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
        error: 'Failed to repurpose content. Please try again.' 
      },
      { status: 500 }
    );
  }
} 
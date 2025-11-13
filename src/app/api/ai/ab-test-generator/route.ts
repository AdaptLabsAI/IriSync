import { NextRequest, NextResponse } from 'next/server';
import { auth, firestore } from '../../../../lib/core/firebase/admin';
import { TieredModelRouter, TaskType, SubscriptionTier } from '../../../../lib/features/ai/models/tiered-model-router';
import { User } from '../../../../lib/core/models/User';
import { getUserSubscriptionTier } from '../../../../lib/subscription';
import { SubscriptionTier as BaseSubscriptionTier } from '../../../../lib/subscription/models/subscription';

// Production-ready A/B Testing Content Generator
class ABTestContentGenerator {
  private router: TieredModelRouter;

  constructor() {
    this.router = new TieredModelRouter();
  }

  async generateVariations(
    originalContent: string,
    platform: string,
    testTypes: string[],
    variationCount: number = 3,
    user: User
  ) {
    try {
      const variationPrompt = `Generate ${variationCount} A/B test variations for this social media content:

Original Content: "${originalContent}"
Platform: ${platform}

Test Types to Create:
${testTypes.join(', ')}

Create variations that test:
- Different hooks/opening lines
- Various emotional tones (urgent vs. calm, excited vs. professional)
- Different call-to-action approaches
- Varying content lengths (concise vs. detailed)
- Different value propositions
- Alternative hashtag strategies

For each variation, provide:
1. The variation content
2. What aspect is being tested
3. Expected audience response
4. Key difference from original

Respond in JSON format:
{
  "variations": [
    {
      "id": "variation_1",
      "content": "variation content here",
      "testFocus": "hook_optimization",
      "description": "Tests a question-based hook vs. statement",
      "expectedImpact": "Higher engagement through curiosity",
      "hashtags": ["tag1", "tag2"],
      "keyDifference": "Uses question to create curiosity"
    }
  ],
  "testingStrategy": {
    "recommendedDuration": "7 days",
    "successMetrics": ["engagement_rate", "click_through_rate"],
    "audienceSegmentation": "Split by demographics",
    "expectedResults": "20-30% difference in engagement"
  }
}`;

      const response = await this.router.routeTask({
        type: TaskType.SOCIAL_MEDIA_POST,
        input: variationPrompt,
        options: {
          temperature: 0.8,
          maxTokens: 1200
        }
      }, user);

      const result = JSON.parse(response.output);
      
      return {
        ...result,
        metadata: {
          originalContent,
          platform,
          requestedTypes: testTypes,
          variationCount,
          modelUsed: response.modelUsed,
          tokensUsed: response.tokenUsage,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('A/B test generation error:', error);
      throw new Error('Failed to generate A/B test variations');
    }
  }

  async analyzeBestPractices(platform: string, contentType: string, user: User) {
    try {
      const practicesPrompt = `Provide A/B testing best practices for ${platform} ${contentType} content:

Include:
1. Most effective elements to test
2. Optimal test duration
3. Sample size recommendations
4. Key metrics to track
5. Common pitfalls to avoid
6. Platform-specific considerations

Format as actionable guidelines.`;

      const response = await this.router.routeTask({
        type: TaskType.CONTENT_STRATEGY,
        input: practicesPrompt,
        options: {
          temperature: 0.4,
          maxTokens: 600
        }
      }, user);

      return {
        practices: response.output,
        metadata: {
          platform,
          contentType,
          modelUsed: response.modelUsed,
          tokensUsed: response.tokenUsage
        }
      };

    } catch (error) {
      console.error('Best practices analysis error:', error);
      throw new Error('Failed to analyze A/B testing best practices');
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
      content, 
      platform, 
      testTypes = ['hook_optimization', 'tone_variation', 'cta_testing'],
      variationCount = 3,
      action = 'generate'
    } = await request.json();

    // Validate input
    if (action === 'generate') {
      // Check subscription tier for A/B testing access - only allow for INFLUENCER+ tiers
      if (!subscriptionTier || 
          (subscriptionTier !== BaseSubscriptionTier.INFLUENCER && 
           subscriptionTier !== BaseSubscriptionTier.ENTERPRISE)) {
        return NextResponse.json(
          { success: false, error: 'A/B Testing requires an Influencer or Enterprise subscription. Upgrade to access advanced content optimization features.' },
          { status: 403 }
        );
      }

      if (!content || typeof content !== 'string' || content.trim().length < 10) {
        return NextResponse.json(
          { success: false, error: 'Content must be at least 10 characters long' },
          { status: 400 }
        );
      }

      if (!platform || typeof platform !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Platform is required' },
          { status: 400 }
        );
      }

      if (variationCount < 2 || variationCount > 5) {
        return NextResponse.json(
          { success: false, error: 'Variation count must be between 2 and 5' },
          { status: 400 }
        );
      }
    }

    // Initialize generator
    const generator = new ABTestContentGenerator();
    
    let result;
    
    if (action === 'best-practices') {
      // Get A/B testing best practices
      result = await generator.analyzeBestPractices(
        platform || 'general',
        'social_media_post',
        user
      );
    } else {
      // Generate A/B test variations
      result = await generator.generateVariations(
        content.trim(),
        platform.toLowerCase(),
        testTypes,
        variationCount,
        user
      );
    }

    // Log generation
    console.log(`A/B test ${action} for user ${userId}:`, {
      platform: platform || 'general',
      contentLength: content?.length || 0,
      variationCount: action === 'generate' ? variationCount : 0,
      testTypes: testTypes.length
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `A/B test ${action} completed successfully`
    });

  } catch (error) {
    console.error('A/B test generator API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('access')) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions for A/B testing features' },
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
        error: 'Failed to generate A/B test variations. Please try again.' 
      },
      { status: 500 }
    );
  }
} 
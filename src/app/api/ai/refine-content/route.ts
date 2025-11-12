import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';

class ContentRefinementService {
  private async refineContentWithAI(
    originalContent: string,
    refinementRequest: string,
    context: any
  ) {
    const systemPrompt = `You are an expert social media content editor. Your job is to refine content based on user requests while maintaining the core message and staying appropriate for the specified platforms and audience.

Context:
- Platforms: ${context.platforms?.join(', ') || 'General'}
- Tone: ${context.tone || 'Professional'}
- Audience: ${context.audience || 'General'}

Guidelines:
1. Keep the core message intact unless explicitly asked to change it
2. Maintain platform-appropriate length and style
3. Preserve brand voice and professionalism
4. Add hashtags only if requested or if they enhance the content
5. Explain your changes briefly

Original Content:
"${originalContent}"

User Request:
"${refinementRequest}"

Please refine the content and explain what you changed.`;

    try {
      const response = await fetch(process.env.OPENAI_API_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert social media content editor. Refine content based on user requests while maintaining quality and appropriateness.'
            },
            {
              role: 'user',
              content: systemPrompt
            }
          ],
          functions: [{
            name: 'refine_content',
            description: 'Refine social media content based on user feedback',
            parameters: {
              type: 'object',
              properties: {
                refinedContent: {
                  type: 'string',
                  description: 'The improved content'
                },
                explanation: {
                  type: 'string',
                  description: 'Brief explanation of what was changed'
                },
                hashtags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Updated hashtags if applicable'
                },
                suggestions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional suggestions for improvement'
                }
              },
              required: ['refinedContent', 'explanation']
            }
          }],
          function_call: { name: 'refine_content' },
          temperature: 0.7
        })
      });

      const aiResponse = await response.json();
      
      if (!aiResponse.choices || !aiResponse.choices[0]) {
        throw new Error('Invalid AI response');
      }

      const result = JSON.parse(aiResponse.choices[0].message.function_call.arguments);
      return result;

    } catch (error) {
      console.error('AI refinement error:', error);
      throw new Error('Failed to refine content with AI');
    }
  }

  private async enhanceWithSpecificRequest(
    originalContent: string,
    request: string,
    context: any
  ) {
    // Handle common refinement patterns
    const lowerRequest = request.toLowerCase();
    
    // Map common requests to specific instructions
    const refinementMap: Record<string, string> = {
      'more casual': 'Make the tone more casual and conversational',
      'more professional': 'Make the tone more professional and formal',
      'add emojis': 'Add relevant emojis to make it more engaging',
      'remove emojis': 'Remove all emojis and keep it text-only',
      'shorter': 'Make it more concise while keeping the key message',
      'longer': 'Expand the content with more detail and context',
      'add hashtags': 'Add relevant hashtags for better discoverability',
      'more engaging': 'Make it more engaging and likely to get interactions',
      'add call to action': 'Add a clear call-to-action at the end',
      'more exciting': 'Make the tone more enthusiastic and exciting',
      'funnier': 'Add some humor while keeping it appropriate',
      'more serious': 'Make the tone more serious and professional'
    };

    // Check for exact matches first
    for (const [pattern, instruction] of Object.entries(refinementMap)) {
      if (lowerRequest.includes(pattern)) {
        return await this.refineContentWithAI(originalContent, instruction, context);
      }
    }

    // For custom requests, use the original request
    return await this.refineContentWithAI(originalContent, request, context);
  }

  async processRefinementRequest(
    originalContent: string,
    refinementRequest: string,
    context: any
  ) {
    try {
      // Validate inputs
      if (!originalContent || !refinementRequest) {
        throw new Error('Original content and refinement request are required');
      }

      if (originalContent.length > 5000) {
        throw new Error('Content too long for refinement');
      }

      if (refinementRequest.length > 500) {
        throw new Error('Refinement request too long');
      }

      // Process the refinement
      const result = await this.enhanceWithSpecificRequest(
        originalContent,
        refinementRequest.trim(),
        context
      );

      // Validate the result
      if (!result.refinedContent) {
        throw new Error('Failed to generate refined content');
      }

      // Ensure content meets platform requirements
      const platformLimits: Record<string, number> = {
        twitter: 280,
        instagram: 2200,
        linkedin: 3000,
        facebook: 63206
      };

      // Check if content exceeds any platform limits
      const platforms = context.platforms || [];
      const warnings: string[] = [];

      for (const platform of platforms) {
        const limit = platformLimits[platform.toLowerCase()];
        if (limit && result.refinedContent.length > limit) {
          warnings.push(`Content may be too long for ${platform} (${result.refinedContent.length}/${limit} chars)`);
        }
      }

      return {
        refinedContent: result.refinedContent,
        explanation: result.explanation,
        refinedHashtags: result.hashtags || null,
        suggestions: result.suggestions || [],
        warnings
      };

    } catch (error) {
      console.error('Content refinement error:', error);
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request data
    const { originalContent, refinementRequest, context } = await request.json();

    // Validate required fields
    if (!originalContent || typeof originalContent !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Original content is required' },
        { status: 400 }
      );
    }

    if (!refinementRequest || typeof refinementRequest !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Refinement request is required' },
        { status: 400 }
      );
    }

    // Initialize refinement service
    const refinementService = new ContentRefinementService();

    // Process refinement request
    const result = await refinementService.processRefinementRequest(
      originalContent,
      refinementRequest,
      context || {}
    );

    // Log refinement for analytics
    console.log(`Content refined for user ${session.user.id}:`, {
      originalLength: originalContent.length,
      refinedLength: result.refinedContent.length,
      request: refinementRequest,
      platforms: context?.platforms || []
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      ...result,
      message: 'Content refined successfully'
    });

  } catch (error) {
    console.error('Content refinement API error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('too long')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
      
      if (error.message.includes('required')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
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
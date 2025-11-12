import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { firestore } from '@/lib/core/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  increment,
  serverTimestamp,
  addDoc,
  setDoc
} from 'firebase/firestore';
import { TieredModelRouter, TaskType, AITask, SubscriptionTier } from '@/lib/features/ai/models/tiered-model-router';
import { logger } from '@/lib/core/logging/logger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { User } from '@/lib/core/models/User';
import { AIService, AIServiceType } from '@/lib/features/ai/AIService';
import { AITaskType } from '@/lib/features/ai/models/AITask';

// Import AI provider clients for fallback
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';

// Initialize AI providers with API keys (fallback only)
const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

// Initialize the AI service singleton
const aiService = AIService.getInstance();

// Map content generation request types to AITaskType enum
function mapContentTypeToAITaskType(contentType: string): AITaskType {
  const mapping: Record<string, AITaskType> = {
    'long-form': AITaskType.GENERATE_POST,
    'blog-post': AITaskType.GENERATE_POST,
    'article': AITaskType.GENERATE_POST,
    'social-media': AITaskType.GENERATE_POST,
    'post': AITaskType.GENERATE_POST,
    'caption': AITaskType.GENERATE_CAPTION,
    'hashtags': AITaskType.GENERATE_HASHTAGS,
    'content-improvement': AITaskType.IMPROVE_CONTENT
  };
  
  return mapping[contentType] || AITaskType.GENERATE_POST; // Default fallback
}

/**
 * AI Content Generation API with Automatic IriSync Branding
 * Uses the centralized AIService for consistent branding and billing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      prompt, 
      contentType = 'social-media', 
      platform, 
      tone, 
      targetAudience, 
      keywords,
      additionalContext,
      maxLength 
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get user data and organization (organization-centric approach)
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    
    // Get user's organization ID (organization-centric)
    const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization found for user. Please contact support.' },
        { status: 404 }
      );
    }

    // Get organization data for subscription tier
    const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
    if (!orgDoc.exists()) {
      return NextResponse.json(
        { error: 'Organization not found. Please contact support.' },
        { status: 404 }
      );
    }

    const orgData = orgDoc.data();
    const billing = orgData.billing || {};
    
    // Get subscription tier from organization billing
    const tier = billing.subscriptionTier;
    
    if (!tier || tier === 'none') {
      return NextResponse.json(
        { error: 'A paid subscription is required to access AI features. Please upgrade to Creator, Influencer, or Enterprise tier.' },
        { status: 403 }
      );
    }

    // Verify subscription is active
    if (billing.subscriptionStatus !== 'active' && billing.subscriptionStatus !== 'trialing') {
      return NextResponse.json(
        { error: 'Your subscription is not active. Please update your billing information.' },
        { status: 403 }
      );
    }

    // Map content type to AI task type
    const taskType = mapContentTypeToAITaskType(contentType);
    
    try {
      // Use centralized AIService for content generation with automatic branding
      let response;
      
      if (taskType === AITaskType.GENERATE_HASHTAGS) {
        // Handle hashtag generation specifically
        response = await aiService.generateHashtags({
          userId,
          organizationId: orgId,
          content: prompt,
          platform,
          count: 8 // Generate more hashtags, branding will add IriSync
        });
      } else {
        // Handle all other content generation
        response = await aiService.generateContent({
          userId,
          organizationId: orgId,
          topic: prompt,
          platform,
          contentType,
          tone,
          audience: targetAudience,
          keywords: keywords ? keywords.split(',').map((k: string) => k.trim()) : []
        });
      }

      if (!response.success) {
        return NextResponse.json(
          { error: response.error || 'Failed to generate content' },
          { status: response.error?.includes('token') ? 402 : 500 }
        );
      }
      
      // Log successful generation
      logger.info('AI content generated successfully with branding', {
        userId,
        taskType,
        tier,
        model: response.model,
        brandingAdded: response.branding?.brandingAdded || false,
        hashtagCount: response.branding?.hashtags?.length || 0
      });

      // Track usage in Firestore
      await setDoc(doc(firestore, 'aiUsage', userId), {
        userId,
        tools: {
          [taskType]: increment(1)
        },
        lastUsed: serverTimestamp()
      }, { merge: true });

      // Add to generation history with branding info
      await addDoc(collection(firestore, 'contentGenerations'), {
        userId,
        taskType,
        tier,
        model: response.model,
        prompt,
        response: response.output,
        brandingInfo: response.branding,
        createdAt: serverTimestamp(),
        platform,
        contentType
      });

      return NextResponse.json({
        success: true,
        content: response.output,
        metadata: {
          model: response.model,
          tier,
          taskType,
          provider: response.provider,
          branding: response.branding,
          charged: response.charged
        }
      });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('FeatureAccessError')) {
          return NextResponse.json(
            { error: error.message },
            { status: 403 }
          );
        }
        
        if (error.message.includes('token')) {
          return NextResponse.json(
            { error: error.message },
            { status: 402 }
          );
        }
      }
      
      logger.error('Error generating AI content', {
        userId,
        taskType,
        tier,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;    
    }  
  } catch (error) {    
    console.error('Error generating content:', error);

    return NextResponse.json(      
      { error: `Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`},      
      { status: 500 }    
    );  
  }
} 

// Legacy content generation function (kept for fallback compatibility)
async function generateWithAI(params: any, provider: 'google' | 'anthropic' | 'openai' = 'openai'): Promise<any[]> {
  const { topic, platform, contentType, tone, audience, keywords } = params;
  
  // Build prompt based on parameters
  const prompt = `Generate engaging social media content about "${topic}"${platform ? ` for ${platform}` : ''}${contentType ? ` as a ${contentType}` : ''}${tone ? ` with a ${tone} tone` : ''}${audience ? ` targeting ${audience}` : ''}${keywords && keywords.length > 0 ? ` including keywords: ${keywords.join(', ')}` : ''}.

For each piece of content, include:
1. The main content text appropriate for the platform
2. 5-7 relevant hashtags

Return the results structured as a list of content options, each with platform type, content type, main text, and hashtags.`;

  try {
    let generatedText = '';
    
    // Use the specified AI provider
    switch (provider) {
      case 'google':
        const genAiModel = googleAI.getGenerativeModel({ model: 'gemini-pro' });
        const genAiResult = await genAiModel.generateContent(prompt);
        generatedText = genAiResult.response.text();
        break;
        
      case 'anthropic':
        const claudeResult = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        });
        generatedText = claudeResult.content.map((c: any) => 
          typeof c === 'string' ? c : c.type === 'text' ? c.text : ''
        ).join('');
        break;
        
      case 'openai':
      default:
        const openaiResult = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000
        });
        generatedText = openaiResult.choices[0]?.message?.content || '';
    }
    
    // Process the generated text into structured content
    const results: any[] = [];
    
    // Simple fallback processing - this is mainly for legacy compatibility
    results.push({
      id: uuidv4(),
      platform: (platform || 'general').toLowerCase(),
      type: (contentType || 'post').toLowerCase(),
      content: generatedText.trim(),
      hashtags: []
    });
    
    return results;
  } catch (error) {
    console.error('Error generating content with AI:', error);
    throw new Error(`Failed to generate content with ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 
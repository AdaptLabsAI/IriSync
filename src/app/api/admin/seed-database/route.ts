import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore  } from '@/lib/core/firebase';
import {   collection,   doc,   getDoc,   getDocs,  setDoc,  serverTimestamp,  writeBatch} from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * Check if user has admin privileges
 */
async function checkAdminAccess(userId: string): Promise<boolean> {
  const firestore = getFirebaseFirestore();
  if (!firestore) {
    throw new Error('Database not configured');
  }
  const userDoc = await getDoc(doc(firestore, 'users', userId));
  if (!userDoc.exists()) return false;

  const userData = userDoc.data();
  return userData.role === 'admin' || userData.role === 'super_admin';
}

// Default AI model configurations to seed
const defaultModelConfigurations = [
  // CREATOR TIER
  { tier: 'creator', taskType: 'long_form_content', model: 'gpt-3.5-turbo' },
  { tier: 'creator', taskType: 'social_media_post', model: 'claude-3-5-haiku-20241022' },
  { tier: 'creator', taskType: 'caption_writing', model: 'claude-3-5-haiku-20241022' },
  { tier: 'creator', taskType: 'hashtag_generation', model: 'gemini-2.0-flash-exp' },
  { tier: 'creator', taskType: 'image_analysis', model: 'gemini-1.5-flash-002' },
  { tier: 'creator', taskType: 'alt_text_generation', model: 'gemini-1.5-flash-002' },
  { tier: 'creator', taskType: 'visual_content_moderation', model: 'gemini-1.5-flash-002' },
  { tier: 'creator', taskType: 'sentiment_analysis', model: 'claude-3-5-haiku-20241022' },
  { tier: 'creator', taskType: 'content_categorization', model: 'claude-3-5-haiku-20241022' },
  { tier: 'creator', taskType: 'comment_replies', model: 'claude-3-5-haiku-20241022' },
  { tier: 'creator', taskType: 'customer_support', model: 'gpt-3.5-turbo' },
  { tier: 'creator', taskType: 'chatbot', model: 'claude-3-5-haiku-20241022' },
  { tier: 'creator', taskType: 'retrieval', model: 'gpt-3.5-turbo' },
  { tier: 'creator', taskType: 'semantic_search', model: 'gemini-1.5-flash-002' },
  { tier: 'creator', taskType: 'workflow_automation', model: 'gpt-3.5-turbo' },
  { tier: 'creator', taskType: 'content_repurposing', model: 'claude-3-5-haiku-20241022' },

  // INFLUENCER TIER
  { tier: 'influencer', taskType: 'long_form_content', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'social_media_post', model: 'claude-3-5-haiku-20241022' },
  { tier: 'influencer', taskType: 'caption_writing', model: 'claude-3-5-haiku-20241022' },
  { tier: 'influencer', taskType: 'hashtag_generation', model: 'gemini-2.0-flash-exp' },
  { tier: 'influencer', taskType: 'image_analysis', model: 'gemini-1.5-flash-002' },
  { tier: 'influencer', taskType: 'alt_text_generation', model: 'gemini-1.5-flash-002' },
  { tier: 'influencer', taskType: 'visual_content_moderation', model: 'gemini-1.5-flash-002' },
  { tier: 'influencer', taskType: 'sentiment_analysis', model: 'claude-3-5-haiku-20241022' },
  { tier: 'influencer', taskType: 'content_categorization', model: 'claude-3-5-haiku-20241022' },
  { tier: 'influencer', taskType: 'engagement_prediction', model: 'gpt-3.5-turbo' },
  { tier: 'influencer', taskType: 'content_strategy', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'competitive_analysis', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'trend_analysis', model: 'gemini-1.5-flash-002' },
  { tier: 'influencer', taskType: 'performance_insights', model: 'gemini-1.5-flash-002' },
  { tier: 'influencer', taskType: 'comment_replies', model: 'claude-3-5-haiku-20241022' },
  { tier: 'influencer', taskType: 'customer_support', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'social_listening', model: 'gemini-1.5-flash-002' },
  { tier: 'influencer', taskType: 'chatbot', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'retrieval', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'semantic_search', model: 'claude-3-5-haiku-20241022' },
  { tier: 'influencer', taskType: 'workflow_automation', model: 'claude-3-5-sonnet-20241022' },
  
  // Smart Content Creator Features for Influencer
  { tier: 'influencer', taskType: 'analytics', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'content_performance_prediction', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'ab_test_generation', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'ab_test_analysis', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'content_repurposing', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'content_series_generation', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'influencer', taskType: 'cross_platform_adaptation', model: 'claude-3-5-haiku-20241022' },

  // ENTERPRISE TIER
  { tier: 'enterprise', taskType: 'long_form_content', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'social_media_post', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'enterprise', taskType: 'caption_writing', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'enterprise', taskType: 'hashtag_generation', model: 'claude-3-5-haiku-20241022' },
  { tier: 'enterprise', taskType: 'image_analysis', model: 'gemini-1.5-pro-002' },
  { tier: 'enterprise', taskType: 'alt_text_generation', model: 'gemini-1.5-flash-002' },
  { tier: 'enterprise', taskType: 'visual_content_moderation', model: 'gemini-1.5-pro-002' },
  { tier: 'enterprise', taskType: 'sentiment_analysis', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'enterprise', taskType: 'content_categorization', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'enterprise', taskType: 'engagement_prediction', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'enterprise', taskType: 'content_strategy', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'competitive_analysis', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'trend_analysis', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'performance_insights', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'comment_replies', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'enterprise', taskType: 'customer_support', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'social_listening', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'chatbot', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'brand_voice_analysis', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'smart_replies', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'enterprise', taskType: 'advanced_social_listening', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'retrieval', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'semantic_search', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'enterprise', taskType: 'workflow_automation', model: 'claude-4-sonnet' },

  // Smart Content Creator Features for Enterprise
  { tier: 'enterprise', taskType: 'analytics', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'content_performance_prediction', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'ab_test_generation', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'enterprise', taskType: 'ab_test_analysis', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'content_repurposing', model: 'claude-3-5-sonnet-20241022' },
  { tier: 'enterprise', taskType: 'content_series_generation', model: 'claude-4-sonnet' },
  { tier: 'enterprise', taskType: 'cross_platform_adaptation', model: 'claude-3-5-sonnet-20241022' },

  // ANONYMOUS TIER (limited access)
  { tier: 'anonymous', taskType: 'chatbot', model: 'claude-3-5-haiku-20241022' }
];

/**
 * POST - Seed the database with default AI model configurations
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAdminAccess = await checkAdminAccess(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Admin access required' 
      }, { status: 403 });
    }

    const body = await req.json();
    const { force = false } = body; // Option to force overwrite existing configs

    logger.info('Starting AI model configurations seeding', {
      adminId: session.user.id,
      force
    });

  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const batch = writeBatch(firestore);
    let seededCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const config of defaultModelConfigurations) {
      const docId = `${config.tier}_${config.taskType}`;
      const docRef = doc(firestore, 'aiModelConfigurations', docId);

      try {
        // Check if configuration already exists (unless forcing)
        if (!force) {
          const existingDoc = await getDoc(docRef);
          if (existingDoc.exists()) {
            skippedCount++;
            continue;
          }
        }

            // Set default parameters based on tier        
            let parameters: {          
                temperature: number;          
                maxTokens: number;          
                qualityPreference: 'standard' | 'high' | 'highest';        
            } = {          
                temperature: 0.7,          
                maxTokens: 1000,          
                qualityPreference: 'standard'        
            };        
            switch (config.tier) {          
                case 'enterprise':            
                parameters = {              
                    temperature: 0.75,              
                    maxTokens: 1250,              
                    qualityPreference: 'highest'            
                };            
                break;          
                case 'influencer':            
                parameters = {              
                    temperature: 0.7,              
                    maxTokens: 1100,              
                    qualityPreference: 'high'            
                };            
                break;
          case 'creator':
            parameters = {
              temperature: 0.7,
              maxTokens: 1000,
              qualityPreference: 'standard' as const
            };
            break;
          case 'anonymous':
            parameters = {
              temperature: 0.3,
              maxTokens: 150,
              qualityPreference: 'standard' as const
            };
            break;
        }

        const configData = {
          tier: config.tier,
          taskType: config.taskType,
          model: config.model,
          parameters,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: session.user.id,
          updatedBy: session.user.id
        };

        batch.set(docRef, configData);
        seededCount++;

      } catch (error) {
        const errorMsg = `Failed to process ${docId}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        logger.error('Error processing model configuration', { 
          docId, 
          error,
          adminId: session.user.id 
        });
      }
    }

    // Commit all changes
    if (seededCount > 0) {
      await batch.commit();
    }

    const response = {
      success: true,
      message: `Database seeding completed successfully`,
      results: {
        seededCount,
        skippedCount,
        totalConfigurations: defaultModelConfigurations.length,
        errors: errors.length > 0 ? errors : undefined
      }
    };

    logger.info('AI model configurations seeding completed', {
      adminId: session.user.id,
      seededCount,
      skippedCount,
      errors: errors.length
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Error seeding AI model configurations', { 
      error: error instanceof Error ? error.message : String(error),
      adminId: (await getServerSession(authOptions))?.user?.id
    });
    
    return NextResponse.json({ 
      error: 'Failed to seed database',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Check seeding status
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAdminAccess = await checkAdminAccess(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Admin access required' 
      }, { status: 403 });
    }

    // Count existing configurations
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const configsSnapshot = await getDocs(collection(firestore, 'aiModelConfigurations'));
    const existingCount = configsSnapshot.size;
    const expectedCount = defaultModelConfigurations.length;

    const isSeeded = existingCount >= expectedCount;
    const needsSeeding = existingCount === 0;

    return NextResponse.json({
      success: true,
      status: {
        isSeeded,
        needsSeeding,
        existingCount,
        expectedCount,
        completionPercentage: Math.round((existingCount / expectedCount) * 100)
      },
      message: isSeeded 
        ? 'Database appears to be fully seeded'
        : needsSeeding
        ? 'Database needs initial seeding'
        : 'Database is partially seeded'
    });

  } catch (error) {
    logger.error('Error checking seeding status', { 
      error: error instanceof Error ? error.message : String(error),
      adminId: (await getServerSession(authOptions))?.user?.id
    });
    
    return NextResponse.json({ 
      error: 'Failed to check seeding status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
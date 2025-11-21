import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { TokenService } from '../../../../lib/tokens/token-service';
import { AIOrchestrationFactory } from '../../../../lib/features/ai/orchestration/AIOrchestrationFactory';
import { AITaskConfig } from '../../../../lib/features/ai/orchestration/AIOrchestrator';
import { AIFactory } from '../../../../lib/features/ai/factory';
import { logger } from '../../../../lib/core/logging/logger';
import { ProviderType } from '../../../../lib/features/ai/models';
import { TokenRepository } from '../../../../lib/tokens/token-repository';
import { NotificationService } from '../../../../lib/core/notifications/NotificationService';
import { firestore } from '../../../../lib/core/firebase';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * Helper function to get organization ID using organization-centric approach
 */
function getOrganizationId(user: any): string {
  return user.currentOrganizationId || user.personalOrganizationId;
}

/**
 * API route handler for AI orchestration tasks
 * @param req API request
 * @returns API response
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request
    const { 
      taskType, 
      inputs = {}, 
      config = {},
      model = 'gpt-3.5-turbo',
      providerType = ProviderType.OPENAI
    } = await req.json();
    
    if (!taskType) {
      return NextResponse.json(
        { error: 'Task type is required' },
        { status: 400 }
      );
    }
    
    // Create dependencies
    const tokenRepository = new TokenRepository(firestore as any);
    const notificationService = new NotificationService();
    const tokenService = new TokenService(tokenRepository, notificationService);
    const aiFactory = new AIFactory();
    const provider = aiFactory.getProvider(providerType, model);
    
    // Create orchestration factory and get orchestrator
    const orchestrationFactory = AIOrchestrationFactory.getInstance(tokenService);
    
    const orchestrator = orchestrationFactory.getOrCreateOrchestrator(
      provider,
      {
        userId: session.user.id,
        organizationId: getOrganizationId(session.user)
      }
    );
    
    // Set up task configuration
    const taskConfig: AITaskConfig = {
      userId: session.user.id,
      organizationId: getOrganizationId(session.user),
      model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enableRAG: config.enableRAG,
      useCache: config.useCache !== false,
      metadata: {
        ...config.metadata,
        source: 'api',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      }
    };
    
    // Execute the task
    logger.info('Executing AI task via API', { 
      taskType, 
      userId: session.user.id,
      model
    });
    
    const result = await orchestrator.executeTask(
      taskType,
      inputs,
      taskConfig
    );
    
    // Return the result
    return NextResponse.json(result);
    } catch (error) {
    logger.error('Error in AI orchestration API', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * API route handler for RAG-enhanced generation
 * @param req API request
 * @returns API response
 */
export async function PUT(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request
    const { 
      prompt, 
      queryText,
      documentTypes,
      tags,
      model = 'gpt-3.5-turbo',
      providerType = ProviderType.OPENAI,
      config = {}
    } = await req.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    // Create dependencies
    const tokenRepository = new TokenRepository(firestore as any);
    const notificationService = new NotificationService();
    const tokenService = new TokenService(tokenRepository, notificationService);
    const aiFactory = new AIFactory();
    const provider = aiFactory.getProvider(providerType, model);
    
    // Create orchestration factory and get orchestrator
    const orchestrationFactory = AIOrchestrationFactory.getInstance(tokenService);
    
    const orchestrator = orchestrationFactory.getOrCreateOrchestrator(
      provider,
      {
        userId: session.user.id,
        organizationId: getOrganizationId(session.user)
      }
    );
    
    // Set up task configuration
    const taskConfig: AITaskConfig & {
      queryText?: string;
      documentTypes?: string[];
      tags?: string[];
    } = {
      userId: session.user.id,
      organizationId: getOrganizationId(session.user),
      model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enableRAG: true,
      useCache: config.useCache !== false,
      queryText,
      documentTypes,
      tags,
      metadata: {
        ...config.metadata,
        source: 'api',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      }
    };
    
    // Execute RAG generation
    logger.info('Executing RAG generation via API', { 
      promptLength: prompt.length, 
      userId: session.user.id,
      model
    });
    
    const result = await orchestrator.generateWithRAG(
      prompt,
      taskConfig
    );
    
    // Return the result
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in RAG generation API', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * API route handler for multi-tool analysis
 * @param req API request
 * @returns API response
 */
export async function PATCH(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request
    const { 
      content, 
      analysisTypes = ['sentiment', 'topics', 'keywords'],
      model = 'gpt-3.5-turbo',
      providerType = ProviderType.OPENAI,
      config = {}
    } = await req.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    // Create dependencies
    const tokenRepository = new TokenRepository(firestore as any);
    const notificationService = new NotificationService();
    const tokenService = new TokenService(tokenRepository, notificationService);
    const aiFactory = new AIFactory();
    const provider = aiFactory.getProvider(providerType, model);
    
    // Create orchestration factory and get orchestrator
    const orchestrationFactory = AIOrchestrationFactory.getInstance(tokenService);
    
    const orchestrator = orchestrationFactory.getOrCreateOrchestrator(
      provider,
      {
        userId: session.user.id,
        organizationId: getOrganizationId(session.user)
      }
    );
    
    // Set up task configuration
    const taskConfig: AITaskConfig = {
      userId: session.user.id,
      organizationId: getOrganizationId(session.user),
      model,
      temperature: config.temperature || 0.3,
      maxTokens: config.maxTokens,
      useCache: config.useCache !== false,
      metadata: {
        ...config.metadata,
        source: 'api',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      }
    };
    
    // Execute multi-tool analysis
    logger.info('Executing multi-tool analysis via API', { 
      contentLength: content.length, 
      analysisTypes,
      userId: session.user.id,
      model
    });
    
    const result = await orchestrator.multiToolAnalysis(
      content,
      analysisTypes,
      taskConfig
    );
    
    // Return the result
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in multi-tool analysis API', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
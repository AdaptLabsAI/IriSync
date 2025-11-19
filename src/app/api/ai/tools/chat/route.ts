/**
 * AI Chat API Route - Enhanced with Full Orchestration
 *
 * This endpoint provides intelligent AI chat with:
 * - Multi-model routing based on subscription tier
 * - Persistent conversation memory
 * - RAG-enhanced context retrieval
 * - Token management and usage tracking
 * - Streaming support for real-time responses
 *
 * Flow:
 * 1. Authenticate user and get subscription tier
 * 2. Get or create conversation
 * 3. Retrieve conversation history
 * 4. Perform RAG search for relevant context
 * 5. Route to appropriate AI model via AIService
 * 6. Store message and response
 * 7. Return response with sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';

// AI Services
import { AIService, AIServiceType } from '@/lib/features/ai/AIService';
import { conversationService } from '@/lib/features/ai/ConversationService';
import { RAGSystem } from '@/lib/features/rag/RAGSystem';
import { TokenRepository } from '@/lib/features/tokens/token-repository';
import { TokenService } from '@/lib/features/tokens/token-service';
import { NotificationService } from '@/lib/core/notifications/NotificationService';
import { AITaskType } from '@/lib/features/ai/models/AITask';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Initialize services
const tokenRepository = new TokenRepository(firestore as any);
const notificationService = new NotificationService();
const tokenService = new TokenService(tokenRepository, notificationService);
const ragSystem = new RAGSystem(tokenService, {
  embeddingModel: 'text-embedding-ada-002',
  maxSearchResults: 8
});
const aiService = AIService.getInstance();

/**
 * Extended user type with subscription tier
 */
interface ExtendedUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  subscriptionTier?: string;
}

/**
 * Request body interface
 */
interface ChatRequestBody {
  query: string;
  conversationId?: string;
  useRAG?: boolean;
  maxHistoryMessages?: number;
}

/**
 * POST /api/ai/tools/chat
 * Main chat endpoint with full AI orchestration
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. AUTHENTICATE USER
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to use AI chat' },
        { status: 401 }
      );
    }

    const user = session.user as ExtendedUser;
    const userId = user.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid Session', message: 'User ID not found in session' },
        { status: 400 }
      );
    }

    // 2. PARSE REQUEST BODY
    let body: ChatRequestBody;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const {
      query,
      conversationId,
      useRAG = true,
      maxHistoryMessages = 10
    } = body;

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // 3. GET USER'S ORGANIZATION AND SUBSCRIPTION TIER
    let organizationId: string | undefined;
    let subscriptionTier = 'creator'; // Default tier

    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        organizationId = userData.currentOrganizationId || userData.personalOrganizationId;

        // Get organization to check subscription tier
        if (organizationId) {
          const orgDoc = await getDoc(doc(firestore, 'organizations', organizationId));
          if (orgDoc.exists()) {
            const orgData = orgDoc.data();
            subscriptionTier = orgData.billing?.subscriptionTier || 'creator';
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to get user organization, using default tier', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
    }

    logger.info('Chat request received', {
      userId,
      organizationId,
      subscriptionTier,
      hasConversationId: !!conversationId,
      queryLength: query.length
    });

    // 4. GET OR CREATE CONVERSATION
    let activeConversationId: string;
    try {
      if (conversationId) {
        // Verify conversation exists and belongs to user
        const conversation = await conversationService.getConversation(conversationId);
        if (!conversation || conversation.userId !== userId) {
          logger.warn('Invalid conversation ID provided, creating new', {
            conversationId,
            userId
          });
          activeConversationId = await conversationService.getOrCreateActiveConversation(
            userId,
            organizationId
          );
        } else {
          activeConversationId = conversationId;
        }
      } else {
        activeConversationId = await conversationService.getOrCreateActiveConversation(
          userId,
          organizationId
        );
      }
    } catch (error) {
      logger.error('Failed to get or create conversation', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return NextResponse.json(
        { error: 'Server Error', message: 'Failed to initialize conversation' },
        { status: 500 }
      );
    }

    // 5. RETRIEVE CONVERSATION HISTORY
    const conversationHistory = await conversationService.getConversationHistory(
      activeConversationId,
      maxHistoryMessages
    );

    const formattedHistory = conversationService.formatMessagesForAI(
      conversationHistory,
      maxHistoryMessages
    );

    logger.debug('Retrieved conversation history', {
      conversationId: activeConversationId,
      messageCount: conversationHistory.length
    });

    // 6. PERFORM RAG SEARCH FOR CONTEXT
    let ragContext = '';
    let ragSources: Array<{
      id: string;
      title: string;
      url: string | null;
      type: string;
      excerpt: string;
      score: number;
    }> = [];

    if (useRAG) {
      try {
        const documentTypes = ['faq', 'documentation', 'blog_post', 'support_ticket'];

        // Perform similarity search
        const searchResults = await ragSystem.similaritySearch(
          query,
          {
            limit: 8,
            publicOnly: false,
            threshold: 0.65,
            includeDocuments: true,
            documentType: documentTypes[0] // RAGSystem searches one type at a time
          },
          userId
        );

        // Generate context from search results
        ragContext = ragSystem.generateContext(searchResults, 1500);

        // Extract sources
        ragSources = searchResults
          .filter((result) => result.score > 0.7)
          .map((result) => ({
            id: result.document?.id || result.chunk.documentId,
            title: result.document?.title || result.chunk.metadata?.title || 'Untitled',
            url: result.document?.metadata?.url || null,
            type: result.document?.documentType || 'Other',
            excerpt: result.chunk.content.substring(0, 150) + '...',
            score: result.score
          }));

        logger.debug('RAG search completed', {
          resultsFound: searchResults.length,
          sourcesIncluded: ragSources.length,
          contextLength: ragContext.length
        });
      } catch (error) {
        logger.warn('RAG search failed, continuing without context', {
          error: error instanceof Error ? error.message : String(error),
          userId
        });
        // Continue without RAG - don't fail the request
      }
    }

    // 7. STORE USER MESSAGE
    try {
      await conversationService.addMessage(activeConversationId, {
        role: 'user',
        content: query,
        metadata: {
          ragSourcesAvailable: ragSources.length
        }
      });
    } catch (error) {
      logger.warn('Failed to store user message', {
        error: error instanceof Error ? error.message : String(error),
        conversationId: activeConversationId
      });
      // Continue - storage failure shouldn't block response
    }

    // 8. BUILD CONTEXT FOR AI
    let contextualizedQuery = query;

    // Add conversation history if available
    if (formattedHistory.length > 0) {
      const historyContext = formattedHistory
        .slice(-5) // Last 5 messages for context
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');

      contextualizedQuery = `Previous conversation:\n${historyContext}\n\nCurrent question: ${query}`;
    }

    // Add RAG context if available
    if (ragContext) {
      contextualizedQuery = `${contextualizedQuery}\n\nRelevant context from knowledge base:\n${ragContext}`;
    }

    logger.debug('Built contextualized query', {
      originalLength: query.length,
      contextualizedLength: contextualizedQuery.length,
      hasHistory: formattedHistory.length > 0,
      hasRAG: !!ragContext
    });

    // 9. CALL AI SERVICE
    let aiResponse;
    try {
      aiResponse = await aiService.processChatbotRequest({
        userId,
        organizationId,
        message: contextualizedQuery,
        conversationHistory: formattedHistory.map((msg) => msg.content),
        context: ragContext || undefined
      });
    } catch (error) {
      logger.error('AI service request failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        conversationId: activeConversationId
      });

      return NextResponse.json(
        {
          error: 'AI Service Error',
          message: error instanceof Error ? error.message : 'Failed to generate response'
        },
        { status: 500 }
      );
    }

    // 10. CHECK IF AI REQUEST WAS SUCCESSFUL
    if (!aiResponse.success || !aiResponse.output) {
      logger.error('AI service returned unsuccessful response', {
        error: aiResponse.error,
        userId,
        conversationId: activeConversationId
      });

      return NextResponse.json(
        {
          error: 'AI Generation Failed',
          message: aiResponse.error || 'AI failed to generate a response'
        },
        { status: 500 }
      );
    }

    // 11. STORE AI RESPONSE
    try {
      await conversationService.addMessage(activeConversationId, {
        role: 'assistant',
        content: aiResponse.output,
        model: aiResponse.model,
        provider: aiResponse.provider,
        tokenUsage: aiResponse.tokenUsage,
        metadata: {
          ragSources: ragSources.length > 0 ? ragSources : undefined,
          serviceType: aiResponse.serviceType,
          charged: aiResponse.charged,
          latency: aiResponse.latency
        }
      });
    } catch (error) {
      logger.warn('Failed to store AI response', {
        error: error instanceof Error ? error.message : String(error),
        conversationId: activeConversationId
      });
      // Continue - storage failure shouldn't block response delivery
    }

    // 12. CALCULATE TOTAL LATENCY
    const totalLatency = Date.now() - startTime;

    logger.info('Chat request completed successfully', {
      userId,
      conversationId: activeConversationId,
      model: aiResponse.model,
      provider: aiResponse.provider,
      tokensUsed: aiResponse.tokenUsage?.total,
      latency: totalLatency,
      charged: aiResponse.charged
    });

    // 13. RETURN SUCCESS RESPONSE
    return NextResponse.json({
      success: true,
      answer: aiResponse.output,
      conversationId: activeConversationId,
      sources: ragSources,
      metadata: {
        model: aiResponse.model,
        provider: aiResponse.provider,
        tier: subscriptionTier,
        tokenUsage: aiResponse.tokenUsage,
        latency: totalLatency,
        charged: aiResponse.charged,
        messageCount: conversationHistory.length + 2 // +2 for current exchange
      }
    });
  } catch (error) {
    const totalLatency = Date.now() - startTime;

    logger.error('Unexpected error in chat endpoint', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latency: totalLatency
    });

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while processing your request'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/ai/tools/chat
 * API documentation endpoint
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    endpoints: {
      POST: {
        description: 'Generate AI chat response with context from conversation history and knowledge base',
        authentication: 'Required - NextAuth session',
        requestFormat: {
          query: 'User query string (required)',
          conversationId: 'Existing conversation ID (optional)',
          useRAG: 'Enable RAG context retrieval (optional, default: true)',
          maxHistoryMessages: 'Maximum history messages to include (optional, default: 10)'
        },
        responseFormat: {
          success: 'Boolean indicating success',
          answer: 'Generated AI response text',
          conversationId: 'Conversation ID for this exchange',
          sources: [
            {
              id: 'Source document ID',
              title: 'Source document title',
              url: 'URL to the source (if available)',
              type: 'Type of source document',
              excerpt: 'Short excerpt from the source',
              score: 'Relevance score (0-1)'
            }
          ],
          metadata: {
            model: 'AI model used',
            provider: 'AI provider (openai, anthropic, google)',
            tier: 'User subscription tier',
            tokenUsage: {
              prompt: 'Prompt tokens',
              completion: 'Completion tokens',
              total: 'Total tokens'
            },
            latency: 'Request latency in milliseconds',
            charged: 'Whether tokens were charged',
            messageCount: 'Total messages in conversation'
          }
        },
        errors: {
          401: 'Unauthorized - No valid session',
          400: 'Invalid Request - Missing or invalid parameters',
          500: 'Server Error - AI service or storage failure'
        }
      }
    },
    features: [
      'Multi-model AI routing based on subscription tier',
      'Persistent conversation memory across sessions',
      'RAG-enhanced context from knowledge base',
      'Automatic token management and usage tracking',
      'Conversation history retrieval',
      'Source attribution for knowledge base answers'
    ],
    supportedTiers: {
      creator: 'Claude Haiku, GPT-3.5, Gemini Flash',
      influencer: 'Claude Sonnet, GPT-3.5, Gemini Flash',
      enterprise: 'Claude 4 Sonnet, GPT-4o, Gemini Pro'
    }
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { validateSubscription } from '../../../../../lib/subscription/validate';
import VectorDatabase from '../../../../../lib/rag/vector-database';
import { logger } from '../../../../../lib/logging/logger';
import { AIProviderFactory, ProviderType, type AIProvider } from '../../../../../lib/ai/providers/AIProviderFactory';
import { trackDirectTokenUsage } from '../../../../../lib/tokens/token-tracker';
import TextChunker from '../../../../../lib/rag/text-chunker';

/**
 * Helper to extract user ID from authorization header
 * @param request Next.js request
 * @returns User ID if authenticated, null otherwise
 */
async function verifyAuth(request: NextRequest): Promise<string | null> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const authService = new AuthService();
    const payload = await authService.verifyToken(token);
    
    if (!payload) {
      return null;
    }
    
    return payload.userId;
  } catch (error) {
    logger.error('Auth error in RAG generate-response', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * API handler for generating responses with RAG context
 * 
 * Example payload:
 * {
 *   "query": "How do I connect my social accounts?",
 *   "filters": {
 *     "documentType": "documentation",
 *     "accessLevel": ["public", "registered"]
 *   },
 *   "collections": ["docs", "faq"],
 *   "maxContextLength": 4000,
 *   "temperature": 0.7,
 *   "includeSourceDocuments": true,
 *   "systemPrompt": "You are a helpful assistant..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check subscription access to RAG features
    const hasAccess = await validateSubscription(userId, 'rag-generate');
    if (!hasAccess) {
      return NextResponse.json({
        error: 'Subscription required',
        message: 'This feature requires an upgraded subscription'
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate request
    if (!body.query) {
      return NextResponse.json({
        error: 'Invalid request',
        message: 'Query is required'
      }, { status: 400 });
    }
    
    // Extract parameters
    const {
      query,
      filters = {},
      collections,
      maxContextLength = 4000,
      temperature = 0.7,
      includeSourceDocuments = false,
      systemPrompt = "You are a helpful assistant for IrisSync, a social media management platform. Answer the user's question based on the provided context. If you don't know the answer, say so instead of making up information."
    } = body;
    
    // Initialize AI provider using the factory
    const provider = AIProviderFactory.createProvider(
      ProviderType.OPENAI,
      { modelId: process.env.AI_MODEL_ID || 'gpt-3.5-turbo' }
    );
    
    logger.info('Generating response with RAG', {
      userId,
      query: query.substring(0, 100), // Log only first 100 chars of query for privacy
      filterCount: Object.keys(filters).length,
      collections
    });
    
    // 1. Perform search to retrieve relevant context
    const searchResults = await VectorDatabase.search({
      query,
      filters,
      collections,
      limit: 10, // Retrieve more documents than needed
      minRelevanceScore: 0.6
    });
    
    if (searchResults.length === 0) {
      logger.warn('No relevant documents found for RAG', { query: query.substring(0, 100) });
      
      // Generate response without context
      const fallbackResponse = await provider.generateChat([
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: `${query}\n\nNote: I don't have specific information about this in my knowledge base.` }
      ], {
        temperature,
        maxTokens: 500
      });
      
      // Track token usage
      const estimatedTokens = 500; // Rough estimate for tracking
      await trackDirectTokenUsage(userId, 'rag-generate', estimatedTokens, {
        withContext: false,
        queryLength: query.length,
        mode: 'fallback'
      });
      
      return NextResponse.json({
        success: true,
        response: fallbackResponse,
        hasContext: false,
        sourceDocuments: []
      });
    }
    
    // 2. Prepare context from search results
    // Sort by relevance score
    const sortedResults = [...searchResults].sort((a, b) => b.score - a.score);
    
    // Prepare context string from results
    let contextText = '';
    const usedDocuments = [];
    
    for (const result of sortedResults) {
      // Skip very low relevance results
      if (result.score < 0.6) continue;
      
      const documentContext = `DOCUMENT TITLE: ${result.metadata.title || 'Untitled'}
SOURCE: ${result.metadata.documentType || 'Unknown'}
CONTENT:
${result.content}
---
`;
      
      // Check if adding this document would exceed max context length
      if (TextChunker.countTokens(contextText + documentContext) > maxContextLength) {
        // If context is already large enough, stop adding more
        if (contextText.length > 0) break;
        
        // If this is the first document and it's too large, truncate it
        const truncatedDocument = TextChunker.truncateToTokenLimit(documentContext, maxContextLength);
        contextText = truncatedDocument;
        usedDocuments.push({
          id: result.id,
          title: result.metadata.title || 'Untitled',
          documentType: result.metadata.documentType,
          score: result.score,
          truncated: true
        });
        break;
      }
      
      // Add this document to context
      contextText += documentContext;
      usedDocuments.push({
        id: result.id,
        title: result.metadata.title || 'Untitled',
        documentType: result.metadata.documentType,
        url: result.metadata.url,
        score: result.score,
        truncated: false
      });
    }
    
    // 3. Generate response with context
    logger.debug('Generating response with context', {
      contextLength: contextText.length,
      documentsUsed: usedDocuments.length
    });
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `I need information about: ${query}\n\nHere is the relevant context:\n\n${contextText}` }
    ];
    
    const response = await provider.generateChat(messages, {
      temperature,
      maxTokens: 1000
    });
    
    // 4. Track token usage
    const estimatedInputTokens = TextChunker.countTokens(contextText) + TextChunker.countTokens(query) + TextChunker.countTokens(systemPrompt);
    const estimatedOutputTokens = TextChunker.countTokens(response);
    const totalEstimatedTokens = estimatedInputTokens + estimatedOutputTokens;
    
    await trackDirectTokenUsage(userId, 'rag-generate', totalEstimatedTokens, {
      withContext: true,
      documentsUsed: usedDocuments.length,
      contextTokens: estimatedInputTokens,
      responseTokens: estimatedOutputTokens
    });
    
    // 5. Return the result
    return NextResponse.json({
      success: true,
      response,
      hasContext: true,
      sourceDocuments: includeSourceDocuments ? usedDocuments : undefined,
      documentsUsed: usedDocuments.length,
      estimatedTokensUsed: totalEstimatedTokens
    });
    
  } catch (error) {
    logger.error('Error generating response with RAG', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      error: 'Failed to generate response',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * API handler for validating request format
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    endpoints: {
      'POST': {
        description: 'Generate AI response with RAG context',
        requestFormat: {
          query: 'User query string',
          filters: {
            documentType: 'String or array of document types',
            accessLevel: 'String or array of access levels',
            // Any other filters
          },
          collections: 'Array of collection names to search in',
          maxContextLength: 'Maximum context token length (default: 4000)',
          temperature: 'Temperature for generation (0-1, default: 0.7)',
          includeSourceDocuments: 'Whether to include source documents in response (default: false)',
          systemPrompt: 'Custom system prompt (optional)'
        }
      }
    }
  });
} 
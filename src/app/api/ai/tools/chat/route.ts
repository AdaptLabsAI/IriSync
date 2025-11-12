import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { firestore } from '@/lib/core/firebase';
import { RAGSystem } from '@/lib/features/rag/RAGSystem';
import { logger } from '@/lib/core/logging/logger';
import { NotificationService } from '@/lib/core/notifications/NotificationService';
import { TokenRepository } from '@/lib/features/tokens/token-repository';
import { TokenService } from '@/lib/features/tokens/token-service';
import { trackDirectTokenUsage } from '@/lib/features/tokens/token-tracker';

// Create necessary services
const tokenRepository = new TokenRepository(firestore as any);
const notificationService = new NotificationService();
const tokenService = new TokenService(tokenRepository, notificationService);

// Initialize RAG system with token service
const ragSystem = new RAGSystem(tokenService, {
  embeddingModel: 'text-embedding-ada-002',
  maxSearchResults: 8
});

// Simple token estimation function since we can't access the private one
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

// Subscription tier type
type SubscriptionTier = 'creator' | 'influencer' | 'enterprise';

// Extended user type with our custom fields
interface ExtendedUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  subscriptionTier?: SubscriptionTier;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    
    // Parse request
    const body = await request.json();
    const { query, history = [] } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    // Get user's subscription tier if authenticated
    const user = session?.user as ExtendedUser | undefined;
    const subscriptionTier = user?.subscriptionTier || 'creator' as SubscriptionTier;
    const userId = user?.id;
    
    // Define document types to prioritize
    const documentTypes = ['faq', 'documentation', 'blog_post', 'support_ticket'];
    
    // Retrieve relevant documents using similarity search
    const searchResults = await ragSystem.similaritySearch(
      query,
      {
        limit: 8,
        publicOnly: !userId,
        threshold: 0.65,
        includeDocuments: true,
        documentType: documentTypes[0] // Can only search one type at a time with RAGSystem
      },
      userId || 'anonymous'
    );
    
    // Build context from retrieved documents
    const context = ragSystem.generateContext(
      searchResults,
      1500 // Max tokens for context
    );
    
    // Use fetch to call OpenAI API directly since we don't have access to the provider factory
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    
    // Create chat completion request
    const chatCompletionRequest = {
      model: process.env.AI_MODEL_ID || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant for IriSync, a social media management platform. 
                   Answer the user's question based on the provided context.
                   If the information isn't in the context, just say you don't have that information.`
        },
        {
          role: 'user',
          content: `Query: ${query}\n\nContext: ${context || "No relevant context found."}\n\n${
            history.length > 0 ? "Previous conversation:\n" + 
            history.slice(-3).map((h: any) => `${h.role}: ${h.content}`).join('\n') : ""
          }`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    };
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(chatCompletionRequest)
    });
    
    // Parse response
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${result.error?.message || 'Unknown error'}`);
    }
    
    const answer = result.choices[0].message.content;
    
    // Track token usage if user is authenticated
    if (userId) {
      await trackDirectTokenUsage(userId, 'chat', estimateTokens(query + context) + estimateTokens(answer), {
        withContext: context.length > 0,
        queryLength: query.length,
        documentCount: searchResults.length
      });
    }
    
    // Extract and format sources from search results
    const sources = searchResults
      .filter(result => result.score > 0.7) // Only include high-confidence sources
      .map(result => ({
        id: result.document?.id || result.chunk.documentId,
        title: result.document?.title || result.chunk.metadata?.title || 'Untitled',
        url: result.document?.metadata?.url || null,
        type: result.document?.documentType || 'Other',
        excerpt: result.chunk.content.substring(0, 150) + '...'
      }));
    
    // Return the generated answer and sources
    return NextResponse.json({
      answer,
      sources
    });
    
  } catch (error) {
    logger.error('Error in AI chat endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

/**
 * API handler for validating request format
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    endpoints: {
      'POST': {
        description: 'Generate AI chat response with context from knowledge base',
        requestFormat: {
          query: 'User query string (required)',
          history: [
            {
              role: 'user or assistant',
              content: 'Message content'
            }
          ]
        },
        responseFormat: {
          answer: 'Generated AI response text',
          sources: [
            {
              id: 'Source document ID',
              title: 'Source document title',
              url: 'URL to the source (if available)',
              type: 'Type of source document',
              excerpt: 'Short excerpt from the source'
            }
          ]
        }
      }
    }
  });
} 
import { NextRequest, NextResponse } from 'next/server';
import { AIProviderFactory } from '@/lib/features/ai/providers/AIProviderFactory';
import { ProviderType } from '@/lib/features/ai/providers/ProviderType';
import { logger } from '@/lib/core/logging/logger';
import { firestore } from '@/lib/core/firebase';
import { collection, getDocs, query as firestoreQuery, limit as firestoreLimit, orderBy, where } from 'firebase/firestore';
import { RAGService, RAGQueryParams } from '@/lib/features/rag/rag-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';

// Collection names
const KB_COLLECTION = 'knowledgeContent';
const FAQ_COLLECTION = 'supportFaqs';

// Type for FAQ result
interface FAQResult {
  id: string;
  question: string;
  answer: string;
}

// Define vector search result type
interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

/**
 * Auto-response API endpoint for support tickets
 * This endpoint uses RAG (Retrieval Augmented Generation) to generate context-aware responses
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization (admin or system)
    const session = await getServerSession(authOptions);
    const systemCall = request.headers.get('x-api-key') === process.env.INTERNAL_API_KEY;
    
    if (!systemCall && (!session?.user || !session.user.isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request parameters
    const { subject, message, userId, ticketId, tier = 'creator' } = await request.json();
    
    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    // Initialize RAG service based on subscription tier
    const ragService = new RAGService();
    await ragService.initialize();

    // Get relevant knowledge base documents
    let relevantDocs = await ragService.retrieveRelevantDocuments({
      query: subject + ' ' + message,
      limit: 5
    });
    
    // If no knowledge docs found or not enough context, get FAQs
    if (relevantDocs.length < 2) {
      const faqs = await getFAQs(subject);
      // Create properly structured objects to match VectorSearchResult
      const faqDocs: VectorSearchResult[] = faqs.map(faq => ({
        id: faq.id,
        content: `Question: ${faq.question}\nAnswer: ${faq.answer}`,
        score: 0.7, // Default score for FAQs
        metadata: { type: 'faq', id: faq.id }
      }));
      relevantDocs = relevantDocs.concat(faqDocs);
    }

    // Create context from retrieved documents
    const context = relevantDocs.map((doc: any) => doc.content).join('\n\n');

    // Select appropriate model based on tier
    const aiModel = getModelForTier(tier);
    const aiProvider = AIProviderFactory.createProvider(
      aiModel.provider,
      { modelId: aiModel.modelId }
    );

    // Generate response with context
    const prompt = `
You are a professional, helpful support assistant for IriSync, a social media management platform with AI capabilities, and your name is Iris.

SUPPORT TICKET:
Subject: ${subject}
Message: ${message}

CONTEXT FROM KNOWLEDGE BASE:
${context}

Your task:
1. Provide a helpful, friendly response that directly addresses the user's issue
2. Use specific information from the context if relevant
3. If the issue seems complex or can't be fully resolved, offer a reassurance that a support agent will review
4. Format your response in simple HTML for better readability (use p, ul, ol, li, strong, em tags only)
5. Keep your response concise but complete

Response:
`;

    const suggestedResponse = await aiProvider.generateText(prompt, {
      temperature: 0.5,
      maxTokens: 500
    });

    // Check for sufficient context and quality
    const confidenceScore = calculateConfidenceScore(subject, message, relevantDocs);
    const shouldEscalate = confidenceScore < 0.65;

    // Log the auto-response attempt
    logger.info('Generated auto-response', {
      ticketId,
      userId,
      confidenceScore,
      shouldEscalate,
      documentCount: relevantDocs.length,
      modelUsed: aiModel.modelId
    });

    return NextResponse.json({
      suggestedResponse,
      confidenceScore,
      shouldEscalate,
      sources: relevantDocs.map((doc: VectorSearchResult) => doc.metadata),
      modelUsed: aiModel.modelId
    });
  } catch (error: any) {
    logger.error('Error generating auto-response', { error });
    return NextResponse.json({
      error: 'Failed to generate auto-response',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Get relevant FAQs from the database
 */
async function getFAQs(query: string): Promise<FAQResult[]> {
  try {
    // This is a simplified approach - in production, use semantic search
    const faqsRef = collection(firestore, FAQ_COLLECTION);
    const faqsQuery = firestoreQuery(faqsRef, orderBy('updatedAt', 'desc'), firestoreLimit(3));
    const snapshot = await getDocs(faqsQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        question: data.question as string,
        answer: data.answer as string
      };
    });
  } catch (error) {
    logger.error('Error fetching FAQs', { error });
    return [];
  }
}

/**
 * Calculate a confidence score for the auto-response
 */
function calculateConfidenceScore(subject: string, message: string, docs: any[]): number {
  if (docs.length === 0) return 0.1;
  
  // Calculate relevance based on document count and types
  const docCountScore = Math.min(docs.length / 5, 1) * 0.5;
  
  // Calculate keyword match score
  const keywords = extractKeywords(subject + ' ' + message);
  let keywordMatchCount = 0;
  
  for (const doc of docs) {
    for (const keyword of keywords) {
      if (doc.content.toLowerCase().includes(keyword.toLowerCase())) {
        keywordMatchCount++;
      }
    }
  }
  
  const keywordScore = keywords.length > 0 
    ? Math.min(keywordMatchCount / (keywords.length * 2), 1) * 0.5
    : 0.25;
  
  return docCountScore + keywordScore;
}

/**
 * Extract keywords from text (simplified implementation)
 */
function extractKeywords(text: string): string[] {
  // Remove common words and punctuation
  const cleanText = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into words and filter out common words
  const words = cleanText.split(' ');
  const commonWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'is', 'are', 'in', 'for', 'to', 'of', 'with'];
  
  const filteredWords = words.filter(word => 
    word.length > 3 && !commonWords.includes(word)
  );
  
  // Return unique keywords
  return Array.from(new Set(filteredWords));
}

/**
 * Select appropriate AI model based on user's subscription tier
 */
function getModelForTier(tier: string): { provider: ProviderType; modelId: string } {
  switch (tier) {
    case 'enterprise':
      return { provider: ProviderType.ANTHROPIC, modelId: 'claude-3-sonnet-20240229' };
    case 'influencer':
      return { provider: ProviderType.OPENAI, modelId: 'gpt-3.5-turbo' };
    case 'creator':
    default:
      return { provider: ProviderType.GOOGLE, modelId: 'gemini-1.0-pro' };
  }
} 
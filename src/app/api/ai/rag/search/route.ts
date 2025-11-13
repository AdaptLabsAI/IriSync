import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { validateSubscription } from '../../../../../lib/subscription/validate';
import VectorDatabase, { VectorSearchParams } from '../../../../../lib/rag/vector-database';
import { logger } from '../../../../../lib/core/logging/logger';
import { AccessLevel, DocumentType } from '../../../../../lib/rag/document-processor';
import { trackDirectTokenUsage } from '../../../../../lib/tokens/token-tracker';

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
    logger.error('Auth error in RAG search', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * API handler for searching documents with RAG
 * 
 * Example payload:
 * {
 *   "query": "How do I connect social accounts?",
 *   "filters": {
 *     "documentType": "documentation",
 *     "accessLevel": ["public", "registered"]
 *   },
 *   "collections": ["docs", "faq"],
 *   "limit": 5,
 *   "minRelevanceScore": 0.7
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
    const hasAccess = await validateSubscription(userId, 'rag-search');
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
        message: 'Search query is required'
      }, { status: 400 });
    }
    
    // Extract search parameters
    const {
      query,
      filters = {},
      collections,
      limit = 5,
      minRelevanceScore = 0.7
    } = body;
    
    // Process access level filters for array or string
    if (filters.accessLevel) {
      // Validate access levels if provided
      const accessLevels = Array.isArray(filters.accessLevel) 
        ? filters.accessLevel 
        : [filters.accessLevel];
        
      const validAccessLevels = accessLevels.every((level: string) => 
        Object.values(AccessLevel).map(val => val as string).includes(level)
      );
      
      if (!validAccessLevels) {
        return NextResponse.json({
          error: 'Invalid access level',
          message: `Valid access levels are: ${Object.values(AccessLevel).join(', ')}`
        }, { status: 400 });
      }
    }
    
    // Process document type filters for array or string
    if (filters.documentType) {
      // Validate document types if provided
      const documentTypes = Array.isArray(filters.documentType) 
        ? filters.documentType 
        : [filters.documentType];
        
      const validDocumentTypes = documentTypes.every((type: string) => 
        Object.values(DocumentType).map(val => val as string).includes(type)
      );
      
      if (!validDocumentTypes) {
        return NextResponse.json({
          error: 'Invalid document type',
          message: `Valid types are: ${Object.values(DocumentType).join(', ')}`
        }, { status: 400 });
      }
    }
    
    logger.info('Searching documents with RAG', {
      userId,
      query: query.substring(0, 100), // Log only first 100 chars of query for privacy
      filterCount: Object.keys(filters).length,
      collections,
      limit
    });
    
    // Prepare search parameters
    const searchParams: VectorSearchParams = {
      query,
      filters,
      collections,
      limit,
      minRelevanceScore
    };
    
    // Perform the search
    const results = await VectorDatabase.search(searchParams);
    
    // Track token usage (1 token per search)
    await trackDirectTokenUsage(userId, 'rag-search', 1, {
      queryLength: query.length,
      resultCount: results.length,
      collections
    });
    
    // Process results to include only necessary information
    const processedResults = results.map(result => ({
      id: result.id,
      score: result.score,
      content: result.content,
      title: result.metadata.title || result.title,
      documentId: result.metadata.documentId,
      documentType: result.metadata.documentType,
      url: result.metadata.url || result.url,
      isFullDocument: result.metadata.isFullDocument || false,
      chunkIndex: result.metadata.chunkIndex,
      totalChunks: result.metadata.totalChunks
    }));
    
    // Return the search results
    return NextResponse.json({
      success: true,
      query,
      results: processedResults,
      count: processedResults.length
    });
    
  } catch (error) {
    logger.error('Error searching documents with RAG', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      error: 'Failed to search documents',
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
        description: 'Search documents with RAG',
        requestFormat: {
          query: 'Search query string',
          filters: {
            documentType: `${Object.values(DocumentType).join('|')} or array of these`,
            accessLevel: `${Object.values(AccessLevel).join('|')} or array of these`,
            tags: 'array of tag strings',
            author: 'string',
            // Any other metadata filters can be added
          },
          collections: 'Array of collection names to search in',
          limit: 'Number of results to return (default: 5)',
          minRelevanceScore: 'Minimum relevance score (0-1, default: 0.7)'
        }
      }
    }
  });
} 
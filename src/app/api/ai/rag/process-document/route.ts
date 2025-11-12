import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { validateSubscription } from '../../../../../lib/subscription/validate';
import documentProcessor, { ChunkingStrategy, DocumentType, AccessLevel } from '../../../../../lib/rag/document-processor';
import { logger } from '../../../../../lib/logging/logger';
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
    logger.error('Auth error in RAG process-document', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * API handler for processing documents with RAG
 * 
 * Example payload:
 * {
 *   "document": {
 *     "title": "Getting Started with IrisSync",
 *     "content": "This is the document content...",
 *     "type": "documentation",
 *     "url": "https://example.com/docs",
 *     "metadata": {
 *       "author": "John Doe",
 *       "tags": ["getting-started", "documentation"]
 *     }
 *   },
 *   "options": {
 *     "chunkSize": 500,
 *     "chunkOverlap": 100,
 *     "strategy": "paragraph",
 *     "collection": "docs"
 *   }
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
    const hasAccess = await validateSubscription(userId, 'rag-document-processing');
    if (!hasAccess) {
      return NextResponse.json({
        error: 'Subscription required',
        message: 'This feature requires an upgraded subscription'
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate request
    if (!body.document || !body.document.content) {
      return NextResponse.json({
        error: 'Invalid request',
        message: 'Document content is required'
      }, { status: 400 });
    }
    
    // Extract document and options
    const { document, options = {} } = body;
    
    // Validate document type if provided
    if (document.type && !Object.values(DocumentType).includes(document.type)) {
      return NextResponse.json({
        error: 'Invalid document type',
        message: `Valid types are: ${Object.values(DocumentType).join(', ')}`
      }, { status: 400 });
    }
    
    // Validate access level if provided
    if (document.accessLevel && !Object.values(AccessLevel).includes(document.accessLevel)) {
      return NextResponse.json({
        error: 'Invalid access level',
        message: `Valid access levels are: ${Object.values(AccessLevel).join(', ')}`
      }, { status: 400 });
    }
    
    // Validate chunking strategy if provided
    if (options.strategy && !Object.values(ChunkingStrategy).includes(options.strategy)) {
      return NextResponse.json({
        error: 'Invalid chunking strategy',
        message: `Valid strategies are: ${Object.values(ChunkingStrategy).join(', ')}`
      }, { status: 400 });
    }
    
    // Set defaults
    const documentWithDefaults = {
      id: document.id || undefined,
      content: document.content,
      title: document.title || 'Untitled Document',
      type: document.type || DocumentType.CUSTOM,
      accessLevel: document.accessLevel || AccessLevel.PRIVATE,
      url: document.url,
      organizationId: document.organizationId,
      metadata: document.metadata || {}
    };
    
    // Set processing options
    const processingOptions = {
      chunkSize: options.chunkSize || 1000,
      chunkOverlap: options.chunkOverlap || 200,
      strategy: options.strategy || ChunkingStrategy.PARAGRAPH,
      embedAll: options.embedAll || false,
      collection: options.collection || 'default',
      preserveWhitespace: options.preserveWhitespace || false,
      minChunkLength: options.minChunkLength || 50
    };
    
    logger.info('Processing document for RAG', {
      userId,
      documentTitle: documentWithDefaults.title,
      documentType: documentWithDefaults.type,
      strategy: processingOptions.strategy,
      collection: processingOptions.collection
    });
    
    // Process the document
    const chunkIds = await documentProcessor.processDocument(
      documentWithDefaults,
      processingOptions,
      userId
    );
    
    // Track token usage for this operation (1 token per chunk, with a minimum of 1)
    const tokensUsed = Math.max(1, chunkIds.length);
    await trackDirectTokenUsage(userId, 'rag-document-processing', tokensUsed, {
      documentId: documentWithDefaults.id,
      chunkCount: chunkIds.length,
      strategy: processingOptions.strategy
    });
    
    // Return the chunk IDs
    return NextResponse.json({
      success: true,
      documentId: documentWithDefaults.id,
      chunkCount: chunkIds.length,
      chunkIds,
      message: `Document processed into ${chunkIds.length} chunks`
    });
    
  } catch (error) {
    logger.error('Error processing document for RAG', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      error: 'Failed to process document',
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
        description: 'Process a document for RAG',
        requestFormat: {
          document: {
            id: 'optional-document-id',
            title: 'Document Title',
            content: 'Document content to process...',
            type: Object.values(DocumentType).join('|'),
            accessLevel: Object.values(AccessLevel).join('|'),
            url: 'optional-url',
            metadata: { 
              author: 'optional-author',
              tags: ['optional', 'tags']
            }
          },
          options: {
            chunkSize: 'number (default: 1000)',
            chunkOverlap: 'number (default: 200)',
            strategy: Object.values(ChunkingStrategy).join('|'),
            collection: 'string (default: "default")',
            embedAll: 'boolean (default: false)',
            preserveWhitespace: 'boolean (default: false)',
            minChunkLength: 'number (default: 50)'
          }
        }
      }
    }
  });
} 
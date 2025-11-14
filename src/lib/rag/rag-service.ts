import { RAGSystem, RAGDocument, SimilaritySearchResult } from './RAGSystem';
import { TokenService } from '../tokens/token-service';
import { TokenRepository } from '../tokens/token-repository';
import { NotificationService } from '../core/notifications/NotificationService';
import { getFirestore } from '../core/firebase/admin';
import { logger } from '../core/logging/logger';

export interface RAGQueryParams {
  query: string;
  limit?: number;
  documentType?: string;
  tags?: string[];
  threshold?: number;
}

export interface RAGSearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

/**
 * RAGService - Wrapper around RAGSystem for simplified API usage
 */
export class RAGService {
  private _ragSystem: RAGSystem | null = null;
  private _tokenService: TokenService | null = null;
  private isInitialized: boolean = false;

  /**
   * Lazy-load RAGSystem to avoid initialization during build time
   */
  private get ragSystem(): RAGSystem {
    if (!this._ragSystem) {
      const firestore = getFirestore();
      // Don't initialize during build when firestore is undefined
      if (!firestore) {
        throw new Error('Firestore is not available - cannot initialize RAGSystem');
      }
      const tokenRepository = new TokenRepository(firestore);
      const notificationService = new NotificationService();
      this._tokenService = new TokenService(tokenRepository, notificationService);
      this._ragSystem = new RAGSystem(this._tokenService, {
        embeddingModel: 'text-embedding-ada-002',
        chunkSize: 1000,
        chunkOverlap: 200,
        maxSearchResults: 10,
        cacheTtl: 3600,
        documentsCollection: 'ragDocuments',
        chunksCollection: 'ragChunks'
      });
    }
    return this._ragSystem;
  }

  /**
   * Lazy-load TokenService to avoid initialization during build time
   */
  private get tokenService(): TokenService {
    if (!this._tokenService) {
      // This will be initialized when ragSystem is accessed
      return this.ragSystem && this._tokenService!;
    }
    return this._tokenService;
  }

  /**
   * Initialize the RAG service
   */
  async initialize(): Promise<void> {
    try {
      // RAGSystem doesn't need explicit initialization
      this.isInitialized = true;
      logger.info('RAGService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RAGService', { error });
      throw error;
    }
  }

  /**
   * Retrieve relevant documents for a query
   */
  async retrieveRelevantDocuments(params: RAGQueryParams): Promise<RAGSearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('RAGService not initialized. Call initialize() first.');
    }

    try {
      logger.info('Retrieving relevant documents', { query: params.query, limit: params.limit });

      // Use RAGSystem's similarity search
      const results = await this.ragSystem.similaritySearch(
        params.query,
        {
          limit: params.limit || 5,
          documentType: params.documentType,
          tags: params.tags,
          threshold: params.threshold || 0.7,
          includeDocuments: true,
          publicOnly: true // For support tickets, use public knowledge base
        },
        'system', // Use system user for support queries
        undefined // No specific organization for public knowledge
      );

      // Convert SimilaritySearchResult to RAGSearchResult
      return results.map(result => ({
        id: result.chunk.id,
        content: result.chunk.content,
        score: result.score,
        metadata: {
          documentId: result.chunk.documentId,
          position: result.chunk.position,
          documentType: result.document?.documentType,
          tags: result.document?.tags,
          ...result.chunk.metadata
        }
      }));
    } catch (error) {
      logger.error('Error retrieving relevant documents', { error, params });
      throw error;
    }
  }

  /**
   * Add a document to the knowledge base
   */
  async addDocument(
    title: string,
    content: string,
    documentType: string,
    tags?: string[],
    metadata?: Record<string, any>
  ): Promise<RAGDocument> {
    if (!this.isInitialized) {
      throw new Error('RAGService not initialized. Call initialize() first.');
    }

    try {
      const document = await this.ragSystem.addDocument(
        {
          title,
          content,
          documentType,
          tags: tags || [],
          metadata: metadata || {},
          userId: 'system',
          isPublic: true
        },
        'system'
      );

      logger.info('Document added to knowledge base', { 
        documentId: document.id, 
        title, 
        documentType 
      });

      return document;
    } catch (error) {
      logger.error('Error adding document to knowledge base', { error, title });
      throw error;
    }
  }

  /**
   * Update a document in the knowledge base
   */
  async updateDocument(
    documentId: string,
    updates: {
      title?: string;
      content?: string;
      documentType?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<RAGDocument | null> {
    if (!this.isInitialized) {
      throw new Error('RAGService not initialized. Call initialize() first.');
    }

    try {
      const document = await this.ragSystem.updateDocument(
        documentId,
        updates,
        'system'
      );

      if (document) {
        logger.info('Document updated in knowledge base', { 
          documentId, 
          title: document.title 
        });
      }

      return document;
    } catch (error) {
      logger.error('Error updating document in knowledge base', { error, documentId });
      throw error;
    }
  }

  /**
   * Delete a document from the knowledge base
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('RAGService not initialized. Call initialize() first.');
    }

    try {
      const success = await this.ragSystem.deleteDocument(documentId, 'system');

      if (success) {
        logger.info('Document deleted from knowledge base', { documentId });
      }

      return success;
    } catch (error) {
      logger.error('Error deleting document from knowledge base', { error, documentId });
      throw error;
    }
  }

  /**
   * Generate context from search results
   */
  generateContext(results: RAGSearchResult[], maxTokens: number = 1500): string {
    // Convert RAGSearchResult back to SimilaritySearchResult format for RAGSystem
    const similarityResults: SimilaritySearchResult[] = results.map(result => ({
      chunk: {
        id: result.id,
        documentId: result.metadata.documentId || '',
        content: result.content,
        position: result.metadata.position || 0,
        metadata: result.metadata
      },
      score: result.score,
      document: undefined // Not needed for context generation
    }));

    return this.ragSystem.generateContext(similarityResults, maxTokens);
  }
} 
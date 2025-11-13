import { TokenService } from '../tokens/token-service';
import { Cache } from '../cache/Cache';
import { logger } from '../logging/logger';
import { firestore } from '../core/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  query as firestoreQuery, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit as firestoreLimit,
  QueryConstraint,
  DocumentData
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

/**
 * Document type for the RAG system
 */
export interface RAGDocument {
  /**
   * Unique identifier for the document
   */
  id: string;
  
  /**
   * Title of the document
   */
  title: string;
  
  /**
   * Content of the document
   */
  content: string;
  
  /**
   * Type of document (e.g., knowledge base, faq, product manual)
   */
  documentType: string;
  
  /**
   * Metadata for the document
   */
  metadata?: Record<string, any>;
  
  /**
   * User ID of the document owner
   */
  userId: string;
  
  /**
   * Organization ID the document belongs to
   */
  organizationId?: string;
  
  /**
   * List of tags for categorization
   */
  tags?: string[];
  
  /**
   * When the document was created
   */
  createdAt: Date;
  
  /**
   * When the document was last updated
   */
  updatedAt: Date;
  
  /**
   * Document embeddings for vector search
   */
  embeddings?: number[];
  
  /**
   * Whether the document is publicly accessible
   */
  isPublic: boolean;
}

/**
 * Options for document query
 */
export interface RAGQueryOptions {
  /**
   * Filter by document type
   */
  documentType?: string;
  
  /**
   * Filter by specific tags
   */
  tags?: string[];
  
  /**
   * Maximum number of results to return
   */
  limit?: number;
  
  /**
   * User ID for access control
   */
  userId?: string;
  
  /**
   * Organization ID for access control
   */
  organizationId?: string;
  
  /**
   * Whether to include document embeddings
   */
  includeEmbeddings?: boolean;
  
  /**
   * Whether to include only public documents
   */
  publicOnly?: boolean;
}

/**
 * Result of a RAG query
 */
export interface RAGQueryResult {
  /**
   * Documents matching the query
   */
  documents: RAGDocument[];
  
  /**
   * Total number of documents matching the query
   */
  totalCount: number;
  
  /**
   * Whether there are more documents beyond the current limit
   */
  hasMore: boolean;
  
  /**
   * Time taken to execute the query (in ms)
   */
  queryTimeMs: number;
}

/**
 * Handles chunking of documents
 */
export interface DocumentChunk {
  /**
   * ID of the chunk
   */
  id: string;
  
  /**
   * ID of the parent document
   */
  documentId: string;
  
  /**
   * Content of the chunk
   */
  content: string;
  
  /**
   * Embedding vector of the chunk
   */
  embedding?: number[];
  
  /**
   * Position of the chunk in the document
   */
  position: number;
  
  /**
   * Metadata for the chunk
   */
  metadata?: Record<string, any>;
}

/**
 * Similarity search result
 */
export interface SimilaritySearchResult {
  /**
   * Document chunk that matched
   */
  chunk: DocumentChunk;
  
  /**
   * Similarity score (0-1)
   */
  score: number;
  
  /**
   * Full document the chunk belongs to
   */
  document?: RAGDocument;
}

/**
 * Configuration for RAG system
 */
export interface RAGSystemConfig {
  /**
   * Embedding model to use
   */
  embeddingModel?: string;
  
  /**
   * Size of document chunks in tokens
   */
  chunkSize?: number;
  
  /**
   * Overlap between chunks in tokens
   */
  chunkOverlap?: number;
  
  /**
   * Maximum number of search results
   */
  maxSearchResults?: number;
  
  /**
   * Cache TTL in seconds
   */
  cacheTtl?: number;
  
  /**
   * Firestore collection name for documents
   */
  documentsCollection?: string;
  
  /**
   * Firestore collection name for chunks
   */
  chunksCollection?: string;
}

/**
 * Handles retrieval augmented generation for AI tools
 */
export class RAGSystem {
  private tokenService: TokenService;
  private cache: Cache;
  private config: Required<RAGSystemConfig>;
  
  /**
   * Create a new RAG system instance
   * @param tokenService Token service for tracking usage
   * @param config Configuration options
   */
  constructor(tokenService: TokenService, config?: RAGSystemConfig) {
    this.tokenService = tokenService;
    this.cache = new Cache('rag-system', {
      ttl: config?.cacheTtl || 3600,
      maxSize: 1000
    });
    
    // Set default configuration
    this.config = {
      embeddingModel: config?.embeddingModel || 'text-embedding-ada-002',
      chunkSize: config?.chunkSize || 500,
      chunkOverlap: config?.chunkOverlap || 50,
      maxSearchResults: config?.maxSearchResults || 5,
      cacheTtl: config?.cacheTtl || 3600,
      documentsCollection: config?.documentsCollection || 'rag_documents',
      chunksCollection: config?.chunksCollection || 'rag_chunks'
    };
    
    logger.info('RAG system initialized', { embeddingModel: this.config.embeddingModel });
  }
  
  /**
   * Add a document to the RAG system
   * @param document Document to add
   * @param userId User ID for ownership
   * @param orgId Organization ID for ownership
   * @returns Added document
   */
  async addDocument(
    document: Omit<RAGDocument, 'id' | 'createdAt' | 'updatedAt' | 'embeddings'>,
    userId: string,
    orgId?: string
  ): Promise<RAGDocument> {
    try {
      // Generate ID if not provided
      const documentId = uuidv4();
      
      // Create document with metadata
      const newDocument: RAGDocument = {
        id: documentId,
        title: document.title,
        content: document.content,
        documentType: document.documentType,
        metadata: document.metadata || {},
        userId: userId,
        organizationId: orgId,
        tags: document.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: document.isPublic || false
      };
      
      // Generate embeddings for the document
      const documentEmbeddings = await this.generateEmbeddings(document.content);
      
      // Store document in Firestore
      const docRef = doc(collection(firestore, this.config.documentsCollection), documentId);
      
      await setDoc(docRef, {
        ...newDocument,
        embeddings: documentEmbeddings,
        createdAt: Timestamp.fromDate(newDocument.createdAt),
        updatedAt: Timestamp.fromDate(newDocument.updatedAt)
      });
      
      // Process document into chunks for retrieval
      const chunks = this.chunkDocument({
        ...newDocument,
        embeddings: documentEmbeddings
      });
      
      // Store chunks in Firestore
      for (const chunk of chunks) {
        await addDoc(collection(firestore, this.config.chunksCollection), {
          ...chunk,
          documentId: chunk.documentId
        });
      }
      
      // Cache document
      const cacheKey = `document:${documentId}`;
      await this.cache.set(cacheKey, newDocument);
      
      logger.info('Document added to RAG system', {
        documentId,
        userId,
        orgId,
        chunksCount: chunks.length
      });
      
      return newDocument;
    } catch (error) {
      logger.error('Error adding document to RAG system', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        documentTitle: document.title
      });
      
      throw error;
    }
  }
  
  /**
   * Get a document by ID
   * @param documentId Document ID
   * @param userId User ID for access control
   * @returns Document or null if not found/no access
   */
  async getDocument(documentId: string, userId?: string): Promise<RAGDocument | null> {
    try {
      // Check cache first
      const cacheKey = `document:${documentId}`;
      const cachedDocument = await this.cache.get<RAGDocument>(cacheKey);
      
      if (cachedDocument) {
        // Verify access if userId is provided
        if (userId && !this.canAccessDocument(cachedDocument, userId)) {
          return null;
        }
        
        return cachedDocument;
      }
      
      // Fetch from Firestore
      const docRef = doc(firestore, this.config.documentsCollection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      // Convert Firestore data to RAGDocument
      const document = this.firestoreToRAGDocument(docSnap.data() as any);
      
      // Verify access if userId is provided
      if (userId && !this.canAccessDocument(document, userId)) {
        return null;
      }
      
      // Cache document
      await this.cache.set(cacheKey, document);
      
      return document;
    } catch (error) {
      logger.error('Error getting document from RAG system', {
        error: error instanceof Error ? error.message : String(error),
        documentId
      });
      
      return null;
    }
  }
  
  /**
   * Update an existing document
   * @param documentId Document ID
   * @param updates Document updates
   * @param userId User ID for ownership verification
   * @param orgId Organization ID
   * @returns Updated document or null if not found/no access
   */
  async updateDocument(
    documentId: string,
    updates: Partial<Omit<RAGDocument, 'id' | 'embeddings' | 'createdAt' | 'updatedAt'>>,
    userId: string,
    orgId?: string
  ): Promise<RAGDocument | null> {
    try {
      // Get existing document
      const existingDoc = await this.getDocument(documentId, userId);
      
      if (!existingDoc) {
        return null;
      }
      
      // Check ownership
      if (existingDoc.userId !== userId) {
        logger.warn('User does not own document', { documentId, userId });
        return null;
      }
      
      // Create updated document
      const updatedDoc: RAGDocument = {
        ...existingDoc,
        ...updates,
        updatedAt: new Date()
      };
      
      // Update document in Firestore
      const docRef = doc(firestore, this.config.documentsCollection, documentId);
      
      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: Timestamp.fromDate(updatedDoc.updatedAt)
      };
      
      // Generate new embeddings if content was updated
      if (updates.content) {
        // Delete old chunks
        const chunksQuery = firestoreQuery(
          collection(firestore, this.config.chunksCollection),
          where('documentId', '==', documentId)
        );
        
        const chunksSnapshot = await getDocs(chunksQuery);
        for (const chunkDoc of chunksSnapshot.docs) {
          await deleteDoc(chunkDoc.ref);
        }
        
        // Generate new embeddings
        const documentEmbeddings = await this.generateEmbeddings(updates.content);
        updateData.embeddings = documentEmbeddings;
        
        // Create new chunks
        const chunks = this.chunkDocument({
          ...updatedDoc,
          embeddings: documentEmbeddings
        });
        
        // Store new chunks
        for (const chunk of chunks) {
          await addDoc(collection(firestore, this.config.chunksCollection), {
            ...chunk,
            documentId: chunk.documentId
          });
        }
        
        logger.debug('Document rechunked', {
          documentId,
          chunksCount: chunks.length
        });
      }
      
      // Update document
      await updateDoc(docRef, updateData);
      
      // Update cache
      const cacheKey = `document:${documentId}`;
      await this.cache.set(cacheKey, updatedDoc);
      
      logger.info('Document updated in RAG system', {
        documentId,
        userId,
        orgId,
        updatedFields: Object.keys(updates)
      });
      
      return updatedDoc;
    } catch (error) {
      logger.error('Error updating document in RAG system', {
        error: error instanceof Error ? error.message : String(error),
        documentId,
        userId
      });
      
      throw error;
    }
  }
  
  /**
   * Delete a document
   * @param documentId Document ID
   * @param userId User ID for ownership verification
   * @returns Whether deletion was successful
   */
  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      // Get existing document
      const existingDoc = await this.getDocument(documentId, userId);
      
      if (!existingDoc) {
        return false;
      }
      
      // Check ownership
      if (existingDoc.userId !== userId) {
        logger.warn('User does not own document', { documentId, userId });
        return false;
      }
      
      // Delete document from Firestore
      await deleteDoc(doc(firestore, this.config.documentsCollection, documentId));
      
      // Delete all chunks for this document
      const chunksQuery = firestoreQuery(
        collection(firestore, this.config.chunksCollection),
        where('documentId', '==', documentId)
      );
      
      const chunksSnapshot = await getDocs(chunksQuery);
      for (const chunkDoc of chunksSnapshot.docs) {
        await deleteDoc(chunkDoc.ref);
      }
      
      // Remove from cache
      const cacheKey = `document:${documentId}`;
      this.cache.delete(cacheKey);
      
      logger.info('Document deleted from RAG system', {
        documentId,
        userId,
        chunksDeleted: chunksSnapshot.docs.length
      });
      
      return true;
    } catch (error) {
      logger.error('Error deleting document from RAG system', {
        error: error instanceof Error ? error.message : String(error),
        documentId,
        userId
      });
      
      return false;
    }
  }
  
  /**
   * Query documents by various criteria
   * @param options Query options
   * @param userId User ID for access control
   * @param orgId Organization ID
   * @returns Query results
   */
  async queryDocuments(
    options: RAGQueryOptions,
    userId: string,
    orgId?: string
  ): Promise<RAGQueryResult> {
    try {
      const startTime = Date.now();
      
      // Build query
      let docsQuery: any = collection(firestore, this.config.documentsCollection);
      
      // Add filters
      const filters: any[] = [];
      
      // Filter by document type
      if (options.documentType) {
        filters.push(where('documentType', '==', options.documentType));
      }
      
      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        filters.push(where('tags', 'array-contains-any', options.tags.slice(0, 10)));
      }
      
      // Filter by access
      if (options.publicOnly) {
        filters.push(where('isPublic', '==', true));
      } else {
        // If not public only, filter by user ID and public documents
        filters.push(where('userId', '==', userId));
      }
      
      // Apply filters
      if (filters.length > 0) {
        docsQuery = firestoreQuery(docsQuery, ...filters);
      }
      
      // Apply limit
      if (options.limit) {
        docsQuery = firestoreQuery(docsQuery, firestoreLimit(options.limit));
      }
      
      // Execute query
      const querySnapshot = await getDocs(docsQuery);
      
      // Convert to RAGDocuments
      const documents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const document = this.firestoreToRAGDocument(data);
        
        // Only include embeddings if specified
        if (!options.includeEmbeddings) {
          delete document.embeddings;
        }
        
        return document;
      });
      
      const queryTimeMs = Date.now() - startTime;
      
      logger.debug('Documents queried from RAG system', {
        userId,
        orgId,
        documentCount: documents.length,
        queryTimeMs
      });
      
      return {
        documents,
        totalCount: querySnapshot.size,
        hasMore: querySnapshot.size === options.limit,
        queryTimeMs
      };
    } catch (error) {
      logger.error('Error querying documents from RAG system', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        options
      });
      
      return {
        documents: [],
        totalCount: 0,
        hasMore: false,
        queryTimeMs: 0
      };
    }
  }
  
  /**
   * Perform similarity search on chunks
   * @param query Search query
   * @param options Search options
   * @param userId User ID for access control
   * @param orgId Organization ID
   * @returns Similar chunks
   */
  async similaritySearch(
    query: string,
    options: {
      limit?: number;
      documentType?: string;
      tags?: string[];
      publicOnly?: boolean;
      threshold?: number;
      includeDocuments?: boolean;
    },
    userId: string,
    orgId?: string
  ): Promise<SimilaritySearchResult[]> {
    try {
      const startTime = Date.now();
      
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbeddings(query);
      
      // First, find matching documents
      const documentIds: string[] = [];
      
      // Filter documents by type, tags, and access
      if (options.documentType || options.tags?.length) {
        const docsQuery = await this.queryDocuments(
          {
            documentType: options.documentType,
            tags: options.tags,
            publicOnly: options.publicOnly || false,
            limit: 50 // Fetch more than needed to increase chance of good matches
          },
          userId,
          orgId
        );
        
        // Extract document IDs
        documentIds.push(...docsQuery.documents.map(doc => doc.id));
      }
      
      // Fetch chunks from matching documents
      let chunksQuery;
      
      if (documentIds.length > 0) {
        // Filter by document IDs
        chunksQuery = firestoreQuery(
          collection(firestore, this.config.chunksCollection),
          where('documentId', 'in', documentIds.slice(0, 10)) // Firestore 'in' limit is 10
        );
      } else if (options.publicOnly) {
        // Get public chunks only
        chunksQuery = firestoreQuery(
          collection(firestore, this.config.chunksCollection),
          where('isPublic', '==', true),
          firestoreLimit(100)
        );
      } else {
        // Get user chunks and public chunks
        chunksQuery = firestoreQuery(
          collection(firestore, this.config.chunksCollection),
          where('userId', '==', userId),
          firestoreLimit(100)
        );
      }
      
      // Execute chunk query
      const chunksSnapshot = await getDocs(chunksQuery);
      
      // Convert to chunks with embeddings
      const chunks = chunksSnapshot.docs.map(doc => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          documentId: data.documentId as string,
          content: data.content as string,
          embedding: data.embedding as number[],
          position: data.position as number,
          metadata: data.metadata as Record<string, any>
        };
      });
      
      // Calculate similarity scores
      const results: SimilaritySearchResult[] = [];
      
      for (const chunk of chunks) {
        if (!chunk.embedding) continue;
        
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        
        // Apply threshold filter
        if (options.threshold && score < options.threshold) continue;
        
        results.push({
          chunk,
          score
        });
      }
      
      // Sort by score descending
      results.sort((a, b) => b.score - a.score);
      
      // Apply limit
      const limitedResults = results.slice(0, options.limit || this.config.maxSearchResults);
      
      // Include full documents if requested
      if (options.includeDocuments) {
        for (const result of limitedResults) {
          const doc = await this.getDocument(result.chunk.documentId);
          if (doc) {
            result.document = doc;
          }
        }
      }
      
      logger.debug('Similarity search completed', {
        queryLength: query.length,
        resultsCount: limitedResults.length,
        timeMs: Date.now() - startTime,
        userId
      });
      
      return limitedResults;
    } catch (error) {
      logger.error('Error performing similarity search', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        queryLength: query.length
      });
      
      return [];
    }
  }
  
  /**
   * Generate context for completions based on search results
   * @param results Search results
   * @param maxTokens Maximum context tokens
   * @returns Formatted context string
   */
  generateContext(results: SimilaritySearchResult[], maxTokens: number = 1500): string {
    try {
      let context = '';
      let estimatedTokens = 0;
      
      // Add chunks to context until we reach the token limit
      for (const result of results) {
        const chunkContent = result.chunk.content;
        const chunkTokens = this.estimateTokens(chunkContent);
        
        // Skip if this chunk would exceed the token limit
        if (estimatedTokens + chunkTokens > maxTokens) continue;
        
        // Add formatted chunk to context
        context += `\n---\n${chunkContent}\n`;
        estimatedTokens += chunkTokens;
      }
      
      return context.trim();
    } catch (error) {
      logger.error('Error generating context', {
        error: error instanceof Error ? error.message : String(error),
        resultsCount: results.length
      });
      
      return '';
    }
  }
  
  /**
   * Break document into chunks for retrieval
   * @param document Document to chunk
   * @returns Document chunks
   */
  private chunkDocument(document: RAGDocument): DocumentChunk[] {
    try {
      const { content } = document;
      const chunks: DocumentChunk[] = [];
      
      // Simple chunking by paragraph, could be improved
      const paragraphs = content.split('\n\n');
      
      // Combine small paragraphs to reach minimum chunk size
      let currentChunk = '';
      let position = 0;
      
      for (const paragraph of paragraphs) {
        const trimmedParagraph = paragraph.trim();
        if (!trimmedParagraph) continue;
        
        // If adding this paragraph would exceed chunk size, create a new chunk
        if (currentChunk && this.estimateTokens(currentChunk + '\n\n' + trimmedParagraph) > this.config.chunkSize) {
          // Create chunk with current content
          chunks.push({
            id: uuidv4(),
            documentId: document.id,
            content: currentChunk,
            position,
            metadata: {
              title: document.title,
              documentType: document.documentType,
              tags: document.tags,
              isPublic: document.isPublic,
              userId: document.userId
            }
          });
          
          // Start new chunk with overlap
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-this.config.chunkOverlap).join(' ');
          currentChunk = overlapWords ? overlapWords + '\n\n' + trimmedParagraph : trimmedParagraph;
          position++;
        } else {
          // Add to current chunk
          currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedParagraph : trimmedParagraph;
        }
      }
      
      // Add final chunk if not empty
      if (currentChunk) {
        chunks.push({
          id: uuidv4(),
          documentId: document.id,
          content: currentChunk,
          position,
          metadata: {
            title: document.title,
            documentType: document.documentType,
            tags: document.tags,
            isPublic: document.isPublic,
            userId: document.userId
          }
        });
      }
      
      // Generate embeddings for chunks
      for (const chunk of chunks) {
        // Use document embedding for now, in a real implementation this would be chunk-specific
        chunk.embedding = document.embeddings;
      }
      
      return chunks;
    } catch (error) {
      logger.error('Error chunking document', {
        error: error instanceof Error ? error.message : String(error),
        documentId: document.id
      });
      
      return [];
    }
  }
  
  /**
   * Generate embeddings for text
   * @param text Text to embed
   * @returns Embedding vector
   */
  private async generateEmbeddings(text: string): Promise<number[]> {
    try {
      // Generate deterministic embeddings for demo purposes using hashing
      // In a real implementation, this would call an embedding model API
      const seed = this.hashString(text);
      const random = this.seededRandom(parseInt(seed, 36));
      
      // Create a 1536-dimensional vector (same as OpenAI's embedding models)
      const dimensions = 1536;
      const embeddings = Array(dimensions).fill(0).map(() => random() * 2 - 1);
      
      // Normalize embeddings to unit length
      const magnitude = Math.sqrt(embeddings.reduce((sum, val) => sum + val * val, 0));
      const normalizedEmbeddings = embeddings.map(val => val / magnitude);
      
      return normalizedEmbeddings;
    } catch (error) {
      logger.error('Error generating embeddings', {
        error: error instanceof Error ? error.message : String(error),
        textLength: text.length
      });
      
      // Return zero vector as fallback
      return Array(1536).fill(0);
    }
  }
  
  /**
   * Calculate cosine similarity between two vectors
   * @param vec1 First vector
   * @param vec2 Second vector
   * @returns Similarity score (0-1)
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    try {
      // Ensure vectors are the same length
      if (vec1.length !== vec2.length) {
        throw new Error('Vectors must be the same length');
      }
      
      // Calculate dot product
      let dotProduct = 0;
      let magnitude1 = 0;
      let magnitude2 = 0;
      
      for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        magnitude1 += vec1[i] * vec1[i];
        magnitude2 += vec2[i] * vec2[i];
      }
      
      // Calculate cosine similarity
      const similarity = dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
      
      // Handle NaN and ensure range 0-1
      return isNaN(similarity) ? 0 : Math.max(0, Math.min(1, similarity));
    } catch (error) {
      logger.error('Error calculating cosine similarity', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return 0;
    }
  }
  
  /**
   * Estimate number of tokens in text
   * @param text Text to estimate
   * @returns Estimated token count
   */
  private estimateTokens(text: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Check if a user can access a document
   * @param document Document to check
   * @param userId User ID
   * @returns Whether user can access document
   */
  private canAccessDocument(document: RAGDocument, userId: string): boolean {
    return document.isPublic || document.userId === userId;
  }
  
  /**
   * Convert Firestore data to RAGDocument
   * @param data Firestore data
   * @returns RAGDocument
   */
  private firestoreToRAGDocument(data: any): RAGDocument {
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      documentType: data.documentType,
      metadata: data.metadata,
      userId: data.userId,
      organizationId: data.organizationId,
      tags: data.tags || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      embeddings: data.embeddings,
      isPublic: data.isPublic || false
    };
  }
  
  /**
   * Hash a string to a numeric value
   * @param str String to hash
   * @returns Hash string
   */
  private hashString(str: string): string {
    let hash = 0;
    
    if (str.length === 0) return hash.toString(36);
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }
  
  /**
   * Create a seeded random number generator
   * @param seed Seed value
   * @returns Random number generator function
   */
  private seededRandom(seed: number): () => number {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
} 
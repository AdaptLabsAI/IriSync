import { v4 as uuidv4 } from 'uuid';
import { logger } from '../core/logging/logger';
import VectorDatabase from './vector-database';
import TextChunker from './text-chunker';
import { firestore } from '../core/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { SubscriptionTier } from '../subscription/models/subscription';
import { getTokenAllocationForTier } from '../subscription/index';
import { TokenService } from '../tokens/token-service';
import { NotificationService } from '../core/notifications/NotificationService';

/**
 * Document types that can be processed
 */
export enum DocumentType {
  FAQ = 'faq',
  KNOWLEDGE_BASE = 'knowledge_base',
  BLOG = 'blog',
  DOCUMENTATION = 'documentation',
  FORUM = 'forum',
  SUPPORT = 'support',
  CUSTOM = 'custom'
}

/**
 * Access levels for documents
 */
export enum AccessLevel {
  PUBLIC = 'public',
  REGISTERED = 'registered',
  PAID = 'paid',
  INFLUENCER = 'influencer',
  ENTERPRISE = 'enterprise',
  PRIVATE = 'private'
}

/**
 * Chunking strategies for document processing
 */
export enum ChunkingStrategy {
  PARAGRAPH = 'paragraph',
  SENTENCE = 'sentence',
  FIXED_SIZE = 'fixed_size',
  SLIDING_WINDOW = 'sliding_window',
  SEMANTIC = 'semantic'
}

/**
 * Document metadata for storage
 */
export interface DocumentMetadata {
  id?: string;
  title?: string;
  source?: string;
  url?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  category?: string;
  tags?: string[];
  [key: string]: any;
}

/**
 * Document for processing
 */
export interface Document {
  id?: string;
  content: string;
  metadata?: DocumentMetadata;
  type?: DocumentType;
  accessLevel?: AccessLevel;
  organizationId?: string;
  title?: string;
  url?: string;
}

/**
 * Document chunk
 */
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: DocumentMetadata;
}

/**
 * Document processing options
 */
export interface ProcessingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  collection?: string;
  strategy?: ChunkingStrategy;
  embedAll?: boolean;
  metadata?: DocumentMetadata;
  preserveWhitespace?: boolean;
  minChunkLength?: number;
}

/**
 * Document processor for RAG implementation
 * Production-ready with advanced chunking strategies and vector database integration
 */
export class DocumentProcessor {
  private defaultChunkSize: number = 1000;
  private defaultChunkOverlap: number = 200;
  private tokenService: TokenService;
  
  /**
   * Create a new document processor
   * @param tokenService Service for token usage tracking
   */
  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
    logger.info('DocumentProcessor initialized');
  }
  
  /**
   * Process a document and store it in the vector database
   * @param document Document to process
   * @param options Processing options
   * @param userId User ID for token tracking and access control
   * @returns IDs of stored chunks
   */
  async processDocument(
    document: Document,
    options: ProcessingOptions = {},
    userId: string
  ): Promise<string[]> {
    try {
      // Set start time for performance tracking
      const startTime = Date.now();
      
      // Ensure we have required fields
      if (!document.content || document.content.trim().length === 0) {
        throw new Error('Document content is required');
      }
      
      // Validate document token count for user's subscription tier
      await this.validateDocumentSize(document, userId);
      
      // Normalize options with defaults
      const {
        chunkSize = this.defaultChunkSize,
        chunkOverlap = this.defaultChunkOverlap,
        strategy = ChunkingStrategy.PARAGRAPH,
        embedAll = false,
        metadata = {},
        preserveWhitespace = false,
        minChunkLength = 50,
        collection = 'default'
      } = options;

      // Generate chunks using the TextChunker utility
      const chunks = TextChunker.splitText(document.content, {
        chunkSize,
        chunkOverlap,
        strategy,
        preserveWhitespace,
        minChunkLength
      });
      
      logger.debug('Document chunked successfully', {
        documentTitle: document.title,
        strategy,
        chunkCount: chunks.length,
        averageChunkSize: chunks.length > 0 
          ? chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length 
          : 0
      });
      
      // Store original document metadata in Firestore for tracking
      const docId = document.id || uuidv4();
      await this.storeDocumentMetadata({
        ...document,
        id: docId,
        metadata: {
          ...metadata,
          processingStrategy: strategy,
          chunkCount: chunks.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId
        }
      });
      
      // Prepare metadata for vector database
      const documentMetadata = {
        ...metadata,
        documentId: docId,
        documentType: document.type || DocumentType.CUSTOM,
        accessLevel: document.accessLevel || AccessLevel.PUBLIC,
        title: document.title,
        url: document.url,
        createdAt: new Date().toISOString(),
        sourceType: this.getSourceTypeForDocumentType(document.type || DocumentType.CUSTOM),
        organizationId: document.organizationId,
        chunkingStrategy: strategy,
        chunkSize,
        totalChunks: chunks.length,
        userId
      };
      
      // Store chunks in vector database
      const chunkIds: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = document.id ? `${document.id}-chunk-${i+1}` : uuidv4();
        
        const vectorDoc = {
          id: chunkId,
          content: chunks[i],
          metadata: {
            ...documentMetadata,
            chunkIndex: i,
            chunkSize: chunks[i].length,
            approximateTokens: TextChunker.countTokens(chunks[i])
          }
        };
        
        // Store in vector database
        await VectorDatabase.storeDocument(vectorDoc.content, vectorDoc.metadata, options.collection);
        chunkIds.push(chunkId);
      }
      
      // If embedAll is true, also store the entire document as a single chunk
      if (embedAll && chunks.length > 1) {
        const fullDocId = document.id ? `${document.id}-full` : `${uuidv4()}-full`;
        
        const vectorDoc = {
          id: fullDocId,
          content: document.content,
          metadata: {
            ...documentMetadata,
            isFullDocument: true,
            approximateTokens: TextChunker.countTokens(document.content)
          }
        };
        
        await VectorDatabase.storeDocument(vectorDoc.content, vectorDoc.metadata, options.collection);
        chunkIds.push(fullDocId);
      }
      
      // Track usage for billing/analytics
      await this.trackDocumentProcessing(document, chunks.length, userId);
      
      // Update document metadata with processing results
      await this.updateDocumentMetadata(docId, {
        chunkIds,
        processingTime: Date.now() - startTime,
        status: 'processed'
      });
      
      logger.info(`Processed document and stored ${chunkIds.length} chunks in vector database`, {
        documentType: document.type,
        chunkCount: chunkIds.length,
        chunkStrategy: strategy,
        documentTitle: document.title,
        totalContentSize: document.content.length,
        processingTime: Date.now() - startTime,
        userId
      });
      
      return chunkIds;
    } catch (error) {
      logger.error(`Error processing document: ${error instanceof Error ? error.message : String(error)}`, {
        documentTitle: document.title,
        documentType: document.type,
        error: error instanceof Error ? error.stack : undefined,
        userId
      });
      throw error;
    }
  }
  
  /**
   * Process multiple documents and store them in the vector database
   * @param documents Documents to process
   * @param options Processing options
   * @param userId User ID for token tracking and access control
   * @returns IDs of stored chunks by document
   */
  async processDocuments(
    documents: Document[],
    options: ProcessingOptions = {},
    userId: string
  ): Promise<Record<string, string[]>> {
    const results: Record<string, string[]> = {};
    
    // First validate that the user has enough tokens for all documents
    const totalTokenEstimate = documents.reduce((sum, doc) => 
      sum + TextChunker.countTokens(doc.content), 0);
      
    const hasEnoughTokens = await this.tokenService.hasSufficientTokens(
      userId, 
      Math.ceil(totalTokenEstimate / 1000) // 1 token per 1000 tokens of content
    );
    
    if (!hasEnoughTokens) {
      throw new Error('Insufficient tokens to process documents');
    }
    
    for (const document of documents) {
      const documentId = document.id || uuidv4();
      try {
        results[documentId] = await this.processDocument(
          { ...document, id: documentId },
          options,
          userId
        );
      } catch (error) {
        logger.error(`Error processing document ${documentId}: ${error instanceof Error ? error.message : String(error)}`, {
          userId
        });
        // Continue processing other documents
        results[documentId] = [];
      }
    }
    
    logger.info(`Processed ${documents.length} documents`, {
      totalChunks: Object.values(results).reduce((sum, chunks) => sum + chunks.length, 0),
      strategy: options.strategy || ChunkingStrategy.PARAGRAPH,
      userId
    });
    
    return results;
  }
  
  /**
   * Delete a document and all its chunks from the vector database
   * @param documentId Document ID
   * @param collectionName Collection/namespace
   * @param userId User ID for access control
   */
  async deleteDocument(documentId: string, collectionName?: string, userId?: string): Promise<void> {
    try {
      logger.debug(`Deleting document ${documentId}`, { userId });
      
      // First check if the user has access to delete the document
      if (userId) {
        const docRef = doc(firestore, 'ragDocuments', documentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const docData = docSnap.data();
          
          // Check if user owns the document or is an admin
          if (docData.userId !== userId && !docData.organizationId) {
            throw new Error('Unauthorized to delete this document');
          }
          
          // If org document, check if user is in that org
          if (docData.organizationId) {
            const orgMemberQuery = query(
              collection(firestore, 'organizationMembers'),
              where('userId', '==', userId),
              where('organizationId', '==', docData.organizationId)
            );
            
            const orgMemberSnap = await getDocs(orgMemberQuery);
            
            if (orgMemberSnap.empty) {
              throw new Error('Unauthorized to delete this organization document');
            }
          }
        }
      }
      
      // Get all chunk IDs for the document
      const chunksQuery = query(
        collection(firestore, 'ragChunks'),
        where('documentId', '==', documentId)
      );
      
      const chunksSnapshot = await getDocs(chunksQuery);
      const chunkIds: string[] = [];
      
      chunksSnapshot.forEach((docSnapshot) => {
        chunkIds.push(docSnapshot.id);
      });
      
      // Delete each chunk from the vector database
      await Promise.all(chunkIds.map(async (chunkId) => {
        await VectorDatabase.deleteDocument(chunkId, collectionName);
        
        // Also delete from Firestore if we're tracking chunks there
        try {
          await deleteDoc(doc(firestore, 'ragChunks', chunkId));
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.warn(`Error deleting chunk ${chunkId} from Firestore: ${errorMessage}`);
        }
      }));
      
      // Delete the full document chunk if it exists
      await VectorDatabase.deleteDocument(`${documentId}-full`, collectionName);
      
      // Delete the document metadata from Firestore
      await deleteDoc(doc(firestore, 'ragDocuments', documentId));
      
      logger.info(`Successfully deleted document ${documentId} with ${chunkIds.length} chunks`, { userId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error(`Error deleting document ${documentId}: ${errorMessage}`, {
        userId,
        error: errorStack
      });
      throw error;
    }
  }
  
  /**
   * Get source type based on document type for better context retrieval
   * @param documentType Type of document
   * @returns Standardized source type string
   */
  private getSourceTypeForDocumentType(documentType: DocumentType): string {
    switch (documentType) {
      case DocumentType.FAQ:
        return 'Frequently Asked Questions';
      case DocumentType.KNOWLEDGE_BASE:
        return 'Knowledge Base Article';
      case DocumentType.BLOG:
        return 'Blog Post';
      case DocumentType.DOCUMENTATION:
        return 'Documentation';
      case DocumentType.FORUM:
        return 'Forum Discussion';
      case DocumentType.SUPPORT:
        return 'Support Article';
      case DocumentType.CUSTOM:
      default:
        return 'Custom Document';
    }
  }
  
  /**
   * Store document metadata in Firestore
   * @param document Document with metadata
   * @returns Document reference
   */
  private async storeDocumentMetadata(document: Document): Promise<string> {
    try {
      const docId = document.id || uuidv4();
      const docRef = doc(firestore, 'ragDocuments', docId);
      
      const docData = {
        id: docId,
        title: document.title || 'Untitled',
        type: document.type || DocumentType.CUSTOM,
        accessLevel: document.accessLevel || AccessLevel.PRIVATE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: document.metadata || {},
        organizationId: document.organizationId || null,
        url: document.url || null,
        status: 'processing'
      };
      
      try {
        await updateDoc(docRef, docData);
      } catch (error) {
        // Document doesn't exist yet, create it
        await setDoc(docRef, docData);
      }
      
      return docId;
    } catch (error) {
      logger.error(`Error storing document metadata: ${error instanceof Error ? error.message : String(error)}`);
      // Throw error to be handled by the calling function
      throw error;
    }
  }
  
  /**
   * Update document metadata with processing results
   * @param documentId Document ID
   * @param updates Fields to update
   */
  private async updateDocumentMetadata(documentId: string, updates: Record<string, any>): Promise<void> {
    try {
      const docRef = doc(firestore, 'ragDocuments', documentId);
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.warn(`Error updating document metadata: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw, just log the warning as this shouldn't block the process
    }
  }
  
  /**
   * Track document processing for token usage
   * @param document Processed document
   * @param chunkCount Number of chunks created
   * @param userId User ID for token tracking
   */
  private async trackDocumentProcessing(document: Document, chunkCount: number, userId: string): Promise<void> {
    try {
      // Calculate tokens based on document size (approximate)
      const tokenCount = Math.ceil(TextChunker.countTokens(document.content) / 1000);
      
      // Use at least 1 token
      const tokensToUse = Math.max(1, tokenCount);
      
      // Track usage through token service
      await this.tokenService.useTokens(userId, 'document_processing', tokensToUse, {
        documentType: document.type,
        chunkCount,
        documentTitle: document.title,
        tokenCount: TextChunker.countTokens(document.content)
      });
      
      logger.debug(`Tracked ${tokensToUse} tokens for document processing`, {
        userId,
        documentTitle: document.title,
        chunkCount
      });
    } catch (error) {
      logger.error(`Error tracking document processing: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw, just log the error as this shouldn't block the process
    }
  }
  
  /**
   * Validate document size against user's subscription tier
   * @param document Document to validate
   * @param userId User ID
   */
  private async validateDocumentSize(document: Document, userId: string): Promise<void> {
    try {
      // Get user's data and organization
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error(`User ${userId} not found`);
      }
      
      const userData = userDoc.data();
      
      // Get organization ID from user data
      const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
      // Default to CREATOR as the lowest tier
      let tier: SubscriptionTier = SubscriptionTier.CREATOR;
      
      if (orgId) {
        // Get organization subscription tier
        const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          if (orgData.billing?.subscriptionTier) {
            tier = orgData.billing.subscriptionTier as SubscriptionTier;
          }
        } else {
          logger.warn(`Organization ${orgId} not found for user ${userId}`);
        }
      } else if (userData.subscriptionTier) {
        // Fallback to deprecated user-level subscription tier
        console.warn('Using deprecated user.subscriptionTier field', { userId });
        tier = userData.subscriptionTier as SubscriptionTier;
      }
      
      // Get token allocation for tier
      const tokenAllocation = getTokenAllocationForTier(tier);
      
      // Calculate document tokens
      const documentTokens = TextChunker.countTokens(document.content);
      
      // Check if document would use more than 25% of user's total allocation
      const maxDocumentTokens = tokenAllocation * 250; // 25% of allocation
      
      if (documentTokens > maxDocumentTokens) {
        throw new Error(`Document is too large (${documentTokens} tokens) for your subscription tier. Maximum size is ${maxDocumentTokens} tokens.`);
      }
      
      logger.debug(`Document size validated for processing`, {
        userId,
        organizationId: orgId,
        tier,
        documentTokens,
        maxDocumentTokens,
        tokenAllocation
      });
    } catch (error) {
      logger.error(`Error validating document size: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

// Create singleton instance with token service dependencies
const notificationService = new NotificationService();
const tokenService = new TokenService(
  null as any, // Will need to be properly instantiated in production
  notificationService
);
const documentProcessor = new DocumentProcessor(tokenService);
export default documentProcessor; 
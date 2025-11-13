import { getFirestore } from '../core/firebase/admin';
import { v4 as uuidv4 } from 'uuid';
import vectorDatabase from './vector-database';
import documentChunker, { ChunkingOptions } from './document-chunker';

/**
 * Knowledge base document types
 */
export enum DocumentType {
  ARTICLE = 'article',
  FAQ = 'faq',
  DOCUMENTATION = 'documentation',
  USER_GUIDE = 'user_guide',
  TUTORIAL = 'tutorial',
  BLOG_POST = 'blog_post',
  SUPPORT_TICKET = 'support_ticket',
  POLICY = 'policy',
  CUSTOM = 'custom'
}

/**
 * Knowledge base document status
 */
export enum DocumentStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  ERROR = 'error'
}

/**
 * Knowledge base document permission
 */
export enum AccessLevel {
  PUBLIC = 'public',     // Available to anyone
  REGISTERED = 'registered', // Available to all registered users
  PAID = 'paid',        // Available to paid users only
  INFLUENCER = 'influencer', // Available to Influencer tier and above
  ENTERPRISE = 'enterprise', // Available to Enterprise tier only
  PRIVATE = 'private'    // Available only to specific users/orgs
}

/**
 * Knowledge base document
 */
export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  type: DocumentType;
  status: DocumentStatus;
  accessLevel: AccessLevel;
  url?: string;
  category?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  vectorIds?: string[]; // IDs of vectors in the vector database
}

/**
 * Create document parameters
 */
export interface CreateDocumentParams {
  title: string;
  content: string;
  type: DocumentType;
  accessLevel?: AccessLevel;
  url?: string;
  category?: string;
  tags?: string[];
  createdBy?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  chunkingOptions?: ChunkingOptions;
}

/**
 * Update document parameters
 */
export interface UpdateDocumentParams {
  title?: string;
  content?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  accessLevel?: AccessLevel;
  url?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  chunkingOptions?: ChunkingOptions;
}

/**
 * Document search parameters
 */
export interface DocumentSearchParams {
  query?: string;
  type?: DocumentType;
  accessLevel?: AccessLevel;
  category?: string;
  tags?: string[];
  createdBy?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Knowledge base service
 * Manages the knowledge base documents and integration with vector storage
 */
export class KnowledgeBaseService {
  private documentsCollection = getFirestore().collection('knowledgeDocuments');

  /**
   * Create a new knowledge base document
   * @param params Document creation parameters
   * @returns The created document
   */
  async createDocument(params: CreateDocumentParams): Promise<KnowledgeDocument> {
    // Create the document
    const document: KnowledgeDocument = {
      id: uuidv4(),
      title: params.title,
      content: params.content,
      type: params.type,
      status: DocumentStatus.PROCESSING, // Start in processing state
      accessLevel: params.accessLevel || AccessLevel.PRIVATE,
      url: params.url,
      category: params.category,
      tags: params.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: params.createdBy,
      organizationId: params.organizationId,
      metadata: params.metadata || {},
      vectorIds: []
    };

    // Save to Firestore
    await this.documentsCollection.doc(document.id).set(document);

    try {
      // Process the document for vector storage
      const vectorIds = await this.processDocumentForVectorStorage(
        document.id, 
        document.content,
        {
          title: document.title,
          type: document.type,
          accessLevel: document.accessLevel,
          category: document.category,
          tags: document.tags,
          organizationId: document.organizationId,
          ...document.metadata
        },
        params.chunkingOptions
      );

      // Update document with vector IDs
      document.vectorIds = vectorIds;
      document.status = DocumentStatus.PUBLISHED;
      
      await this.documentsCollection.doc(document.id).update({
        vectorIds,
        status: DocumentStatus.PUBLISHED,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error processing document for vector storage:', error);
      
      // Update status to error
      await this.documentsCollection.doc(document.id).update({
        status: DocumentStatus.ERROR,
        updatedAt: new Date()
      });
      
      document.status = DocumentStatus.ERROR;
    }

    return document;
  }

  /**
   * Update an existing knowledge base document
   * @param documentId Document ID
   * @param params Update parameters
   * @returns The updated document
   */
  async updateDocument(documentId: string, params: UpdateDocumentParams): Promise<KnowledgeDocument | null> {
    const docRef = this.documentsCollection.doc(documentId);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      return null;
    }
    
    const currentDoc = docSnapshot.data() as KnowledgeDocument;
    
    // Prepare update object
    const updateData: Partial<KnowledgeDocument> = {
      updatedAt: new Date()
    };
    
    // Add updated fields
    if (params.title !== undefined) updateData.title = params.title;
    if (params.type !== undefined) updateData.type = params.type;
    if (params.accessLevel !== undefined) updateData.accessLevel = params.accessLevel;
    if (params.url !== undefined) updateData.url = params.url;
    if (params.category !== undefined) updateData.category = params.category;
    if (params.tags !== undefined) updateData.tags = params.tags;
    if (params.metadata !== undefined) {
      updateData.metadata = {
        ...currentDoc.metadata,
        ...params.metadata
      };
    }
    
    // If content is being updated, we need to reprocess for vector storage
    if (params.content !== undefined) {
      updateData.content = params.content;
      updateData.status = DocumentStatus.PROCESSING;
      
      // Apply updates first
      await docRef.update(updateData);
      
      try {
        // Delete old vectors if they exist
        if (currentDoc.vectorIds && currentDoc.vectorIds.length > 0) {
          for (const vectorId of currentDoc.vectorIds) {
            await vectorDatabase.deleteDocument(vectorId);
          }
        }
        
        // Process new content for vector storage
        const vectorIds = await this.processDocumentForVectorStorage(
          documentId,
          params.content,
          {
            title: updateData.title || currentDoc.title,
            type: updateData.type || currentDoc.type,
            accessLevel: updateData.accessLevel || currentDoc.accessLevel,
            category: updateData.category || currentDoc.category,
            tags: updateData.tags || currentDoc.tags,
            organizationId: currentDoc.organizationId,
            ...updateData.metadata
          },
          params.chunkingOptions
        );
        
        // Update document with new vector IDs and status
        await docRef.update({
          vectorIds,
          status: DocumentStatus.PUBLISHED,
          updatedAt: new Date()
        });
        
        // Get the updated document
        const updatedSnapshot = await docRef.get();
        return updatedSnapshot.data() as KnowledgeDocument;
      } catch (error) {
        console.error('Error reprocessing document for vector storage:', error);
        
        // Update status to error
        await docRef.update({
          status: DocumentStatus.ERROR,
          updatedAt: new Date()
        });
        
        const errorSnapshot = await docRef.get();
        return errorSnapshot.data() as KnowledgeDocument;
      }
    } else {
      // Apply updates without reprocessing content
      await docRef.update(updateData);
      
      // Get the updated document
      const updatedSnapshot = await docRef.get();
      return updatedSnapshot.data() as KnowledgeDocument;
    }
  }

  /**
   * Get a document by ID
   * @param documentId Document ID
   * @returns The document or null if not found
   */
  async getDocument(documentId: string): Promise<KnowledgeDocument | null> {
    const docSnapshot = await this.documentsCollection.doc(documentId).get();
    
    if (!docSnapshot.exists) {
      return null;
    }
    
    return docSnapshot.data() as KnowledgeDocument;
  }

  /**
   * Delete a document and its vectors
   * @param documentId Document ID
   * @returns Whether the deletion was successful
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      // Get the document first to get vector IDs
      const document = await this.getDocument(documentId);
      
      if (!document) {
        return false;
      }
      
      // Delete vectors from vector database
      if (document.vectorIds && document.vectorIds.length > 0) {
        for (const vectorId of document.vectorIds) {
          await vectorDatabase.deleteDocument(vectorId);
        }
      }
      
      // Delete document from Firestore
      await this.documentsCollection.doc(documentId).delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  /**
   * Search for documents in the knowledge base
   * @param params Search parameters
   * @returns List of documents matching search criteria
   */
  async searchDocuments(params: DocumentSearchParams = {}): Promise<{
    documents: KnowledgeDocument[];
    total: number;
  }> {
    let query = this.documentsCollection as any;
    
    // Apply filters
    if (params.type) {
      query = query.where('type', '==', params.type);
    }
    
    if (params.accessLevel) {
      query = query.where('accessLevel', '==', params.accessLevel);
    }
    
    if (params.category) {
      query = query.where('category', '==', params.category);
    }
    
    if (params.createdBy) {
      query = query.where('createdBy', '==', params.createdBy);
    }
    
    if (params.organizationId) {
      query = query.where('organizationId', '==', params.organizationId);
    }
    
    // If tag is provided, filter by tag
    if (params.tags && params.tags.length > 0) {
      query = query.where('tags', 'array-contains-any', params.tags);
    }
    
    // Count total before applying limit and offset
    const countQuery = await query.count().get();
    const total = countQuery.data().count;
    
    // Apply pagination
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    
    query = query.orderBy('updatedAt', 'desc')
                 .limit(limit)
                 .offset(offset);
    
    // Execute the query
    const querySnapshot = await query.get();
    
    const documents: KnowledgeDocument[] = [];
    querySnapshot.forEach((doc: any) => {
      documents.push(doc.data() as KnowledgeDocument);
    });
    
    // If there's a title/content query, filter in memory
    if (params.query && params.query.trim() !== '') {
      const searchQuery = params.query.toLowerCase();
      const filteredDocuments = documents.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery) || 
        doc.content.toLowerCase().includes(searchQuery)
      );
      
      return {
        documents: filteredDocuments,
        total: Math.min(total, filteredDocuments.length + offset)
      };
    }
    
    return { documents, total };
  }

  /**
   * Semantic search across knowledge base using vector database
   * @param query Search query text
   * @param filters Additional filters for search
   * @param limit Maximum number of results
   * @returns List of documents with relevance scores
   */
  async semanticSearch(
    query: string,
    filters: {
      accessLevel?: AccessLevel | AccessLevel[];
      type?: DocumentType | DocumentType[];
      category?: string;
      organizationId?: string;
    } = {},
    limit: number = 5
  ): Promise<Array<{
    document: KnowledgeDocument;
    score: number;
    relevantChunk: string;
  }>> {
    // Prepare filters for vector search
    const vectorFilters: Record<string, any> = {};
    
    if (filters.accessLevel) {
      if (Array.isArray(filters.accessLevel)) {
        vectorFilters.accessLevel = { $in: filters.accessLevel };
      } else {
        vectorFilters.accessLevel = filters.accessLevel;
      }
    }
    
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        vectorFilters.type = { $in: filters.type };
      } else {
        vectorFilters.type = filters.type;
      }
    }
    
    if (filters.category) {
      vectorFilters.category = filters.category;
    }
    
    if (filters.organizationId) {
      vectorFilters.organizationId = filters.organizationId;
    }
    
    // Search in vector database
    const searchResults = await vectorDatabase.search({
      query,
      filters: vectorFilters,
      limit: limit * 3, // Get more results than needed to filter by document
      minRelevanceScore: 0.7
    });
    
    // Group results by parent document
    const documentMap: Map<string, {
      document: KnowledgeDocument | null;
      score: number;
      relevantChunk: string;
    }> = new Map();
    
    for (const result of searchResults) {
      const parentDocId = result.metadata.parentDocumentId || 
                          (result.id.includes('-chunk-') ? result.id.split('-chunk-')[0] : result.id);
      
      // If this document is already in the map with a higher score, skip
      if (documentMap.has(parentDocId) && documentMap.get(parentDocId)!.score > result.score) {
        continue;
      }
      
      // Add to map, document will be retrieved later
      documentMap.set(parentDocId, {
        document: null,
        score: result.score,
        relevantChunk: result.content
      });
    }
    
    // Get all documents in one batch
    const documentIds = Array.from(documentMap.keys());
    if (documentIds.length === 0) {
      return [];
    }
    
    // Get documents in batches of 10 (Firestore limit)
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < documentIds.length; i += batchSize) {
      const batch = documentIds.slice(i, i + batchSize);
      batches.push(batch);
    }
    
    // Process each batch and collect documents
    for (const batch of batches) {
      const batchQuery = await this.documentsCollection
        .where('id', 'in', batch)
        .get();
      
      batchQuery.forEach(doc => {
        const document = doc.data() as KnowledgeDocument;
        const docEntry = documentMap.get(document.id);
        
        if (docEntry) {
          docEntry.document = document;
        }
      });
    }
    
    // Filter out entries where document wasn't found and sort by score
    const results = Array.from(documentMap.values())
      .filter(entry => entry.document !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(entry => ({
        document: entry.document as KnowledgeDocument,
        score: entry.score,
        relevantChunk: entry.relevantChunk
      }));
    
    return results;
  }

  /**
   * Process document for vector storage
   * Chunks the document and stores each chunk in the vector database
   * @param documentId Document ID
   * @param content Document content
   * @param metadata Metadata to store with the document
   * @param chunkingOptions Optional chunking parameters
   * @returns List of vector IDs
   */
  private async processDocumentForVectorStorage(
    documentId: string,
    content: string,
    metadata: Record<string, any> = {},
    chunkingOptions?: ChunkingOptions
  ): Promise<string[]> {
    // Chunk the document
    const chunkedDocument = documentChunker.chunkDocument(
      documentId,
      content,
      metadata,
      chunkingOptions
    );
    
    const vectorIds: string[] = [];
    
    // Store each chunk in the vector database
    for (const chunk of chunkedDocument.chunks) {
      const vectorId = await vectorDatabase.storeDocument(
        chunk.content,
        {
          ...chunk.metadata,
          parentDocumentId: documentId,
          chunkId: chunk.id
        },
        metadata.type || 'default'
      );
      
      vectorIds.push(vectorId);
    }
    
    return vectorIds;
  }
}

export default new KnowledgeBaseService(); 
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  startAfter,
  Timestamp,
  DocumentReference,
  DocumentSnapshot,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { firestore } from '../core/firebase';
import { 
  KnowledgeContent, 
  KnowledgeContentType, 
  KnowledgeStatus, 
  KnowledgeAccessLevel,
  KnowledgeContentFilter,
  CreateKnowledgeContentInput,
  UpdateKnowledgeContentInput
} from './models';
import { generateSlug } from '../utils/slug';
import { Document } from '../rag/document-processor';
import { RAGService } from '../rag/rag-service';
import { logger } from '../logging/logger';
import { AccessLevel } from '../rag/knowledge-base';

// Collection references
const KNOWLEDGE_COLLECTION = 'knowledgeContent';
const KNOWLEDGE_CATEGORY_COLLECTION = 'knowledgeCategories';

// RAG Service instance
const ragService = new RAGService();

/**
 * Index a knowledge content in RAG
 * @private
 */
async function _indexForRAG(id: string, content: KnowledgeContent): Promise<string[]> {
  // Initialize RAG service
  await ragService.initialize();
  
  // First remove old vector entries if they exist
  if (content.vectorIds?.length) {
    for (const vectorId of content.vectorIds) {
      try {
        await ragService.deleteDocument(vectorId, 'knowledge');
      } catch (error) {
        logger.warn(`Error deleting vector ID ${vectorId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  // Map knowledge access level to RAG access level
  const accessLevelMap: Record<KnowledgeAccessLevel, AccessLevel> = {
    [KnowledgeAccessLevel.PUBLIC]: AccessLevel.PUBLIC,
    [KnowledgeAccessLevel.REGISTERED]: AccessLevel.REGISTERED,
    [KnowledgeAccessLevel.PAID]: AccessLevel.PAID,
    [KnowledgeAccessLevel.INFLUENCER]: AccessLevel.INFLUENCER,
    [KnowledgeAccessLevel.ENTERPRISE]: AccessLevel.ENTERPRISE,
    [KnowledgeAccessLevel.PRIVATE]: AccessLevel.PRIVATE
  };
  
  // Create document for RAG
  const document: Document = {
    id: `knowledge-${id}`,
    content: content.content,
    metadata: {
      title: content.title,
      type: content.contentType,
      accessLevel: accessLevelMap[content.accessLevel] || AccessLevel.PRIVATE,
      category: content.category,
      tags: content.tags,
      url: `/knowledge/${content.slug}`,
      source: 'knowledge_base'
    }
  };
  
  // Index document and get vector IDs
  const vectorIds = await ragService.indexDocument(document, {
    collection: 'knowledge',
    chunkSize: 1000,
    chunkOverlap: 200
  });
  
  return vectorIds;
}

/**
 * Remove knowledge content from RAG
 * @private
 */
async function _removeFromRAG(id: string, vectorIds: string[]): Promise<void> {
  // Initialize RAG service
  await ragService.initialize();
  
  // Delete each vector ID
  for (const vectorId of vectorIds) {
    try {
      await ragService.deleteDocument(vectorId, 'knowledge');
    } catch (error) {
      logger.warn(`Error deleting vector ID ${vectorId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Knowledge Content Repository
 * Manages knowledge content in Firestore with RAG integration
 */
export const KnowledgeRepository = {
  /**
   * Get all knowledge content with filters
   */
  async getAll(
    filter: KnowledgeContentFilter = {}
  ): Promise<{ contents: KnowledgeContent[], lastDoc: DocumentSnapshot | null, hasMore: boolean }> {
    const { 
      contentType, 
      category, 
      status = KnowledgeStatus.PUBLISHED, 
      accessLevel,
      tags,
      createdBy,
      page = 1, 
      limit = 10 
    } = filter;
    
    const pageSize = limit;
    const pageIndex = page - 1;
    const startIndex = pageIndex * pageSize;
    
    // Start building the query
    let baseQuery = query(collection(firestore, KNOWLEDGE_COLLECTION));
    let conditions = [];
    
    // Apply filters
    if (contentType) {
      let q = query(baseQuery);
      if (Array.isArray(contentType)) {
        // Multiple content types require client-side filtering
        conditions.push((content: KnowledgeContent) => contentType.includes(content.contentType));
      } else {
        q = query(q, where('contentType', '==', contentType));
        baseQuery = q;
      }
    }
    
    if (category) {
      let q = query(baseQuery);
      if (Array.isArray(category)) {
        conditions.push((content: KnowledgeContent) => category.includes(content.category));
      } else {
        q = query(q, where('category', '==', category));
        baseQuery = q;
      }
    }
    
    if (status) {
      let q = query(baseQuery);
      if (Array.isArray(status)) {
        conditions.push((content: KnowledgeContent) => status.includes(content.status));
      } else {
        q = query(q, where('status', '==', status));
        baseQuery = q;
      }
    }
    
    if (accessLevel) {
      let q = query(baseQuery);
      if (Array.isArray(accessLevel)) {
        conditions.push((content: KnowledgeContent) => accessLevel.includes(content.accessLevel));
      } else {
        q = query(q, where('accessLevel', '==', accessLevel));
        baseQuery = q;
      }
    }
    
    if (tags && tags.length > 0) {
      // Tags are stored as an array, we can only query for content that has ALL specified tags
      tags.forEach(tag => {
        let q = query(baseQuery, where('tags', 'array-contains', tag));
        baseQuery = q;
      });
    }
    
    if (createdBy) {
      let q = query(baseQuery, where('createdBy', '==', createdBy));
      baseQuery = q;
    }
    
    // Add ordering
    let contentQuery = query(baseQuery, orderBy('updatedAt', 'desc'));
    
    // Add pagination
    contentQuery = query(contentQuery, firestoreLimit(pageSize * 2)); // Fetch extra to check if more exist
    
    // Execute query
    const snapshot = await getDocs(contentQuery);
    
    // Apply client-side filters if necessary
    let contents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeContent));
    
    if (conditions.length > 0) {
      conditions.forEach(condition => {
        contents = contents.filter(condition);
      });
    }
    
    // Get total matching count before pagination
    const totalMatching = contents.length;
    
    // Apply pagination on client side for complex queries
    const paginatedContents = contents.slice(0, pageSize);
    
    return {
      contents: paginatedContents,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: totalMatching > pageSize
    };
  },
  
  /**
   * Get knowledge content by ID
   */
  async getById(id: string): Promise<KnowledgeContent | null> {
    const docRef = doc(firestore, KNOWLEDGE_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as KnowledgeContent;
  },
  
  /**
   * Get knowledge content by slug
   */
  async getBySlug(slug: string): Promise<KnowledgeContent | null> {
    const contentQuery = query(
      collection(firestore, KNOWLEDGE_COLLECTION),
      where('slug', '==', slug),
      firestoreLimit(1)
    );

    const snapshot = await getDocs(contentQuery);
    if (snapshot.docs.length === 0) return null;
    
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as KnowledgeContent;
  },
  
  /**
   * Create new knowledge content
   */
  async create(contentData: CreateKnowledgeContentInput, userId: string): Promise<KnowledgeContent> {
    // Generate a unique slug from the title
    const baseSlug = generateSlug(contentData.title);
    let slug = baseSlug;
    let iteration = 1;
    
    // Check if slug already exists, if so, append a number
    while (await this.slugExists(slug)) {
      slug = `${baseSlug}-${iteration}`;
      iteration++;
    }

    const timestamp = Timestamp.now();
    const newContent: Omit<KnowledgeContent, 'id'> = {
      ...contentData,
      slug,
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: contentData.status === KnowledgeStatus.PUBLISHED ? timestamp : null,
      createdBy: userId,
      vectorIds: []
    };

    // Save to Firestore
    const docRef = await addDoc(collection(firestore, KNOWLEDGE_COLLECTION), newContent);
    const createdContent = { id: docRef.id, ...newContent } as KnowledgeContent;
    
    // If content is public, index it in RAG
    if (contentData.status === KnowledgeStatus.PUBLISHED) {
      try {
        // Process for RAG
        const vectorIds = await _indexForRAG(docRef.id, createdContent);
        
        // Update with vector IDs
        await updateDoc(docRef, { vectorIds });
        createdContent.vectorIds = vectorIds;
      } catch (error) {
        logger.error(`Error indexing content in RAG: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return createdContent;
  },
  
  /**
   * Update existing knowledge content
   */
  async update(id: string, contentData: UpdateKnowledgeContentInput): Promise<KnowledgeContent> {
    const docRef = doc(firestore, KNOWLEDGE_COLLECTION, id);
    const currentContent = await this.getById(id);
    
    if (!currentContent) {
      throw new Error(`Knowledge content with ID ${id} not found`);
    }

    // If title is changing, check if we need to update the slug
    if (contentData.title && contentData.title !== currentContent.title) {
      const baseSlug = generateSlug(contentData.title);
      let slug = baseSlug;
      let iteration = 1;
      
      // Check if slug already exists, if so, append a number
      while (await this.slugExists(slug, id)) {
        slug = `${baseSlug}-${iteration}`;
        iteration++;
      }
      
      // Create the slug in the updates
      (contentData as any).slug = slug;
    }

    // If status is changing from non-published to published, set publishedAt
    let needsRagIndexing = false;
    if (
      contentData.status === KnowledgeStatus.PUBLISHED && 
      currentContent.status !== KnowledgeStatus.PUBLISHED
    ) {
      (contentData as any).publishedAt = Timestamp.now();
      needsRagIndexing = true;
    }
    
    // If content is changing and is published, need to re-index
    if ((contentData.content || contentData.title) && 
        (currentContent.status === KnowledgeStatus.PUBLISHED || 
         contentData.status === KnowledgeStatus.PUBLISHED)) {
      needsRagIndexing = true;
    }
    
    // If access level changes, need to re-index
    if (contentData.accessLevel && contentData.accessLevel !== currentContent.accessLevel) {
      needsRagIndexing = true;
    }

    const updates = {
      ...contentData,
      updatedAt: Timestamp.now()
    };

    await updateDoc(docRef, updates);
    
    // Build updated content
    const updatedContent = { ...currentContent, ...updates } as KnowledgeContent;
    
    // If content is published, index it in RAG
    if (contentData.status === KnowledgeStatus.PUBLISHED) {
      try {
        // Process for RAG
        const vectorIds = await _indexForRAG(id, updatedContent);
        
        // Update with vector IDs
        await updateDoc(docRef, { vectorIds });
        updatedContent.vectorIds = vectorIds;
      } catch (error) {
        logger.error(`Error indexing content in RAG: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (currentContent.status === KnowledgeStatus.PUBLISHED && 
               contentData.status && 
               (contentData.status as KnowledgeStatus) !== KnowledgeStatus.PUBLISHED) {
      // If archiving, remove from RAG
      try {
        await _removeFromRAG(id, currentContent.vectorIds);
        await updateDoc(docRef, { vectorIds: [] });
        updatedContent.vectorIds = [];
      } catch (error) {
        logger.error(`Error removing content from RAG: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return updatedContent;
  },
  
  /**
   * Delete knowledge content
   */
  async delete(id: string): Promise<void> {
    const content = await this.getById(id);
    if (!content) return;
    
    // Remove from RAG if published
    if (content.vectorIds && content.vectorIds.length > 0) {
      try {
        await _removeFromRAG(id, content.vectorIds);
      } catch (error) {
        logger.error(`Error removing content from RAG during deletion: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Now delete the document
    const docRef = doc(firestore, KNOWLEDGE_COLLECTION, id);
    await deleteDoc(docRef);
  },
  
  /**
   * Check if a slug already exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    let slugQuery = query(
      collection(firestore, KNOWLEDGE_COLLECTION),
      where('slug', '==', slug)
    );

    const snapshot = await getDocs(slugQuery);
    
    if (snapshot.empty) return false;
    
    // If we're checking for an update, exclude the current document
    if (excludeId) {
      return snapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return true;
  },
  
  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    const snapshot = await getDocs(collection(firestore, KNOWLEDGE_CATEGORY_COLLECTION));
    return snapshot.docs.map(doc => doc.id);
  },
  
  /**
   * Create a new category
   */
  async createCategory(name: string): Promise<void> {
    await setDoc(doc(firestore, KNOWLEDGE_CATEGORY_COLLECTION, name), {
      name,
      createdAt: Timestamp.now()
    });
  },
  
  /**
   * Get content count by content type
   */
  async getCountByType(): Promise<Record<KnowledgeContentType, number>> {
    const counts: Record<KnowledgeContentType, number> = {
      [KnowledgeContentType.FAQ]: 0,
      [KnowledgeContentType.DOCUMENTATION]: 0,
      [KnowledgeContentType.TUTORIAL]: 0,
      [KnowledgeContentType.TROUBLESHOOTING]: 0,
      [KnowledgeContentType.GUIDE]: 0
    };
    
    // Get all published content
    const snapshot = await getDocs(query(
      collection(firestore, KNOWLEDGE_COLLECTION),
      where('status', '==', KnowledgeStatus.PUBLISHED)
    ));
    
    // Count by type
    snapshot.docs.forEach(doc => {
      const content = doc.data() as KnowledgeContent;
      if (content.contentType in counts) {
        counts[content.contentType]++;
      }
    });
    
    return counts;
  },
  
  /**
   * Get related content
   */
  async getRelatedContent(contentId: string, limit = 3): Promise<KnowledgeContent[]> {
    const content = await this.getById(contentId);
    if (!content) return [];
    
    // First check if content has explicit related content IDs
    if (content.relatedContentIds && content.relatedContentIds.length > 0) {
      const relatedContents: KnowledgeContent[] = [];
      
      for (const relatedId of content.relatedContentIds) {
        const related = await this.getById(relatedId);
        if (related && related.status === KnowledgeStatus.PUBLISHED) {
          relatedContents.push(related);
        }
        
        if (relatedContents.length >= limit) break;
      }
      
      return relatedContents;
    }
    
    // Otherwise find content with same category and tags
    const contentQuery = query(
      collection(firestore, KNOWLEDGE_COLLECTION),
      where('category', '==', content.category),
      where('status', '==', KnowledgeStatus.PUBLISHED),
      where('id', '!=', contentId),
      firestoreLimit(limit * 2) // Get extras to filter
    );
    
    const snapshot = await getDocs(contentQuery);
    
    let relatedContents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as KnowledgeContent);
    
    // Define interface for content with score
    interface ScoredContent extends KnowledgeContent {
      score: number;
    }
    
    // Score related content by tag overlap
    const scoredContents = relatedContents.map(item => {
      // Create a new object with score property
      const scoredItem = { ...item, score: 0 } as ScoredContent;
      
      // Add score for each matching tag
      scoredItem.tags.forEach(tag => {
        if (content.tags.includes(tag)) {
          scoredItem.score += 1;
        }
      });
      
      // Add score for matching content type
      if (scoredItem.contentType === content.contentType) {
        scoredItem.score += 2;
      }
      
      return scoredItem;
    });
    
    // Sort by score and take limit
    scoredContents.sort((a, b) => b.score - a.score);
    
    // Convert back to KnowledgeContent array
    return scoredContents.slice(0, limit);
  },
  
  /**
   * Add a related content relationship
   */
  async addRelatedContent(contentId: string, relatedContentId: string): Promise<void> {
    const docRef = doc(firestore, KNOWLEDGE_COLLECTION, contentId);
    await updateDoc(docRef, {
      relatedContentIds: arrayUnion(relatedContentId)
    });
  },
  
  /**
   * Remove a related content relationship
   */
  async removeRelatedContent(contentId: string, relatedContentId: string): Promise<void> {
    const docRef = doc(firestore, KNOWLEDGE_COLLECTION, contentId);
    await updateDoc(docRef, {
      relatedContentIds: arrayRemove(relatedContentId)
    });
  },
  
  /**
   * Update a category name
   */
  async updateCategoryName(oldName: string, newName: string): Promise<void> {
    logger.info(`Updating category name from '${oldName}' to '${newName}'`);
    
    // First, update any articles using this category
    const articlesUpdated = await this.updateArticlesCategory(oldName, newName);
    
    // Then update the category in the categories collection
    const categoryRef = doc(firestore, KNOWLEDGE_CATEGORY_COLLECTION, oldName);
    const newCategoryRef = doc(firestore, KNOWLEDGE_CATEGORY_COLLECTION, newName);
    
    // Create new category
    await setDoc(newCategoryRef, {
      name: newName,
      createdAt: Timestamp.now()
    });
    
    // Delete old category
    await deleteDoc(categoryRef);
    
    logger.info(`Updated category name from '${oldName}' to '${newName}' (${articlesUpdated} articles updated)`);
  },
  
  /**
   * Delete a category
   */
  async deleteCategory(name: string): Promise<void> {
    // Delete the category document
    const categoryRef = doc(firestore, KNOWLEDGE_CATEGORY_COLLECTION, name);
    await deleteDoc(categoryRef);
    
    logger.info(`Deleted category '${name}'`);
  },
  
  /**
   * Count articles in a category
   */
  async countArticlesInCategory(category: string): Promise<number> {
    const articlesQuery = query(
      collection(firestore, KNOWLEDGE_COLLECTION),
      where('category', '==', category)
    );
    
    const snapshot = await getDocs(articlesQuery);
    return snapshot.size;
  },
  
  /**
   * Update articles from one category to another
   */
  async updateArticlesCategory(fromCategory: string, toCategory: string): Promise<number> {
    const articlesQuery = query(
      collection(firestore, KNOWLEDGE_COLLECTION),
      where('category', '==', fromCategory)
    );
    
    const snapshot = await getDocs(articlesQuery);
    
    if (snapshot.empty) {
      return 0;
    }
    
    // Update each article
    const updatePromises = snapshot.docs.map(docSnapshot => {
      return updateDoc(docSnapshot.ref, {
        category: toCategory,
        updatedAt: Timestamp.now()
      });
    });
    
    await Promise.all(updatePromises);
    
    return snapshot.size;
  }
};

export default KnowledgeRepository; 
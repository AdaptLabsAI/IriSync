import { firestore } from '../firebase/admin';
import { v4 as uuidv4 } from 'uuid';
import vectorDatabase, { EmbeddingModelType } from '../rag/vector-database';
import { logger } from '../logging/logger';

/**
 * FAQ entry structure
 */
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  vectorId?: string;
  metadata?: Record<string, any>;
}

/**
 * Create FAQ parameters
 */
export interface CreateFAQParams {
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  priority?: number;
  isPublished?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Update FAQ parameters
 */
export interface UpdateFAQParams {
  question?: string;
  answer?: string;
  category?: string;
  tags?: string[];
  priority?: number;
  isPublished?: boolean;
  metadata?: Record<string, any>;
}

/**
 * FAQ search parameters
 */
export interface FAQSearchParams {
  query?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * FAQ management service
 */
export class FAQService {
  private faqsCollection = firestore.collection('faqs');

  constructor() {
    logger.info('FAQService initialized');
  }

  /**
   * Create a new FAQ
   * @param params FAQ creation parameters
   * @returns The created FAQ
   */
  async createFAQ(params: CreateFAQParams): Promise<FAQ> {
    const now = new Date();
    
    // Create FAQ object
    const faq: FAQ = {
      id: uuidv4(),
      question: params.question,
      answer: params.answer,
      category: params.category || 'general',
      tags: params.tags || [],
      priority: params.priority || 0,
      createdAt: now,
      updatedAt: now,
      isPublished: params.isPublished !== undefined ? params.isPublished : true,
      metadata: params.metadata || {}
    };
    
    // Store FAQ in Firestore
    await this.faqsCollection.doc(faq.id).set(faq);
    
    // Store in vector database for semantic search if published
    if (faq.isPublished) {
      try {
        // Use high-quality embedding model for FAQs as they're critical for user experience
        const vectorId = await vectorDatabase.storeDocument(
          `Question: ${faq.question}\nAnswer: ${faq.answer}`,
          {
            id: faq.id,
            title: faq.question,
            type: 'faq',
            category: faq.category,
            tags: faq.tags,
            accessLevel: 'public',
            embeddingModel: EmbeddingModelType.OPENAI_TEXT_EMBEDDING_3_SMALL // Specify in metadata
          },
          'faq'
        );
        
        // Update FAQ with vector ID
        faq.vectorId = vectorId;
        await this.faqsCollection.doc(faq.id).update({ vectorId });
        
        logger.info('FAQ added to vector database', {
          faqId: faq.id,
          vectorId,
          question: faq.question.substring(0, 50)
        });
      } catch (error) {
        logger.error('Error storing FAQ in vector database:', {
          error: error instanceof Error ? error.message : String(error),
          faqId: faq.id
        });
      }
    }
    
    return faq;
  }

  /**
   * Update an existing FAQ
   * @param faqId FAQ ID
   * @param params Update parameters
   * @returns Updated FAQ or null if not found
   */
  async updateFAQ(faqId: string, params: UpdateFAQParams): Promise<FAQ | null> {
    const faqDoc = await this.faqsCollection.doc(faqId).get();
    
    if (!faqDoc.exists) {
      return null;
    }
    
    const currentFAQ = faqDoc.data() as FAQ;
    
    // Prepare update data
    const updateData: Partial<FAQ> = {
      updatedAt: new Date()
    };
    
    if (params.question !== undefined) updateData.question = params.question;
    if (params.answer !== undefined) updateData.answer = params.answer;
    if (params.category !== undefined) updateData.category = params.category;
    if (params.tags !== undefined) updateData.tags = params.tags;
    if (params.priority !== undefined) updateData.priority = params.priority;
    if (params.isPublished !== undefined) updateData.isPublished = params.isPublished;
    if (params.metadata !== undefined) {
      updateData.metadata = { ...currentFAQ.metadata, ...params.metadata };
    }
    
    // Apply updates
    await this.faqsCollection.doc(faqId).update(updateData);
    
    // Get updated FAQ
    const updatedDoc = await this.faqsCollection.doc(faqId).get();
    const updatedFAQ = updatedDoc.data() as FAQ;
    
    // Check if we need to update the vector database
    const contentChanged = params.question !== undefined || params.answer !== undefined;
    const publishStatusChanged = params.isPublished !== undefined && params.isPublished !== currentFAQ.isPublished;
    
    if ((contentChanged || publishStatusChanged) && updatedFAQ.isPublished) {
      try {
        // Delete old vector if it exists
        if (currentFAQ.vectorId) {
          await vectorDatabase.deleteDocument(currentFAQ.vectorId, 'faq');
          logger.debug('Deleted old FAQ vector', { 
            faqId, 
            oldVectorId: currentFAQ.vectorId 
          });
        }
        
        // Create new vector
        const vectorId = await vectorDatabase.storeDocument(
          `Question: ${updatedFAQ.question}\nAnswer: ${updatedFAQ.answer}`,
          {
            id: updatedFAQ.id,
            title: updatedFAQ.question,
            type: 'faq',
            category: updatedFAQ.category,
            tags: updatedFAQ.tags,
            accessLevel: 'public',
            embeddingModel: EmbeddingModelType.OPENAI_TEXT_EMBEDDING_3_SMALL // Specify in metadata
          },
          'faq'
        );
        
        // Update FAQ with new vector ID
        updatedFAQ.vectorId = vectorId;
        await this.faqsCollection.doc(faqId).update({ vectorId });
        
        logger.info('Updated FAQ in vector database', {
          faqId,
          vectorId,
          question: updatedFAQ.question.substring(0, 50)
        });
      } catch (error) {
        logger.error('Error updating FAQ in vector database:', {
          error: error instanceof Error ? error.message : String(error),
          faqId
        });
      }
    } else if ((publishStatusChanged && !updatedFAQ.isPublished) && currentFAQ.vectorId) {
      try {
        // Delete vector if FAQ is unpublished
        await vectorDatabase.deleteDocument(currentFAQ.vectorId, 'faq');
        await this.faqsCollection.doc(faqId).update({ vectorId: null });
        updatedFAQ.vectorId = undefined;
        
        logger.info('Removed unpublished FAQ from vector database', { faqId });
      } catch (error) {
        logger.error('Error removing FAQ from vector database:', {
          error: error instanceof Error ? error.message : String(error),
          faqId
        });
      }
    }
    
    return updatedFAQ;
  }

  /**
   * Get a FAQ by ID
   * @param faqId FAQ ID
   * @returns FAQ or null if not found
   */
  async getFAQ(faqId: string): Promise<FAQ | null> {
    const faqDoc = await this.faqsCollection.doc(faqId).get();
    
    if (!faqDoc.exists) {
      return null;
    }
    
    return faqDoc.data() as FAQ;
  }

  /**
   * Delete a FAQ
   * @param faqId FAQ ID
   * @returns Success indicator
   */
  async deleteFAQ(faqId: string): Promise<boolean> {
    try {
      // Get the FAQ first
      const faq = await this.getFAQ(faqId);
      
      if (!faq) {
        return false;
      }
      
      // Delete from vector database if it exists
      if (faq.vectorId) {
        await vectorDatabase.deleteDocument(faq.vectorId, 'faq');
      }
      
      // Delete from Firestore
      await this.faqsCollection.doc(faqId).delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      return false;
    }
  }

  /**
   * Search FAQs
   * @param params Search parameters
   * @returns List of FAQs and total count
   */
  async searchFAQs(params: FAQSearchParams = {}): Promise<{
    faqs: FAQ[];
    total: number;
  }> {
    let query = this.faqsCollection as any;
    
    // Apply filters
    if (params.category) {
      query = query.where('category', '==', params.category);
    }
    
    if (params.isPublished !== undefined) {
      query = query.where('isPublished', '==', params.isPublished);
    }
    
    if (params.tags && params.tags.length > 0) {
      query = query.where('tags', 'array-contains-any', params.tags);
    }
    
    // Count total before applying limit and offset
    const countQuery = await query.count().get();
    const total = countQuery.data().count;
    
    // Apply sorting and pagination
    query = query.orderBy('priority', 'desc')
                 .orderBy('updatedAt', 'desc');
    
    if (params.limit) {
      query = query.limit(params.limit);
    }
    
    if (params.offset) {
      query = query.offset(params.offset);
    }
    
    // Execute query
    const querySnapshot = await query.get();
    
    const faqs: FAQ[] = [];
    querySnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      faqs.push(doc.data() as FAQ);
    });
    
    // If text query is provided, filter in memory
    if (params.query && params.query.trim() !== '') {
      const searchQuery = params.query.toLowerCase();
      
      const filteredFaqs = faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery) || 
        faq.answer.toLowerCase().includes(searchQuery) ||
        faq.tags.some(tag => tag.toLowerCase().includes(searchQuery))
      );
      
      return {
        faqs: filteredFaqs,
        total: filteredFaqs.length // This is an approximation
      };
    }
    
    return { faqs, total };
  }

  /**
   * Semantic search for FAQs
   * Uses high-quality embeddings for better search results
   * @param query Search query
   * @param limit Maximum number of results
   * @returns FAQ matches with relevance scores
   */
  async semanticSearchFAQs(
    query: string,
    limit: number = 5
  ): Promise<Array<{
    faq: FAQ;
    score: number;
  }>> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    try {
      // Use vector database search with high-quality embeddings
      const searchResults = await vectorDatabase.search({
        query,
        collections: ['faq'],
        limit,
        minRelevanceScore: 0.7,
        embeddingModel: EmbeddingModelType.OPENAI_TEXT_EMBEDDING_3_SMALL
      });
      
      // Fetch all matching FAQs
      const faqIds = searchResults.map(result => result.id);
      
      if (faqIds.length === 0) {
        return [];
      }
      
      // Get all matching FAQs in a batch
      const faqsSnapshot = await this.faqsCollection
        .where('id', 'in', faqIds)
        .where('isPublished', '==', true)
        .get();
      
      // Map search results to FAQs
      const faqs = faqsSnapshot.docs.map(doc => doc.data() as FAQ);
      
      // Create result array with score
      const results = searchResults
        .filter(result => {
          const matchingFaq = faqs.find(faq => faq.id === result.id);
          return matchingFaq !== undefined;
        })
        .map(result => {
          const matchingFaq = faqs.find(faq => faq.id === result.id)!;
          return {
            faq: matchingFaq,
            score: result.score
          };
        });
      
      logger.debug('Semantic FAQ search complete', {
        query: query.substring(0, 50),
        matchCount: results.length,
        topScore: results[0]?.score
      });
      
      return results;
    } catch (error) {
      logger.error('Error performing semantic FAQ search:', {
        error: error instanceof Error ? error.message : String(error),
        query: query.substring(0, 50)
      });
      
      return [];
    }
  }

  /**
   * Find best FAQ match for a query
   * @param query User query
   * @returns Best matching FAQ or null
   */
  async findBestFAQMatch(query: string): Promise<{
    faq: FAQ;
    score: number;
  } | null> {
    try {
      const results = await this.semanticSearchFAQs(query, 1);
      
      if (results.length === 0 || results[0].score < 0.8) {
        return null;
      }
      
      return results[0];
    } catch (error) {
      console.error('Error finding best FAQ match:', error);
      return null;
    }
  }

  /**
   * Get all FAQ categories
   * @returns List of unique categories
   */
  async getAllCategories(): Promise<string[]> {
    try {
      const snapshot = await this.faqsCollection
        .where('isPublished', '==', true)
        .select('category')
        .get();
      
      const categories = new Set<string>();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          categories.add(data.category);
        }
      });
      
      return Array.from(categories).sort();
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  /**
   * Get FAQs by category
   * @param category Category to filter by
   * @param limit Maximum results
   * @returns List of FAQs in the category
   */
  async getFAQsByCategory(category: string, limit: number = 20): Promise<FAQ[]> {
    try {
      const snapshot = await this.faqsCollection
        .where('category', '==', category)
        .where('isPublished', '==', true)
        .orderBy('priority', 'desc')
        .limit(limit)
        .get();
      
      const faqs: FAQ[] = [];
      
      snapshot.forEach(doc => {
        faqs.push(doc.data() as FAQ);
      });
      
      return faqs;
    } catch (error) {
      console.error('Error getting FAQs by category:', error);
      return [];
    }
  }

  /**
   * Seed initial FAQs for the system
   * @returns Success indicator
   */
  async seedInitialFAQs(): Promise<boolean> {
    try {
      const defaultFAQs: CreateFAQParams[] = [
        {
          question: 'What is IriSync?',
          answer: 'IriSync is a comprehensive social media management platform that helps businesses and creators manage their social media presence across multiple platforms. Features include content scheduling, analytics, AI-assisted content creation, and more.',
          category: 'general',
          tags: ['basics', 'platform'],
          priority: 100,
          isPublished: true
        },
        {
          question: 'What platforms does IriSync support?',
          answer: 'IriSync supports major social media platforms including Facebook, Instagram, Twitter, LinkedIn, TikTok, YouTube, Reddit, Mastodon, and Threads. We regularly add support for new platforms based on user demand.',
          category: 'platforms',
          tags: ['basics', 'connections'],
          priority: 90,
          isPublished: true
        },
        {
          question: 'How do I connect a social media account?',
          answer: 'To connect a social media account, go to your Dashboard > Settings > Connections. Click on "Add New Connection" and select the platform you want to connect. Follow the authentication steps for the selected platform to complete the connection.',
          category: 'account',
          tags: ['getting-started', 'connections'],
          priority: 85,
          isPublished: true
        },
        {
          question: 'What subscription plans does IriSync offer?',
          answer: 'IriSync offers three primary subscription tiers: Creator (basic features for individuals), Influencer (enhanced features for growing creators), and Enterprise (comprehensive features for businesses and large teams). You can view detailed plan information on our Pricing page.',
          category: 'billing',
          tags: ['pricing', 'plans'],
          priority: 80,
          isPublished: true
        },
        {
          question: 'How does the AI content generation work?',
          answer: 'IriSync\'s AI content generation uses advanced language models to help you create engaging social media content. It can generate post ideas, captions, hashtags, and more based on your input. The AI learns from your style and preferences over time for more personalized suggestions.',
          category: 'features',
          tags: ['ai', 'content'],
          priority: 75,
          isPublished: true
        },
        {
          question: 'How do I schedule posts?',
          answer: 'To schedule posts, go to your Dashboard > Content > Calendar. Click on the "Create" button or any empty time slot on the calendar. Create your post, select the platforms, set the date and time, and click "Schedule". You can also use the bulk scheduler for multiple posts.',
          category: 'features',
          tags: ['content', 'scheduling'],
          priority: 70,
          isPublished: true
        },
        {
          question: 'Can I manage multiple team members?',
          answer: 'Yes, on Influencer and Enterprise plans, you can add team members with different permission levels. Go to Dashboard > Settings > Team to invite members and manage their roles and permissions.',
          category: 'account',
          tags: ['team', 'permissions'],
          priority: 65,
          isPublished: true
        },
        {
          question: 'How do I view analytics for my posts?',
          answer: 'Access analytics from Dashboard > Analytics. You can view performance metrics for all your social media accounts, including engagement rates, follower growth, and content performance. Use filters to analyze specific date ranges, platforms, or content types.',
          category: 'features',
          tags: ['analytics', 'reporting'],
          priority: 60,
          isPublished: true
        },
        {
          question: 'How do I cancel my subscription?',
          answer: 'To cancel your subscription, go to Dashboard > Settings > Billing > Subscription Details and click on "Cancel Subscription". Follow the prompts to complete the cancellation process. Your account will remain active until the end of your current billing period.',
          category: 'billing',
          tags: ['account', 'cancellation'],
          priority: 55,
          isPublished: true
        },
        {
          question: 'How can I contact customer support?',
          answer: 'You can contact our support team by clicking on the "Support" icon in the bottom right corner of your dashboard, or by emailing support@irisync.com. Enterprise customers have access to priority support with dedicated response times.',
          category: 'support',
          tags: ['help', 'contact'],
          priority: 50,
          isPublished: true
        }
      ];
      
      // Check if FAQs already exist
      const existingFAQs = await this.faqsCollection.limit(1).get();
      
      if (!existingFAQs.empty) {
        console.log('FAQs already exist, skipping seed');
        return true;
      }
      
      // Create all FAQs
      for (const faqParams of defaultFAQs) {
        await this.createFAQ(faqParams);
      }
      
      console.log('Successfully seeded initial FAQs');
      return true;
    } catch (error) {
      console.error('Error seeding FAQs:', error);
      return false;
    }
  }
}

export default new FAQService(); 
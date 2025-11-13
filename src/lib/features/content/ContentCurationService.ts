import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { firestore } from '../core/firebase';
import { tieredModelRouter, TaskType } from '../ai/models/tiered-model-router';
import { User } from '../core/models/User';
import { logger } from '../logging/logger';

/**
 * Content Source Configuration
 */
export interface ContentSource {
  id: string;
  name: string;
  type: 'rss' | 'api' | 'social' | 'news' | 'blog' | 'custom';
  url: string;
  apiKey?: string;
  headers?: Record<string, string>;
  isActive: boolean;
  lastFetched?: Date;
  fetchFrequency: 'hourly' | 'daily' | 'weekly';
  contentFilters: {
    keywords: string[];
    excludeKeywords: string[];
    categories: string[];
    languages: string[];
    minQualityScore: number;
  };
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Curated Content Item
 */
export interface CuratedContent {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  description: string;
  content: string;
  url: string;
  imageUrl?: string;
  author?: string;
  publishedAt: Date;
  fetchedAt: Date;
  
  // AI Analysis
  relevanceScore: number; // 0-100
  qualityScore: number; // 0-100
  sentimentScore: number; // -1 to 1
  topics: string[];
  keywords: string[];
  
  // Curation Status
  status: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'published';
  curatedBy?: string;
  curatedAt?: Date;
  notes?: string;
  
  // Adaptation suggestions
  adaptationSuggestions: {
    platforms: string[];
    suggestedContent: string;
    hashtags: string[];
    bestPostingTime?: Date;
    estimatedEngagement: number;
  };
  
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Curation Rules
 */
export interface CurationRules {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  
  // Content Criteria
  criteria: {
    minRelevanceScore: number;
    minQualityScore: number;
    requiredTopics: string[];
    excludedTopics: string[];
    requiredKeywords: string[];
    excludedKeywords: string[];
    sentimentRange: { min: number; max: number };
    contentTypes: string[];
    languages: string[];
  };
  
  // Auto-actions
  autoActions: {
    autoApprove: boolean;
    autoSchedule: boolean;
    autoAdapt: boolean;
    notifyTeam: boolean;
  };
  
  // Brand alignment
  brandAlignment: {
    checkBrandGuidelines: boolean;
    minBrandScore: number;
    requireManualReview: boolean;
  };
  
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Content Curation Analytics
 */
export interface CurationAnalytics {
  totalCurated: number;
  approvalRate: number;
  averageRelevanceScore: number;
  averageQualityScore: number;
  topSources: Array<{
    sourceId: string;
    sourceName: string;
    contentCount: number;
    approvalRate: number;
  }>;
  topTopics: Array<{
    topic: string;
    count: number;
    averageScore: number;
  }>;
  performanceByPlatform: Record<string, {
    contentCount: number;
    averageEngagement: number;
    bestPerformingContent: string[];
  }>;
  timeframe: {
    start: Date;
    end: Date;
  };
}

/**
 * Content Curation Service
 * Automatically discovers, analyzes, and curates content from various sources
 */
export class ContentCurationService {
  private static instance: ContentCurationService;
  
  private constructor() {}
  
  public static getInstance(): ContentCurationService {
    if (!ContentCurationService.instance) {
      ContentCurationService.instance = new ContentCurationService();
    }
    return ContentCurationService.instance;
  }
  
  /**
   * Add a new content source
   */
  async addContentSource(
    source: Omit<ContentSource, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<ContentSource> {
    try {
      const sourceRef = doc(collection(firestore, 'contentSources'));
      
      const newSource: ContentSource = {
        ...source,
        id: sourceRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(sourceRef, {
        ...newSource,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      logger.info('Content source added', {
        sourceId: newSource.id,
        organizationId: source.organizationId,
        userId
      });
      
      return newSource;
    } catch (error) {
      logger.error('Error adding content source', { error, userId });
      throw error;
    }
  }
  
  /**
   * Get content sources for organization
   */
  async getContentSources(organizationId: string): Promise<ContentSource[]> {
    try {
      const q = query(
        collection(firestore, 'contentSources'),
        where('organizationId', '==', organizationId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastFetched: data.lastFetched?.toDate()
        } as ContentSource;
      });
    } catch (error) {
      logger.error('Error getting content sources', { error, organizationId });
      throw error;
    }
  }
  
  /**
   * Fetch content from all active sources
   */
  async fetchContentFromSources(organizationId: string, user?: User): Promise<CuratedContent[]> {
    try {
      const sources = await this.getContentSources(organizationId);
      const allContent: CuratedContent[] = [];
      
      for (const source of sources) {
        try {
          const content = await this.fetchFromSource(source, user);
          allContent.push(...content);
          
          // Update last fetched time
          await this.updateSourceLastFetched(source.id);
        } catch (error) {
          logger.warn('Failed to fetch from source', { 
            error, 
            sourceId: source.id, 
            sourceName: source.name 
          });
        }
      }
      
      logger.info('Content fetched from sources', {
        organizationId,
        sourceCount: sources.length,
        contentCount: allContent.length
      });
      
      return allContent;
    } catch (error) {
      logger.error('Error fetching content from sources', { error, organizationId });
      throw error;
    }
  }
  
  /**
   * Fetch content from a specific source
   */
  private async fetchFromSource(source: ContentSource, user?: User): Promise<CuratedContent[]> {
    try {
      let rawContent: any[] = [];
      
      switch (source.type) {
        case 'rss':
          rawContent = await this.fetchFromRSS(source);
          break;
        case 'api':
          rawContent = await this.fetchFromAPI(source);
          break;
        case 'news':
          rawContent = await this.fetchFromNewsAPI(source);
          break;
        case 'social':
          rawContent = await this.fetchFromSocialAPI(source);
          break;
        default:
          logger.warn('Unsupported source type', { sourceType: source.type });
          return [];
      }
      
      // Process and analyze content
      const processedContent: CuratedContent[] = [];
      
      for (const item of rawContent) {
        try {
          const curatedItem = await this.processRawContent(item, source, user);
          if (curatedItem && this.passesFilters(curatedItem, source.contentFilters)) {
            processedContent.push(curatedItem);
          }
        } catch (error) {
          logger.warn('Failed to process content item', { error, sourceId: source.id });
        }
      }
      
      return processedContent;
    } catch (error) {
      logger.error('Error fetching from source', { error, sourceId: source.id });
      return [];
    }
  }
  
  /**
   * Fetch content from RSS feed
   */
  private async fetchFromRSS(source: ContentSource): Promise<any[]> {
    try {
      const response = await fetch(source.url);
      const xmlText = await response.text();
      
      // Parse RSS/XML (simplified - in production, use a proper XML parser)
      const items: any[] = [];
      
      // This is a simplified RSS parser - in production, use a library like 'rss-parser'
      const itemMatches = xmlText.match(/<item[^>]*>([\s\S]*?)<\/item>/gi);
      
      if (itemMatches) {
        for (const itemXml of itemMatches.slice(0, 20)) { // Limit to 20 items
          const title = this.extractXMLValue(itemXml, 'title');
          const description = this.extractXMLValue(itemXml, 'description');
          const link = this.extractXMLValue(itemXml, 'link');
          const pubDate = this.extractXMLValue(itemXml, 'pubDate');
          
          if (title && link) {
            items.push({
              title,
              description: description || '',
              url: link,
              publishedAt: pubDate ? new Date(pubDate) : new Date(),
              content: description || title
            });
          }
        }
      }
      
      return items;
    } catch (error) {
      logger.error('Error fetching RSS content', { error, url: source.url });
      return [];
    }
  }
  
  /**
   * Fetch content from API
   */
  private async fetchFromAPI(source: ContentSource): Promise<any[]> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...source.headers
      };
      
      if (source.apiKey) {
        headers['Authorization'] = `Bearer ${source.apiKey}`;
      }
      
      const response = await fetch(source.url, { headers });
      const data = await response.json();
      
      // Assume the API returns an array of content items
      return Array.isArray(data) ? data : data.items || data.articles || [data];
    } catch (error) {
      logger.error('Error fetching API content', { error, url: source.url });
      return [];
    }
  }
  
  /**
   * Fetch content from News API
   */
  private async fetchFromNewsAPI(source: ContentSource): Promise<any[]> {
    try {
      // Example for News API integration
      const url = new URL(source.url);
      if (source.apiKey) {
        url.searchParams.set('apiKey', source.apiKey);
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      return data.articles || [];
    } catch (error) {
      logger.error('Error fetching news content', { error, url: source.url });
      return [];
    }
  }
  
  /**
   * Fetch content from Social API
   */
  private async fetchFromSocialAPI(source: ContentSource): Promise<any[]> {
    try {
      // This would integrate with social media APIs
      // Implementation depends on specific platform APIs
      logger.info('Social API fetching not yet implemented', { sourceId: source.id });
      return [];
    } catch (error) {
      logger.error('Error fetching social content', { error, url: source.url });
      return [];
    }
  }
  
  /**
   * Process raw content item with AI analysis
   */
  private async processRawContent(
    rawItem: any,
    source: ContentSource,
    user?: User
  ): Promise<CuratedContent | null> {
    try {
      // Extract basic information
      const title = rawItem.title || rawItem.headline || '';
      const description = rawItem.description || rawItem.summary || '';
      const content = rawItem.content || rawItem.body || description;
      const url = rawItem.url || rawItem.link || '';
      const publishedAt = rawItem.publishedAt || rawItem.pubDate || new Date();
      
      if (!title || !content) {
        return null;
      }
      
      // Use AI to analyze content
      const analysis = await this.analyzeContentWithAI(content, user);
      
      // Generate adaptation suggestions
      const adaptationSuggestions = await this.generateAdaptationSuggestions(
        content,
        analysis,
        user
      );
      
      const curatedContentRef = doc(collection(firestore, 'curatedContent'));
      
      const curatedContent: CuratedContent = {
        id: curatedContentRef.id,
        sourceId: source.id,
        sourceName: source.name,
        title,
        description,
        content,
        url,
        imageUrl: rawItem.imageUrl || rawItem.urlToImage,
        author: rawItem.author,
        publishedAt: new Date(publishedAt),
        fetchedAt: new Date(),
        
        // AI Analysis results
        relevanceScore: analysis.relevanceScore,
        qualityScore: analysis.qualityScore,
        sentimentScore: analysis.sentimentScore,
        topics: analysis.topics,
        keywords: analysis.keywords,
        
        status: 'pending',
        adaptationSuggestions,
        organizationId: source.organizationId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save to database
      await setDoc(curatedContentRef, {
        ...curatedContent,
        publishedAt: Timestamp.fromDate(curatedContent.publishedAt),
        fetchedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return curatedContent;
    } catch (error) {
      logger.error('Error processing raw content', { error, sourceId: source.id });
      return null;
    }
  }
  
  /**
   * Analyze content with AI
   */
  private async analyzeContentWithAI(content: string, user?: User): Promise<{
    relevanceScore: number;
    qualityScore: number;
    sentimentScore: number;
    topics: string[];
    keywords: string[];
  }> {
    try {
      const prompt = `
        Analyze this content for curation purposes:
        
        CONTENT:
        ${content}
        
        Please provide:
        1. Relevance score (0-100) - how relevant is this for social media sharing
        2. Quality score (0-100) - overall content quality and credibility
        3. Sentiment score (-1 to 1) - emotional tone of the content
        4. Main topics (up to 5)
        5. Key keywords (up to 10)
        
        Format as JSON:
        {
          "relevanceScore": 85,
          "qualityScore": 90,
          "sentimentScore": 0.3,
          "topics": ["technology", "AI", "business"],
          "keywords": ["artificial intelligence", "innovation", "automation"]
        }
      `;
      
      const result = await tieredModelRouter.routeTask({
        type: TaskType.CONTENT_GENERATION,
        input: prompt,
        options: {
          temperature: 0.3,
          maxTokens: 500
        }
      }, user);
      
      return JSON.parse(result.output);
    } catch (error) {
      logger.warn('Failed to analyze content with AI', { error });
      
      // Return fallback analysis
      return {
        relevanceScore: 50,
        qualityScore: 50,
        sentimentScore: 0,
        topics: ['general'],
        keywords: []
      };
    }
  }
  
  /**
   * Generate adaptation suggestions for different platforms
   */
  private async generateAdaptationSuggestions(
    content: string,
    analysis: any,
    user?: User
  ): Promise<CuratedContent['adaptationSuggestions']> {
    try {
      const prompt = `
        Create platform-specific adaptations for this content:
        
        ORIGINAL CONTENT:
        ${content}
        
        ANALYSIS:
        Topics: ${analysis.topics?.join(', ')}
        Keywords: ${analysis.keywords?.join(', ')}
        Sentiment: ${analysis.sentimentScore}
        
        Please provide:
        1. Suggested platforms (Twitter, LinkedIn, Facebook, Instagram)
        2. Adapted content for social media
        3. Relevant hashtags
        4. Estimated engagement score (0-100)
        
        Format as JSON:
        {
          "platforms": ["twitter", "linkedin"],
          "suggestedContent": "Adapted content here...",
          "hashtags": ["#AI", "#Innovation"],
          "estimatedEngagement": 75
        }
      `;
      
      const result = await tieredModelRouter.routeTask({
        type: TaskType.CONTENT_GENERATION,
        input: prompt,
        options: {
          temperature: 0.4,
          maxTokens: 400
        }
      }, user);
      
      const suggestions = JSON.parse(result.output);
      
      return {
        platforms: suggestions.platforms || ['twitter', 'linkedin'],
        suggestedContent: suggestions.suggestedContent || content.substring(0, 200) + '...',
        hashtags: suggestions.hashtags || [],
        estimatedEngagement: suggestions.estimatedEngagement || 50
      };
    } catch (error) {
      logger.warn('Failed to generate adaptation suggestions', { error });
      
      // Return fallback suggestions
      return {
        platforms: ['twitter', 'linkedin'],
        suggestedContent: content.substring(0, 200) + '...',
        hashtags: [],
        estimatedEngagement: 50
      };
    }
  }
  
  /**
   * Check if content passes filters
   */
  private passesFilters(content: CuratedContent, filters: ContentSource['contentFilters']): boolean {
    // Check minimum quality score
    if (content.qualityScore < filters.minQualityScore) {
      return false;
    }
    
    // Check required keywords
    if (filters.keywords.length > 0) {
      const contentLower = content.content.toLowerCase();
      const hasRequiredKeyword = filters.keywords.some(keyword => 
        contentLower.includes(keyword.toLowerCase())
      );
      if (!hasRequiredKeyword) {
        return false;
      }
    }
    
    // Check excluded keywords
    if (filters.excludeKeywords.length > 0) {
      const contentLower = content.content.toLowerCase();
      const hasExcludedKeyword = filters.excludeKeywords.some(keyword => 
        contentLower.includes(keyword.toLowerCase())
      );
      if (hasExcludedKeyword) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get curated content for organization
   */
  async getCuratedContent(
    organizationId: string,
    options: {
      status?: CuratedContent['status'];
      limit?: number;
      offset?: number;
      sortBy?: 'relevanceScore' | 'qualityScore' | 'publishedAt' | 'fetchedAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<CuratedContent[]> {
    try {
      let q = query(
        collection(firestore, 'curatedContent'),
        where('organizationId', '==', organizationId)
      );
      
      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }
      
      if (options.sortBy) {
        q = query(q, orderBy(options.sortBy, options.sortOrder || 'desc'));
      }
      
      if (options.limit) {
        q = query(q, limit(options.limit));
      }
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          publishedAt: data.publishedAt?.toDate() || new Date(),
          fetchedAt: data.fetchedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          curatedAt: data.curatedAt?.toDate()
        } as CuratedContent;
      });
    } catch (error) {
      logger.error('Error getting curated content', { error, organizationId });
      throw error;
    }
  }
  
  /**
   * Update content status
   */
  async updateContentStatus(
    contentId: string,
    status: CuratedContent['status'],
    userId: string,
    notes?: string
  ): Promise<void> {
    try {
      const contentRef = doc(firestore, 'curatedContent', contentId);
      
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };
      
      if (status === 'approved' || status === 'rejected') {
        updateData.curatedBy = userId;
        updateData.curatedAt = serverTimestamp();
      }
      
      if (notes) {
        updateData.notes = notes;
      }
      
      await updateDoc(contentRef, updateData);
      
      logger.info('Content status updated', {
        contentId,
        status,
        userId
      });
    } catch (error) {
      logger.error('Error updating content status', { error, contentId, userId });
      throw error;
    }
  }
  
  /**
   * Get curation analytics
   */
  async getCurationAnalytics(
    organizationId: string,
    timeframe: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<CurationAnalytics> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
      }
      
      const q = query(
        collection(firestore, 'curatedContent'),
        where('organizationId', '==', organizationId),
        where('fetchedAt', '>=', Timestamp.fromDate(startDate)),
        where('fetchedAt', '<=', Timestamp.fromDate(endDate))
      );
      
      const snapshot = await getDocs(q);
      const content = snapshot.docs.map(doc => doc.data() as CuratedContent);
      
      const totalCurated = content.length;
      const approvedContent = content.filter(c => c.status === 'approved');
      const approvalRate = totalCurated > 0 ? Math.round((approvedContent.length / totalCurated) * 100) : 0;
      
      const totalRelevanceScore = content.reduce((sum, c) => sum + (c.relevanceScore || 0), 0);
      const averageRelevanceScore = totalCurated > 0 ? Math.round(totalRelevanceScore / totalCurated) : 0;
      
      const totalQualityScore = content.reduce((sum, c) => sum + (c.qualityScore || 0), 0);
      const averageQualityScore = totalCurated > 0 ? Math.round(totalQualityScore / totalCurated) : 0;
      
      return {
        totalCurated,
        approvalRate,
        averageRelevanceScore,
        averageQualityScore,
        topSources: [], // Would need to aggregate by source
        topTopics: [], // Would need to aggregate topics
        performanceByPlatform: {}, // Would need platform performance data
        timeframe: {
          start: startDate,
          end: endDate
        }
      };
    } catch (error) {
      logger.error('Error getting curation analytics', { error, organizationId });
      throw error;
    }
  }
  
  /**
   * Update source last fetched time
   */
  private async updateSourceLastFetched(sourceId: string): Promise<void> {
    try {
      const sourceRef = doc(firestore, 'contentSources', sourceId);
      await updateDoc(sourceRef, {
        lastFetched: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      logger.warn('Failed to update source last fetched time', { error, sourceId });
    }
  }
  
  /**
   * Extract value from XML string
   */
  private extractXMLValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }
} 
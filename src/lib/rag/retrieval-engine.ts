import { v4 as uuidv4 } from 'uuid';
import vectorDatabase, { VectorSearchResult } from './vector-database';
import knowledgeBaseService, { AccessLevel, DocumentType, KnowledgeDocument } from './knowledge-base';
import { config } from '../config';
import { tieredModelRouter, TaskType } from '../ai/models/tiered-model-router';
import { AIProviderFactory, AIProvider } from '../ai/providers/AIProviderFactory';
import { ProviderType } from '../ai/providers/ProviderType';
import { User } from '../models/User';

/**
 * Citation information for retrieved content
 */
export interface Citation {
  id: string;
  documentId: string;
  title: string;
  content: string;
  url?: string;
  score: number;
  category?: string;
  type?: string;
}

/**
 * Search context for context-aware retrieval
 */
export interface SearchContext {
  userId?: string;
  organizationId?: string;
  userTier?: string;
  previousQueries?: string[];
  relevantDocumentIds?: string[];
  preferredCategories?: string[];
  preferredTypes?: DocumentType[];
  excludeDocumentIds?: string[];
}

/**
 * Relevance scoring configuration
 */
export interface RelevanceConfig {
  semanticWeight: number;
  recencyWeight: number;
  popularityWeight: number;
  userPreferenceWeight: number;
  minScore: number;
}

/**
 * Retrieved content with all associated metadata
 */
export interface RetrievedContent {
  content: string;
  citations: Citation[];
  context: string;
  searchQuery: string;
}

/**
 * Search parameters for semantic search
 */
export interface SemanticSearchParams {
  query: string;
  context?: SearchContext;
  filters?: {
    accessLevel?: AccessLevel | AccessLevel[];
    documentType?: DocumentType | DocumentType[];
    category?: string | string[];
    tags?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
    authors?: string[];
  };
  limit?: number;
  offset?: number;
  includeContent?: boolean;
  includeCitations?: boolean;
}

/**
 * Search options
 */
export interface SearchOptions {
  collections?: string[];
  limit?: number;
  minRelevanceScore?: number;
  filters?: Record<string, any>;
  accessLevel?: string | string[];
  sourcePriorities?: DocumentType[]; // Priority order of document types (highest priority first)
}

/**
 * Retrieval Engine service for context-aware information retrieval
 */
export class RetrievalEngine {
  private aiProvider: AIProvider;
  
  // Default relevance scoring configuration
  private defaultRelevanceConfig: RelevanceConfig = {
    semanticWeight: 0.7,
    recencyWeight: 0.1,
    popularityWeight: 0.1,
    userPreferenceWeight: 0.1,
    minScore: 0.6
  };
  
  constructor(aiProvider?: AIProvider) {
    // Get the appropriate model based on subscription tier
    const getModelByTier = (tier?: 'creator' | 'influencer' | 'enterprise'): string => {
      if (!tier) {
        return process.env.ANONYMOUS_MODEL_ID || 'gemini-2.0-flash';
      }
      
      switch (tier) {
        case 'enterprise':
          return process.env.ENTERPRISE_MODEL_ID || 'claude-3.7-sonnet';
        case 'influencer':
          return process.env.INFLUENCER_MODEL_ID || 'claude-3.5-sonnet';
        case 'creator':
          return process.env.CREATOR_MODEL_ID || 'gpt-3.5-turbo';
        default:
          return process.env.ANONYMOUS_MODEL_ID || 'gemini-2.0-flash';
      }
    };

    // If provider is already passed, use it
    if (aiProvider) {
      this.aiProvider = aiProvider;
      return;
    }
    
    // Otherwise create provider based on default model
    const modelId = getModelByTier();
    let providerType = ProviderType.OPENAI;
    let apiKey = '';
    
    // Determine provider type and API key based on model ID
    if (modelId.includes('gpt')) {
      providerType = ProviderType.OPENAI;
      apiKey = process.env.OPENAI_API_KEY || '';
    } else if (modelId.includes('claude')) {
      providerType = ProviderType.ANTHROPIC;
      apiKey = process.env.ANTHROPIC_API_KEY || '';
    } else if (modelId.includes('gemini')) {
      providerType = ProviderType.GOOGLE;
      apiKey = process.env.GOOGLE_AI_API_KEY || '';
    }
    
    this.aiProvider = AIProviderFactory.createProvider(
      providerType,
      {
        modelId: modelId,
        apiKey: apiKey
      }
    );
  }
  
  /**
   * Perform a semantic search with contextual awareness
   * @param params Search parameters
   * @returns Search results with citations
   */
  async semanticSearch(params: SemanticSearchParams): Promise<{
    results: VectorSearchResult[];
    citations: Citation[];
    total: number;
  }> {
    // Get accessible access levels based on context
    const accessLevels = this.getAccessLevelsFromContext(params.context);
    
    // Expand query with context if available
    const expandedQuery = params.context && params.context.previousQueries?.length 
      ? await this.expandQueryWithContext(params.query, params.context) 
      : params.query;
    
    // Prepare filters for vector search
    const vectorFilters: Record<string, any> = {};
    
    if (params.filters) {
      if (params.filters.accessLevel) {
        if (Array.isArray(params.filters.accessLevel)) {
          // Filter accessible levels
          const filteredLevels = (params.filters.accessLevel as AccessLevel[])
            .filter(level => accessLevels.includes(level));
          
          vectorFilters.accessLevel = { $in: filteredLevels };
        } else if (accessLevels.includes(params.filters.accessLevel as AccessLevel)) {
          vectorFilters.accessLevel = params.filters.accessLevel;
        }
      } else {
        // Default to all accessible levels
        vectorFilters.accessLevel = { $in: accessLevels };
      }
      
      if (params.filters.documentType) {
        if (Array.isArray(params.filters.documentType)) {
          vectorFilters.type = { $in: params.filters.documentType };
        } else {
          vectorFilters.type = params.filters.documentType;
        }
      }
      
      if (params.filters.category) {
        if (Array.isArray(params.filters.category)) {
          vectorFilters.category = { $in: params.filters.category };
        } else {
          vectorFilters.category = params.filters.category;
        }
      }
      
      if (params.filters.tags && params.filters.tags.length > 0) {
        vectorFilters.tags = { $in: params.filters.tags };
      }
      
      // Add date filters if provided
      if (params.filters.createdAfter || params.filters.createdBefore) {
        vectorFilters.createdAt = {};
        
        if (params.filters.createdAfter) {
          vectorFilters.createdAt.$gte = params.filters.createdAfter.toISOString();
        }
        
        if (params.filters.createdBefore) {
          vectorFilters.createdAt.$lte = params.filters.createdBefore.toISOString();
        }
      }
      
      // Add author filter if provided
      if (params.filters.authors && params.filters.authors.length > 0) {
        vectorFilters.createdBy = { $in: params.filters.authors };
      }
    } else {
      // Default to all accessible levels
      vectorFilters.accessLevel = { $in: accessLevels };
    }
    
    // Add organization filter for enterprise users
    if (params.context?.organizationId && params.context.userTier === 'enterprise') {
      vectorFilters.organizationId = params.context.organizationId;
    }
    
    // Exclude specific documents if requested
    if (params.context?.excludeDocumentIds && params.context.excludeDocumentIds.length > 0) {
      vectorFilters.id = { $nin: params.context.excludeDocumentIds };
    }
    
    // Search vector database with expanded query
    const searchResults = await vectorDatabase.search({
      query: expandedQuery,
      filters: vectorFilters,
      limit: (params.limit || 5) * 2, // Get more results than needed for reranking
      minRelevanceScore: this.defaultRelevanceConfig.minScore
    });
    
    // Rerank results using relevance scoring
    const rerankedResults = await this.rerank(
      searchResults,
      params.query,
      params.context
    );
    
    // Limit results based on request
    const limitedResults = rerankedResults.slice(0, params.limit || 5);
    
    // Generate citations if requested
    const citations: Citation[] = [];
    
    if (params.includeCitations) {
      for (const result of limitedResults) {
        citations.push({
          id: uuidv4(),
          documentId: result.metadata.parentDocumentId || result.id,
          title: result.metadata.title || 'Untitled',
          content: result.content,
          url: result.metadata.url,
          score: result.score,
          category: result.metadata.category,
          type: result.metadata.type
        });
      }
    }
    
    return {
      results: limitedResults,
      citations,
      total: searchResults.length
    };
  }
  
  /**
   * Retrieve content with context awareness and citations
   * @param query Main search query
   * @param context Search context for personalization
   * @param filters Additional search filters
   * @returns Retrieved content with citations
   */
  async retrieveContent(
    query: string,
    context?: SearchContext,
    filters?: SemanticSearchParams['filters']
  ): Promise<RetrievedContent> {
    // Perform semantic search
    const searchResults = await this.semanticSearch({
      query,
      context,
      filters,
      limit: 8,
      includeCitations: true
    });
    
    // Create citations
    const citations = searchResults.citations;
    
    // Format content from search results
    let content = '';
    const usedDocumentIds = new Set<string>();
    
    // Generate content from the top results
    const topResults = searchResults.results.slice(0, 5);
    
    for (const result of topResults) {
      const documentId = result.metadata.parentDocumentId || result.id;
      
      // Skip duplicates from the same document
      if (usedDocumentIds.has(documentId)) continue;
      usedDocumentIds.add(documentId);
      
      content += result.content + '\n\n';
    }
    
    // Create context string for response generation
    const contextString = this.formatContextFromResults(searchResults.results);
    
    return {
      content,
      citations,
      context: contextString,
      searchQuery: query
    };
  }
  
  /**
   * Generate a response with citations from a query
   * @param query User query
   * @param context Search context
   * @param filters Search filters
   * @returns Generated response with citations
   */
  async generateResponseWithCitations(
    query: string,
    context?: SearchContext,
    filters?: SemanticSearchParams['filters']
  ): Promise<{
    response: string;
    citations: Citation[];
  }> {
    // Retrieve relevant content
    const retrievedContent = await this.retrieveContent(query, context, filters);
    
    // Prompt for AI to generate response with citations
    const promptForCitations = `
Question: ${query}

Relevant information:
${retrievedContent.content}

Instructions:
1. Answer the question based on the relevant information provided.
2. Include citation markers like [1], [2], etc. after sentences that use specific information.
3. Keep your response focused on answering the question with factual information.
4. Do not make up information that is not in the provided context.
5. If you don't have enough information to answer fully, acknowledge what you can and cannot answer.
`;

    // Generate the response 
    const model = this.getModelForTier(context?.userTier || 'creator');
    const response = await this.aiProvider.generateText(promptForCitations, {
      model,
      temperature: 0.3,
      maxTokens: 500
    });
    
    return {
      response,
      citations: retrievedContent.citations
    };
  }
  
  /**
   * Rerank search results based on relevance scoring
   * @param results Initial search results
   * @param query Original query
   * @param context Search context
   * @param config Custom relevance configuration
   * @returns Reranked results
   */
  private async rerank(
    results: VectorSearchResult[],
    query: string,
    context?: SearchContext,
    config?: Partial<RelevanceConfig>
  ): Promise<VectorSearchResult[]> {
    const relevanceConfig = { ...this.defaultRelevanceConfig, ...config };
    
    // Calculate scores for each result
    const scoredResults = results.map(result => {
      const semanticScore = result.score * relevanceConfig.semanticWeight;
      
      // Calculate recency score (if timestamp available)
      let recencyScore = 0;
      if (result.metadata.timestamp) {
        const timestamp = new Date(result.metadata.timestamp);
        const now = new Date();
        const ageInDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
        // More recent = higher score, with a decay function
        recencyScore = Math.max(0, 1 - (ageInDays / 90)) * relevanceConfig.recencyWeight;
      }
      
      // Calculate popularity score (if available)
      const popularityScore = (result.metadata.viewCount 
        ? Math.min(1, result.metadata.viewCount / 100) 
        : 0) * relevanceConfig.popularityWeight;
      
      // Calculate user preference score
      let preferenceScore = 0;
      if (context?.preferredCategories?.includes(result.metadata.category)) {
        preferenceScore += 0.5 * relevanceConfig.userPreferenceWeight;
      }
      if (context?.preferredTypes?.includes(result.metadata.type)) {
        preferenceScore += 0.5 * relevanceConfig.userPreferenceWeight;
      }
      if (context?.relevantDocumentIds?.includes(result.metadata.parentDocumentId)) {
        preferenceScore += 0.5 * relevanceConfig.userPreferenceWeight;
      }
      
      // Clamp preference score
      preferenceScore = Math.min(relevanceConfig.userPreferenceWeight, preferenceScore);
      
      // Calculate combined score
      const combinedScore = semanticScore + recencyScore + popularityScore + preferenceScore;
      
      return {
        ...result,
        score: combinedScore
      };
    });
    
    // Filter by minimum score and sort by score
    return scoredResults
      .filter(result => result.score >= relevanceConfig.minScore)
      .sort((a, b) => b.score - a.score);
  }
  
  /**
   * Get access levels based on user context
   * @param context Search context
   * @returns List of accessible access levels
   */
  private getAccessLevelsFromContext(context?: SearchContext): AccessLevel[] {
    if (!context) {
      return [AccessLevel.PUBLIC];
    }
    
    const tier = context.userTier;
    
    if (!tier) {
      return [AccessLevel.PUBLIC];
    }
    
    const accessLevels = [AccessLevel.PUBLIC];
    
    switch (tier) {
      case 'enterprise':
        return [
          AccessLevel.PUBLIC,
          AccessLevel.REGISTERED,
          AccessLevel.PAID,
          AccessLevel.INFLUENCER,
          AccessLevel.ENTERPRISE
        ];
      case 'influencer':
        return [
          AccessLevel.PUBLIC,
          AccessLevel.REGISTERED,
          AccessLevel.PAID,
          AccessLevel.INFLUENCER
        ];
      case 'creator':
        return [
          AccessLevel.PUBLIC,
          AccessLevel.REGISTERED,
          AccessLevel.PAID
        ];
      default:
        return [AccessLevel.PUBLIC];
    }
  }
  
  /**
   * Expand query with context for better retrieval
   * @param query Original query
   * @param context Search context
   * @returns Expanded query
   */
  private async expandQueryWithContext(query: string, context: SearchContext): Promise<string> {
    if (!context.previousQueries || context.previousQueries.length === 0) {
      return query;
    }
    
    try {
      // Take the last 3 queries for context
      const recentQueries = context.previousQueries.slice(-3);
      
      // Create prompt for query expansion
      const prompt = `
Given a user's current query and their previous queries, create an expanded version of the current query that 
incorporates relevant context from previous queries to improve search results. Do not drastically change
the meaning of the current query, only enhance it with context.

Previous queries:
${recentQueries.map(q => `- ${q}`).join('\n')}

Current query: ${query}

Expanded query:`;
      
      // Use AI to expand the query
      const expandedQuery = await this.aiProvider.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 100
      });
      
      return expandedQuery.trim();
    } catch (error) {
      console.error('Error expanding query with context:', error);
      return query; // Fallback to original query
    }
  }
  
  /**
   * Format context string from search results
   * @param results Search results
   * @returns Formatted context string
   */
  private formatContextFromResults(results: VectorSearchResult[]): string {
    let contextString = 'RELEVANT INFORMATION:\n\n';
    
    results.forEach((result, index) => {
      const title = result.metadata.title || `Source ${index + 1}`;
      contextString += `[${index + 1}] ${title}\n${result.content}\n\n`;
    });
    
    return contextString;
  }
  
  /**
   * Get appropriate AI model based on user tier
   * @param userTier User subscription tier
   * @returns Model identifier
   */
  private getModelForTier(userTier: string): string {
    switch (userTier) {
      case 'enterprise':
        return config.ai.defaultModel;
      case 'influencer':
        return config.ai.defaultModel;
      case 'creator':
        return config.ai.defaultModel;
      default:
        return config.ai.defaultModel; // Anonymous users don't get RAG
    }
  }
}

export default new RetrievalEngine(); 
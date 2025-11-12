import { v4 as uuidv4 } from 'uuid';
import { Pinecone } from '@pinecone-database/pinecone';
import config from '../config';
import { logger } from '../logging/logger';

/**
 * Search result from vector database
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  content: string;
  title?: string;
  url?: string;
}

/**
 * Search parameters for vector database
 */
export interface VectorSearchParams {
  query: string;
  collections?: string[];
  limit?: number;
  minRelevanceScore?: number;
  filters?: Record<string, any>;
  embeddingModel?: EmbeddingModelType;
}

/**
 * Available embedding model types
 */
export enum EmbeddingModelType {
  OPENAI_TEXT_EMBEDDING_3_SMALL = 'text-embedding-3-small',
  OPENAI_TEXT_EMBEDDING_3_LARGE = 'text-embedding-3-large',
  GOOGLE_TEXT_EMBEDDING_GECKO = 'text-embedding-gecko', 
  COHERE_EMBED_ENGLISH = 'embed-english-v3.0',
  COHERE_EMBED_MULTILINGUAL = 'embed-multilingual-v3.0'
}

/**
 * Embedding model configuration
 */
export interface EmbeddingModelConfig {
  dimensions: number;
  provider: 'openai' | 'google' | 'cohere';
  endpoint: string;
  model: string;
  apiKeyVariable: string;
}

/**
 * Vector database service for RAG implementation
 */
export class VectorDatabase {
  private client: Pinecone;
  private indexName: string;
  private namespace: string;
  private isInitialized: boolean = false;
  private embeddingModels: Map<EmbeddingModelType, EmbeddingModelConfig>;
  private defaultEmbeddingModel: EmbeddingModelType;
  private apiKeys: Record<string, string>;

  constructor() {
    this.client = new Pinecone({
      apiKey: config.pinecone.apiKey,
    });
    this.indexName = config.pinecone.indexName;
    this.namespace = config.pinecone.namespace;
    
    // Initialize embedding model configurations
    this.embeddingModels = new Map<EmbeddingModelType, EmbeddingModelConfig>([
      [EmbeddingModelType.OPENAI_TEXT_EMBEDDING_3_SMALL, {
        dimensions: 1536,
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1/embeddings',
        model: 'text-embedding-3-small',
        apiKeyVariable: 'OPENAI_API_KEY'
      }],
      [EmbeddingModelType.OPENAI_TEXT_EMBEDDING_3_LARGE, {
        dimensions: 3072,
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1/embeddings',
        model: 'text-embedding-3-large',
        apiKeyVariable: 'OPENAI_API_KEY'
      }],
      [EmbeddingModelType.GOOGLE_TEXT_EMBEDDING_GECKO, {
        dimensions: 768,
        provider: 'google',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models/embedding-gecko:embedText',
        model: 'embedding-gecko',
        apiKeyVariable: 'GOOGLE_API_KEY'
      }],
      [EmbeddingModelType.COHERE_EMBED_ENGLISH, {
        dimensions: 1024,
        provider: 'cohere',
        endpoint: 'https://api.cohere.ai/v1/embed',
        model: 'embed-english-v3.0',
        apiKeyVariable: 'COHERE_API_KEY'
      }],
      [EmbeddingModelType.COHERE_EMBED_MULTILINGUAL, {
        dimensions: 1024,
        provider: 'cohere',
        endpoint: 'https://api.cohere.ai/v1/embed', 
        model: 'embed-multilingual-v3.0',
        apiKeyVariable: 'COHERE_API_KEY'
      }]
    ]);
    
    // Set default embedding model from config or fallback
    this.defaultEmbeddingModel = 
      this.getEmbeddingModelTypeFromString(config.ai.embeddingModel) || 
      EmbeddingModelType.OPENAI_TEXT_EMBEDDING_3_SMALL;
    
    // Load API keys
    // NOTE: Only config.ai.apiKey is available in the current config structure.
    this.apiKeys = {
      'OPENAI_API_KEY': config.ai.apiKey || '',
      'GOOGLE_API_KEY': config.ai.apiKey || '',
      'COHERE_API_KEY': config.ai.apiKey || ''
    };
    
    this.isInitialized = true;
    logger.info('Pinecone client initialized', {
      indexName: this.indexName,
      defaultEmbeddingModel: this.defaultEmbeddingModel
    });
  }

  /**
   * Convert string model name to enum
   */
  private getEmbeddingModelTypeFromString(modelName?: string): EmbeddingModelType | null {
    if (!modelName) return null;
    
    // Check if it's a direct match with an enum value
    if (Object.values(EmbeddingModelType).includes(modelName as EmbeddingModelType)) {
      return modelName as EmbeddingModelType;
    }
    
    // Attempt fuzzy matching
    const lowerModelName = modelName.toLowerCase();
    
    if (lowerModelName.includes('openai') && lowerModelName.includes('small')) {
      return EmbeddingModelType.OPENAI_TEXT_EMBEDDING_3_SMALL;
    } else if (lowerModelName.includes('openai') && lowerModelName.includes('large')) {
      return EmbeddingModelType.OPENAI_TEXT_EMBEDDING_3_LARGE;
    } else if (lowerModelName.includes('google') || lowerModelName.includes('gecko')) {
      return EmbeddingModelType.GOOGLE_TEXT_EMBEDDING_GECKO;
    } else if (lowerModelName.includes('cohere') && lowerModelName.includes('multi')) {
      return EmbeddingModelType.COHERE_EMBED_MULTILINGUAL;
    } else if (lowerModelName.includes('cohere') || lowerModelName.includes('english')) {
      return EmbeddingModelType.COHERE_EMBED_ENGLISH;
    }
    
    // Return default if no match
    return null;
  }

  /**
   * Initialize the Pinecone client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // For the updated SDK, initialization happens in the constructor
    this.isInitialized = true;
    logger.info('Pinecone client initialized successfully');
  }

  /**
   * Search for documents with similar vector embeddings
   * @param params Search parameters
   * @returns List of search results
   */
  async search(params: VectorSearchParams): Promise<VectorSearchResult[]> {
    await this.initialize();
    
    // Determine which embedding model to use
    const embeddingModel = params.embeddingModel || this.defaultEmbeddingModel;
    
    // Use embeddings API to convert query to vector
    const queryEmbedding = await this.getEmbedding(params.query, embeddingModel);
    
    // Prepare filter if provided
    const filter = params.filters || undefined;
    
    // Get index from Pinecone
    const index = this.client.index(this.indexName);
    
    // Define namespace to search in based on collections or default
    const namespace = params.collections?.length === 1 
      ? params.collections[0] 
      : this.namespace;
    
    try {
      // Execute the search with namespace as part of the filter
      const queryResult = await index.query({
        vector: queryEmbedding,
        topK: params.limit || 5,
        includeMetadata: true,
        filter
      });
      
      // Filter results by minimum relevance score if specified
      const minScore = params.minRelevanceScore || 0;
      const filteredMatches = queryResult.matches?.filter((match) => 
        (match.score || 0) >= minScore
      ) || [];
      
      // Format the results
      const results: VectorSearchResult[] = filteredMatches.map((match) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as Record<string, any>,
        content: (match.metadata as any).content || '',
        title: (match.metadata as any).title,
        url: (match.metadata as any).url
      }));
      
      logger.debug('Vector search completed', {
        query: params.query.substring(0, 50),
        modelUsed: embeddingModel,
        resultCount: results.length,
        topScore: results[0]?.score
      });
      
      return results;
    } catch (error) {
      logger.error('Vector search failed', {
        error: error instanceof Error ? error.message : String(error),
        query: params.query.substring(0, 50)
      });
      
      // Return empty results on error
      return [];
    }
  }

  /**
   * Get embedding vector for text using the specified model
   * @param text Text to convert to embedding
   * @param modelType Embedding model to use
   * @returns Embedding vector
   */
  private async getEmbedding(text: string, modelType: EmbeddingModelType = this.defaultEmbeddingModel): Promise<number[]> {
    await this.initialize();
    
    const modelConfig = this.embeddingModels.get(modelType);
    
    if (!modelConfig) {
      throw new Error(`Unknown embedding model type: ${modelType}`);
    }
    
    const apiKey = this.apiKeys[modelConfig.apiKeyVariable];
    
    if (!apiKey) {
      throw new Error(`API key not available for model ${modelType}`);
    }
    
    try {
      // Prepare request based on provider
      let requestOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      let requestBody: any = {};
      
      switch (modelConfig.provider) {
        case 'openai':
          requestOptions.headers = {
            ...requestOptions.headers,
            'Authorization': `Bearer ${apiKey}`
          };
          requestBody = {
            input: text,
            model: modelConfig.model,
            encoding_format: 'float'
          };
          break;
          
        case 'google':
          const url = new URL(modelConfig.endpoint);
          url.searchParams.append('key', apiKey);
          modelConfig.endpoint = url.toString();
          
          requestBody = {
            text
          };
          break;
          
        case 'cohere':
          requestOptions.headers = {
            ...requestOptions.headers,
            'Authorization': `Bearer ${apiKey}`,
            'Cohere-Version': '2022-12-06'
          };
          requestBody = {
            texts: [text],
            model: modelConfig.model,
            input_type: 'search_document'
          };
          break;
      }
      
      requestOptions.body = JSON.stringify(requestBody);
      
      // Make the API call
      const response = await fetch(modelConfig.endpoint, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Embedding API error (${response.status}): ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      
      // Extract embedding based on provider's response format
      let embedding: number[] = [];
      
      switch (modelConfig.provider) {
        case 'openai':
          embedding = data.data?.[0]?.embedding || [];
          break;
        case 'google':
          embedding = data.embedding?.value || [];
          break;
        case 'cohere':
          embedding = data.embeddings?.[0] || [];
          break;
      }
      
      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error(`Invalid embedding response format from ${modelConfig.provider}`);
      }
      
      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', {
        error: error instanceof Error ? error.message : String(error),
        model: modelType,
        provider: modelConfig.provider,
        textLength: text.length
      });
      
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Store a document in the vector database
   * @param text Document text content
   * @param metadata Additional metadata
   * @param collection Collection/namespace to store in
   * @returns ID of stored document
   */
  async storeDocument(
    text: string, 
    metadata: Record<string, any> = {}, 
    collection: string = this.namespace
  ): Promise<string> {
    await this.initialize();
    
    const id = metadata.id || uuidv4();
    const embedding = await this.getEmbedding(text);
    
    const index = this.client.index(this.indexName);
    
    // Prepare record with metadata
    const record = {
      id,
      values: embedding,
      metadata: {
        ...metadata,
        content: text,
        timestamp: new Date().toISOString()
      }
    };
    
    // Upsert the vector
    await index.upsert([record]);
    
    return id;
  }

  /**
   * Delete a document from the vector database
   * @param id Document ID
   * @param collection Collection/namespace
   */
  async deleteDocument(id: string, collection: string = this.namespace): Promise<void> {
    await this.initialize();
    
    const index = this.client.index(this.indexName);
    
    await index.deleteOne(id);
  }

  /**
   * Check if index exists, create if it doesn't
   * @param dimensions Number of dimensions for embedding vectors
   */
  async ensureIndexExists(dimensions: number = 1536): Promise<void> {
    await this.initialize();
    
    // List existing indexes
    const indexes = await this.client.listIndexes();
    
    // Check if our index exists
    const indexExists = indexes.indexes?.some(idx => idx.name === this.indexName) || false;
    
    // Create index if it doesn't exist
    if (!indexExists) {
      logger.info(`Creating Pinecone index: ${this.indexName}`);
      
      // Create index with appropriate settings
      await this.client.createIndex({
        name: this.indexName,
        dimension: dimensions,
        metric: 'cosine', // Using cosine similarity
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-west-2'
          }
        }
      });
      
      // Wait for index to be ready
      let isReady = false;
      while (!isReady) {
        const indexDescription = await this.client.describeIndex(this.indexName);
        isReady = indexDescription.status?.ready || false;
        if (!isReady) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      logger.info(`Pinecone index ${this.indexName} created successfully`);
    }
  }
}

export default new VectorDatabase(); 
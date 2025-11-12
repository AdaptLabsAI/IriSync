/**
 * Application configuration including API keys, endpoints, and feature settings
 */
const config = {
  // Pinecone vector database settings
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    indexName: process.env.PINECONE_INDEX || 'irisync-docs',
    namespace: process.env.PINECONE_NAMESPACE || 'default',
    environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp',
    dimensions: 1536 // OpenAI embedding dimensions
  },
  
  // AI provider settings
  ai: {
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '',
    defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-3.5-turbo',
    embeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-ada-002',
    embeddingEndpoint: process.env.AI_EMBEDDING_ENDPOINT || 'https://api.openai.com/v1/embeddings',
    chatEndpoint: process.env.AI_CHAT_ENDPOINT || 'https://api.openai.com/v1/chat/completions',
    requestTimeoutMs: 30000,
    maxRetries: 3,
    rateLimitPerMinute: 50
  },
  
  // RAG system configuration
  rag: {
    defaultChunkSize: 1000,
    defaultChunkOverlap: 200,
    maxSearchResults: 10,
    minRelevanceScore: 0.6,
    maxContextTokens: 4000,
    cacheTtlSeconds: 3600 // 1 hour
  },
  
  // Token usage settings
  tokens: {
    // Tokens per tier per month
    limits: {
      creator: 100,
      influencer: 500,
      enterprise: 5000,
      enterprisePerSeat: 500 // Additional tokens per seat beyond initial 5
    },
    
    // Cost estimates for different operations
    costs: {
      ragProcess: 1, // Per chunk
      ragSearch: 1,
      ragGenerate: 'dynamic', // Based on input/output tokens
      contentGenerate: 1,
      contentAnalyze: 1,
      scheduleOptimize: 1,
      responseAssist: 1
    },
    
    // Alert thresholds for usage (percent of monthly allocation)
    alertThresholds: [75, 90, 100]
  },
  
  // Feature availabilities and quota limits per subscription tier
  features: {
    creator: {
      allowRag: false,
      allowVideoScheduling: false,
      allowBulkScheduling: false,
      // Social accounts limit per organization
      socialAccountsLimit: 5,
      // Storage quota per organization (in MB)
      storageMBLimit: 1000, // 1GB
      // Team members per organization
      teamMembersLimit: 3
    },
    
    influencer: {
      allowRag: true,
      allowVideoScheduling: true,
      allowBulkScheduling: true,
      // Social accounts limit per organization (unlimited)
      socialAccountsLimit: Number.MAX_SAFE_INTEGER,
      // Storage quota per organization (in MB)
      storageMBLimit: 10000, // 10GB
      // Team members per organization
      teamMembersLimit: 10
    },
    
    enterprise: {
      allowRag: true,
      allowVideoScheduling: true,
      allowBulkScheduling: true,
      // Social accounts limit per organization (unlimited)
      socialAccountsLimit: Number.MAX_SAFE_INTEGER,
      // Storage quota per organization (in MB)
      storageMBLimit: 100000, // 100GB
      // Team members per organization
      teamMembersLimit: 50,
      // Enterprise-only features
      allowCustomApiKey: true,
      allowDedicatedSupport: true
    }
  },
  
  // Storage configuration
  storage: {
    bucket: process.env.STORAGE_BUCKET || 'irisync-media',
    maxFileSize: 25 * 1024 * 1024, // 25MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    allowedDocumentTypes: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  }
};

// Export both named and default exports for compatibility
export { config };
export default config; 
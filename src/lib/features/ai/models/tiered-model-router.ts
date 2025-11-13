import { User } from '../../../core/models/User';
import { logger } from '../../../core/logging/logger';
import { firestore } from '../../../core/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
// Import error class directly instead of from a module
/**
 * Error class for feature access restrictions based on subscription tier
 */
export class FeatureAccessError extends Error {
  /**
   * Create a new feature access error
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'FeatureAccessError';
    
    // Ensure prototype chain works properly in TypeScript
    Object.setPrototypeOf(this, FeatureAccessError.prototype);
  }
}

/**
 * Interface for AI provider
 */
export interface AIProvider {
  generateText(prompt: string, options: any): Promise<any>;
  generateChat(messages: any[], options: any): Promise<any>;
  getModelId(): string;
}

/**
 * Real AI Provider that routes to actual AI services
 */
class RealAIProvider implements AIProvider {
  private openaiProvider?: any;
  private anthropicProvider?: any;
  private googleProvider?: any;
  
  constructor() {
    this.initializeProviders();
  }
  
  private async initializeProviders() {
    try {
      // Initialize OpenAI provider if API key is available
      if (process.env.OPENAI_API_KEY) {
        const { OpenAIProvider } = await import('../providers/OpenAIProvider');
        this.openaiProvider = new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY,
          modelId: 'gpt-3.5-turbo'
        });
      }
      
      // Initialize Anthropic provider if API key is available
      if (process.env.ANTHROPIC_API_KEY) {
        const { ClaudeProvider } = await import('../providers/ClaudeProvider');
        this.anthropicProvider = new ClaudeProvider({
          apiKey: process.env.ANTHROPIC_API_KEY,
          modelId: 'claude-3-5-haiku-20241022'
        });
      }
      
      // Initialize Google provider if API key is available
      if (process.env.GOOGLE_AI_API_KEY) {
        const { GeminiProvider } = await import('../providers/GeminiProvider');
        this.googleProvider = new GeminiProvider({
          apiKey: process.env.GOOGLE_AI_API_KEY,
          modelId: 'gemini-1.5-flash'
        });
      }
    } catch (error) {
      logger.error('Error initializing AI providers', { error });
    }
  }
  
  async generateText(prompt: string, options: any): Promise<any> {
    const model = options?.model || 'claude-3-5-haiku-20241022';
    
    try {
      // Route to appropriate provider based on model
      if (model.startsWith('gpt') && this.openaiProvider) {
        return await this.openaiProvider.generateText(prompt, { ...options, model });
      } else if (model.startsWith('claude') && this.anthropicProvider) {
        return await this.anthropicProvider.generateText(prompt, { ...options, model });
      } else if (model.startsWith('gemini') && this.googleProvider) {
        return await this.googleProvider.generateText(prompt, { ...options, model });
      } else {
        // Fallback to any available provider with model parameter
        if (this.anthropicProvider) {
          return await this.anthropicProvider.generateText(prompt, { ...options, model });
        } else if (this.openaiProvider) {
          return await this.openaiProvider.generateText(prompt, { ...options, model });
        } else if (this.googleProvider) {
          return await this.googleProvider.generateText(prompt, { ...options, model });
        } else {
          throw new Error('No AI providers available - check API keys');
        }
      }
    } catch (error) {
      logger.error('Error generating text with real AI provider', { error, model });
      // Fallback to basic response to prevent complete failure
      return { 
        output: `AI analysis unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tokenUsage: { input: 0, output: 0 }
      };
    }
  }
  
  async generateChat(messages: any[], options: any): Promise<any> {
    const model = options?.model || 'claude-3-5-haiku-20241022';
    
    try {
      // Route to appropriate provider based on model
      if (model.startsWith('gpt') && this.openaiProvider) {
        return await this.openaiProvider.generateChat(messages, { ...options, model });
      } else if (model.startsWith('claude') && this.anthropicProvider) {
        return await this.anthropicProvider.generateChat(messages, { ...options, model });
      } else if (model.startsWith('gemini') && this.googleProvider) {
        return await this.googleProvider.generateChat(messages, { ...options, model });
      } else {
        // Fallback to any available provider with model parameter
        if (this.anthropicProvider) {
          return await this.anthropicProvider.generateChat(messages, { ...options, model });
        } else if (this.openaiProvider) {
          return await this.openaiProvider.generateChat(messages, { ...options, model });
        } else if (this.googleProvider) {
          return await this.googleProvider.generateChat(messages, { ...options, model });
        } else {
          throw new Error('No AI providers available - check API keys');
        }
      }
    } catch (error) {
      logger.error('Error generating chat with real AI provider', { error, model });
      // Fallback to basic response to prevent complete failure
      return { 
        output: `AI analysis unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tokenUsage: { input: 0, output: 0 }
      };
    }
  }

  getModelId(): string {
    return "real-ai-provider";
  }
}

/**
 * Subscription tiers for users
 */
export enum SubscriptionTier {
  ANONYMOUS = 'anonymous',
  CREATOR = 'creator',
  INFLUENCER = 'influencer',
  ENTERPRISE = 'enterprise'
}

/**
 * Task types for AI operations
 */
export enum TaskType {
  // Content Generation
  LONG_FORM_CONTENT = 'long_form_content',
  SOCIAL_MEDIA_POST = 'social_media_post',
  CAPTION_WRITING = 'caption_writing',
  HASHTAG_GENERATION = 'hashtag_generation',
  
  // Visual Processing
  IMAGE_ANALYSIS = 'image_analysis',
  ALT_TEXT_GENERATION = 'alt_text_generation',
  VISUAL_CONTENT_MODERATION = 'visual_content_moderation',
  
  // Content Analysis
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  CONTENT_CATEGORIZATION = 'content_categorization',
  ENGAGEMENT_PREDICTION = 'engagement_prediction',
  
  // Strategic Insights
  CONTENT_STRATEGY = 'content_strategy',
  COMPETITIVE_ANALYSIS = 'competitive_analysis',
  TREND_ANALYSIS = 'trend_analysis',
  PERFORMANCE_INSIGHTS = 'performance_insights',
  
  // Engagement & Support
  COMMENT_REPLIES = 'comment_replies',
  CUSTOMER_SUPPORT = 'customer_support',
  SOCIAL_LISTENING = 'social_listening',
  
  // Premium Features
  BRAND_VOICE_ANALYSIS = 'brand_voice_analysis',
  SMART_REPLIES = 'smart_replies',
  ADVANCED_SOCIAL_LISTENING = 'advanced_social_listening',
  
  // RAG & Automation
  RETRIEVAL = 'retrieval',
  SEMANTIC_SEARCH = 'semantic_search',
  WORKFLOW_AUTOMATION = 'workflow_automation',
  
  // Support Chatbot - only available for anonymous users
  CHATBOT = 'chatbot',
  
  // ========== NEW SMART CONTENT CREATOR FEATURES ==========
  
  // Performance Prediction (INFLUENCER+ only)
  ANALYTICS = 'analytics',
  CONTENT_PERFORMANCE_PREDICTION = 'content_performance_prediction',
  
  // A/B Testing (INFLUENCER+ only)  
  AB_TEST_GENERATION = 'ab_test_generation',
  AB_TEST_ANALYSIS = 'ab_test_analysis',
  
  // Content Repurposing (CREATOR+ with limits, INFLUENCER+ full access)
  CONTENT_REPURPOSING = 'content_repurposing',
  CONTENT_SERIES_GENERATION = 'content_series_generation',
  CROSS_PLATFORM_ADAPTATION = 'cross_platform_adaptation'
}

/**
 * Available AI models
 */
export enum ModelType {
  // OpenAI models (Updated May 2025)
  GPT_35_TURBO = 'gpt-3.5-turbo',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4O = 'gpt-4o', // Latest GPT-4 Omni model
  
  // Anthropic models (Updated May 2025)
  CLAUDE_4_SONNET = 'claude-4-sonnet', // Latest Claude 4 model for premium Enterprise tasks
  CLAUDE_35_SONNET = 'claude-3-5-sonnet-20241022', // Latest Claude 3.5 Sonnet - Best for complex tasks
  CLAUDE_35_HAIKU = 'claude-3-5-haiku-20241022', // Latest Claude 3.5 Haiku - Much cheaper, great for simple tasks
  CLAUDE_35_SONNET_LEGACY = 'claude-3-5-sonnet-20240620', // Legacy version for fallback
  CLAUDE_3_OPUS = 'claude-3-opus-20240229', // Legacy model, replaced by Claude 4 Sonnet
  
  // Google models (Updated May 2025)
  GEMINI_20_FLASH = 'gemini-2.0-flash-exp', // Latest experimental version
  GEMINI_15_FLASH = 'gemini-1.5-flash-002', // Great middle ground option
  GEMINI_15_PRO = 'gemini-1.5-pro-002' // Latest version with improved performance
}

/**
 * Parameters for AI model execution
 */
export interface AIParameters {
  temperature: number;
  maxTokens: number;
  qualityPreference?: 'standard' | 'high' | 'highest';
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

/**
 * Task for AI processing
 */
export interface AITask {
  type: TaskType;
  input: any;
  options?: Partial<AIParameters>;
}

/**
 * Response from AI processing
 */
export interface AIResponse {
  output: any;
  modelUsed: ModelType;
  tokenUsage?: {
    input: number;
    output: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Cache key for retrieving cached AI responses
 */
interface CacheKey {
  taskType: TaskType;
  inputHash: string;
  tier: SubscriptionTier;
}

/**
 * Cache entry for AI responses
 */
interface CacheEntry {
  response: AIResponse;
  expiresAt: Date;
}

/**
 * Interface for database model configuration
 */
interface DatabaseModelConfiguration {
  tier: string;
  taskType: TaskType;
  model: ModelType;
  parameters?: {
    temperature: number;
    maxTokens: number;
    qualityPreference: 'standard' | 'high' | 'highest';
  };
  isActive: boolean;
}

/**
 * Router for selecting and using different AI models based on subscription tier and task
 */
export class TieredModelRouter {
  private aiProvider: AIProvider;
  private cache: Map<string, CacheEntry> = new Map();
  private modelConfigCache: Map<string, ModelType> = new Map();
  private lastConfigCacheUpdate: Date | null = null;
  private readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // Default fallback model mapping by tier and task (used if database is unavailable)
  private defaultModelSelectionMatrix: Record<string, Partial<Record<TaskType, ModelType>>> = {
    [SubscriptionTier.ANONYMOUS]: {
      // Anonymous users only get access to the support chatbot
      [TaskType.CHATBOT]: ModelType.CLAUDE_35_HAIKU // Use cheapest Claude for chatbot
    },
    [SubscriptionTier.CREATOR]: {
      // Content Generation - Use cost-effective models
      [TaskType.LONG_FORM_CONTENT]: ModelType.GPT_35_TURBO,
      [TaskType.SOCIAL_MEDIA_POST]: ModelType.CLAUDE_35_HAIKU, // Switch to cheaper Claude
      [TaskType.CAPTION_WRITING]: ModelType.CLAUDE_35_HAIKU,   // Switch to cheaper Claude
      [TaskType.HASHTAG_GENERATION]: ModelType.GEMINI_20_FLASH,
      
      // Visual Processing - Use cost-effective Gemini
      [TaskType.IMAGE_ANALYSIS]: ModelType.GEMINI_15_FLASH,
      [TaskType.ALT_TEXT_GENERATION]: ModelType.GEMINI_15_FLASH,
      [TaskType.VISUAL_CONTENT_MODERATION]: ModelType.GEMINI_15_FLASH,
      
      // Content Analysis - Use cost-effective models
      [TaskType.SENTIMENT_ANALYSIS]: ModelType.CLAUDE_35_HAIKU,
      [TaskType.CONTENT_CATEGORIZATION]: ModelType.CLAUDE_35_HAIKU,
      
      // Engagement & Support
      [TaskType.COMMENT_REPLIES]: ModelType.CLAUDE_35_HAIKU,
      [TaskType.CUSTOMER_SUPPORT]: ModelType.GPT_35_TURBO,
      [TaskType.CHATBOT]: ModelType.CLAUDE_35_HAIKU,
      
      // RAG & Automation
      [TaskType.RETRIEVAL]: ModelType.GPT_35_TURBO,
      [TaskType.SEMANTIC_SEARCH]: ModelType.GEMINI_15_FLASH,
      [TaskType.WORKFLOW_AUTOMATION]: ModelType.GPT_35_TURBO,
      
      // Smart Content Creator - Basic Access with cost-effective models
      [TaskType.ANALYTICS]: ModelType.CLAUDE_35_HAIKU, // Basic analytics access
      [TaskType.CONTENT_REPURPOSING]: ModelType.CLAUDE_35_HAIKU // Basic repurposing only
    },
    [SubscriptionTier.INFLUENCER]: {
      // Content Generation - Balanced performance/cost
      [TaskType.LONG_FORM_CONTENT]: ModelType.CLAUDE_35_SONNET,
      [TaskType.SOCIAL_MEDIA_POST]: ModelType.CLAUDE_35_HAIKU, // Use cheaper Claude for volume
      [TaskType.CAPTION_WRITING]: ModelType.CLAUDE_35_HAIKU,
      [TaskType.HASHTAG_GENERATION]: ModelType.GEMINI_20_FLASH,
      
      // Visual Processing - Use cost-effective Gemini Flash
      [TaskType.IMAGE_ANALYSIS]: ModelType.GEMINI_15_FLASH,
      [TaskType.ALT_TEXT_GENERATION]: ModelType.GEMINI_15_FLASH,
      [TaskType.VISUAL_CONTENT_MODERATION]: ModelType.GEMINI_15_FLASH,
      
      // Content Analysis
      [TaskType.SENTIMENT_ANALYSIS]: ModelType.CLAUDE_35_HAIKU,
      [TaskType.CONTENT_CATEGORIZATION]: ModelType.CLAUDE_35_HAIKU,
      [TaskType.ENGAGEMENT_PREDICTION]: ModelType.GPT_35_TURBO,
      
      // Strategic Insights
      [TaskType.CONTENT_STRATEGY]: ModelType.CLAUDE_35_SONNET,
      [TaskType.COMPETITIVE_ANALYSIS]: ModelType.CLAUDE_35_SONNET,
      [TaskType.TREND_ANALYSIS]: ModelType.GEMINI_15_FLASH,
      [TaskType.PERFORMANCE_INSIGHTS]: ModelType.GEMINI_15_FLASH,
      
      // Engagement & Support
      [TaskType.COMMENT_REPLIES]: ModelType.CLAUDE_35_HAIKU,
      [TaskType.CUSTOMER_SUPPORT]: ModelType.CLAUDE_35_SONNET,
      [TaskType.SOCIAL_LISTENING]: ModelType.GEMINI_15_FLASH,
      [TaskType.CHATBOT]: ModelType.CLAUDE_35_SONNET,
      
      // RAG & Automation
      [TaskType.RETRIEVAL]: ModelType.CLAUDE_35_SONNET,
      [TaskType.SEMANTIC_SEARCH]: ModelType.CLAUDE_35_HAIKU,
      [TaskType.WORKFLOW_AUTOMATION]: ModelType.CLAUDE_35_SONNET,
      
      // Smart Content Creator - Full Access  
      [TaskType.ANALYTICS]: ModelType.CLAUDE_35_SONNET,
      [TaskType.CONTENT_PERFORMANCE_PREDICTION]: ModelType.CLAUDE_35_SONNET,
      [TaskType.AB_TEST_GENERATION]: ModelType.CLAUDE_35_SONNET,
      [TaskType.AB_TEST_ANALYSIS]: ModelType.CLAUDE_35_SONNET,
      [TaskType.CONTENT_REPURPOSING]: ModelType.CLAUDE_35_SONNET,
      [TaskType.CONTENT_SERIES_GENERATION]: ModelType.CLAUDE_35_SONNET,
      [TaskType.CROSS_PLATFORM_ADAPTATION]: ModelType.CLAUDE_35_HAIKU
    },
    [SubscriptionTier.ENTERPRISE]: {
      // Content Generation - Premium quality with latest models
      [TaskType.LONG_FORM_CONTENT]: ModelType.CLAUDE_4_SONNET,
      [TaskType.SOCIAL_MEDIA_POST]: ModelType.CLAUDE_35_SONNET,
      [TaskType.CAPTION_WRITING]: ModelType.CLAUDE_35_SONNET,
      [TaskType.HASHTAG_GENERATION]: ModelType.CLAUDE_35_HAIKU, // Even enterprise can use cheaper for hashtags
      
      // Visual Processing - Use efficient Gemini models
      [TaskType.IMAGE_ANALYSIS]: ModelType.GEMINI_15_PRO,
      [TaskType.ALT_TEXT_GENERATION]: ModelType.GEMINI_15_FLASH,
      [TaskType.VISUAL_CONTENT_MODERATION]: ModelType.GEMINI_15_PRO,
      
      // Content Analysis
      [TaskType.SENTIMENT_ANALYSIS]: ModelType.CLAUDE_35_SONNET,
      [TaskType.CONTENT_CATEGORIZATION]: ModelType.CLAUDE_35_SONNET,
      [TaskType.ENGAGEMENT_PREDICTION]: ModelType.CLAUDE_35_SONNET,
      
      // Strategic Insights - Premium models
      [TaskType.CONTENT_STRATEGY]: ModelType.CLAUDE_4_SONNET,
      [TaskType.COMPETITIVE_ANALYSIS]: ModelType.CLAUDE_4_SONNET,
      [TaskType.TREND_ANALYSIS]: ModelType.CLAUDE_4_SONNET,
      [TaskType.PERFORMANCE_INSIGHTS]: ModelType.CLAUDE_4_SONNET,
      
      // Engagement & Support
      [TaskType.COMMENT_REPLIES]: ModelType.CLAUDE_35_SONNET,
      [TaskType.CUSTOMER_SUPPORT]: ModelType.CLAUDE_4_SONNET,
      [TaskType.SOCIAL_LISTENING]: ModelType.CLAUDE_4_SONNET,
      [TaskType.CHATBOT]: ModelType.CLAUDE_4_SONNET,
      
      // Premium Features
      [TaskType.BRAND_VOICE_ANALYSIS]: ModelType.CLAUDE_4_SONNET,
      [TaskType.SMART_REPLIES]: ModelType.CLAUDE_35_SONNET,
      [TaskType.ADVANCED_SOCIAL_LISTENING]: ModelType.CLAUDE_4_SONNET,
      
      // RAG & Automation
      [TaskType.RETRIEVAL]: ModelType.CLAUDE_4_SONNET,
      [TaskType.SEMANTIC_SEARCH]: ModelType.CLAUDE_35_SONNET,
      [TaskType.WORKFLOW_AUTOMATION]: ModelType.CLAUDE_4_SONNET,
      
      // Smart Content Creator - Premium Access
      [TaskType.ANALYTICS]: ModelType.CLAUDE_4_SONNET,
      [TaskType.CONTENT_PERFORMANCE_PREDICTION]: ModelType.CLAUDE_4_SONNET,
      [TaskType.AB_TEST_GENERATION]: ModelType.CLAUDE_35_SONNET,
      [TaskType.AB_TEST_ANALYSIS]: ModelType.CLAUDE_4_SONNET,
      [TaskType.CONTENT_REPURPOSING]: ModelType.CLAUDE_35_SONNET,
      [TaskType.CONTENT_SERIES_GENERATION]: ModelType.CLAUDE_4_SONNET,
      [TaskType.CROSS_PLATFORM_ADAPTATION]: ModelType.CLAUDE_35_SONNET
    }
  };
  
  // Base parameters for different task types
  private baseParameterMap: Record<TaskType, AIParameters> = {
    // Content Generation
    [TaskType.LONG_FORM_CONTENT]: { temperature: 0.7, maxTokens: 1500 },
    [TaskType.SOCIAL_MEDIA_POST]: { temperature: 0.8, maxTokens: 250 },
    [TaskType.CAPTION_WRITING]: { temperature: 0.7, maxTokens: 150 },
    [TaskType.HASHTAG_GENERATION]: { temperature: 0.6, maxTokens: 100 },
    
    // Visual Processing
    [TaskType.IMAGE_ANALYSIS]: { temperature: 0.3, maxTokens: 300 },
    [TaskType.ALT_TEXT_GENERATION]: { temperature: 0.4, maxTokens: 100 },
    [TaskType.VISUAL_CONTENT_MODERATION]: { temperature: 0.2, maxTokens: 200 },
    
    // Content Analysis
    [TaskType.SENTIMENT_ANALYSIS]: { temperature: 0.3, maxTokens: 150 },
    [TaskType.CONTENT_CATEGORIZATION]: { temperature: 0.3, maxTokens: 200 },
    [TaskType.ENGAGEMENT_PREDICTION]: { temperature: 0.4, maxTokens: 300 },
    
    // Strategic Insights
    [TaskType.CONTENT_STRATEGY]: { temperature: 0.6, maxTokens: 1000 },
    [TaskType.COMPETITIVE_ANALYSIS]: { temperature: 0.5, maxTokens: 1200 },
    [TaskType.TREND_ANALYSIS]: { temperature: 0.5, maxTokens: 800 },
    [TaskType.PERFORMANCE_INSIGHTS]: { temperature: 0.4, maxTokens: 600 },
    
    // Engagement & Support
    [TaskType.COMMENT_REPLIES]: { temperature: 0.7, maxTokens: 200 },
    [TaskType.CUSTOMER_SUPPORT]: { temperature: 0.5, maxTokens: 400 },
    [TaskType.SOCIAL_LISTENING]: { temperature: 0.4, maxTokens: 500 },
    [TaskType.CHATBOT]: { temperature: 0.5, maxTokens: 150 }, // Limited for anonymous
    
    // Premium Features
    [TaskType.BRAND_VOICE_ANALYSIS]: { temperature: 0.5, maxTokens: 800 },
    [TaskType.SMART_REPLIES]: { temperature: 0.6, maxTokens: 250 },
    [TaskType.ADVANCED_SOCIAL_LISTENING]: { temperature: 0.5, maxTokens: 700 },
    
    // RAG & Automation
    [TaskType.RETRIEVAL]: { temperature: 0.4, maxTokens: 800 },
    [TaskType.SEMANTIC_SEARCH]: { temperature: 0.3, maxTokens: 300 },
    [TaskType.WORKFLOW_AUTOMATION]: { temperature: 0.5, maxTokens: 600 },
    
    // Smart Content Creator Features
    [TaskType.ANALYTICS]: { temperature: 0.4, maxTokens: 800 },
    [TaskType.CONTENT_PERFORMANCE_PREDICTION]: { temperature: 0.4, maxTokens: 1000 },
    [TaskType.AB_TEST_GENERATION]: { temperature: 0.7, maxTokens: 1200 },
    [TaskType.AB_TEST_ANALYSIS]: { temperature: 0.5, maxTokens: 800 },
    [TaskType.CONTENT_REPURPOSING]: { temperature: 0.6, maxTokens: 1000 },
    [TaskType.CONTENT_SERIES_GENERATION]: { temperature: 0.7, maxTokens: 1500 },
    [TaskType.CROSS_PLATFORM_ADAPTATION]: { temperature: 0.6, maxTokens: 800 }
  };
  
  constructor(aiProvider?: AIProvider) {
    this.aiProvider = aiProvider || new RealAIProvider();
  }
  
  /**
   * Load model configurations from database with caching
   */
  private async loadModelConfigurations(): Promise<void> {
    // Check if cache is still valid
    if (this.lastConfigCacheUpdate && 
        Date.now() - this.lastConfigCacheUpdate.getTime() < this.CONFIG_CACHE_TTL) {
      return;
    }

    try {
      // Query active model configurations from database
      const configQuery = query(
        collection(firestore, 'aiModelConfigurations'),
        where('isActive', '==', true)
      );
      
      const configSnapshot = await getDocs(configQuery);
      
      // Clear existing cache
      this.modelConfigCache.clear();
      
      // Load configurations into cache
      configSnapshot.forEach((doc) => {
        const config = doc.data() as DatabaseModelConfiguration;
        const cacheKey = `${config.tier}_${config.taskType}`;
        this.modelConfigCache.set(cacheKey, config.model);
      });
      
      this.lastConfigCacheUpdate = new Date();
      
      logger.debug('Model configurations loaded from database', {
        configurationsCount: configSnapshot.size,
        cachedConfigurations: this.modelConfigCache.size
      });
      
    } catch (error) {
      logger.error('Failed to load model configurations from database, using defaults', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Don't update cache timestamp on error, so we'll retry next time
    }
  }

  /**
   * Get model for a specific task and tier (checks database first, falls back to defaults)
   * @param taskType Task type
   * @param tier Subscription tier
   * @returns Selected model type
   */
  async getModelForTaskAndTier(taskType: TaskType, tier: string): Promise<ModelType> {
    // Load fresh configurations from database if needed
    await this.loadModelConfigurations();
    
    // Check database configurations first
    const cacheKey = `${tier}_${taskType}`;
    const databaseModel = this.modelConfigCache.get(cacheKey);
    
    if (databaseModel) {
      logger.debug('Using database model configuration', {
        tier,
        taskType,
        model: databaseModel
      });
      return databaseModel;
    }
    
    // Fall back to default configuration
    const model = this.defaultModelSelectionMatrix[tier]?.[taskType];
    
    if (!model) {
      throw new FeatureAccessError(
        `No model configured for ${tier} tier and ${taskType} task`
      );
    }
    
    logger.debug('Using default model configuration', {
      tier,
      taskType,
      model
    });
    
    return model;
  }

  /**
   * Route an AI task based on user's subscription tier
   * @param task AI task to route
   * @param user User information
   * @returns AI response
   */
  async routeTask(task: AITask, user?: User): Promise<AIResponse> {
    // Determine tier from user or default to anonymous
    const tier = user?.subscriptionTier || SubscriptionTier.ANONYMOUS;
    
    // If anonymous and not using chatbot, reject
    if (tier === SubscriptionTier.ANONYMOUS && task.type !== TaskType.CHATBOT) {
      throw new FeatureAccessError(
        'Anonymous users only have access to the support chatbot'
      );
    }
    
    // Check if tier has access to this task type
    if (!await this.hasAccessToTask(tier, task.type)) {
      throw new FeatureAccessError(
        `${tier} tier does not have access to ${task.type}`
      );
    }
    
    // Select model based on tier and task (now loads from database)
    const modelToUse = await this.getModelForTaskAndTier(task.type, tier);
    
    // Get task parameters with tier-specific enhancements
    const parameters = this.getTaskParameters(task.type, tier, task.options);
    
    // Check cache if applicable
    if (this.canCacheTask(task.type)) {
      const cacheKey = this.generateCacheKey(task, tier);
      const cachedResult = this.checkCache(cacheKey);
      if (cachedResult) return cachedResult;
    }
    
    // Execute with selected model and parameters
    const result = await this.executeWithModel(modelToUse, task, parameters);
    
    // Cache result if applicable
    if (this.canCacheTask(task.type)) {
      const cacheKey = this.generateCacheKey(task, tier);
      this.cacheResult(cacheKey, result, this.getCacheTTL(task.type, tier));
    }
    
    // Track usage for analytics
    await this.trackUsage(user?.id, task.type, modelToUse, tier);
    
    return result;
  }
  
  /**
   * Get task parameters with tier-specific enhancements
   * @param task Task type
   * @param tier Subscription tier
   * @param userOptions Optional user parameters
   * @returns Enhanced parameters
   */
  private getTaskParameters(
    task: TaskType,
    tier: string,
    userOptions?: Partial<AIParameters>
  ): AIParameters {
    // Base parameters for the task
    const baseParams = this.baseParameterMap[task];
    
    // Apply tier-specific enhancements
    let tierParams: AIParameters;
    
    switch (tier) {
      case SubscriptionTier.ENTERPRISE:
        tierParams = {
          ...baseParams,
          temperature: Math.min(baseParams.temperature + 0.05, 1.0), // Slightly higher creativity
          maxTokens: Math.floor(baseParams.maxTokens * 1.25), // 25% more detailed
          qualityPreference: 'highest' // Prioritize quality over speed
        };
        break;
      case SubscriptionTier.INFLUENCER:
        tierParams = {
          ...baseParams,
          temperature: baseParams.temperature,
          maxTokens: Math.floor(baseParams.maxTokens * 1.1), // 10% more detailed
          qualityPreference: 'high'
        };
        break;
      case SubscriptionTier.CREATOR:
        tierParams = {
          ...baseParams,
          temperature: baseParams.temperature,
          maxTokens: baseParams.maxTokens,
          qualityPreference: 'standard'
        };
        break;
      case SubscriptionTier.ANONYMOUS:
      default:
        // Anonymous users get very limited parameters, only for chatbot
        tierParams = {
          ...baseParams,
          temperature: 0.3, // More deterministic responses
          maxTokens: 150, // Very limited response length
          qualityPreference: 'standard'
        };
        break;
    }
    
    // Apply any user-provided options
    return {
      ...tierParams,
      ...userOptions
    };
  }
  
  /**
   * Execute a task with a selected model
   * @param model Model to use
   * @param task Task to execute
   * @param parameters Execution parameters
   * @returns AI response
   */
  private async executeWithModel(
    model: ModelType,
    task: AITask,
    parameters: AIParameters
  ): Promise<AIResponse> {
    try {
      let result;
      
      // Choose the appropriate method based on input type
      if (Array.isArray(task.input) && task.input.some(item => typeof item === 'object' && 'role' in item)) {
        // Chat format with messages
        result = await this.aiProvider.generateChat(task.input, { model, ...parameters });
      } else {
        // Plain text prompt or other format
        const prompt = typeof task.input === 'string' 
          ? task.input 
          : JSON.stringify(task.input);
        
        result = await this.aiProvider.generateText(prompt, { model, ...parameters });
      }
      
      // Extract output and token usage
      const output = typeof result === 'string' ? result : result.output || result;
      const tokenUsage = typeof result === 'object' && result.tokenUsage 
        ? result.tokenUsage 
        : undefined;
      
      return {
        output,
        modelUsed: model,
        tokenUsage,
        metadata: {
          taskType: task.type,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error executing AI task:', error);
      throw error;
    }
  }
  
  /**
   * Check if a task type can be cached
   * @param taskType Task type
   * @returns Whether the task can be cached
   */
  private canCacheTask(taskType: TaskType): boolean {
    // Define which tasks can be cached
    const cachableTasks = [
      TaskType.HASHTAG_GENERATION,
      TaskType.ALT_TEXT_GENERATION,
      TaskType.SENTIMENT_ANALYSIS,
      TaskType.CONTENT_CATEGORIZATION
    ];
    return cachableTasks.includes(taskType);
  }
  
  /**
   * Get cache TTL for a task and tier
   * @param taskType Task type
   * @param tier Subscription tier
   * @returns Cache TTL in seconds
   */
  private getCacheTTL(taskType: TaskType, tier: string): number {
    // Define cache TTLs by task and tier (in seconds)
    const ttlMap: Partial<Record<TaskType, Record<string, number>>> = {
      [TaskType.HASHTAG_GENERATION]: {
        [SubscriptionTier.ANONYMOUS]: 86400 * 2, // 48 hours
        [SubscriptionTier.CREATOR]: 86400, // 24 hours
        [SubscriptionTier.INFLUENCER]: 86400, // 24 hours
        [SubscriptionTier.ENTERPRISE]: 43200 // 12 hours (fresher for enterprise)
      },
      [TaskType.ALT_TEXT_GENERATION]: {
        [SubscriptionTier.ANONYMOUS]: 86400 * 3, // 72 hours
        [SubscriptionTier.CREATOR]: 86400 * 2, // 48 hours
        [SubscriptionTier.INFLUENCER]: 86400, // 24 hours
        [SubscriptionTier.ENTERPRISE]: 43200 // 12 hours
      },
      [TaskType.SENTIMENT_ANALYSIS]: {
        [SubscriptionTier.ANONYMOUS]: 86400, // 24 hours
        [SubscriptionTier.CREATOR]: 43200, // 12 hours
        [SubscriptionTier.INFLUENCER]: 21600, // 6 hours
        [SubscriptionTier.ENTERPRISE]: 10800 // 3 hours
      },
      [TaskType.CONTENT_CATEGORIZATION]: {
        [SubscriptionTier.ANONYMOUS]: 86400, // 24 hours
        [SubscriptionTier.CREATOR]: 43200, // 12 hours
        [SubscriptionTier.INFLUENCER]: 21600, // 6 hours
        [SubscriptionTier.ENTERPRISE]: 10800 // 3 hours
      }
    };
    
    return ttlMap[taskType]?.[tier] || 3600; // Default 1 hour
  }
  
  /**
   * Generate a cache key for a task
   * @param task Task to cache
   * @param tier Subscription tier
   * @returns Cache key
   */
  private generateCacheKey(task: AITask, tier: string): string {
    // Create a hash of the input
    const inputHash = this.hashObject(task.input);
    
    // Create a composite key
    return `${task.type}:${inputHash}:${tier}`;
  }
  
  /**
   * Check cache for a task result
   * @param cacheKey Cache key
   * @returns Cached result or undefined
   */
  private checkCache(cacheKey: string): AIResponse | undefined {
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if entry is expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(cacheKey);
      return undefined;
    }
    
    return entry.response;
  }
  
  /**
   * Cache a task result
   * @param cacheKey Cache key
   * @param response AI response
   * @param ttlSeconds TTL in seconds
   */
  private cacheResult(cacheKey: string, response: AIResponse, ttlSeconds: number): void {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);
    
    this.cache.set(cacheKey, {
      response,
      expiresAt
    });
  }
  
  /**
   * Check if tier has access to a task
   * @param tier Subscription tier
   * @param taskType Task type
   * @returns Whether the tier has access
   */
  private async hasAccessToTask(tier: string, taskType: TaskType): Promise<boolean> {
    // Load configurations if needed
    await this.loadModelConfigurations();
    
    // Check database configurations first
    const cacheKey = `${tier}_${taskType}`;
    const databaseModel = this.modelConfigCache.get(cacheKey);
    
    if (databaseModel) {
      return true;
    }
    
    // Fall back to default configuration
    return !!this.defaultModelSelectionMatrix[tier]?.[taskType];
  }
  
  /**
   * Track AI usage for analytics and billing
   * @param userId User ID (optional for anonymous users)
   * @param taskType Task type
   * @param model Model used
   * @param tier User tier
   */
  private async trackUsage(
    userId: string | undefined,
    taskType: TaskType,
    model: ModelType,
    tier: string
  ): Promise<void> {
    try {
      // Calculate token usage and cost
      const tokenUsage = this.getTokenUsageForTask(taskType, model);
      const cost = this.calculateModelCost(model);

      // Call API to track usage
      const response = await fetch('/api/ai/track-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          taskType,
          model,
          tier,
          cost,
          tokenUsage
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      // Log for server monitoring
      logger.info(`[AI Usage] User: ${userId || 'anonymous'}, Tier: ${tier}, Task: ${taskType}, Model: ${model}`);
    } catch (error) {
      // Log error but don't fail the operation
      logger.error('Error tracking AI usage:', error);
    }
  }
  
  /**
   * Calculate model cost (for analytics)
   * @param model Model type
   * @returns Approximate cost in USD per 1K tokens
   */
  private calculateModelCost(model: ModelType): number {
    // Updated costs as of May 2025 (average of input/output costs for simplicity)
    const modelCosts: Record<ModelType, number> = {
      [ModelType.GPT_35_TURBO]: 0.001, // $1 per 1K tokens average ($0.5 input, $1.5 output)
      [ModelType.GPT_4_TURBO]: 0.020, // $20 per 1K tokens average ($10 input, $30 output)
      [ModelType.GPT_4O]: 0.015, // $15 per 1K tokens average ($5 input, $15 output)
      [ModelType.CLAUDE_4_SONNET]: 0.045, // $45 per 1K tokens average ($15 input, $75 output) - Latest premium model
      [ModelType.CLAUDE_35_SONNET]: 0.009, // $9 per 1K tokens average ($3 input, $15 output) - Latest version
      [ModelType.CLAUDE_35_HAIKU]: 0.00075, // $0.75 per 1K tokens average ($0.25 input, $1.25 output) - Latest version
      [ModelType.CLAUDE_35_SONNET_LEGACY]: 0.009, // Same pricing for legacy version
      [ModelType.CLAUDE_3_OPUS]: 0.045, // $45 per 1K tokens average ($15 input, $75 output) - Legacy
      [ModelType.GEMINI_20_FLASH]: 0.0002, // $0.20 per 1K tokens average ($0.075 input, $0.30 output)
      [ModelType.GEMINI_15_FLASH]: 0.0002, // $0.20 per 1K tokens average ($0.075 input, $0.30 output)
      [ModelType.GEMINI_15_PRO]: 0.003 // $3 per 1K tokens average ($1.25 input, $5 output)
    };
    
    return modelCosts[model] || 0.001; // Default cost if model not found
  }
  
  /**
   * Get token usage for a task
   * @param taskType Task type
   * @param model Model type
   * @returns Token count (estimated average token consumption, not user cost)
   */
  private getTokenUsageForTask(taskType: TaskType, model: ModelType): number {
    // These values represent estimated average token consumption for each task type
    // They are used for internal tracking and are NOT direct costs to customers
    // Actual customer token costs are defined by subscription tiers (Creator: 100/mo, Influencer: 500/mo, Enterprise: 5,000+)
    const baseTokens: Record<TaskType, number> = {
      [TaskType.LONG_FORM_CONTENT]: 2000,
      [TaskType.SOCIAL_MEDIA_POST]: 1000,
      [TaskType.CAPTION_WRITING]: 500,
      [TaskType.HASHTAG_GENERATION]: 300,
      [TaskType.IMAGE_ANALYSIS]: 1500,
      [TaskType.ALT_TEXT_GENERATION]: 800,
      [TaskType.VISUAL_CONTENT_MODERATION]: 1000,
      [TaskType.SENTIMENT_ANALYSIS]: 500,
      [TaskType.CONTENT_CATEGORIZATION]: 400,
      [TaskType.ENGAGEMENT_PREDICTION]: 700,
      [TaskType.CONTENT_STRATEGY]: 1500,
      [TaskType.COMPETITIVE_ANALYSIS]: 2000,
      [TaskType.TREND_ANALYSIS]: 1200,
      [TaskType.PERFORMANCE_INSIGHTS]: 1000,
      [TaskType.COMMENT_REPLIES]: 600,
      [TaskType.CUSTOMER_SUPPORT]: 800,
      [TaskType.SOCIAL_LISTENING]: 1000,
      [TaskType.BRAND_VOICE_ANALYSIS]: 1500,
      [TaskType.SMART_REPLIES]: 800,
      [TaskType.ADVANCED_SOCIAL_LISTENING]: 2000,
      [TaskType.RETRIEVAL]: 1000,
      [TaskType.SEMANTIC_SEARCH]: 800,
      [TaskType.WORKFLOW_AUTOMATION]: 1000,
      [TaskType.CHATBOT]: 500,
      
      // Smart Content Creator Features
      [TaskType.ANALYTICS]: 1200,
      [TaskType.CONTENT_PERFORMANCE_PREDICTION]: 1500,
      [TaskType.AB_TEST_GENERATION]: 1800,
      [TaskType.AB_TEST_ANALYSIS]: 1200,
      [TaskType.CONTENT_REPURPOSING]: 1400,
      [TaskType.CONTENT_SERIES_GENERATION]: 2000,
      [TaskType.CROSS_PLATFORM_ADAPTATION]: 1300
    };
    
    return baseTokens[taskType] || 500; // Default token usage
  }
  
  /**
   * Create a simple hash of an object
   * @param obj Object to hash
   * @returns Hash string
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Map AIToolkitFactory tasks to TieredModelRouter tasks
   * This helps ensure compatibility between the two systems
   * @param toolkitTask Task type from AIToolkitFactory
   * @returns Corresponding TaskType in TieredModelRouter
   */
  mapToolkitTaskToRouterTask(toolkitTask: string): TaskType {
    // Mapping between AIToolkitFactory task types and TieredModelRouter task types
    const taskMapping: Record<string, TaskType> = {
      'generate_post': TaskType.SOCIAL_MEDIA_POST,
      'analyze_content': TaskType.CONTENT_CATEGORIZATION,
      'analyze_media': TaskType.IMAGE_ANALYSIS,
      'generate_seo_content': TaskType.LONG_FORM_CONTENT,
      'generate_campaign': TaskType.CONTENT_STRATEGY,
      'generate_multi_platform': TaskType.SOCIAL_MEDIA_POST,
      'repurpose_content': TaskType.CONTENT_REPURPOSING,
      'generate_caption': TaskType.CAPTION_WRITING,
      'generate_hashtags': TaskType.HASHTAG_GENERATION,
      'generate_alt_text': TaskType.ALT_TEXT_GENERATION,
      'suggest_responses': TaskType.COMMENT_REPLIES,
      'categorize_message': TaskType.CONTENT_CATEGORIZATION,
      'prioritize_inbox': TaskType.SOCIAL_LISTENING,
      'summarize_conversation': TaskType.SOCIAL_LISTENING,
      'extract_topics': TaskType.CONTENT_CATEGORIZATION,
      'extract_keywords': TaskType.CONTENT_CATEGORIZATION,
      'check_content_policy': TaskType.VISUAL_CONTENT_MODERATION,
      'extract_colors': TaskType.IMAGE_ANALYSIS,
      
      // Smart Content Creator mappings
      'predict_performance': TaskType.CONTENT_PERFORMANCE_PREDICTION,
      'generate_ab_tests': TaskType.AB_TEST_GENERATION,
      'analyze_ab_tests': TaskType.AB_TEST_ANALYSIS,
      'analytics': TaskType.ANALYTICS,
      'content_series': TaskType.CONTENT_SERIES_GENERATION,
      'cross_platform': TaskType.CROSS_PLATFORM_ADAPTATION
    };
    
    return taskMapping[toolkitTask] || TaskType.SOCIAL_MEDIA_POST; // Default if no mapping exists
  }

  /**
   * Force refresh model configurations from database
   */
  async refreshModelConfigurations(): Promise<void> {
    this.lastConfigCacheUpdate = null;
    await this.loadModelConfigurations();
  }

  /**
   * Get current model configuration cache status
   */
  getConfigurationCacheStatus(): {
    cacheSize: number;
    lastUpdate: Date | null;
    isValid: boolean;
  } {
    const isValid = this.lastConfigCacheUpdate && 
      Date.now() - this.lastConfigCacheUpdate.getTime() < this.CONFIG_CACHE_TTL;
    
    return {
      cacheSize: this.modelConfigCache.size,
      lastUpdate: this.lastConfigCacheUpdate,
      isValid: !!isValid
    };
  }
}

// Export singleton instance
export const tieredModelRouter = new TieredModelRouter(new RealAIProvider());
export default tieredModelRouter; 
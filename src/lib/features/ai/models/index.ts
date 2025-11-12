import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Completion parameters interface
 */
export interface CompletionParams {
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: any;
  stop?: string[];
}

/**
 * Completion response interface
 */
export interface CompletionResponse {
  text: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * AI Task Types
 */
export enum AITaskType {
  ANALYZE_SENTIMENT = 'analyze_sentiment',
  PREDICT_ENGAGEMENT = 'predict_engagement',
  GENERATE_POST = 'generate_post',
  ANALYZE_IMAGE = 'analyze_image',
  GENERATE_HASHTAGS = 'generate_hashtags',
  GENERATE_ALT_TEXT = 'generate_alt_text',
  IMPROVE_CONTENT = 'improve_content',
  SUGGEST_POSTING_TIME = 'suggest_posting_time'
}

/**
 * Model family for providers
 */
export enum ProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  SELFHOSTED = 'selfhosted'
}

/**
 * Model capability
 */
export enum ModelCapability {
  TEXT = 'text',
  CHAT = 'chat',
  EMBEDDING = 'embedding',
  IMAGE = 'image',
  MULTIMODAL = 'multimodal'
}

/**
 * Subscription tier levels
 */
export enum SubscriptionTier {
  CREATOR = 'creator',
  INFLUENCER = 'influencer',
  ENTERPRISE = 'enterprise'
}

/**
 * Language model information
 */
export interface LanguageModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  capabilities: ModelCapability[];
  contextWindow: number;
  costPer1kTokens: number;
  inputCostPer1kTokens?: number;
  outputCostPer1kTokens?: number;
  tier: SubscriptionTier[];
}

/**
 * Task category for model selection
 */
export enum TaskCategory {
  CONTENT_GENERATION = 'content_generation',
  VISUAL_PROCESSING = 'visual_processing',
  CONTENT_ANALYSIS = 'content_analysis',
  STRATEGIC_INSIGHTS = 'strategic_insights',
  ENGAGEMENT = 'engagement'
}

/**
 * Class to manage language model information and selection
 * Based on the tiered model allocation in the Iris Dev Plan
 */
export class LanguageModels {
  private models: Map<string, LanguageModelInfo> = new Map();
  private taskModelMapping: Map<string, Map<SubscriptionTier, string>> = new Map();
  
  constructor() {
    // Initialize with models specified in the development plan
    this.registerModelsFromPlan();
    this.setupTaskModelMapping();
  }
  
  /**
   * Register models according to the development plan
   */
  private registerModelsFromPlan(): void {
    const planModels: LanguageModelInfo[] = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: ProviderType.OPENAI,
        capabilities: [ModelCapability.TEXT, ModelCapability.CHAT],
        contextWindow: 8192,
        costPer1kTokens: 0.03,
        tier: [SubscriptionTier.ENTERPRISE]
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: ProviderType.OPENAI,
        capabilities: [ModelCapability.TEXT, ModelCapability.CHAT],
        contextWindow: 4096,
        costPer1kTokens: 0.0015,
        tier: [SubscriptionTier.CREATOR, SubscriptionTier.INFLUENCER]
      },
      {
        id: 'claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: ProviderType.ANTHROPIC,
        capabilities: [ModelCapability.TEXT, ModelCapability.CHAT, ModelCapability.MULTIMODAL],
        contextWindow: 180000,
        costPer1kTokens: 0.0075,
        tier: [SubscriptionTier.INFLUENCER, SubscriptionTier.ENTERPRISE]
      },
      {
        id: 'claude-3.7-sonnet',
        name: 'Claude 3.7 Sonnet',
        provider: ProviderType.ANTHROPIC,
        capabilities: [ModelCapability.TEXT, ModelCapability.CHAT, ModelCapability.MULTIMODAL],
        contextWindow: 200000,
        costPer1kTokens: 0.015,
        tier: [SubscriptionTier.ENTERPRISE]
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: ProviderType.GOOGLE,
        capabilities: [ModelCapability.TEXT, ModelCapability.CHAT],
        contextWindow: 32000,
        costPer1kTokens: 0.0001,
        tier: [SubscriptionTier.CREATOR]
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: ProviderType.GOOGLE,
        capabilities: [ModelCapability.TEXT, ModelCapability.CHAT, ModelCapability.MULTIMODAL],
        contextWindow: 32000,
        costPer1kTokens: 0.0007,
        tier: [SubscriptionTier.INFLUENCER, SubscriptionTier.ENTERPRISE]
      }
    ];
    
    // Register each model
    for (const model of planModels) {
      this.models.set(model.id, model);
    }
  }
  
  /**
   * Set up task-to-model mapping based on subscription tier
   * Following the model allocation table in the Iris Dev Plan
   */
  private setupTaskModelMapping(): void {
    // Content Generation
    this.setTaskModelMapping('long_form_content', {
      [SubscriptionTier.CREATOR]: 'gpt-3.5-turbo',
      [SubscriptionTier.INFLUENCER]: 'claude-3.5-sonnet',
      [SubscriptionTier.ENTERPRISE]: 'claude-3.7-sonnet'
    });
    
    this.setTaskModelMapping('social_media_posts', {
      [SubscriptionTier.CREATOR]: 'gemini-2.0-flash',
      [SubscriptionTier.INFLUENCER]: 'gpt-3.5-turbo',
      [SubscriptionTier.ENTERPRISE]: 'claude-3.5-sonnet'
    });
    
    this.setTaskModelMapping('caption_writing', {
      [SubscriptionTier.CREATOR]: 'gemini-2.0-flash',
      [SubscriptionTier.INFLUENCER]: 'gpt-3.5-turbo',
      [SubscriptionTier.ENTERPRISE]: 'claude-3.5-sonnet'
    });
    
    this.setTaskModelMapping('hashtag_generation', {
      [SubscriptionTier.CREATOR]: 'gemini-2.0-flash',
      [SubscriptionTier.INFLUENCER]: 'gemini-2.0-flash',
      [SubscriptionTier.ENTERPRISE]: 'claude-3.5-sonnet'
    });
    
    // Visual Processing
    this.setTaskModelMapping('image_analysis', {
      [SubscriptionTier.CREATOR]: 'gemini-2.0-flash',
      [SubscriptionTier.INFLUENCER]: 'gemini-2.5-pro',
      [SubscriptionTier.ENTERPRISE]: 'gemini-2.5-pro'
    });
    
    this.setTaskModelMapping('alt_text_generation', {
      [SubscriptionTier.CREATOR]: 'gemini-2.0-flash',
      [SubscriptionTier.INFLUENCER]: 'gemini-2.5-pro',
      [SubscriptionTier.ENTERPRISE]: 'gemini-2.5-pro'
    });
    
    // Content Analysis
    this.setTaskModelMapping('sentiment_analysis', {
      [SubscriptionTier.CREATOR]: 'gemini-2.0-flash',
      [SubscriptionTier.INFLUENCER]: 'gpt-3.5-turbo',
      [SubscriptionTier.ENTERPRISE]: 'claude-3.5-sonnet'
    });
    
    this.setTaskModelMapping('content_categorization', {
      [SubscriptionTier.CREATOR]: 'gemini-2.0-flash',
      [SubscriptionTier.INFLUENCER]: 'gpt-3.5-turbo',
      [SubscriptionTier.ENTERPRISE]: 'claude-3.5-sonnet'
    });
    
    this.setTaskModelMapping('engagement_prediction', {
      [SubscriptionTier.CREATOR]: '', // Not available
      [SubscriptionTier.INFLUENCER]: 'gpt-3.5-turbo',
      [SubscriptionTier.ENTERPRISE]: 'claude-3.5-sonnet'
    });
    
    // Strategic Insights
    this.setTaskModelMapping('content_strategy', {
      [SubscriptionTier.CREATOR]: '', // Not available
      [SubscriptionTier.INFLUENCER]: 'claude-3.5-sonnet',
      [SubscriptionTier.ENTERPRISE]: 'claude-3.7-sonnet'
    });
    
    // Engagement
    this.setTaskModelMapping('comment_replies', {
      [SubscriptionTier.CREATOR]: 'gemini-2.0-flash',
      [SubscriptionTier.INFLUENCER]: 'gpt-3.5-turbo',
      [SubscriptionTier.ENTERPRISE]: 'claude-3.5-sonnet'
    });
    
    this.setTaskModelMapping('customer_support', {
      [SubscriptionTier.CREATOR]: 'gpt-3.5-turbo',
      [SubscriptionTier.INFLUENCER]: 'claude-3.5-sonnet',
      [SubscriptionTier.ENTERPRISE]: 'claude-3.7-sonnet'
    });
  }
  
  /**
   * Helper to set task model mapping
   */
  private setTaskModelMapping(task: string, tierMapping: Record<SubscriptionTier, string>): void {
    const mapping = new Map<SubscriptionTier, string>();
    for (const [tier, modelId] of Object.entries(tierMapping)) {
      mapping.set(tier as SubscriptionTier, modelId);
    }
    this.taskModelMapping.set(task, mapping);
  }
  
  /**
   * Get a model by ID
   * @param modelId Model ID
   * @returns Model information or undefined if not found
   */
  getModel(modelId: string): LanguageModelInfo | undefined {
    return this.models.get(modelId);
  }
  
  /**
   * Get all models
   * @returns Array of all models
   */
  getAllModels(): LanguageModelInfo[] {
    return Array.from(this.models.values());
  }
  
  /**
   * Get models by provider
   * @param provider Provider type
   * @returns Array of models from the provider
   */
  getModelsByProvider(provider: ProviderType): LanguageModelInfo[] {
    return this.getAllModels().filter(model => model.provider === provider);
  }
  
  /**
   * Get models by subscription tier
   * @param tier Subscription tier
   * @returns Array of models available for the tier
   */
  getModelsByTier(tier: SubscriptionTier): LanguageModelInfo[] {
    return this.getAllModels().filter(model => 
      model.tier.includes(tier)
    );
  }
  
  /**
   * Get models by capability
   * @param capability Model capability
   * @returns Array of models with the capability
   */
  getModelsByCapability(capability: ModelCapability): LanguageModelInfo[] {
    return this.getAllModels().filter(model => 
      model.capabilities.includes(capability)
    );
  }
  
  /**
   * Get the appropriate model for a task based on the user's subscription tier
   * @param task Task type
   * @param tier User's subscription tier
   * @returns Appropriate model ID, or undefined if not available
   */
  getModelForTask(task: string, tier: SubscriptionTier): string | undefined {
    const taskMapping = this.taskModelMapping.get(task);
    if (!taskMapping) return undefined;
    
    const modelId = taskMapping.get(tier);
    if (!modelId) return undefined;
    
    // If the task is not available for this tier (empty string)
    if (modelId === '') return undefined;
    
    return modelId;
  }
  
  /**
   * Register a custom model
   * @param model Model information
   */
  registerModel(model: LanguageModelInfo): void {
    this.models.set(model.id, model);
  }
}

export * from './AITask';
export * from './ContentGeneration'; 
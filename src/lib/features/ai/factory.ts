import { AIProvider, AIProviderConfig } from './providers/AIProvider';
import { ProviderType, SubscriptionTier, LanguageModels } from './models';
import { TokenService } from '../tokens/token-service';
import { TokenTracker } from '../tokens/token-tracker';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GoogleAIProvider } from './providers/GoogleAIProvider';
import { Cache } from '../../core/cache/Cache';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '../../core/firebase';

/**
 * Factory options for provider creation
 */
export interface AIFactoryOptions {
  userId?: string;
  organizationId?: string;
  skipTokenChecks?: boolean;
  tokenTracking?: boolean;
  cacheResults?: boolean;
}

/**
 * Factory for creating AI provider instances based on subscription tier and task
 */
export class AIFactory {
  private modelManager: LanguageModels;
  private tokenService?: TokenService;
  private tokenTracker?: TokenTracker;
  private providers: Map<string, AIProvider> = new Map();
  private cache: Cache;
  private config: Record<ProviderType, Partial<AIProviderConfig>> = {
    [ProviderType.OPENAI]: {
      apiKey: process.env.OPENAI_API_KEY,
      modelId: 'gpt-3.5-turbo'
    },
    [ProviderType.ANTHROPIC]: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      modelId: 'claude-3.5-sonnet'
    },
    [ProviderType.GOOGLE]: {
      apiKey: process.env.GOOGLE_AI_API_KEY,
      modelId: 'gemini-2.0-flash'
    },
    [ProviderType.SELFHOSTED]: {
      endpoint: process.env.SELFHOSTED_AI_ENDPOINT,
      apiKey: process.env.SELFHOSTED_AI_KEY,
      modelId: 'custom-model'
    }
  };

  /**
   * Create a new AI factory
   * @param modelManager Language model manager
   * @param tokenService Optional token service for quota checks
   * @param tokenTracker Optional token usage tracker
   */
  constructor(
    modelManager?: LanguageModels,
    tokenService?: TokenService,
    tokenTracker?: TokenTracker
  ) {
    // Create model manager if not provided
    this.modelManager = modelManager || new LanguageModels();
    this.tokenService = tokenService;
    this.tokenTracker = tokenTracker;
    
    // Initialize cache for provider instances
    this.cache = new Cache('ai-factory', {
      ttl: 60 * 60, // 1 hour
      maxSize: 100
    });
  }

  /**
   * Get the appropriate provider for a user based on task and subscription
   * @param taskName Task name (e.g., 'post_generation', 'sentiment_analysis')
   * @param tier User's subscription tier
   * @param options Factory options
   * @returns AI provider instance
   */
  async getProviderForTask(
    taskName: string,
    tier: SubscriptionTier,
    options: AIFactoryOptions = {}
  ): Promise<AIProvider> {
    // If token checks are needed, validate the user has sufficient tokens
    if (this.tokenService && !options.skipTokenChecks && options.userId) {
      const hasTokens = await this.checkTokenAvailability(options.userId, options.organizationId);
      if (!hasTokens) {
        throw new Error('Insufficient tokens for AI operations');
      }
    }
    
    // Get the appropriate model for this task and tier
    const modelId = this.modelManager.getModelForTask(taskName, tier);
    if (!modelId) {
      throw new Error(`No model available for task "${taskName}" at tier "${tier}"`);
    }
    
    // Look up the model information
    const model = this.modelManager.getModel(modelId);
    if (!model) {
      throw new Error(`Model information not found for "${modelId}"`);
    }
    
    // Check if we already have a provider instance for this model
    const providerKey = this.getCacheKey(modelId, options);
    const cachedProvider = this.providers.get(providerKey);
    if (cachedProvider) {
      return cachedProvider;
    }
    
    // Create a new provider
    const provider = this.createProvider(
      model.provider, 
      {
        ...this.config[model.provider],
        modelId
      }
    );
    
    // Cache the provider
    this.providers.set(providerKey, provider);
    
    return provider;
  }
  
  /**
   * Get a specific provider by type and model ID
   * @param providerType Provider type
   * @param modelId Model ID
   * @param options Factory options
   * @returns AI provider instance
   */
  getProvider(
    providerType: ProviderType,
    modelId: string,
    options: AIFactoryOptions = {}
  ): AIProvider {
    // Check if we already have a provider instance
    const providerKey = this.getCacheKey(`${providerType}-${modelId}`, options);
    const cachedProvider = this.providers.get(providerKey);
    if (cachedProvider) {
      return cachedProvider;
    }
    
    // Create base config
    const config: AIProviderConfig = {
      ...this.config[providerType],
      modelId
    };
    
    // Create the provider
    const provider = this.createProvider(providerType, config);
    
    // Cache the provider
    this.providers.set(providerKey, provider);
    
    return provider;
  }
  
  /**
   * Configure provider settings
   * @param providerType Provider type
   * @param config Configuration settings
   */
  configureProvider(providerType: ProviderType, config: Partial<AIProviderConfig>): void {
    this.config[providerType] = {
      ...this.config[providerType],
      ...config
    };
    
    // Clear any cached providers of this type since config changed
    this.clearProviderCache(providerType);
  }
  
  /**
   * Create a provider instance
   * @param providerType Provider type
   * @param config Provider configuration
   * @returns AI provider instance
   */
  private createProvider(providerType: ProviderType, config: AIProviderConfig): AIProvider {
    switch (providerType) {
      case ProviderType.OPENAI:
        return new OpenAIProvider(config);
        
      case ProviderType.ANTHROPIC:
        return new AnthropicProvider(config);
        
      case ProviderType.GOOGLE:
        return new GoogleAIProvider(config);
        
      case ProviderType.SELFHOSTED:
        // This would be your self-hosted provider implementation
        throw new Error('Self-hosted provider not implemented');
        
      default:
        // Default to OpenAI as fallback
        return new OpenAIProvider({
          ...config,
          modelId: config.modelId || 'gpt-3.5-turbo'
        });
    }
  }
  
  /**
   * Check if a user has sufficient tokens through their organization
   * @param userId User ID
   * @param organizationId Optional organization ID (will use user's current/personal org if not provided)
   * @returns Whether the user has tokens available
   */
  private async checkTokenAvailability(userId: string, organizationId?: string): Promise<boolean> {
    if (!this.tokenService) return true;
    
    try {
      // Get firestore to fetch user information
      const userRef = doc(this.getFirestore(), 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.error(`User ${userId} not found when checking token availability`);
        return false;
      }
      
      const userData = userDoc.data();
      
      // Get organization ID (from parameter, or user's current/personal org)
      const orgId = organizationId || userData.currentOrganizationId || userData.personalOrganizationId;
      
      if (!orgId) {
        console.error(`No organization found for user ${userId}`);
        return false;
      }
      
      // Get organization to check token availability
      const orgRef = doc(this.getFirestore(), 'organizations', orgId);
      const orgDoc = await getDoc(orgRef);
      
      if (!orgDoc.exists()) {
        console.error(`Organization ${orgId} not found for user ${userId}`);
        return false;
      }
      
      const organization = orgDoc.data();
      
      // Check if organization has available tokens
      const usageQuota = organization.usageQuota || {};
      const aiTokens = usageQuota.aiTokens || { limit: 0, used: 0, purchased: 0 };
      
      // Calculate available tokens
      const totalTokens = (aiTokens.limit || 0) + (aiTokens.purchased || 0);
      const usedTokens = aiTokens.used || 0;
      const availableTokens = Math.max(0, totalTokens - usedTokens);
      
      return availableTokens > 0;
    } catch (error) {
      console.error('Error checking token availability:', error);
      return false;
    }
  }
  
  /**
   * Generate a cache key for a provider instance
   * @param baseKey Base key (model ID or other identifier)
   * @param options Options that affect the provider
   * @returns Cache key
   */
  private getCacheKey(baseKey: string, options: AIFactoryOptions): string {
    // Include user ID in the key if token tracking is enabled
    const userPart = options.tokenTracking && options.userId ? `_user-${options.userId}` : '';
    return `provider_${baseKey}${userPart}`;
  }
  
  /**
   * Clear cached providers of a specific type
   * @param providerType Provider type to clear
   */
  private clearProviderCache(providerType: ProviderType): void {
    // Filter and remove providers of the specified type
    const keysToDelete = Array.from(this.providers.keys()).filter(key => 
      key.startsWith(`provider_${providerType}`)
    );
    
    keysToDelete.forEach(key => this.providers.delete(key));
  }
}



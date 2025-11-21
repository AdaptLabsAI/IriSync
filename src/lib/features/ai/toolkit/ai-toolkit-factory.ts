import { TokenService } from '../../tokens/token-service';
import { TokenRepository } from '../../tokens/token-repository';
import { NotificationService } from '../../notifications/NotificationService';
import { logger } from '../../../core/logging/logger';
import { TokenTracker } from '../../tokens/token-tracker';
import { SubscriptionTier } from '../../subscription/models/subscription';
import { AIToolkit } from './AIToolkit';
import { ContentGenerator, MediaAnalyzer, ResponseAssistant } from './interfaces';
import { ContentGeneratorImpl } from './tools/ContentGenerator';
import { MediaAnalyzerImpl } from './tools/MediaAnalyzer';
import { ResponseAssistantImpl } from './tools/ResponseAssistant';
import { AITaskResult, ToolkitRequestOptions } from './interfaces';
import { getFirebaseFirestore } from '../../../core/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { OpenAIProvider } from '../providers/OpenAIProvider';
import { AnthropicProvider } from '../providers/AnthropicProvider';
import { GoogleAIProvider } from '../providers/GoogleAIProvider';
import { AIProvider, AIProviderConfig } from '../providers/AIProvider';
import { firestore } from '@/lib/core/firebase';
import { NextResponse } from 'next/server';

/**
 * @fileoverview AI Toolkit Factory for creating AI tools with token validation
 * 
 * =================== TOKEN CHARGING SYSTEM ===================
 * 
 * The token charging system follows these principles:
 * 
 * 1. SINGLE TOKEN COST:
 *    - Each AI operation costs exactly 1 token
 *    - No operation costs more than 1 token regardless of complexity
 * 
 * 2. NO DOUBLE CHARGING:
 *    - Composite operations (operations that call multiple tools internally)
 *      only charge for the main operation, not for each sub-operation
 *    - Example: If generatePost() internally calls generateHashtags(),
 *      the user is only charged 1 token total, not 2
 * 
 * 3. FREE AUTOMATIC SERVICES:
 *    - Background/automatic services are never charged
 *    - Examples: token validation, cache management, error recovery
 * 
 * 4. TRACKING MECHANISM:
 *    - Operations are tracked by a unique ID to prevent double-charging
 *    - Sub-operations are tagged with their parent operation name
 * 
 * 5. TIER-BASED ACCESS:
 *    - Each subscription tier has access to a specific set of AI tools
 *    - Higher tiers have access to more advanced AI capabilities
 *    - All tiers have the same token cost per operation (1 token)
 * 
 * 6. ERROR HANDLING:
 *    - If an operation fails, the user is not charged
 *    - Token validation happens before execution of the AI operation
 * 
 * ============================================================
 */

/**
 * Automatic services that are always free and don't cost tokens
 */
export enum AutomaticAIService {
  TOKEN_VALIDATION = 'token_validation',
  USAGE_TRACKING = 'usage_tracking',
  ERROR_RECOVERY = 'error_recovery',
  CACHE_MANAGEMENT = 'cache_management',
  SYSTEM_ANALYSIS = 'system_analysis'
}

/**
 * AI task types supported by the platform
 * Every AI tool costs exactly 1 token
 */
export enum AITaskType {
  GENERATE_POST = 'generate_post',
  ANALYZE_CONTENT = 'analyze_content',
  ANALYZE_MEDIA = 'analyze_media',
  GENERATE_SEO_CONTENT = 'generate_seo_content',
  GENERATE_CAMPAIGN = 'generate_campaign',
  GENERATE_MULTI_PLATFORM = 'generate_multi_platform',
  REPURPOSE_CONTENT = 'repurpose_content',
  GENERATE_CAPTION = 'generate_caption',
  GENERATE_HASHTAGS = 'generate_hashtags',
  GENERATE_ALT_TEXT = 'generate_alt_text',
  SUGGEST_RESPONSES = 'suggest_responses',
  CATEGORIZE_MESSAGE = 'categorize_message',
  PRIORITIZE_INBOX = 'prioritize_inbox',
  SUMMARIZE_CONVERSATION = 'summarize_conversation',
  EXTRACT_TOPICS = 'extract_topics',
  EXTRACT_KEYWORDS = 'extract_keywords',
  CHECK_CONTENT_POLICY = 'check_content_policy',
  EXTRACT_COLORS = 'extract_colors'
}

/**
 * Error thrown when token validation fails
 */
export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

/**
 * Factory for creating AIToolkit instances with token validation
 */
export class AIToolkitFactory {
  private tokenRepository: TokenRepository;
  private tokenService: TokenService;
  private tokenTracker: TokenTracker;
  private notificationService: NotificationService;

  // Define token costs for different task types - ALL TOOLS COST 1 TOKEN
  private taskCosts: Record<AITaskType, number> = {
    [AITaskType.GENERATE_POST]: 1,
    [AITaskType.ANALYZE_CONTENT]: 1,
    [AITaskType.ANALYZE_MEDIA]: 1,
    [AITaskType.GENERATE_SEO_CONTENT]: 1,
    [AITaskType.GENERATE_CAMPAIGN]: 1,
    [AITaskType.GENERATE_MULTI_PLATFORM]: 1,
    [AITaskType.REPURPOSE_CONTENT]: 1,
    [AITaskType.GENERATE_CAPTION]: 1,
    [AITaskType.GENERATE_HASHTAGS]: 1,
    [AITaskType.GENERATE_ALT_TEXT]: 1,
    [AITaskType.SUGGEST_RESPONSES]: 1,
    [AITaskType.CATEGORIZE_MESSAGE]: 1,
    [AITaskType.PRIORITIZE_INBOX]: 1,
    [AITaskType.SUMMARIZE_CONVERSATION]: 1,
    [AITaskType.EXTRACT_TOPICS]: 1,
    [AITaskType.EXTRACT_KEYWORDS]: 1,
    [AITaskType.CHECK_CONTENT_POLICY]: 1,
    [AITaskType.EXTRACT_COLORS]: 1
  };

  // Define which features are available for each subscription tier
  // Note: All AI tools cost exactly 1 token per operation
  // Automatic services and sub-operations of composite tasks are free
  private tierFeatureAccess: Record<string, Record<AITaskType, boolean>> = {
    [SubscriptionTier.CREATOR]: {
      // Basic content generation tools
      [AITaskType.GENERATE_POST]: true,
      [AITaskType.ANALYZE_CONTENT]: true,
      [AITaskType.ANALYZE_MEDIA]: true,
      
      // More advanced tools (limited in Creator tier)
      [AITaskType.GENERATE_SEO_CONTENT]: false,
      [AITaskType.GENERATE_CAMPAIGN]: false,
      [AITaskType.GENERATE_MULTI_PLATFORM]: false,
      [AITaskType.REPURPOSE_CONTENT]: false,
      
      // Simple media tools
      [AITaskType.GENERATE_CAPTION]: true,
      [AITaskType.GENERATE_HASHTAGS]: true,
      [AITaskType.GENERATE_ALT_TEXT]: true,
      
      // Response tools
      [AITaskType.SUGGEST_RESPONSES]: true,
      [AITaskType.CATEGORIZE_MESSAGE]: true,
      [AITaskType.PRIORITIZE_INBOX]: false,
      [AITaskType.SUMMARIZE_CONVERSATION]: false,
      
      // Analysis tools
      [AITaskType.EXTRACT_TOPICS]: true,
      [AITaskType.EXTRACT_KEYWORDS]: true,
      [AITaskType.CHECK_CONTENT_POLICY]: true,
      [AITaskType.EXTRACT_COLORS]: true
    },
    
    [SubscriptionTier.INFLUENCER]: {
      // All basic content tools are included
      [AITaskType.GENERATE_POST]: true,
      [AITaskType.ANALYZE_CONTENT]: true,
      [AITaskType.ANALYZE_MEDIA]: true,
      
      // More advanced tools (available in Influencer tier)
      [AITaskType.GENERATE_SEO_CONTENT]: true,
      [AITaskType.GENERATE_CAMPAIGN]: false,
      [AITaskType.GENERATE_MULTI_PLATFORM]: true,
      [AITaskType.REPURPOSE_CONTENT]: true,
      
      // Media tools
      [AITaskType.GENERATE_CAPTION]: true,
      [AITaskType.GENERATE_HASHTAGS]: true,
      [AITaskType.GENERATE_ALT_TEXT]: true,
      
      // Response tools
      [AITaskType.SUGGEST_RESPONSES]: true,
      [AITaskType.CATEGORIZE_MESSAGE]: true,
      [AITaskType.PRIORITIZE_INBOX]: true,
      [AITaskType.SUMMARIZE_CONVERSATION]: true,
      
      // Analysis tools
      [AITaskType.EXTRACT_TOPICS]: true,
      [AITaskType.EXTRACT_KEYWORDS]: true,
      [AITaskType.CHECK_CONTENT_POLICY]: true,
      [AITaskType.EXTRACT_COLORS]: true
    },
    
    [SubscriptionTier.ENTERPRISE]: {
      // All tools available in Enterprise tier
      [AITaskType.GENERATE_POST]: true,
      [AITaskType.ANALYZE_CONTENT]: true,
      [AITaskType.ANALYZE_MEDIA]: true,
      [AITaskType.GENERATE_SEO_CONTENT]: true,
      [AITaskType.GENERATE_CAMPAIGN]: true,
      [AITaskType.GENERATE_MULTI_PLATFORM]: true,
      [AITaskType.REPURPOSE_CONTENT]: true,
      [AITaskType.GENERATE_CAPTION]: true,
      [AITaskType.GENERATE_HASHTAGS]: true,
      [AITaskType.GENERATE_ALT_TEXT]: true,
      [AITaskType.SUGGEST_RESPONSES]: true,
      [AITaskType.CATEGORIZE_MESSAGE]: true,
      [AITaskType.PRIORITIZE_INBOX]: true,
      [AITaskType.SUMMARIZE_CONVERSATION]: true,
      [AITaskType.EXTRACT_TOPICS]: true,
      [AITaskType.EXTRACT_KEYWORDS]: true,
      [AITaskType.CHECK_CONTENT_POLICY]: true,
      [AITaskType.EXTRACT_COLORS]: true
    }
  };

  constructor() {
    try {
      // Use type assertion to bypass TypeScript error with Firestore type
      this.tokenRepository = new TokenRepository(firestore as any);
      this.notificationService = new NotificationService();
      this.tokenService = new TokenService(this.tokenRepository, this.notificationService);
      this.tokenTracker = new TokenTracker();
      logger.info('AIToolkitFactory initialized');
    } catch (error) {
      logger.error('Error initializing AIToolkitFactory', { error });
      throw new Error('Failed to initialize AIToolkitFactory');
    }
  }

  /**
   * Create an AI toolkit instance for a specific user
   * @param userId User ID
   * @param organizationId Optional organization ID
   * @returns Configured AIToolkit instance
   */
  async createToolkit(userId: string, organizationId?: string): Promise<any> {
    try {
      // Get user's subscription tier
      const subscriptionTier = await this.getUserSubscriptionTier(userId);
      
      // Create the actual toolkit with proper providers
      logger.info('Creating AIToolkit for user', { userId, tier: subscriptionTier });
      
      // Create the actual toolkit with wrapped methods that check token usage
      const toolkit = this.createBaseToolkit();
      
      // Wrap all tools with token validation
      return this.wrapAllToolsWithTokenValidation(toolkit, userId, subscriptionTier, organizationId);
    } catch (error) {
      logger.error('Error creating toolkit', { error, userId });
      throw new Error('Failed to create AIToolkit');
    }
  }
  
  /**
   * Create a base toolkit with all AI tools
   */
  private createBaseToolkit(): AIToolkit {
    try {
      // Create an AI provider using the tiered model router
      const provider = createAIProvider({
        provider: process.env.DEFAULT_AI_PROVIDER as any || 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.DEFAULT_AI_MODEL || 'gpt-4o'
      });
      
      // Create a new AIToolkit instance with tool implementations
      return new AIToolkit(provider, this.tokenService, {
        tokenTracker: this.tokenTracker,
        cacheResults: true,
        cacheTtl: 3600, // Cache results for 1 hour
      });
    } catch (error) {
      logger.error('Error creating base toolkit', { error });
      throw new Error('Failed to create AIToolkit');
    }
  }
  
  /**
   * Wrap all tools with token validation and tracking
   * Ensures users aren't charged for automatic services or double-charged
   */
  private wrapAllToolsWithTokenValidation(toolkit: any, userId: string, tier: string, organizationId?: string): any {
    const metadata = { userId, organizationId, tier };
    
    // Track which operations have already been charged 
    const operationTracker = new Set<string>();
    
    // Define which methods are automatic/free and shouldn't be charged
    const automaticMethods = new Set([
      // These methods are automatic and shouldn't be charged
      'validateContent',
      'cacheResult',
      'trackUsage',
      'logActivity',
      'formatResponse',
      'sanitizeInput'
    ]);
    
    // Define which methods are part of composite operations
    const compositeOperations: Record<string, string> = {
      // Method name -> parent operation that should be charged instead
      'generateHashtagsForPost': 'generatePost', // If generateHashtags is called as part of generatePost, don't charge separately
      'analyzePostSentiment': 'analyzeContent',
      'detectTopicsForAnalysis': 'analyzeContent',
      'extractColors': 'analyzeMedia' // If called as part of media analysis, don't charge separately
    };
    
    // Wrap all tools with token validation
    Object.keys(toolkit).forEach(category => {
      Object.keys(toolkit[category]).forEach(method => {
        const originalMethod = toolkit[category][method];
        toolkit[category][method] = async (...args: any[]) => {
          try {
            // Check if method is automatic/free
            const isAutomaticMethod = automaticMethods.has(method);
            
            // Get the operation ID for tracking double charges
            // If it's a composite operation being called from a parent, use the parent's ID
            const operationId = args[args.length - 1]?.metadata?.operationId || 
                               `${userId}_${category}_${method}_${Date.now()}`;
            
            // Check if method is part of a composite operation
            const parentOperation = compositeOperations[method];
            const isCompositeSubOperation = parentOperation && 
                                            args[args.length - 1]?.metadata?.parentOperation === parentOperation;
            
            // Determine the task type based on method name
            const taskType = this.getTaskTypeForMethod(method);
            
            // Only validate and charge tokens if:
            // 1. Not an automatic method
            // 2. Not already charged as part of this operation
            // 3. Not a sub-operation of a composite operation
            if (!isAutomaticMethod && 
                !isCompositeSubOperation && 
                !operationTracker.has(operationId)) {
              
              // Validate token usage
              await this.validateTokensForTask(userId, taskType, tier);
              
              // Mark this operation as charged
              operationTracker.add(operationId);
              
              // After 1000 operations, clear old entries to prevent memory leaks
              if (operationTracker.size > 1000) {
                operationTracker.clear();
              }
            }
            
            // Add metadata to the last argument if it's an options object
            if (args.length > 0 && typeof args[args.length - 1] === 'object') {
              args[args.length - 1] = {
                ...args[args.length - 1],
                metadata: { 
                  ...(args[args.length - 1].metadata || {}), 
                  ...metadata,
                  operationId,
                  // Tag any sub-operations with their parent operation name
                  ...(method in compositeOperations ? { parentOperation: compositeOperations[method] } : {})
                }
              };
            } else {
              args.push({ 
                metadata: { 
                  ...metadata, 
                  operationId,
                  // Tag any sub-operations with their parent operation name
                  ...(method in compositeOperations ? { parentOperation: compositeOperations[method] } : {})
                } 
              });
            }
            
            // Call the original method
            const result = await originalMethod(...args);
            
            // Record token usage if successful and if this operation should be charged
            if (result.success && 
                !isAutomaticMethod && 
                !isCompositeSubOperation) {
              await this.tokenService.useTokens(userId, taskType, 1, { organizationId });
              
              // Add token usage information to the result if not present
              if (!result.tokenUsage) {
                result.tokenUsage = { 
                  prompt: 0, 
                  completion: 0, 
                  total: 1,
                  cost: 1
                };
              }
            }
            
            return result;
          } catch (error) {
            logger.error(`Error in ${category}.${method}`, {
              error: error instanceof Error ? error.message : String(error),
              userId
            });
            
            // Return a structured error response
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: null,
              tokenUsage: { prompt: 0, completion: 0, total: 0, cost: 0 }
            };
          }
        };
      });
    });
    
    return toolkit;
  }
  
  /**
   * Get the task type for a method name
   */
  private getTaskTypeForMethod(method: string): AITaskType {
    const methodToTaskType: Record<string, AITaskType> = {
      generatePost: AITaskType.GENERATE_POST,
      generateCaption: AITaskType.GENERATE_CAPTION,
      generateHashtags: AITaskType.GENERATE_HASHTAGS,
      generateAltText: AITaskType.GENERATE_ALT_TEXT,
      generateSeoContent: AITaskType.GENERATE_SEO_CONTENT,
      generateCampaignContent: AITaskType.GENERATE_CAMPAIGN,
      generateMultiPlatformContent: AITaskType.GENERATE_MULTI_PLATFORM,
      repurposeContent: AITaskType.REPURPOSE_CONTENT,
      analyzeImage: AITaskType.ANALYZE_MEDIA,
      checkContentPolicy: AITaskType.CHECK_CONTENT_POLICY,
      extractColors: AITaskType.EXTRACT_COLORS,
      suggestResponses: AITaskType.SUGGEST_RESPONSES,
      categorizeMessage: AITaskType.CATEGORIZE_MESSAGE,
      prioritizeInbox: AITaskType.PRIORITIZE_INBOX,
      summarizeConversation: AITaskType.SUMMARIZE_CONVERSATION,
      extractTopics: AITaskType.EXTRACT_TOPICS,
      extractKeywords: AITaskType.EXTRACT_KEYWORDS
    };
    
    return methodToTaskType[method] || AITaskType.GENERATE_POST;
  }

  /**
   * Get the user's subscription tier
   * @param userId User ID
   * @returns Subscription tier
   */
  private async getUserSubscriptionTier(userId: string): Promise<string> {
    try {
      // Get user document reference
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }
      const userRef = doc(firestore as any, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        logger.warn('User not found, defaulting to CREATOR tier', { userId });
        return SubscriptionTier.CREATOR;
      }
      
      const userData = userDoc.data();
      
      // Get organization ID using the organization-centric approach
      const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
      
      // If we have an organization ID, check the organization's subscription
      if (orgId) {
        const orgRef = doc(firestore as any, 'organizations', orgId);
        const orgDoc = await getDoc(orgRef);
        
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          if (orgData.billing?.subscriptionTier) {
            logger.debug('Using organization subscription tier', { 
              userId, 
              organizationId: orgId,
              tier: orgData.billing.subscriptionTier 
            });
            return orgData.billing.subscriptionTier;
          }
          }
        }
        
      // Fallback to deprecated user-level subscription tier
      if (userData.subscriptionTier) {
        logger.warn('Using deprecated user.subscriptionTier field', { userId });
        return userData.subscriptionTier;
      }
      
      // Default to CREATOR tier if no subscription information found
      logger.debug('No subscription found, defaulting to CREATOR tier', { userId });
      return SubscriptionTier.CREATOR;
    } catch (error) {
      logger.error('Error retrieving subscription tier', { error, userId });
      return SubscriptionTier.CREATOR; // Default to basic tier on error
    }
  }
  
  /**
   * Get a singleton instance of the factory
   */
  static getInstance(): AIToolkitFactory {
    if (!AIToolkitFactory.instance) {
      AIToolkitFactory.instance = new AIToolkitFactory();
    }
    return AIToolkitFactory.instance;
  }
  
  private static instance: AIToolkitFactory;

  /**
   * Validate that the user has enough tokens for the task
   * @param userId User ID
   * @param taskType Task type
   * @param tier Subscription tier
   * @throws TokenValidationError if the user doesn't have access or enough tokens
   */
  private async validateTokensForTask(userId: string, taskType: AITaskType, tier: string): Promise<void> {
    // First check if the tier has access to this feature
    const hasAccess = this.tierFeatureAccess[tier]?.[taskType] ?? false;
    
    if (!hasAccess) {
      throw new TokenValidationError(
        `Your subscription tier (${tier}) does not have access to this feature.`
      );
    }
    
    // Check if the user has enough tokens for this task type
    const tokenCost = this.taskCosts[taskType] || 1;
    const hasEnoughTokens = await this.tokenService.hasSufficientTokens(userId, tokenCost);
    
    if (!hasEnoughTokens) {
      throw new TokenValidationError(
        `You don't have enough tokens for this operation. Required: ${tokenCost} tokens.`
      );
    }
  }
}

// Export singleton instance
export const aiToolkitFactory = AIToolkitFactory.getInstance();

/**
 * Create an AI provider based on configuration
 * @param config Provider configuration
 * @returns Configured AI provider
 */
function createAIProvider(config: {
  provider: 'openai' | 'azure' | 'anthropic' | 'google' | 'mock';
  apiKey?: string;
  model?: string;
  endpoint?: string;
}): AIProvider {
  const { provider = 'openai', apiKey, model, endpoint } = config;
  
  // Use environment variables as fallbacks for API keys and models
  const openaiApiKey = apiKey || process.env.OPENAI_API_KEY || '';
  const anthropicApiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
  const googleApiKey = apiKey || process.env.GOOGLE_AI_API_KEY || '';
  const azureApiKey = apiKey || process.env.AZURE_OPENAI_API_KEY || '';
  
  // Use tier-specific model configurations from environment variables
  const openaiModel = model || process.env.OPENAI_MODEL || 'gpt-4o';
  const anthropicModel = model || process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';
  const googleModel = model || process.env.GOOGLE_AI_MODEL || 'gemini-1.5-pro';
  const azureModel = model || process.env.AZURE_OPENAI_MODEL || 'gpt-4';
  
  // Azure endpoint configuration
  const azureEndpoint = endpoint || process.env.AZURE_OPENAI_ENDPOINT || '';

  // Log provider initialization (without sensitive data)
  logger.info('Initializing AI provider', { 
    provider,
    model: model || 'default',
    hasApiKey: !!apiKey,
    hasEndpoint: !!endpoint
  });
  
  // Create and return the appropriate provider
  switch (provider) {
    case 'openai':
      if (!openaiApiKey) {
        logger.error('Missing OpenAI API key');
        throw new Error('OpenAI API key is required');
      }
      
      return new OpenAIProvider({
        apiKey: openaiApiKey,
        modelId: openaiModel
      });
    
    case 'anthropic':
      if (!anthropicApiKey) {
        logger.error('Missing Anthropic API key');
        throw new Error('Anthropic API key is required');
      }
      
      return new AnthropicProvider({
        apiKey: anthropicApiKey,
        modelId: anthropicModel
      });
    
    case 'google':
      if (!googleApiKey) {
        logger.error('Missing Google AI API key');
        throw new Error('Google AI API key is required');
      }
      
      return new GoogleAIProvider({
        apiKey: googleApiKey,
        modelId: googleModel
      });
    
    case 'azure':
      if (!azureApiKey) {
        logger.error('Missing Azure OpenAI API key');
        throw new Error('Azure OpenAI API key is required');
      }
      
      if (!azureEndpoint) {
        logger.error('Missing Azure OpenAI endpoint');
        throw new Error('Azure OpenAI endpoint is required');
      }
      
      // Azure OpenAI implementation
      return {
        generateText: async (prompt: string, options?: any): Promise<string> => {
          try {
            logger.debug('Azure OpenAI text generation request', {
              modelName: azureModel,
              endpoint: 'masked',
              promptLength: prompt.length
            });
            
            return new OpenAIProvider({
              apiKey: azureApiKey,
              modelId: azureModel,
              endpoint: azureEndpoint
            }).generateText(prompt, options);
          } catch (error) {
            logger.error('Azure OpenAI text generation failed', {
              error: error instanceof Error ? error.message : String(error),
              modelName: azureModel
            });
            throw error;
          }
        },
        
        generateChat: async (messages: any[], options?: any): Promise<string> => {
          try {
            logger.debug('Azure OpenAI chat generation request', {
              modelName: azureModel,
              endpoint: 'masked',
              messageCount: messages.length
            });
            
            return new OpenAIProvider({
              apiKey: azureApiKey,
              modelId: azureModel,
              endpoint: azureEndpoint
            }).generateChat(messages, options);
          } catch (error) {
            logger.error('Azure OpenAI chat generation failed', {
              error: error instanceof Error ? error.message : String(error),
              modelName: azureModel
            });
            throw error;
          }
        },
        
        embedText: async (text: string): Promise<number[]> => {
          try {
            logger.debug('Azure OpenAI embeddings request', {
              endpoint: 'masked',
              textLength: text.length
            });
            
            return new OpenAIProvider({
              apiKey: azureApiKey,
              modelId: 'text-embedding-ada-002', // Azure embedding model
              endpoint: azureEndpoint
            }).embedText(text);
          } catch (error) {
            logger.error('Azure OpenAI embeddings failed', {
              error: error instanceof Error ? error.message : String(error)
            });
            throw error;
          }
        },
        
        analyzeImage: async (imageUrl: string, prompt: string): Promise<string> => {
          try {
            logger.debug('Azure OpenAI image analysis request', {
              endpoint: 'masked',
              imageUrl: 'masked',
              promptLength: prompt.length
            });
            
            return new OpenAIProvider({
              apiKey: azureApiKey,
              modelId: 'gpt-4-vision', // Azure vision model
              endpoint: azureEndpoint
            }).analyzeImage(imageUrl, prompt);
          } catch (error) {
            logger.error('Azure OpenAI image analysis failed', {
              error: error instanceof Error ? error.message : String(error)
            });
            throw error;
          }
        },
        
        getModelId: () => `azure-${azureModel}`
      };
    
    case 'mock':
    default:
      // Mock implementation for testing environments only
      logger.warn('Using mock AI provider - NOT FOR PRODUCTION');
      
      // Mock implementation that matches the AIProvider interface
      return {
        generateText: async (prompt: string, options?: any) => {
          logger.debug('Mock AI: generateText called', {
            promptLength: prompt.length,
            options: JSON.stringify(options)
          });
          return `[MOCK RESPONSE] Response to: "${prompt.substring(0, 50)}..."`;
        },
        
        generateChat: async (messages: any[], options?: any) => {
          logger.debug('Mock AI: generateChat called', {
            messageCount: messages.length,
            options: JSON.stringify(options)
          });
          return `[MOCK CHAT] Response to conversation with ${messages.length} messages`;
        },
        
        embedText: async (text: string) => {
          logger.debug('Mock AI: embedText called', {
            textLength: text.length
          });
          // Generate deterministic embeddings based on text content
          return Array(1536).fill(0).map((_, i) => 
            (text.charCodeAt(i % text.length) / 255) * 2 - 1
          );
        },
        
        analyzeImage: async (imageUrl: string, prompt: string) => {
          logger.debug('Mock AI: analyzeImage called', {
            imageUrl: 'masked',
            promptLength: prompt.length
          });
          return `[MOCK IMAGE ANALYSIS] Analysis of ${imageUrl} based on prompt: "${prompt.substring(0, 50)}..."`;
        },
        
        getModelId: () => 'mock-model'
      };
  }
}


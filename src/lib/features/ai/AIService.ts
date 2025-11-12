/**
 * Centralized AI Service for IriSync
 * Handles all AI operations with proper token management and service type distinction
 */

import { TokenService } from '../tokens/token-service';
import { TokenRepository } from '../tokens/token-repository';
import { NotificationService } from '../notifications/NotificationService';
import { TieredModelRouter, TaskType, AIResponse as ModelRouterResponse } from './models/tiered-model-router';
import { AITaskType, AITaskParams } from './models/AITask';
import { logger } from '../logging/logger';
import { User } from '../models/User';
import { firestore } from '../firebase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { doc, getDoc } from 'firebase/firestore';
import { processAIGeneratedContent, BrandedContent } from './utils/content-branding';

// AI Service Types for billing distinction
export enum AIServiceType {
  CUSTOMER_SERVICE = 'customer_service',  // NO CHARGE - Automated customer service
  CHATBOT = 'chatbot',                   // CHARGED - Voluntary user interaction
  CONTENT_GENERATION = 'content_generation', // CHARGED - Content creation
  ANALYTICS = 'analytics',               // CHARGED - Data analysis
  OPTIMIZATION = 'optimization'          // CHARGED - Performance optimization
}

// AI Request interface
export interface AIRequest {
  userId: string;
  organizationId?: string;
  taskType: AITaskType;
  serviceType: AIServiceType;
  input: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    provider?: 'openai' | 'anthropic' | 'google';
  };
  metadata?: Record<string, any>;
}

// AI Response interface
export interface AIResponse {
  success: boolean;
  output?: string;
  error?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  provider?: string;
  model?: string;
  latency?: number;
  serviceType: AIServiceType;
  charged: boolean;
  branding?: {
    brandingAdded: boolean;
    hashtags?: string[];
  };
}

/**
 * Main AI Service orchestrator
 */
export class AIService {
  private tokenService: TokenService;
  private modelRouter: TieredModelRouter;
  private static instance: AIService;

  private constructor() {
    // Initialize dependencies with proper error handling
    try {
      const tokenRepository = new TokenRepository(firestore as any);
      const notificationService = new NotificationService();
      this.tokenService = new TokenService(tokenRepository, notificationService);
      this.modelRouter = new TieredModelRouter();
      
      logger.info('AIService initialized');
    } catch (error) {
      logger.error('Failed to initialize AIService', { error });
      throw error;
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Process AI request with proper token management and service type handling
   */
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing AI request', {
        userId: request.userId,
        taskType: request.taskType,
        serviceType: request.serviceType
      });

      // Determine if this request should be charged
      const shouldCharge = this.shouldChargeForService(request.serviceType);
      
      // Check token availability if charging is required
      if (shouldCharge) {
        const hasTokens = await this.tokenService.hasSufficientTokens(
          request.userId, 
          1, // Each AI task counts as 1 token regardless of actual usage
          request.organizationId
        );

        if (!hasTokens) {
          return {
            success: false,
            error: 'Insufficient tokens available',
            serviceType: request.serviceType,
            charged: false
          };
        }
      }

      // Create user object for model router
      const user: User = {
        id: request.userId,
        organizationId: request.organizationId
      } as User;

      // Route task to appropriate AI model
      const taskResult: ModelRouterResponse = await this.modelRouter.routeTask({
        type: this.mapAITaskTypeToTaskType(request.taskType),
        input: request.input,
        options: request.options || {}
      }, user);

      // Check if the task was successful (based on output presence)
      const success = !!taskResult.output && !taskResult.output.includes('AI analysis unavailable');

      // Consume tokens if charging is required and task was successful
      if (shouldCharge && success) {
        await this.tokenService.useTokens(
          request.userId,
          request.taskType,
          1, // Standard 1 token per AI task
          {
            serviceType: request.serviceType,
            taskType: request.taskType,
            provider: this.extractProviderFromModel(taskResult.modelUsed.toString()),
            model: taskResult.modelUsed.toString(),
            ...request.metadata
          }
        );
      }

      const latency = Date.now() - startTime;

      // Log usage for analytics
      await this.logAIUsage({
        userId: request.userId,
        organizationId: request.organizationId,
        taskType: request.taskType,
        serviceType: request.serviceType,
        success,
        latency,
        charged: shouldCharge,
        provider: this.extractProviderFromModel(taskResult.modelUsed.toString()),
        model: taskResult.modelUsed.toString()
      });

      // Convert token usage format
      const tokenUsage = taskResult.tokenUsage ? {
        prompt: taskResult.tokenUsage.input || 0,
        completion: taskResult.tokenUsage.output || 0,
        total: (taskResult.tokenUsage.input || 0) + (taskResult.tokenUsage.output || 0)
      } : undefined;

      // Process content for branding if it's content generation
      let brandingInfo: { brandingAdded: boolean; hashtags?: string[] } | undefined;
      let finalOutput = taskResult.output;
      
      if (this.isContentGenerationTask(request.taskType)) {
        const brandedContent = this.applyBranding(
          taskResult.output,
          request.metadata?.platform,
          request.taskType
        );
        
        finalOutput = brandedContent.content;
        brandingInfo = {
          brandingAdded: brandedContent.brandingAdded,
          hashtags: brandedContent.hashtags
        };
        
        // If hashtags were generated or modified, include them in the output
        if (brandedContent.hashtags.length > 0) {
          // For hashtag-specific tasks, return the hashtags as the main output
          if (request.taskType === AITaskType.GENERATE_HASHTAGS) {
            finalOutput = brandedContent.hashtags.map(tag => `#${tag}`).join(' ');
          } else {
            // For other content, append hashtags at the end
            const hashtagString = brandedContent.hashtags.map(tag => `#${tag}`).join(' ');
            finalOutput = `${brandedContent.content}\n\n${hashtagString}`;
          }
        }
      }

      return {
        success,
        output: finalOutput,
        error: success ? undefined : 'AI task failed',
        tokenUsage,
        provider: this.extractProviderFromModel(taskResult.modelUsed.toString()),
        model: taskResult.modelUsed.toString(),
        latency,
        serviceType: request.serviceType,
        charged: shouldCharge,
        branding: brandingInfo
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      
      logger.error('AI request processing failed', {
        userId: request.userId,
        taskType: request.taskType,
        serviceType: request.serviceType,
        error: error instanceof Error ? error.message : String(error),
        latency
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        serviceType: request.serviceType,
        charged: false,
        latency
      };
    }
  }

  /**
   * Extract provider name from model string
   */
  private extractProviderFromModel(model: string): string {
    if (model.includes('gpt')) return 'openai';
    if (model.includes('claude')) return 'anthropic';
    if (model.includes('gemini')) return 'google';
    return 'unknown';
  }

  /**
   * Generate content with AI
   */
  async generateContent(params: {
    userId: string;
    organizationId?: string;
    topic: string;
    platform?: string;
    contentType?: string;
    tone?: string;
    audience?: string;
    keywords?: string[];
  }): Promise<AIResponse> {
    const prompt = this.buildContentGenerationPrompt(params);
    
    return this.processRequest({
      userId: params.userId,
      organizationId: params.organizationId,
      taskType: AITaskType.GENERATE_POST,
      serviceType: AIServiceType.CONTENT_GENERATION,
      input: prompt,
      options: {
        temperature: 0.7,
        maxTokens: 1000
      },
      metadata: {
        topic: params.topic,
        platform: params.platform,
        contentType: params.contentType
      }
    });
  }

  /**
   * Analyze sentiment with AI
   */
  async analyzeSentiment(params: {
    userId: string;
    organizationId?: string;
    content: string;
    context?: string;
  }): Promise<AIResponse> {
    const prompt = `Analyze the sentiment of this content: "${params.content}"${params.context ? ` Context: ${params.context}` : ''}. Return a JSON object with sentiment score (-1 to 1), label (positive/negative/neutral), and confidence (0-1).`;
    
    return this.processRequest({
      userId: params.userId,
      organizationId: params.organizationId,
      taskType: AITaskType.ANALYZE_SENTIMENT,
      serviceType: AIServiceType.ANALYTICS,
      input: prompt,
      options: {
        temperature: 0.3,
        maxTokens: 200
      },
      metadata: {
        contentLength: params.content.length,
        hasContext: !!params.context
      }
    });
  }

  /**
   * Generate hashtags with AI
   */
  async generateHashtags(params: {
    userId: string;
    organizationId?: string;
    content: string;
    platform?: string;
    count?: number;
  }): Promise<AIResponse> {
    const count = params.count || 5;
    const prompt = `Generate ${count} relevant hashtags for this content: "${params.content}"${params.platform ? ` for ${params.platform}` : ''}. Return only the hashtags, one per line, with # prefix.`;
    
    return this.processRequest({
      userId: params.userId,
      organizationId: params.organizationId,
      taskType: AITaskType.GENERATE_HASHTAGS,
      serviceType: AIServiceType.CONTENT_GENERATION,
      input: prompt,
      options: {
        temperature: 0.6,
        maxTokens: 200
      },
      metadata: {
        platform: params.platform,
        requestedCount: count
      }
    });
  }

  /**
   * Process customer service request (NO CHARGE)
   */
  async processCustomerServiceRequest(params: {
    userId: string;
    organizationId?: string;
    query: string;
    context?: string;
    ticketId?: string;
  }): Promise<AIResponse> {
    const prompt = `As a helpful customer service assistant, respond to this query: "${params.query}"${params.context ? ` Context: ${params.context}` : ''}. Provide a helpful, professional response.`;
    
    return this.processRequest({
      userId: params.userId,
      organizationId: params.organizationId,
      taskType: AITaskType.CUSTOMER_SUPPORT,
      serviceType: AIServiceType.CUSTOMER_SERVICE, // NO CHARGE
      input: prompt,
      options: {
        temperature: 0.4,
        maxTokens: 500
      },
      metadata: {
        ticketId: params.ticketId,
        automated: true
      }
    });
  }

  /**
   * Process chatbot request (CHARGED)
   */
  async processChatbotRequest(params: {
    userId: string;
    organizationId?: string;
    message: string;
    conversationHistory?: string[];
    context?: string;
  }): Promise<AIResponse> {
    const history = params.conversationHistory?.slice(-5).join('\n') || '';
    const prompt = `${history ? `Previous conversation:\n${history}\n\n` : ''}User message: "${params.message}"${params.context ? `\nContext: ${params.context}` : ''}\n\nRespond as a helpful AI assistant.`;
    
    return this.processRequest({
      userId: params.userId,
      organizationId: params.organizationId,
      taskType: AITaskType.CHATBOT,
      serviceType: AIServiceType.CHATBOT, // CHARGED
      input: prompt,
      options: {
        temperature: 0.7,
        maxTokens: 300
      },
      metadata: {
        conversationLength: params.conversationHistory?.length || 0,
        interactive: true
      }
    });
  }

  /**
   * Determine if service type should be charged
   */
  private shouldChargeForService(serviceType: AIServiceType): boolean {
    switch (serviceType) {
      case AIServiceType.CUSTOMER_SERVICE:
        return false; // Customer service is free
      case AIServiceType.CHATBOT:
      case AIServiceType.CONTENT_GENERATION:
      case AIServiceType.ANALYTICS:
      case AIServiceType.OPTIMIZATION:
        return true; // These services are charged
      default:
        return true; // Default to charging for unknown services
    }
  }

  /**
   * Map AITaskType to TieredModelRouter TaskType
   */
  private mapAITaskTypeToTaskType(aiTaskType: AITaskType): TaskType {
    const mapping: Record<AITaskType, TaskType> = {
      [AITaskType.GENERATE_POST]: TaskType.SOCIAL_MEDIA_POST,
      [AITaskType.GENERATE_CAPTION]: TaskType.CAPTION_WRITING,
      [AITaskType.GENERATE_HASHTAGS]: TaskType.HASHTAG_GENERATION,
      [AITaskType.IMPROVE_CONTENT]: TaskType.CONTENT_STRATEGY,
      [AITaskType.ANALYZE_SENTIMENT]: TaskType.SENTIMENT_ANALYSIS,
      [AITaskType.CATEGORIZE_CONTENT]: TaskType.CONTENT_CATEGORIZATION,
      [AITaskType.PREDICT_ENGAGEMENT]: TaskType.ENGAGEMENT_PREDICTION,
      [AITaskType.GENERATE_ALT_TEXT]: TaskType.ALT_TEXT_GENERATION,
      [AITaskType.ANALYZE_IMAGE]: TaskType.IMAGE_ANALYSIS,
      [AITaskType.MODERATE_CONTENT]: TaskType.CONTENT_CATEGORIZATION,
      [AITaskType.SUGGEST_POSTING_TIME]: TaskType.PERFORMANCE_INSIGHTS,
      [AITaskType.OPTIMIZE_CONTENT_MIX]: TaskType.CONTENT_STRATEGY,
      [AITaskType.SUGGEST_REPLY]: TaskType.SMART_REPLIES,
      [AITaskType.SUMMARIZE_CONVERSATION]: TaskType.SMART_REPLIES,
      [AITaskType.CATEGORIZE_MESSAGE]: TaskType.CONTENT_CATEGORIZATION,
      [AITaskType.CUSTOMER_SUPPORT]: TaskType.CUSTOMER_SUPPORT,
      [AITaskType.CHATBOT]: TaskType.CUSTOMER_SUPPORT
    };

    return mapping[aiTaskType] || TaskType.SOCIAL_MEDIA_POST;
  }

  /**
   * Build content generation prompt
   */
  private buildContentGenerationPrompt(params: {
    topic: string;
    platform?: string;
    contentType?: string;
    tone?: string;
    audience?: string;
    keywords?: string[];
  }): string {
    let prompt = `Generate engaging social media content about "${params.topic}"`;
    
    if (params.platform) {
      prompt += ` for ${params.platform}`;
    }
    
    if (params.contentType) {
      prompt += ` as a ${params.contentType}`;
    }
    
    if (params.tone) {
      prompt += ` with a ${params.tone} tone`;
    }
    
    if (params.audience) {
      prompt += ` targeting ${params.audience}`;
    }
    
    if (params.keywords && params.keywords.length > 0) {
      prompt += ` including keywords: ${params.keywords.join(', ')}`;
    }
    
    prompt += '. Make it engaging, authentic, and platform-appropriate.';
    
    return prompt;
  }

  /**
   * Log AI usage for analytics
   */
  private async logAIUsage(usage: {
    userId: string;
    organizationId?: string;
    taskType: AITaskType;
    serviceType: AIServiceType;
    success: boolean;
    latency: number;
    charged: boolean;
    provider?: string;
    model?: string;
  }): Promise<void> {
    try {
      // Log to analytics system
      logger.info('AI usage logged', {
        userId: usage.userId,
        organizationId: usage.organizationId,
        taskType: usage.taskType,
        serviceType: usage.serviceType,
        success: usage.success,
        latency: usage.latency,
        charged: usage.charged,
        provider: usage.provider,
        model: usage.model,
        timestamp: new Date().toISOString()
      });
      
      // In production, this would also save to analytics database
      // for usage tracking and billing analytics
    } catch (error) {
      logger.warn('Failed to log AI usage', { error, usage });
    }
  }

  /**
   * Check if task type is content generation
   */
  private isContentGenerationTask(taskType: AITaskType): boolean {
    const contentTasks = [
      AITaskType.GENERATE_POST,
      AITaskType.GENERATE_CAPTION,
      AITaskType.GENERATE_HASHTAGS,
      AITaskType.IMPROVE_CONTENT
    ];
    return contentTasks.includes(taskType);
  }

  /**
   * Apply IriSync branding to generated content
   */
  private applyBranding(
    content: string,
    platform?: string,
    taskType?: AITaskType
  ): BrandedContent {
    // Extract hashtags from content if present
    const hashtagMatches = content.match(/#(\w+)/g) || [];
    const extractedHashtags = hashtagMatches.map(tag => tag.replace('#', ''));
    
    // Clean content of hashtags for processing
    const cleanContent = content.replace(/#\w+/g, '').trim();
    
    // Process with branding
    return processAIGeneratedContent(cleanContent, extractedHashtags, {
      platform,
      contentType: taskType === AITaskType.GENERATE_HASHTAGS ? 'hashtags' : 'post',
      maxHashtags: this.getMaxHashtagsForPlatform(platform),
      maxLength: this.getMaxLengthForPlatform(platform)
    });
  }

  /**
   * Get maximum hashtags for platform
   */
  private getMaxHashtagsForPlatform(platform?: string): number {
    switch (platform?.toLowerCase()) {
      case 'instagram': return 30;
      case 'twitter':
      case 'x': return 10;
      case 'linkedin': return 10;
      case 'facebook': return 10;
      default: return 20;
    }
  }

  /**
   * Get maximum content length for platform
   */
  private getMaxLengthForPlatform(platform?: string): number {
    switch (platform?.toLowerCase()) {
      case 'twitter':
      case 'x': return 280;
      case 'linkedin': return 3000;
      case 'facebook': return 63206;
      case 'instagram': return 2200;
      default: return 5000;
    }
  }
} 
/**
 * Iris AI Service
 *
 * Enhanced AI service with cost-based model selection and credit integration.
 * "Iris" is the user-facing AI assistant name, regardless of underlying model.
 *
 * Features:
 * - Cost-based model selection (lowest cost for task complexity)
 * - Credit deduction for AI operations
 * - Unified "Iris" branding across all AI interactions
 * - Automatic model routing based on task requirements
 */

import { aiService, AIProvider } from './AIService';
import { creditService, AIOperation } from '../credits/CreditService';

/**
 * Task complexity levels
 */
export enum TaskComplexity {
  SIMPLE = 'simple',       // Basic queries, simple responses
  MODERATE = 'moderate',   // Content generation, analysis
  COMPLEX = 'complex',     // Multi-step reasoning, detailed analysis
  ADVANCED = 'advanced',   // Creative tasks, long-form content
}

/**
 * Model cost tiers (tokens per dollar, approximate)
 */
interface ModelCostProfile {
  provider: AIProvider;
  costPerToken: number; // Approximate cost
  strengthAreas: string[];
  complexity: TaskComplexity[];
}

/**
 * Cost profiles for each model
 */
const MODEL_COSTS: ModelCostProfile[] = [
  {
    provider: AIProvider.OPENAI,
    costPerToken: 0.00003, // GPT-4o ~$3/1M tokens
    strengthAreas: ['general', 'analysis', 'structured'],
    complexity: [TaskComplexity.SIMPLE, TaskComplexity.MODERATE, TaskComplexity.COMPLEX],
  },
  {
    provider: AIProvider.ANTHROPIC,
    costPerToken: 0.000015, // Claude Sonnet ~$15/1M input, $75/1M output (avg)
    strengthAreas: ['conversation', 'creative', 'detailed'],
    complexity: [TaskComplexity.MODERATE, TaskComplexity.COMPLEX, TaskComplexity.ADVANCED],
  },
  {
    provider: AIProvider.GOOGLE,
    costPerToken: 0.0000025, // Gemini Flash ~$0.25/1M tokens
    strengthAreas: ['fast', 'simple', 'classification'],
    complexity: [TaskComplexity.SIMPLE, TaskComplexity.MODERATE],
  },
];

/**
 * Iris AI response
 */
export interface IrisResponse {
  response: string;
  modelUsed: AIProvider;
  creditsUsed: number;
  tokenCount: number;
  complexity: TaskComplexity;
}

class IrisAIService {
  /**
   * Determine task complexity
   */
  private determineComplexity(prompt: string, context?: any[]): TaskComplexity {
    const wordCount = prompt.split(' ').length;
    const hasContext = context && context.length > 0;
    const hasComplexKeywords = /analyze|compare|explain in detail|create|generate|optimize/i.test(prompt);
    const isCreative = /write|compose|create|design|brainstorm/i.test(prompt);

    if (isCreative || wordCount > 200) {
      return TaskComplexity.ADVANCED;
    } else if (hasComplexKeywords || hasContext) {
      return TaskComplexity.COMPLEX;
    } else if (wordCount > 50) {
      return TaskComplexity.MODERATE;
    } else {
      return TaskComplexity.SIMPLE;
    }
  }

  /**
   * Select best model based on task complexity and cost
   */
  private selectOptimalModel(complexity: TaskComplexity, taskType?: string): AIProvider {
    // Filter models by complexity capability
    const capableModels = MODEL_COSTS.filter(m => m.complexity.includes(complexity));

    // If task type specified, prefer models strong in that area
    if (taskType) {
      const preferredModels = capableModels.filter(m =>
        m.strengthAreas.some(area => taskType.toLowerCase().includes(area))
      );
      if (preferredModels.length > 0) {
        // Return lowest cost among preferred
        return preferredModels.sort((a, b) => a.costPerToken - b.costPerToken)[0].provider;
      }
    }

    // Default: return lowest cost model for complexity
    const sortedByCost = capableModels.sort((a, b) => a.costPerToken - b.costPerToken);
    return sortedByCost[0]?.provider || AIProvider.GOOGLE; // Gemini as fallback (cheapest)
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate credit cost for operation
   */
  private calculateOperationCost(complexity: TaskComplexity): AIOperation {
    switch (complexity) {
      case TaskComplexity.SIMPLE:
        return AIOperation.CHAT_BASIC;
      case TaskComplexity.MODERATE:
      case TaskComplexity.COMPLEX:
      case TaskComplexity.ADVANCED:
        return AIOperation.CHAT_COMPLEX;
      default:
        return AIOperation.CHAT_BASIC;
    }
  }

  /**
   * Chat with Iris (main entry point)
   */
  async chatWithIris(
    userId: string,
    organizationId: string,
    message: string,
    options: {
      conversationHistory?: any[];
      context?: any[];
      taskType?: string;
      preferredModel?: AIProvider;
    } = {}
  ): Promise<IrisResponse> {
    try {
      // Determine task complexity
      const complexity = this.determineComplexity(message, options.context);

      // Select optimal model (unless user prefers specific one)
      const selectedModel = options.preferredModel || this.selectOptimalModel(complexity, options.taskType);

      // Calculate operation type and check credits
      const operation = this.calculateOperationCost(complexity);
      const creditCheck = await creditService.hasCredits(userId, organizationId, operation);

      if (!creditCheck.hasCredits) {
        throw new Error(
          `Insufficient credits. Required: ${creditCheck.required}, Available: ${creditCheck.balance}`
        );
      }

      // Call AI service with selected model
      const aiResponse = await aiService.processChatbotRequest({
        userId,
        organizationId,
        message,
        conversationHistory: options.conversationHistory || [],
        context: options.context || [],
        preferredProvider: selectedModel,
      });

      // Deduct credits
      const deductResult = await creditService.deductCredits(
        userId,
        organizationId,
        operation,
        1,
        {
          model: aiResponse.model,
          tokens: aiResponse.totalTokens,
          complexity,
        }
      );

      if (!deductResult.success) {
        console.error('Failed to deduct credits:', deductResult.error);
      }

      // Brand response as "Iris"
      return {
        response: aiResponse.output,
        modelUsed: this.getProviderFromModel(aiResponse.model),
        creditsUsed: deductResult.success ? creditCheck.required : 0,
        tokenCount: aiResponse.totalTokens || this.estimateTokens(aiResponse.output),
        complexity,
      };
    } catch (error) {
      console.error('Error in Iris chat:', error);
      throw error;
    }
  }

  /**
   * Get provider from model string
   */
  private getProviderFromModel(model: string): AIProvider {
    if (model.includes('claude')) {
      return AIProvider.ANTHROPIC;
    } else if (model.includes('gpt')) {
      return AIProvider.OPENAI;
    } else if (model.includes('gemini')) {
      return AIProvider.GOOGLE;
    }
    return AIProvider.ANTHROPIC; // Default
  }

  /**
   * Generate content with Iris (with credit deduction)
   */
  async generateContent(
    userId: string,
    organizationId: string,
    request: any
  ): Promise<{ content: any; creditsUsed: number }> {
    // Check credits
    const creditCheck = await creditService.hasCredits(
      userId,
      organizationId,
      AIOperation.CONTENT_GENERATION
    );

    if (!creditCheck.hasCredits) {
      throw new Error(
        `Insufficient credits. Required: ${creditCheck.required}, Available: ${creditCheck.balance}`
      );
    }

    // Generate content (using existing content generation service)
    const contentGenerationService = await import('../content/ContentGenerationService');
    const content = await contentGenerationService.contentGenerationService.generateContent(
      request,
      userId,
      organizationId
    );

    // Deduct credits
    await creditService.deductCredits(
      userId,
      organizationId,
      AIOperation.CONTENT_GENERATION,
      1,
      { platformType: request.platformType, topic: request.topic }
    );

    return {
      content,
      creditsUsed: creditCheck.required,
    };
  }

  /**
   * Optimize content with Iris (with credit deduction)
   */
  async optimizeContent(
    userId: string,
    organizationId: string,
    caption: string,
    fromPlatform: string,
    toPlatform: string
  ): Promise<{ content: any; creditsUsed: number }> {
    // Check credits
    const creditCheck = await creditService.hasCredits(
      userId,
      organizationId,
      AIOperation.CONTENT_OPTIMIZATION
    );

    if (!creditCheck.hasCredits) {
      throw new Error(
        `Insufficient credits. Required: ${creditCheck.required}, Available: ${creditCheck.balance}`
      );
    }

    // Optimize content
    const contentGenerationService = await import('../content/ContentGenerationService');
    const content = await contentGenerationService.contentGenerationService.optimizeContent(
      caption,
      fromPlatform as any,
      toPlatform as any,
      userId,
      organizationId
    );

    // Deduct credits
    await creditService.deductCredits(
      userId,
      organizationId,
      AIOperation.CONTENT_OPTIMIZATION,
      1,
      { fromPlatform, toPlatform }
    );

    return {
      content,
      creditsUsed: creditCheck.required,
    };
  }

  /**
   * Get hashtag suggestions with Iris (with credit deduction)
   */
  async getHashtagSuggestions(
    userId: string,
    organizationId: string,
    content: string,
    platformType: string,
    count: number = 10
  ): Promise<{ hashtags: string[]; creditsUsed: number }> {
    // Check credits
    const creditCheck = await creditService.hasCredits(
      userId,
      organizationId,
      AIOperation.HASHTAG_SUGGESTIONS
    );

    if (!creditCheck.hasCredits) {
      throw new Error(
        `Insufficient credits. Required: ${creditCheck.required}, Available: ${creditCheck.balance}`
      );
    }

    // Get hashtags
    const contentGenerationService = await import('../content/ContentGenerationService');
    const hashtags = await contentGenerationService.contentGenerationService.getHashtagSuggestions(
      content,
      platformType as any,
      count
    );

    // Deduct credits
    await creditService.deductCredits(
      userId,
      organizationId,
      AIOperation.HASHTAG_SUGGESTIONS,
      1,
      { platformType, count }
    );

    return {
      hashtags,
      creditsUsed: creditCheck.required,
    };
  }

  /**
   * Analyze sentiment with Iris (with credit deduction)
   */
  async analyzeSentiment(
    userId: string,
    organizationId: string,
    text: string,
    context?: any
  ): Promise<{ sentiment: any; creditsUsed: number }> {
    // Check credits
    const creditCheck = await creditService.hasCredits(
      userId,
      organizationId,
      AIOperation.SENTIMENT_ANALYSIS
    );

    if (!creditCheck.hasCredits) {
      throw new Error(
        `Insufficient credits. Required: ${creditCheck.required}, Available: ${creditCheck.balance}`
      );
    }

    // Analyze sentiment
    const sentimentAnalysisService = await import('../monitoring/SentimentAnalysisService');
    const sentiment = await sentimentAnalysisService.sentimentAnalysisService.analyzeSentiment(
      text,
      context
    );

    // Deduct credits
    await creditService.deductCredits(
      userId,
      organizationId,
      AIOperation.SENTIMENT_ANALYSIS,
      1,
      { textLength: text.length }
    );

    return {
      sentiment,
      creditsUsed: creditCheck.required,
    };
  }

  /**
   * Get user's credit balance
   */
  async getCreditBalance(userId: string, organizationId: string) {
    return creditService.getBalance(userId, organizationId);
  }

  /**
   * Get Iris branding message (for UI)
   */
  getIrisBranding(): string {
    return 'Iris - Your AI-Powered Social Media Assistant';
  }

  /**
   * Get model information for transparency
   */
  getModelInfo(provider: AIProvider): string {
    const modelNames = {
      [AIProvider.ANTHROPIC]: 'Claude 3.5 Sonnet',
      [AIProvider.OPENAI]: 'GPT-4o',
      [AIProvider.GOOGLE]: 'Gemini 1.5 Flash',
    };
    return `Powered by ${modelNames[provider]}`;
  }
}

// Export singleton instance
export const irisAI = new IrisAIService();

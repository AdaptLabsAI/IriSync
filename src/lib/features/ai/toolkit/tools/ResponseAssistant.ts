import { AIProvider } from '../../providers/AIProviderFactory';
import { ResponseAssistant, AITaskResult, ToolkitRequestOptions } from '../interfaces';
import { TokenTracker } from '../../../tokens/token-tracker';
import { estimateTokenUsage } from '../../utils/token-counter';
import { Cache } from '../../../../core/cache/Cache';
import { logger } from '../../../../core/logging/logger';

/**
 * Implementation of ResponseAssistant that uses AI providers to assist with responses
 * Full production-ready implementation with proper token tracking and logging
 */
export class ResponseAssistantImpl implements ResponseAssistant {
  private provider: AIProvider;
  private tokenTracker?: TokenTracker;
  private cache: Cache;

  /**
   * Create a response assistant
   * @param provider AI provider instance
   * @param tokenTracker Optional token usage tracker
   */
  constructor(provider: AIProvider, tokenTracker?: TokenTracker) {
    this.provider = provider;
    this.tokenTracker = tokenTracker;
    this.cache = new Cache('response-assistant', {
      ttl: 60 * 60 * 2, // 2 hours default cache TTL
      maxSize: 300  // Maximum number of items in the cache
    });
    
    logger.info('ResponseAssistant initialized', { 
      hasTokenTracker: !!tokenTracker 
    });
  }

  /**
   * Update the provider
   * @param provider New AI provider
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
    logger.debug('ResponseAssistant provider updated');
  }

  /**
   * Suggest responses to user comments/messages
   * @param comment User comment/message
   * @param context Optional context for the response
   * @param count Number of suggestions to return
   * @param options Request options
   * @returns Suggested responses
   */
  async suggestResponses(
    comment: string,
    context?: string,
    count: number = 3,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string[]>> {
    try {
      logger.debug('Generating response suggestions', { 
        commentLength: comment.length,
        hasContext: !!context,
        count
      });
      
      // Hash the comment to use as part of cache key
      const commentHash = this.hashString(comment);
      const contextHash = context ? this.hashString(context) : 'no-context';
      const cacheKey = `responses:${commentHash}:${contextHash}:${count}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<string[]>>(cacheKey);
        if (cachedResult) {
          logger.debug('Returning cached response suggestions');
          return cachedResult;
        }
      }
      
      // Create the prompt
      let prompt = `
        Generate ${count} different professional responses to this comment/message:
        
        "${comment}"
      `;
      
      if (context) {
        prompt += `\n\nContext for the response: ${context}`;
      }
      
      prompt += `\n\nEach response should be:
        - Professional and on-brand
        - Concise but complete
        - Conversational in tone
        - Positive and solution-oriented
        
        Return each response as a separate paragraph, starting with "Response 1:", "Response 2:", etc.
      `;
      
      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      logger.debug('Generating responses with AI', { 
        promptTokens: estimatedPromptTokens 
      });
      
      // Generate the responses
      const generatedText = await this.provider.generateText(prompt, {
        temperature: options?.temperature || 0.7,
        maxTokens: options?.maxTokens || Math.max(300, count * 100)
      });
      
      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;
      
      // Split into separate responses - look for both numbered and non-numbered formats
      let suggestions = this.extractResponsesFromText(generatedText, count);
      
      // If we don't have enough suggestions, add generic ones
      while (suggestions.length < count) {
        logger.debug('Adding generic response to meet count requirement');
        suggestions.push(`Thank you for your message. We appreciate your feedback and will get back to you soon.`);
      }
      
      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for response suggestions', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }
      
      // Prepare the result
      const result: AITaskResult<string[]> = {
        success: true,
        data: suggestions,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };
      
      // Cache the result unless skipCache is set
      if (!options?.skipCache) {
        this.cache.set(cacheKey, result, options?.cacheTtl);
        logger.debug('Cached response suggestions');
      }
      
      return result;
    } catch (error) {
      logger.error('Error generating response suggestions', {
        error: error instanceof Error ? error.message : String(error),
        commentLength: comment?.length
      });
      
      // Provide fallback responses in case of error
      const fallbackResponses = [
          'Thank you for your message. We appreciate your feedback.',
          'Thanks for reaching out. We value your input.',
          'We appreciate you taking the time to share your thoughts with us.'
      ].slice(0, count);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate response suggestions',
        data: fallbackResponses
      };
    }
  }
  
  /**
   * Extract responses from AI generated text
   * Handles different response formats
   */
  private extractResponsesFromText(text: string, count: number): string[] {
    // Try different extraction methods
    
    // Method 1: Look for "Response X:" prefix
    const responseRegex = /Response\s*\d+\s*:(.*?)(?=Response\s*\d+\s*:|$)/gi;
    const matches = [];
    let match;
    while ((match = responseRegex.exec(text)) !== null) {
      matches.push(match);
    }
    
    if (matches.length > 0) {
      return matches
        .map(match => match[1].trim())
        .filter(response => response.length > 0)
        .slice(0, count);
    }
    
    // Method 2: Look for numbered list (1. 2. 3. etc.)
    const numberedListRegex = /\b\d+[\.\)]\s+(.*?)(?=\s*\b\d+[\.\)]|$)/g;
    const numberedMatches = [];
    let numberedMatch;
    while ((numberedMatch = numberedListRegex.exec(text)) !== null) {
      numberedMatches.push(numberedMatch);
    }
    
    if (numberedMatches.length > 0) {
      return numberedMatches
        .map(match => match[1].trim())
        .filter(response => response.length > 0)
        .slice(0, count);
    }
    
    // Method 3: Just split by double newlines as a fallback
    return text
      .split(/\n{2,}/)
      .map(response => response.trim())
      .filter(response => response.length > 0)
      .slice(0, count);
  }
  
  /**
   * Create a simple hash from a string for caching
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36); // Convert to base-36 for shorter strings
  }

  /**
   * Categorize incoming messages or comments
   * @param message User message
   * @param options Request options
   * @returns Message categorization
   */
  async categorizeMessage(
    message: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    category: 'question' | 'complaint' | 'praise' | 'suggestion' | 'other';
    priority: 'low' | 'medium' | 'high';
    response: string;
  }>> {
    try {
      logger.debug('Categorizing message', { 
        messageLength: message.length
      });
      
      // Create a cache key
      const messageHash = this.hashString(message);
      const cacheKey = `categorize:${messageHash}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<{
          category: 'question' | 'complaint' | 'praise' | 'suggestion' | 'other';
          priority: 'low' | 'medium' | 'high';
          response: string;
        }>>(cacheKey);
        
        if (cachedResult) {
          logger.debug('Returning cached message categorization');
          return cachedResult;
        }
      }
      
      // Create the prompt
      const prompt = `
        Analyze the following message and:
        1. Categorize it as a "question", "complaint", "praise", "suggestion", or "other"
        2. Assign a priority level ("low", "medium", or "high")
        3. Suggest an appropriate response
        
        Message: "${message}"
        
        Format your response as a JSON object with the following structure:
        {
          "category": "question" | "complaint" | "praise" | "suggestion" | "other",
          "priority": "low" | "medium" | "high",
          "response": "Your suggested response here"
        }
      `;
      
      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      logger.debug('Generating message categorization with AI', { 
        promptTokens: estimatedPromptTokens 
      });
      
      // Generate the analysis
      const generatedText = await this.provider.generateText(prompt, {
        temperature: options?.temperature || 0.3,
        maxTokens: options?.maxTokens || 400
      });
      
      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;
      
      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for message categorization', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }
      
      // Parse the response as JSON
      try {
        const result = JSON.parse(generatedText);
        
        // Validate category
        const validCategories = ['question', 'complaint', 'praise', 'suggestion', 'other'];
        const category = validCategories.includes(result.category) 
          ? result.category 
          : 'other';
        
        // Validate priority
        const validPriorities = ['low', 'medium', 'high'];
        const priority = validPriorities.includes(result.priority) 
          ? result.priority 
          : 'medium';
        
        // Validate response and provide fallback if needed
        const response = result.response || 'Thank you for your message. We will review it and respond shortly.';
        
        // Create the final result
        const categorization = {
            category,
            priority,
          response
        };
        
        const aiResult: AITaskResult<{
          category: 'question' | 'complaint' | 'praise' | 'suggestion' | 'other';
          priority: 'low' | 'medium' | 'high';
          response: string;
        }> = {
          success: true,
          data: categorization,
          tokenUsage: {
            prompt: estimatedPromptTokens,
            completion: estimatedCompletionTokens,
            total: totalTokens
          }
        };
        
        // Cache the result unless skipCache is set
        if (!options?.skipCache) {
          this.cache.set(cacheKey, aiResult, options?.cacheTtl);
          logger.debug('Cached message categorization');
        }
        
        return aiResult;
      } catch (error) {
        logger.warn('Error parsing message categorization JSON', {
          error: error instanceof Error ? error.message : String(error),
          generatedText: generatedText.substring(0, 100) + '...'
        });
        
        // Determine a fallback category and priority based on simple heuristics
        let category: 'question' | 'complaint' | 'praise' | 'suggestion' | 'other' = 'other';
        let priority: 'low' | 'medium' | 'high' = 'medium';
        
        const lowerMessage = message.toLowerCase();
        
        // Simple heuristic categorization based on keywords and punctuation
        if (message.includes('?')) {
          category = 'question';
        } else if (
          lowerMessage.includes('thank') || 
          lowerMessage.includes('great') || 
          lowerMessage.includes('love') || 
          lowerMessage.includes('amazing')
        ) {
          category = 'praise';
          priority = 'low';
        } else if (
          lowerMessage.includes('suggest') || 
          lowerMessage.includes('idea') || 
          lowerMessage.includes('maybe') || 
          lowerMessage.includes('could')
        ) {
          category = 'suggestion';
        } else if (
          lowerMessage.includes('bad') || 
          lowerMessage.includes('unhappy') || 
          lowerMessage.includes('disappointed') || 
          lowerMessage.includes('problem') ||
          lowerMessage.includes('issue') ||
          lowerMessage.includes('broken')
        ) {
          category = 'complaint';
          priority = 'high';
        }
        
        // Create fallback result
        const fallbackResult: AITaskResult<{
          category: 'question' | 'complaint' | 'praise' | 'suggestion' | 'other';
          priority: 'low' | 'medium' | 'high';
          response: string;
        }> = {
          success: true,
          data: {
            category,
            priority,
            response: 'Thank you for your message. We will review it and respond shortly.'
          },
          tokenUsage: {
            prompt: estimatedPromptTokens,
            completion: estimatedCompletionTokens,
            total: totalTokens
          }
        };
        
        // Cache the fallback result to avoid repeated failures
        this.cache.set(cacheKey, fallbackResult, options?.cacheTtl || 60 * 10); // Shorter TTL for fallbacks
        
        return fallbackResult;
      }
    } catch (error) {
      logger.error('Failed to categorize message', {
        error: error instanceof Error ? error.message : String(error),
        messageLength: message?.length
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to categorize message',
        data: {
          category: 'other',
          priority: 'medium',
          response: 'Thank you for your message. We will review it and respond shortly.'
        }
      };
    }
  }

  /**
   * Analyze messages and recommend replies
   * Performs detailed analysis of messages with sentiment detection and reply suggestions
   * 
   * @param options Configuration options for message analysis
   * @returns Detailed analysis and response recommendations for each message
   */
  async analyzeAndRecommendReplies(
    options: {
      messages: Array<{
        id: string;
        content: string;
        platform: string;
        author?: string;
        timestamp?: Date | string;
        metadata?: Record<string, any>;
      }>;
      includeKeywords?: boolean;
      includeTone?: boolean;
      includeSummary?: boolean;
      categoryTags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<AITaskResult<{
    messageAnalysis: Array<{
      id: string;
      sentiment: {
        label: 'positive' | 'negative' | 'neutral' | 'mixed';
        score: number;
      };
      keywords?: string[];
      tone?: {
        primary: string;
        secondary?: string;
      };
      urgency: 'high' | 'medium' | 'low';
      category?: string;
      responseRecommendations: Array<{
        text: string;
        tone: string;
        reasoning: string;
      }>;
    }>;
    conversationSummary?: string;
    overallSentiment?: {
      label: 'positive' | 'negative' | 'neutral' | 'mixed';
      score: number;
    };
    priorityOrder?: string[];
  }>> {
    try {
      // Input validation
      if (!options.messages || !Array.isArray(options.messages) || options.messages.length === 0) {
        logger.warn('Invalid input for message analysis', { 
          messagesProvided: options.messages ? options.messages.length : 0 
        });
        
        return {
          success: false,
          error: 'No valid messages provided for analysis',
          data: {
            messageAnalysis: []
          }
        };
      }

      // Log request details
      logger.debug('Analyzing messages and recommending replies', { 
        messageCount: options.messages.length,
        includeKeywords: options.includeKeywords,
        includeTone: options.includeTone,
        includeSummary: options.includeSummary,
        hasCategoryTags: (options.categoryTags ?? []).length > 0
      });
      
      // Create cache key based on message IDs and content fingerprints
      const messagesHash = this.hashObject({
        ids: options.messages.map(m => m.id),
        content: options.messages.map(m => this.hashString(m.content || '')),
        options: {
          keywords: !!options.includeKeywords,
          tone: !!options.includeTone,
          summary: !!options.includeSummary,
          categories: options.categoryTags?.join(',')
        }
      });
      
      const cacheKey = `analyze-replies:${messagesHash}`;
      
      // Check cache unless explicitly skipped in metadata
      if (!options.metadata?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<{
          messageAnalysis: Array<any>;
          conversationSummary?: string;
          overallSentiment?: any;
          priorityOrder?: string[];
        }>>(cacheKey);
        
        if (cachedResult) {
          logger.debug('Returning cached message analysis', { 
            messageCount: cachedResult.data?.messageAnalysis?.length || 0 
          });
          return cachedResult;
        }
      }

      // Build a system message for the AI model
      const systemMessage = `You are an expert social media manager with experience crafting personalized responses to users.
Your task is to analyze the provided social media messages, provide detailed analysis, and recommend appropriate responses.
For each message, provide 2-3 response options with different tones or approaches.
Focus on being helpful, professional, and aligned with the message sentiment.
Always provide structured data in valid JSON format that exactly matches the requested schema.`;

      // Create the prompt with messages to analyze
      let prompt = `Analyze the following ${options.messages.length} messages and provide:
1. Sentiment analysis (positive, negative, neutral, or mixed) with a confidence score (0-1)
2. Urgency level (high, medium, low)`;

      // Add optional analysis components
      if (options.includeKeywords) {
        prompt += `\n3. Key phrases or keywords from the message`;
      }
      
      if (options.includeTone) {
        prompt += `\n4. Tone analysis (primary and optional secondary tone)`;
      }
      
      if (options.categoryTags && options.categoryTags.length > 0) {
        prompt += `\n5. Category assignment from the following options: ${options.categoryTags.join(', ')}`;
      }
      
      prompt += `\n\nFor each message, provide 2-3 response recommendations with:
- The response text
- The tone used
- Reasoning for why this response would be effective`;

      if (options.includeSummary && options.messages.length > 1) {
        prompt += `\n\nAlso provide:
- A brief summary of the overall conversation
- Overall sentiment across all messages
- Suggested priority order for responding (list of message IDs in priority order)`;
      }

      // Add the messages to analyze
      prompt += `\n\nMessages to analyze:\n`;
      options.messages.forEach((message, index) => {
        prompt += `\nMessage ID: ${message.id}
Platform: ${message.platform}
${message.author ? `Author: ${message.author}` : ''}
${message.timestamp ? `Time: ${message.timestamp}` : ''}
Content: "${message.content}"
${index < options.messages.length - 1 ? '---' : ''}`;
      });

      // Add output format instructions
      prompt += `\n\nProvide the analysis in the following JSON format:
{
  "messageAnalysis": [
    {
      "id": "message-id",
      "sentiment": {
        "label": "positive|negative|neutral|mixed",
        "score": 0.0-1.0
      },
      ${options.includeKeywords ? `"keywords": ["keyword1", "keyword2"],` : ''}
      ${options.includeTone ? `"tone": {
        "primary": "tone-name",
        "secondary": "optional-secondary-tone"
      },` : ''}
      "urgency": "high|medium|low",
      ${options.categoryTags?.length ? `"category": "selected-category",` : ''}
      "responseRecommendations": [
        {
          "text": "Suggested response text",
          "tone": "tone used",
          "reasoning": "Why this response works"
        }
      ]
    }
  ]${options.includeSummary ? `,
  "conversationSummary": "Brief summary of the conversation",
  "overallSentiment": {
    "label": "positive|negative|neutral|mixed",
    "score": 0.0-1.0
  },
  "priorityOrder": ["id1", "id2", "id3"]` : ''}
}`;

      // Estimate token usage
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Determine if we should use a simplified approach for large message sets
      const useSimplifiedApproach = options.messages.length > 5;
      
      if (useSimplifiedApproach) {
        logger.debug('Using simplified batch approach for large message set', { 
          messageCount: options.messages.length 
        });
        
        return await this.batchAnalyzeMessages(options, estimatedPromptTokens);
      }
      
      logger.debug('Generating message analysis with AI', { 
        promptTokens: estimatedPromptTokens,
        messageCount: options.messages.length
      });
      
      // Generate the analysis with the AI provider
      const maxTokens = options.metadata?.maxTokens as number || 
                        Math.min(4000, 500 + (options.messages.length * 500));
                        
      const generatedText = await this.provider.generateText(
        `${systemMessage}\n\n${prompt}`, 
        {
          temperature: options.metadata?.temperature as number || 0.2,
          maxTokens: maxTokens
        }
      );
      
      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Parse the JSON response
      let analysisResult: {
        messageAnalysis: Array<any>;
        conversationSummary?: string;
        overallSentiment?: any;
        priorityOrder?: string[];
      };
      
      try {
        // Extract JSON from the response (in case the model includes extra text)
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : generatedText;
        
        analysisResult = JSON.parse(jsonStr);
        
        // Validate the result has required fields
        if (!analysisResult || !analysisResult.messageAnalysis || !Array.isArray(analysisResult.messageAnalysis)) {
          throw new Error('Invalid analysis format');
        }
        
        // Normalize results to ensure all fields are present
        analysisResult.messageAnalysis = analysisResult.messageAnalysis.map(analysis => {
          // Ensure all message analyses have the required fields
          return {
            id: analysis.id || 'unknown',
            sentiment: analysis.sentiment || { label: 'neutral', score: 0.5 },
            keywords: analysis.keywords || [],
            tone: analysis.tone || { primary: 'neutral' },
            urgency: analysis.urgency || 'medium',
            category: analysis.category || undefined,
            responseRecommendations: (analysis.responseRecommendations || []).map((rec: any) => ({
              text: rec.text || 'Thank you for your message.',
              tone: rec.tone || 'neutral',
              reasoning: rec.reasoning || 'Generic professional response'
            }))
          };
        });
        
        logger.debug('Successfully parsed message analysis', { 
          analyzeCount: analysisResult.messageAnalysis.length 
        });
      } catch (e) {
        // If parsing fails, create a fallback analysis
        logger.warn('Failed to parse message analysis response, using fallback', {
          error: e instanceof Error ? e.message : String(e),
          responsePreview: generatedText.substring(0, 100) + '...'
        });
        
        // Generate a basic fallback analysis for each message
        analysisResult = {
          messageAnalysis: options.messages.map(message => ({
            id: message.id,
            sentiment: { label: 'neutral', score: 0.5 },
            urgency: 'medium',
            responseRecommendations: [{
              text: 'Thank you for your message. We\'ve received your feedback and will review it promptly.',
              tone: 'professional',
              reasoning: 'Professional, neutral response suitable for any message'
            }]
          }))
        };
      }

      // Track token usage if tracker is available
      if (this.tokenTracker && options.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for message analysis', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }
      
      // Prepare the result
      const result: AITaskResult<{
        messageAnalysis: Array<any>;
        conversationSummary?: string;
        overallSentiment?: any;
        priorityOrder?: string[];
      }> = {
        success: true,
        data: analysisResult,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };
      
      // Cache the result
      const cacheTtl = options.metadata?.cacheTtl as number || 60 * 60; // Default 1 hour
      this.cache.set(cacheKey, result, cacheTtl);
      logger.debug('Cached message analysis', { ttl: cacheTtl });
      
      return result;
    } catch (error) {
      logger.error('Error analyzing messages', {
        error: error instanceof Error ? error.message : String(error),
        messageCount: options.messages?.length
      });
      
      // Create minimal fallback responses
      const fallbackAnalysis = options.messages.map(message => ({
        id: message.id,
        sentiment: { label: 'neutral' as 'positive' | 'negative' | 'neutral' | 'mixed', score: 0.5 },
        urgency: 'medium' as 'high' | 'medium' | 'low',
        responseRecommendations: [{
          text: 'Thank you for your message. We will review it and respond shortly.',
          tone: 'professional',
          reasoning: 'Default professional response'
        }]
      }));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error analyzing messages',
        data: {
          messageAnalysis: fallbackAnalysis
        }
      };
    }
  }
  
  /**
   * Process messages in batches for larger message sets
   * @param options Analysis options
   * @param estimatedPromptTokens Token count of the full prompt
   * @returns Combined analysis results
   */
  private async batchAnalyzeMessages(
    options: {
      messages: Array<{
        id: string;
        content: string;
        platform: string;
        author?: string;
        timestamp?: Date | string;
        metadata?: Record<string, any>;
      }>;
      includeKeywords?: boolean;
      includeTone?: boolean;
      includeSummary?: boolean;
      categoryTags?: string[];
      metadata?: Record<string, any>;
    },
    estimatedPromptTokens: number
  ): Promise<AITaskResult<{
    messageAnalysis: Array<any>;
    conversationSummary?: string;
    overallSentiment?: any;
    priorityOrder?: string[];
  }>> {
    logger.debug('Processing large message set in batches');
    
    // Split messages into batches of 3-5 messages
    const batchSize = 3;
    const batches: Array<typeof options.messages> = [];
    
    for (let i = 0; i < options.messages.length; i += batchSize) {
      batches.push(options.messages.slice(i, i + batchSize));
    }
    
    // Process each batch
    const batchResults: Array<AITaskResult<{
      messageAnalysis: Array<any>;
    }>> = [];
    
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    
    for (let i = 0; i < batches.length; i++) {
      logger.debug(`Processing batch ${i+1}/${batches.length}`, { 
        messageCount: batches[i].length 
      });
      
      // Create a simplified version of the options for this batch
      const batchOptions = {
        ...options,
        messages: batches[i],
        includeSummary: false, // Don't need summaries for individual batches
        metadata: {
          ...options.metadata,
          skipCache: true // Don't cache intermediate results
        }
      };
      
      // Recursive call to analyze this batch
      const batchResult = await this.analyzeAndRecommendReplies(batchOptions);
      batchResults.push(batchResult);
      
      // Accumulate token usage
      if (batchResult.tokenUsage) {
        totalPromptTokens += batchResult.tokenUsage.prompt;
        totalCompletionTokens += batchResult.tokenUsage.completion;
      }
    }
    
    // Combine results from all batches
    const combinedAnalysis = batchResults.flatMap(result => 
      result.data?.messageAnalysis || []
    );
    
    // Generate summary separately if needed
    let conversationSummary;
    let overallSentiment;
    let priorityOrder;
    
    if (options.includeSummary && combinedAnalysis.length > 1) {
      try {
        logger.debug('Generating overall summary for batched messages');
        
        // Create a prompt specifically for the summary
        const summaryPrompt = `Review these ${combinedAnalysis.length} message analyses and provide:
1. A brief summary of the overall conversation
2. The overall sentiment across all messages (positive, negative, neutral, or mixed) with a confidence score
3. A suggested priority order for responding (list message IDs in priority order)

Message analyses:
${JSON.stringify(combinedAnalysis, null, 2)}

Return only the JSON object:
{
  "conversationSummary": "Brief summary here",
  "overallSentiment": {
    "label": "positive|negative|neutral|mixed",
    "score": 0.0-1.0
  },
  "priorityOrder": ["id1", "id2", "id3"]
}`;

        const summaryText = await this.provider.generateText(summaryPrompt, {
          temperature: 0.3,
          maxTokens: 1000
        });
        
        // Parse summary response
        const summaryData = JSON.parse(summaryText);
        conversationSummary = summaryData.conversationSummary;
        overallSentiment = summaryData.overallSentiment;
        priorityOrder = summaryData.priorityOrder;
        
        // Add to token total
        totalPromptTokens += estimateTokenUsage(summaryPrompt);
        totalCompletionTokens += estimateTokenUsage(summaryText);
      } catch (error) {
        logger.warn('Error generating summary for batched analysis', {
          error: error instanceof Error ? error.message : String(error)
        });
        // If summary generation fails, we still have the individual analyses
      }
    }
    
    // Return the combined result
      return {
      success: true,
      data: {
        messageAnalysis: combinedAnalysis,
        ...(conversationSummary && { conversationSummary }),
        ...(overallSentiment && { overallSentiment }),
        ...(priorityOrder && { priorityOrder })
      },
        tokenUsage: {
        prompt: totalPromptTokens,
        completion: totalCompletionTokens,
        total: totalPromptTokens + totalCompletionTokens
      }
    };
  }
  
  /**
   * Create a hash from an object for caching
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    return this.hashString(str);
  }

  /**
   * Prioritize social inbox messages based on multiple factors
   * @param options Options for inbox prioritization
   * @returns Prioritized messages with analysis and token usage
   */
  async prioritizeInbox(
    options: {
      messages: Array<{
        id: string;
        content: string;
        platform: string;
        author?: string;
        timestamp?: Date | string;
        isFromCustomer?: boolean;
        customerInfo?: {
          isVip?: boolean;
          followersCount?: number;
          lifetimeValue?: number;
          previousInteractions?: number;
        };
        metadata?: Record<string, any>;
      }>;
      prioritizationRules?: {
        vipWeight?: number;
        followerCountWeight?: number;
        negativeContentWeight?: number;
        urgencyWeight?: number;
        recencyWeight?: number;
        lifetimeValueWeight?: number;
      };
      businessContext?: {
        industry?: string;
        recentIssues?: string[];
        sensitivePhrases?: string[];
      };
      metadata?: Record<string, any>;
    }
  ): Promise<AITaskResult<{
    prioritizedMessages: Array<{
      id: string;
      priorityScore: number;
      priorityLevel: 'critical' | 'high' | 'medium' | 'low';
      sentimentLabel: 'positive' | 'negative' | 'neutral' | 'mixed';
      urgency: 'high' | 'medium' | 'low';
      category?: string;
      reasonForPriority: string[];
      sensitiveContent?: boolean;
      requiredExpertise?: string;
      estimatedResponseTime?: string;
    }>;
    categories: {
      [key: string]: {
        count: number;
        priority: 'critical' | 'high' | 'medium' | 'low';
      };
    };
    insights: string[];
  }>> {
    try {
      // Input validation
      if (!options.messages || !Array.isArray(options.messages) || options.messages.length === 0) {
        logger.warn('Invalid input for inbox prioritization', { 
          messagesProvided: options.messages ? options.messages.length : 0 
        });
        
        return {
          success: false,
          error: 'No valid messages provided for prioritization',
          data: {
            prioritizedMessages: [],
            categories: {},
            insights: ['No messages to prioritize']
          }
        };
      }

      logger.debug('Prioritizing inbox messages', {
        messageCount: options.messages.length,
        hasRules: !!options.prioritizationRules,
        hasBusinessContext: !!options.businessContext
      });
      
      // Create cache key from messages and rules
      const messagesDigest = options.messages.map(m => ({
        id: m.id,
        contentHash: this.hashString(m.content || ''),
        vip: m.customerInfo?.isVip,
        followers: m.customerInfo?.followersCount ? Math.ceil(m.customerInfo.followersCount / 1000) * 1000 : null // Round to thousands
      }));
      
      const rulesDigest = options.prioritizationRules ? 
        JSON.stringify(options.prioritizationRules) : 
        'default-rules';
        
      const businessContextDigest = options.businessContext ?
        this.hashObject(options.businessContext) :
        'no-context';
        
      const cacheKey = `prioritize-inbox:${this.hashObject(messagesDigest)}:${rulesDigest}:${businessContextDigest}`;
      
      // Check cache unless explicitly skipped in metadata
      if (!options.metadata?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<{
          prioritizedMessages: Array<any>;
          categories: Record<string, any>;
          insights: string[];
        }>>(cacheKey);
        
        if (cachedResult) {
          logger.debug('Returning cached inbox prioritization');
          return cachedResult;
        }
      }
      
      // Handle small inbox directly or large inbox in batches
      if (options.messages.length <= 10) {
        return await this.prioritizeSmallInbox(options);
      } else {
        return await this.prioritizeLargeInbox(options);
      }
    } catch (error) {
      logger.error('Error prioritizing inbox', {
        error: error instanceof Error ? error.message : String(error),
        messageCount: options.messages?.length
      });
      
      // Provide basic fallback prioritization
      const fallbackPrioritization = options.messages.map((message, index) => {
        // Simple time-based prioritization (most recent first)
        const timestamp = message.timestamp ? new Date(message.timestamp).getTime() : Date.now() - (index * 100000);
        const priorityScore = 50 - (Math.min(index, 10) * 5); // Simple score 50-0 by position
        
        return {
          id: message.id,
          priorityScore,
          priorityLevel: index < 3 ? 'high' : (index < 6 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
          sentimentLabel: 'neutral' as 'positive' | 'negative' | 'neutral' | 'mixed',
          urgency: index < 3 ? 'high' : (index < 6 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
          reasonForPriority: ['Based on recency'],
          sensitiveContent: false
        };
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error prioritizing inbox',
        data: {
          prioritizedMessages: fallbackPrioritization,
          categories: { 'uncategorized': { count: fallbackPrioritization.length, priority: 'medium' } },
          insights: ['Error occurred while prioritizing messages. Basic time-based prioritization applied.']
        }
      };
    }
  }

  /**
   * Prioritize a small inbox (up to 10 messages) using AI
   * @param options Configuration options
   * @returns Prioritized messages with full analysis 
   */
  private async prioritizeSmallInbox(
    options: {
      messages: Array<any>;
      prioritizationRules?: Record<string, number>;
      businessContext?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ): Promise<AITaskResult<{
    prioritizedMessages: Array<any>;
    categories: Record<string, any>;
    insights: string[];
  }>> {
    logger.debug('Using AI to prioritize small inbox', { 
      messageCount: options.messages.length 
    });
    
    // Build the system prompt
    const systemPrompt = `You are an expert at analyzing and prioritizing customer messages for a business.
Your task is to analyze each message based on content, customer attributes, and business context.
Provide detailed prioritization with reasons, sentiment analysis, and categorization.
Format your response as structured JSON data exactly matching the requested schema.`;

    // Build the main prompt
    let userPrompt = `Analyze and prioritize these ${options.messages.length} messages based on their importance:`;
    
    // Add prioritization rules if provided
    if (options.prioritizationRules) {
      userPrompt += `\n\nUse these prioritization weights (higher = more important):`;
      Object.entries(options.prioritizationRules).forEach(([rule, weight]) => {
        userPrompt += `\n- ${rule}: ${weight}`;
      });
    } else {
      userPrompt += `\n\nUse default prioritization rules:
- Negative sentiment is higher priority
- VIP customers get higher priority
- Urgent issues get higher priority
- Recent messages get higher priority
- Higher follower count increases priority slightly
- Messages containing specific issues or sensitive topics get higher priority`;
    }
    
    // Add business context if provided
      if (options.businessContext) {
      userPrompt += `\n\nBusiness Context:`;
        if (options.businessContext.industry) {
        userPrompt += `\n- Industry: ${options.businessContext.industry}`;
        }
        if (options.businessContext.recentIssues && options.businessContext.recentIssues.length > 0) {
        userPrompt += `\n- Recent issues to watch for: ${options.businessContext.recentIssues.join(', ')}`;
        }
        if (options.businessContext.sensitivePhrases && options.businessContext.sensitivePhrases.length > 0) {
        userPrompt += `\n- Sensitive topics: ${options.businessContext.sensitivePhrases.join(', ')}`;
      }
    }
    
    // Add the messages to analyze
    userPrompt += `\n\nMessages to analyze:\n`;
    options.messages.forEach((message, index) => {
      userPrompt += `\n--- Message ${index + 1} ---
ID: ${message.id}
Platform: ${message.platform}
${message.author ? `Author: ${message.author}` : ''}
${message.timestamp ? `Time: ${message.timestamp}` : ''}
${message.isFromCustomer !== undefined ? `From Customer: ${message.isFromCustomer}` : ''}
${message.customerInfo ? `Customer Info: ${JSON.stringify(message.customerInfo)}` : ''}
Content: "${message.content}"
`;
    });
    
    // Define the expected output format
    userPrompt += `\n\nProvide the analysis in the following JSON format:
{
  "prioritizedMessages": [
    {
      "id": "message-id",
      "priorityScore": number-between-0-and-100,
      "priorityLevel": "critical" | "high" | "medium" | "low",
      "sentimentLabel": "positive" | "negative" | "neutral" | "mixed",
      "urgency": "high" | "medium" | "low",
      "category": "category-name",
      "reasonForPriority": ["reason1", "reason2"],
      "sensitiveContent": boolean,
      "requiredExpertise": "expertise-area",
      "estimatedResponseTime": "time-estimate"
    }
  ],
  "categories": {
    "category-name": {
      "count": number,
      "priority": "critical" | "high" | "medium" | "low"
    }
  },
  "insights": ["insight1", "insight2"]
}`;

    // Estimate token usage for the prompt
    const estimatedPromptTokens = estimateTokenUsage(systemPrompt + userPrompt);
    
    logger.debug('Generating inbox prioritization with AI', { 
      promptTokens: estimatedPromptTokens 
    });
    
    // Generate the analysis with the AI provider
    const generatedText = await this.provider.generateText(
      `${systemPrompt}\n\n${userPrompt}`, 
      {
        temperature: options.metadata?.temperature as number || 0.3,
        maxTokens: options.metadata?.maxTokens as number || 3000
      }
    );
    
    // Estimate token usage for the completion
    const estimatedCompletionTokens = estimateTokenUsage(generatedText);
    const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Parse the JSON response
    let prioritizationResult: {
      prioritizedMessages: Array<any>;
      categories: Record<string, any>;
      insights: string[];
    };
    
    try {
      // Extract JSON from the response (in case the model includes extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : generatedText;
      
      prioritizationResult = JSON.parse(jsonStr);
      
      // Validate the result has required fields
      if (!prioritizationResult || !prioritizationResult.prioritizedMessages || !Array.isArray(prioritizationResult.prioritizedMessages)) {
        throw new Error('Invalid prioritization format');
      }
      
      logger.debug('Successfully parsed inbox prioritization', { 
        messageCount: prioritizationResult.prioritizedMessages.length,
        categoryCount: Object.keys(prioritizationResult.categories || {}).length
      });
      
    } catch (e) {
      logger.warn('Failed to parse prioritization response, using fallback', {
        error: e instanceof Error ? e.message : String(e),
        responsePreview: generatedText.substring(0, 100) + '...'
      });
      
      // Generate a basic fallback prioritization
      prioritizationResult = this.createFallbackPrioritization(options.messages);
      }

      // Track token usage if tracker is available
      if (this.tokenTracker && options.metadata?.userId) {
      const userId = options.metadata.userId as string;
      const orgId = options.metadata.organizationId as string;
      
      await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
      logger.debug('Token usage tracked for inbox prioritization', { 
        userId, 
        orgId, 
        tokens: totalTokens 
      });
    }
    
    // Prepare the result
    const result: AITaskResult<{
      prioritizedMessages: Array<any>;
      categories: Record<string, any>;
      insights: string[];
    }> = {
      success: true,
      data: prioritizationResult,
      tokenUsage: {
        prompt: estimatedPromptTokens,
        completion: estimatedCompletionTokens,
        total: totalTokens
      }
    };
    
    // Cache the result
    const cacheTtl = options.metadata?.cacheTtl as number || 30 * 60; // Default 30 minutes
    this.cache.set(`prioritize-inbox:${this.hashObject(options.messages)}`, result, cacheTtl);
    logger.debug('Cached inbox prioritization', { ttl: cacheTtl });
    
    return result;
  }

  /**
   * Prioritize a large inbox (more than 10 messages) using batching and rules
   * @param options Configuration options
   * @returns Prioritized messages with combined analysis
   */
  private async prioritizeLargeInbox(
    options: {
      messages: Array<any>;
      prioritizationRules?: Record<string, number>;
      businessContext?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ): Promise<AITaskResult<{
    prioritizedMessages: Array<any>;
    categories: Record<string, any>;
    insights: string[];
  }>> {
    logger.debug('Using batch processing to prioritize large inbox', { 
      messageCount: options.messages.length 
    });
    
    // Split messages into batches of 10
    const batchSize = 10;
    const batches: Array<Array<any>> = [];
    
    for (let i = 0; i < options.messages.length; i += batchSize) {
      batches.push(options.messages.slice(i, i + batchSize));
    }
    
    // Process each batch
    const batchResults: Array<AITaskResult<{
      prioritizedMessages: Array<any>;
      categories: Record<string, any>;
      insights: string[];
    }>> = [];
    
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    
    for (let i = 0; i < batches.length; i++) {
      logger.debug(`Processing batch ${i+1}/${batches.length}`, { 
        messageCount: batches[i].length 
      });
      
      // Create a simplified version of the options for this batch
      const batchOptions = {
        ...options,
        messages: batches[i],
        metadata: {
          ...options.metadata,
          skipCache: true // Don't cache intermediate results
        }
      };
      
      // Process this batch
      const batchResult = await this.prioritizeSmallInbox(batchOptions);
      batchResults.push(batchResult);
      
      // Accumulate token usage
      if (batchResult.tokenUsage) {
        totalPromptTokens += batchResult.tokenUsage.prompt;
        totalCompletionTokens += batchResult.tokenUsage.completion;
      }
    }
    
    // Combine results from all batches
    const allPrioritizedMessages = batchResults.flatMap(result => 
      result.data?.prioritizedMessages || []
    );
    
    // Combine categories
    const combinedCategories: Record<string, { count: number; priority: 'critical' | 'high' | 'medium' | 'low' }> = {};
    
    batchResults.forEach(result => {
      if (result.data?.categories) {
        Object.entries(result.data.categories).forEach(([category, data]) => {
          if (!combinedCategories[category]) {
            combinedCategories[category] = { count: 0, priority: 'medium' };
          }
          combinedCategories[category].count += data.count;
          // Take the highest priority level
          const priorityLevels = ['low', 'medium', 'high', 'critical'];
          const existingPriorityIndex = priorityLevels.indexOf(combinedCategories[category].priority);
          const newPriorityIndex = priorityLevels.indexOf(data.priority);
          if (newPriorityIndex > existingPriorityIndex) {
            combinedCategories[category].priority = data.priority;
          }
        });
      }
    });
    
    // Collect unique insights
    const uniqueInsights = new Set<string>();
    batchResults.forEach(result => {
      if (result.data?.insights) {
        result.data.insights.forEach(insight => uniqueInsights.add(insight));
      }
    });
    
    // Re-sort all messages by priority score for a unified list
    const sortedMessages = [...allPrioritizedMessages].sort((a, b) => 
      b.priorityScore - a.priorityScore
    );
    
    // Generate overall insights specific to the full dataset
    const generalInsights = [
      `Processed ${options.messages.length} messages across ${batches.length} batches.`,
      `Found ${Object.keys(combinedCategories).length} distinct message categories.`,
      `${sortedMessages.filter(m => m.priorityLevel === 'critical' || m.priorityLevel === 'high').length} messages require urgent attention.`
    ];
    
    // Combine all insights, removing duplicates
    const allInsights = [...generalInsights, ...Array.from(uniqueInsights)].slice(0, 10);
    
    // Return the combined result
      return {
      success: true,
      data: {
        prioritizedMessages: sortedMessages,
        categories: combinedCategories,
        insights: allInsights
      },
        tokenUsage: {
        prompt: totalPromptTokens,
        completion: totalCompletionTokens,
        total: totalPromptTokens + totalCompletionTokens
      }
    };
  }
  
  /**
   * Create fallback prioritization based on simple rules when AI fails
   * @param messages Messages to prioritize
   * @returns Basic prioritization data
   */
  private createFallbackPrioritization(messages: Array<any>): {
    prioritizedMessages: Array<any>;
    categories: Record<string, any>;
    insights: string[];
  } {
    // Create basic prioritization using simple rules
    const prioritizedMessages = messages.map((message, index) => {
      // Default priority calculation
      let priorityScore = 50; // Medium priority by default
      const reasons = [];
      
      // Simple content-based checks for priority adjustments
      const content = (message.content || '').toLowerCase();
      
      // Check for urgent keywords
      if (content.includes('urgent') || content.includes('asap') || 
          content.includes('emergency') || content.includes('immediately')) {
        priorityScore += 30;
        reasons.push('Contains urgent keywords');
      }
      
      // Check for negative sentiment words
      if (content.includes('angry') || content.includes('disappointed') || 
          content.includes('unhappy') || content.includes('problem') ||
          content.includes('issue') || content.includes('broken') ||
          content.includes('failed') || content.includes('not working')) {
        priorityScore += 20;
        reasons.push('Negative sentiment detected');
      }
      
      // VIP customer bonus
      if (message.customerInfo?.isVip) {
        priorityScore += 15;
        reasons.push('VIP customer');
      }
      
      // Follower count influence
      if (message.customerInfo?.followersCount && message.customerInfo.followersCount > 10000) {
        priorityScore += 10;
        reasons.push('High follower count');
      }
      
      // Determine priority level based on score
      let priorityLevel: 'critical' | 'high' | 'medium' | 'low';
      if (priorityScore >= 90) priorityLevel = 'critical';
      else if (priorityScore >= 70) priorityLevel = 'high';
      else if (priorityScore >= 40) priorityLevel = 'medium';
      else priorityLevel = 'low';
      
      // Determine sentiment based on simple keyword checks
      let sentimentLabel: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
      if (content.includes('thank') || content.includes('happy') || 
          content.includes('great') || content.includes('resolved')) {
        sentimentLabel = 'positive';
      } else if (content.includes('not') || 
                 content.includes('issue') || 
                 content.includes('problem') || 
                 content.includes('disappointed')) {
        sentimentLabel = 'negative';
      }
      
      // Simple category detection
      let category = 'General';
      if (content.includes('billing') || content.includes('payment') || 
          content.includes('charge') || content.includes('price')) {
        category = 'Billing';
      } else if (content.includes('help') || content.includes('support') || 
                 content.includes('assistance')) {
        category = 'Support';
      } else if (content.includes('feature') || content.includes('suggestion') || 
                 content.includes('idea')) {
        category = 'Feature Request';
      }
      
      return {
        id: message.id,
        priorityScore,
        priorityLevel,
        sentimentLabel,
        urgency: priorityLevel === 'critical' || priorityLevel === 'high' ? 'high' : 
                (priorityLevel === 'medium' ? 'medium' : 'low'),
        category,
        reasonForPriority: reasons.length > 0 ? reasons : ['Default prioritization'],
        sensitiveContent: content.includes('personal') || content.includes('private') || content.includes('confidential'),
        requiredExpertise: category === 'Billing' ? 'Billing Team' : 'Customer Support',
        estimatedResponseTime: priorityLevel === 'critical' ? '1 hour' : 
                               (priorityLevel === 'high' ? '4 hours' : 
                                (priorityLevel === 'medium' ? '24 hours' : '48 hours'))
      };
    });
    
    // Sort by priority score
    prioritizedMessages.sort((a, b) => b.priorityScore - a.priorityScore);
    
    // Collect categories
    const categories: Record<string, { count: number; priority: 'critical' | 'high' | 'medium' | 'low' }> = {};
    prioritizedMessages.forEach(message => {
      const category = message.category;
      if (!categories[category]) {
        categories[category] = { count: 0, priority: 'medium' };
      }
      categories[category].count++;
      
      // Update category priority to highest message priority in that category
      const priorityLevels = ['low', 'medium', 'high', 'critical'];
      const existingPriorityIndex = priorityLevels.indexOf(categories[category].priority);
      const newPriorityIndex = priorityLevels.indexOf(message.priorityLevel);
      if (newPriorityIndex > existingPriorityIndex) {
        categories[category].priority = message.priorityLevel;
      }
    });
    
    return {
      prioritizedMessages,
      categories,
      insights: [
        'Fallback prioritization applied using simple rules',
        `${prioritizedMessages.filter(m => m.priorityLevel === 'critical' || m.priorityLevel === 'high').length} high priority messages identified`,
        `Most common category: ${Object.entries(categories).sort((a, b) => b[1].count - a[1].count)[0]?.[0] || 'None'}`
      ]
    };
  }

  /**
   * Summarize conversation and extract key information
   * Analyzes a conversation thread to create a concise summary with key points 
   * 
   * @param options Configuration options for conversation summarization
   * @returns Summary, key points, and metrics from the conversation
   */
  async summarizeConversation(
    options: {
      conversation: Array<{
        id: string;
        content: string;
        role: 'customer' | 'agent' | 'system';
        author?: string;
        timestamp?: Date | string;
        metadata?: Record<string, any>;
      }>;
      format?: 'bullet' | 'paragraph' | 'structured';
      includeIntentAnalysis?: boolean;
      includeNextSteps?: boolean;
      maxLength?: number;
      focusAreas?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<AITaskResult<{
    summary: string;
    keyPoints: string[];
    customerIntent?: {
      primary: string;
      secondary?: string[];
      satisfaction: 'satisfied' | 'neutral' | 'unsatisfied';
    };
    nextSteps?: string[];
    topics: string[];
    metrics: {
      customerSentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
      agentResponseQuality?: 'excellent' | 'good' | 'average' | 'poor';
      resolutionStatus: 'resolved' | 'pending' | 'escalated' | 'unresolved';
    };
  }>> {
    try {
      // Input validation
      if (!options.conversation || !Array.isArray(options.conversation) || options.conversation.length === 0) {
        logger.warn('Invalid input for conversation summarization', { 
          messagesProvided: options.conversation ? options.conversation.length : 0 
        });
        
        return {
          success: false,
          error: 'No valid conversation messages provided for summarization',
          data: {
            summary: 'No conversation to summarize',
            keyPoints: [],
            topics: [],
            metrics: {
              customerSentiment: 'neutral',
              resolutionStatus: 'unresolved'
            }
          }
        };
      }

      logger.debug('Summarizing conversation', {
        messageCount: options.conversation.length,
        format: options.format || 'paragraph',
        includeIntentAnalysis: !!options.includeIntentAnalysis,
        includeNextSteps: !!options.includeNextSteps
      });
      
      // Create cache key from conversation and options
      const conversationDigest = options.conversation.map(m => ({
        id: m.id,
        contentHash: this.hashString(m.content || ''),
        role: m.role
      }));
      
      const optionsDigest = {
        format: options.format || 'paragraph',
        intent: !!options.includeIntentAnalysis,
        nextSteps: !!options.includeNextSteps,
        maxLength: options.maxLength,
        focusAreas: options.focusAreas?.join(',')
      };
      
      const cacheKey = `summarize-conversation:${this.hashObject(conversationDigest)}:${this.hashObject(optionsDigest)}`;
      
      // Check cache unless explicitly skipped in metadata
      if (!options.metadata?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<{
          summary: string;
          keyPoints: string[];
          customerIntent?: any;
          nextSteps?: string[];
          topics: string[];
          metrics: any;
        }>>(cacheKey);
        
        if (cachedResult) {
          logger.debug('Returning cached conversation summary');
          return cachedResult;
        }
      }
      
      // Build the system prompt
      const systemPrompt = `You are an expert conversation analyst who creates clear, concise summaries of customer service conversations.
Your task is to analyze a conversation thread and extract the most important information.
Focus on accurately capturing the main points, customer intentions, and meaningful outcomes.
Format your response as structured JSON data exactly matching the requested schema.`;

      // Build the main prompt with instructions
      let userPrompt = `Summarize this conversation between ${options.conversation.filter(m => m.role === 'customer').length} customer message(s) and ${options.conversation.filter(m => m.role === 'agent').length} agent message(s).`;
      
      // Add format instructions
      userPrompt += `\n\nProvide summary in ${options.format || 'paragraph'} format ${options.maxLength ? `with maximum length of ${options.maxLength} characters` : ''}.`;
      
      // Add focus areas if provided
      if (options.focusAreas && options.focusAreas.length > 0) {
        userPrompt += `\n\nFocus on these specific areas: ${options.focusAreas.join(', ')}.`;
      }
      
      // Add optional analysis instructions
      if (options.includeIntentAnalysis) {
        userPrompt += `\n\nAnalyze customer intent and satisfaction.`;
      }
      
      if (options.includeNextSteps) {
        userPrompt += `\n\nSuggest logical next steps based on conversation.`;
      }
      
      // Add the conversation to analyze
      userPrompt += `\n\nConversation thread:\n`;
      options.conversation.forEach((message, index) => {
        const formattedTimestamp = message.timestamp ? 
          (typeof message.timestamp === 'string' ? message.timestamp : message.timestamp.toISOString()) : 
          '';
          
        userPrompt += `\n[${message.role.toUpperCase()}${message.author ? ` - ${message.author}` : ''}${formattedTimestamp ? ` - ${formattedTimestamp}` : ''}]: ${message.content}`;
      });
      
      // Define the expected output format
      userPrompt += `\n\nProvide the analysis in the following JSON format:
{
  "summary": "Concise summary of the conversation",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  ${options.includeIntentAnalysis ? `"customerIntent": {
    "primary": "Main customer goal/intent",
    "secondary": ["Additional intent 1", "Additional intent 2"],
    "satisfaction": "satisfied" | "neutral" | "unsatisfied"
  },` : ''}
  ${options.includeNextSteps ? `"nextSteps": ["suggested next step 1", "suggested next step 2"],` : ''}
  "topics": ["topic1", "topic2", "topic3"],
  "metrics": {
    "customerSentiment": "positive" | "negative" | "neutral" | "mixed",
    "agentResponseQuality": "excellent" | "good" | "average" | "poor",
    "resolutionStatus": "resolved" | "pending" | "escalated" | "unresolved"
  }
}`;

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(systemPrompt + userPrompt);
      
      logger.debug('Generating conversation summary with AI', { 
        promptTokens: estimatedPromptTokens,
        messageCount: options.conversation.length
      });
      
      // Generate the summary with the AI provider
      const generatedText = await this.provider.generateText(
        `${systemPrompt}\n\n${userPrompt}`, 
        {
          temperature: options.metadata?.temperature as number || 0.3,
          maxTokens: options.metadata?.maxTokens as number || 2000
        }
      );
      
      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Parse the JSON response
      let summaryResult: {
        summary: string;
        keyPoints: string[];
        customerIntent?: {
          primary: string;
          secondary?: string[];
          satisfaction: 'satisfied' | 'neutral' | 'unsatisfied';
        };
        nextSteps?: string[];
        topics: string[];
        metrics: {
          customerSentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
          agentResponseQuality?: 'excellent' | 'good' | 'average' | 'poor';
          resolutionStatus: 'resolved' | 'pending' | 'escalated' | 'unresolved';
        };
      };
      
      try {
        // Extract JSON from the response (in case the model includes extra text)
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : generatedText;
        
        summaryResult = JSON.parse(jsonStr);
        
        // Validate the result has required fields
        if (!summaryResult || !summaryResult.summary) {
          throw new Error('Invalid summary format');
        }
        
        // Ensure all required fields are present
        summaryResult = {
          summary: summaryResult.summary,
          keyPoints: summaryResult.keyPoints || [],
          ...(options.includeIntentAnalysis && summaryResult.customerIntent ? {
            customerIntent: {
              primary: summaryResult.customerIntent.primary || 'Unknown',
              secondary: summaryResult.customerIntent.secondary || [],
              satisfaction: (summaryResult.customerIntent.satisfaction as any) || 'neutral'
            }
          } : {}),
          ...(options.includeNextSteps && summaryResult.nextSteps ? {
            nextSteps: summaryResult.nextSteps
          } : {}),
          topics: summaryResult.topics || [],
          metrics: {
            customerSentiment: summaryResult.metrics?.customerSentiment || 'neutral',
            ...(summaryResult.metrics?.agentResponseQuality ? {
              agentResponseQuality: summaryResult.metrics.agentResponseQuality
            } : {}),
            resolutionStatus: summaryResult.metrics?.resolutionStatus || 'pending'
          }
        };
        
        logger.debug('Successfully parsed conversation summary');
        
      } catch (e) {
        logger.warn('Failed to parse summary response, using fallback', {
          error: e instanceof Error ? e.message : String(e),
          responsePreview: generatedText.substring(0, 100) + '...'
        });
        
        // Create a simple fallback summary
        summaryResult = this.createFallbackSummary(options.conversation, options);
      }

      // Track token usage if tracker is available
      if (this.tokenTracker && options.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for conversation summary', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }
      
      // Prepare the result
      const result: AITaskResult<typeof summaryResult> = {
        success: true,
        data: summaryResult,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };
      
      // Cache the result
      const cacheTtl = options.metadata?.cacheTtl as number || 60 * 60 * 24; // Default 24 hours (conversations don't change)
      this.cache.set(cacheKey, result, cacheTtl);
      logger.debug('Cached conversation summary', { ttl: cacheTtl });
      
      return result;
    } catch (error) {
      logger.error('Error summarizing conversation', {
        error: error instanceof Error ? error.message : String(error),
        messageCount: options.conversation?.length
      });
      
      // Create basic fallback summary
      const fallbackSummary = this.createFallbackSummary(options.conversation || [], options);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error summarizing conversation',
        data: fallbackSummary
      };
    }
  }
  
  /**
   * Create a fallback summary when AI summarization fails
   * @param conversation Conversation messages
   * @param options Original summarization options
   * @returns Basic summary data
   */
  private createFallbackSummary(
    conversation: Array<{
      id: string;
      content: string;
      role: 'customer' | 'agent' | 'system';
      author?: string;
      timestamp?: Date | string;
      metadata?: Record<string, any>;
    }>,
    options?: {
      format?: 'bullet' | 'paragraph' | 'structured';
      includeIntentAnalysis?: boolean;
      includeNextSteps?: boolean;
      maxLength?: number;
      focusAreas?: string[];
    }
  ): {
    summary: string;
    keyPoints: string[];
    customerIntent?: {
      primary: string;
      secondary?: string[];
      satisfaction: 'satisfied' | 'neutral' | 'unsatisfied';
    };
    nextSteps?: string[];
    topics: string[];
    metrics: {
      customerSentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
      agentResponseQuality?: 'excellent' | 'good' | 'average' | 'poor';
      resolutionStatus: 'resolved' | 'pending' | 'escalated' | 'unresolved';
    };
  } {
    // Extract basic statistics
    const customerMessages = conversation.filter(m => m.role === 'customer');
    const agentMessages = conversation.filter(m => m.role === 'agent');
    
    // Create basic summary
    let summary = `Conversation with ${customerMessages.length} customer message(s) and ${agentMessages.length} agent message(s).`;
    
    // Add first and last message summary if available
    if (conversation.length > 0) {
      const firstMessage = conversation[0];
      const lastMessage = conversation[conversation.length - 1];
      
      // Add first message preview (truncated)
      const firstMessagePreview = firstMessage.content.length > 50 ? 
        firstMessage.content.substring(0, 50) + '...' : 
        firstMessage.content;
      
      summary += ` Started with: "${firstMessagePreview}"`;
      
      // Add last message if different from first
      if (conversation.length > 1) {
        const lastMessagePreview = lastMessage.content.length > 50 ? 
          lastMessage.content.substring(0, 50) + '...' : 
          lastMessage.content;
        
        summary += ` Ended with: "${lastMessagePreview}"`;
      }
    }
    
    // Extract potential key points (first line of each customer message)
    const keyPoints = customerMessages
      .map(m => m.content.split('\n')[0])
      .filter(line => line && line.length > 10)
      .slice(0, 3);
    
    // Extract potential topics using keyword frequency
    const allText = conversation.map(m => m.content).join(' ').toLowerCase();
    const words = allText.split(/\W+/).filter(word => word.length > 3);
    const wordFrequency: Record<string, number> = {};
    
    words.forEach(word => {
      if (!wordFrequency[word]) {
        wordFrequency[word] = 0;
      }
      wordFrequency[word]++;
    });
    
    // Get top 3 most frequent words as topics
    const topics = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
    
    // Determine simple sentiment
    let customerSentiment: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
    const lastCustomerMessage = customerMessages[customerMessages.length - 1]?.content.toLowerCase() || '';
    
    if (lastCustomerMessage.includes('thank') || 
        lastCustomerMessage.includes('happy') || 
        lastCustomerMessage.includes('great') || 
        lastCustomerMessage.includes('resolved')) {
      customerSentiment = 'positive';
    } else if (lastCustomerMessage.includes('not') || 
               lastCustomerMessage.includes('issue') || 
               lastCustomerMessage.includes('problem') || 
               lastCustomerMessage.includes('disappointed')) {
      customerSentiment = 'negative';
    }
    
    // Determine resolution status
    let resolutionStatus: 'resolved' | 'pending' | 'escalated' | 'unresolved' = 'pending';
    
    const lastMessage = conversation[conversation.length - 1];
    if (lastMessage?.role === 'customer') {
      // If last message is from customer, likely unresolved
      resolutionStatus = 'pending';
    } else if (lastMessage?.content.toLowerCase().includes('escalat')) {
      resolutionStatus = 'escalated';
    } else if (lastMessage?.content.toLowerCase().includes('resolv') || 
               lastMessage?.content.toLowerCase().includes('complet') ||
               lastMessage?.content.toLowerCase().includes('done')) {
      resolutionStatus = 'resolved';
    }
    
    // Build the fallback result
    const result: {
      summary: string;
      keyPoints: string[];
      customerIntent?: {
        primary: string;
        secondary?: string[];
        satisfaction: 'satisfied' | 'neutral' | 'unsatisfied';
      };
      nextSteps?: string[];
      topics: string[];
      metrics: {
        customerSentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
        agentResponseQuality?: 'excellent' | 'good' | 'average' | 'poor';
        resolutionStatus: 'resolved' | 'pending' | 'escalated' | 'unresolved';
      };
    } = {
      summary,
      keyPoints: keyPoints.length > 0 ? keyPoints : ['No clear key points identified'],
      topics: topics.length > 0 ? topics : ['general'],
      metrics: {
        customerSentiment,
        resolutionStatus
      }
    };
    
    // Add optional fields based on original request
    if (options?.includeIntentAnalysis) {
      result.customerIntent = {
        primary: 'Information or support',
        satisfaction: customerSentiment === 'positive' ? 'satisfied' : 
                      (customerSentiment === 'negative' ? 'unsatisfied' : 'neutral')
      };
    }
    
    if (options?.includeNextSteps) {
      result.nextSteps = [
        resolutionStatus === 'resolved' ? 'Follow up for satisfaction confirmation' : 'Continue addressing customer concerns',
        'Document conversation in CRM'
      ];
    }
    
    return result;
  }

  /**
   * Generate a personalized reply to a message with conversation context
   * Creates a response tailored to the message, platform, and brand voice
   * 
   * @param message The message to respond to
   * @param context Additional context for crafting the response
   * @param options Request options
   * @returns Generated reply text
   */
  async generateReply(
    message: string,
    context: {
      previousMessages?: Array<{ role: string; content: string }>;
      platform?: string;
      brandVoice?: string;
    },
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>> {
    try {
      if (!message) {
        throw new Error('Message is required for generating a reply');
      }

      logger.debug('Generating reply', { 
        messageLength: message.length,
        hasPreviousMessages: !!context.previousMessages?.length,
        platform: context.platform,
        brandVoice: context.brandVoice
      });
      
      // Create a cache key based on message and context
      const messageHash = this.hashString(message);
      const contextHash = this.hashObject(context);
      const cacheKey = `reply:${messageHash}:${contextHash}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<string>>(cacheKey);
        if (cachedResult) {
          logger.debug('Returning cached reply');
          return cachedResult;
        }
      }
      
      // Prepare previous messages if available
      let conversationContext = '';
      if (context.previousMessages && context.previousMessages.length > 0) {
        conversationContext = 'Previous messages:\n' + 
          context.previousMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      }
      
      // Prepare platform-specific guidance
      let platformGuidance = '';
      if (context.platform) {
        platformGuidance = this.getPlatformReplyGuidance(context.platform);
      }
      
      // Prepare brand voice guidance
      let brandVoiceGuidance = '';
      if (context.brandVoice) {
        brandVoiceGuidance = `Brand voice should be: ${context.brandVoice}`;
      } else {
        brandVoiceGuidance = 'Brand voice should be professional, helpful, and friendly.';
      }
      
      // Build the prompt
      const prompt = `
        Generate a thoughtful, appropriate reply to the following message:
        
        MESSAGE TO REPLY TO:
        "${message}"
        
        ${conversationContext ? `\n${conversationContext}\n` : ''}
        ${platformGuidance ? `\n${platformGuidance}\n` : ''}
        ${brandVoiceGuidance ? `\n${brandVoiceGuidance}\n` : ''}
        
        Guidelines for your reply:
        - Be professional and helpful
        - Address the specific points raised in the message
        - Use a conversational, natural tone
        - Be concise but thorough
        - Do not use templates that sound robotic
        - Respond as if you are representing the brand directly
        - Do not include labels, prefixes, or explanations (just the reply itself)
      `.trim();
      
      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the reply
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || 500,
        temperature: options?.temperature || 0.7
      });
      
      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;
      
      // Remove any prefixes that the model might have added
      let cleanedReply = generatedText.trim();
      
      // Remove patterns like "Reply:" or "Agent:" at the beginning
      cleanedReply = cleanedReply.replace(/^(Reply|Response|Agent|Assistant|Representative|Our response|We would respond)[:]\s*/i, '');
      
      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for reply generation', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }
      
      // Prepare the result
      const result: AITaskResult<string> = {
        success: true,
        data: cleanedReply,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };
      
      // Cache the result unless skipCache is set
      if (!options?.skipCache) {
        this.cache.set(cacheKey, result, options?.cacheTtl);
        logger.debug('Cached generated reply');
      }
      
      return result;
    } catch (error) {
      logger.error('Error generating reply', {
        error: error instanceof Error ? error.message : String(error),
        messageLength: message?.length
      });
      
      // Return a generic fallback response in case of error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating reply',
        data: 'Thank you for your message. We appreciate your feedback and will look into this further.'
      };
    }
  }

  /**
   * Get platform-specific guidance for replies
   */
  private getPlatformReplyGuidance(platform: string): string {
    const platformLower = platform.toLowerCase();
    
    if (platformLower.includes('twitter') || platformLower.includes('x')) {
      return `
        For Twitter/X replies:
        - Keep it brief (ideally under 280 characters)
        - Be conversational and personable
        - Use relevant hashtags sparingly if appropriate
        - Consider using emoji for a friendly tone
        - Include a call to action if appropriate
      `;
    } else if (platformLower.includes('instagram')) {
      return `
        For Instagram replies:
        - Keep it light and personable
        - Show appreciation for engagement
        - Use emoji naturally to convey tone
        - Tag the user with @ if applicable
        - Keep sentences short and easy to read on mobile
      `;
    } else if (platformLower.includes('facebook')) {
      return `
        For Facebook replies:
        - Be conversational and friendly
        - Address the person by name if available
        - Express gratitude for their engagement
        - Provide value in your response
        - Use emoji where appropriate
      `;
    } else if (platformLower.includes('linkedin')) {
      return `
        For LinkedIn replies:
        - Maintain a professional tone
        - Be thoughtful and substantive
        - Avoid overly casual language or excessive emoji
        - Provide valuable insights when possible
        - Be concise but complete
      `;
    } else if (platformLower.includes('email')) {
      return `
        For Email replies:
        - Use a professional but warm tone
        - Include a greeting and closing
        - Be thorough and address all points raised
        - Format for readability with paragraphs
        - Include a clear next step or call to action if appropriate
      `;
    } else if (platformLower.includes('whatsapp') || platformLower.includes('messenger')) {
      return `
        For messaging app replies:
        - Be conversational and direct
        - Use shorter sentences for easy mobile reading
        - Respond promptly to maintain conversation flow
        - Use emoji naturally but not excessively
        - Be helpful and solution-focused
      `;
    } else {
      return `
        For platform replies:
        - Be professional and helpful
        - Address specific points raised in the message
        - Express appreciation for engagement
        - Be concise but thorough
        - Use a natural, conversational tone
      `;
    }
  }

  /**
   * Suggest multiple reply options for a message
   * Alias for suggestResponses with simplified parameters
   * 
   * @param message Message to respond to
   * @param context Additional context for responses
   * @param count Number of suggestions to return
   * @param options Request options
   * @returns Array of suggested replies
   */
  async suggestReplies(
    message: string,
    context?: {
      platform?: string;
      brandVoice?: string;
    },
    count: number = 3,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string[]>> {
    // This is an adapter that calls the existing suggestResponses method
    
    const formattedContext = context ? 
      `Platform: ${context.platform || 'default'}\nBrand voice: ${context.brandVoice || 'professional'}` : 
      undefined;
    
    return this.suggestResponses(message, formattedContext, count, options);
  }
  
  /**
   * Categorize sentiment and determine if a response is needed
   * Analyzes message sentiment, urgency and categorizes the content
   * 
   * @param message Message to analyze
   * @param options Request options
   * @returns Sentiment analysis and response recommendation
   */
  async categorizeSentiment(
    message: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: 'low' | 'medium' | 'high';
    category: string;
    needsResponse: boolean;
  }>> {
    try {
      // Input validation
      if (!message || message.trim().length === 0) {
        logger.warn('Invalid input for sentiment categorization', { 
          messageLength: message?.length || 0
        });
        
        return {
          success: false,
          error: 'No valid message provided for sentiment analysis',
          data: {
            sentiment: 'neutral',
            urgency: 'low',
            category: 'uncategorized',
            needsResponse: false
          }
        };
      }

      logger.debug('Categorizing message sentiment', {
        messageLength: message.length
      });
      
      // Create cache key
      const messageHash = this.hashString(message);
      const cacheKey = `sentiment:${messageHash}`;
      
      // Check cache unless explicitly skipped
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<{
          sentiment: 'positive' | 'neutral' | 'negative';
          urgency: 'low' | 'medium' | 'high';
          category: string;
          needsResponse: boolean;
        }>>(cacheKey);
        
        if (cachedResult) {
          logger.debug('Returning cached sentiment categorization');
          return cachedResult;
        }
      }
      
      // For very short messages, use a simplified approach
      if (message.length < 15) {
        return this.simpleCategorizeSentiment(message, options);
      }
      
      // Create the prompt
      const prompt = `
        Analyze the following message and determine:
        
        1. The sentiment (positive, neutral, or negative)
        2. The urgency level (low, medium, or high)
        3. The category of the message (e.g., feedback, question, complaint, etc.)
        4. Whether the message needs a response (true or false)
        
        Message: "${message}"
        
        Return your analysis as a JSON object in exactly this format:
        {
          "sentiment": "positive" | "neutral" | "negative",
          "urgency": "low" | "medium" | "high",
          "category": "category-name",
          "needsResponse": true | false
        }
      `;
      
      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      logger.debug('Generating sentiment categorization with AI', { 
        promptTokens: estimatedPromptTokens 
      });
      
      // Generate the analysis
      const generatedText = await this.provider.generateText(prompt, {
        temperature: options?.temperature || 0.3,
        maxTokens: options?.maxTokens || 200
      });
      
      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;
      
      // Parse the response as JSON
      let categorization: {
        sentiment: 'positive' | 'neutral' | 'negative';
        urgency: 'low' | 'medium' | 'high';
        category: string;
        needsResponse: boolean;
      };
      
      try {
        // Extract JSON from the response (in case the model includes extra text)
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : generatedText;
        
        const parsedResult = JSON.parse(jsonStr);
        
        // Validate and normalize fields
        categorization = {
          sentiment: this.normalizeToEnum(parsedResult.sentiment, ['positive', 'neutral', 'negative'], 'neutral'),
          urgency: this.normalizeToEnum(parsedResult.urgency, ['low', 'medium', 'high'], 'medium'),
          category: parsedResult.category || 'general',
          needsResponse: typeof parsedResult.needsResponse === 'boolean' ? 
            parsedResult.needsResponse : 
            true // Default to needing a response if unclear
        };
        
        logger.debug('Successfully parsed sentiment categorization', { 
          sentiment: categorization.sentiment,
          needsResponse: categorization.needsResponse
        });
      } catch (e) {
        logger.warn('Failed to parse sentiment categorization, using fallback', {
          error: e instanceof Error ? e.message : String(e),
          responsePreview: generatedText.substring(0, 100) + '...'
        });
        
        // Create a fallback categorization based on simple keyword analysis
        categorization = this.createFallbackSentimentCategorization(message);
      }
      
      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for sentiment categorization', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }
      
      // Prepare the result
      const result: AITaskResult<typeof categorization> = {
        success: true,
        data: categorization,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };
      
      // Cache the result
      const cacheTtl = options?.cacheTtl || 60 * 60 * 24; // Default 24 hours
      this.cache.set(cacheKey, result, cacheTtl);
      logger.debug('Cached sentiment categorization', { ttl: cacheTtl });
      
      return result;
    } catch (error) {
      logger.error('Error categorizing sentiment', {
        error: error instanceof Error ? error.message : String(error),
        messageLength: message?.length
      });
      
      // Provide fallback categorization
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error categorizing sentiment',
        data: this.createFallbackSentimentCategorization(message)
      };
    }
  }
  
  /**
   * Simplified sentiment categorization for very short messages
   * Uses lightweight approach for minimal token usage
   * 
   * @param message Message to analyze
   * @param options Request options
   * @returns Sentiment analysis with minimal processing
   */
  private async simpleCategorizeSentiment(
    message: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: 'low' | 'medium' | 'high';
    category: string;
    needsResponse: boolean;
  }>> {
    // For very short messages, create a simplified categorization
    logger.debug('Using simplified sentiment categorization for short message', { 
      messageLength: message.length 
    });
    
    // Use the fallback categorization as the data
    const categorization = this.createFallbackSentimentCategorization(message);
    
    // For very short messages, we still want to track some token usage
    if (this.tokenTracker && options?.metadata?.userId) {
      const userId = options.metadata.userId as string;
      const orgId = options.metadata.organizationId as string;
      
      // Track minimal token usage (since we're not calling AI)
      await this.tokenTracker.trackUsage(userId, 10, orgId);
    }
    
    return {
      success: true,
      data: categorization,
      tokenUsage: {
        prompt: 5,
        completion: 5,
        total: 10
      }
    };
  }
  
  /**
   * Create a fallback sentiment categorization using rule-based approach
   * @param message Message to analyze
   * @returns Simple sentiment categorization
   */
  private createFallbackSentimentCategorization(message: string): {
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: 'low' | 'medium' | 'high';
    category: string;
    needsResponse: boolean;
  } {
    const lowerMessage = message.toLowerCase();
    
    // Determine sentiment based on keywords
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    
    const positiveWords = ['thank', 'great', 'good', 'love', 'awesome', 'excellent'];
    const negativeWords = ['bad', 'issue', 'problem', 'unhappy', 'disappointed', 'not working'];
    
    const hasPositiveWords = positiveWords.some(word => lowerMessage.includes(word));
    const hasNegativeWords = negativeWords.some(word => lowerMessage.includes(word));
    
    if (hasPositiveWords && !hasNegativeWords) {
      sentiment = 'positive';
    } else if (hasNegativeWords) {
      sentiment = 'negative';
    }
    
    // Determine urgency based on keywords and punctuation
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    
    const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical'];
    const urgentPunctuation = message.includes('?') || message.includes('!');
    
    if (urgentWords.some(word => lowerMessage.includes(word))) {
      urgency = 'high';
    } else if (sentiment === 'negative' && urgentPunctuation) {
      urgency = 'high';
    } else if (sentiment === 'positive') {
      urgency = 'low';
    }
    
    // Determine category based on keywords
    let category = 'general';
    
    if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('?')) {
      category = 'question';
    } else if (lowerMessage.includes('thank') || lowerMessage.includes('appreciation')) {
      category = 'feedback';
    } else if (hasNegativeWords) {
      category = 'complaint';
    }
    
    // Determine if a response is needed
    // Questions, complaints, and most medium/high urgency items need responses
    const needsResponse = category === 'question' || 
                          category === 'complaint' || 
                          urgency === 'high' || 
                          (urgency === 'medium' && sentiment !== 'positive');
    
    return {
      sentiment,
      urgency,
      category,
      needsResponse
    };
  }
  
  /**
   * Normalize a value to a valid enum option
   * @param value Value to normalize
   * @param validOptions Array of valid options
   * @param defaultValue Default if not found
   * @returns Normalized value
   */
  private normalizeToEnum<T extends string>(value: any, validOptions: T[], defaultValue: T): T {
    if (typeof value === 'string' && validOptions.includes(value.toLowerCase() as T)) {
      return value.toLowerCase() as T;
    }
    return defaultValue;
  }
}

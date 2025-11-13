import { AIProvider } from '../../providers/AIProviderFactory';
import { ContentGenerator, AITaskResult, ToolkitRequestOptions, PostGenerationParams, CaptionGenerationParams, HashtagGenerationParams } from '../interfaces';
import { TokenTracker } from '../../../tokens/token-tracker';
import { estimateTokenUsage } from '../../utils/token-counter';
import { Cache } from '../../../../core/cache/Cache';
import { logger } from '../../../../core/logging/logger';

/**
 * Implementation of ContentGenerator that uses AI providers to generate content
 * Full production-ready implementation with proper token tracking and caching
 */
export class ContentGeneratorImpl implements ContentGenerator {
  private provider: AIProvider;
  private tokenTracker?: TokenTracker;
  private cache: Cache;

  /**
   * Create a content generator
   * @param provider AI provider instance
   * @param tokenTracker Optional token usage tracker
   */
  constructor(provider: AIProvider, tokenTracker?: TokenTracker) {
    this.provider = provider;
    this.tokenTracker = tokenTracker;
    this.cache = new Cache('content-generator', {
      ttl: 60 * 60, // 1 hour default cache TTL
      maxSize: 500  // Maximum number of items in the cache
    });
    
    logger.info('ContentGenerator initialized', { 
      hasTokenTracker: !!tokenTracker
    });
  }

  /**
   * Update the AI provider used by this generator
   * @param provider New AI provider
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
    logger.debug('ContentGenerator provider updated');
  }

  /**
   * Generate a social media post based on the given parameters
   * Supports both old and new method signatures
   * @param topicOrParams Either a topic string or a PostGenerationParams object
   * @param platformOrOptions Either a platform string or ToolkitRequestOptions
   * @param length Optional content length parameter (for old signature)
   * @param tone Optional tone parameter (for old signature)
   * @param options Optional toolkit options (for old signature)
   * @returns Generated post content with token usage tracking
   */
  async generatePost(
    topicOrParams: string | PostGenerationParams,
    platformOrOptions?: string | ToolkitRequestOptions,
    length?: 'short' | 'medium' | 'long',
    tone?: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>> {
    // Handle both method signatures
    if (typeof topicOrParams === 'string') {
      // Old method signature
      const topic = topicOrParams;
      const platform = platformOrOptions as string;
      
      // Convert old parameters to new format
      const params: PostGenerationParams = {
        topic,
        platform,
        length: length || 'medium',
        tone: (tone || 'casual') as 'professional' | 'casual' | 'humorous' | 'informative',
        includeHashtags: false,
        includeEmojis: false,
        keyMessages: []
      };
      
      return this.generatePostImpl(params, options);
    } else {
      // New method signature
      return this.generatePostImpl(topicOrParams, platformOrOptions as ToolkitRequestOptions);
    }
  }

  /**
   * Implementation of post generation logic
   * @param params Post generation parameters
   * @param options Request options
   * @returns Generated post content with token usage tracking
   */
  private async generatePostImpl(
    params: PostGenerationParams,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>> {
    try {
      logger.debug('Generating post', { 
        platform: params.platform, 
        topic: params.topic,
        length: params.length
      });
      
      // Create cache key from params
      const cacheKey = `post:${params.platform}:${params.topic}:${params.length}:${params.tone}:${params.includeHashtags}:${params.includeEmojis}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<string>>(cacheKey);
        if (cachedResult) {
          logger.debug('Returning cached post content', { 
            topic: params.topic,
            platform: params.platform
          });
          return cachedResult;
        }
      }

      // Prepare prompt for the AI
      const lengthGuidance = this.getLengthGuidance(params.platform, params.length);
      const keyMessagesText = params.keyMessages && params.keyMessages.length > 0 
        ? `\nKey points to include:\n${params.keyMessages.map(msg => `- ${msg}`).join('\n')}`
        : '';
        
      const prompt = `
        Create a ${params.tone} social media post for ${params.platform} about "${params.topic}".
        ${lengthGuidance}
        ${keyMessagesText}
        ${params.includeHashtags ? 'Include appropriate hashtags that would perform well on this platform.' : ''}
        ${params.includeEmojis ? 'Include suitable emojis to enhance engagement.' : ''}
        Make it engaging, conversational, and appropriate for the platform.
        Include any relevant formatting (like line breaks) that would work well on ${params.platform}.
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the content with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || this.getMaxTokensByLength(params.length),
        temperature: options?.temperature || this.getTemperatureForTone(params.tone)
      });

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
          await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for post generation', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }

      // Prepare the result
      const result: AITaskResult<string> = {
        success: true,
        data: generatedText,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };

      // Cache the result unless skipCache is set
      if (!options?.skipCache) {
        this.cache.set(cacheKey, result, options?.cacheTtl);
      }

      logger.debug('Post generation complete', { 
        platform: params.platform, 
        topic: params.topic,
        contentLength: generatedText.length
      });

      return result;
    } catch (error) {
      logger.error('Error generating post', { 
        error: error instanceof Error ? error.message : String(error),
        platform: params.platform,
        topic: params.topic
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating post',
        data: `We couldn't generate your post about "${params.topic}" at this time. Please try again later.`
      };
    }
  }

  /**
   * Generate an engaging caption for an image or video
   * Supports both old and new method signatures
   * @param mediaTypeOrParams Either a media type string or a CaptionGenerationParams object
   * @param descriptionOrOptions Either a description string or ToolkitRequestOptions
   * @param contextOrOptions Optional context string or ToolkitRequestOptions
   * @param oldOptions Optional toolkit options (for old signature)
   * @returns Generated caption with token usage tracking
   */
  async generateCaption(
    mediaTypeOrParams: 'image' | 'video' | CaptionGenerationParams,
    descriptionOrOptions?: string | ToolkitRequestOptions,
    contextOrOptions?: string | ToolkitRequestOptions,
    oldOptions?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>> {
    // Handle both method signatures
    if (typeof mediaTypeOrParams === 'string') {
      // Old method signature
      const mediaType = mediaTypeOrParams;
      const description = descriptionOrOptions as string;
      const context = typeof contextOrOptions === 'string' ? contextOrOptions : undefined;
      const options = typeof contextOrOptions === 'object' ? contextOrOptions : oldOptions;
      
      // Choose an appropriate platform based on media type
      let platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin';
      if (mediaType === 'video') {
        platform = 'facebook'; // Use Facebook as default for video content
      } else {
        platform = 'instagram'; // Use Instagram as default for image content
      }
      
      // Convert old parameters to new format
      const params: CaptionGenerationParams = {
        imageDescription: description,
        brandVoice: context || 'professional',
        purpose: 'engagement',
        length: 'medium',
        includeHashtags: false,
        platform
      };
      
      return this.generateCaptionImpl(params, options);
    } else {
      // New method signature
      return this.generateCaptionImpl(mediaTypeOrParams, descriptionOrOptions as ToolkitRequestOptions);
    }
  }

  /**
   * Implementation of caption generation logic
   * @param params Caption generation parameters
   * @param options Request options
   * @returns Generated caption with token usage tracking
   */
  private async generateCaptionImpl(
    params: CaptionGenerationParams,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>> {
    try {
      logger.debug('Generating caption', { 
        platform: params.platform,
        purpose: params.purpose,
        length: params.length
      });
      
      // Create cache key from params
      const cacheKey = `caption:${params.platform}:${params.imageDescription.substring(0, 50)}:${params.length}:${params.purpose}:${params.includeHashtags}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<string>>(cacheKey);
        if (cachedResult) {
          logger.debug('Returning cached caption', { 
            platform: params.platform,
            purpose: params.purpose
          });
          return cachedResult;
        }
      }

      // Prepare prompt for the AI
      const lengthGuidance = this.getLengthGuidance(params.platform, params.length);
      const prompt = `
        Create an engaging ${params.length} caption for ${params.platform} that describes:
        
        IMAGE DESCRIPTION: ${params.imageDescription}
        
        BRAND VOICE: ${params.brandVoice}
        PURPOSE: ${params.purpose}
        
        ${lengthGuidance}
        ${params.includeHashtags ? 'Include appropriate hashtags that would perform well on this platform.' : ''}
        
        The caption should be attention-grabbing, relevant to the content, and include emotional appeal.
        Make it conversational and authentic, matching the specified brand voice.
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the content with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || this.getMaxTokensByLength(params.length),
        temperature: options?.temperature || 0.7
      });

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
          await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for caption generation', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }

      // Prepare the result
      const result: AITaskResult<string> = {
        success: true,
        data: generatedText,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };

      // Cache the result unless skipCache is set
      if (!options?.skipCache) {
        this.cache.set(cacheKey, result, options?.cacheTtl);
      }

      logger.debug('Caption generation complete', { 
        platform: params.platform,
        contentLength: generatedText.length
      });

      return result;
    } catch (error) {
      logger.error('Error generating caption', { 
        error: error instanceof Error ? error.message : String(error),
        platform: params.platform
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating caption',
        data: 'We couldn\'t generate your caption at this time. Please try again later.'
      };
    }
  }

  /**
   * Generate hashtags for a post
   * Supports both old and new method signatures
   * @param contentOrParams Either a content string or a HashtagGenerationParams object
   * @param platformOrOptions Either a platform string or ToolkitRequestOptions
   * @param countOrOptions Optional hashtag count or ToolkitRequestOptions
   * @param oldOptions Optional toolkit options (for old signature)
   * @returns Generated hashtags with token usage tracking
   */
  async generateHashtags(
    contentOrParams: string | HashtagGenerationParams,
    platformOrOptions?: string | ToolkitRequestOptions,
    countOrOptions?: number | ToolkitRequestOptions,
    oldOptions?: ToolkitRequestOptions
  ): Promise<AITaskResult<string[]>> {
    // Handle both method signatures
    if (typeof contentOrParams === 'string') {
      // Old method signature
      const content = contentOrParams;
      const platform = platformOrOptions as string;
      const count = typeof countOrOptions === 'number' ? countOrOptions : 10;
      const options = typeof countOrOptions === 'object' ? countOrOptions : oldOptions;
      
      // Convert old parameters to new format
      const params: HashtagGenerationParams = {
        content,
        platform: platform as any, // Type coercion for simplicity
        count,
        relevance: 'medium'
      };
      
      return this.generateHashtagsImpl(params, options);
    } else {
      // New method signature
      return this.generateHashtagsImpl(contentOrParams, platformOrOptions as ToolkitRequestOptions);
    }
  }

  /**
   * Implementation of hashtag generation logic
   * @param params Hashtag generation parameters
   * @param options Request options
   * @returns Generated hashtags with token usage tracking
   */
  private async generateHashtagsImpl(
    params: HashtagGenerationParams,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string[]>> {
    try {
      logger.debug('Generating hashtags', { 
        platform: params.platform,
        count: params.count,
        relevance: params.relevance
      });
      
      // Create cache key from params
      const cacheKey = `hashtags:${params.platform}:${params.content.substring(0, 50)}:${params.count}:${params.relevance}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<string[]>>(cacheKey);
        if (cachedResult) {
          logger.debug('Returning cached hashtags', { 
            platform: params.platform,
            count: params.count
          });
          return cachedResult;
        }
      }

      // Prepare prompt for the AI
      const relevanceGuidance = {
        high: 'Focus on very specific, niche hashtags directly related to the content.',
        medium: 'Balance between specific hashtags and moderately popular ones.',
        broad: 'Include some popular, trending hashtags to maximize visibility.'
      }[params.relevance];

      const prompt = `
        Generate ${params.count} relevant hashtags for a ${params.platform} post about:
        
        ${params.content}
        
        ${relevanceGuidance}
        Consider trending topics, relevance, and discoverability.
        Format your response as a JSON array of hashtag strings (without the # symbol).
        Example: ["marketing", "socialmedia", "digitalstrategy"]
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the content with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || 200,
        temperature: options?.temperature || 0.6
      });

      // Parse the JSON response
      let hashtags: string[];
      try {
        hashtags = JSON.parse(generatedText);
        // Make sure we have an array of strings and add # symbol
        hashtags = hashtags
          .filter(tag => typeof tag === 'string')
          .map(tag => tag.replace(/^#/, '')) // Remove # if already present
          .slice(0, params.count); // Limit to requested count
      } catch (e) {
        // If parsing fails, try to extract tags using regex
        logger.warn('Error parsing hashtags JSON, falling back to regex extraction', {
          error: e instanceof Error ? e.message : String(e)
        });
        
        const matches = generatedText.match(/"([^"]+)"/g) || [];
        hashtags = matches
          .map(match => match.replace(/"/g, '').replace(/^#/, ''))
          .slice(0, params.count);

        // If still empty, provide fallback hashtags
        if (hashtags.length === 0) {
          hashtags = this.getFallbackHashtags(params.platform, params.count);
        }
      }

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
          await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for hashtag generation', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }

      // Prepare the result
      const result: AITaskResult<string[]> = {
        success: true,
        data: hashtags,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };

      // Cache the result unless skipCache is set
      if (!options?.skipCache) {
        this.cache.set(cacheKey, result, options?.cacheTtl);
      }

      logger.debug('Hashtag generation complete', { 
        platform: params.platform,
        hashtagCount: hashtags.length
      });

      return result;
    } catch (error) {
      logger.error('Error generating hashtags', { 
        error: error instanceof Error ? error.message : String(error),
        platform: params.platform
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating hashtags',
        data: this.getFallbackHashtags(params.platform, params.count)
      };
    }
  }

  /**
   * Generate variations of content
   * @param originalContent Original content
   * @param count Number of variations to generate
   * @param options Request options
   * @returns Content variations with token usage tracking
   */
  async generateVariations(
    originalContent: string,
    count: number = 3,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string[]>> {
    try {
      logger.debug('Generating content variations', { 
        contentLength: originalContent.length, 
        variationCount: count
      });
      
      // Create cache key
      const cacheKey = `variations:${originalContent.substring(0, 100)}:${count}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<string[]>>(cacheKey);
        if (cachedResult) {
          logger.debug('Returning cached content variations');
          return cachedResult;
        }
      }

      // Prepare prompt for the AI
      const prompt = `
        Create ${count} unique variations of the following content.
        Maintain the same meaning and key points but vary the wording, structure, and tone.
        Each variation should be distinct from the others.
        
        ORIGINAL CONTENT:
        ${originalContent}
        
        Return each variation as a separate paragraph.
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the content with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || Math.max(originalContent.length * 4, 1000),
        temperature: options?.temperature || 0.8
      });

      // Split into separate variations
      const variations = generatedText
        .split(/\n{2,}/)
        .filter(text => text.trim().length > 0)
        .slice(0, count);
      
      // If we don't have enough variations, duplicate the last one with small changes
      while (variations.length < count) {
        if (variations.length > 0) {
          variations.push(variations[variations.length - 1] + " (Alternate version)");
        } else {
          variations.push(originalContent + " (Original content)");
        }
      }

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
          await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for content variations', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }

      // Prepare the result
      const result: AITaskResult<string[]> = {
        success: true,
        data: variations,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };

      // Cache the result unless skipCache is set
      if (!options?.skipCache) {
        this.cache.set(cacheKey, result, options?.cacheTtl);
      }

      logger.debug('Content variation generation complete', { 
        variationCount: variations.length
      });

      return result;
    } catch (error) {
      logger.error('Error generating content variations', { 
        error: error instanceof Error ? error.message : String(error),
        contentLength: originalContent.length
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating content variations',
        data: [originalContent]
      };
    }
  }

  /**
   * Improve existing content based on instructions
   * @param content Original content to improve
   * @param instructions Instructions for improvement
   * @param options Optional toolkit request options
   * @returns Improved content with token usage tracking
   */
  async improveContent(
    content: string,
    instructions: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>> {
    try {
      logger.debug('Improving content', { 
        contentLength: content.length,
        instructionsLength: instructions.length
      });
      
      // Create cache key from content and instructions (hashed to keep the key short)
      const contentHash = this.hashString(content);
      const instructionsHash = this.hashString(instructions);
      const cacheKey = `improve:${contentHash}:${instructionsHash}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<string>>(cacheKey);
        if (cachedResult) {
          logger.debug('Returning cached improved content');
          return cachedResult;
        }
      }

      // Prepare prompt for the AI
      const prompt = `
        Improve the following content based on the provided instructions.
        
        ORIGINAL CONTENT:
        ${content}
        
        IMPROVEMENT INSTRUCTIONS:
        ${instructions}
        
        Please provide the improved version of the content with all the requested changes.
        Maintain the overall purpose and meaning of the original content while enhancing it.
        Format the response so it can be used directly without requiring further editing.
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate improved content with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || Math.max(500, content.length * 1.5),
        temperature: options?.temperature || 0.5
      });

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for content improvement', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }

      // Prepare the result
      const result: AITaskResult<string> = {
        success: true,
        data: generatedText,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };

      // Cache the result unless skipCache is set
      if (!options?.skipCache) {
        this.cache.set(cacheKey, result, options?.cacheTtl);
      }

      logger.debug('Content improvement complete', {
        originalLength: content.length,
        improvedLength: generatedText.length
      });

      return result;
    } catch (error) {
      logger.error('Error improving content', {
        error: error instanceof Error ? error.message : String(error),
        contentLength: content.length
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error improving content',
        data: content // Return original content as fallback
      };
    }
  }

  /**
   * Get appropriate token limit based on content length
   * @param length Desired content length
   * @returns Maximum tokens to generate
   */
  private getMaxTokensByLength(length: 'short' | 'medium' | 'long'): number {
    const lengthMap: Record<string, number> = {
      'short': 150,
      'medium': 300,
      'long': 600
    };
    return lengthMap[length] || 300;
  }

  /**
   * Get appropriate temperature based on tone
   * @param tone Desired content tone
   * @returns Temperature value (0-1)
   */
  private getTemperatureForTone(tone: string): number {
    const toneMap: Record<string, number> = {
      'professional': 0.3,
      'casual': 0.6,
      'humorous': 0.8,
      'informative': 0.4,
      'friendly': 0.5,
      'authoritative': 0.3,
      'enthusiastic': 0.7
    };
    return toneMap[tone] || 0.5;
  }

  /**
   * Get platform-specific length guidance
   * @param platform Target platform
   * @param length Desired content length
   * @returns Guidance text for prompt
   */
  private getLengthGuidance(platform: string, length: 'short' | 'medium' | 'long'): string {
    const platformMap: Record<string, Record<string, string>> = {
      'twitter': {
        'short': 'Keep it under 140 characters.',
        'medium': 'Aim for 200-240 characters.',
        'long': 'Use up to 280 characters, the full tweet length.'
      },
      'instagram': {
        'short': 'Keep it concise, around 70-100 characters.',
        'medium': 'Aim for 150-200 characters, good for engagement.',
        'long': 'Use up to 2,200 characters, but focus on the first 125 characters before the "more" cut-off.'
      },
      'facebook': {
        'short': 'Keep it under 80 characters for maximum engagement.',
        'medium': 'Aim for 120-200 characters, ideal for engagement.',
        'long': 'Use up to 400 characters, but remain focused and engaging.'
      },
      'linkedin': {
        'short': 'Keep it under 150 characters, focused on professional value.',
        'medium': 'Aim for 200-600 characters, concise but with professional depth.',
        'long': 'Use up to 1,300 characters, balancing depth with readability.'
      },
      'tiktok': {
        'short': 'Keep it very brief, 80-100 characters max.',
        'medium': 'Aim for 120-150 characters, concise but descriptive.',
        'long': 'Use up to 300 characters, focusing on trending topics/hashtags.'
      },
      'pinterest': {
        'short': 'Keep it under 100 characters.',
        'medium': 'Aim for 150-200 characters with descriptive keywords.',
        'long': 'Use up to 500 characters, rich with relevant keywords.'
      },
      'threads': {
        'short': 'Keep it under 140 characters.',
        'medium': 'Aim for 200-300 characters.',
        'long': 'Use up to 500 characters.'
      },
      'youtube': {
        'short': 'Keep it under 100 characters for a concise title.',
        'medium': 'Aim for a description of about 300-500 characters.',
        'long': 'Write a detailed description of 800-1000 characters with keywords.'
      },
      'reddit': {
        'short': 'Keep it under 100 characters, focused on the key point.',
        'medium': 'Aim for 200-300 characters, clear and specific.',
        'long': 'Use up to 500 characters, but remain focused on the main topic.'
      },
      'mastodon': {
        'short': 'Keep it under 200 characters.',
        'medium': 'Aim for 300-400 characters.',
        'long': 'Use up to 500 characters, but consider readability.'
      }
    };
    
    // Get platform-specific guidance if available, otherwise use general guidance
    const platformGuidance = platformMap[platform.toLowerCase()];
    if (platformGuidance && platformGuidance[length]) {
    return platformGuidance[length];
  }

    // General guidance if platform not found
    const generalGuidance: Record<string, string> = {
      'short': 'Keep it brief and to the point.',
      'medium': 'Aim for a moderate length with enough detail.',
      'long': 'Create detailed content but remain focused and engaging.'
    };

    return generalGuidance[length] || 'Create appropriately sized content for the platform.';
  }

  /**
   * Get fallback hashtags for a platform if generation fails
   * @param platform Target platform
   * @param count Number of hashtags needed
   * @returns Array of generic hashtags
   */
  private getFallbackHashtags(platform: string, count: number): string[] {
    const platformHashtags: Record<string, string[]> = {
      'instagram': ['instagood', 'photooftheday', 'fashion', 'beautiful', 'happy', 'cute', 'tbt', 'like4like', 'followme', 'picoftheday', 'follow', 'me', 'selfie', 'summer', 'art', 'instadaily', 'friends', 'repost', 'nature', 'girl', 'fun', 'style', 'smile'],
      'twitter': ['trending', 'viral', 'tweet', 'followback', 'twitterverse', 'trending', 'news', 'socialmedia', 'follow', 'tbt', 'influencer'],
      'tiktok': ['fyp', 'foryoupage', 'viral', 'trending', 'tiktok', 'dance', 'comedy', 'duet', 'challenge', 'tiktokers']
    };

    // Get platform-specific hashtags or use general ones
    const hashtags = platformHashtags[platform.toLowerCase()] || ['socialmedia', 'digital', 'content', 'marketing', 'trending', 'follow', 'share', 'viral', 'community', 'online'];

    // Return requested count (with wrap-around if needed)
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(hashtags[i % hashtags.length]);
    }
    
    return result;
  }

  /**
   * Create a simple string hash
   * @param str String to hash
   * @returns Hashed string for caching
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36); // Convert to base-36 for shorter strings
  }

  /**
   * Generate SEO-optimized content based on keywords and topic
   * Enterprise-only feature for creating rich content that ranks well
   * 
   * @param topic Primary topic for the content
   * @param keywords Target SEO keywords to include
   * @param contentType Type of content to generate (blog, landing, product, etc)
   * @param targetWordCount Approximate target word count 
   * @param options Request options including user metadata
   * @returns SEO-optimized content with keyword density info
   */
  async generateSeoContent(
    topic: string,
    keywords: string[],
    contentType: 'blog' | 'landing' | 'product' | 'service' = 'blog',
    targetWordCount: number = 800,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    title: string;
    metaDescription: string;
    content: string;
    keywordDensity: Record<string, number>;
    readabilityScore: number;
    suggestedImprovements?: string[];
    internalLinkSuggestions?: string[];
  }>> {
    try {
      logger.debug('Generating SEO content', { 
        topic,
        keywords,
        contentType,
        targetWordCount
      });
      
      // Create cache key from params
      const keywordsHash = keywords.sort().join(',');
      const cacheKey = `seo:${topic}:${keywordsHash}:${contentType}:${targetWordCount}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<any>>(cacheKey);
        if (cachedResult) {
          logger.debug('Returning cached SEO content', { topic });
          return cachedResult;
        }
      }

      // Prepare prompt for the AI
      const prompt = `
        Generate SEO-optimized ${contentType} content about "${topic}" including these keywords: ${keywords.join(', ')}.
        
        Target word count: approximately ${targetWordCount} words.
        
        Structure your response as a JSON object with the following properties:
        - title: An SEO-optimized, engaging title including primary keyword
        - metaDescription: A compelling meta description under 160 characters that includes main keyword
        - content: The full ${contentType} content with proper HTML structuring (h2, h3, p, ul, etc)
        - keywordDensity: An object showing usage count for each keyword
        - readabilityScore: A numerical score from 0-100 estimating content readability
        - suggestedImprovements: Array of ways the content could be improved further
        - internalLinkSuggestions: Array of related topics that would make good internal links
        
        Focus on:
        - Creating valuable, informative content that answers user questions
        - Natural keyword usage that doesn't feel forced
        - Proper heading hierarchy with keywords in important headings
        - Short paragraphs and varied sentence structure for readability
        - Using lists, bullets, and subheadings to break up text
        
        Make the content genuinely helpful and informative while being optimized for search engines.
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the content with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || 3000, // Higher limit for SEO content
        temperature: options?.temperature || 0.4 // Lower temperature for factual content
      });

      // Parse the JSON response
      let parsedData;
      try {
        parsedData = JSON.parse(generatedText);
      } catch (e) {
        logger.error('Error parsing SEO content JSON', { 
          error: e instanceof Error ? e.message : String(e),
          generatedText: generatedText.substring(0, 200) + '...' // Log only the beginning
        });
        
        // Return error but still include the generated text
        return {
          success: false,
          error: 'Failed to parse AI-generated SEO content',
          data: {
            title: `${topic} - Generated Content`,
            metaDescription: `Learn about ${topic} and related insights.`,
            content: generatedText,
            keywordDensity: {},
            readabilityScore: 70
          }
        };
      }

      // Validate the parsed data
      if (!parsedData.content) {
        logger.warn('Generated SEO content missing required fields', { parsedData });
        parsedData.content = generatedText; // Use raw text as fallback
      }

      if (!parsedData.title) {
        parsedData.title = `${topic} - Comprehensive Guide`;
      }

      if (!parsedData.metaDescription) {
        parsedData.metaDescription = `Learn everything about ${topic} and how it can benefit you. Comprehensive information including ${keywords[0] || 'key insights'}.`;
      }

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for SEO content generation', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }

      // Prepare the result
      const result: AITaskResult<any> = {
        success: true,
        data: parsedData,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };

      // Cache the result unless skipCache is set
      if (!options?.skipCache) {
        this.cache.set(cacheKey, result, options?.cacheTtl);
      }

      logger.debug('SEO content generation complete', { 
        topic,
        contentLength: parsedData.content.length
      });

      return result;
    } catch (error) {
      logger.error('Error generating SEO content', { 
        error: error instanceof Error ? error.message : String(error),
        topic,
        keywords
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating SEO content',
        data: {
          title: `${topic}`,
          metaDescription: `Information about ${topic}`,
          content: `We couldn't generate your SEO content about "${topic}" at this time. Please try again later.`,
          keywordDensity: {},
          readabilityScore: 0
        }
      };
    }
  }

  /**
   * Repurpose content from one platform to multiple others
   * Enterprise/Influencer feature for efficiently reusing content
   * 
   * @param content Original content to repurpose
   * @param sourcePlatform Platform the original content was created for
   * @param targetPlatforms Platforms to adapt the content for
   * @param options Request options including user metadata
   * @returns Repurposed content for each target platform
   */
  async repurposeContent(
    content: string,
    sourcePlatform: string,
    targetPlatforms: string[],
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    originalContent: string;
    repurposedContent: Record<string, string>;
    mediaRecommendations?: Record<string, string>;
  }>> {
    try {
      logger.debug('Repurposing content', { 
        sourcePlatform,
        targetPlatforms,
        contentLength: content.length
      });
      
      // Create cache key from params
      const contentHash = this.hashString(content);
      const platformsHash = targetPlatforms.sort().join(',');
      const cacheKey = `repurpose:${contentHash}:${sourcePlatform}:${platformsHash}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<any>>(cacheKey);
        if (cachedResult) {
          logger.debug('Returning cached repurposed content');
          return cachedResult;
        }
      }

      const repurposedContent: Record<string, string> = {};
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      
      // Process each target platform
      for (const platform of targetPlatforms) {
        const sourceName = sourcePlatform.charAt(0).toUpperCase() + sourcePlatform.slice(1).toLowerCase();
        const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
        
        // Get platform-specific guidance
        const platformGuidance = this.getPlatformRepurposingGuidance(platform);
        
        // Prepare prompt for the AI
        const prompt = `
          Repurpose this original ${sourceName} content for ${platformName}:

          ORIGINAL CONTENT:
          ${content}

          PLATFORM GUIDANCE:
          ${platformGuidance}

          Please:
          1. Adapt the content to ${platformName}'s format, length limitations, and audience expectations
          2. Maintain the core message but optimize for ${platformName}'s algorithm and user engagement patterns
          3. Consider ${platformName}'s best practices and formatting requirements
          4. Adjust the tone and format while preserving the key message and call to action

          Return only the repurposed content for ${platformName}, properly formatted.
        `.trim();

        // Estimate token usage for the prompt
        const estimatedPromptTokens = estimateTokenUsage(prompt);
        totalPromptTokens += estimatedPromptTokens;
        
        // Generate the content with the AI provider
        const generatedText = await this.provider.generateText(prompt, {
          maxTokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.6
        });

        // Store repurposed content
        repurposedContent[platform] = generatedText.trim();
        
        // Estimate token usage for the completion
        const estimatedCompletionTokens = estimateTokenUsage(generatedText);
        totalCompletionTokens += estimatedCompletionTokens;
      }

      // Generate media recommendations if requested
      let mediaRecommendations: Record<string, string> | undefined;
      if (options?.metadata?.includeMediaRecommendations) {
        mediaRecommendations = {};
        
        for (const platform of targetPlatforms) {
          const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
          
          const mediaPrompt = `
            Based on this content for ${platformName}:
            
            ${repurposedContent[platform]}
            
            Suggest the ideal media (image, video, etc.) that would accompany this post.
            Describe what the media should look like, key visual elements to include, style, mood, and how it enhances the message.
            Keep your response under 100 words and focus on practical, actionable suggestions.
          `.trim();
          
          // Estimate token usage for the media prompt
          const mediaPromptTokens = estimateTokenUsage(mediaPrompt);
          totalPromptTokens += mediaPromptTokens;
          
          // Generate media recommendation
          const recommendation = await this.provider.generateText(mediaPrompt, {
            maxTokens: 200,
            temperature: 0.7
          });
          
          mediaRecommendations[platform] = recommendation.trim();
          
          // Estimate token usage for the media completion
          const mediaCompletionTokens = estimateTokenUsage(recommendation);
          totalCompletionTokens += mediaCompletionTokens;
        }
      }

      const totalTokens = totalPromptTokens + totalCompletionTokens;

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for content repurposing', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }

      // Prepare the result
      const result: AITaskResult<any> = {
        success: true,
        data: {
          originalContent: content,
          repurposedContent,
          mediaRecommendations
        },
        tokenUsage: {
          prompt: totalPromptTokens,
          completion: totalCompletionTokens,
          total: totalTokens
        }
      };

      // Cache the result unless skipCache is set
      if (!options?.skipCache) {
        this.cache.set(cacheKey, result, options?.cacheTtl);
      }

      logger.debug('Content repurposing complete', { 
        targetPlatforms: targetPlatforms.length
      });

      return result;
    } catch (error) {
      logger.error('Error repurposing content', { 
        error: error instanceof Error ? error.message : String(error),
        sourcePlatform,
        targetPlatforms
      });
      
      // Create basic repurposed content as fallback
      const repurposedContent: Record<string, string> = {};
      for (const platform of targetPlatforms) {
        repurposedContent[platform] = this.createBasicRepurposedContent(content, platform);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error repurposing content',
        data: {
          originalContent: content,
          repurposedContent
        }
      };
    }
  }
  
  /**
   * Create basic repurposed content as a fallback
   * @param content Original content 
   * @param platform Target platform
   * @returns Simple platform-adapted content
   */
  private createBasicRepurposedContent(content: string, platform: string): string {
    const platformLower = platform.toLowerCase();
    
    // Platform-specific basic adaptations
    if (platformLower.includes('twitter')) {
      // Twitter: Truncate to 280 characters
      return content.length > 280 
        ? content.substring(0, 277) + '...'
        : content;
    } else if (platformLower.includes('instagram')) {
      // Instagram: Add some emojis and make more casual
      const emojis = ['✨', '📸', '🔥', '💯', '👉', '🙌'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      return `${randomEmoji} ${content}`;
    } else if (platformLower.includes('linkedin')) {
      // LinkedIn: Make more professional
      return `Professional insight: ${content}`;
    } else if (platformLower.includes('facebook')) {
      // Facebook: Add a question to encourage engagement
      return `${content}\n\nWhat do you think about this?`;
    } else if (platformLower.includes('tiktok')) {
      // TikTok: Make brief and catchy
      const firstSentence = content.split('.')[0];
      return firstSentence.length > 150
        ? firstSentence.substring(0, 147) + '...'
        : firstSentence;
    } else {
      return content;
    }
  }
  
  /**
   * Get platform-specific repurposing guidance
   * @param platform Target platform
   * @returns Guidance for content adaptation
   */
  private getPlatformRepurposingGuidance(platform: string): string {
    const platformLower = platform.toLowerCase();
    
    if (platformLower.includes('twitter')) {
      return "Twitter content should be concise (max 280 chars), conversational, and include relevant hashtags. Consider using questions, polls, or direct calls for engagement. Include a clear call-to-action if needed.";
    } else if (platformLower.includes('instagram')) {
      return "Instagram content should be visually descriptive, emotionally engaging, and include relevant hashtags. Use emojis for personality. Focus on storytelling and creating an aesthetic that matches visual content. Calls-to-action should direct to profile link or encourage comments.";
    } else if (platformLower.includes('linkedin')) {
      return "LinkedIn content should be professional, value-oriented, and industry-relevant. Use a more formal tone while remaining conversational. Provide professional insights, data points, or business value. Longer form content is acceptable. Include 2-3 relevant hashtags maximum.";
    } else if (platformLower.includes('facebook')) {
      return "Facebook content should be engaging and community-focused. Questions and conversation starters work well. Include a clear call-to-action. Moderate length is ideal (around 100-250 characters). Use storytelling and emotion to drive engagement.";
    } else if (platformLower.includes('tiktok')) {
      return "TikTok content should be extremely concise, trend-aware, and casual. Use informal language, current slang (when appropriate), and create a hook in the first few words. Focus on entertainment value and immediacy. Reference audio or visual elements that would accompany the text.";
    } else if (platformLower.includes('youtube')) {
      return "YouTube content requires both a catchy title (max 100 chars) and a detailed description. The description should include timestamps for longer content, keywords, and all necessary links. Front-load important information in the first few lines before the 'show more' cut-off.";
    } else if (platformLower.includes('pinterest')) {
      return "Pinterest content should include detailed descriptions with relevant keywords, clear instructions if tutorial-based, and a concise but comprehensive explanation of the visual content. Use aspirational language that inspires action.";
    } else {
      return "Adapt the content to be appropriate for the platform's typical audience and format. Consider length restrictions, typical content style, and audience expectations. Maintain the core message while optimizing for this platform's specific features.";
    }
  }

  /**
   * Generate coordinated content across multiple platforms for a single topic
   * Enterprise-only feature for creating cohesive multi-platform campaigns
   * 
   * @param topic Primary topic or theme
   * @param platforms Target platforms to create content for
   * @param options Request options including user metadata
   * @returns Platform-specific content optimized for each platform
   */
  async generateMultiPlatformContent(
    topic: string,
    platforms: string[],
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    topic: string;
    platforms: Record<string, {
      content: string;
      hashtags: string[];
      mediaRecommendation?: string;
      bestPostingTime?: string;
    }>;
    overallStrategy: {
      keyMessage: string;
      audienceInsights?: string[];
      contentSequence?: string;
    };
  }>> {
    try {
      logger.debug('Generating multi-platform content', { 
        topic,
        platforms,
      });
      
      // Create cache key
      const platformsHash = platforms.sort().join(',');
      const cacheKey = `multiplatform:${topic}:${platformsHash}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<any>>(cacheKey);
        if (cachedResult) {
          logger.debug('Returning cached multi-platform content', { topic });
          return cachedResult;
        }
      }

      // Prepare main prompt
      const platformsList = platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(', ');
      const contextualInfo = options?.metadata?.contextualInfo as string || '';
      const tonePreference = options?.metadata?.tone as string || 'balanced';
      
      const prompt = `
        Create coordinated content about "${topic}" across multiple platforms: ${platformsList}.
        
        ${contextualInfo ? `CONTEXTUAL INFORMATION: ${contextualInfo}\n` : ''}
        TONE PREFERENCE: ${tonePreference}
        
        For each platform, provide:
        1. Platform-optimized content that is formatted appropriately
        2. Relevant hashtags (3-5 per platform)
        3. Media recommendation describing what visual assets would work best
        4. Best posting time based on general platform engagement patterns
        
        Structure your response as a JSON object with these properties:
        - topic: The refined topic
        - platforms: An object with a key for each platform containing:
          - content: The platform-optimized content
          - hashtags: Array of hashtags (without # symbol)
          - mediaRecommendation: Suggestion for visual content
          - bestPostingTime: Recommended posting time/day
        - overallStrategy: An object containing:
          - keyMessage: The core message across all platforms
          - audienceInsights: Array of audience insights
          - contentSequence: Suggested posting sequence
        
        Ensure each platform's content is properly optimized for its specific:
        - Character limits and format expectations
        - Audience demographics and behavior
        - Algorithm preferences
        - Content performance patterns
        
        Make the content coordinated but not identical, with each platform leveraging its unique strengths.
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the content with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || 2500,
        temperature: options?.temperature || 0.7
      });

      // Parse the JSON response
      let parsedData;
      try {
        parsedData = JSON.parse(generatedText);
      } catch (e) {
        logger.error('Error parsing multi-platform content JSON', { 
          error: e instanceof Error ? e.message : String(e),
          generatedText: generatedText.substring(0, 200) + '...' // Log only the beginning
        });
        
        // Create a fallback response based on individual platform generation
        return await this.generateFallbackMultiPlatformContent(topic, platforms, options);
      }

      // Validate the result has the correct structure
      if (!parsedData.platforms || typeof parsedData.platforms !== 'object') {
        logger.warn('Generated multi-platform content missing required structure', { parsedData });
        return await this.generateFallbackMultiPlatformContent(topic, platforms, options);
      }

      // Make sure all requested platforms are present
      for (const platform of platforms) {
        if (!parsedData.platforms[platform]) {
          // If any platform is missing, create basic content for it
          parsedData.platforms[platform] = {
            content: `Check out our latest update on ${topic}!`,
            hashtags: [topic.replace(/\s+/g, ''), 'update', 'news'],
            mediaRecommendation: `Image related to ${topic}`,
            bestPostingTime: 'Weekdays between 10am-2pm'
          };
        }
      }

      // Ensure overallStrategy exists
      if (!parsedData.overallStrategy) {
        parsedData.overallStrategy = {
          keyMessage: `Information about ${topic}`,
          audienceInsights: ['General audience interested in this topic'],
          contentSequence: 'Post to all platforms on the same day for maximum reach'
        };
      }

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for multi-platform content generation', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }

      // Prepare the result
      const result: AITaskResult<any> = {
        success: true,
        data: parsedData,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };

      // Cache the result unless skipCache is set
      if (!options?.skipCache) {
        this.cache.set(cacheKey, result, options?.cacheTtl);
      }

      logger.debug('Multi-platform content generation complete', { 
        topic,
        platformCount: Object.keys(parsedData.platforms).length
      });

      return result;
    } catch (error) {
      logger.error('Error generating multi-platform content', { 
        error: error instanceof Error ? error.message : String(error),
        topic,
        platforms
      });
      
      // Attempt to generate fallback content
      return await this.generateFallbackMultiPlatformContent(topic, platforms, options);
    }
  }
  
  /**
   * Fallback method to generate multi-platform content when the main method fails
   * @param topic Content topic
   * @param platforms Target platforms
   * @param options Request options
   * @returns Basic multi-platform content structure
   */
  private async generateFallbackMultiPlatformContent(
    topic: string,
    platforms: string[],
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<any>> {
    try {
      logger.debug('Generating fallback multi-platform content', {
        topic,
        platforms
      });
      
      const result: {
        topic: string;
        platforms: Record<string, any>;
        overallStrategy: {
          keyMessage: string;
          audienceInsights: string[];
          contentSequence: string;
        };
      } = {
        topic,
        platforms: {},
        overallStrategy: {
          keyMessage: `Information about ${topic}`,
          audienceInsights: ['General audience interested in this topic'],
          contentSequence: 'Post to all platforms on the same day for maximum reach'
        }
      };
      
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      
      // Generate individual content for each platform
      for (const platform of platforms) {
        const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
        
        // Create a simplified prompt for individual platform
        const prompt = `
          Create a ${platformName} post about ${topic}.
          Include appropriate formatting and style for ${platformName}.
          Also suggest 3-5 hashtags that would work well.
        `.trim();
        
        // Estimate token usage
        const promptTokens = estimateTokenUsage(prompt);
        totalPromptTokens += promptTokens;
        
        // Generate content for this platform
        const generatedText = await this.provider.generateText(prompt, {
          maxTokens: 500,
          temperature: 0.7
        });
        
        // Estimate completion tokens
        const completionTokens = estimateTokenUsage(generatedText);
        totalCompletionTokens += completionTokens;
        
        // Extract content and hashtags with basic regex
        const contentLines = generatedText.split('\n');
        let content = generatedText;
        let hashtags: string[] = [topic.replace(/\s+/g, '')];
        
        // Look for hashtags section
        const hashtagLine = contentLines.find(line => 
          line.toLowerCase().includes('hashtag') || 
          line.includes('#')
        );
        
        if (hashtagLine) {
          // Extract hashtags
          const tags = hashtagLine.match(/#(\w+)/g);
          if (tags && tags.length > 0) {
            hashtags = tags.map(tag => tag.substring(1)); // Remove # symbol
            
            // Remove the hashtag line from content
            content = contentLines.filter(line => line !== hashtagLine).join('\n');
          }
        }
        
        // Add to platforms object
        result.platforms[platform] = {
          content: content.trim(),
          hashtags: hashtags,
          mediaRecommendation: `Visual content related to ${topic} that would appeal to ${platformName} users`,
          bestPostingTime: this.getPlatformDefaultPostingTime(platform)
        };
      }
      
      // Track token usage if tracker is available
      const totalTokens = totalPromptTokens + totalCompletionTokens;
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
      }
      
      return {
        success: true,
        data: result,
        tokenUsage: {
          prompt: totalPromptTokens,
          completion: totalCompletionTokens,
          total: totalTokens
        }
      };
    } catch (error) {
      logger.error('Error generating fallback multi-platform content', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Create a very basic response
      const result = {
        topic,
        platforms: platforms.reduce((acc: Record<string, any>, platform) => {
          acc[platform] = {
            content: `Check out our latest update on ${topic}!`,
            hashtags: [topic.replace(/\s+/g, ''), 'update', 'news'],
            mediaRecommendation: `Image related to ${topic}`,
            bestPostingTime: 'Weekdays between 10am-2pm'
          };
          return acc;
        }, {}),
        overallStrategy: {
          keyMessage: `Information about ${topic}`,
          audienceInsights: ['General audience interested in this topic'],
          contentSequence: 'Post to all platforms on the same day for maximum reach'
        }
      };
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating multi-platform content',
        data: result
      };
    }
  }
  
  /**
   * Get default posting time recommendation for a platform
   * @param platform Social platform name
   * @returns General recommendation for posting time
   */
  private getPlatformDefaultPostingTime(platform: string): string {
    const platformLower = platform.toLowerCase();
    
    if (platformLower.includes('instagram')) {
      return 'Monday to Friday, 11am to 1pm or 7pm to 9pm';
    } else if (platformLower.includes('twitter')) {
      return 'Weekdays, 9am to 11am or 3pm to 4pm';
    } else if (platformLower.includes('facebook')) {
      return 'Wednesday to Friday, 10am to 3pm';
    } else if (platformLower.includes('linkedin')) {
      return 'Tuesday to Thursday, 9am to 12pm';
    } else if (platformLower.includes('tiktok')) {
      return 'Tuesday, Thursday, Friday, 2pm to 9pm';
    } else if (platformLower.includes('pinterest')) {
      return 'Saturday mornings or weekdays 8pm to 11pm';
    } else {
      return 'Weekdays between 10am and 2pm';
    }
  }

  /**
   * Generate a complete content campaign based on a theme
   * Enterprise-only feature for creating a series of coordinated content pieces
   * 
   * @param campaign Campaign parameters
   * @param platforms Target platforms to create content for
   * @param contentCount Number of content pieces to generate
   * @param options Request options including user metadata
   * @returns Complete campaign structure with multiple content pieces
   */
  async generateCampaignContent(
    campaign: {
      name: string;
      description: string;
      keyMessages: string[];
      targetAudience: string[];
      goals: string[];
      toneOfVoice: string;
      keywords: string[];
    },
    platforms: string[],
    contentCount: number = 5,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    campaignName: string;
    campaignHashtag: string;
    campaignSummary: string;
    contentPieces: Array<{
      title: string;
      platforms: Record<string, {
        content: string;
        hashtags: string[];
      }>;
      suggestedScheduleTime?: string;
      mediaRecommendation?: string;
    }>;
    recommendedSchedule?: {
      startDate?: string;
      frequency?: string;
      order?: string[];
    };
  }>> {
    try {
      logger.debug('Generating campaign content', { 
        campaignName: campaign.name,
        platforms,
        contentCount
      });
      
      // Create cache key
      const campaignHash = this.hashString(JSON.stringify(campaign));
      const platformsHash = platforms.sort().join(',');
      const cacheKey = `campaign:${campaignHash}:${platformsHash}:${contentCount}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<any>>(cacheKey);
        if (cachedResult) {
          logger.debug('Returning cached campaign content', { campaignName: campaign.name });
          return cachedResult;
        }
      }

      // Prepare main prompt
      const platformsList = platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(', ');
      
      const prompt = `
        Create a comprehensive content campaign based on the following theme:
        
        CAMPAIGN NAME: ${campaign.name}
        DESCRIPTION: ${campaign.description}
        KEY MESSAGES: ${campaign.keyMessages.join(', ')}
        TARGET AUDIENCE: ${campaign.targetAudience.join(', ')}
        GOALS: ${campaign.goals.join(', ')}
        TONE OF VOICE: ${campaign.toneOfVoice}
        KEYWORDS: ${campaign.keywords.join(', ')}
        
        Generate ${contentCount} unique content pieces optimized for these platforms: ${platformsList}.
        
        For each content piece:
        1. Create a title/theme
        2. Generate platform-specific content for each platform
        3. Include relevant hashtags for each platform
        4. Suggest media types that would complement the content
        5. Provide an effective call to action
        
        Also create:
        1. A unique campaign hashtag
        2. A brief campaign summary
        3. A recommended posting schedule and frequency
        
        Format your response as a JSON object with these properties:
        - campaignName: The name of the campaign
        - campaignHashtag: A unique, memorable hashtag for this campaign (without # symbol)
        - campaignSummary: A brief overview of the campaign strategy
        - contentPieces: An array of content pieces, each with:
          - title: A title/theme for this content piece
          - platforms: Object with keys for each platform containing:
            - content: The platform-specific content
            - hashtags: Array of relevant hashtags
          - suggestedScheduleTime: When to post this piece
          - mediaRecommendation: Visual content suggestion
        - recommendedSchedule: Object containing:
          - startDate: Suggested start date (if applicable)
          - frequency: How often to post content
          - order: Suggested order of content pieces
        
        Make each content piece unique but aligned with the overall campaign themes and goals.
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the content with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || 4000, // Higher token limit for campaign generation
        temperature: options?.temperature || 0.7
      });

      // Parse the JSON response
      let parsedData;
      try {
        parsedData = JSON.parse(generatedText);
      } catch (e) {
        logger.error('Error parsing campaign content JSON', { 
          error: e instanceof Error ? e.message : String(e),
          generatedText: generatedText.substring(0, 200) + '...' // Log only the beginning
        });
        
        // Return a structured error
        return {
          success: false,
          error: 'Failed to parse AI-generated campaign content - please try again',
          data: this.createFallbackCampaign(campaign, platforms, contentCount)
        };
      }

      // Validate the result has the correct structure
      if (!parsedData.contentPieces || !Array.isArray(parsedData.contentPieces)) {
        logger.warn('Generated campaign content missing required structure', { parsedData });
        return {
          success: false,
          error: 'Generated campaign content had invalid structure',
          data: this.createFallbackCampaign(campaign, platforms, contentCount)
        };
      }

      // Make sure all requested platforms are present in each content piece
      parsedData.contentPieces.forEach((piece: any) => {
        if (!piece.platforms) {
          piece.platforms = {};
        }
        
        for (const platform of platforms) {
          if (!piece.platforms[platform]) {
            // If any platform is missing, create basic content for it
            piece.platforms[platform] = {
              content: `${piece.title || campaign.name} - Check out our latest update!`,
              hashtags: [
                campaign.name.replace(/\s+/g, ''),
                parsedData.campaignHashtag || 'campaign',
                ...campaign.keywords.slice(0, 3).map(k => k.replace(/\s+/g, ''))
              ]
            };
          }
        }
      });

      // Ensure campaign hashtag exists
      if (!parsedData.campaignHashtag) {
        parsedData.campaignHashtag = campaign.name.replace(/\s+/g, '') + "Campaign";
      }

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
        logger.debug('Token usage tracked for campaign content generation', { 
          userId, 
          orgId, 
          tokens: totalTokens 
        });
      }

      // Prepare the result
      const result: AITaskResult<any> = {
        success: true,
        data: parsedData,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };

      // Cache the result unless skipCache is set
      if (!options?.skipCache) {
        this.cache.set(cacheKey, result, options?.cacheTtl);
      }

      logger.debug('Campaign content generation complete', { 
        campaignName: campaign.name,
        contentCount: parsedData.contentPieces.length
      });

      return result;
    } catch (error) {
      logger.error('Error generating campaign content', { 
        error: error instanceof Error ? error.message : String(error),
        campaignName: campaign.name
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating campaign content',
        data: this.createFallbackCampaign(campaign, platforms, contentCount)
      };
    }
  }
  
  /**
   * Create a fallback campaign when AI generation fails
   * @param campaign Campaign parameters
   * @param platforms Target platforms
   * @param contentCount Number of content pieces
   * @returns Basic campaign structure
   */
  private createFallbackCampaign(
    campaign: {
      name: string;
      description: string;
      keyMessages: string[];
      targetAudience: string[];
      goals: string[];
      toneOfVoice: string;
      keywords: string[];
    },
    platforms: string[],
    contentCount: number
  ): any {
    const contentPieces = [];
    const campaignHashtag = campaign.name.replace(/\s+/g, '') + "Campaign";
    
    // Create basic content pieces based on key messages
    for (let i = 0; i < contentCount; i++) {
      const messageIndex = i % campaign.keyMessages.length;
      const keyMessage = campaign.keyMessages[messageIndex];
      
      const platformContent: Record<string, any> = {};
      for (const platform of platforms) {
        platformContent[platform] = {
          content: `${keyMessage} ${i === 0 ? `Learn more about ${campaign.name}!` : ''}`,
          hashtags: [
            campaignHashtag,
            ...campaign.keywords.slice(0, 3).map(k => k.replace(/\s+/g, ''))
          ]
        };
      }
      
      contentPieces.push({
        title: `Content Piece ${i + 1}: ${keyMessage}`,
        platforms: platformContent,
        suggestedScheduleTime: `Day ${i + 1}`,
        mediaRecommendation: `Image or video related to ${keyMessage}`
      });
    }
    
    return {
      campaignName: campaign.name,
      campaignHashtag,
      campaignSummary: campaign.description,
      contentPieces,
      recommendedSchedule: {
        startDate: 'As soon as possible',
        frequency: 'Post every 2-3 days',
        order: contentPieces.map((_, i) => `Day ${i + 1}: Content Piece ${i + 1}`)
      }
    };
  }
}

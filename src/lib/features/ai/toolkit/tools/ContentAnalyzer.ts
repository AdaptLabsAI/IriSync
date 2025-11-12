import { AIProvider } from '../../providers/AIProviderFactory';
import { ContentAnalyzer, AITaskResult, ToolkitRequestOptions, SentimentAnalysisResult, CategoryAnalysisResult, EngagementAnalysisResult } from '../interfaces';
import { TokenTracker } from '../../../tokens/token-tracker';
import { estimateTokenUsage } from '../../utils/token-counter';
import { Cache } from '../../../cache/Cache';
import { logger } from '../../../logging/logger';

export class ContentAnalyzerImpl implements ContentAnalyzer {
  private provider: AIProvider;
  private tokenTracker?: TokenTracker;
  private cache: Cache;

  constructor(provider: AIProvider, tokenTracker?: TokenTracker) {
    this.provider = provider;
    this.tokenTracker = tokenTracker;
    this.cache = new Cache('content-analyzer', {
      ttl: 60 * 60, // 1 hour default cache TTL
      maxSize: 500  // Maximum number of items in the cache
    });
    
    logger.info('ContentAnalyzer initialized', { 
      hasTokenTracker: !!tokenTracker
    });
  }

  /**
   * Update the AI provider used by this analyzer
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
    logger.debug('ContentAnalyzer provider updated');
  }

  /**
   * Analyze sentiment of content
   */
  async analyzeSentiment(
    content: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<SentimentAnalysisResult>> {
    try {
      const cacheKey = `sentiment:${content.substring(0, 100)}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<SentimentAnalysisResult>>(cacheKey);
        
        if (cachedResult) {
          logger.debug('Returning cached sentiment analysis');
          return cachedResult;
        }
      }

      // Prepare prompt for the AI
      const prompt = `
        Analyze the sentiment of the following content and provide a detailed analysis.
        
        CONTENT: ${content}
        
        Return the result as a JSON object with the following properties:
        1. sentiment: Either "positive", "neutral", or "negative"
        2. score: A number between -1 and 1, where -1 is very negative, 0 is neutral, and 1 is very positive
        3. confidence: A number between 0 and 1 indicating confidence in the analysis
        4. details: An object containing:
           - emotions: An object mapping emotion names to their intensity scores
           - aspects: An array of analyzed aspects, each with its own sentiment
        
        Example:
        {
          "sentiment": "positive",
          "score": 0.75,
          "confidence": 0.92,
          "details": {
            "emotions": {
              "joy": 0.8,
              "optimism": 0.6,
              "gratitude": 0.5
            },
            "aspects": [
              {
                "aspect": "user experience",
                "sentiment": "positive",
                "score": 0.82
              },
              {
                "aspect": "price",
                "sentiment": "neutral",
                "score": 0.1
              }
            ]
          }
        }
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the analysis with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || 500,
        temperature: options?.temperature || 0.3
      });

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Parse the JSON response
      let sentimentData: SentimentAnalysisResult;
      
      try {
        const parsed = JSON.parse(generatedText);
        
        // Normalize to match the interface structure
        sentimentData = {
          sentiment: parsed.sentiment as 'positive' | 'neutral' | 'negative',
          score: typeof parsed.score === 'number' ? parsed.score : 0,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
          details: {
            emotions: parsed.details?.emotions || {},
            aspects: (parsed.details?.aspects || []).map((aspect: any) => ({
              aspect: aspect.aspect || 'general',
              sentiment: (aspect.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
              score: typeof aspect.score === 'number' ? aspect.score : 0
            }))
          }
        };
        
        // Validate the sentiment value
        if (!['positive', 'neutral', 'negative'].includes(sentimentData.sentiment)) {
          sentimentData.sentiment = 'neutral';
        }
        
        // Ensure score is within bounds
        sentimentData.score = Math.max(-1, Math.min(1, sentimentData.score));
        
        // Ensure confidence is within bounds
        sentimentData.confidence = Math.max(0, Math.min(1, sentimentData.confidence));
        
      } catch (e) {
        // Default values if parsing fails
        logger.warn('Failed to parse sentiment analysis result', {
          error: e instanceof Error ? e.message : String(e)
        });
        
        sentimentData = {
          sentiment: 'neutral',
          score: 0,
          confidence: 0.5,
          details: {
            emotions: {},
            aspects: []
          }
        };
      }

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        if (userId) {
          await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
          logger.debug('Token usage tracked for sentiment analysis', { 
            userId, 
            orgId, 
            tokens: totalTokens 
          });
        }
      }

      // Prepare the result
      const result: AITaskResult<SentimentAnalysisResult> = {
        success: true,
        data: sentimentData,
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

      logger.debug('Sentiment analysis complete', {
        sentiment: sentimentData.sentiment,
        score: sentimentData.score
      });
      
      return result;
    } catch (error) {
      logger.error('Error analyzing sentiment:', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error analyzing sentiment',
        data: {
          sentiment: 'neutral',
          score: 0,
          confidence: 0.5,
          details: {
            emotions: {},
            aspects: []
          }
        }
      };
    }
  }

  /**
   * Categorize content into topics/themes
   */
  async categorizeContent(
    content: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<CategoryAnalysisResult>> {
    try {
      const cacheKey = `categories:${content.substring(0, 100)}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<CategoryAnalysisResult>>(cacheKey);
        
        if (cachedResult) {
          logger.debug('Returning cached category analysis');
          return cachedResult;
        }
      }

      // Prepare prompt for the AI
      const prompt = `
        Categorize the following content into relevant topics or themes.
        
        CONTENT: ${content}
        
        Return the result as a JSON object with the following properties:
        1. primaryCategory: The main category of the content (single string)
        2. confidence: A number between 0 and 1 indicating confidence in the primary category
        3. categories: An array of category objects, each with:
           - category: The category name
           - confidence: A confidence score (0-1) for this category
        
        Example:
        {
          "primaryCategory": "digital marketing",
          "confidence": 0.92,
          "categories": [
            { "category": "digital marketing", "confidence": 0.92 },
            { "category": "social media", "confidence": 0.88 },
            { "category": "brand awareness", "confidence": 0.72 },
            { "category": "content strategy", "confidence": 0.65 }
          ]
        }
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the analysis with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || 400,
        temperature: options?.temperature || 0.3
      });

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Parse the JSON response
      let categoriesData: CategoryAnalysisResult;
      
      try {
        const parsed = JSON.parse(generatedText);
        
        // Create a properly structured result
        categoriesData = {
          primaryCategory: typeof parsed.primaryCategory === 'string' ? parsed.primaryCategory : '',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
          categories: Array.isArray(parsed.categories) ? parsed.categories.map((cat: any) => ({
            category: typeof cat.category === 'string' ? cat.category : '',
            confidence: typeof cat.confidence === 'number' ? cat.confidence : 0.5
          })) : []
        };
        
        // Ensure we have at least the primary category in the categories array if missing
        if (categoriesData.categories.length === 0 && categoriesData.primaryCategory) {
          categoriesData.categories.push({
            category: categoriesData.primaryCategory,
            confidence: categoriesData.confidence
          });
        }
        
        // Ensure confidence values are within bounds
        categoriesData.confidence = Math.max(0, Math.min(1, categoriesData.confidence));
        
        // Normalize category confidences
        categoriesData.categories = categoriesData.categories.map(cat => ({
          category: cat.category,
          confidence: Math.max(0, Math.min(1, cat.confidence))
        }));
        
      } catch (e) {
        // Default values if parsing fails
        logger.warn('Failed to parse category analysis result', {
          error: e instanceof Error ? e.message : String(e)
        });
        
        categoriesData = {
          primaryCategory: '',
          confidence: 0.5,
          categories: []
        };
      }
      
      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        if (userId) {
          await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
          logger.debug('Token usage tracked for category analysis', { 
            userId, 
            orgId, 
            tokens: totalTokens 
          });
        }
      }

      // Prepare the result
      const result: AITaskResult<CategoryAnalysisResult> = {
        success: true,
        data: categoriesData,
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

      logger.debug('Category analysis complete', {
        primaryCategory: categoriesData.primaryCategory,
        categoriesCount: categoriesData.categories.length
      });
      
      return result;
    } catch (error) {
      logger.error('Error categorizing content:', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error categorizing content',
        data: {
          primaryCategory: '',
          confidence: 0.5,
          categories: []
        }
      };
    }
  }

  /**
   * Predict potential engagement metrics for a post
   */
  async predictEngagement(
    content: string,
    platform: string,
    audienceData?: any,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<EngagementAnalysisResult>> {
    try {
      if (!content) {
        throw new Error('Content is required for engagement prediction');
      }

      if (!platform) {
        throw new Error('Platform is required for engagement prediction');
      }

      logger.debug('Predicting engagement', { 
        contentLength: content.length,
        platform,
        hasAudienceData: !!audienceData
      });

      // Create cache key from content and platform
      const contentHash = this.hashString(content);
      const audienceHash = audienceData ? this.hashString(JSON.stringify(audienceData)) : 'no-audience';
      const cacheKey = `engagement:${platform}:${contentHash}:${audienceHash}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<EngagementAnalysisResult>>(cacheKey);
        
        if (cachedResult) {
          logger.debug('Returning cached engagement prediction');
          return cachedResult;
        }
      }

      // Prepare audience data summary if provided
      let audienceSummary = '';
      if (audienceData) {
        if (typeof audienceData === 'object') {
          // Extract useful audience data for the prompt
          const { demographics, interests, behavior } = audienceData;
          
          if (demographics) {
            audienceSummary += `Demographics: ${JSON.stringify(demographics)}\n`;
          }
          
          if (interests && Array.isArray(interests)) {
            audienceSummary += `Interests: ${interests.join(', ')}\n`;
          }
          
          if (behavior) {
            audienceSummary += `Behavior: ${JSON.stringify(behavior)}\n`;
          }
        } else {
          audienceSummary = `Audience data: ${JSON.stringify(audienceData)}\n`;
        }
      }

      // Prepare platform-specific guidance
      const platformGuidance = this.getPlatformEngagementFactors(platform);

      // Prepare prompt for the AI
      const prompt = `
        Analyze the following ${platform} content and predict its potential engagement level.
        
        CONTENT: ${content}
        
        ${audienceSummary ? `AUDIENCE INFORMATION:\n${audienceSummary}` : ''}
        
        ${platformGuidance}
        
        Return the result as a JSON object with the following properties:
        1. engagementScore: A number between 0 and 100 representing overall engagement potential
        2. aspects: An object containing scores (0-100) for:
           - relevance: How relevant the content is to the target audience
           - uniqueness: How original or distinctive the content is
           - emotionalImpact: How emotionally engaging the content is
           - clarity: How clear and understandable the message is
           - callToAction: How effective any calls to action are
        3. strengths: Array of strings describing the content's strengths
        4. weaknesses: Array of strings describing areas for improvement
        5. suggestions: Array of specific suggestions to improve engagement
        
        Example:
        {
          "engagementScore": 78,
          "aspects": {
            "relevance": 85,
            "uniqueness": 70,
            "emotionalImpact": 80,
            "clarity": 90,
            "callToAction": 65
          },
          "strengths": [
            "Clear and concise message",
            "Good use of emotional appeal",
            "Relevant to current trends"
          ],
          "weaknesses": [
            "Call to action could be stronger",
            "Lacks some originality"
          ],
          "suggestions": [
            "Add a stronger call to action at the end",
            "Include a question to encourage responses",
            "Consider adding a unique perspective or angle"
          ]
        }
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the analysis with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.4
      });

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Parse the JSON response
      let engagementData: EngagementAnalysisResult;
      
      try {
        const parsed = JSON.parse(generatedText);
        
        // Normalize to match the interface structure
        engagementData = {
          engagementScore: typeof parsed.engagementScore === 'number' ? parsed.engagementScore : 50,
          aspects: {
            relevance: typeof parsed.aspects?.relevance === 'number' ? parsed.aspects.relevance : 50,
            uniqueness: typeof parsed.aspects?.uniqueness === 'number' ? parsed.aspects.uniqueness : 50,
            emotionalImpact: typeof parsed.aspects?.emotionalImpact === 'number' ? parsed.aspects.emotionalImpact : 50,
            clarity: typeof parsed.aspects?.clarity === 'number' ? parsed.aspects.clarity : 50,
            callToAction: typeof parsed.aspects?.callToAction === 'number' ? parsed.aspects.callToAction : 50
          },
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Good overall content'],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : ['Review content for audience engagement']
        };
        
        // Ensure score is within bounds 0-100
        engagementData.engagementScore = Math.max(0, Math.min(100, engagementData.engagementScore));
        
        // Ensure aspect scores are within bounds 0-100
        Object.keys(engagementData.aspects).forEach(key => {
          const aspectKey = key as keyof typeof engagementData.aspects;
          engagementData.aspects[aspectKey] = Math.max(0, Math.min(100, engagementData.aspects[aspectKey]));
        });
        
      } catch (e) {
        // Default values if parsing fails
        logger.warn('Failed to parse engagement prediction result', {
          error: e instanceof Error ? e.message : String(e),
          generatedText: generatedText.substring(0, 100) + '...'
        });
        
        engagementData = {
          engagementScore: 50,
          aspects: {
            relevance: 50,
            uniqueness: 50,
            emotionalImpact: 50,
            clarity: 50,
            callToAction: 50
          },
          strengths: ['Unable to analyze specific strengths'],
          weaknesses: ['Unable to analyze specific weaknesses'],
          suggestions: ['Review content with a team member for feedback']
        };
      }

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        if (userId) {
          await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
          logger.debug('Token usage tracked for engagement prediction', { 
            userId, 
            orgId, 
            tokens: totalTokens 
          });
        }
      }

      // Prepare the result
      const result: AITaskResult<EngagementAnalysisResult> = {
        success: true,
        data: engagementData,
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

      logger.debug('Engagement prediction complete', {
        platform,
        engagementScore: engagementData.engagementScore
      });
      
      return result;
    } catch (error) {
      logger.error('Error predicting engagement:', {
        error: error instanceof Error ? error.message : String(error),
        platform,
        contentPreview: content ? content.substring(0, 50) + '...' : 'undefined'
      });
      
      // Return fallback response in case of error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error predicting engagement',
        data: {
          engagementScore: 50,
          aspects: {
            relevance: 50,
            uniqueness: 50,
            emotionalImpact: 50,
            clarity: 50,
            callToAction: 50
          },
          strengths: ['Unable to analyze due to an error'],
          weaknesses: ['Unable to analyze due to an error'],
          suggestions: ['Try analyzing again or review content manually']
        }
      };
    }
  }

  // Helper method to get platform-specific engagement factors
  private getPlatformEngagementFactors(platform: string): string {
    const platformLower = platform.toLowerCase();
    
    if (platformLower.includes('instagram')) {
      return `
        For Instagram, evaluate the content based on:
        1. Visual appeal and descriptiveness
        2. Emotional connection and storytelling
        3. Trend awareness and relevance
        4. Hashtag strategy and discoverability
        5. Calls to action and engagement hooks
      `;
    } else if (platformLower.includes('twitter') || platformLower.includes('x')) {
      return `
        For Twitter/X, evaluate the content based on:
        1. Conciseness and clarity
        2. Timeliness and trend relevance
        3. Conversational tone and question inclusion
        4. Strategic hashtag usage (but not excessive)
        5. Call to action effectiveness
      `;
    } else if (platformLower.includes('facebook')) {
      return `
        For Facebook, evaluate the content based on:
        1. Conversation starters and question inclusion
        2. Personal and relatable stories
        3. Emotional resonance and value provision
        4. Video/image inclusion opportunities
        5. Community building aspects
      `;
    } else if (platformLower.includes('linkedin')) {
      return `
        For LinkedIn, evaluate the content based on:
        1. Professional value and industry relevance
        2. Thought leadership potential
        3. Educational or informative quality
        4. Network engagement potential
        5. Professional tone and clarity
      `;
    } else if (platformLower.includes('tiktok')) {
      return `
        For TikTok, evaluate the content based on:
        1. Hook strength and attention-grabbing quality
        2. Trend awareness and timeliness
        3. Entertainment value and originality
        4. Brevity and clarity
        5. Call to action for comments, shares, or follows
      `;
    } else if (platformLower.includes('youtube')) {
      return `
        For YouTube, evaluate the content based on:
        1. Hook strength in the first 5-10 seconds
        2. Content value and viewer benefit
        3. SEO optimization and searchability
        4. Audience retention potential
        5. Call to action clarity for subscribes and engagement
      `;
    } else if (platformLower.includes('pinterest')) {
      return `
        For Pinterest, evaluate the content based on:
        1. Visual inspiration and aesthetic appeal
        2. Problem-solving or aspirational quality
        3. Seasonal or trend relevance
        4. SEO and searchability optimization
        5. Website click-through potential
      `;
    } else if (platformLower.includes('reddit')) {
      return `
        For Reddit, evaluate the content based on:
        1. Subreddit relevance and rule compliance
        2. Value contribution to the community
        3. Authenticity and non-promotional tone
        4. Discussion generation potential
        5. Formatting and readability
      `;
    } else {
      return `
        For this platform, evaluate the content based on:
        1. Clarity and message comprehension
        2. Value provided to the audience
        3. Engagement and interaction potential
        4. Tone appropriateness for the platform
        5. Call to action effectiveness
      `;
    }
  }

  /**
   * Hash a string for caching purposes
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36); // Convert to base36 for shorter strings
  }

  /**
   * Check content for platform compliance issues
   */
  async checkCompliance(
    content: string,
    platform: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    compliant: boolean;
    issues: string[];
    recommendations?: string[];
  }>> {
    try {
      if (!content) {
        throw new Error('Content is required for compliance check');
      }

      if (!platform) {
        throw new Error('Platform is required for compliance check');
      }

      logger.debug('Checking content compliance', { 
        contentLength: content.length,
        platform
      });

      // Create cache key from content and platform
      const contentHash = this.hashString(content);
      const cacheKey = `compliance:${platform}:${contentHash}`;
      
      // Check cache unless skipCache is set
      if (!options?.skipCache) {
        const cachedResult = this.cache.get<AITaskResult<{
          compliant: boolean;
          issues: string[];
          recommendations?: string[];
        }>>(cacheKey);
        
        if (cachedResult) {
          logger.debug('Returning cached compliance check');
          return cachedResult;
        }
      }

      // Get platform-specific guidelines
      const platformGuidelines = this.getPlatformGuidelines(platform);

      // Prepare prompt for the AI
      const prompt = `
        Analyze the following content intended for ${platform} and check it for compliance with platform guidelines and best practices.
        
        CONTENT: ${content}
        
        PLATFORM GUIDELINES:
        ${platformGuidelines}
        
        Evaluate the content against these guidelines and identify any potential issues.
        Return the result as a JSON object with the following properties:
        1. compliant: Boolean indicating whether the content appears to comply with platform guidelines
        2. issues: Array of strings describing any potential compliance issues (empty array if fully compliant)
        3. recommendations: Array of strings with specific recommendations to fix compliance issues
        
        Example:
        {
          "compliant": false,
          "issues": [
            "Excessive hashtags may trigger Instagram's spam filter",
            "Promotional content needs to be clearly marked as sponsored"
          ],
          "recommendations": [
            "Reduce hashtags to 5-10 most relevant ones",
            "Add #ad or #sponsored tag to comply with disclosure requirements"
          ]
        }
      `.trim();

      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Generate the analysis with the AI provider
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: options?.maxTokens || 800,
        temperature: options?.temperature || 0.3
      });

      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

      // Parse the JSON response
      let complianceData: {
        compliant: boolean;
        issues: string[];
        recommendations?: string[];
      };
      
      try {
        const parsed = JSON.parse(generatedText);
        
        // Normalize to match the interface structure
        complianceData = {
          compliant: !!parsed.compliant, // Convert to boolean
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
        };
        
      } catch (e) {
        // Default values if parsing fails
        logger.warn('Failed to parse compliance check result', {
          error: e instanceof Error ? e.message : String(e),
          generatedText: generatedText.substring(0, 100) + '...'
        });
        
        // Check for common platform issues with basic regex
        const issues = [];
        if (platform.toLowerCase().includes('instagram') && (content.match(/#/g) || []).length > 30) {
          issues.push('Too many hashtags (Instagram limit is 30)');
        }
        
        if ((content.includes('http://') || content.includes('https://')) && 
            (platform.toLowerCase().includes('instagram') || platform.toLowerCase().includes('tiktok'))) {
          issues.push('Links in content may not be clickable on this platform');
        }
        
        complianceData = {
          compliant: issues.length === 0,
          issues,
          recommendations: ['Review platform guidelines manually']
        };
      }

      // Track token usage if tracker is available
      if (this.tokenTracker && options?.metadata?.userId) {
        const userId = options.metadata.userId as string;
        const orgId = options.metadata.organizationId as string;
        
        if (userId) {
          await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
          logger.debug('Token usage tracked for compliance check', { 
            userId, 
            orgId, 
            tokens: totalTokens 
          });
        }
      }

      // Prepare the result
      const result: AITaskResult<{
        compliant: boolean;
        issues: string[];
        recommendations?: string[];
      }> = {
        success: true,
        data: complianceData,
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

      logger.debug('Compliance check complete', {
        platform,
        compliant: complianceData.compliant,
        issueCount: complianceData.issues.length
      });
      
      return result;
    } catch (error) {
      logger.error('Error checking compliance:', {
        error: error instanceof Error ? error.message : String(error),
        platform,
        contentPreview: content ? content.substring(0, 50) + '...' : 'undefined'
      });
      
      // Return fallback response in case of error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error checking compliance',
        data: {
          compliant: true, // Assume compliant if we can't check
          issues: ['Unable to perform compliance check due to an error'],
          recommendations: ['Review content manually against platform guidelines']
        }
      };
    }
  }

  /**
   * Get platform-specific guidelines for content compliance
   */
  private getPlatformGuidelines(platform: string): string {
    const platformLower = platform.toLowerCase();
    
    if (platformLower.includes('instagram')) {
      return `
        Instagram Guidelines:
        1. No more than 30 hashtags per post
        2. Avoid excessive external links in captions (they won't be clickable)
        3. Sponsored content must be clearly disclosed with tags like #ad or #sponsored
        4. No hate speech, harassment, nudity, violence, or illegal activity
        5. Avoid excessive text in images
        6. Don't encourage artificial engagement (like "comment below" contests or chain messages)
        7. Avoid unauthorized use of copyrighted materials or intellectual property
        8. Don't solicit personal information from users
        9. Avoid text that may mislead users about Instagram features or functionality
        10. Don't promote the purchase or sale of regulated goods
      `;
    } else if (platformLower.includes('twitter') || platformLower.includes('x')) {
      return `
        Twitter/X Guidelines:
        1. Maximum character count is 280 characters
        2. Limit of 4 images per tweet, or 1 GIF, or 1 video
        3. Sponsored content must include appropriate disclosure (#ad, #sponsored)
        4. No abusive behavior, harassment, hateful conduct, or violent threats
        5. No glorification of violence or violent extremist groups
        6. No spam, platform manipulation, or mass mentions
        7. No impersonation of individuals, groups, or organizations
        8. Avoid misleading information, especially in sensitive contexts
        9. Don't violate others' intellectual property rights
        10. Comply with election integrity policies for political content
      `;
    } else if (platformLower.includes('facebook')) {
      return `
        Facebook Guidelines:
        1. Text should be clear, accurate, and not misleading
        2. Sponsored content must be disclosed using Facebook's branded content tools
        3. No hate speech, bullying, harassment, or incitement to violence
        4. No sexually explicit content, nudity, or excessive violence
        5. Don't share private information about others without consent
        6. Avoid sensationalist health claims or misinformation
        7. No promotion of regulated goods like firearms, tobacco, or drugs
        8. Follow contest guidelines if running promotions
        9. Don't encourage engagement baiting (e.g., "like if you agree")
        10. Comply with Facebook Page policies for business accounts
      `;
    } else if (platformLower.includes('linkedin')) {
      return `
        LinkedIn Guidelines:
        1. Content should be professional and relevant to a business context
        2. Maintain professional tone and appropriate language
        3. Sponsored content must be disclosed in accordance with LinkedIn's guidelines
        4. No discriminatory, harassing, or hateful content
        5. Don't share misleading or deceptive information
        6. Avoid excessive self-promotion or spam-like posting frequency
        7. Respect intellectual property rights and give proper attribution
        8. Don't share confidential business information
        9. Ensure accuracy in professional claims and qualifications
        10. No solicitation for endorsements or recommendations
      `;
    } else if (platformLower.includes('tiktok')) {
      return `
        TikTok Guidelines:
        1. Videos should comply with community guidelines
        2. No dangerous challenges or activities that risk safety
        3. Sponsored content must be disclosed with #ad or similar
        4. No hate speech, harassment, or bullying content
        5. Don't share misinformation or manipulated content
        6. No sexually suggestive or explicit content
        7. Avoid excessive promotional content or spam
        8. Respect intellectual property rights
        9. No impersonation of other users or brands
        10. Comply with age restrictions for certain content types
      `;
    } else if (platformLower.includes('youtube')) {
      return `
        YouTube Guidelines:
        1. Content must comply with YouTube's Community Guidelines
        2. Avoid misleading thumbnails or titles
        3. Disclose any sponsored content or paid promotions
        4. No harassment, hate speech, or explicit content
        5. Respect copyright and fair use principles
        6. Don't include excessive promotional material
        7. Comply with age restrictions for content targeting children
        8. No dangerous challenges, pranks, or harmful activities
        9. Avoid misinformation on sensitive topics
        10. Include appropriate content warnings when needed
      `;
    } else if (platformLower.includes('pinterest')) {
      return `
        Pinterest Guidelines:
        1. Content should provide value, inspiration, or useful information
        2. Pins should link to high-quality, relevant destination pages
        3. Sponsored content must be disclosed properly
        4. No explicit, violent, or hateful content
        5. Avoid misleading or deceptive practices
        6. Don't use irrelevant keywords to improve discoverability
        7. Respect intellectual property rights
        8. No health or medical misinformation
        9. Ensure image quality is clear and professional
        10. Avoid excessive self-promotion or spam
      `;
    } else if (platformLower.includes('reddit')) {
      return `
        Reddit Guidelines:
        1. Follow subreddit-specific rules and guidelines
        2. Avoid self-promotion without community participation (9:1 ratio)
        3. No vote manipulation or asking for upvotes
        4. Respect Reddit's content policy (no harassment, illegal content, etc.)
        5. Disclose promotional relationships and sponsored content
        6. Don't post personal information
        7. Use appropriate post flairs when required
        8. Maintain authenticity and avoid misleading titles
        9. No excessive cross-posting across multiple subreddits
        10. Comply with each subreddit's formatting requirements
      `;
    } else {
      return `
        General Social Media Guidelines:
        1. Be authentic and transparent about promotional content
        2. No hate speech, harassment, or discriminatory content
        3. Avoid excessive self-promotion or spam-like behavior
        4. Respect intellectual property rights
        5. Don't share misleading or false information
        6. No promotion of dangerous activities or illegal goods
        7. Respect privacy and don't share others' personal information
        8. Follow proper disclosure practices for sponsored content
        9. Maintain appropriate and professional language
        10. Ensure content is accessible and inclusive
      `;
    }
  }

  /**
   * Recommend content mix for optimal engagement
   */
  async recommendContentMix(
    options: {
      platform: string;
      goals: string[];
      industry?: string;
      audienceData?: {
        demographics?: Record<string, any>;
        interests?: string[];
        preferences?: string[];
      };
      pastContentPerformance?: Array<{
        contentType: string;
        contentCategory: string;
        performance: {
          engagement?: number;
          reach?: number;
          conversions?: number;
        };
      }>;
      timeframe?: 'week' | 'month' | 'quarter';
      postFrequency?: {
        perDay?: number;
        perWeek?: number;
      };
      metadata?: Record<string, any>;
    }
  ): Promise<AITaskResult<{
    contentTypes: Array<{
      type: string;
      percentage: number;
      frequency: number;
      examples: string[];
      bestTimeToPost?: string[];
    }>;
    contentCategories: Array<{
      category: string;
      percentage: number;
      frequency: number;
      examples: string[];
      recommendedHashtags?: string[];
    }>;
    overall: {
      strategy: string;
      keyInsights: string[];
      recommendations: string[];
    };
  }>> {
    try {
      const { platform, goals, industry, audienceData, pastContentPerformance, timeframe = 'month', postFrequency, metadata } = options;
      
      if (!platform) {
        throw new Error('Platform is required for content mix recommendations');
      }
      
      if (!goals || !Array.isArray(goals) || goals.length === 0) {
        throw new Error('At least one goal is required for content mix recommendations');
      }
      
      logger.debug('Generating content mix recommendations', { 
        platform,
        goals: goals.join(', '),
        industry,
        timeframe,
        hasAudienceData: !!audienceData,
        hasPastPerformance: !!pastContentPerformance
      });
      
      // Create cache key
      const cacheData = {
        platform,
        goals,
        industry,
        timeframe,
        audienceData,
        pastContentPerformance,
        postFrequency
      };
      
      const cacheHash = this.hashString(JSON.stringify(cacheData));
      const cacheKey = `content-mix:${platform}:${cacheHash}`;
      
      // Check cache unless skipCache is set
      if (metadata?.skipCache !== true) {
        const cachedResult = this.cache.get<AITaskResult<{
          contentTypes: Array<{
            type: string;
            percentage: number;
            frequency: number;
            examples: string[];
            bestTimeToPost?: string[];
          }>;
          contentCategories: Array<{
            category: string;
            percentage: number;
            frequency: number;
            examples: string[];
            recommendedHashtags?: string[];
          }>;
          overall: {
            strategy: string;
            keyInsights: string[];
            recommendations: string[];
          };
        }>>(cacheKey);
        
        if (cachedResult) {
          logger.debug('Returning cached content mix recommendations');
          return cachedResult;
        }
      }
      
      // Prepare audience data summary
      let audienceSummary = '';
      if (audienceData) {
        if (audienceData.demographics) {
          audienceSummary += `Demographics: ${JSON.stringify(audienceData.demographics)}\n`;
        }
        
        if (audienceData.interests && audienceData.interests.length > 0) {
          audienceSummary += `Interests: ${audienceData.interests.join(', ')}\n`;
        }
        
        if (audienceData.preferences && audienceData.preferences.length > 0) {
          audienceSummary += `Preferences: ${audienceData.preferences.join(', ')}\n`;
        }
      }
      
      // Prepare past performance data
      let performanceData = '';
      if (pastContentPerformance && pastContentPerformance.length > 0) {
        performanceData = "Past content performance data:\n" + 
          pastContentPerformance.map(item => {
            const performance = [
              item.performance.engagement ? `engagement: ${item.performance.engagement}` : null,
              item.performance.reach ? `reach: ${item.performance.reach}` : null,
              item.performance.conversions ? `conversions: ${item.performance.conversions}` : null
            ].filter(Boolean).join(', ');
            
            return `- ${item.contentType} (${item.contentCategory}): ${performance}`;
          }).join('\n');
      }
      
      // Prepare posting frequency data
      let frequencyData = '';
      if (postFrequency) {
        const perDay = postFrequency.perDay ? `${postFrequency.perDay} posts per day` : null;
        const perWeek = postFrequency.perWeek ? `${postFrequency.perWeek} posts per week` : null;
        frequencyData = [perDay, perWeek].filter(Boolean).join(', ');
      } else {
        // Use platform defaults
        frequencyData = this.getDefaultPostFrequency(platform);
      }
      
      // Prepare platform-specific guidance
      const platformGuidance = this.getPlatformContentMixGuidance(platform, industry);
      
      // Prepare the prompt
      const prompt = `
        As a social media strategy expert, create a detailed content mix recommendation for ${platform}.
        
        GOALS:
        ${goals.map(g => `- ${g}`).join('\n')}
        
        ${industry ? `INDUSTRY: ${industry}\n` : ''}
        ${audienceSummary ? `AUDIENCE INFORMATION:\n${audienceSummary}\n` : ''}
        ${performanceData ? `${performanceData}\n` : ''}
        
        TIMEFRAME: ${timeframe}
        POSTING FREQUENCY: ${frequencyData}
        
        ${platformGuidance}
        
        Please provide a complete content mix strategy including:
        
        1. Content types with percentage breakdown, frequency, examples, and best times to post
        2. Content categories with percentage breakdown, frequency, examples, and recommended hashtags
        3. Overall strategy summary, key insights, and specific recommendations
        
        Return the response as a JSON object with the following structure:
        {
          "contentTypes": [
            {
              "type": "type name",
              "percentage": number (0-100),
              "frequency": number,
              "examples": ["example 1", "example 2", "example 3"],
              "bestTimeToPost": ["day and time 1", "day and time 2"]
            }
          ],
          "contentCategories": [
            {
              "category": "category name",
              "percentage": number (0-100),
              "frequency": number,
              "examples": ["example 1", "example 2", "example 3"],
              "recommendedHashtags": ["hashtag1", "hashtag2", "hashtag3"]
            }
          ],
          "overall": {
            "strategy": "overall strategy description",
            "keyInsights": ["insight 1", "insight 2", "insight 3"],
            "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
          }
        }
      `.trim();
      
      // Estimate token usage for the prompt
      const estimatedPromptTokens = estimateTokenUsage(prompt);
      
      // Request higher token count for this more complex task
      const generatedText = await this.provider.generateText(prompt, {
        maxTokens: metadata?.maxTokens || 2500,
        temperature: metadata?.temperature || 0.7
      });
      
      // Estimate token usage for the completion
      const estimatedCompletionTokens = estimateTokenUsage(generatedText);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;
      
      // Parse the JSON response
      let contentMixData: {
        contentTypes: Array<{
          type: string;
          percentage: number;
          frequency: number;
          examples: string[];
          bestTimeToPost?: string[];
        }>;
        contentCategories: Array<{
          category: string;
          percentage: number;
          frequency: number;
          examples: string[];
          recommendedHashtags?: string[];
        }>;
        overall: {
          strategy: string;
          keyInsights: string[];
          recommendations: string[];
        };
      };
      
      try {
        contentMixData = JSON.parse(generatedText);
        
        // Validate content types
        if (!Array.isArray(contentMixData.contentTypes)) {
          contentMixData.contentTypes = [];
        }
        
        // Validate content categories
        if (!Array.isArray(contentMixData.contentCategories)) {
          contentMixData.contentCategories = [];
        }
        
        // Validate overall strategy
        if (!contentMixData.overall || typeof contentMixData.overall !== 'object') {
          contentMixData.overall = {
            strategy: '',
            keyInsights: [],
            recommendations: []
          };
        }
        
        // Ensure all percentages add up to 100
        const normalizePercentages = (items: Array<{percentage: number}>) => {
          const total = items.reduce((sum, item) => sum + (item.percentage || 0), 0);
          
          if (total > 0 && total !== 100) {
            const factor = 100 / total;
            items.forEach(item => {
              item.percentage = Math.round((item.percentage || 0) * factor);
            });
          }
        };
        
        normalizePercentages(contentMixData.contentTypes);
        normalizePercentages(contentMixData.contentCategories);
        
        // Ensure all required fields exist and are of the correct type
        contentMixData.contentTypes = contentMixData.contentTypes.map(type => ({
          type: type.type || 'Unknown content type',
          percentage: typeof type.percentage === 'number' ? type.percentage : 0,
          frequency: typeof type.frequency === 'number' ? type.frequency : 0,
          examples: Array.isArray(type.examples) ? type.examples : [],
          bestTimeToPost: Array.isArray(type.bestTimeToPost) ? type.bestTimeToPost : []
        }));
        
        contentMixData.contentCategories = contentMixData.contentCategories.map(category => ({
          category: category.category || 'Unknown category',
          percentage: typeof category.percentage === 'number' ? category.percentage : 0,
          frequency: typeof category.frequency === 'number' ? category.frequency : 0,
          examples: Array.isArray(category.examples) ? category.examples : [],
          recommendedHashtags: Array.isArray(category.recommendedHashtags) ? category.recommendedHashtags : []
        }));
        
        contentMixData.overall = {
          strategy: contentMixData.overall.strategy || 'Balanced content strategy',
          keyInsights: Array.isArray(contentMixData.overall.keyInsights) ? contentMixData.overall.keyInsights : [],
          recommendations: Array.isArray(contentMixData.overall.recommendations) ? contentMixData.overall.recommendations : []
        };
        
      } catch (e) {
        // On parse error, create a default recommendation
        logger.warn('Failed to parse content mix recommendation result', {
          error: e instanceof Error ? e.message : String(e),
          generatedTextLength: generatedText.length
        });
        
        contentMixData = this.createDefaultContentMix(platform, industry, goals, timeframe);
      }
      
      // Track token usage if tracker is available
      if (this.tokenTracker && metadata?.userId) {
        const userId = metadata.userId as string;
        const orgId = metadata.organizationId as string;
        
        if (userId) {
          await this.tokenTracker.trackUsage(userId, totalTokens, orgId);
          logger.debug('Token usage tracked for content mix recommendations', { 
            userId, 
            tokens: totalTokens 
          });
        }
      }
      
      // Prepare the result
      const result: AITaskResult<typeof contentMixData> = {
        success: true,
        data: contentMixData,
        tokenUsage: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens
        }
      };
      
      // Cache the result with a longer TTL (1 day) unless specified
      const cacheTtl = metadata?.cacheTtl || 24 * 60 * 60;
      if (metadata?.skipCache !== true) {
        this.cache.set(cacheKey, result, cacheTtl);
      }
      
      logger.debug('Content mix recommendations generated', {
        platform,
        contentTypeCount: contentMixData.contentTypes.length,
        categoryCount: contentMixData.contentCategories.length
      });
      
      return result;
    } catch (error) {
      logger.error('Error generating content mix recommendations:', {
        error: error instanceof Error ? error.message : String(error),
        platform: options.platform,
        goals: options.goals
      });
      
      // Return fallback response in case of error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating content mix recommendations',
        data: this.createDefaultContentMix(options.platform, options.industry, options.goals, options.timeframe)
      };
    }
  }
  
  /**
   * Create default content mix for error fallback
   */
  private createDefaultContentMix(
    platform: string,
    industry?: string,
    goals?: string[],
    timeframe: 'week' | 'month' | 'quarter' = 'month'
  ): {
    contentTypes: Array<{
      type: string;
      percentage: number;
      frequency: number;
      examples: string[];
      bestTimeToPost?: string[];
    }>;
    contentCategories: Array<{
      category: string;
      percentage: number;
      frequency: number;
      examples: string[];
      recommendedHashtags?: string[];
    }>;
    overall: {
      strategy: string;
      keyInsights: string[];
      recommendations: string[];
    };
  } {
    const platformLower = platform.toLowerCase();
    
    // Default content types differ by platform
    let contentTypes: Array<{
      type: string;
      percentage: number;
      frequency: number;
      examples: string[];
      bestTimeToPost?: string[];
    }> = [];
    
    let contentCategories: Array<{
      category: string;
      percentage: number;
      frequency: number;
      examples: string[];
      recommendedHashtags?: string[];
    }> = [];
    
    // Platform-specific defaults
    if (platformLower.includes('instagram')) {
      contentTypes = [
        {
          type: "Carousel Posts",
          percentage: 40,
          frequency: 3,
          examples: ["Product feature carousel", "Educational step-by-step guide", "Before and after transformation"],
          bestTimeToPost: ["Tuesday 11am", "Thursday 3pm", "Friday 5pm"]
        },
        {
          type: "Single Image Posts",
          percentage: 30,
          frequency: 2,
          examples: ["Quote graphics", "Product spotlight", "User-generated content feature"],
          bestTimeToPost: ["Monday 12pm", "Wednesday 3pm"]
        },
        {
          type: "Reels",
          percentage: 30,
          frequency: 2,
          examples: ["Quick tips", "Behind-the-scenes", "Trend participation"],
          bestTimeToPost: ["Wednesday 7pm", "Saturday 12pm"]
        }
      ];
      
      contentCategories = [
        {
          category: "Educational",
          percentage: 40,
          frequency: 3,
          examples: ["How-to guides", "Industry insights", "Tips and tricks"],
          recommendedHashtags: ["#tips", "#learn", "#howto"]
        },
        {
          category: "Product/Service",
          percentage: 30,
          frequency: 2,
          examples: ["Features spotlight", "Use cases", "Customer testimonials"],
          recommendedHashtags: ["#product", "#service", "#review"]
        },
        {
          category: "Community/Lifestyle",
          percentage: 30,
          frequency: 2,
          examples: ["User-generated content", "Team spotlights", "Behind the scenes"],
          recommendedHashtags: ["#community", "#behindthescenes", "#meettheteam"]
        }
      ];
    } else if (platformLower.includes('linkedin')) {
      contentTypes = [
        {
          type: "Text Posts",
          percentage: 40,
          frequency: 2,
          examples: ["Industry insights", "Professional tips", "Company announcements"],
          bestTimeToPost: ["Tuesday 9am", "Thursday 1pm"]
        },
        {
          type: "Image/Document Posts",
          percentage: 30,
          frequency: 1,
          examples: ["Infographics", "Data visualizations", "Event photos"],
          bestTimeToPost: ["Wednesday 12pm", "Friday 10am"]
        },
        {
          type: "Articles",
          percentage: 15,
          frequency: 1,
          examples: ["Thought leadership", "Industry analysis", "Case studies"],
          bestTimeToPost: ["Monday 8am"]
        },
        {
          type: "Videos",
          percentage: 15,
          frequency: 1,
          examples: ["Product demonstrations", "Expert interviews", "Event recaps"],
          bestTimeToPost: ["Thursday 5pm"]
        }
      ];
      
      contentCategories = [
        {
          category: "Thought Leadership",
          percentage: 35,
          frequency: 2,
          examples: ["Industry trends", "Expert opinions", "Future predictions"],
          recommendedHashtags: ["#thoughtleadership", "#industry", "#innovation"]
        },
        {
          category: "Professional Development",
          percentage: 25,
          frequency: 1,
          examples: ["Career advice", "Skill development", "Workplace insights"],
          recommendedHashtags: ["#careers", "#professionaldevelopment", "#workplaceculture"]
        },
        {
          category: "Company News",
          percentage: 25,
          frequency: 1,
          examples: ["Achievements", "Milestones", "New offerings"],
          recommendedHashtags: ["#companynews", "#announcement", "#growth"]
        },
        {
          category: "Community Engagement",
          percentage: 15,
          frequency: 1,
          examples: ["Employee spotlights", "Client success stories", "Corporate responsibility"],
          recommendedHashtags: ["#community", "#success", "#impact"]
        }
      ];
    } else {
      // Generic content types and categories for any other platform
      contentTypes = [
        {
          type: "Images",
          percentage: 40,
          frequency: 4,
          examples: ["Product photos", "Infographics", "Quote graphics"],
          bestTimeToPost: ["Tuesday 10am", "Thursday 2pm"]
        },
        {
          type: "Videos",
          percentage: 30,
          frequency: 3,
          examples: ["Tutorials", "Behind-the-scenes", "Announcements"],
          bestTimeToPost: ["Wednesday 1pm", "Friday 5pm"]
        },
        {
          type: "Text/Link Posts",
          percentage: 30,
          frequency: 3,
          examples: ["Industry news", "Blog links", "Community questions"],
          bestTimeToPost: ["Monday 9am", "Thursday 11am"]
        }
      ];
      
      contentCategories = [
        {
          category: "Educational",
          percentage: 40,
          frequency: 4,
          examples: ["How-to guides", "Industry insights", "Tips and tricks"],
          recommendedHashtags: ["#tips", "#learn", "#howto"]
        },
        {
          category: "Promotional",
          percentage: 30,
          frequency: 3,
          examples: ["Product features", "Special offers", "Service highlights"],
          recommendedHashtags: ["#product", "#offer", "#service"]
        },
        {
          category: "Engagement",
          percentage: 30,
          frequency: 3,
          examples: ["Questions", "Polls", "Community highlights"],
          recommendedHashtags: ["#community", "#feedback", "#question"]
        }
      ];
    }
    
    // Create a strategy based on goals if provided
    let strategy = "Balanced content approach focusing on audience engagement and brand awareness.";
    let keyInsights = [
      "Consistent posting schedule is essential for algorithm visibility",
      "Mix of content types increases overall engagement",
      "Educational content typically outperforms purely promotional content"
    ];
    let recommendations = [
      "Maintain at least 3:1 ratio of value-giving to promotional content",
      "Repurpose high-performing content across different formats",
      "Analyze performance metrics monthly and adjust strategy accordingly"
    ];
    
    if (goals && goals.length > 0) {
      // Customize based on goals
      if (goals.some(g => g.toLowerCase().includes("brand") && g.toLowerCase().includes("awareness"))) {
        strategy = "Brand awareness-focused strategy emphasizing reach and visibility.";
        recommendations.push("Increase video content which typically has higher reach");
        recommendations.push("Utilize trending topics to expand visibility to new audiences");
      }
      
      if (goals.some(g => g.toLowerCase().includes("lead") || g.toLowerCase().includes("conversion"))) {
        strategy = "Lead generation and conversion-focused content strategy.";
        recommendations.push("Include clear calls-to-action in at least 80% of posts");
        recommendations.push("Develop content that addresses specific pain points in the customer journey");
      }
      
      if (goals.some(g => g.toLowerCase().includes("engagement"))) {
        strategy = "Engagement-focused strategy to build community and interaction.";
        recommendations.push("Increase question-based posts to stimulate comments");
        recommendations.push("Respond to all comments within 24 hours to encourage further engagement");
      }
    }
    
    return {
      contentTypes,
      contentCategories,
      overall: {
        strategy,
        keyInsights,
        recommendations
      }
    };
  }
  
  /**
   * Get default posting frequency for platform
   */
  private getDefaultPostFrequency(platform: string): string {
    const platformLower = platform.toLowerCase();
    
    if (platformLower.includes('instagram')) {
      return "4-7 posts per week";
    } else if (platformLower.includes('facebook')) {
      return "3-5 posts per week";
    } else if (platformLower.includes('twitter') || platformLower.includes('x')) {
      return "1-5 posts per day";
    } else if (platformLower.includes('linkedin')) {
      return "2-5 posts per week";
    } else if (platformLower.includes('tiktok')) {
      return "1-3 posts per day";
    } else if (platformLower.includes('pinterest')) {
      return "3-5 pins per day";
    } else if (platformLower.includes('youtube')) {
      return "1-2 videos per week";
    } else {
      return "3-5 posts per week";
    }
  }
  
  /**
   * Get platform-specific content mix guidance
   */
  private getPlatformContentMixGuidance(platform: string, industry?: string): string {
    const platformLower = platform.toLowerCase();
    
    if (platformLower.includes('instagram')) {
      return `
        For Instagram, consider these best practices:
        - Mix between carousel posts, single images, and Reels/videos
        - Emphasize visual quality and storytelling
        - Consider a consistent aesthetic theme
        - Balance promotional content with lifestyle, educational, and user-generated content
        - Use Stories for time-sensitive, informal content and to drive engagement
        - Include a mix of planned evergreen content and timely/reactive content
      `;
    } else if (platformLower.includes('facebook')) {
      return `
        For Facebook, consider these best practices:
        - Focus on content that generates meaningful interactions (comments, shares)
        - Mix between text, image, video, and link posts
        - Consider utilizing Facebook Groups for community building
        - Include a balance of entertaining, informative, and promotional content
        - Leverage Facebook Events for special announcements or virtual gatherings
        - Use a mix of short-form and long-form content
      `;
    } else if (platformLower.includes('twitter') || platformLower.includes('x')) {
      return `
        For Twitter/X, consider these best practices:
        - Focus on timely, conversational content
        - Mix between text posts, images, videos, and polls
        - Participate in relevant trending topics and conversations
        - Balance original content with sharing/retweeting industry news
        - Use threads for longer-form content or storytelling
        - Consider a higher frequency posting strategy than other platforms
      `;
    } else if (platformLower.includes('linkedin')) {
      return `
        For LinkedIn, consider these best practices:
        - Focus on professional, value-adding content
        - Mix between text posts, articles, documents, and videos
        - Emphasize thought leadership and industry expertise
        - Balance company news with educational content
        - Consider employee spotlight and company culture content
        - Use a more formal tone compared to other platforms
        - Focus on business value and professional development
      `;
    } else if (platformLower.includes('tiktok')) {
      return `
        For TikTok, consider these best practices:
        - Focus on authentic, entertaining, short-form video content
        - Emphasize trending sounds, challenges, and formats
        - Mix educational, behind-the-scenes, and entertainment content
        - Consider a less polished, more authentic approach
        - Use trending hashtags and participate in platform trends
        - Focus on content that hooks viewers in the first 3 seconds
      `;
    } else if (platformLower.includes('pinterest')) {
      return `
        For Pinterest, consider these best practices:
        - Focus on inspirational, aspirational, and educational content
        - Emphasize high-quality vertical images and infographics
        - Mix between product pins, idea pins, and standard pins
        - Consider seasonal and trending content well in advance
        - Focus on searchable, evergreen content
        - Use detailed descriptions with relevant keywords
      `;
    } else {
      return `
        General social media best practices:
        - Maintain a consistent posting schedule
        - Mix between text, image, video, and interactive content
        - Balance promotional (20%) with value-adding content (80%)
        - Consider content pillars that align with business objectives
        - Include a mix of created, curated, and user-generated content
        - Adapt tone and format to the specific platform
      `;
    }
  }

  /**
   * Analyze social media messages for sentiment, keywords, and categorization
   * @param options Options for message analysis
   * @returns Analysis results with token usage
   */
  async analyzeMessages(
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
      urgency?: 'high' | 'medium' | 'low';
      category?: string;
    }>;
    conversationSummary?: string;
    overallSentiment?: {
      label: 'positive' | 'negative' | 'neutral' | 'mixed';
      score: number;
    };
  }>> {
    try {
      // Build a system message for the AI model
      const systemMessage = `You are an expert social media analyst. 
Your task is to analyze the provided social media messages and provide detailed analysis including sentiment, keywords, tone, and categorization.
Always provide structured data suitable for parsing as JSON.`;

      // Format messages for analysis
      const formattedMessages = options.messages.map(msg => {
        let formattedMsg = `ID: ${msg.id}\nPlatform: ${msg.platform}\nContent: ${msg.content}`;
        if (msg.author) formattedMsg += `\nAuthor: ${msg.author}`;
        if (msg.timestamp) formattedMsg += `\nTimestamp: ${msg.timestamp}`;
        return formattedMsg;
      }).join('\n\n---\n\n');

      // Create the user prompt
      const userPrompt = `Please analyze the following social media messages:

${formattedMessages}

Provide the following:
1. Analysis for each individual message with sentiment
${options.includeKeywords ? '2. Keywords for each message' : ''}
${options.includeTone ? '3. Tone analysis for each message' : ''}
${options.includeSummary ? '4. A brief summary of the entire conversation' : ''}
${options.categoryTags && options.categoryTags.length > 0 ? 
  `5. Categorize each message into one of these categories: ${options.categoryTags.join(', ')}` : ''}

Format your response as a JSON object with the following structure:
{
  "messageAnalysis": [
    {
      "id": "string (message ID)",
      "sentiment": {
        "label": "string (positive, negative, neutral, or mixed)",
        "score": "number (0-1 representing confidence)"
      },
      ${options.includeKeywords ? `"keywords": ["string array of keywords"],` : ''}
      ${options.includeTone ? `"tone": {
        "primary": "string (descriptive tone)",
        "secondary": "string (optional secondary tone)"
      },` : ''}
      "urgency": "string (high, medium, or low)",
      ${options.categoryTags && options.categoryTags.length > 0 ? `"category": "string (one of the provided categories)",` : ''}
    }
  ],
  ${options.includeSummary ? `"conversationSummary": "string (brief summary)",` : ''}
  "overallSentiment": {
    "label": "string (positive, negative, neutral, or mixed)",
    "score": "number (0-1 representing confidence)"
  }
}`;

      // Call the AI model
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt }
      ];

      const response = await this.provider.generateChat(messages, {
        temperature: 0.3,
        maxTokens: 2500
      });

      // Parse the JSON response
      let parsedResponse: any;
      try {
        // Extract JSON from the response if needed
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                         response.match(/```\n([\s\S]*?)\n```/) || 
                         response.match(/({[\s\S]*})/);
        
        const jsonString = jsonMatch ? jsonMatch[1] : response;
        parsedResponse = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Failed to parse analysis data from AI response');
      }

      // Validate the parsed response
      if (!parsedResponse.messageAnalysis || !Array.isArray(parsedResponse.messageAnalysis)) {
        throw new Error('Invalid analysis format from AI');
      }

      // Track token usage if tracker is available
      if (this.tokenTracker && options.metadata?.userId) {
        await this.tokenTracker.trackUsage(
          options.metadata.userId,
          1, // Count as one token for our system
          options.metadata?.organizationId
        );
      }

      return {
        success: true,
        data: parsedResponse,
        tokenUsage: {
          prompt: 1,
          completion: 0,
          total: 1
        }
      };
    } catch (error) {
      console.error('Error analyzing messages:', error);
      throw new Error(`Failed to analyze messages: ${(error as Error).message}`);
    }
  }
}

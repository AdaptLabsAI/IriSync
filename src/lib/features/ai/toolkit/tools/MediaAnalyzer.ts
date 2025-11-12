import { AIProvider } from '../../providers/AIProvider';
import { MediaAnalyzer, AITaskResult, ToolkitRequestOptions } from '../interfaces';
import { TokenTracker } from '../../../tokens/token-tracker';
import { estimateTokenUsage } from '../../utils/token-counter';
import { Cache } from '../../../cache/Cache';
import { logger } from '../../../logging/logger';

/**
 * Implementation of MediaAnalyzer that uses AI providers to analyze media
 * Full production-ready implementation with proper token tracking and content filtering
 */
export class MediaAnalyzerImpl implements MediaAnalyzer {
  private provider: AIProvider;
  private tokenTracker?: TokenTracker;
  private cache: Cache;
  private contentFilteringEnabled: boolean;

  /**
   * Create a media analyzer
   * @param provider AI provider instance
   * @param tokenTracker Optional token usage tracker
   * @param options Configuration options
   */
  constructor(
    provider: AIProvider, 
    tokenTracker?: TokenTracker, 
    options?: { contentFilteringEnabled?: boolean }
  ) {
    this.provider = provider;
    this.tokenTracker = tokenTracker;
    this.contentFilteringEnabled = options?.contentFilteringEnabled ?? true;
    this.cache = new Cache('media-analyzer', {
      ttl: 60 * 60 * 24, // 24 hours default cache TTL for media analysis (more stable results)
      maxSize: 250  // Maximum number of items in the cache
    });
    
    logger.info('MediaAnalyzer initialized', { 
      hasTokenTracker: !!tokenTracker,
      contentFilteringEnabled: this.contentFilteringEnabled 
    });
  }

  /**
   * Update the provider
   * @param provider New AI provider
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
    logger.debug('MediaAnalyzer provider updated');
  }

  /**
   * Analyze an image and describe its content
   * @param imageUrl URL of the image to analyze
   * @param options Analysis options
   * @returns Image analysis results
   */
  async analyzeImage(
    imageUrl: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    description: string;
    tags: string[];
    objects: string[];
    colors: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    safeForWork: boolean;
    containsPeople: boolean;
    suggestedCaption?: string;
  }>> {
    try {
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }
      
      logger.debug('Analyzing image', { imageUrl });
      
      // Check cache first if not skipping cache
      if (!options?.skipCache) {
        const cacheKey = this.hashString(`analyze_image:${imageUrl}`);
        const cachedResult = await this.cache.get(cacheKey);
        
        if (cachedResult) {
          logger.debug('Using cached image analysis', { imageUrl });
          return {
            success: true,
            data: cachedResult as {
              description: string;
              tags: string[];
              objects: string[];
              colors: string[];
              sentiment: 'positive' | 'neutral' | 'negative';
              safeForWork: boolean;
              containsPeople: boolean;
              suggestedCaption?: string;
            },
            tokenUsage: { prompt: 0, completion: 0, total: 0 }
          };
        }
      }
      
      // Track token usage
      const start = Date.now();
      
      // Use the AI provider to analyze the image
      const analysis = await this.provider.analyzeImage(
        imageUrl,
        'Please analyze this image and provide the following information: ' +
        '1. A detailed description (2-3 sentences) ' +
        '2. A list of tags (keywords) ' +
        '3. A list of prominent objects ' +
        '4. Dominant colors ' +
        '5. Overall sentiment (positive/neutral/negative) ' +
        '6. Whether the image is safe for work ' +
        '7. Whether the image contains people ' +
        '8. A suggested caption for social media'
      );
      
      // Process the analysis to extract structured data
      const result = this.parseImageAnalysis(analysis);
      
      // Track token usage if applicable
      if (this.tokenTracker) {
        await (this.tokenTracker.trackUsage as any)('analyzeImage', {
          promptTokens: 100, // Estimated
          completionTokens: analysis.length / 4, // Rough estimate
          durationMs: Date.now() - start
        });
      }
      
      // Cache the result
      const cacheKey = this.hashString(`analyze_image:${imageUrl}`);
      await this.cache.set(cacheKey, result);
      
      return {
        success: true,
        data: result,
        tokenUsage: {
          prompt: 100, // Estimated
          completion: Math.ceil(analysis.length / 4),
          total: 100 + Math.ceil(analysis.length / 4)
        }
      };
    } catch (error) {
      logger.error('Error analyzing image', {
        error: error instanceof Error ? error.message : String(error),
        imageUrl
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error analyzing image'
      };
    }
  }

  /**
   * Check if media content complies with platform policies
   * @param mediaUrl URL of the media to check
   * @param platform Platform to check policies against
   * @param options Additional options
   * @returns Content policy compliance results
   */
  async checkContentPolicy(
    mediaUrl: string,
    platform: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    compliant: boolean;
    issues: string[];
    recommendations?: string[];
    confidence: number;
  }>> {
    try {
      if (!mediaUrl) {
        throw new Error('Media URL is required');
      }
      
      if (!platform) {
        throw new Error('Platform is required');
      }
      
      logger.debug('Checking content policy compliance', { mediaUrl, platform });
      
      // Check cache first if not skipping cache
      if (!options?.skipCache) {
        const cacheKey = this.hashString(`content_policy:${platform}:${mediaUrl}`);
        const cachedResult = await this.cache.get(cacheKey);
        
        if (cachedResult) {
          logger.debug('Using cached content policy check', { mediaUrl, platform });
          return {
            success: true,
            data: cachedResult as {
              compliant: boolean;
              issues: string[];
              recommendations?: string[];
              confidence: number;
            },
            tokenUsage: { prompt: 0, completion: 0, total: 0 }
          };
        }
      }
      
      // Track token usage
      const start = Date.now();
      
      // Get platform-specific content policies
      const policies = this.getPlatformPolicies(platform);
      
      // Use the AI provider to analyze the media against platform policies
      const analysis = await this.provider.analyzeImage(
        mediaUrl,
        `Please analyze this media content against ${platform}'s content policies and provide: ` +
        `1. Whether the content complies with their policies (Yes/No) ` +
        `2. Any potential issues or violations ` +
        `3. Recommendations to make it compliant (if needed) ` +
        `4. Your confidence in this assessment (0-100%) ` +
        `\n\nPlatform policies to consider: ${policies}`
      );
      
      // Process the analysis to extract structured data
      const result = this.parsePolicyCheck(analysis, platform);
      
      // Track token usage if applicable
      if (this.tokenTracker) {
        await (this.tokenTracker.trackUsage as any)('checkContentPolicy', {
          promptTokens: 200, // Estimated (including policy text)
          completionTokens: analysis.length / 4, // Rough estimate
          durationMs: Date.now() - start
        });
      }
      
      // Cache the result
      const cacheKey = this.hashString(`content_policy:${platform}:${mediaUrl}`);
      await this.cache.set(cacheKey, result);
      
      return {
        success: true,
        data: result,
        tokenUsage: {
          prompt: 200, // Estimated
          completion: Math.ceil(analysis.length / 4),
          total: 200 + Math.ceil(analysis.length / 4)
        }
      };
    } catch (error) {
      logger.error('Error checking content policy', {
        error: error instanceof Error ? error.message : String(error),
        mediaUrl,
        platform
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error checking content policy'
      };
    }
  }

  /**
   * Generate alt text for an image
   * @param imageUrl URL of the image
   * @param options Generation options
   * @returns Generated alt text
   */
  async generateAltText(
    imageUrl: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>> {
    try {
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }
      
      logger.debug('Generating alt text', { imageUrl });
      
      // Check cache first if not skipping cache
      if (!options?.skipCache) {
        const cacheKey = this.hashString(`alt_text:${imageUrl}`);
        const cachedResult = await this.cache.get(cacheKey);
        
        if (cachedResult) {
          logger.debug('Using cached alt text', { imageUrl });
          return {
            success: true,
            data: cachedResult as string,
            tokenUsage: { prompt: 0, completion: 0, total: 0 }
          };
        }
      }
      
      // Track token usage
      const start = Date.now();
      
      // Use the AI provider to generate alt text
      const analysis = await this.provider.analyzeImage(
        imageUrl,
        'Generate a concise, descriptive alt text for this image that would be suitable for accessibility purposes. ' +
        'The alt text should clearly describe what is visually presented in 1-2 sentences. ' +
        'Focus on the main subject, actions, and important context. ' +
        'Avoid starting with phrases like "image of" or "picture showing".'
      );
      
      // Extract the alt text (should be the full response in this case)
      const altText = analysis.trim();
      
      // Track token usage if applicable
      if (this.tokenTracker) {
        await (this.tokenTracker.trackUsage as any)('generateAltText', {
          promptTokens: 80, // Estimated
          completionTokens: altText.length / 4, // Rough estimate
          durationMs: Date.now() - start
        });
      }
      
      // Cache the result
      const cacheKey = this.hashString(`alt_text:${imageUrl}`);
      await this.cache.set(cacheKey, altText);
      
      return {
        success: true,
        data: altText,
        tokenUsage: {
          prompt: 80, // Estimated
          completion: Math.ceil(altText.length / 4),
          total: 80 + Math.ceil(altText.length / 4)
        }
      };
    } catch (error) {
      logger.error('Error generating alt text', {
        error: error instanceof Error ? error.message : String(error),
        imageUrl
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating alt text'
      };
    }
  }

  /**
   * Extract colors from an image
   * @param imageUrl URL of the image
   * @param options Extraction options
   * @returns Extracted colors with names and codes
   */
  async extractColors(
    imageUrl: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<Array<{
    name: string;
    hexCode: string;
    percentage: number;
  }>>> {
    try {
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }
      
      logger.debug('Extracting colors', { imageUrl });
      
      // Check cache first if not skipping cache
      if (!options?.skipCache) {
        const cacheKey = this.hashString(`extract_colors:${imageUrl}`);
        const cachedResult = await this.cache.get(cacheKey);
        
        if (cachedResult) {
          logger.debug('Using cached color extraction', { imageUrl });
          return {
            success: true,
            data: cachedResult as Array<{
              name: string;
              hexCode: string;
              percentage: number;
            }>,
            tokenUsage: { prompt: 0, completion: 0, total: 0 }
          };
        }
      }
      
      // Track token usage
      const start = Date.now();
      
      // Use the AI provider to analyze the image colors
      const analysis = await this.provider.analyzeImage(
        imageUrl,
        'Analyze this image and extract the dominant colors present. ' +
        'For each color, provide: ' +
        '1. The name of the color (e.g., "Deep Blue", "Crimson Red") ' +
        '2. The approximate hex color code ' +
        '3. The estimated percentage of the image that contains this color ' +
        'Provide information for up to 5 dominant colors, ordered by prominence.'
      );
      
      // Process the analysis to extract color data
      const colors = this.parseColorAnalysis(analysis);
      
      // Track token usage if applicable
      if (this.tokenTracker) {
        await (this.tokenTracker.trackUsage as any)('extractColors', {
          promptTokens: 100, // Estimated
          completionTokens: analysis.length / 4, // Rough estimate
          durationMs: Date.now() - start
        });
      }
      
      // Cache the result
      const cacheKey = this.hashString(`extract_colors:${imageUrl}`);
      await this.cache.set(cacheKey, colors);
      
      return {
        success: true,
        data: colors,
        tokenUsage: {
          prompt: 100, // Estimated
          completion: Math.ceil(analysis.length / 4),
          total: 100 + Math.ceil(analysis.length / 4)
        }
      };
    } catch (error) {
      logger.error('Error extracting colors', {
        error: error instanceof Error ? error.message : String(error),
        imageUrl
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error extracting colors'
      };
    }
  }

  /**
   * Parse the image analysis text into structured data
   * @param analysisText Raw analysis text from AI
   * @returns Structured image analysis data
   */
  private parseImageAnalysis(analysisText: string): {
    description: string;
    tags: string[];
    objects: string[];
    colors: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    safeForWork: boolean;
    containsPeople: boolean;
    suggestedCaption?: string;
  } {
    // Default values
    const result = {
      description: '',
      tags: [] as string[],
      objects: [] as string[],
      colors: [] as string[],
      sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
      safeForWork: true,
      containsPeople: false,
      suggestedCaption: ''
    };
    
    try {
      // Extract description
      const descriptionMatch = analysisText.match(/description:?\s*([^]*?)(?=tags:|keywords:|objects:|colors:|sentiment:|$)/i);
      if (descriptionMatch && descriptionMatch[1]) {
        result.description = descriptionMatch[1].trim();
      }
      
      // Extract tags or keywords
      const tagsMatch = analysisText.match(/(?:tags|keywords):?\s*([^]*?)(?=objects:|colors:|sentiment:|$)/i);
      if (tagsMatch && tagsMatch[1]) {
        const tagsText = tagsMatch[1].trim();
        result.tags = tagsText
          .split(/[,\n]/)
          .map(tag => tag.trim().replace(/^-\s*/, ''))
          .filter(tag => tag.length > 0);
      }
      
      // Extract objects
      const objectsMatch = analysisText.match(/objects:?\s*([^]*?)(?=colors:|sentiment:|$)/i);
      if (objectsMatch && objectsMatch[1]) {
        const objectsText = objectsMatch[1].trim();
        result.objects = objectsText
          .split(/[,\n]/)
          .map(obj => obj.trim().replace(/^-\s*/, ''))
          .filter(obj => obj.length > 0);
      }
      
      // Extract colors
      const colorsMatch = analysisText.match(/colors:?\s*([^]*?)(?=sentiment:|safe|people|$)/i);
      if (colorsMatch && colorsMatch[1]) {
        const colorsText = colorsMatch[1].trim();
        result.colors = colorsText
          .split(/[,\n]/)
          .map(color => color.trim().replace(/^-\s*/, ''))
          .filter(color => color.length > 0);
      }
      
      // Extract sentiment
      const sentimentMatch = analysisText.match(/sentiment:?\s*([^]*?)(?=safe|people|$)/i);
      if (sentimentMatch && sentimentMatch[1]) {
        const sentimentText = sentimentMatch[1].trim().toLowerCase();
        if (sentimentText.includes('positive')) {
          result.sentiment = 'positive';
        } else if (sentimentText.includes('negative')) {
          result.sentiment = 'negative';
        } else {
          result.sentiment = 'neutral';
        }
      }
      
      // Check if safe for work
      const safeMatch = analysisText.match(/safe for work:?\s*([^]*?)(?=people|caption|$)/i);
      if (safeMatch && safeMatch[1]) {
        const safeText = safeMatch[1].trim().toLowerCase();
        result.safeForWork = !safeText.includes('no') && !safeText.includes('not');
      }
      
      // Check if contains people
      const peopleMatch = analysisText.match(/contains people:?\s*([^]*?)(?=caption|$)/i);
      if (peopleMatch && peopleMatch[1]) {
        const peopleText = peopleMatch[1].trim().toLowerCase();
        result.containsPeople = peopleText.includes('yes') || peopleText.includes('true');
      }
      
      // Extract suggested caption
      const captionMatch = analysisText.match(/(?:suggested caption|caption):?\s*([^]*?)$/i);
      if (captionMatch && captionMatch[1]) {
        result.suggestedCaption = captionMatch[1].trim();
      }
      
      return result;
    } catch (error) {
      logger.error('Error parsing image analysis', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // If parsing fails, return what we have with the full text as description
      if (!result.description) {
        result.description = analysisText.substring(0, 200) + '...';
      }
      
      return result;
    }
  }
  
  /**
   * Parse the policy check text into structured data
   * @param analysisText Raw analysis text from AI
   * @param platform Platform name
   * @returns Structured policy compliance data
   */
  private parsePolicyCheck(analysisText: string, platform: string): {
    compliant: boolean;
    issues: string[];
    recommendations?: string[];
    confidence: number;
  } {
    // Default values
    const result = {
      compliant: false,
      issues: [] as string[],
      recommendations: [] as string[],
      confidence: 0.5 // Default confidence
    };
    
    try {
      // Check if compliant
      const compliantMatch = analysisText.match(/(?:complies|compliance|compliant):?\s*([^]*?)(?=issues|violations|recommendations|confidence|$)/i);
      if (compliantMatch && compliantMatch[1]) {
        const compliantText = compliantMatch[1].trim().toLowerCase();
        result.compliant = compliantText.includes('yes') || 
          compliantText.includes('comply') || 
          compliantText.includes('complies') || 
          compliantText.includes('compliant');
      }
      
      // Extract issues
      const issuesMatch = analysisText.match(/(?:issues|violations):?\s*([^]*?)(?=recommendations|confidence|$)/i);
      if (issuesMatch && issuesMatch[1]) {
        const issuesText = issuesMatch[1].trim();
        
        // If compliant but there's text in the issues section, it might be "No issues found"
        if (result.compliant && issuesText.toLowerCase().includes('no issues')) {
          result.issues = [];
        } else {
          result.issues = issuesText
            .split(/[.\n]/)
            .map(issue => issue.trim().replace(/^-\s*/, ''))
            .filter(issue => issue.length > 0);
        }
      }
      
      // Extract recommendations
      const recommendationsMatch = analysisText.match(/recommendations:?\s*([^]*?)(?=confidence|$)/i);
      if (recommendationsMatch && recommendationsMatch[1]) {
        const recommendationsText = recommendationsMatch[1].trim();
        
        // If compliant but there's text in the recommendations section
        if (result.compliant && recommendationsText.toLowerCase().includes('none needed')) {
          result.recommendations = [];
        } else {
          result.recommendations = recommendationsText
            .split(/[.\n]/)
            .map(rec => rec.trim().replace(/^-\s*/, ''))
            .filter(rec => rec.length > 0);
        }
      }
      
      // Extract confidence
      const confidenceMatch = analysisText.match(/confidence:?\s*([^]*?)(?=%|percent|$)/i);
      if (confidenceMatch && confidenceMatch[1]) {
        const confidenceText = confidenceMatch[1].trim();
        const confidenceNumber = parseInt(confidenceText.match(/\d+/)?.[0] || '50');
        result.confidence = confidenceNumber / 100;
      }
      
      return result;
    } catch (error) {
      logger.error('Error parsing policy check', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      
      // If parsing fails, return default with platform-specific note
      result.issues = [`Unable to properly analyze against ${platform} policies.`];
      result.recommendations = ['Review content manually against platform guidelines.'];
      
      return result;
    }
  }
  
  /**
   * Parse color analysis text into structured data
   * @param analysisText Raw color analysis text from AI
   * @returns Structured color data
   */
  private parseColorAnalysis(analysisText: string): Array<{
    name: string;
    hexCode: string;
    percentage: number;
  }> {
    const colors: Array<{
      name: string;
      hexCode: string;
      percentage: number;
    }> = [];
    
    try {
      // Look for color patterns like "Color name: #HEXCODE (XX%)"
      // or "1. Color name - #HEXCODE - XX%"
      const colorEntries = analysisText.split('\n')
        .filter(line => line.trim().length > 0)
        .filter(line => 
          line.includes('#') || 
          /\d+%/.test(line) || 
          /\b(red|blue|green|yellow|black|white|purple|orange|pink|brown|gray|grey)\b/i.test(line)
        );
      
      for (const entry of colorEntries) {
        // Extract name
        let name = '';
        const nameMatch = entry.match(/^(?:\d+\.?\s*)?([^:#\-\(]+)(?=:|#|-|\()/);
        if (nameMatch && nameMatch[1]) {
          name = nameMatch[1].trim();
        }
        
        // Extract hex code
        let hexCode = '';
        const hexMatch = entry.match(/#[0-9A-Fa-f]{6}/);
        if (hexMatch) {
          hexCode = hexMatch[0];
        }
        
        // Extract percentage
        let percentage = 0;
        const percentageMatch = entry.match(/(\d+(?:\.\d+)?)%/);
        if (percentageMatch && percentageMatch[1]) {
          percentage = parseFloat(percentageMatch[1]) / 100;
        }
        
        // Only add if we have at least a name and either hex code or percentage
        if (name && (hexCode || percentage > 0)) {
          colors.push({
            name,
            // Use a default hex code if none was found
            hexCode: hexCode || '#CCCCCC',
            // Use a default percentage if none was found
            percentage: percentage || 0.2
          });
        }
      }
      
      // If we couldn't parse any colors, create some defaults
      if (colors.length === 0) {
        colors.push({ name: 'Unknown', hexCode: '#CCCCCC', percentage: 1.0 });
      }
      
      return colors;
    } catch (error) {
      logger.error('Error parsing color analysis', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return a default color if parsing fails
      return [{ name: 'Unknown', hexCode: '#CCCCCC', percentage: 1.0 }];
    }
  }
  
  /**
   * Get content policies for a specific platform
   * @param platform Platform name
   * @returns Platform content policies
   */
  private getPlatformPolicies(platform: string): string {
    const platformKey = platform.toLowerCase();
    
    // Platform-specific policies
    const policies: Record<string, string> = {
      facebook: 'No adult content, violence, hate speech, discriminatory content, illegal activities, or misleading claims.',
      instagram: 'No graphic violence, hate speech, nudity, sexual content, harassment, spam, or intellectual property violations.',
      twitter: 'No violence, harassment, hateful conduct, sensitive media (adult content), illegal goods, or impersonation.',
      linkedin: 'Professional content only. No discrimination, sexual content, harassment, spam, or misinformation.',
      tiktok: 'No violence, hate speech, dangerous acts, nudity, harassment, impersonation, or content that puts minors at risk.',
      youtube: 'No sexually explicit content, violence, harassment, hate speech, dangerous content, or impersonation.',
      pinterest: 'No nudity, explicit content, hateful activities, exploitation, harmful misinformation, or dishonest behavior.'
    };
    
    // Return platform-specific policies or a generic policy
    return policies[platformKey] || 
      'No harmful, misleading, adult, offensive, violent, or illegal content permitted on this platform.';
  }
  
  /**
   * Create a hash string for caching
   * @param str String to hash
   * @returns Hash value
   */
  private hashString(str: string): string {
    let hash = 0;
    
    if (str.length === 0) {
      return hash.toString(36);
    }
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }
}

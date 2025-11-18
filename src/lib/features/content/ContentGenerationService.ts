/**
 * Content Generation Service
 *
 * AI-powered content generation and optimization for social media posts:
 * - Generate post captions using AI
 * - Platform-specific optimization
 * - Hashtag suggestions
 * - Content variations for A/B testing
 * - Character limit compliance
 * - Tone and style adjustments
 */

import { aiService } from '../ai/AIService';
import { PlatformType } from '../platforms/PlatformProvider';
import { postAnalyticsService } from '../analytics/PostAnalyticsService';
import { logger } from '../../core/logging/logger';

/**
 * Content generation request
 */
export interface ContentGenerationRequest {
  topic: string;
  platformType: PlatformType;
  tone?: 'professional' | 'casual' | 'friendly' | 'inspirational' | 'humorous' | 'urgent';
  targetAudience?: string;
  keywords?: string[];
  callToAction?: string;
  includeHashtags?: boolean;
  maxHashtags?: number;
  includeEmojis?: boolean;
  contentType?: 'text' | 'image' | 'video' | 'carousel';
  additionalContext?: string;
}

/**
 * Generated content response
 */
export interface GeneratedContent {
  caption: string;
  hashtags: string[];
  characterCount: number;
  wordCount: number;
  platformCompliant: boolean;
  optimizationScore: number; // 0-100
  suggestions: string[];
  alternatives?: string[]; // Variation suggestions
}

/**
 * Platform content guidelines
 */
interface PlatformGuidelines {
  maxCharacters: number;
  maxHashtags: number;
  recommendedHashtags: number;
  supportsMarkdown: boolean;
  supportsEmojis: boolean;
  bestPractices: string[];
}

/**
 * Hashtag suggestion result
 */
export interface HashtagSuggestion {
  tag: string;
  relevance: number; // 0-1
  popularity: 'high' | 'medium' | 'low';
  competition: 'high' | 'medium' | 'low';
  category?: string;
}

/**
 * Best time to post recommendation
 */
export interface BestTimeRecommendation {
  dayOfWeek: string;
  hour: number;
  timezone: string;
  confidence: number; // 0-1
  expectedEngagementRate: number;
  reasoning: string;
}

/**
 * Service for AI-powered content generation and optimization
 */
export class ContentGenerationService {
  private platformGuidelines: Map<PlatformType, PlatformGuidelines>;

  constructor() {
    this.platformGuidelines = new Map([
      [PlatformType.INSTAGRAM, {
        maxCharacters: 2200,
        maxHashtags: 30,
        recommendedHashtags: 10,
        supportsMarkdown: false,
        supportsEmojis: true,
        bestPractices: [
          'Use high-quality visuals',
          'Post consistently',
          'Engage with comments',
          'Use Stories for daily updates',
          'Include a call-to-action'
        ]
      }],
      [PlatformType.TWITTER, {
        maxCharacters: 280,
        maxHashtags: 3,
        recommendedHashtags: 2,
        supportsMarkdown: false,
        supportsEmojis: true,
        bestPractices: [
          'Be concise and clear',
          'Use 1-2 relevant hashtags',
          'Include engaging media',
          'Join conversations',
          'Tweet at peak times'
        ]
      }],
      [PlatformType.FACEBOOK, {
        maxCharacters: 63206,
        maxHashtags: 5,
        recommendedHashtags: 2,
        supportsMarkdown: false,
        supportsEmojis: true,
        bestPractices: [
          'Ask questions to boost engagement',
          'Keep posts concise',
          'Use visual content',
          'Post when audience is active',
          'Respond to comments quickly'
        ]
      }],
      [PlatformType.LINKEDIN, {
        maxCharacters: 3000,
        maxHashtags: 5,
        recommendedHashtags: 3,
        supportsMarkdown: false,
        supportsEmojis: true,
        bestPractices: [
          'Share professional insights',
          'Use data and statistics',
          'Post during business hours',
          'Engage with industry discussions',
          'Maintain professional tone'
        ]
      }],
      [PlatformType.TIKTOK, {
        maxCharacters: 2200,
        maxHashtags: 10,
        recommendedHashtags: 5,
        supportsMarkdown: false,
        supportsEmojis: true,
        bestPractices: [
          'Hook viewers in first 3 seconds',
          'Follow trends and challenges',
          'Use popular sounds',
          'Keep videos short and engaging',
          'Be authentic'
        ]
      }],
      [PlatformType.YOUTUBE, {
        maxCharacters: 5000,
        maxHashtags: 15,
        recommendedHashtags: 5,
        supportsMarkdown: true,
        supportsEmojis: true,
        bestPractices: [
          'Create compelling thumbnails',
          'Optimize titles for search',
          'Add timestamps for longer videos',
          'Engage with comments',
          'Post consistently'
        ]
      }]
    ]);
  }

  /**
   * Generate content for a social media post
   */
  async generateContent(
    request: ContentGenerationRequest,
    userId: string,
    organizationId: string
  ): Promise<GeneratedContent> {
    try {
      logger.info('Generating content', {
        topic: request.topic,
        platform: request.platformType,
        tone: request.tone
      });

      const guidelines = this.platformGuidelines.get(request.platformType);
      if (!guidelines) {
        throw new Error(`Unsupported platform: ${request.platformType}`);
      }

      // Build AI prompt for content generation
      const prompt = this.buildContentPrompt(request, guidelines);

      // Generate content using AI service
      const aiResponse = await aiService.processChatbotRequest({
        userId,
        organizationId,
        message: prompt,
        conversationHistory: [],
        context: []
      });

      // Parse AI response
      const caption = this.extractCaption(aiResponse.output);

      // Generate or extract hashtags
      let hashtags: string[] = [];
      if (request.includeHashtags !== false) {
        hashtags = await this.generateHashtags(
          request.topic,
          request.platformType,
          request.keywords || [],
          request.maxHashtags || guidelines.recommendedHashtags
        );
      }

      // Calculate metrics
      const characterCount = caption.length;
      const wordCount = caption.split(/\s+/).length;
      const platformCompliant = characterCount <= guidelines.maxCharacters &&
                                hashtags.length <= guidelines.maxHashtags;

      // Calculate optimization score
      const optimizationScore = this.calculateOptimizationScore(
        caption,
        hashtags,
        request.platformType,
        guidelines
      );

      // Generate suggestions
      const suggestions = this.generateSuggestions(
        caption,
        hashtags,
        request.platformType,
        guidelines,
        platformCompliant
      );

      // Generate alternatives
      const alternatives = await this.generateAlternatives(
        caption,
        request,
        userId,
        organizationId
      );

      logger.info('Content generated successfully', {
        characterCount,
        hashtagCount: hashtags.length,
        optimizationScore,
        platformCompliant
      });

      return {
        caption,
        hashtags,
        characterCount,
        wordCount,
        platformCompliant,
        optimizationScore,
        suggestions,
        alternatives
      };
    } catch (error) {
      logger.error('Failed to generate content', {
        error: error instanceof Error ? error.message : String(error),
        topic: request.topic
      });
      throw error;
    }
  }

  /**
   * Build AI prompt for content generation
   */
  private buildContentPrompt(
    request: ContentGenerationRequest,
    guidelines: PlatformGuidelines
  ): string {
    let prompt = `Generate a ${request.platformType} post about: ${request.topic}\n\n`;

    prompt += `Requirements:\n`;
    prompt += `- Platform: ${request.platformType}\n`;
    prompt += `- Maximum characters: ${guidelines.maxCharacters}\n`;
    prompt += `- Tone: ${request.tone || 'engaging'}\n`;

    if (request.targetAudience) {
      prompt += `- Target audience: ${request.targetAudience}\n`;
    }

    if (request.keywords && request.keywords.length > 0) {
      prompt += `- Include keywords: ${request.keywords.join(', ')}\n`;
    }

    if (request.callToAction) {
      prompt += `- Call to action: ${request.callToAction}\n`;
    }

    if (request.includeEmojis !== false && guidelines.supportsEmojis) {
      prompt += `- Include relevant emojis\n`;
    }

    if (request.additionalContext) {
      prompt += `\nAdditional context: ${request.additionalContext}\n`;
    }

    prompt += `\nPlatform best practices:\n`;
    guidelines.bestPractices.forEach(practice => {
      prompt += `- ${practice}\n`;
    });

    prompt += `\nGenerate ONLY the post caption text. Do NOT include hashtags in the caption (they will be added separately).`;

    return prompt;
  }

  /**
   * Extract caption from AI response
   */
  private extractCaption(aiOutput: string): string {
    // Remove any markdown formatting
    let caption = aiOutput.trim();

    // Remove code blocks if present
    caption = caption.replace(/```[\s\S]*?```/g, '');

    // Remove inline code
    caption = caption.replace(/`([^`]+)`/g, '$1');

    // Remove hashtags that AI might have added despite instructions
    const lines = caption.split('\n');
    const captionLines = lines.filter(line => !line.trim().startsWith('#'));

    return captionLines.join('\n').trim();
  }

  /**
   * Generate hashtag suggestions
   */
  async generateHashtags(
    topic: string,
    platformType: PlatformType,
    keywords: string[],
    maxHashtags: number
  ): Promise<string[]> {
    try {
      const prompt = `Generate ${maxHashtags} relevant hashtags for a ${platformType} post about: ${topic}

Keywords to consider: ${keywords.join(', ')}

Requirements:
- Return ONLY hashtags, one per line
- Mix of popular and niche hashtags
- Relevant to the topic
- Platform-appropriate
- No explanations, just hashtags

Format: #hashtag (without the # symbol in response)`;

      const aiResponse = await aiService.processChatbotRequest({
        userId: 'system',
        organizationId: 'system',
        message: prompt,
        conversationHistory: [],
        context: []
      });

      // Parse hashtags from response
      const hashtags = aiResponse.output
        .split('\n')
        .map(line => line.trim().replace(/^#/, ''))
        .filter(tag => tag.length > 0 && tag.length <= 30)
        .slice(0, maxHashtags);

      return hashtags;
    } catch (error) {
      logger.error('Failed to generate hashtags', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Calculate optimization score
   */
  private calculateOptimizationScore(
    caption: string,
    hashtags: string[],
    platformType: PlatformType,
    guidelines: PlatformGuidelines
  ): number {
    let score = 100;

    // Character count penalty
    const charRatio = caption.length / guidelines.maxCharacters;
    if (charRatio > 1) {
      score -= 30; // Over limit
    } else if (charRatio < 0.1) {
      score -= 10; // Too short
    } else if (charRatio > 0.9) {
      score -= 5; // Very close to limit
    }

    // Hashtag optimization
    const hashtagRatio = hashtags.length / guidelines.recommendedHashtags;
    if (hashtags.length > guidelines.maxHashtags) {
      score -= 20; // Over limit
    } else if (hashtags.length === 0 && platformType !== PlatformType.LINKEDIN) {
      score -= 15; // No hashtags (except LinkedIn where they're optional)
    } else if (hashtagRatio < 0.5) {
      score -= 5; // Could use more hashtags
    }

    // Content quality checks
    if (caption.includes('http://') || caption.includes('https://')) {
      score += 5; // Includes link
    }

    if (/[!?]/.test(caption)) {
      score += 3; // Includes punctuation for engagement
    }

    // Emoji check (if platform supports)
    if (guidelines.supportsEmojis) {
      const emojiCount = (caption.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
      if (emojiCount > 0 && emojiCount <= 5) {
        score += 5;
      } else if (emojiCount > 5) {
        score -= 3; // Too many emojis
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate optimization suggestions
   */
  private generateSuggestions(
    caption: string,
    hashtags: string[],
    platformType: PlatformType,
    guidelines: PlatformGuidelines,
    platformCompliant: boolean
  ): string[] {
    const suggestions: string[] = [];

    if (!platformCompliant) {
      if (caption.length > guidelines.maxCharacters) {
        suggestions.push(
          `Caption is ${caption.length - guidelines.maxCharacters} characters over the ${guidelines.maxCharacters} limit for ${platformType}`
        );
      }

      if (hashtags.length > guidelines.maxHashtags) {
        suggestions.push(
          `Reduce hashtags to ${guidelines.maxHashtags} or fewer for ${platformType}`
        );
      }
    }

    if (hashtags.length < guidelines.recommendedHashtags && platformType !== PlatformType.LINKEDIN) {
      suggestions.push(
        `Consider adding ${guidelines.recommendedHashtags - hashtags.length} more hashtags for better reach`
      );
    }

    if (!/[!?]/.test(caption)) {
      suggestions.push('Consider adding a question or exclamation to boost engagement');
    }

    if (platformType === PlatformType.INSTAGRAM && caption.length < 100) {
      suggestions.push('Instagram captions can be longer - consider adding more detail');
    }

    if (platformType === PlatformType.TWITTER && caption.length > 240) {
      suggestions.push('Keep Twitter posts under 240 characters for better visibility');
    }

    return suggestions;
  }

  /**
   * Generate content alternatives
   */
  private async generateAlternatives(
    originalCaption: string,
    request: ContentGenerationRequest,
    userId: string,
    organizationId: string
  ): Promise<string[]> {
    try {
      const prompt = `Generate 2 alternative versions of this ${request.platformType} post caption:

Original: ${originalCaption}

Requirements:
- Keep the same topic and message
- Use different wording and structure
- Maintain ${request.tone || 'engaging'} tone
- Each alternative on a new line
- Separate alternatives with "---"

Generate only the alternative captions, no explanations.`;

      const aiResponse = await aiService.processChatbotRequest({
        userId,
        organizationId,
        message: prompt,
        conversationHistory: [],
        context: []
      });

      const alternatives = aiResponse.output
        .split('---')
        .map(alt => alt.trim())
        .filter(alt => alt.length > 0 && alt !== originalCaption)
        .slice(0, 2);

      return alternatives;
    } catch (error) {
      logger.warn('Failed to generate alternatives', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Optimize existing content for a platform
   */
  async optimizeContent(
    caption: string,
    fromPlatform: PlatformType,
    toPlatform: PlatformType,
    userId: string,
    organizationId: string
  ): Promise<GeneratedContent> {
    try {
      logger.info('Optimizing content for platform', {
        from: fromPlatform,
        to: toPlatform
      });

      const toGuidelines = this.platformGuidelines.get(toPlatform);
      if (!toGuidelines) {
        throw new Error(`Unsupported target platform: ${toPlatform}`);
      }

      const prompt = `Adapt this ${fromPlatform} post for ${toPlatform}:

Original caption: ${caption}

Requirements:
- Maximum ${toGuidelines.maxCharacters} characters
- Maintain the core message
- Adapt tone and style for ${toPlatform}
- Follow ${toPlatform} best practices: ${toGuidelines.bestPractices.join(', ')}

Generate only the adapted caption.`;

      const aiResponse = await aiService.processChatbotRequest({
        userId,
        organizationId,
        message: prompt,
        conversationHistory: [],
        context: []
      });

      const optimizedCaption = this.extractCaption(aiResponse.output);

      // Extract topic from original caption for hashtag generation
      const topic = caption.substring(0, 100);
      const hashtags = await this.generateHashtags(
        topic,
        toPlatform,
        [],
        toGuidelines.recommendedHashtags
      );

      const characterCount = optimizedCaption.length;
      const wordCount = optimizedCaption.split(/\s+/).length;
      const platformCompliant = characterCount <= toGuidelines.maxCharacters;

      const optimizationScore = this.calculateOptimizationScore(
        optimizedCaption,
        hashtags,
        toPlatform,
        toGuidelines
      );

      const suggestions = this.generateSuggestions(
        optimizedCaption,
        hashtags,
        toPlatform,
        toGuidelines,
        platformCompliant
      );

      return {
        caption: optimizedCaption,
        hashtags,
        characterCount,
        wordCount,
        platformCompliant,
        optimizationScore,
        suggestions
      };
    } catch (error) {
      logger.error('Failed to optimize content', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get advanced hashtag suggestions with relevance scoring
   */
  async getHashtagSuggestions(
    content: string,
    platformType: PlatformType,
    count: number = 10
  ): Promise<HashtagSuggestion[]> {
    try {
      const prompt = `Analyze this ${platformType} post and suggest ${count} relevant hashtags with details:

Content: ${content}

For each hashtag, provide:
1. The hashtag (without #)
2. Relevance (high/medium/low)
3. Popularity (high/medium/low)
4. Competition (high/medium/low)
5. Category

Format each as: hashtag|relevance|popularity|competition|category

Example: socialmedia|high|high|high|marketing`;

      const aiResponse = await aiService.processChatbotRequest({
        userId: 'system',
        organizationId: 'system',
        message: prompt,
        conversationHistory: [],
        context: []
      });

      const suggestions: HashtagSuggestion[] = aiResponse.output
        .split('\n')
        .map(line => {
          const parts = line.split('|');
          if (parts.length !== 5) return null;

          const relevanceMap: Record<string, number> = {
            high: 0.9,
            medium: 0.6,
            low: 0.3
          };

          return {
            tag: parts[0].trim().replace(/^#/, ''),
            relevance: relevanceMap[parts[1].trim().toLowerCase()] || 0.5,
            popularity: parts[2].trim().toLowerCase() as 'high' | 'medium' | 'low',
            competition: parts[3].trim().toLowerCase() as 'high' | 'medium' | 'low',
            category: parts[4].trim()
          };
        })
        .filter((suggestion): suggestion is HashtagSuggestion => suggestion !== null)
        .slice(0, count);

      return suggestions;
    } catch (error) {
      logger.error('Failed to get hashtag suggestions', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Get best time to post recommendations based on analytics
   */
  async getBestTimeToPost(
    userId: string,
    platformType: PlatformType,
    timezone: string = 'America/New_York'
  ): Promise<BestTimeRecommendation[]> {
    try {
      logger.info('Analyzing best time to post', {
        userId,
        platform: platformType,
        timezone
      });

      // Get user's historical analytics
      const analytics = await postAnalyticsService.getAggregatedAnalytics(userId, {
        platformType,
        limit: 100
      });

      if (analytics.totalPosts === 0) {
        // No historical data, return general recommendations
        return this.getDefaultTimeRecommendations(platformType, timezone);
      }

      // Analyze time series data for patterns
      const timePatterns = this.analyzeTimePatterns(analytics.timeSeries);

      // Generate recommendations
      const recommendations: BestTimeRecommendation[] = timePatterns
        .sort((a, b) => b.engagementRate - a.engagementRate)
        .slice(0, 3)
        .map((pattern, index) => ({
          dayOfWeek: pattern.dayOfWeek,
          hour: pattern.hour,
          timezone,
          confidence: Math.max(0.5, 1 - (index * 0.15)),
          expectedEngagementRate: pattern.engagementRate,
          reasoning: `Based on ${pattern.postCount} posts, your average engagement rate at this time is ${pattern.engagementRate.toFixed(2)}%`
        }));

      return recommendations;
    } catch (error) {
      logger.error('Failed to get best time to post', {
        error: error instanceof Error ? error.message : String(error)
      });
      return this.getDefaultTimeRecommendations(platformType, timezone);
    }
  }

  /**
   * Analyze time patterns from analytics data
   */
  private analyzeTimePatterns(timeSeries: any[]): any[] {
    // Group by day of week and hour
    const patterns: Record<string, any> = {};

    timeSeries.forEach(entry => {
      const date = new Date(entry.date);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();
      const key = `${dayOfWeek}_${hour}`;

      if (!patterns[key]) {
        patterns[key] = {
          dayOfWeek,
          hour,
          postCount: 0,
          totalEngagement: 0,
          totalReach: 0
        };
      }

      patterns[key].postCount += entry.posts;
      patterns[key].totalEngagement += entry.engagement;
      patterns[key].totalReach += entry.reach;
    });

    // Calculate engagement rates
    return Object.values(patterns).map(pattern => ({
      ...pattern,
      engagementRate: pattern.totalReach > 0
        ? (pattern.totalEngagement / pattern.totalReach) * 100
        : 0
    }));
  }

  /**
   * Get default time recommendations for a platform
   */
  private getDefaultTimeRecommendations(
    platformType: PlatformType,
    timezone: string
  ): BestTimeRecommendation[] {
    const recommendations: Record<PlatformType, BestTimeRecommendation[]> = {
      [PlatformType.INSTAGRAM]: [
        {
          dayOfWeek: 'Wednesday',
          hour: 11,
          timezone,
          confidence: 0.7,
          expectedEngagementRate: 3.5,
          reasoning: 'Industry average shows high engagement on Wednesday mornings'
        },
        {
          dayOfWeek: 'Friday',
          hour: 14,
          timezone,
          confidence: 0.7,
          expectedEngagementRate: 3.2,
          reasoning: 'Friday afternoons typically see good engagement'
        }
      ],
      [PlatformType.TWITTER]: [
        {
          dayOfWeek: 'Tuesday',
          hour: 9,
          timezone,
          confidence: 0.7,
          expectedEngagementRate: 2.8,
          reasoning: 'Weekday mornings are optimal for Twitter engagement'
        }
      ],
      [PlatformType.FACEBOOK]: [
        {
          dayOfWeek: 'Thursday',
          hour: 13,
          timezone,
          confidence: 0.7,
          expectedEngagementRate: 3.0,
          reasoning: 'Midweek lunch hours show strong engagement'
        }
      ],
      [PlatformType.LINKEDIN]: [
        {
          dayOfWeek: 'Tuesday',
          hour: 10,
          timezone,
          confidence: 0.75,
          expectedEngagementRate: 4.0,
          reasoning: 'Business hours on weekdays are best for LinkedIn'
        }
      ],
      [PlatformType.TIKTOK]: [
        {
          dayOfWeek: 'Friday',
          hour: 19,
          timezone,
          confidence: 0.7,
          expectedEngagementRate: 5.0,
          reasoning: 'Evening hours on weekends see peak TikTok activity'
        }
      ],
      [PlatformType.YOUTUBE]: [
        {
          dayOfWeek: 'Saturday',
          hour: 15,
          timezone,
          confidence: 0.7,
          expectedEngagementRate: 4.5,
          reasoning: 'Weekend afternoons are popular for video consumption'
        }
      ]
    };

    return recommendations[platformType] || [];
  }
}

// Export singleton instance
export const contentGenerationService = new ContentGenerationService();

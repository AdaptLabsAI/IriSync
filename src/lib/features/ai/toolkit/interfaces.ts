import { AIProvider } from '../providers/AIProvider';
import { TokenService } from '../../tokens/token-service';

/**
 * Common result interface for all AI task results
 */
export interface AITaskResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Options for AI toolkit requests
 */
export interface ToolkitRequestOptions {
  /**
   * Temperature setting for AI requests (0.0-1.0)
   */
  temperature?: number;
  
  /**
   * Maximum tokens to generate
   */
  maxTokens?: number;
  
  /**
   * Whether to skip cache checks
   */
  skipCache?: boolean;
  
  /**
   * Custom cache TTL (seconds)
   */
  cacheTtl?: number;
  
  /**
   * Custom metadata for the request
   */
  metadata?: Record<string, any>;
  
  /**
   * User ID for usage tracking
   */
  userId?: string;
  
  /**
   * Organization ID for usage tracking
   */
  organizationId?: string;
}

/**
 * Interface for generating various types of content
 */
export interface ContentGenerator {
  /**
   * Update the AI provider used by this generator
   */
  setProvider(provider: AIProvider): void;

  /**
   * Generate a social media post based on the given parameters
   */
  generatePost(
    params: PostGenerationParams,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>>;

  /**
   * Legacy method for backward compatibility
   */
  generatePost(
    topic: string,
    platform: string,
    length: 'short' | 'medium' | 'long',
    tone: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>>;

  /**
   * Generate an engaging caption for an image or video
   */
  generateCaption(
    params: CaptionGenerationParams,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>>;

  /**
   * Legacy method for backward compatibility
   */
  generateCaption(
    mediaType: 'image' | 'video',
    description: string,
    context?: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>>;

  /**
   * Generate hashtags for a post
   */
  generateHashtags(
    params: HashtagGenerationParams,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string[]>>;

  /**
   * Legacy method for backward compatibility
   */
  generateHashtags(
    content: string,
    platform: string,
    count?: number,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string[]>>;

  /**
   * Generate content variations based on an original
   */
  generateVariations(
    originalContent: string,
    count: number,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string[]>>;

  /**
   * Improve existing content based on instructions
   */
  improveContent(
    content: string,
    instructions: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>>;
  
  /**
   * Generate SEO-optimized content based on keywords and topic
   * Enterprise-only feature
   */
  generateSeoContent(
    topic: string,
    keywords: string[],
    contentType: 'blog' | 'landing' | 'product' | 'service',
    targetWordCount: number,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    title: string;
    metaDescription: string;
    content: string;
    keywordDensity: Record<string, number>;
    readabilityScore: number;
    suggestedImprovements?: string[];
    internalLinkSuggestions?: string[];
  }>>;
  
  /**
   * Repurpose content from one platform to multiple others
   * Enterprise/Influencer feature
   */
  repurposeContent(
    content: string,
    sourcePlatform: string,
    targetPlatforms: string[],
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    originalContent: string;
    repurposedContent: Record<string, string>;
    mediaRecommendations?: Record<string, string>;
  }>>;
  
  /**
   * Generate coordinated content across multiple platforms for a single topic
   * Enterprise-only feature
   */
  generateMultiPlatformContent(
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
  }>>;
  
  /**
   * Generate a complete content campaign based on a theme
   * Enterprise-only feature
   */
  generateCampaignContent(
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
    contentCount: number,
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
  }>>;
}

/**
 * Interface for analyzing content
 */
export interface ContentAnalyzer {
  /**
   * Update the AI provider used by this analyzer
   */
  setProvider(provider: AIProvider): void;
  
  /**
   * Analyze sentiment of content
   */
  analyzeSentiment(
    content: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<SentimentAnalysisResult>>;

  /**
   * Categorize content into topics/themes
   */
  categorizeContent(
    content: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<CategoryAnalysisResult>>;

  /**
   * Predict potential engagement metrics for a post
   */
  predictEngagement(
    content: string,
    platform: string,
    audienceData?: any,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<EngagementAnalysisResult>>;

  /**
   * Check content for platform compliance issues
   */
  checkCompliance(
    content: string,
    platform: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    compliant: boolean;
    issues: string[];
    recommendations?: string[];
  }>>;
}

/**
 * Interface for analyzing media (images, videos)
 */
export interface MediaAnalyzer {
  /**
   * Set provider for generation
   */
  setProvider(provider: AIProvider): void;

  /**
   * Analyze an image and describe its content
   */
  analyzeImage(
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
  }>>;

  /**
   * Check if media content complies with platform policies
   */
  checkContentPolicy(
    mediaUrl: string,
    platform: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    compliant: boolean;
    issues: string[];
    recommendations?: string[];
    confidence: number;
  }>>;

  /**
   * Generate alt text for an image
   */
  generateAltText(
    imageUrl: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>>;

  /**
   * Extract colors from an image
   */
  extractColors(
    imageUrl: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<Array<{
    name: string;
    hexCode: string;
    percentage: number;
  }>>>;
}

/**
 * Interface for optimizing content scheduling
 */
export interface ScheduleOptimizer {
  /**
   * Get optimal posting times based on historical data
   */
  getOptimalPostingTimes(
    platform: string,
    audienceData?: any,
    count?: number,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    times: Array<{
      dayOfWeek: number;
      hour: number;
      score: number;
    }>;
    recommendation: string;
  }>>;

  /**
   * Recommend content distribution strategy
   */
  recommendContentStrategy(
    contentPlan: any[],
    platforms: string[],
    timeframe: 'day' | 'week' | 'month',
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    schedule: Array<{
      content: any;
      platform: string;
      time: Date;
      reasoning: string;
    }>;
  }>>;
}

/**
 * Interface for helping with audience engagement and responses
 */
export interface ResponseAssistant {
  /**
   * Suggest responses to user comments/messages
   */
  suggestResponses(
    comment: string,
    context?: string,
    count?: number,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string[]>>;

  /**
   * Categorize incoming messages or comments
   */
  categorizeMessage(
    message: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    category: 'question' | 'complaint' | 'praise' | 'suggestion' | 'other';
    priority: 'low' | 'medium' | 'high';
    response: string;
  }>>;
}

/**
 * Interfaces for AI Toolkit
 */

/**
 * Hashtag generation parameters
 */
export interface HashtagGenerationParams {
  content: string;
  platform: 'instagram' | 'twitter' | 'tiktok';
  count: number;
  relevance: 'high' | 'medium' | 'broad';
}

/**
 * Caption generation parameters
 */
export interface CaptionGenerationParams {
  imageDescription: string;
  brandVoice: string;
  purpose: 'engagement' | 'sales' | 'awareness';
  length: 'short' | 'medium' | 'long';
  includeHashtags: boolean;
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin';
}

/**
 * Sentiment analysis result
 */
export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  confidence: number;
  details?: {
    emotions?: Record<string, number>;
    aspects?: Array<{
      aspect: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      score: number;
    }>;
  };
}

/**
 * Category analysis result
 */
export interface CategoryAnalysisResult {
  primaryCategory: string;
  confidence: number;
  categories: Array<{
    category: string;
    confidence: number;
  }>;
}

/**
 * Engagement analysis result
 */
export interface EngagementAnalysisResult {
  engagementScore: number;
  aspects: {
    relevance: number;
    uniqueness: number;
    emotionalImpact: number;
    clarity: number;
    callToAction: number;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

/**
 * Content generation parameters
 */
export interface PostGenerationParams {
  topic: string;
  platform: string;
  tone: 'professional' | 'casual' | 'humorous' | 'informative';
  length: 'short' | 'medium' | 'long';
  includeHashtags: boolean;
  includeEmojis: boolean;
  keyMessages: string[];
}

/**
 * Schedule Optimization Tool Interface
 */
export interface ScheduleOptimizer {
  setProvider(provider: AIProvider): void;
  getOptimalPostingTimes(
    platform: string,
    audienceData?: any,
    count?: number,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    times: Array<{
      dayOfWeek: number;
      hour: number;
      score: number;
    }>;
    recommendation: string;
  }>>;
  
  recommendContentStrategy(
    contentPlan: any[],
    platforms: string[],
    timeframe: 'day' | 'week' | 'month',
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    schedule: Array<{
      content: any;
      platform: string;
      time: Date;
      reasoning: string;
    }>;
  }>>;
}

/**
 * Response Assistant Tool Interface
 */
export interface ResponseAssistant {
  setProvider(provider: AIProvider): void;
  generateReply(
    message: string,
    context: {
      previousMessages?: Array<{ role: string; content: string }>;
      platform?: string;
      brandVoice?: string;
    },
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string>>;
  
  suggestReplies(
    message: string,
    context?: {
      platform?: string;
      brandVoice?: string;
    },
    count?: number,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<string[]>>;
  
  categorizeSentiment(
    message: string,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: 'low' | 'medium' | 'high';
    category: string;
    needsResponse: boolean;
  }>>;
}

/**
 * Interface for the Schedule Optimizer tool
 */
export interface ScheduleOptimizerTool {
  /**
   * Find optimal posting time based on audience data and platform
   */
  findOptimalPostingTime(
    platform: string,
    contentType: string,
    audienceData?: any,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<OptimalTimeResult>>;

  /**
   * Generate an optimized content schedule based on desired parameters
   */
  generateSchedule(
    scheduleOptions: {
      platform: string;
      contentTypes: string[];
      frequency: {
        postsPerWeek?: number;
        postsPerDay?: number;
        specificDays?: string[];
        timeRange?: {
          start: string;
          end: string;
        };
      };
      duration: number; // In weeks
      audience?: any;
      existingCommitments?: Array<{
        date: string;
        time: string;
        description: string;
      }>;
      preferences?: {
        prioritizeWeekends?: boolean;
        avoidConsecutiveDays?: boolean;
        maxPostsPerDay?: number;
        preferredTimes?: string[];
      };
    },
    toolkitOptions?: ToolkitRequestOptions
  ): Promise<AITaskResult<ContentSchedule>>;

  /**
   * Optimize an existing schedule with new constraints
   */
  optimizeExistingSchedule(
    existingSchedule: ContentSchedule,
    newConstraints: {
      excludeDates?: string[];
      prioritizeDates?: string[];
      rescheduleCount?: number;
      preserveTopPriority?: boolean;
      newContentTypes?: string[];
    },
    toolkitOptions?: ToolkitRequestOptions
  ): Promise<AITaskResult<ContentSchedule>>;

  /**
   * Analyze schedule performance
   */
  analyzeSchedulePerformance(
    schedule: ContentSchedule,
    performanceData: Array<{
      postId: string;
      metrics: {
        engagement: number;
        reach: number;
        clicks?: number;
        shares?: number;
        comments?: number;
        saves?: number;
      };
    }>,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    insights: string[];
    recommendations: string[];
    bestPerformingSlots: TimeSlot[];
    worstPerformingSlots: TimeSlot[];
    performanceByContentType: Record<string, {
      averageEngagement: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
  }>>;
}

/**
 * Interface for optimal time result
 */
export interface OptimalTimeResult {
  optimalTime: string;
  dayOfWeek: string;
  expectedEngagement: number;
  confidence: number;
  alternativeTimes: Array<{ 
    time: string; 
    dayOfWeek: string; 
    expectedEngagement: number 
  }>;
  timezone: string;
  reasoning: string;
}

/**
 * Time slot interface
 */
export interface TimeSlot {
  time: string;
  dayOfWeek: string;
  engagementScore: number;
}

/**
 * Interface for content schedule
 */
export interface ContentSchedule {
  platform: string;
  startDate: string;
  endDate: string;
  scheduledPosts: Array<{
    id: string;
    contentType: string;
    scheduledDate: string;
    scheduledTime: string;
    status: 'scheduled' | 'published' | 'draft' | 'cancelled';
    platform: string;
    optimizationReason?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  contentTypeDistribution: Record<string, number>;
  weekdayDistribution: Record<string, number>;
  timeSlotDistribution: Record<string, number>;
  changes: Array<{
    postId: string;
    changeType: string;
    from: string;
    to: string;
    reason: string;
  }>;
  metadata: Record<string, any>;
} 
import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useTokens } from './useTokens';
import { SocialPlatform } from '../lib/models/SocialAccount';
import { MediaType } from '../lib/models/Media';

export interface AIToolkitError {
  error: string;
  message: string;
}

// Define additional task types
export enum AITaskType {
  ANALYZE_SENTIMENT = 'analyze_sentiment',
  GENERATE_POST = 'generate_post',
  GENERATE_HASHTAGS = 'generate_hashtags',
  ANALYZE_IMAGE = 'analyze_image',
  GENERATE_ALT_TEXT = 'generate_alt_text',
  PREDICT_ENGAGEMENT = 'predict_engagement',
  IMPROVE_CONTENT = 'improve_content',
  SUGGEST_POSTING_TIME = 'suggest_posting_time',
  GENERATE_CAPTION = 'generate_caption',
  ANALYZE_CONTENT = 'analyze_content'
}

/**
 * Custom hook for accessing AI toolkit capabilities
 */
export function useAIToolkit() {
  const { user } = useAuth();
  const { canPerformTask } = useTokens();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AIToolkitError | null>(null);

  /**
   * Call the AI toolkit API
   */
  const callToolkitApi = useCallback(async (operation: string, params: any) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/toolkit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation,
          params
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError({
          error: data.error || 'api_error',
          message: data.message || 'An error occurred'
        });
        return null;
      }
      
      return data.result;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError({
        error: 'network_error',
        message: errorMessage
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Analyze content sentiment and tone
   */
  const analyzeContent = useCallback(async (content: string) => {
    return callToolkitApi('analyzeContent', { content });
  }, [callToolkitApi]);

  /**
   * Analyze sentiment and emotional tone of content
   */
  const analyzeSentiment = useCallback(async (
    content: string,
    detailed?: boolean
  ) => {
    return callToolkitApi('analyzeSentiment', {
      content,
      detailed
    });
  }, [callToolkitApi]);

  /**
   * Generate content for a specific platform
   * Updated to accept a more flexible set of parameters
   */
  const generateContent = useCallback(async (
    prompt: string,
    platform: SocialPlatform,
    contentType?: string,
    options?: any
  ) => {
    return callToolkitApi('generateContent', { 
      prompt, 
      platform, 
      contentType,
      options
    });
  }, [callToolkitApi]);

  /**
   * Suggest hashtags for content
   * Updated to accept a more flexible set of parameters
   */
  const suggestHashtags = useCallback(async (
    content: string,
    platform: SocialPlatform,
    count?: number,
    options?: any
  ) => {
    return callToolkitApi('suggestHashtags', { 
      content, 
      platform, 
      count,
      options
    });
  }, [callToolkitApi]);

  /**
   * Analyze media
   */
  const analyzeMedia = useCallback(async (
    url: string,
    type: MediaType,
    metadata?: any
  ) => {
    return callToolkitApi('analyzeMedia', { 
      url, 
      type, 
      metadata 
    });
  }, [callToolkitApi]);

  /**
   * Generate alt text for an image
   */
  const generateAltText = useCallback(async (
    url: string,
    type: MediaType
  ) => {
    return callToolkitApi('generateAltText', { 
      url, 
      type 
    });
  }, [callToolkitApi]);

  /**
   * Predict engagement for content on a specific platform
   */
  const predictEngagement = useCallback(async (
    content: string,
    platform: SocialPlatform,
    tags?: string[],
    mediaIds?: string[]
  ) => {
    return callToolkitApi('predictEngagement', { 
      content, 
      platform, 
      tags, 
      mediaIds 
    });
  }, [callToolkitApi]);

  /**
   * Improve content based on platform best practices
   */
  const improveContent = useCallback(async (
    content: string,
    platform: SocialPlatform
  ) => {
    return callToolkitApi('improveContent', { 
      content, 
      platform 
    });
  }, [callToolkitApi]);

  /**
   * Suggest optimal posting time for a platform
   */
  const suggestPostingTime = useCallback(async (
    platform: SocialPlatform
  ) => {
    return callToolkitApi('suggestPostingTime', { 
      platform 
    });
  }, [callToolkitApi]);

  /**
   * Analyze hashtags for performance and categorization
   */
  const analyzeHashtags = useCallback(async (
    hashtags: string[],
    platform: SocialPlatform
  ) => {
    return callToolkitApi('analyzeHashtags', {
      hashtags,
      platform
    });
  }, [callToolkitApi]);

  /**
   * Repurpose content across multiple platforms
   */
  const repurposeContent = useCallback(async (
    content: string,
    sourcePlatform: SocialPlatform,
    targetPlatforms: SocialPlatform[],
    options?: any
  ) => {
    return callToolkitApi('repurposeContent', {
      content,
      sourcePlatform,
      targetPlatforms,
      options
    });
  }, [callToolkitApi]);

  /**
   * Generate media recommendations for content
   */
  const generateMediaRecommendations = useCallback(async (
    content: string,
    platforms: SocialPlatform[]
  ) => {
    return callToolkitApi('generateMediaRecommendations', {
      content,
      platforms
    });
  }, [callToolkitApi]);

  /**
   * Analyze SEO for content
   */
  const analyzeSEO = useCallback(async (
    content: string,
    keywords: string[],
    url?: string
  ) => {
    return callToolkitApi('analyzeSEO', {
      content,
      keywords,
      url
    });
  }, [callToolkitApi]);

  /**
   * Generate cross-platform marketing campaign
   */
  const generateCampaign = useCallback(async (
    topic: string,
    campaignType: string,
    platforms: SocialPlatform[],
    options?: any
  ) => {
    return callToolkitApi('generateCampaign', {
      topic,
      platforms,
      audience: options?.audience,
      goals: options?.goals,
      campaignType
    });
  }, [callToolkitApi]);

  /**
   * Send a chat message to the AI assistant
   * @param message - The user's message
   * @param history - Previous chat messages for context
   * @param context - Additional context information
   * @returns The AI assistant's response
   */
  const sendChatMessage = useCallback(async (
    message: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>,
    context?: Record<string, any>
  ): Promise<string> => {
    const result = await callToolkitApi('chat', {
      message,
      history,
      context
    });

    // Return the response text or a default error message
    return result?.response || result?.content || result?.text || 'I apologize, but I encountered an issue processing your request.';
  }, [callToolkitApi]);

  /**
   * Generate audience insights for a specific platform
   * @param platformId - The ID of the social platform
   * @param insightType - Type of insight to generate
   * @param timeframe - Timeframe for the analysis
   * @returns Array of audience insights
   */
  const generateAudienceInsights = useCallback(async (
    platformId: string,
    insightType: string,
    timeframe: string
  ) => {
    return callToolkitApi('generateAudienceInsights', {
      platformId,
      insightType,
      timeframe
    });
  }, [callToolkitApi]);

  /**
   * Generate images from a text prompt
   */
  const generateImage = useCallback(async (
    prompt: string,
    style?: string,
    aspectRatio?: string,
    size?: string,
    options?: any
  ) => {
    return callToolkitApi('generateImage', {
      prompt,
      style,
      aspectRatio,
      size,
      ...options,
    });
  }, [callToolkitApi]);

  /**
   * Check if the user can perform an AI operation (has enough tokens)
   */
  const canPerformOperation = useCallback(async (operation: string) => {
    if (!user) return { allowed: false, reason: 'Not authenticated' };

    // Map operation to task type
    const taskTypeMap: Record<string, string> = {
      'analyzeContent': 'analyze_sentiment',
      'analyzeSentiment': 'analyze_sentiment',
      'generateContent': 'generate_post',
      'suggestHashtags': 'generate_hashtags',
      'analyzeMedia': 'analyze_image',
      'generateAltText': 'generate_alt_text',
      'predictEngagement': 'predict_engagement',
      'improveContent': 'improve_content',
      'suggestPostingTime': 'suggest_posting_time',
      'repurposeContent': 'generate_post',
      'analyzeHashtags': 'generate_hashtags',
      'generateMediaRecommendations': 'generate_post',
      'analyzeSEO': 'analyze_sentiment',
      'generateCampaign': 'generate_post',
      'chat': 'generate_post',
      'generateAudienceInsights': 'analyze_sentiment',
      'generateImage': 'analyze_image'
    };

    const taskType = taskTypeMap[operation];
    if (!taskType) {
      return { allowed: false, reason: 'Invalid operation' };
    }

    return await canPerformTask(taskType as any);
  }, [user, canPerformTask]);

  return {
    loading,
    error,
    analyzeContent,
    analyzeSentiment,
    generateContent,
    suggestHashtags,
    analyzeMedia,
    generateAltText,
    predictEngagement,
    improveContent,
    suggestPostingTime,
    analyzeHashtags,
    repurposeContent,
    generateMediaRecommendations,
    analyzeSEO,
    generateCampaign,
    sendChatMessage,
    generateAudienceInsights,
    generateImage,
    canPerformOperation
  };
} 
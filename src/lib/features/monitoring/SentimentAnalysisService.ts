/**
 * Sentiment Analysis Service
 *
 * Provides AI-powered sentiment analysis for social media mentions, comments, and messages.
 * Uses multi-model AI to detect emotions, sentiment, and intent in user-generated content.
 *
 * Features:
 * - Sentiment classification (positive, negative, neutral)
 * - Sentiment scoring (-1 to 1)
 * - Emotion detection (joy, anger, sadness, fear, surprise)
 * - Intent classification (question, complaint, praise, inquiry)
 * - Priority scoring for triaging mentions
 * - Batch processing for efficient analysis
 */

import { aiService } from '@/lib/features/ai/AIService';
import { SocialMention } from './SocialListeningService';

/**
 * Sentiment analysis result
 */
export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // -1 (very negative) to 1 (very positive)
  confidence: number; // 0 to 1
  emotions: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    surprise: number;
  };
  intent?: 'question' | 'complaint' | 'praise' | 'inquiry' | 'feedback' | 'other';
  keywords: string[];
  requiresResponse: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Batch sentiment analysis result
 */
export interface BatchSentimentResult {
  analyzed: number;
  results: Map<string, SentimentResult>;
  errors: string[];
}

class SentimentAnalysisService {
  /**
   * Analyze sentiment of a single text
   */
  async analyzeSentiment(
    text: string,
    context?: {
      authorName?: string;
      authorFollowerCount?: number;
      engagementMetrics?: {
        likes: number;
        comments: number;
        shares: number;
      };
    }
  ): Promise<SentimentResult> {
    try {
      // Build AI prompt for sentiment analysis
      const prompt = this.buildSentimentPrompt(text, context);

      // Use AI service to analyze sentiment
      const aiResponse = await aiService.processChatbotRequest({
        userId: 'system',
        organizationId: 'system',
        message: prompt,
        conversationHistory: [],
        context: [],
      });

      // Parse AI response
      return this.parseSentimentResponse(aiResponse.output);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      // Return neutral sentiment as fallback
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0.5,
        emotions: {
          joy: 0,
          anger: 0,
          sadness: 0,
          fear: 0,
          surprise: 0,
        },
        intent: 'other',
        keywords: [],
        requiresResponse: false,
        priority: 'low',
      };
    }
  }

  /**
   * Build sentiment analysis prompt
   */
  private buildSentimentPrompt(text: string, context?: any): string {
    let prompt = `Analyze the sentiment and intent of the following social media content. Provide a detailed analysis in JSON format.

Content: "${text}"`;

    if (context) {
      prompt += `\n\nContext:`;
      if (context.authorName) {
        prompt += `\n- Author: ${context.authorName}`;
      }
      if (context.authorFollowerCount) {
        prompt += `\n- Author followers: ${context.authorFollowerCount}`;
      }
      if (context.engagementMetrics) {
        prompt += `\n- Engagement: ${context.engagementMetrics.likes} likes, ${context.engagementMetrics.comments} comments, ${context.engagementMetrics.shares} shares`;
      }
    }

    prompt += `

Provide your analysis in the following JSON format:
{
  "sentiment": "positive" | "negative" | "neutral",
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "emotions": {
    "joy": <0 to 1>,
    "anger": <0 to 1>,
    "sadness": <0 to 1>,
    "fear": <0 to 1>,
    "surprise": <0 to 1>
  },
  "intent": "question" | "complaint" | "praise" | "inquiry" | "feedback" | "other",
  "keywords": ["<extracted keywords>"],
  "requiresResponse": <true/false>,
  "priority": "low" | "medium" | "high" | "critical",
  "reasoning": "<brief explanation>"
}

Guidelines:
- Sentiment: Classify as positive, negative, or neutral based on overall tone
- Score: -1 (very negative), 0 (neutral), 1 (very positive)
- Confidence: How certain you are about the classification (0-1)
- Emotions: Rate each emotion from 0 (not present) to 1 (strongly present)
- Intent: Determine the primary purpose of the message
- Keywords: Extract 3-5 most important keywords
- RequiresResponse: true if the message needs a reply (questions, complaints, etc.)
- Priority: Based on urgency, sentiment negativity, and engagement
- Reasoning: Brief explanation of your analysis

Respond with ONLY the JSON object, no additional text.`;

    return prompt;
  }

  /**
   * Parse AI sentiment response
   */
  private parseSentimentResponse(response: string): SentimentResult {
    try {
      // Extract JSON from response (in case AI added extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        sentiment: parsed.sentiment || 'neutral',
        score: this.clamp(parsed.score || 0, -1, 1),
        confidence: this.clamp(parsed.confidence || 0.5, 0, 1),
        emotions: {
          joy: this.clamp(parsed.emotions?.joy || 0, 0, 1),
          anger: this.clamp(parsed.emotions?.anger || 0, 0, 1),
          sadness: this.clamp(parsed.emotions?.sadness || 0, 0, 1),
          fear: this.clamp(parsed.emotions?.fear || 0, 0, 1),
          surprise: this.clamp(parsed.emotions?.surprise || 0, 0, 1),
        },
        intent: parsed.intent || 'other',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        requiresResponse: parsed.requiresResponse || false,
        priority: parsed.priority || 'low',
      };
    } catch (error) {
      console.error('Error parsing sentiment response:', error);
      throw error;
    }
  }

  /**
   * Clamp a number between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Analyze sentiment for multiple mentions in batch
   */
  async analyzeBatch(
    mentions: SocialMention[],
    concurrency: number = 5
  ): Promise<BatchSentimentResult> {
    const result: BatchSentimentResult = {
      analyzed: 0,
      results: new Map(),
      errors: [],
    };

    // Process in batches
    for (let i = 0; i < mentions.length; i += concurrency) {
      const batch = mentions.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(mention => this.analyzeSentiment(
          mention.content,
          {
            authorName: mention.source.authorName,
            authorFollowerCount: mention.source.authorFollowerCount,
            engagementMetrics: mention.engagementMetrics,
          }
        ))
      );

      batchResults.forEach((resultItem, index) => {
        const mention = batch[index];
        if (resultItem.status === 'fulfilled') {
          result.results.set(mention.id!, resultItem.value);
          result.analyzed++;
        } else {
          result.errors.push(`Error analyzing mention ${mention.id}: ${resultItem.reason}`);
        }
      });
    }

    return result;
  }

  /**
   * Detect if content requires urgent attention
   */
  async detectUrgent(
    text: string,
    context?: {
      authorFollowerCount?: number;
      engagementMetrics?: {
        likes: number;
        comments: number;
        shares: number;
      };
    }
  ): Promise<{
    isUrgent: boolean;
    reason: string;
    recommendedAction: string;
  }> {
    try {
      const sentiment = await this.analyzeSentiment(text, context);

      // Urgent if:
      // 1. Very negative sentiment (< -0.6)
      // 2. High anger or fear emotion (> 0.7)
      // 3. Complaint with high engagement
      // 4. Critical priority

      const isVeryNegative = sentiment.score < -0.6;
      const hasHighNegativeEmotion = sentiment.emotions.anger > 0.7 || sentiment.emotions.fear > 0.7;
      const isComplaint = sentiment.intent === 'complaint';
      const haHighEngagement = (context?.engagementMetrics?.likes || 0) +
                                (context?.engagementMetrics?.comments || 0) +
                                (context?.engagementMetrics?.shares || 0) > 50;
      const isCritical = sentiment.priority === 'critical';

      const isUrgent = isVeryNegative || hasHighNegativeEmotion ||
                       (isComplaint && haHighEngagement) || isCritical;

      let reason = '';
      let recommendedAction = '';

      if (isUrgent) {
        if (isVeryNegative) {
          reason = 'Very negative sentiment detected';
          recommendedAction = 'Respond promptly with empathy and offer to resolve the issue';
        } else if (hasHighNegativeEmotion) {
          reason = 'High anger or fear detected';
          recommendedAction = 'De-escalate the situation with a calm, understanding response';
        } else if (isComplaint && haHighEngagement) {
          reason = 'Public complaint with high visibility';
          recommendedAction = 'Address publicly first, then move to private conversation';
        } else if (isCritical) {
          reason = 'Flagged as critical priority';
          recommendedAction = 'Immediate attention required from senior team member';
        }
      } else {
        reason = 'No urgent issues detected';
        recommendedAction = 'Respond within normal timeframe (24-48 hours)';
      }

      return {
        isUrgent,
        reason,
        recommendedAction,
      };
    } catch (error) {
      console.error('Error detecting urgency:', error);
      return {
        isUrgent: false,
        reason: 'Error analyzing urgency',
        recommendedAction: 'Manual review recommended',
      };
    }
  }

  /**
   * Generate smart reply suggestions based on sentiment
   */
  async generateSmartReply(
    originalMessage: string,
    sentiment: SentimentResult,
    brandVoice: 'professional' | 'casual' | 'friendly' = 'professional'
  ): Promise<string[]> {
    try {
      const prompt = `Generate 3 appropriate response suggestions to the following social media message.

Original Message: "${originalMessage}"

Sentiment Analysis:
- Sentiment: ${sentiment.sentiment} (score: ${sentiment.score})
- Intent: ${sentiment.intent}
- Requires Response: ${sentiment.requiresResponse ? 'Yes' : 'No'}
- Priority: ${sentiment.priority}

Brand Voice: ${brandVoice}

Generate 3 different response options that:
1. Match the brand voice (${brandVoice})
2. Address the sentiment appropriately
3. Are concise and actionable
4. Show empathy if negative sentiment
5. Encourage engagement if positive

Provide the responses as a JSON array of strings:
["response 1", "response 2", "response 3"]

Respond with ONLY the JSON array, no additional text.`;

      const aiResponse = await aiService.processChatbotRequest({
        userId: 'system',
        organizationId: 'system',
        message: prompt,
        conversationHistory: [],
        context: [],
      });

      // Parse response
      const jsonMatch = aiResponse.output.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [
          'Thank you for your message. We appreciate your feedback!',
          'Thanks for reaching out! We\'ll look into this.',
          'We value your input. Thank you for sharing!',
        ];
      }

      const suggestions = JSON.parse(jsonMatch[0]);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      console.error('Error generating smart reply:', error);
      return [
        'Thank you for your message. We appreciate your feedback!',
        'Thanks for reaching out! We\'ll look into this.',
        'We value your input. Thank you for sharing!',
      ];
    }
  }

  /**
   * Calculate brand health score based on recent sentiment
   */
  calculateBrandHealth(
    sentiments: SentimentResult[],
    timeWindow: 'day' | 'week' | 'month' = 'week'
  ): {
    score: number; // 0-100
    trend: 'improving' | 'stable' | 'declining';
    breakdown: {
      positive: number;
      neutral: number;
      negative: number;
    };
    averageSentiment: number;
    recommendations: string[];
  } {
    if (sentiments.length === 0) {
      return {
        score: 50,
        trend: 'stable',
        breakdown: { positive: 0, neutral: 0, negative: 0 },
        averageSentiment: 0,
        recommendations: ['Not enough data to calculate brand health'],
      };
    }

    // Calculate breakdown
    const breakdown = {
      positive: sentiments.filter(s => s.sentiment === 'positive').length,
      neutral: sentiments.filter(s => s.sentiment === 'neutral').length,
      negative: sentiments.filter(s => s.sentiment === 'negative').length,
    };

    // Calculate average sentiment score
    const averageSentiment = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;

    // Calculate health score (0-100)
    // Formula: (positive% * 100 + neutral% * 50 - negative% * 50)
    const total = sentiments.length;
    const score = Math.max(0, Math.min(100,
      (breakdown.positive / total) * 100 +
      (breakdown.neutral / total) * 50 -
      (breakdown.negative / total) * 50
    ));

    // Determine trend (compare first half vs second half)
    const midpoint = Math.floor(sentiments.length / 2);
    const firstHalfAvg = sentiments.slice(0, midpoint).reduce((sum, s) => sum + s.score, 0) / midpoint;
    const secondHalfAvg = sentiments.slice(midpoint).reduce((sum, s) => sum + s.score, 0) / (sentiments.length - midpoint);

    let trend: 'improving' | 'stable' | 'declining';
    if (secondHalfAvg > firstHalfAvg + 0.1) {
      trend = 'improving';
    } else if (secondHalfAvg < firstHalfAvg - 0.1) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (score < 40) {
      recommendations.push('⚠️ Brand health is concerning. Immediate attention needed.');
      recommendations.push('Increase positive engagement and address negative feedback promptly.');
    } else if (score < 60) {
      recommendations.push('Brand health is moderate. Focus on improving customer satisfaction.');
    } else if (score < 80) {
      recommendations.push('Brand health is good. Continue current engagement strategies.');
    } else {
      recommendations.push('✅ Excellent brand health! Maintain your current approach.');
    }

    if (breakdown.negative > breakdown.positive) {
      recommendations.push('Negative sentiment exceeds positive. Prioritize issue resolution.');
    }

    if (trend === 'declining') {
      recommendations.push('📉 Sentiment trend is declining. Review recent activities and responses.');
    } else if (trend === 'improving') {
      recommendations.push('📈 Sentiment is improving! Keep up the good work.');
    }

    return {
      score,
      trend,
      breakdown,
      averageSentiment,
      recommendations,
    };
  }
}

// Export singleton instance
export const sentimentAnalysisService = new SentimentAnalysisService();

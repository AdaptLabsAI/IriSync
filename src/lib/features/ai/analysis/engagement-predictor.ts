import { AIProvider } from '../providers';
import { AnalysisError } from '../utils/errors';

export interface EngagementPredictionResult {
  engagementScore: number; // Overall engagement score (0-100)
  confidence: number; // Confidence in prediction (0-1)
  aspects: {
    relevance: number; // 0-10
    uniqueness: number; // 0-10
    emotionalImpact: number; // 0-10
    clarity: number; // 0-10
    callToAction: number; // 0-10
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  metrics?: {
    estimatedLikes?: number;
    estimatedComments?: number;
    estimatedShares?: number;
    estimatedClicks?: number;
    estimatedReach?: number;
  };
}

export interface EngagementPredictorOptions {
  platform: string;
  audience?: string;
  contentType?: 'post' | 'video' | 'image' | 'story' | 'article';
  includeMetricEstimates?: boolean;
  accountSize?: 'small' | 'medium' | 'large' | 'xlarge';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * EngagementPredictor - Predicts engagement potential for social media content
 */
export class EngagementPredictor {
  private provider: AIProvider;
  
  /**
   * Constructor
   * @param provider AI provider instance
   */
  constructor(provider: AIProvider) {
    this.provider = provider;
  }
  
  /**
   * Predict engagement for social media content
   * @param content Content to analyze
   * @param options Prediction options
   * @returns Engagement prediction result
   */
  async predictEngagement(content: string, options: EngagementPredictorOptions): Promise<EngagementPredictionResult> {
    try {
      const platform = options.platform;
      const audience = options.audience || 'general';
      const contentType = options.contentType || 'post';
      const includeMetricEstimates = options.includeMetricEstimates || false;
      const accountSize = options.accountSize || 'medium';
      
      // Build prompt for engagement prediction
      let prompt = `
        Analyze the potential engagement level of the following ${platform} ${contentType} for a ${accountSize}-sized account.
        
        Content: "${content}"
        
        Target audience: ${audience}
        
        Evaluate the content on the following aspects (score each from 0.0 to 10.0):
        1. Relevance: How relevant is it to ${platform} users interested in ${audience}?
        2. Uniqueness: How unique or differentiated is the content?
        3. Emotional Impact: How emotionally resonant is the content?
        4. Clarity: How clear and easy to understand is the content?
        5. Call to Action: How effective is the call to action (if any)?
        
        Calculate an overall engagement score from 0.0 to 100.0 based on these aspects.
        Also provide a confidence score (0.0 to 1.0) for your prediction.
        
        Identify the top 2-3 strengths and weaknesses of the content.
        Provide 2-3 actionable suggestions for increasing engagement.
      `;
      
      if (includeMetricEstimates) {
        prompt += `
          \nBased on the content quality and platform benchmarks, estimate the following metrics
          for a ${accountSize}-sized ${platform} account:
          - Estimated likes
          - Estimated comments
          - Estimated shares
          - Estimated clicks (if applicable)
          - Estimated reach
        `;
      }
      
      prompt += `
        \nReturn your analysis in JSON format with the following structure:
        {
          "engagementScore": number,
          "confidence": number,
          "aspects": {
            "relevance": number,
            "uniqueness": number,
            "emotionalImpact": number,
            "clarity": number,
            "callToAction": number
          },
          "strengths": ["strength1", "strength2", ...],
          "weaknesses": ["weakness1", "weakness2", ...],
          "suggestions": ["suggestion1", "suggestion2", ...]
          ${includeMetricEstimates ? `,"metrics": {
            "estimatedLikes": number,
            "estimatedComments": number,
            "estimatedShares": number,
            "estimatedClicks": number,
            "estimatedReach": number
          }` : ''}
        }
      `;
      
      // Generate prediction using the AI provider
      const result = await this.provider.generateText(prompt, {
        temperature: options.temperature || 0.4,
        maxTokens: options.maxTokens || 800,
      });
      
      // Parse the JSON response
      try {
        return JSON.parse(result) as EngagementPredictionResult;
      } catch (parseError) {
        throw new AnalysisError('Failed to parse engagement prediction result as JSON');
      }
    } catch (error) {
      console.error('Error predicting engagement:', error);
      throw new AnalysisError(`Failed to predict engagement: ${(error as Error).message}`);
    }
  }
  
  /**
   * Compare engagement potential between multiple content variations
   * @param contentVariations Array of content variations to compare
   * @param options Prediction options
   * @returns Ranked engagement predictions with comparison notes
   */
  async compareContentVariations(contentVariations: string[], options: EngagementPredictorOptions): Promise<{
    rankings: Array<{
      contentIndex: number;
      content: string;
      engagementScore: number;
      rank: number;
    }>;
    comparisonNotes: string[];
    recommendedVariation: number;
  }> {
    try {
      if (contentVariations.length < 2) {
        throw new AnalysisError('Need at least 2 content variations to compare');
      }
      
      // Get individual predictions for each variation
      const predictions: EngagementPredictionResult[] = [];
      for (const content of contentVariations) {
        const prediction = await this.predictEngagement(content, options);
        predictions.push(prediction);
      }
      
      // Rank the variations
      const rankings = predictions.map((prediction, index) => ({
        contentIndex: index,
        content: contentVariations[index],
        engagementScore: prediction.engagementScore,
        rank: 0 // Will be filled in later
      }));
      
      // Sort by engagement score descending
      rankings.sort((a, b) => b.engagementScore - a.engagementScore);
      
      // Assign ranks
      rankings.forEach((item, index) => {
        item.rank = index + 1;
      });
      
      // Create a summary comparison with the AI
      const comparisonPrompt = `
        Compare these ${contentVariations.length} content variations for ${options.platform}:
        
        ${contentVariations.map((content, index) => 
          `Variation ${index + 1} (Score: ${predictions[index].engagementScore.toFixed(1)}): "${content}"`
        ).join('\n\n')}
        
        Explain in 3-4 clear points why the highest-ranked variation is likely to perform better.
        Be specific about the elements that make it more engaging.
        
        Return your analysis as a JSON array of comparison notes.
      `;
      
      const comparisonResult = await this.provider.generateText(comparisonPrompt, {
        temperature: 0.4,
        maxTokens: 600
      });
      
      // Parse the comparison notes
      let comparisonNotes: string[] = [];
      try {
        comparisonNotes = JSON.parse(comparisonResult);
      } catch (error) {
        // If parsing fails, extract key points manually
        comparisonNotes = comparisonResult
          .split('\n')
          .filter(line => line.trim().length > 0)
          .slice(0, 4);
      }
      
      return {
        rankings,
        comparisonNotes,
        recommendedVariation: rankings[0].contentIndex
      };
    } catch (error) {
      console.error('Error comparing content variations:', error);
      throw new AnalysisError(`Failed to compare content variations: ${(error as Error).message}`);
    }
  }
} 
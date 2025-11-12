import { AIProvider } from '../providers';
import { AnalysisError } from '../utils/errors';

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // From -1.0 (very negative) to 1.0 (very positive)
  confidence: number; // From 0.0 to 1.0
  details?: {
    emotions: Record<string, number>; // Emotions with their intensity scores
    aspects: Array<{
      aspect: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      score: number;
    }>;
  };
}

export interface SentimentAnalyzerOptions {
  detailed?: boolean;
  aspectsToAnalyze?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * SentimentAnalyzer - Analyzes the sentiment of text content
 */
export class SentimentAnalyzer {
  private provider: AIProvider;
  
  /**
   * Constructor
   * @param provider AI provider instance
   */
  constructor(provider: AIProvider) {
    this.provider = provider;
  }
  
  /**
   * Analyze sentiment of text content
   * @param content Text content to analyze
   * @param options Analysis options
   * @returns Sentiment analysis result
   */
  async analyzeSentiment(content: string, options?: SentimentAnalyzerOptions): Promise<SentimentResult> {
    try {
      const detailed = options?.detailed ?? false;
      const aspectsToAnalyze = options?.aspectsToAnalyze || [];
      
      // Build prompt for sentiment analysis
      let prompt = `
        Analyze the sentiment of the following text. Provide a sentiment label (positive, neutral, or negative),
        a sentiment score from -1.0 (very negative) to 1.0 (very positive), and a confidence score from 0.0 to 1.0.
        
        Text: "${content}"
      `;
      
      if (detailed) {
        prompt += `
          \nAlso identify the main emotions present in the text and their intensity (from 0.0 to 1.0).
          Common emotions to consider: joy, sadness, anger, fear, surprise, disgust, trust, anticipation.
        `;
      }
      
      if (aspectsToAnalyze.length > 0) {
        prompt += `
          \nAnalyze the sentiment specifically for these aspects: ${aspectsToAnalyze.join(', ')}.
          For each aspect, provide a sentiment label and score.
        `;
      }
      
      prompt += `
        \nReturn your analysis in JSON format with the following structure:
        {
          "sentiment": "positive|neutral|negative",
          "score": number,
          "confidence": number
          ${detailed || aspectsToAnalyze.length > 0 ? `,"details": {
            ${detailed ? `"emotions": {"emotion1": score, "emotion2": score, ...}` : ''}
            ${detailed && aspectsToAnalyze.length > 0 ? ',' : ''}
            ${aspectsToAnalyze.length > 0 ? `"aspects": [
              {"aspect": "aspect1", "sentiment": "positive|neutral|negative", "score": number},
              ...
            ]` : ''}
          }` : ''}
        }
      `;
      
      // Generate analysis using the AI provider
      const result = await this.provider.generateText(prompt, {
        temperature: options?.temperature || 0.2,
        maxTokens: options?.maxTokens || 500,
      });
      
      // Parse the JSON response
      try {
        return JSON.parse(result) as SentimentResult;
      } catch (parseError) {
        throw new AnalysisError('Failed to parse sentiment analysis result as JSON');
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      throw new AnalysisError(`Failed to analyze sentiment: ${(error as Error).message}`);
    }
  }
  
  /**
   * Analyze sentiment trends in a collection of texts
   * @param contents Array of text contents to analyze
   * @param options Analysis options
   * @returns Array of sentiment analysis results
   */
  async analyzeSentimentTrend(contents: string[], options?: SentimentAnalyzerOptions): Promise<SentimentResult[]> {
    const results: SentimentResult[] = [];
    
    for (const content of contents) {
      const result = await this.analyzeSentiment(content, options);
      results.push(result);
    }
    
    return results;
  }
} 
import { AIProvider } from '../providers';
import { AnalysisError } from '../utils/errors';

export interface ImageAnalysisResult {
  description: string;
  tags: string[];
  objects: Array<{
    name: string;
    confidence: number;
  }>;
  colors: Array<{
    color: string;
    dominance: number;
  }>;
  contentWarnings?: Array<{
    type: string;
    severity: 'none' | 'low' | 'medium' | 'high';
    confidence: number;
  }>;
  suggestedAltText: string;
  aesthetic?: {
    quality: number; // 0-10 scale
    style: string;
    mood: string;
  };
}

export interface MediaAnalyzerOptions {
  includeTags?: boolean;
  includeObjects?: boolean;
  includeColors?: boolean;
  includeContentWarnings?: boolean;
  includeAesthetics?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * MediaAnalyzer - Analyzes image and other media content
 */
export class MediaAnalyzer {
  private provider: AIProvider;
  
  /**
   * Constructor
   * @param provider AI provider instance
   */
  constructor(provider: AIProvider) {
    this.provider = provider;
  }
  
  /**
   * Analyze an image
   * @param imageUrl URL of the image to analyze
   * @param options Analysis options
   * @returns Image analysis result
   */
  async analyzeImage(imageUrl: string, options?: MediaAnalyzerOptions): Promise<ImageAnalysisResult> {
    try {
      const includeTags = options?.includeTags ?? true;
      const includeObjects = options?.includeObjects ?? true;
      const includeColors = options?.includeColors ?? true;
      const includeContentWarnings = options?.includeContentWarnings ?? true;
      const includeAesthetics = options?.includeAesthetics ?? false;
      
      // Build prompt for image analysis
      let prompt = `
        Analyze the following image and provide a detailed description.
        
        ${includeTags ? 'Generate 5-10 relevant tags for the image.' : ''}
        ${includeObjects ? 'Identify key objects in the image with confidence scores.' : ''}
        ${includeColors ? 'List dominant colors in the image with their approximate percentage.' : ''}
        ${includeContentWarnings ? 'Check for any content that might be sensitive or inappropriate, rating severity as none, low, medium, or high.' : ''}
        
        Also generate a concise, descriptive alt text for accessibility purposes.
        ${includeAesthetics ? 'Assess the aesthetic quality of the image on a scale of 0-10, and identify its visual style and mood.' : ''}
        
        Return your analysis in JSON format with the following structure:
        {
          "description": "Detailed description of the image",
          ${includeTags ? `"tags": ["tag1", "tag2", ...]` : ''},
          ${includeObjects ? `"objects": [
            {"name": "object1", "confidence": number},
            ...
          ]` : ''},
          ${includeColors ? `"colors": [
            {"color": "color1", "dominance": number},
            ...
          ]` : ''},
          ${includeContentWarnings ? `"contentWarnings": [
            {"type": "warning_type", "severity": "none|low|medium|high", "confidence": number},
            ...
          ]` : ''},
          "suggestedAltText": "Alt text for accessibility"
          ${includeAesthetics ? `,"aesthetic": {
            "quality": number,
            "style": "style_description",
            "mood": "mood_description"
          }` : ''}
        }
      `;
      
      // Generate analysis using the AI provider
      const result = await this.provider.analyzeImage(imageUrl, prompt, {
        temperature: options?.temperature || 0.3,
        maxTokens: options?.maxTokens || 800,
      });
      
      // Parse the JSON response
      try {
        return JSON.parse(result) as ImageAnalysisResult;
      } catch (parseError) {
        throw new AnalysisError('Failed to parse image analysis result as JSON');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new AnalysisError(`Failed to analyze image: ${(error as Error).message}`);
    }
  }
  
  /**
   * Generate alt text for an image
   * @param imageUrl URL of the image
   * @param context Optional context about the image's purpose
   * @returns Generated alt text
   */
  async generateAltText(imageUrl: string, context?: string): Promise<string> {
    try {
      // Build prompt for alt text generation
      const prompt = `
        Generate concise, descriptive alt text for this image that would help someone who cannot see it understand its content.
        ${context ? `Context: The image is being used in ${context}` : ''}
        
        The alt text should:
        - Be concise but descriptive (under 125 characters if possible)
        - Focus on essential elements in the image
        - Mention the key subject and important details
        - Avoid saying "image of" or "picture of"
        - Convey the purpose or emotional impact if relevant
        
        Return only the alt text with no additional formatting.
      `;
      
      // Generate alt text using the AI provider
      return await this.provider.analyzeImage(imageUrl, prompt, {
        temperature: 0.3,
        maxTokens: 100,
      });
    } catch (error) {
      console.error('Error generating alt text:', error);
      throw new AnalysisError(`Failed to generate alt text: ${(error as Error).message}`);
    }
  }
  
  /**
   * Check if an image contains inappropriate content
   * @param imageUrl URL of the image to check
   * @returns Content moderation result
   */
  async moderateImage(imageUrl: string): Promise<{
    isAppropriate: boolean;
    confidenceScore: number;
    warnings: Array<{
      category: string;
      severity: 'none' | 'low' | 'medium' | 'high';
      confidence: number;
    }>;
    recommendation: 'approve' | 'review' | 'reject';
  }> {
    try {
      // Build prompt for content moderation
      const prompt = `
        Analyze this image for potentially inappropriate or sensitive content.
        
        Check for the following categories:
        - Adult/explicit content
        - Violence or graphic content
        - Hate symbols
        - Harassment or bullying
        - Self-harm
        - Dangerous activities
        - Illegal substances or activities
        - Deception or misinformation
        - Copyright concerns
        
        For each category, rate the severity as none, low, medium, or high with a confidence score.
        Determine if the image is appropriate for a business social media platform.
        
        Return your analysis in JSON format with the following structure:
        {
          "isAppropriate": boolean,
          "confidenceScore": number,
          "warnings": [
            {"category": "category_name", "severity": "none|low|medium|high", "confidence": number},
            ...
          ],
          "recommendation": "approve|review|reject"
        }
      `;
      
      // Generate moderation result using the AI provider
      const result = await this.provider.analyzeImage(imageUrl, prompt, {
        temperature: 0.2,
        maxTokens: 500,
      });
      
      // Parse the JSON response
      try {
        return JSON.parse(result);
      } catch (parseError) {
        throw new AnalysisError('Failed to parse moderation result as JSON');
      }
    } catch (error) {
      console.error('Error moderating image:', error);
      throw new AnalysisError(`Failed to moderate image: ${(error as Error).message}`);
    }
  }
} 
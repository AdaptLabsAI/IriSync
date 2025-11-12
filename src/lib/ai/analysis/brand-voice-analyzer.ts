import { AIProvider } from '../providers';
import { AnalysisError } from '../utils/errors';

export interface BrandVoiceProfile {
  tone: string[];
  formality: 'very formal' | 'formal' | 'neutral' | 'casual' | 'very casual';
  keyPhrases: string[];
  avoidedPhrases: string[];
  voiceAttributes: string[];
  audienceAlignment: number; // 0-10 scale
  consistency: number; // 0-10 scale
  brandIdentifiers: string[];
}

export interface BrandVoiceAnalysisResult {
  profile: BrandVoiceProfile;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  contentScores: {
    alignment: number; // 0-10 scale
    consistency: number; // 0-10 scale
    distinctiveness: number; // 0-10 scale
    authenticity: number; // 0-10 scale
    overallScore: number; // 0-100 scale
  };
}

export interface BrandVoiceAnalyzerOptions {
  industry?: string;
  targetAudience?: string[];
  competitors?: string[];
  brandValues?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * BrandVoiceAnalyzer - Enterprise tier tool for analyzing brand voice and consistency
 */
export class BrandVoiceAnalyzer {
  private provider: AIProvider;
  
  /**
   * Constructor
   * @param provider AI provider instance
   */
  constructor(provider: AIProvider) {
    this.provider = provider;
  }
  
  /**
   * Analyze a collection of content to identify brand voice patterns
   * @param contents Array of content samples from the brand
   * @param options Analysis options
   * @returns Brand voice analysis result
   */
  async analyzeBrandVoice(contents: string[], options?: BrandVoiceAnalyzerOptions): Promise<BrandVoiceAnalysisResult> {
    try {
      if (contents.length < 3) {
        throw new AnalysisError('Need at least 3 content samples for meaningful brand voice analysis');
      }
      
      const industry = options?.industry || 'general';
      const targetAudience = options?.targetAudience || [];
      const brandValues = options?.brandValues || [];
      
      // Build prompt for brand voice analysis
      const prompt = `
        Analyze these content samples to identify and define the brand's voice pattern.
        
        ${contents.map((content, index) => `Sample ${index + 1}: "${content}"`).join('\n\n')}
        
        Industry: ${industry}
        ${targetAudience.length > 0 ? `Target Audience: ${targetAudience.join(', ')}` : ''}
        ${brandValues.length > 0 ? `Brand Values: ${brandValues.join(', ')}` : ''}
        
        Identify the following:
        1. Dominant tone patterns
        2. Level of formality
        3. Key phrases or language patterns that appear repeatedly
        4. Phrases that are deliberately avoided
        5. Distinctive voice attributes
        6. Alignment with target audience (score 0-10)
        7. Consistency across samples (score 0-10)
        8. Unique brand identifiers in the language
        
        Also evaluate content performance on:
        - Brand alignment score (0-10)
        - Consistency score (0-10)
        - Distinctiveness score (0-10)
        - Authenticity score (0-10)
        
        Identify 3-4 strengths and 3-4 weaknesses of the brand voice.
        Provide 3-5 actionable recommendations to improve brand voice consistency.
        
        Return your analysis in JSON format with the following structure:
        {
          "profile": {
            "tone": ["tone1", "tone2", ...],
            "formality": "very formal|formal|neutral|casual|very casual",
            "keyPhrases": ["phrase1", "phrase2", ...],
            "avoidedPhrases": ["phrase1", "phrase2", ...],
            "voiceAttributes": ["attribute1", "attribute2", ...],
            "audienceAlignment": number,
            "consistency": number,
            "brandIdentifiers": ["identifier1", "identifier2", ...]
          },
          "strengths": ["strength1", "strength2", ...],
          "weaknesses": ["weakness1", "weakness2", ...],
          "recommendations": ["recommendation1", "recommendation2", ...],
          "contentScores": {
            "alignment": number,
            "consistency": number,
            "distinctiveness": number,
            "authenticity": number,
            "overallScore": number
          }
        }
      `;
      
      // Generate analysis using the AI provider
      const result = await this.provider.generateText(prompt, {
        temperature: options?.temperature || 0.4,
        maxTokens: options?.maxTokens || 1200,
      });
      
      // Parse the JSON response
      try {
        return JSON.parse(result) as BrandVoiceAnalysisResult;
      } catch (parseError) {
        throw new AnalysisError('Failed to parse brand voice analysis result as JSON');
      }
    } catch (error) {
      console.error('Error analyzing brand voice:', error);
      throw new AnalysisError(`Failed to analyze brand voice: ${(error as Error).message}`);
    }
  }
  
  /**
   * Check if content aligns with an established brand voice profile
   * @param content Content to check
   * @param brandProfile Existing brand voice profile
   * @param options Analysis options
   * @returns Alignment analysis with suggestions
   */
  async checkBrandVoiceAlignment(
    content: string, 
    brandProfile: BrandVoiceProfile,
    options?: { 
      detailed?: boolean;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{
    alignmentScore: number; // 0-100 scale
    matchingAttributes: string[];
    misalignedAttributes: string[];
    suggestions: string[];
    detailed?: {
      toneMatch: number; // 0-10 scale
      formalityMatch: number; // 0-10 scale
      phraseUsage: {
        correctUsage: string[];
        missingKeyPhrases: string[];
        usedAvoidedPhrases: string[];
      };
    };
  }> {
    try {
      const detailed = options?.detailed ?? false;
      
      // Build prompt for alignment check
      const prompt = `
        Analyze how well this content aligns with the established brand voice profile.
        
        Content: "${content}"
        
        Brand Voice Profile:
        - Tone: ${brandProfile.tone.join(', ')}
        - Formality: ${brandProfile.formality}
        - Key Phrases: ${brandProfile.keyPhrases.join(', ')}
        - Avoided Phrases: ${brandProfile.avoidedPhrases.join(', ')}
        - Voice Attributes: ${brandProfile.voiceAttributes.join(', ')}
        - Brand Identifiers: ${brandProfile.brandIdentifiers.join(', ')}
        
        Calculate an overall alignment score from 0-100.
        Identify which brand voice attributes are present in the content.
        Identify which brand voice attributes are missing or misaligned.
        Provide 3-5 specific suggestions to better align this content with the brand voice.
        
        ${detailed ? `Also provide detailed analysis of:
        - Tone match score (0-10)
        - Formality match score (0-10)
        - Specific key phrases used correctly
        - Key phrases that should be included but aren't
        - Avoided phrases that were incorrectly used` : ''}
        
        Return your analysis in JSON format with the following structure:
        {
          "alignmentScore": number,
          "matchingAttributes": ["attribute1", "attribute2", ...],
          "misalignedAttributes": ["attribute1", "attribute2", ...],
          "suggestions": ["suggestion1", "suggestion2", ...]
          ${detailed ? `,"detailed": {
            "toneMatch": number,
            "formalityMatch": number,
            "phraseUsage": {
              "correctUsage": ["phrase1", "phrase2", ...],
              "missingKeyPhrases": ["phrase1", "phrase2", ...],
              "usedAvoidedPhrases": ["phrase1", "phrase2", ...]
            }
          }` : ''}
        }
      `;
      
      // Generate analysis using the AI provider
      const result = await this.provider.generateText(prompt, {
        temperature: options?.temperature || 0.3,
        maxTokens: options?.maxTokens || 800,
      });
      
      // Parse the JSON response
      try {
        return JSON.parse(result);
      } catch (parseError) {
        throw new AnalysisError('Failed to parse brand voice alignment result as JSON');
      }
    } catch (error) {
      console.error('Error checking brand voice alignment:', error);
      throw new AnalysisError(`Failed to check brand voice alignment: ${(error as Error).message}`);
    }
  }
  
  /**
   * Generate content that matches an established brand voice profile
   * @param contentBrief Brief description of content to generate
   * @param brandProfile Brand voice profile to match
   * @param options Generation options
   * @returns Generated content with alignment score
   */
  async generateOnBrandContent(
    contentBrief: string,
    brandProfile: BrandVoiceProfile,
    options?: {
      platform?: string;
      contentType?: 'post' | 'caption' | 'headline' | 'description';
      length?: 'short' | 'medium' | 'long';
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{
    content: string;
    alignmentScore: number;
    explanation: string[];
  }> {
    try {
      const platform = options?.platform || 'general';
      const contentType = options?.contentType || 'post';
      const length = options?.length || 'medium';
      
      // Map length to approximate character count
      const lengthMap = {
        short: 'approximately 50-100 characters',
        medium: 'approximately 100-250 characters',
        long: 'approximately 250-500 characters'
      };
      
      // Build prompt for on-brand content generation
      const prompt = `
        Generate ${contentType} content for ${platform} that perfectly matches this brand voice profile.
        
        Content Brief: ${contentBrief}
        Length: ${lengthMap[length as keyof typeof lengthMap]}
        
        Brand Voice Profile:
        - Tone: ${brandProfile.tone.join(', ')}
        - Formality: ${brandProfile.formality}
        - Key Phrases: ${brandProfile.keyPhrases.join(', ')}
        - Avoided Phrases: ${brandProfile.avoidedPhrases.join(', ')}
        - Voice Attributes: ${brandProfile.voiceAttributes.join(', ')}
        - Brand Identifiers: ${brandProfile.brandIdentifiers.join(', ')}
        
        Include at least 2-3 key phrases from the brand profile.
        Avoid all phrases from the "avoided phrases" list.
        Match the tone and formality level precisely.
        
        Return your response in JSON format with the following structure:
        {
          "content": "The generated content text",
          "alignmentScore": number,
          "explanation": ["reason1", "reason2", ...]
        }
        
        Where the alignment score is your assessment (0-100) of how well the content matches the brand voice,
        and explanation provides 3-4 points about how the content matches specific elements of the brand voice.
      `;
      
      // Generate content using the AI provider
      const result = await this.provider.generateText(prompt, {
        temperature: options?.temperature || 0.6, // Higher temperature for creative content
        maxTokens: options?.maxTokens || 800,
      });
      
      // Parse the JSON response
      try {
        return JSON.parse(result);
      } catch (parseError) {
        throw new AnalysisError('Failed to parse generated content result as JSON');
      }
    } catch (error) {
      console.error('Error generating on-brand content:', error);
      throw new AnalysisError(`Failed to generate on-brand content: ${(error as Error).message}`);
    }
  }
} 
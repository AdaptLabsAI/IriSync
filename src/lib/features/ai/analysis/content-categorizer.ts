import { AIProvider } from '../providers';
import { AnalysisError } from '../utils/errors';

export interface CategoryResult {
  primaryCategory: string;
  confidence: number;
  categories: Array<{
    category: string;
    confidence: number;
  }>;
  taxonomy?: string;
}

export interface ContentCategorizerOptions {
  categories?: string[];
  taxonomy?: string;
  maxCategories?: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * ContentCategorizer - Categorizes content into predefined categories
 */
export class ContentCategorizer {
  private provider: AIProvider;
  
  // Standard taxonomies that can be used
  private readonly taxonomies = {
    'general': [
      'Business', 'Technology', 'Health', 'Finance', 'Education',
      'Entertainment', 'Sports', 'Politics', 'Science', 'Travel',
      'Food', 'Fashion', 'Art', 'Environment', 'Marketing'
    ],
    'business': [
      'Leadership', 'Management', 'Entrepreneurship', 'Marketing', 'Sales',
      'HR', 'Finance', 'Operations', 'Strategy', 'Innovation',
      'Sustainability', 'Technology', 'Remote Work', 'Customer Service', 'Supply Chain'
    ],
    'marketing': [
      'Content Marketing', 'Social Media', 'SEO', 'Email Marketing', 'PPC',
      'Brand Building', 'Market Research', 'Customer Engagement', 'Influencer Marketing', 'Analytics',
      'Video Marketing', 'Conversion Optimization', 'Mobile Marketing', 'Event Marketing', 'PR'
    ],
    'tech': [
      'Artificial Intelligence', 'Machine Learning', 'Cloud Computing', 'Cybersecurity', 'Blockchain',
      'Web Development', 'Mobile Development', 'Data Science', 'IoT', 'DevOps',
      'VR/AR', 'Robotics', 'SaaS', 'Big Data', 'Quantum Computing'
    ]
  };
  
  /**
   * Constructor
   * @param provider AI provider instance
   */
  constructor(provider: AIProvider) {
    this.provider = provider;
  }
  
  /**
   * Categorize content into predefined categories
   * @param content Text content to categorize
   * @param options Categorization options
   * @returns Category analysis result
   */
  async categorizeContent(content: string, options?: ContentCategorizerOptions): Promise<CategoryResult> {
    try {
      const maxCategories = options?.maxCategories || 3;
      
      // Select taxonomy
      let categories: string[];
      const taxonomyName = options?.taxonomy || 'general';
      
      if (options?.categories && options.categories.length > 0) {
        categories = options.categories;
      } else if (taxonomyName in this.taxonomies) {
        categories = this.taxonomies[taxonomyName as keyof typeof this.taxonomies];
      } else {
        categories = this.taxonomies.general;
      }
      
      // Build prompt for categorization
      const prompt = `
        Categorize the following content into the most relevant categories.
        
        Content: "${content}"
        
        Available categories: ${categories.join(', ')}
        
        Identify the primary category that best describes this content, and up to ${maxCategories} additional relevant categories.
        For each category, provide a confidence score from 0.0 to 1.0.
        
        Return your analysis in JSON format with the following structure:
        {
          "primaryCategory": "category name",
          "confidence": number,
          "categories": [
            {"category": "category name", "confidence": number},
            ...
          ]
        }
      `;
      
      // Generate analysis using the AI provider
      const result = await this.provider.generateText(prompt, {
        temperature: options?.temperature || 0.3,
        maxTokens: options?.maxTokens || 500,
      });
      
      // Parse the JSON response
      try {
        const parsedResult = JSON.parse(result) as CategoryResult;
        // Add taxonomy name to the result
        parsedResult.taxonomy = taxonomyName;
        return parsedResult;
      } catch (parseError) {
        throw new AnalysisError('Failed to parse category analysis result as JSON');
      }
    } catch (error) {
      console.error('Error categorizing content:', error);
      throw new AnalysisError(`Failed to categorize content: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create a custom taxonomy based on sample content
   * @param sampleContents Array of sample content texts
   * @param options Options for taxonomy creation
   * @returns Array of category names
   */
  async createCustomTaxonomy(sampleContents: string[], options?: {
    categoryCount?: number;
    suggestedCategories?: string[];
    domainContext?: string;
  }): Promise<string[]> {
    try {
      const categoryCount = options?.categoryCount || 10;
      const suggestedCategories = options?.suggestedCategories || [];
      const domainContext = options?.domainContext || '';
      
      // Build prompt for taxonomy creation
      const prompt = `
        Create a custom content taxonomy (categorization system) based on the following sample content.
        ${domainContext ? `The content is related to the domain: ${domainContext}.` : ''}
        
        Sample content:
        ${sampleContents.map((content, index) => `Sample ${index + 1}: "${content}"`).join('\n')}
        
        ${suggestedCategories.length > 0 ? `Consider these suggested categories: ${suggestedCategories.join(', ')}` : ''}
        
        Create a taxonomy with ${categoryCount} categories that best organize this type of content.
        Each category should be specific enough to be useful but general enough to cover multiple pieces of content.
        
        Return your taxonomy as a JSON array of category names only.
      `;
      
      // Generate taxonomy using the AI provider
      const result = await this.provider.generateText(prompt, {
        temperature: 0.4,
        maxTokens: 800,
      });
      
      // Parse the JSON response
      try {
        return JSON.parse(result) as string[];
      } catch (parseError) {
        throw new AnalysisError('Failed to parse custom taxonomy result as JSON');
      }
    } catch (error) {
      console.error('Error creating custom taxonomy:', error);
      throw new AnalysisError(`Failed to create custom taxonomy: ${(error as Error).message}`);
    }
  }
} 
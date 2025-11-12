import { PromptTemplate } from './PromptTemplate';

/**
 * Interface representing a prompt template with metadata
 */
export interface PromptRecord {
  key: string;
  template: PromptTemplate;
  description: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Class to manage prompt templates with versioning support
 */
export class PromptManager {
  private templates: Map<string, Map<string, PromptRecord>> = new Map();
  private static instance: PromptManager;
  
  /**
   * Get singleton instance of PromptManager
   */
  static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize with default templates
    this.loadDefaultTemplates();
  }
  
  /**
   * Register a new prompt template
   * @param key Unique identifier for the template
   * @param template The prompt template
   * @param description Human-readable description
   * @returns The registered prompt record
   */
  registerTemplate(key: string, template: PromptTemplate, description: string): PromptRecord {
    const version = template.getVersion();
    
    // Create version map if it doesn't exist
    if (!this.templates.has(key)) {
      this.templates.set(key, new Map());
    }
    
    const versionMap = this.templates.get(key)!;
    
    // Create the prompt record
    const record: PromptRecord = {
      key,
      template,
      description,
      isActive: true,
      createdAt: new Date()
    };
    
    // Add to version map
    versionMap.set(version, record);
    
    return record;
  }
  
  /**
   * Get a specific version of a template
   * @param key Template key
   * @param version Version string
   * @returns The prompt template or undefined if not found
   */
  getTemplateVersion(key: string, version: string): PromptTemplate | undefined {
    const versionMap = this.templates.get(key);
    if (!versionMap) return undefined;
    
    const record = versionMap.get(version);
    return record?.template;
  }
  
  /**
   * Get the latest version of a template
   * @param key Template key
   * @returns The latest prompt template or undefined if not found
   */
  getLatestTemplate(key: string): PromptTemplate | undefined {
    const versionMap = this.templates.get(key);
    if (!versionMap || versionMap.size === 0) return undefined;
    
    // Get all versions and sort them
    const versions = Array.from(versionMap.keys()).sort((a, b) => {
      const aParts = a.split('.').map(p => parseInt(p, 10));
      const bParts = b.split('.').map(p => parseInt(p, 10));
      
      for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) {
          return bParts[i] - aParts[i]; // Descending order
        }
      }
      
      return bParts.length - aParts.length;
    });
    
    // Get the latest version
    const latestVersion = versions[0];
    return versionMap.get(latestVersion)?.template;
  }
  
  /**
   * Create a new version of an existing template
   * @param key Template key
   * @param templateString New template string
   * @param description Description for the new version
   * @returns The new prompt record
   */
  createNewVersion(key: string, templateString?: string, description?: string): PromptRecord {
    const latestTemplate = this.getLatestTemplate(key);
    
    if (!latestTemplate) {
      throw new Error(`Template with key '${key}' not found`);
    }
    
    // Create new version
    const newTemplate = latestTemplate.createNewVersion(templateString);
    
    // Get the description from the latest version if not provided
    const latestRecord = this.getLatestRecord(key);
    const newDescription = description || latestRecord?.description || '';
    
    // Register the new version
    return this.registerTemplate(key, newTemplate, newDescription);
  }
  
  /**
   * Get the latest record for a template
   * @param key Template key
   * @returns The latest prompt record or undefined if not found
   */
  private getLatestRecord(key: string): PromptRecord | undefined {
    const versionMap = this.templates.get(key);
    if (!versionMap || versionMap.size === 0) return undefined;
    
    const latestTemplate = this.getLatestTemplate(key);
    if (!latestTemplate) return undefined;
    
    return versionMap.get(latestTemplate.getVersion());
  }
  
  /**
   * Load default templates into the manager
   */
  private loadDefaultTemplates(): void {
    // Example social media post template
    const socialPostTemplate = new PromptTemplate(`
      Create a {{length}} {{platform}} post about {{topic}} in a {{tone}} tone.
      {{#if includeHashtags}}Include relevant hashtags.{{/if}}
      {{#if includeEmojis}}Use appropriate emojis.{{/if}}
      Key points to include: {{keyPoints}}
    `.trim(), '1.0.0');
    
    // Add platform-specific optimizations
    socialPostTemplate.addPlatformOptimizations('twitter', {
      maxLength: 280,
      hashtagLimit: 3
    });
    
    socialPostTemplate.addPlatformOptimizations('instagram', {
      hashtagLimit: 30,
      emojiRecommended: true
    });
    
    socialPostTemplate.addPlatformOptimizations('linkedin', {
      maxLength: 3000,
      tone: 'professional',
      hashtagLimit: 5
    });
    
    // Register the template
    this.registerTemplate(
      'social-post',
      socialPostTemplate,
      'Template for generating social media posts across platforms'
    );
    
    // Add more default templates here as needed
  }
}

// Export the main classes and singleton instance
export { PromptTemplate };
export const promptManager = PromptManager.getInstance();

// Export common prompt templates
export const CONTENT_GENERATION_PROMPTS = {
  POST: `Generate a {{length}} {{platform}} post about {{topic}} in a {{tone}} tone. 
Key points to include: {{keyMessages}}. 
{{#if includeHashtags}}Include relevant hashtags.{{/if}} 
{{#if includeEmojis}}Use appropriate emojis.{{/if}}`,

  CAPTION: `Create a {{length}} caption for an image showing {{imageDescription}}. 
Brand voice: {{brandVoice}}. Purpose: {{purpose}}. 
{{#if includeHashtags}}Include relevant hashtags.{{/if}}`,

  HASHTAGS: `Generate {{count}} {{relevance}} relevant hashtags for {{platform}} 
based on this content: {{content}}.`
};

export const ANALYSIS_PROMPTS = {
  SENTIMENT: `Analyze the sentiment of the following text and provide a breakdown of emotions detected. 
Rate on a scale of -1.0 (very negative) to 1.0 (very positive).

Text: {{text}}`,

  CATEGORIZATION: `Categorize the following content into appropriate categories from this taxonomy: 
{{taxonomy}}

Content: {{content}}`,

  ENGAGEMENT: `Predict the likely engagement for this {{platform}} post. 
Consider the topic, style, and current trends.

Post: {{postContent}}`
};

export const MEDIA_PROMPTS = {
  ALT_TEXT: `Generate a descriptive and accessible alt text for an image with the following content:
{{imageContent}}`,

  CONTENT_DETECTION: `Identify and list all important objects, people, actions, and scenes in this image.
Be thorough but concise.`,

  MODERATION: `Check if this content contains any inappropriate material including but not limited to:
violence, hate speech, adult content, harassment, or harmful misinformation.

Content: {{content}}`
}; 
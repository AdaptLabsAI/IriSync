import { AIProvider, AIProviderConfig, AIRequestOptions } from './AIProvider';
import { ProviderType } from './ProviderType';
import { logger } from '../../logging/logger';
import config from '../../config';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements AIProvider {
  private config: AIProviderConfig;
  
  constructor(config: AIProviderConfig) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      endpoint: config.endpoint || 'https://api.openai.com/v1',
      modelId: config.modelId || 'gpt-3.5-turbo',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3
    };
  }
  
  async generateText(prompt: string, options?: AIRequestOptions): Promise<string> {
    try {
      const response = await fetch(`${this.config.endpoint}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.modelId,
          prompt,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 500,
          stop: options?.stopSequences,
          stream: false
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error (${response.status}): ${JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      return data.choices[0].text.trim();
    } catch (error) {
      logger.error(`OpenAI generation error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async generateChat(messages: any[], options?: AIRequestOptions): Promise<string> {
    try {
      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.modelId,
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 500,
          stop: options?.stopSequences,
          stream: false
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error (${response.status}): ${JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      logger.error(`OpenAI chat generation error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async embedText(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.config.endpoint}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenAI embedding error (${response.status}): ${JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      logger.error(`OpenAI embedding error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenAI vision error (${response.status}): ${JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      logger.error(`OpenAI vision error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  getModelId(): string {
    return this.config.modelId;
  }
}

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider implements AIProvider {
  private config: AIProviderConfig;
  
  constructor(config: AIProviderConfig) {
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      endpoint: config.endpoint || 'https://api.anthropic.com/v1',
      modelId: config.modelId || 'claude-3-sonnet-20240229',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3
    };
  }
  
  async generateText(prompt: string, options?: AIRequestOptions): Promise<string> {
    // Anthropic only supports chat format, so we'll use that
    return this.generateChat([{ role: 'user', content: prompt }], options);
  }
  
  async generateChat(messages: any[], options?: AIRequestOptions): Promise<string> {
    try {
      // Convert messages to Anthropic format if necessary
      const anthropicMessages = messages.map(msg => {
        if (msg.role === 'system') {
          // Handle system messages specially for Anthropic
          return { role: 'user', content: `<system>\n${msg.content}\n</system>` };
        }
        return msg;
      });
      
      const response = await fetch(`${this.config.endpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.modelId,
          messages: anthropicMessages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 500,
          stop_sequences: options?.stopSequences,
          stream: false
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Anthropic API error (${response.status}): ${JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      logger.error(`Anthropic generation error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async embedText(text: string): Promise<number[]> {
    // Anthropic doesn't have a native embedding endpoint, so we use OpenAI's embedding API
    try {
      const openAIProvider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        modelId: 'text-embedding-ada-002'
      });
      return await openAIProvider.embedText(text);
    } catch (error) {
      logger.error(`Embedding fallback error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.endpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.modelId,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image', source: { type: 'url', url: imageUrl } }
              ]
            }
          ],
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Anthropic API error (${response.status}): ${JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      logger.error(`Anthropic vision error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  getModelId(): string {
    return this.config.modelId;
  }
}

/**
 * Google AI provider implementation
 */
export class GoogleAIProvider implements AIProvider {
  private config: AIProviderConfig;
  
  constructor(config: AIProviderConfig) {
    this.config = {
      apiKey: config.apiKey || process.env.GOOGLE_AI_API_KEY,
      modelId: config.modelId || 'gemini-pro',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3
    };
  }
  
  async generateText(prompt: string, options?: AIRequestOptions): Promise<string> {
    // Google AI only supports chat format for Gemini, so we'll use that
    return this.generateChat([{ role: 'user', content: prompt }], options);
  }
  
  async generateChat(messages: any[], options?: AIRequestOptions): Promise<string> {
    try {
      // Convert to Google's format
      const contents = messages.map(msg => {
        const role = msg.role === 'system' ? 'user' : msg.role;
        return { role, parts: [{ text: msg.content }] };
      });
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.modelId}:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options?.temperature || 0.7,
            maxOutputTokens: options?.maxTokens || 500,
            stopSequences: options?.stopSequences
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Google AI API error (${response.status}): ${JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      logger.error(`Google AI generation error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async embedText(text: string): Promise<number[]> {
    // Google AI doesn't have a widely available embedding endpoint, so we use OpenAI as fallback
    try {
      const openAIProvider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        modelId: 'text-embedding-ada-002'
      });
      return await openAIProvider.embedText(text);
    } catch (error) {
      logger.error(`Embedding fallback error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    try {
      // Fetch the image and convert to base64
      const imageResponse = await fetch(imageUrl);
      const buffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { data: base64Image, mimeType: imageResponse.headers.get('content-type') || 'image/jpeg' } }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 500
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Google AI vision error (${response.status}): ${JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      logger.error(`Google AI vision error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  getModelId(): string {
    return this.config.modelId;
  }
}

/**
 * Factory for creating AI provider instances
 */
export class AIProviderFactory {
  /**
   * Create an AI provider instance
   * @param providerType Type of provider to create
   * @param config Provider configuration
   * @returns AI provider instance
   */
  static createProvider(providerType: ProviderType, config: AIProviderConfig): AIProvider {
    switch (providerType) {
      case ProviderType.OPENAI:
        return new OpenAIProvider(config);
        
      case ProviderType.ANTHROPIC:
        return new AnthropicProvider(config);
        
      case ProviderType.GOOGLE:
        return new GoogleAIProvider(config);
        
      default:
        // Default to OpenAI
        logger.warn(`Unknown provider type: ${providerType}, defaulting to OpenAI`);
        return new OpenAIProvider(config);
    }
  }
  
  /**
   * Get the default provider based on configuration
   * @returns Default AI provider instance
   */
  static getDefaultProvider(): AIProvider {
    const defaultProvider = process.env.DEFAULT_AI_PROVIDER || ProviderType.OPENAI;
    const defaultModel = process.env.DEFAULT_AI_MODEL || 'gpt-3.5-turbo';
    
    return AIProviderFactory.createProvider(defaultProvider as ProviderType, {
      modelId: defaultModel
    });
  }
  
  /**
   * Get embedding provider
   * @returns AI provider for creating embeddings
   */
  static getEmbeddingProvider(): AIProvider {
    return new OpenAIProvider({
      modelId: 'text-embedding-ada-002'
    });
  }
}

// Export everything from AIProvider for easier imports
export { ProviderType }; 
export type { AIProvider, AIProviderConfig, AIRequestOptions }; 
import { AIProvider, AIProviderConfig, AIRequestOptions } from './AIProvider';
import axios from 'axios';
import { OpenAIProvider } from './OpenAIProvider';

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider implements AIProvider {
  private config: AIProviderConfig;
  private openAIFallback: OpenAIProvider | null = null;
  
  /**
   * Create a new Anthropic provider
   * @param config Provider configuration
   */
  constructor(config: AIProviderConfig) {
    this.config = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      ...config
    };
    
    if (!this.config.apiKey) {
      console.warn('Anthropic API key not provided. API calls will fail.');
    }
    
    // Initialize OpenAI fallback for embeddings if OpenAI API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openAIFallback = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        modelId: 'text-embedding-ada-002'
      });
    }
  }
  
  /**
   * Generate text completion from a prompt
   * @param prompt Text prompt
   * @param options Generation options
   * @returns Generated text
   */
  async generateText(prompt: string, options?: AIRequestOptions): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/complete',
        {
          prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
          model: this.config.modelId || 'claude-3-haiku-20240307',
          max_tokens_to_sample: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7,
          stop_sequences: options?.stopSequences || ["\n\nHuman:"]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      return response.data.completion.trim();
    } catch (error) {
      console.error('Error generating text with Anthropic:', error);
      throw new Error(`Anthropic text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate a response from a chat conversation
   * @param messages Array of message objects
   * @param options Generation options
   * @returns Generated response
   */
  async generateChat(messages: any[], options?: AIRequestOptions): Promise<string> {
    try {
      const formattedMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.config.modelId || 'claude-3-opus-20240229',
          messages: formattedMessages,
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      return response.data.content[0].text;
    } catch (error) {
      console.error('Error generating chat with Anthropic:', error);
      throw new Error(`Anthropic chat generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate text embeddings for semantic search
   * Anthropic doesn't offer embeddings, so we use OpenAI as a fallback
   * @param text Text to generate embeddings for
   * @returns Embedding vector
   */
  async embedText(text: string): Promise<number[]> {
    // Since Anthropic doesn't offer embeddings, we use OpenAI as a fallback
    if (this.openAIFallback) {
      try {
        return await this.openAIFallback.embedText(text);
      } catch (error) {
        console.error('Error using OpenAI fallback for embeddings:', error);
        throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      throw new Error('Embedding functionality not available: Anthropic does not provide embeddings and no fallback is configured');
    }
  }
  
  /**
   * Analyze image content with Anthropic Claude models
   * @param imageUrl URL of the image to analyze
   * @param prompt Text prompt describing what to analyze in the image
   * @returns Generated text analysis
   */
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    try {
      // Handle both remote URLs and base64 encoded images
      let imageContent;
      
      if (imageUrl.startsWith('data:')) {
        // Extract base64 content from data URL
        imageContent = { type: "base64", data: imageUrl.split(',')[1] };
      } else {
        // Use URL for remote images
        imageContent = { type: "url", url: imageUrl };
      }
      
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.config.modelId || 'claude-3-opus-20240229',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: imageContent },
                { type: 'text', text: prompt }
              ]
            }
          ],
          max_tokens: 1000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      return response.data.content[0].text;
    } catch (error) {
      console.error('Error analyzing image with Anthropic:', error);
      throw new Error(`Anthropic image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get the model identifier
   * @returns Current model ID
   */
  getModelId(): string {
    return this.config.modelId || 'claude-3-opus-20240229';
  }
} 
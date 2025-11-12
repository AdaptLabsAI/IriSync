import { AIProvider, AIProviderConfig, AIRequestOptions } from './AIProvider';
import OpenAI from 'openai';

/**
 * OpenAI provider implementation with real API integration
 */
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private config: AIProviderConfig;
  
  /**
   * Create a new OpenAI provider
   * @param config Provider configuration
   */
  constructor(config: AIProviderConfig) {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY,
      ...config
    };
    
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: config.endpoint
    });
  }
  
  /**
   * Generate text completion from a prompt
   * @param prompt Text prompt
   * @param options Generation options
   * @returns Generated text
   */
  async generateText(prompt: string, options?: AIRequestOptions): Promise<string> {
    try {
      // Use model from options or fall back to config
      const model = options?.model || this.config.modelId || 'gpt-3.5-turbo';
      
      console.log(`[OpenAI] Generating text with model ${model}`);
      
      const response = await this.client.chat.completions.create({
        model: model,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: options?.maxTokens || 500,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 1,
        presence_penalty: options?.presencePenalty || 0,
        frequency_penalty: options?.frequencyPenalty || 0,
        stream: false
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      return content;
    } catch (error) {
      console.error('Error generating text with OpenAI:', error);
      throw new Error(`OpenAI text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      // Use model from options or fall back to config
      const model = options?.model || this.config.modelId || 'gpt-3.5-turbo';
      
      console.log(`[OpenAI] Generating chat response with model ${model}`);
      
      // Ensure messages are in correct format
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await this.client.chat.completions.create({
        model: model,
        messages: formattedMessages,
        max_tokens: options?.maxTokens || 500,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 1,
        presence_penalty: options?.presencePenalty || 0,
        frequency_penalty: options?.frequencyPenalty || 0,
        stream: false
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      return content;
    } catch (error) {
      console.error('Error generating chat with OpenAI:', error);
      throw new Error(`OpenAI chat generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate text embeddings for semantic search
   * @param text Text to generate embeddings for
   * @returns Embedding vector
   */
  async embedText(text: string): Promise<number[]> {
    try {
      console.log(`[OpenAI] Generating embeddings for text`);
      
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small', // Use latest embedding model
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings with OpenAI:', error);
      throw new Error(`OpenAI embeddings generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    try {
      console.log(`[OpenAI] Analyzing image with model gpt-4o`);
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4o for vision
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI vision analysis');
      }

      return content;
    } catch (error) {
      console.error('Error analyzing image with OpenAI:', error);
      throw new Error(`OpenAI image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get the model identifier
   * @returns Current model ID
   */
  getModelId(): string {
    return this.config.modelId || 'gpt-3.5-turbo';
  }
}

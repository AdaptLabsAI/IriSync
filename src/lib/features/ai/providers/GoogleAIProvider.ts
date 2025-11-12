import { AIProvider, AIProviderConfig, AIRequestOptions } from './AIProvider';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Google AI provider implementation with real API integration
 */
export class GoogleAIProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private config: AIProviderConfig;
  
  /**
   * Create a new Google AI provider
   * @param config Provider configuration
   */
  constructor(config: AIProviderConfig) {
    this.config = {
      apiKey: process.env.GOOGLE_AI_API_KEY,
      ...config
    };
    
    if (!this.config.apiKey) {
      throw new Error('Google AI API key is required');
    }

    this.client = new GoogleGenerativeAI(this.config.apiKey);
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
      const modelName = options?.model || this.config.modelId || 'gemini-1.5-flash';
      
      console.log(`[GoogleAI] Generating text with model ${modelName}`);
      
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 500,
          topP: options?.topP || 1,
          stopSequences: options?.stopSequences
        }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('No content received from Google AI');
      }

      return text;
    } catch (error) {
      console.error('Error generating text with Google AI:', error);
      throw new Error(`Google AI text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const modelName = options?.model || this.config.modelId || 'gemini-1.5-flash';
      
      console.log(`[GoogleAI] Generating chat response with model ${modelName}`);
      
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 500,
          topP: options?.topP || 1,
          stopSequences: options?.stopSequences
        }
      });

      // Convert messages to Google AI format
      const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const lastMessage = messages[messages.length - 1];
      
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('No content received from Google AI');
      }

      return text;
    } catch (error) {
      console.error('Error generating chat with Google AI:', error);
      throw new Error(`Google AI chat generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate text embeddings for semantic search
   * @param text Text to generate embeddings for
   * @returns Embedding vector
   */
  async embedText(text: string): Promise<number[]> {
    try {
      console.log(`[GoogleAI] Generating embeddings for text`);
      
      const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error('No embedding received from Google AI');
      }

      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embeddings with Google AI:', error);
      throw new Error(`Google AI embeddings generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Analyze image content with Google AI models
   * @param imageUrl URL of the image to analyze
   * @param prompt Text prompt describing what to analyze in the image
   * @returns Generated text analysis
   */
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    try {
      console.log(`[GoogleAI] Analyzing image with model gemini-1.5-flash`);
      
      const model = this.client.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500
        }
      });

      // Fetch image data
      const response = await fetch(imageUrl);
      const imageBuffer = await response.arrayBuffer();
      const imageData = {
        inlineData: {
          data: Buffer.from(imageBuffer).toString('base64'),
          mimeType: response.headers.get('content-type') || 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imageData]);
      const analysisResponse = await result.response;
      const text = analysisResponse.text();

      if (!text) {
        throw new Error('No content received from Google AI vision analysis');
      }

      return text;
    } catch (error) {
      console.error('Error analyzing image with Google AI:', error);
      throw new Error(`Google AI image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get the model identifier
   * @returns Current model ID
   */
  getModelId(): string {
    return this.config.modelId || 'gemini-1.5-flash';
  }
} 
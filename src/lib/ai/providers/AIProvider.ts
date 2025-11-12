/**
 * Configuration for AI Provider
 */
export interface AIProviderConfig {
  apiKey?: string;
  endpoint?: string;
  modelId: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Options for AI requests
 */
export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  streamResponse?: boolean;
}

/**
 * Abstract interface for AI providers
 */
export interface AIProvider {
  /**
   * Generate text completion from a prompt
   * @param prompt Text prompt to generate completion for
   * @param options Generation options
   * @returns Generated text
   */
  generateText(prompt: string, options?: AIRequestOptions): Promise<string>;
  
  /**
   * Generate a response from a chat conversation
   * @param messages Array of message objects
   * @param options Generation options
   * @returns Generated response
   */
  generateChat(messages: any[], options?: AIRequestOptions): Promise<string>;
  
  /**
   * Generate text embeddings for semantic search
   * @param text Text to generate embeddings for
   * @returns Embedding vector
   */
  embedText(text: string): Promise<number[]>;
  
  /**
   * Analyze image content
   * @param imageUrl URL of the image to analyze
   * @param prompt Text prompt describing what to analyze in the image
   * @returns Generated text analysis
   */
  analyzeImage(imageUrl: string, prompt: string): Promise<string>;
  
  /**
   * Get the model identifier
   * @returns Model identifier string
   */
  getModelId(): string;
}

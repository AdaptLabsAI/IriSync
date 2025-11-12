/**
 * Parameters for a completion request
 */
export interface CompletionParams {
  /**
   * The prompt to generate completions for
   */
  prompt: string;
  
  /**
   * The model to use for completion
   * @default 'gpt-3.5-turbo'
   */
  model?: string;
  
  /**
   * Sampling temperature between 0 and 2
   * @default 0.7
   */
  temperature?: number;
  
  /**
   * The maximum number of tokens to generate
   * @default 1000
   */
  max_tokens?: number;
  
  /**
   * Response format for the completion
   */
  response_format?: { type: 'text' | 'json_object' };
  
  /**
   * Sequences where the API will stop generating further tokens
   */
  stop?: string | string[];
}

/**
 * Response from a completion request
 */
export interface CompletionResponse {
  /**
   * The generated text
   */
  text: string;
  
  /**
   * Model used for generation
   */
  model: string;
  
  /**
   * Number of tokens used for the prompt
   */
  promptTokens: number;
  
  /**
   * Number of tokens generated in the completion
   */
  completionTokens: number;
  
  /**
   * Total number of tokens used (prompt + completion)
   */
  totalTokens: number;
} 
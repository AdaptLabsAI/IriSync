import { AITaskType } from './AITask';
import { ProviderType } from './index';

/**
 * Base interface for all AI API requests
 */
export interface AIBaseRequest {
  /**
   * User ID making the request
   */
  userId: string;
  
  /**
   * Organization ID (optional)
   */
  organizationId?: string;
  
  /**
   * Provider type to use for this request
   * @default 'auto' (system will select appropriate provider)
   */
  providerType?: ProviderType | 'auto';
  
  /**
   * Specific model ID to use (overrides tier-based selection)
   */
  modelId?: string;
  
  /**
   * Maximum tokens to generate
   */
  maxTokens?: number;
  
  /**
   * Temperature for generation (0.0-1.0)
   */
  temperature?: number;
  
  /**
   * Whether to enable streaming response
   * @default false
   */
  stream?: boolean;
  
  /**
   * Whether to use cached response if available
   * @default true
   */
  useCache?: boolean;
  
  /**
   * Custom request ID for tracking
   */
  requestId?: string;
  
  /**
   * Debug mode flag
   * @default false
   */
  debug?: boolean;
}

/**
 * Text completion request
 */
export interface TextCompletionRequest extends AIBaseRequest {
  /**
   * Input prompt for completion
   */
  prompt: string;
  
  /**
   * Task type
   */
  taskType: AITaskType;
  
  /**
   * Optional system message to set context
   */
  systemMessage?: string;
  
  /**
   * Stop sequences to end generation
   */
  stopSequences?: string[];
}

/**
 * Chat completion request
 */
export interface ChatCompletionRequest extends AIBaseRequest {
  /**
   * Array of messages in the chat conversation
   */
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  
  /**
   * Task type
   */
  taskType: AITaskType;
  
  /**
   * Response format (text or JSON)
   */
  responseFormat?: 'text' | 'json';
}

/**
 * Image analysis request
 */
export interface ImageAnalysisRequest extends AIBaseRequest {
  /**
   * URL or base64 data of the image
   */
  imageUrl: string;
  
  /**
   * Text prompt describing what to analyze
   */
  prompt: string;
  
  /**
   * Task type
   */
  taskType: AITaskType;
  
  /**
   * Analysis detail level
   * @default 'standard'
   */
  detailLevel?: 'basic' | 'standard' | 'detailed';
}

/**
 * Embedding request
 */
export interface EmbeddingRequest extends AIBaseRequest {
  /**
   * Text to generate embeddings for
   */
  text: string;
  
  /**
   * Embedding model to use
   */
  embeddingModel?: string;
  
  /**
   * Task type
   */
  taskType: AITaskType;
}

/**
 * Token usage estimation request
 */
export interface TokenEstimationRequest {
  /**
   * Text to estimate token count for
   */
  text: string;
  
  /**
   * Model to use for estimation
   */
  model?: string;
}

/**
 * Enum for AI task types
 * Used for routing and tracking usage
 */
export enum AITaskType {
  // Content Generation Tasks
  GENERATE_POST = 'generate_post',
  GENERATE_CAPTION = 'generate_caption',
  GENERATE_HASHTAGS = 'generate_hashtags',
  IMPROVE_CONTENT = 'improve_content',
  
  // Content Analysis Tasks
  ANALYZE_SENTIMENT = 'analyze_sentiment',
  CATEGORIZE_CONTENT = 'categorize_content',
  PREDICT_ENGAGEMENT = 'predict_engagement',
  
  // Media Analysis Tasks
  GENERATE_ALT_TEXT = 'generate_alt_text',
  ANALYZE_IMAGE = 'analyze_image',
  MODERATE_CONTENT = 'moderate_content',
  
  // Schedule Optimization Tasks
  SUGGEST_POSTING_TIME = 'suggest_posting_time',
  OPTIMIZE_CONTENT_MIX = 'optimize_content_mix',
  
  // Response Assistance Tasks
  SUGGEST_REPLY = 'suggest_reply',
  SUMMARIZE_CONVERSATION = 'summarize_conversation',
  CATEGORIZE_MESSAGE = 'categorize_message',
  
  // Support and Chatbot Tasks
  CUSTOMER_SUPPORT = 'customer_support', // For support ticket auto-responses
  CHATBOT = 'chatbot' // For interactive chatbot conversations
}

/**
 * Interface for AI task result
 */
export interface AITaskResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  provider?: string;
  model?: string;
  latency?: number;
}

/**
 * Base interface for AI task parameters
 */
export interface AITaskParams {
  userId: string;
  organizationId?: string;
}

/**
 * Interface for tracking AI task usage
 */
export interface AITaskUsage {
  taskId: string;
  userId: string;
  organizationId?: string;
  taskType: AITaskType;
  tokenUsage: number;
  timestamp: Date;
  provider: string;
  model: string;
  success: boolean;
  latency: number;
} 
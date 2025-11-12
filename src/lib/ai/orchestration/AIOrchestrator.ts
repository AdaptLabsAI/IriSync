import { AIProvider } from '../providers/AIProvider';
import { AIToolkit } from '../toolkit/AIToolkit';
import { RAGSystem } from '../../rag/RAGSystem';
import { TokenService } from '../../tokens/token-service';

/**
 * Configuration for AI tasks
 */
export interface AITaskConfig {
  /**
   * User ID for token tracking and authorization
   */
  userId: string;
  
  /**
   * Organization ID for token tracking
   */
  organizationId?: string;
  
  /**
   * Model to use for AI operations
   */
  model?: string;
  
  /**
   * Temperature for generation (0.0-1.0)
   */
  temperature?: number;
  
  /**
   * Number of tokens to generate at maximum
   */
  maxTokens?: number;
  
  /**
   * Whether to enable RAG enhancement
   */
  enableRAG?: boolean;
  
  /**
   * Whether to use cached results if available
   */
  useCache?: boolean;
  
  /**
   * Custom metadata to include with the request
   */
  metadata?: Record<string, any>;
}

/**
 * Result of an AI orchestration task
 */
export interface AIOrchestrationResult<T> {
  /**
   * Whether the task was successful
   */
  success: boolean;
  
  /**
   * Error message if task failed
   */
  error?: string;
  
  /**
   * Result data
   */
  data?: T;
  
  /**
   * Token usage statistics
   */
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
    cost: number;
  };
  
  /**
   * Task execution time in milliseconds
   */
  executionTimeMs?: number;
  
  /**
   * Process steps taken to produce the result
   */
  processSteps?: string[];
}

/**
 * Component for orchestrating AI operations across multiple tools
 */
export interface AIOrchestrator {
  /**
   * Execute a complex multi-tool AI task
   * @param taskType Type of task to execute
   * @param inputs Inputs for the task
   * @param config Configuration options
   * @returns Result of orchestration
   */
  executeTask<T>(
    taskType: string,
    inputs: Record<string, any>,
    config: AITaskConfig
  ): Promise<AIOrchestrationResult<T>>;
  
  /**
   * Generate content with RAG enhancement
   * @param prompt Prompt for content generation
   * @param config Configuration options
   * @returns Generated content
   */
  generateWithRAG(
    prompt: string,
    config: AITaskConfig & {
      queryText?: string;
      documentTypes?: string[];
      tags?: string[];
    }
  ): Promise<AIOrchestrationResult<string>>;
  
  /**
   * Analyze content with multiple AI tools
   * @param content Content to analyze
   * @param analysisTypes Types of analysis to perform
   * @param config Configuration options
   * @returns Combined analysis results
   */
  multiToolAnalysis(
    content: string,
    analysisTypes: string[],
    config: AITaskConfig
  ): Promise<AIOrchestrationResult<Record<string, any>>>;
  
  /**
   * Execute a workflow with multiple sequential AI operations
   * @param workflowName Name of the predefined workflow
   * @param inputs Initial inputs for the workflow
   * @param config Configuration options
   * @returns Workflow result
   */
  executeWorkflow<T>(
    workflowName: string,
    inputs: Record<string, any>,
    config: AITaskConfig
  ): Promise<AIOrchestrationResult<T>>;
  
  /**
   * Get the available AI tools
   * @returns AI toolkit
   */
  getToolkit(): AIToolkit;
  
  /**
   * Get the RAG system
   * @returns RAG system
   */
  getRAGSystem(): RAGSystem;
} 
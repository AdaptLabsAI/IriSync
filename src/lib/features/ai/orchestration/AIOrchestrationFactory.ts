import { AIToolkit } from '../toolkit/AIToolkit';
import { RAGSystem } from '../../rag/RAGSystem';
import { TokenService } from '../../tokens/token-service';
import { AIOrchestrator } from './AIOrchestrator';
import { AIOrchestratorImpl } from './AIOrchestrator.impl';
import { AIProvider } from '../providers/AIProvider';
import { logger } from '../../logging/logger';

/**
 * Options for creating an AI orchestrator
 */
export interface AIOrchestrationOptions {
  /**
   * Default provider for AI operations
   */
  provider?: AIProvider;
  
  /**
   * Whether to use token tracking
   */
  trackTokens?: boolean;
  
  /**
   * RAG system configuration
   */
  ragConfig?: {
    embeddingModel?: string;
    chunkSize?: number;
    chunkOverlap?: number;
    maxSearchResults?: number;
  };
  
  /**
   * Default user ID for token tracking
   */
  userId?: string;
  
  /**
   * Default organization ID for token tracking
   */
  organizationId?: string;
}

/**
 * Factory for creating AI orchestration components
 */
export class AIOrchestrationFactory {
  private static instance: AIOrchestrationFactory;
  private orchestrators: Map<string, AIOrchestrator> = new Map();
  private tokenService: TokenService;
  
  /**
   * Create a new orchestration factory
   * @param tokenService Token service
   */
  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
  }
  
  /**
   * Get the global orchestration factory instance
   * @param tokenService Token service
   * @returns Orchestration factory instance
   */
  static getInstance(tokenService: TokenService): AIOrchestrationFactory {
    if (!AIOrchestrationFactory.instance) {
      AIOrchestrationFactory.instance = new AIOrchestrationFactory(tokenService);
    }
    
    return AIOrchestrationFactory.instance;
  }
  
  /**
   * Create a new AI orchestrator
   * @param provider AI provider
   * @param options Configuration options
   * @returns Configured AI orchestrator
   */
  createOrchestrator(
    provider: AIProvider,
    options: AIOrchestrationOptions = {}
  ): AIOrchestrator {
    try {
      // Create the AI toolkit
      const toolkit = new AIToolkit(
        provider, 
        this.tokenService,
        {
          userId: options.userId,
          organizationId: options.organizationId
        }
      );
      
      // Create the RAG system
      const ragSystem = new RAGSystem(this.tokenService, options.ragConfig);
      
      // Create the orchestrator
      const orchestrator = new AIOrchestratorImpl(
        toolkit,
        ragSystem,
        this.tokenService
      );
      
      // Set user info if provided
      if (options.userId) {
        toolkit.setUser(options.userId, options.organizationId);
      }
      
      // Store the orchestrator in the registry with a unique key
      const key = `${provider.getModelId()}:${options.userId || 'anonymous'}`;
      this.orchestrators.set(key, orchestrator);
      
      logger.info('Created new AI orchestrator', {
        model: provider.getModelId(),
        userId: options.userId
      });
      
      return orchestrator;
    } catch (error) {
      logger.error('Error creating AI orchestrator', {
        error: error instanceof Error ? error.message : String(error),
        model: provider.getModelId()
      });
      
      throw error;
    }
  }
  
  /**
   * Get an existing orchestrator by key
   * @param key Orchestrator key (model:userId)
   * @returns Orchestrator or undefined if not found
   */
  getOrchestrator(key: string): AIOrchestrator | undefined {
    return this.orchestrators.get(key);
  }
  
  /**
   * Get or create an orchestrator
   * @param provider AI provider
   * @param options Configuration options
   * @returns Existing or new orchestrator
   */
  getOrCreateOrchestrator(
    provider: AIProvider,
    options: AIOrchestrationOptions = {}
  ): AIOrchestrator {
    const key = `${provider.getModelId()}:${options.userId || 'anonymous'}`;
    
    if (this.orchestrators.has(key)) {
      return this.orchestrators.get(key)!;
    }
    
    return this.createOrchestrator(provider, options);
  }
} 
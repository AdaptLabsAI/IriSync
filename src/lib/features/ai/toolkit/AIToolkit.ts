import { AIProvider } from '../providers/AIProvider';
import { ContentGeneratorImpl } from './tools/ContentGenerator';
import { ContentAnalyzerImpl } from './tools/ContentAnalyzer';
import { MediaAnalyzerImpl } from './tools/MediaAnalyzer';
import { ScheduleOptimizer as ScheduleOptimizerImpl } from './tools/ScheduleOptimizer';
import { ResponseAssistantImpl } from './tools/ResponseAssistant';
import { 
  ContentGenerator, 
  ContentAnalyzer, 
  MediaAnalyzer, 
  ScheduleOptimizer, 
  ResponseAssistant,
  ToolkitRequestOptions,
  ScheduleOptimizerTool
} from './interfaces';
import { AIFactory } from '../factory';
import { ProviderType } from '../models';
import { TokenTracker } from '../../tokens/token-tracker';
import { TokenService } from '../../tokens/token-service';

/**
 * Configuration for AI toolkit
 */
export interface AIToolkitConfig {
  provider?: AIProvider;
  providerType?: ProviderType;
  providerConfig?: any;
  tokenTracker?: TokenTracker;
  cacheResults?: boolean;
  cacheTtl?: number;
  userId?: string;
  organizationId?: string;
  defaultModel?: string;
}

/**
 * AI Toolkit that provides access to all AI-powered tools
 */
export class AIToolkit {
  private provider: AIProvider;
  private tokenTracker?: TokenTracker;
  private userId?: string;
  private organizationId?: string;
  private tokenService: TokenService;
  private factory: AIFactory;
  
  /**
   * Content generation tools
   */
  public content: ContentGenerator;
  
  /**
   * Content analysis tools
   */
  public analysis: ContentAnalyzer;
  
  /**
   * Media analysis tools
   */
  public media: MediaAnalyzer;
  
  /**
   * Scheduling tools
   */
  public scheduling: ScheduleOptimizerTool;
  
  /**
   * Response generation tools
   */
  public responses: ResponseAssistant;
  
  /**
   * Create a new AI toolkit with the specified provider
   * @param provider AI provider
   * @param tokenService Token service
   * @param config Configuration options
   */
  constructor(provider: AIProvider, tokenService: TokenService, config: AIToolkitConfig = {}) {
    this.factory = new AIFactory();
    this.provider = provider;
    this.tokenTracker = config.tokenTracker;
    this.userId = config.userId;
    this.organizationId = config.organizationId;
    this.tokenService = tokenService;
    
    // Initialize tools
    this.content = new ContentGeneratorImpl(this.provider, this.tokenTracker);
    this.analysis = new ContentAnalyzerImpl(this.provider, this.tokenTracker);
    this.media = new MediaAnalyzerImpl(provider, this.tokenTracker);
    this.scheduling = new ScheduleOptimizerImpl(this.tokenService, this.getPlatformService());
    this.responses = new ResponseAssistantImpl(this.provider, this.tokenTracker);
  }
  
  /**
   * Set a new provider for all tools
   * @param provider New AI provider
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
    
    // Update provider in all tools
    this.content.setProvider(provider);
    this.analysis.setProvider(provider);
    this.media.setProvider(provider);
    this.responses.setProvider(provider);
  }
  
  /**
   * Get the current provider
   * @returns Current AI provider
   */
  getProvider(): AIProvider {
    return this.provider;
  }
  
  /**
   * Create a new provider and use it
   * @param providerType Provider type
   * @param modelId Model ID
   */
  useProviderType(providerType: ProviderType, modelId: string): void {
    const provider = this.factory.getProvider(providerType, modelId, { skipTokenChecks: true });
    this.setProvider(provider);
  }
  
  /**
   * Set the user ID and organization ID for token tracking
   * @param userId User ID
   * @param organizationId Organization ID
   */
  setUser(userId: string, organizationId?: string): void {
    this.userId = userId;
    this.organizationId = organizationId;
  }
  
  /**
   * Get default request options with user information
   * @returns Default toolkit request options
   */
  getDefaultRequestOptions(): ToolkitRequestOptions {
    return {
      userId: this.userId,
      organizationId: this.organizationId,
      skipCache: false
    };
  }
  
  /**
   * Get the platform service for schedule optimization
   * @returns Platform service instance
   */
  private getPlatformService() {
    // Lazy load to avoid circular dependencies
    const { PlatformService } = require('../../platforms/providers/platform-service');
    return new PlatformService();
  }
}

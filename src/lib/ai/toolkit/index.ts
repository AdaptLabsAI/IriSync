// Export the core AIToolkit class
export { AIToolkit, type AIToolkitConfig } from './AIToolkit';
export type { ToolkitRequestOptions } from './interfaces';

// Export interfaces
export type {
  ContentGenerator,
  ContentAnalyzer,
  MediaAnalyzer,
  ScheduleOptimizerTool,
  ResponseAssistant,
  AITaskResult,
  PostGenerationParams,
  CaptionGenerationParams,
  HashtagGenerationParams,
  SentimentAnalysisResult,
  CategoryAnalysisResult,
  EngagementAnalysisResult
} from './interfaces';

// Export implementations
export { ContentGeneratorImpl } from './tools/ContentGenerator';
export { ContentAnalyzerImpl } from './tools/ContentAnalyzer';
export { MediaAnalyzerImpl } from './tools/MediaAnalyzer';
export { ScheduleOptimizer as ScheduleOptimizerImpl } from './tools/ScheduleOptimizer';
export { ResponseAssistantImpl } from './tools/ResponseAssistant';

// Export factory
export { AIToolkitFactory, TokenValidationError } from './ai-toolkit-factory';

// Async factory function for creating a toolkit instance
export async function createToolkit(userId: string, organizationId?: string) {
  // Dynamic import to avoid circular dependencies
  const { AIToolkit } = await import('./AIToolkit');
  const { TokenTracker } = await import('../../tokens/token-tracker');
  const { default: TokenService } = await import('../../tokens/token-service');
  const { TokenRepository } = await import('../../tokens/token-repository');
  const { NotificationService } = await import('../../notifications/notification-service');
  const { firestore } = await import('../../firebase');
  const { AIFactory } = await import('../factory');
  const { ProviderType } = await import('../models');
  
  // Create token tracker
  const tokenTracker = new TokenTracker();
  const tokenRepository = new TokenRepository(firestore as any);
  const notificationService = new NotificationService();
  const tokenService = new TokenService(tokenRepository, notificationService);
  
  // Create a default provider
  const aiFactory = new AIFactory();
  const provider = aiFactory.getProvider(ProviderType.OPENAI, 'gpt-3.5-turbo');
  
  // Return a new toolkit instance
  return new AIToolkit(provider, tokenService, {
    tokenTracker,
    userId,
    organizationId
  });
}
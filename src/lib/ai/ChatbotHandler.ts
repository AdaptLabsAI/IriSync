/**
 * Chatbot AI Handler
 * Provides billable AI chatbot interactions for users (tokens will be consumed)
 */

import { AIService, AIServiceType } from './AIService';
import { AITaskType } from './models/AITask';
import { logger } from '../logging/logger';

export interface ChatbotRequest {
  userId: string;
  organizationId?: string;
  sessionId?: string;
  message: string;
  context?: {
    conversationHistory?: string[];
    userProfile?: {
      name?: string;
      preferences?: string[];
      pastInteractions?: string[];
    };
    platformContext?: string;
    timeZone?: string;
  };
  requestType: 'chat' | 'question' | 'help' | 'creative_assistance';
}

export interface ChatbotResponse {
  success: boolean;
  response?: string;
  suggestions?: string[];
  followUpQuestions?: string[];
  error?: string;
  processingTime: number;
  tokenCharged: boolean;
  conversationContext?: {
    sessionId: string;
    messageCount: number;
    topic?: string;
  };
}

/**
 * Chatbot AI Handler - All operations are BILLABLE (tokens will be consumed)
 */
export class ChatbotHandler {
  private aiService: AIService;

  constructor() {
    this.aiService = AIService.getInstance();
  }

  /**
   * Process chatbot conversation message
   */
  async processChatMessage(request: ChatbotRequest): Promise<ChatbotResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing chatbot message', {
        userId: request.userId,
        sessionId: request.sessionId,
        requestType: request.requestType,
        messageLength: request.message.length
      });

      // Build context-aware prompt
      let prompt = this.buildChatPrompt(request);

      // Process with AI service (CHARGED - will consume tokens)
      const aiResponse = await this.aiService.processRequest({
        userId: request.userId,
        organizationId: request.organizationId,
        taskType: AITaskType.CHATBOT,
        serviceType: AIServiceType.CHATBOT, // CHARGED
        input: prompt,
        options: {
          temperature: 0.7, // More conversational and creative
          maxTokens: 400
        },
        metadata: {
          sessionId: request.sessionId,
          requestType: request.requestType,
          messageLength: request.message.length,
          hasHistory: !!request.context?.conversationHistory?.length,
          interactive: true
        }
      });

      const processingTime = Date.now() - startTime;

      if (!aiResponse.success) {
        return {
          success: false,
          error: aiResponse.error || 'Failed to process chat message',
          processingTime,
          tokenCharged: aiResponse.charged
        };
      }

      // Generate follow-up questions if appropriate
      const followUpQuestions = await this.generateFollowUpQuestions(request, aiResponse.output);

      return {
        success: true,
        response: aiResponse.output,
        followUpQuestions,
        processingTime,
        tokenCharged: aiResponse.charged,
        conversationContext: {
          sessionId: request.sessionId || 'default',
          messageCount: (request.context?.conversationHistory?.length || 0) + 1,
          topic: this.extractTopic(request.message)
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Chatbot message processing failed', {
        userId: request.userId,
        sessionId: request.sessionId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
        tokenCharged: false
      };
    }
  }

  /**
   * Generate creative content assistance
   */
  async generateCreativeAssistance(request: ChatbotRequest): Promise<ChatbotResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = `As a creative AI assistant, help with this request: "${request.message}"

Provide creative, innovative, and practical suggestions. Be inspiring while remaining helpful and actionable.

${request.context?.userProfile?.preferences?.length ? 
  `User preferences: ${request.context.userProfile.preferences.join(', ')}` : ''
}

${request.context?.platformContext ? 
  `Platform context: ${request.context.platformContext}` : ''
}

Focus on being creative, practical, and encouraging.`;

      const aiResponse = await this.aiService.processRequest({
        userId: request.userId,
        organizationId: request.organizationId,
        taskType: AITaskType.CHATBOT,
        serviceType: AIServiceType.CHATBOT, // CHARGED
        input: prompt,
        options: {
          temperature: 0.8, // More creative for assistance
          maxTokens: 500
        },
        metadata: {
          sessionId: request.sessionId,
          requestType: 'creative_assistance',
          hasPreferences: !!request.context?.userProfile?.preferences?.length
        }
      });

      const processingTime = Date.now() - startTime;

      if (!aiResponse.success) {
        return {
          success: false,
          error: aiResponse.error || 'Failed to generate creative assistance',
          processingTime,
          tokenCharged: aiResponse.charged
        };
      }

      return {
        success: true,
        response: aiResponse.output,
        processingTime,
        tokenCharged: aiResponse.charged
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Creative assistance generation failed', {
        userId: request.userId,
        sessionId: request.sessionId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
        tokenCharged: false
      };
    }
  }

  /**
   * Answer questions with detailed explanations
   */
  async answerQuestion(request: ChatbotRequest): Promise<ChatbotResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = `Answer this question thoroughly and helpfully: "${request.message}"

Provide a comprehensive answer that:
1. Addresses the question directly
2. Gives practical examples where relevant
3. Suggests next steps or related considerations
4. Is accurate and helpful

${request.context?.conversationHistory?.length ? 
  `Previous conversation context: ${request.context.conversationHistory.slice(-2).join('\n')}` : ''
}

Focus on being informative, accurate, and genuinely helpful.`;

      const aiResponse = await this.aiService.processRequest({
        userId: request.userId,
        organizationId: request.organizationId,
        taskType: AITaskType.CHATBOT,
        serviceType: AIServiceType.CHATBOT, // CHARGED
        input: prompt,
        options: {
          temperature: 0.5, // Balanced for informative responses
          maxTokens: 450
        },
        metadata: {
          sessionId: request.sessionId,
          requestType: 'question',
          hasContext: !!request.context?.conversationHistory?.length
        }
      });

      const processingTime = Date.now() - startTime;

      if (!aiResponse.success) {
        return {
          success: false,
          error: aiResponse.error || 'Failed to answer question',
          processingTime,
          tokenCharged: aiResponse.charged
        };
      }

      // Generate related questions
      const followUpQuestions = await this.generateRelatedQuestions(request.message);

      return {
        success: true,
        response: aiResponse.output,
        followUpQuestions,
        processingTime,
        tokenCharged: aiResponse.charged
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Question answering failed', {
        userId: request.userId,
        sessionId: request.sessionId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
        tokenCharged: false
      };
    }
  }

  /**
   * Build conversation prompt with context
   */
  private buildChatPrompt(request: ChatbotRequest): string {
    let prompt = '';

    // Add conversation history
    if (request.context?.conversationHistory?.length) {
      const recentHistory = request.context.conversationHistory.slice(-4); // Last 4 exchanges
      prompt += `Previous conversation:\n${recentHistory.join('\n')}\n\n`;
    }

    // Add user profile context
    if (request.context?.userProfile?.name) {
      prompt += `User: ${request.context.userProfile.name}\n`;
    }

    if (request.context?.userProfile?.preferences?.length) {
      prompt += `User interests: ${request.context.userProfile.preferences.join(', ')}\n`;
    }

    // Add platform context
    if (request.context?.platformContext) {
      prompt += `Context: ${request.context.platformContext}\n`;
    }

    // Add current message
    prompt += `\nUser message: "${request.message}"\n\n`;

    // Add response instructions
    prompt += `Respond as a helpful, friendly AI assistant. Be conversational, engaging, and genuinely helpful. Match the user's tone while being professional.`;

    return prompt;
  }

  /**
   * Generate follow-up questions based on the conversation
   */
  private async generateFollowUpQuestions(request: ChatbotRequest, response?: string): Promise<string[]> {
    try {
      // Only generate follow-ups for certain types of conversations
      if (request.requestType === 'help' || request.requestType === 'question') {
        const prompt = `Based on this conversation:
User: "${request.message}"
Assistant: "${response}"

Generate 2-3 relevant follow-up questions the user might want to ask. Make them specific and helpful.
Return as a JSON array of strings.`;

        const aiResponse = await this.aiService.processRequest({
          userId: request.userId,
          organizationId: request.organizationId,
          taskType: AITaskType.SUGGEST_REPLY,
          serviceType: AIServiceType.CUSTOMER_SERVICE, // Use non-billable for follow-ups
          input: prompt,
          options: {
            temperature: 0.6,
            maxTokens: 150
          }
        });

        if (aiResponse.success && aiResponse.output) {
          try {
            return JSON.parse(aiResponse.output);
          } catch {
            return [];
          }
        }
      }

      return [];
    } catch (error) {
      logger.warn('Failed to generate follow-up questions', { error });
      return [];
    }
  }

  /**
   * Generate related questions for Q&A
   */
  private async generateRelatedQuestions(question: string): Promise<string[]> {
    try {
      const prompt = `Based on this question: "${question}"

Generate 2-3 related questions someone might also want to ask about this topic.
Return as a JSON array of strings.`;

      const aiResponse = await this.aiService.processRequest({
        userId: 'system', // Use system user for related questions
        taskType: AITaskType.SUGGEST_REPLY,
        serviceType: AIServiceType.CUSTOMER_SERVICE, // Non-billable for suggestions
        input: prompt,
        options: {
          temperature: 0.6,
          maxTokens: 120
        }
      });

      if (aiResponse.success && aiResponse.output) {
        try {
          return JSON.parse(aiResponse.output);
        } catch {
          return [];
        }
      }

      return [];
    } catch (error) {
      logger.warn('Failed to generate related questions', { error });
      return [];
    }
  }

  /**
   * Extract topic from message for context tracking
   */
  private extractTopic(message: string): string {
    // Simple topic extraction - could be enhanced with NLP
    const words = message.toLowerCase().split(' ');
    const topics = ['social media', 'content', 'marketing', 'analytics', 'scheduling', 'engagement'];
    
    for (const topic of topics) {
      if (message.toLowerCase().includes(topic)) {
        return topic;
      }
    }
    
    return 'general';
  }
} 
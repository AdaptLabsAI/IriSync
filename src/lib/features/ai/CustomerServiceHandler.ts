/**
 * Customer Service AI Handler
 * Provides non-billable AI assistance for support tickets and automated customer service responses
 */

import { AIService, AIServiceType } from './AIService';
import { AITaskType } from './models/AITask';
import { logger } from '../../../core/logging/logger';

export interface CustomerServiceRequest {
  userId: string;
  organizationId?: string;
  ticketId?: string;
  query: string;
  context?: {
    userHistory?: string[];
    productInfo?: string;
    previousTickets?: string[];
    urgency?: 'low' | 'medium' | 'high' | 'critical';
  };
  requestType: 'auto_response' | 'suggestion' | 'classification' | 'escalation_check';
}

export interface CustomerServiceResponse {
  success: boolean;
  response?: string;
  suggestions?: string[];
  classification?: {
    category: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    requiresHuman: boolean;
  };
  escalationRecommended?: boolean;
  error?: string;
  processingTime: number;
}

/**
 * Customer Service AI Handler - All operations are FREE (no token charges)
 */
export class CustomerServiceHandler {
  private aiService: AIService;

  constructor() {
    this.aiService = AIService.getInstance();
  }

  /**
   * Generate automated response for customer service ticket
   */
  async generateAutoResponse(request: CustomerServiceRequest): Promise<CustomerServiceResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Generating customer service auto-response', {
        userId: request.userId,
        ticketId: request.ticketId,
        urgency: request.context?.urgency
      });

      // Build context-aware prompt
      let prompt = `As a professional customer service representative, provide a helpful response to this customer query: "${request.query}"`;
      
      if (request.context?.userHistory?.length) {
        prompt += `\n\nCustomer history: ${request.context.userHistory.slice(-3).join('; ')}`;
      }
      
      if (request.context?.productInfo) {
        prompt += `\n\nProduct context: ${request.context.productInfo}`;
      }
      
      if (request.context?.previousTickets?.length) {
        prompt += `\n\nPrevious tickets: ${request.context.previousTickets.slice(-2).join('; ')}`;
      }
      
      prompt += '\n\nProvide a professional, empathetic, and solution-focused response. If you cannot resolve the issue, suggest next steps or escalation.';

      // Process with AI service (NO CHARGE)
      const aiResponse = await this.aiService.processRequest({
        userId: request.userId,
        organizationId: request.organizationId,
        taskType: AITaskType.CUSTOMER_SUPPORT,
        serviceType: AIServiceType.CUSTOMER_SERVICE, // NO CHARGE
        input: prompt,
        options: {
          temperature: 0.4, // More consistent responses
          maxTokens: 500
        },
        metadata: {
          ticketId: request.ticketId,
          requestType: request.requestType,
          urgency: request.context?.urgency,
          automated: true
        }
      });

      const processingTime = Date.now() - startTime;

      if (!aiResponse.success) {
        return {
          success: false,
          error: aiResponse.error || 'Failed to generate response',
          processingTime
        };
      }

      return {
        success: true,
        response: aiResponse.output,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Customer service auto-response failed', {
        userId: request.userId,
        ticketId: request.ticketId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime
      };
    }
  }

  /**
   * Classify customer service ticket
   */
  async classifyTicket(request: CustomerServiceRequest): Promise<CustomerServiceResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = `Classify this customer service query: "${request.query}"

Return a JSON object with:
- category: one of [billing, technical, account, product, general]
- urgency: one of [low, medium, high, critical]
- requiresHuman: boolean indicating if human intervention is needed

Query: "${request.query}"`;

      const aiResponse = await this.aiService.processRequest({
        userId: request.userId,
        organizationId: request.organizationId,
        taskType: AITaskType.CATEGORIZE_MESSAGE,
        serviceType: AIServiceType.CUSTOMER_SERVICE, // NO CHARGE
        input: prompt,
        options: {
          temperature: 0.2, // Very consistent classification
          maxTokens: 200
        },
        metadata: {
          ticketId: request.ticketId,
          requestType: 'classification'
        }
      });

      const processingTime = Date.now() - startTime;

      if (!aiResponse.success) {
        return {
          success: false,
          error: aiResponse.error || 'Failed to classify ticket',
          processingTime
        };
      }

      try {
        const classification = JSON.parse(aiResponse.output || '{}');
        
        return {
          success: true,
          classification: {
            category: classification.category || 'general',
            urgency: classification.urgency || 'medium',
            requiresHuman: classification.requiresHuman || false
          },
          processingTime
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse classification response',
          processingTime
        };
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Ticket classification failed', {
        userId: request.userId,
        ticketId: request.ticketId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime
      };
    }
  }

  /**
   * Generate response suggestions for human agents
   */
  async generateResponseSuggestions(request: CustomerServiceRequest): Promise<CustomerServiceResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = `Generate 3 different response suggestions for this customer service query: "${request.query}"

Each suggestion should be:
1. Professional and empathetic
2. Solution-focused
3. Appropriate for the context

Return as a JSON array of strings.`;

      const aiResponse = await this.aiService.processRequest({
        userId: request.userId,
        organizationId: request.organizationId,
        taskType: AITaskType.SUGGEST_REPLY,
        serviceType: AIServiceType.CUSTOMER_SERVICE, // NO CHARGE
        input: prompt,
        options: {
          temperature: 0.6, // Some variety in suggestions
          maxTokens: 400
        },
        metadata: {
          ticketId: request.ticketId,
          requestType: 'suggestions'
        }
      });

      const processingTime = Date.now() - startTime;

      if (!aiResponse.success) {
        return {
          success: false,
          error: aiResponse.error || 'Failed to generate suggestions',
          processingTime
        };
      }

      try {
        const suggestions = JSON.parse(aiResponse.output || '[]');
        
        return {
          success: true,
          suggestions: Array.isArray(suggestions) ? suggestions : [aiResponse.output || ''],
          processingTime
        };
      } catch (parseError) {
        // If JSON parsing fails, return the raw response as a single suggestion
        return {
          success: true,
          suggestions: [aiResponse.output || ''],
          processingTime
        };
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Response suggestions generation failed', {
        userId: request.userId,
        ticketId: request.ticketId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime
      };
    }
  }

  /**
   * Check if ticket should be escalated
   */
  async checkEscalation(request: CustomerServiceRequest): Promise<CustomerServiceResponse> {
    const startTime = Date.now();
    
    try {
      let prompt = `Analyze this customer service query to determine if it should be escalated: "${request.query}"`;
      
      if (request.context?.urgency) {
        prompt += `\nCurrent urgency level: ${request.context.urgency}`;
      }
      
      if (request.context?.previousTickets?.length) {
        prompt += `\nPrevious tickets: ${request.context.previousTickets.join('; ')}`;
      }
      
      prompt += `\n\nReturn a JSON object with:
- escalationRecommended: boolean
- reason: string explaining why escalation is or isn't needed
- suggestedAction: string with recommended next steps`;

      const aiResponse = await this.aiService.processRequest({
        userId: request.userId,
        organizationId: request.organizationId,
        taskType: AITaskType.CATEGORIZE_MESSAGE,
        serviceType: AIServiceType.CUSTOMER_SERVICE, // NO CHARGE
        input: prompt,
        options: {
          temperature: 0.3,
          maxTokens: 300
        },
        metadata: {
          ticketId: request.ticketId,
          requestType: 'escalation_check'
        }
      });

      const processingTime = Date.now() - startTime;

      if (!aiResponse.success) {
        return {
          success: false,
          error: aiResponse.error || 'Failed to check escalation',
          processingTime
        };
      }

      try {
        const escalationData = JSON.parse(aiResponse.output || '{}');
        
        return {
          success: true,
          escalationRecommended: escalationData.escalationRecommended || false,
          processingTime
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse escalation response',
          processingTime
        };
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Escalation check failed', {
        userId: request.userId,
        ticketId: request.ticketId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime
      };
    }
  }

  /**
   * Process comprehensive customer service request
   */
  async processComprehensiveRequest(request: CustomerServiceRequest): Promise<CustomerServiceResponse> {
    try {
      // Run classification and escalation check in parallel
      const [classificationResult, escalationResult] = await Promise.all([
        this.classifyTicket(request),
        this.checkEscalation(request)
      ]);

      // Generate appropriate response based on classification
      let responseResult: CustomerServiceResponse;
      
      if (escalationResult.escalationRecommended || 
          classificationResult.classification?.requiresHuman) {
        // Generate suggestions for human agent
        responseResult = await this.generateResponseSuggestions(request);
      } else {
        // Generate automated response
        responseResult = await this.generateAutoResponse(request);
      }

      // Combine all results
      return {
        success: responseResult.success,
        response: responseResult.response,
        suggestions: responseResult.suggestions,
        classification: classificationResult.classification,
        escalationRecommended: escalationResult.escalationRecommended,
        error: responseResult.error,
        processingTime: responseResult.processingTime
      };

    } catch (error) {
      logger.error('Comprehensive customer service request failed', {
        userId: request.userId,
        ticketId: request.ticketId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: 0
      };
    }
  }
} 
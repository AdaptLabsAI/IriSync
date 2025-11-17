/**
 * AI Chat API Integration Tests
 *
 * End-to-end tests for the chat endpoint with all integrations
 */

import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '@/app/api/ai/tools/chat/route';
import { getServerSession } from 'next-auth/next';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/core/firebase');
jest.mock('@/lib/features/ai/AIService');
jest.mock('@/lib/features/ai/ConversationService');
jest.mock('@/lib/features/rag/RAGSystem');
jest.mock('@/lib/core/logging/logger');

describe('AI Chat API - Integration Tests', () => {
  const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/ai/tools/chat', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'Test' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });

      it('should reject requests without user ID', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { name: 'Test User', email: 'test@example.com' },
          expires: '2025-12-31'
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'Test' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid Session');
      });

      it('should accept authenticated requests', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { id: 'user_123', email: 'test@example.com' },
          expires: '2025-12-31'
        });

        // Mock other dependencies to prevent actual calls
        const { conversationService } = require('@/lib/features/ai/ConversationService');
        conversationService.getOrCreateActiveConversation = jest.fn().mockResolvedValue('conv_123');
        conversationService.getConversationHistory = jest.fn().mockResolvedValue([]);
        conversationService.formatMessagesForAI = jest.fn().mockReturnValue([]);
        conversationService.addMessage = jest.fn().mockResolvedValue('msg_123');

        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockResolvedValue({
            success: true,
            output: 'Test response',
            model: 'test-model',
            provider: 'test',
            tokenUsage: { prompt: 10, completion: 20, total: 30 }
          })
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'Test query' })
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
      });
    });

    describe('Request Validation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue({
          user: { id: 'user_123', email: 'test@example.com' },
          expires: '2025-12-31'
        });
      });

      it('should reject requests with invalid JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: 'invalid json'
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid Request');
      });

      it('should reject requests without query', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({})
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.message).toContain('Query is required');
      });

      it('should reject requests with empty query', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: '   ' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.message).toContain('Query is required');
      });

      it('should reject requests with non-string query', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 123 })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
      });

      it('should accept valid query', async () => {
        // Mock dependencies
        const { conversationService } = require('@/lib/features/ai/ConversationService');
        conversationService.getOrCreateActiveConversation = jest.fn().mockResolvedValue('conv_123');
        conversationService.getConversationHistory = jest.fn().mockResolvedValue([]);
        conversationService.formatMessagesForAI = jest.fn().mockReturnValue([]);
        conversationService.addMessage = jest.fn().mockResolvedValue('msg_123');

        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockResolvedValue({
            success: true,
            output: 'Response',
            model: 'test-model',
            provider: 'test',
            tokenUsage: { prompt: 10, completion: 20, total: 30 }
          })
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'Valid query text' })
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
      });
    });

    describe('Conversation Management', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue({
          user: { id: 'user_123', email: 'test@example.com' },
          expires: '2025-12-31'
        });
      });

      it('should create new conversation if not provided', async () => {
        const { conversationService } = require('@/lib/features/ai/ConversationService');
        conversationService.getOrCreateActiveConversation = jest.fn().mockResolvedValue('conv_new');
        conversationService.getConversationHistory = jest.fn().mockResolvedValue([]);
        conversationService.formatMessagesForAI = jest.fn().mockReturnValue([]);
        conversationService.addMessage = jest.fn().mockResolvedValue('msg_123');

        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockResolvedValue({
            success: true,
            output: 'Response',
            model: 'test-model',
            provider: 'test',
            tokenUsage: { prompt: 10, completion: 20, total: 30 }
          })
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'Test' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(conversationService.getOrCreateActiveConversation).toHaveBeenCalledWith(
          'user_123',
          undefined
        );
        expect(data.conversationId).toBe('conv_new');
      });

      it('should use existing conversation if provided and valid', async () => {
        const { conversationService } = require('@/lib/features/ai/ConversationService');
        conversationService.getConversation = jest.fn().mockResolvedValue({
          id: 'conv_existing',
          userId: 'user_123',
          title: 'Existing'
        });
        conversationService.getConversationHistory = jest.fn().mockResolvedValue([]);
        conversationService.formatMessagesForAI = jest.fn().mockReturnValue([]);
        conversationService.addMessage = jest.fn().mockResolvedValue('msg_123');

        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockResolvedValue({
            success: true,
            output: 'Response',
            model: 'test-model',
            provider: 'test',
            tokenUsage: { prompt: 10, completion: 20, total: 30 }
          })
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({
            query: 'Test',
            conversationId: 'conv_existing'
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.conversationId).toBe('conv_existing');
      });

      it('should create new conversation if provided ID is invalid', async () => {
        const { conversationService } = require('@/lib/features/ai/ConversationService');
        conversationService.getConversation = jest.fn().mockResolvedValue(null);
        conversationService.getOrCreateActiveConversation = jest.fn().mockResolvedValue('conv_new');
        conversationService.getConversationHistory = jest.fn().mockResolvedValue([]);
        conversationService.formatMessagesForAI = jest.fn().mockReturnValue([]);
        conversationService.addMessage = jest.fn().mockResolvedValue('msg_123');

        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockResolvedValue({
            success: true,
            output: 'Response',
            model: 'test-model',
            provider: 'test',
            tokenUsage: { prompt: 10, completion: 20, total: 30 }
          })
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({
            query: 'Test',
            conversationId: 'invalid_id'
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.conversationId).toBe('conv_new');
      });

      it('should create new conversation if conversation belongs to different user', async () => {
        const { conversationService } = require('@/lib/features/ai/ConversationService');
        conversationService.getConversation = jest.fn().mockResolvedValue({
          id: 'conv_other',
          userId: 'user_456', // Different user
          title: 'Other'
        });
        conversationService.getOrCreateActiveConversation = jest.fn().mockResolvedValue('conv_new');
        conversationService.getConversationHistory = jest.fn().mockResolvedValue([]);
        conversationService.formatMessagesForAI = jest.fn().mockReturnValue([]);
        conversationService.addMessage = jest.fn().mockResolvedValue('msg_123');

        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockResolvedValue({
            success: true,
            output: 'Response',
            model: 'test-model',
            provider: 'test',
            tokenUsage: { prompt: 10, completion: 20, total: 30 }
          })
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({
            query: 'Test',
            conversationId: 'conv_other'
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.conversationId).toBe('conv_new');
      });
    });

    describe('Message Storage', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue({
          user: { id: 'user_123', email: 'test@example.com' },
          expires: '2025-12-31'
        });
      });

      it('should store user message', async () => {
        const { conversationService } = require('@/lib/features/ai/ConversationService');
        conversationService.getOrCreateActiveConversation = jest.fn().mockResolvedValue('conv_123');
        conversationService.getConversationHistory = jest.fn().mockResolvedValue([]);
        conversationService.formatMessagesForAI = jest.fn().mockReturnValue([]);
        conversationService.addMessage = jest.fn().mockResolvedValue('msg_123');

        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockResolvedValue({
            success: true,
            output: 'Response',
            model: 'test-model',
            provider: 'test',
            tokenUsage: { prompt: 10, completion: 20, total: 30 }
          })
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'User question' })
        });

        await POST(request);

        expect(conversationService.addMessage).toHaveBeenCalledWith(
          'conv_123',
          expect.objectContaining({
            role: 'user',
            content: 'User question'
          })
        );
      });

      it('should store AI response with metadata', async () => {
        const { conversationService } = require('@/lib/features/ai/ConversationService');
        conversationService.getOrCreateActiveConversation = jest.fn().mockResolvedValue('conv_123');
        conversationService.getConversationHistory = jest.fn().mockResolvedValue([]);
        conversationService.formatMessagesForAI = jest.fn().mockReturnValue([]);
        conversationService.addMessage = jest.fn().mockResolvedValue('msg_123');

        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockResolvedValue({
            success: true,
            output: 'AI response text',
            model: 'claude-3-5-haiku-20241022',
            provider: 'anthropic',
            serviceType: 'chatbot',
            charged: true,
            latency: 1500,
            tokenUsage: {
              prompt: 50,
              completion: 100,
              total: 150
            }
          })
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'Test' })
        });

        await POST(request);

        // Check AI response was stored
        expect(conversationService.addMessage).toHaveBeenCalledWith(
          'conv_123',
          expect.objectContaining({
            role: 'assistant',
            content: 'AI response text',
            model: 'claude-3-5-haiku-20241022',
            provider: 'anthropic',
            tokenUsage: {
              prompt: 50,
              completion: 100,
              total: 150
            },
            metadata: expect.objectContaining({
              serviceType: 'chatbot',
              charged: true
            })
          })
        );
      });

      it('should continue even if message storage fails', async () => {
        const { conversationService } = require('@/lib/features/ai/ConversationService');
        conversationService.getOrCreateActiveConversation = jest.fn().mockResolvedValue('conv_123');
        conversationService.getConversationHistory = jest.fn().mockResolvedValue([]);
        conversationService.formatMessagesForAI = jest.fn().mockReturnValue([]);
        conversationService.addMessage = jest.fn().mockRejectedValue(new Error('Storage failed'));

        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockResolvedValue({
            success: true,
            output: 'Response',
            model: 'test-model',
            provider: 'test',
            tokenUsage: { prompt: 10, completion: 20, total: 30 }
          })
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'Test' })
        });

        const response = await POST(request);

        // Should still return 200 even if storage failed
        expect(response.status).toBe(200);
      });
    });

    describe('AI Service Integration', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue({
          user: { id: 'user_123', email: 'test@example.com' },
          expires: '2025-12-31'
        });

        const { conversationService } = require('@/lib/features/ai/ConversationService');
        conversationService.getOrCreateActiveConversation = jest.fn().mockResolvedValue('conv_123');
        conversationService.getConversationHistory = jest.fn().mockResolvedValue([]);
        conversationService.formatMessagesForAI = jest.fn().mockReturnValue([]);
        conversationService.addMessage = jest.fn().mockResolvedValue('msg_123');
      });

      it('should call AIService with correct parameters', async () => {
        const { AIService } = require('@/lib/features/ai/AIService');
        const mockProcessRequest = jest.fn().mockResolvedValue({
          success: true,
          output: 'Response',
          model: 'test-model',
          provider: 'test',
          tokenUsage: { prompt: 10, completion: 20, total: 30 }
        });

        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: mockProcessRequest
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'Test query' })
        });

        await POST(request);

        expect(mockProcessRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user_123',
            message: expect.stringContaining('Test query')
          })
        );
      });

      it('should handle AI service errors gracefully', async () => {
        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockRejectedValue(new Error('AI service error'))
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'Test' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('AI Service Error');
      });

      it('should handle unsuccessful AI responses', async () => {
        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockResolvedValue({
            success: false,
            error: 'Insufficient tokens'
          })
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'Test' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('AI Generation Failed');
        expect(data.message).toBe('Insufficient tokens');
      });
    });

    describe('Response Format', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue({
          user: { id: 'user_123', email: 'test@example.com' },
          expires: '2025-12-31'
        });

        const { conversationService } = require('@/lib/features/ai/ConversationService');
        conversationService.getOrCreateActiveConversation = jest.fn().mockResolvedValue('conv_123');
        conversationService.getConversationHistory = jest.fn().mockResolvedValue([]);
        conversationService.formatMessagesForAI = jest.fn().mockReturnValue([]);
        conversationService.addMessage = jest.fn().mockResolvedValue('msg_123');
      });

      it('should return correct response structure', async () => {
        const { AIService } = require('@/lib/features/ai/AIService');
        AIService.getInstance = jest.fn().mockReturnValue({
          processChatbotRequest: jest.fn().mockResolvedValue({
            success: true,
            output: 'Test response',
            model: 'claude-3-5-haiku-20241022',
            provider: 'anthropic',
            tokenUsage: {
              prompt: 50,
              completion: 100,
              total: 150
            },
            charged: true,
            latency: 1000
          })
        });

        const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
          method: 'POST',
          body: JSON.stringify({ query: 'Test' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data).toMatchObject({
          success: true,
          answer: 'Test response',
          conversationId: 'conv_123',
          sources: expect.any(Array),
          metadata: expect.objectContaining({
            model: 'claude-3-5-haiku-20241022',
            provider: 'anthropic',
            tokenUsage: {
              prompt: 50,
              completion: 100,
              total: 150
            },
            latency: expect.any(Number),
            charged: true,
            messageCount: 2 // User message + AI response
          })
        });
      });
    });
  });

  describe('OPTIONS /api/ai/tools/chat', () => {
    it('should return API documentation', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/tools/chat', {
        method: 'OPTIONS'
      });

      const response = await OPTIONS(request);
      const data = await response.json();

      expect(data).toHaveProperty('endpoints');
      expect(data).toHaveProperty('features');
      expect(data).toHaveProperty('supportedTiers');
      expect(data.endpoints.POST).toBeDefined();
      expect(data.endpoints.POST.requestFormat).toBeDefined();
      expect(data.endpoints.POST.responseFormat).toBeDefined();
    });
  });
});

/**
 * ConversationService Unit Tests
 *
 * Comprehensive test suite for conversation management functionality
 */

import { ConversationService, ConversationMessage, Conversation } from '@/lib/features/ai/ConversationService';
import { firestore } from '@/lib/core/firebase';

// Mock Firebase
jest.mock('@/lib/core/firebase', () => ({
  firestore: {
    collection: jest.fn(),
    doc: jest.fn(),
  }
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  runTransaction: jest.fn(),
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
    now: () => ({ toDate: () => new Date() })
  }
}));

jest.mock('@/lib/core/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('ConversationService', () => {
  let conversationService: ConversationService;

  beforeEach(() => {
    jest.clearAllMocks();
    conversationService = new ConversationService();
  });

  describe('createConversation', () => {
    it('should create a new conversation with valid data', async () => {
      const mockAddDoc = require('firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'conv_123' });

      const conversationId = await conversationService.createConversation(
        'user_123',
        'org_456',
        'Test Conversation'
      );

      expect(conversationId).toBe('conv_123');
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'user_123',
          organizationId: 'org_456',
          title: 'Test Conversation',
          messageCount: 0,
          totalTokens: 0,
          archived: false
        })
      );
    });

    it('should use default title if not provided', async () => {
      const mockAddDoc = require('firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'conv_456' });

      await conversationService.createConversation('user_123');

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'New Conversation'
        })
      );
    });

    it('should handle creation errors gracefully', async () => {
      const mockAddDoc = require('firebase/firestore').addDoc;
      mockAddDoc.mockRejectedValue(new Error('Firebase error'));

      await expect(
        conversationService.createConversation('user_123')
      ).rejects.toThrow('Failed to create conversation');
    });
  });

  describe('addMessage', () => {
    it('should add a message to conversation', async () => {
      const mockAddDoc = require('firebase/firestore').addDoc;
      const mockRunTransaction = require('firebase/firestore').runTransaction;

      mockAddDoc.mockResolvedValue({ id: 'msg_123' });
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ messageCount: 5, totalTokens: 1000 })
          }),
          update: jest.fn()
        };
        await callback(mockTransaction);
      });

      const message: Omit<ConversationMessage, 'id' | 'timestamp'> = {
        role: 'user',
        content: 'Hello, AI!',
        metadata: {}
      };

      const messageId = await conversationService.addMessage('conv_123', message);

      expect(messageId).toBe('msg_123');
      expect(mockAddDoc).toHaveBeenCalled();
    });

    it('should handle message with token usage', async () => {
      const mockAddDoc = require('firebase/firestore').addDoc;
      const mockRunTransaction = require('firebase/firestore').runTransaction;

      mockAddDoc.mockResolvedValue({ id: 'msg_456' });
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ messageCount: 5, totalTokens: 1000 })
          }),
          update: jest.fn()
        };
        await callback(mockTransaction);
      });

      const message: Omit<ConversationMessage, 'id' | 'timestamp'> = {
        role: 'assistant',
        content: 'Response',
        model: 'claude-3-5-haiku-20241022',
        provider: 'anthropic',
        tokenUsage: {
          prompt: 50,
          completion: 100,
          total: 150
        }
      };

      await conversationService.addMessage('conv_123', message);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          role: 'assistant',
          content: 'Response',
          model: 'claude-3-5-haiku-20241022',
          provider: 'anthropic',
          tokenUsage: {
            prompt: 50,
            completion: 100,
            total: 150
          }
        })
      );
    });

    it('should fail gracefully if conversation not found', async () => {
      const mockAddDoc = require('firebase/firestore').addDoc;
      mockAddDoc.mockRejectedValue(new Error('Conversation not found'));

      const message: Omit<ConversationMessage, 'id' | 'timestamp'> = {
        role: 'user',
        content: 'Test'
      };

      await expect(
        conversationService.addMessage('invalid_id', message)
      ).rejects.toThrow('Failed to add message');
    });
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation messages in chronological order', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;

      const mockMessages = [
        {
          id: 'msg_3',
          data: () => ({
            role: 'user',
            content: 'Message 3',
            timestamp: { toDate: () => new Date('2025-11-17T12:02:00Z') }
          })
        },
        {
          id: 'msg_2',
          data: () => ({
            role: 'assistant',
            content: 'Message 2',
            timestamp: { toDate: () => new Date('2025-11-17T12:01:00Z') }
          })
        },
        {
          id: 'msg_1',
          data: () => ({
            role: 'user',
            content: 'Message 1',
            timestamp: { toDate: () => new Date('2025-11-17T12:00:00Z') }
          })
        }
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockMessages
      });

      const history = await conversationService.getConversationHistory('conv_123', 20);

      // Should be reversed to chronological order (oldest first)
      expect(history).toHaveLength(3);
      expect(history[0].content).toBe('Message 1');
      expect(history[1].content).toBe('Message 2');
      expect(history[2].content).toBe('Message 3');
    });

    it('should handle empty conversation', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({ docs: [] });

      const history = await conversationService.getConversationHistory('conv_123');

      expect(history).toEqual([]);
    });

    it('should limit number of messages retrieved', async () => {
      const mockQuery = require('firebase/firestore').query;
      const mockLimit = require('firebase/firestore').limit;

      await conversationService.getConversationHistory('conv_123', 10);

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should handle retrieval errors gracefully', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      mockGetDocs.mockRejectedValue(new Error('Firestore error'));

      const history = await conversationService.getConversationHistory('conv_123');

      expect(history).toEqual([]);
    });
  });

  describe('getUserConversations', () => {
    it('should retrieve user conversations sorted by update time', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;

      const mockConversations = [
        {
          id: 'conv_2',
          data: () => ({
            userId: 'user_123',
            title: 'Recent Conversation',
            messageCount: 5,
            totalTokens: 500,
            archived: false,
            createdAt: { toDate: () => new Date('2025-11-17T10:00:00Z') },
            updatedAt: { toDate: () => new Date('2025-11-17T11:00:00Z') }
          })
        },
        {
          id: 'conv_1',
          data: () => ({
            userId: 'user_123',
            title: 'Older Conversation',
            messageCount: 3,
            totalTokens: 300,
            archived: false,
            createdAt: { toDate: () => new Date('2025-11-16T10:00:00Z') },
            updatedAt: { toDate: () => new Date('2025-11-16T11:00:00Z') }
          })
        }
      ];

      mockGetDocs.mockResolvedValue({ docs: mockConversations });

      const conversations = await conversationService.getUserConversations('user_123');

      expect(conversations).toHaveLength(2);
      expect(conversations[0].id).toBe('conv_2');
      expect(conversations[1].id).toBe('conv_1');
    });

    it('should exclude archived conversations by default', async () => {
      const mockWhere = require('firebase/firestore').where;

      await conversationService.getUserConversations('user_123');

      expect(mockWhere).toHaveBeenCalledWith('archived', '==', false);
    });

    it('should handle no conversations', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({ docs: [] });

      const conversations = await conversationService.getUserConversations('user_123');

      expect(conversations).toEqual([]);
    });
  });

  describe('getOrCreateActiveConversation', () => {
    it('should return existing recent conversation', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;

      // Recent conversation (less than 1 hour old)
      const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: 'conv_existing',
          data: () => ({
            userId: 'user_123',
            title: 'Existing Conversation',
            updatedAt: { toDate: () => recentTime }
          })
        }]
      });

      const conversationId = await conversationService.getOrCreateActiveConversation('user_123');

      expect(conversationId).toBe('conv_existing');
    });

    it('should create new conversation if none exist', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      const mockAddDoc = require('firebase/firestore').addDoc;

      mockGetDocs.mockResolvedValue({ docs: [] });
      mockAddDoc.mockResolvedValue({ id: 'conv_new' });

      const conversationId = await conversationService.getOrCreateActiveConversation('user_123');

      expect(conversationId).toBe('conv_new');
      expect(mockAddDoc).toHaveBeenCalled();
    });

    it('should create new conversation if existing is too old', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      const mockAddDoc = require('firebase/firestore').addDoc;

      // Old conversation (more than 1 hour ago)
      const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: 'conv_old',
          data: () => ({
            userId: 'user_123',
            updatedAt: { toDate: () => oldTime }
          })
        }]
      });
      mockAddDoc.mockResolvedValue({ id: 'conv_new' });

      const conversationId = await conversationService.getOrCreateActiveConversation('user_123');

      expect(conversationId).toBe('conv_new');
    });
  });

  describe('formatMessagesForAI', () => {
    it('should format messages for AI context', () => {
      const messages: ConversationMessage[] = [
        {
          id: 'msg_1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        },
        {
          id: 'msg_2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date()
        }
      ];

      const formatted = conversationService.formatMessagesForAI(messages);

      expect(formatted).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]);
    });

    it('should limit messages to maxMessages parameter', () => {
      const messages: ConversationMessage[] = Array.from({ length: 20 }, (_, i) => ({
        id: `msg_${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date()
      }));

      const formatted = conversationService.formatMessagesForAI(messages, 5);

      expect(formatted).toHaveLength(5);
      // Should be the last 5 messages
      expect(formatted[0].content).toBe('Message 15');
      expect(formatted[4].content).toBe('Message 19');
    });
  });

  describe('archiveConversation', () => {
    it('should set archived flag to true', async () => {
      const mockRunTransaction = require('firebase/firestore').runTransaction;

      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          update: jest.fn()
        };
        await callback(mockTransaction);
        expect(mockTransaction.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            archived: true
          })
        );
      });

      await conversationService.archiveConversation('conv_123');
    });

    it('should handle archive errors', async () => {
      const mockRunTransaction = require('firebase/firestore').runTransaction;
      mockRunTransaction.mockRejectedValue(new Error('Firebase error'));

      await expect(
        conversationService.archiveConversation('conv_123')
      ).rejects.toThrow('Failed to archive conversation');
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation and all messages', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      const mockRunTransaction = require('firebase/firestore').runTransaction;

      // Mock messages to delete
      mockGetDocs.mockResolvedValue({
        docs: [
          { ref: 'msg_ref_1' },
          { ref: 'msg_ref_2' }
        ],
        size: 2
      });

      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          delete: jest.fn()
        };
        await callback(mockTransaction);
        // Should delete 2 messages + 1 conversation = 3 deletes
        expect(mockTransaction.delete).toHaveBeenCalledTimes(3);
      });

      await conversationService.deleteConversation('conv_123');
    });

    it('should handle deletion errors', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      mockGetDocs.mockRejectedValue(new Error('Firebase error'));

      await expect(
        conversationService.deleteConversation('conv_123')
      ).rejects.toThrow('Failed to delete conversation');
    });
  });

  describe('updateConversationTitle', () => {
    it('should update conversation title', async () => {
      const mockRunTransaction = require('firebase/firestore').runTransaction;

      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          update: jest.fn()
        };
        await callback(mockTransaction);
        expect(mockTransaction.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            title: 'New Title'
          })
        );
      });

      await conversationService.updateConversationTitle('conv_123', 'New Title');
    });

    it('should handle update errors', async () => {
      const mockRunTransaction = require('firebase/firestore').runTransaction;
      mockRunTransaction.mockRejectedValue(new Error('Firebase error'));

      await expect(
        conversationService.updateConversationTitle('conv_123', 'New Title')
      ).rejects.toThrow('Failed to update conversation title');
    });
  });

  describe('getConversation', () => {
    it('should retrieve conversation by ID', async () => {
      const mockGetDoc = require('firebase/firestore').getDoc;

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'conv_123',
        data: () => ({
          userId: 'user_123',
          title: 'Test Conversation',
          messageCount: 5,
          totalTokens: 500,
          createdAt: { toDate: () => new Date('2025-11-17T10:00:00Z') },
          updatedAt: { toDate: () => new Date('2025-11-17T11:00:00Z') },
          archived: false
        })
      });

      const conversation = await conversationService.getConversation('conv_123');

      expect(conversation).toBeTruthy();
      expect(conversation?.id).toBe('conv_123');
      expect(conversation?.title).toBe('Test Conversation');
      expect(conversation?.messageCount).toBe(5);
    });

    it('should return null if conversation not found', async () => {
      const mockGetDoc = require('firebase/firestore').getDoc;
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const conversation = await conversationService.getConversation('invalid_id');

      expect(conversation).toBeNull();
    });

    it('should handle retrieval errors', async () => {
      const mockGetDoc = require('firebase/firestore').getDoc;
      mockGetDoc.mockRejectedValue(new Error('Firebase error'));

      const conversation = await conversationService.getConversation('conv_123');

      expect(conversation).toBeNull();
    });
  });

  describe('buildConversationContext', () => {
    it('should build complete context with metadata', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;

      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'msg_1',
            data: () => ({
              role: 'user',
              content: 'Test',
              timestamp: { toDate: () => new Date() },
              tokenUsage: { prompt: 50, completion: 0, total: 50 },
              metadata: { latency: 100 }
            })
          },
          {
            id: 'msg_2',
            data: () => ({
              role: 'assistant',
              content: 'Response',
              timestamp: { toDate: () => new Date() },
              tokenUsage: { prompt: 0, completion: 100, total: 100 },
              metadata: { latency: 200 }
            })
          }
        ]
      });

      const context = await conversationService.buildConversationContext('conv_123');

      expect(context.messages).toHaveLength(2);
      expect(context.metadata?.totalMessages).toBe(2);
      expect(context.metadata?.totalTokens).toBe(150);
      expect(context.metadata?.averageLatency).toBe(150); // (100 + 200) / 2
    });

    it('should handle empty conversation', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({ docs: [] });

      const context = await conversationService.buildConversationContext('conv_123');

      expect(context.messages).toEqual([]);
      expect(context.metadata?.totalMessages).toBe(0);
      expect(context.metadata?.totalTokens).toBe(0);
    });
  });
});

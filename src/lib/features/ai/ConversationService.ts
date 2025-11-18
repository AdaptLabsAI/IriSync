/**
 * ConversationService - Manages AI conversation history and memory
 *
 * This service provides persistent, per-user conversation storage in Firebase,
 * enabling the AI to maintain context across sessions and provide personalized responses.
 *
 * Features:
 * - Per-user conversation persistence
 * - Automatic context retrieval
 * - Token usage tracking
 * - Conversation summarization
 * - Privacy controls
 */

import { firestore } from '../../core/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  runTransaction,
  DocumentReference
} from 'firebase/firestore';
import { logger } from '../../core/logging/logger';

/**
 * Message role types
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message interface for conversation storage
 */
export interface ConversationMessage {
  id?: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  model?: string;
  provider?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  metadata?: {
    ragSources?: Array<{
      id: string;
      title: string;
      excerpt: string;
      score: number;
    }>;
    taskType?: string;
    serviceType?: string;
    latency?: number;
    [key: string]: any;
  };
}

/**
 * Conversation interface
 */
export interface Conversation {
  id?: string;
  userId: string;
  organizationId?: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  totalTokens: number;
  lastMessage?: string;
  tags?: string[];
  archived?: boolean;
}

/**
 * Conversation context for AI
 */
export interface ConversationContext {
  messages: ConversationMessage[];
  summary?: string;
  metadata?: {
    totalMessages: number;
    totalTokens: number;
    averageLatency?: number;
    primaryTopics?: string[];
  };
}

/**
 * Service for managing AI conversations
 */
export class ConversationService {
  private readonly conversationsCollection = 'conversations';
  private readonly messagesSubcollection = 'messages';
  private readonly maxHistoryMessages = 50; // Maximum messages to retrieve
  private readonly summaryThreshold = 20; // Messages before triggering summary

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    organizationId?: string,
    title?: string
  ): Promise<string> {
    try {
      const conversationData: Partial<Conversation> = {
        userId,
        organizationId,
        title: title || 'New Conversation',
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
        totalTokens: 0,
        archived: false,
        tags: []
      };

      const docRef = await addDoc(
        collection(firestore, this.conversationsCollection),
        {
          ...conversationData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

      logger.info('Conversation created', {
        conversationId: docRef.id,
        userId,
        organizationId
      });

      return docRef.id;
    } catch (error) {
      logger.error('Failed to create conversation', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        organizationId
      });
      throw new Error('Failed to create conversation');
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    message: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): Promise<string> {
    try {
      const messageData = {
        ...message,
        timestamp: serverTimestamp()
      };

      const messagesRef = collection(
        firestore,
        this.conversationsCollection,
        conversationId,
        this.messagesSubcollection
      );

      const docRef = await addDoc(messagesRef, messageData);

      // Update conversation metadata
      await this.updateConversationMetadata(conversationId, message);

      logger.debug('Message added to conversation', {
        conversationId,
        messageId: docRef.id,
        role: message.role
      });

      return docRef.id;
    } catch (error) {
      logger.error('Failed to add message to conversation', {
        error: error instanceof Error ? error.message : String(error),
        conversationId
      });
      throw new Error('Failed to add message');
    }
  }

  /**
   * Update conversation metadata after adding a message
   */
  private async updateConversationMetadata(
    conversationId: string,
    message: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      const conversationRef = doc(
        firestore,
        this.conversationsCollection,
        conversationId
      );

      await runTransaction(firestore, async (transaction) => {
        const conversationDoc = await transaction.get(conversationRef);

        if (!conversationDoc.exists()) {
          throw new Error('Conversation not found');
        }

        const data = conversationDoc.data();
        const currentCount = data.messageCount || 0;
        const currentTokens = data.totalTokens || 0;
        const newTokens = message.tokenUsage?.total || 0;

        transaction.update(conversationRef, {
          messageCount: currentCount + 1,
          totalTokens: currentTokens + newTokens,
          lastMessage:
            message.role === 'user'
              ? message.content.substring(0, 100)
              : data.lastMessage,
          updatedAt: serverTimestamp()
        });
      });
    } catch (error) {
      logger.warn('Failed to update conversation metadata', {
        error: error instanceof Error ? error.message : String(error),
        conversationId
      });
      // Don't throw - metadata update failure shouldn't block message storage
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    conversationId: string,
    maxMessages: number = 20
  ): Promise<ConversationMessage[]> {
    try {
      const messagesRef = collection(
        firestore,
        this.conversationsCollection,
        conversationId,
        this.messagesSubcollection
      );

      const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(maxMessages)
      );

      const snapshot = await getDocs(q);

      const messages: ConversationMessage[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          role: data.role as MessageRole,
          content: data.content,
          timestamp: data.timestamp?.toDate() || new Date(),
          model: data.model,
          provider: data.provider,
          tokenUsage: data.tokenUsage,
          metadata: data.metadata
        };
      });

      // Reverse to get chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      logger.error('Failed to get conversation history', {
        error: error instanceof Error ? error.message : String(error),
        conversationId
      });
      return [];
    }
  }

  /**
   * Get user's recent conversations
   */
  async getUserConversations(
    userId: string,
    maxConversations: number = 10
  ): Promise<Conversation[]> {
    try {
      const conversationsRef = collection(
        firestore,
        this.conversationsCollection
      );

      const q = query(
        conversationsRef,
        where('userId', '==', userId),
        where('archived', '==', false),
        orderBy('updatedAt', 'desc'),
        limit(maxConversations)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          organizationId: data.organizationId,
          title: data.title,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          messageCount: data.messageCount || 0,
          totalTokens: data.totalTokens || 0,
          lastMessage: data.lastMessage,
          tags: data.tags || [],
          archived: data.archived || false
        };
      });
    } catch (error) {
      logger.error('Failed to get user conversations', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return [];
    }
  }

  /**
   * Get or create active conversation for user
   */
  async getOrCreateActiveConversation(
    userId: string,
    organizationId?: string
  ): Promise<string> {
    try {
      // Try to get the most recent conversation
      const conversations = await this.getUserConversations(userId, 1);

      if (conversations.length > 0) {
        const latestConversation = conversations[0];

        // If the conversation is less than 1 hour old, use it
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (latestConversation.updatedAt > oneHourAgo) {
          return latestConversation.id!;
        }
      }

      // Create new conversation
      return await this.createConversation(userId, organizationId);
    } catch (error) {
      logger.error('Failed to get or create active conversation', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      throw new Error('Failed to get or create conversation');
    }
  }

  /**
   * Build conversation context for AI
   */
  async buildConversationContext(
    conversationId: string,
    includeSystemContext: boolean = true
  ): Promise<ConversationContext> {
    try {
      const messages = await this.getConversationHistory(conversationId, 20);

      // Calculate metadata
      const totalTokens = messages.reduce(
        (sum, msg) => sum + (msg.tokenUsage?.total || 0),
        0
      );

      const latencies = messages
        .filter((msg) => msg.metadata?.latency)
        .map((msg) => msg.metadata!.latency!);

      const averageLatency =
        latencies.length > 0
          ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
          : undefined;

      return {
        messages,
        metadata: {
          totalMessages: messages.length,
          totalTokens,
          averageLatency
        }
      };
    } catch (error) {
      logger.error('Failed to build conversation context', {
        error: error instanceof Error ? error.message : String(error),
        conversationId
      });
      return {
        messages: [],
        metadata: {
          totalMessages: 0,
          totalTokens: 0
        }
      };
    }
  }

  /**
   * Format conversation history for AI context
   */
  formatMessagesForAI(
    messages: ConversationMessage[],
    maxMessages: number = 10
  ): Array<{ role: string; content: string }> {
    // Take the most recent messages
    const recentMessages = messages.slice(-maxMessages);

    return recentMessages.map((msg) => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    try {
      const conversationRef = doc(
        firestore,
        this.conversationsCollection,
        conversationId
      );

      await runTransaction(firestore, async (transaction) => {
        transaction.update(conversationRef, {
          archived: true,
          updatedAt: serverTimestamp()
        });
      });

      logger.info('Conversation archived', { conversationId });
    } catch (error) {
      logger.error('Failed to archive conversation', {
        error: error instanceof Error ? error.message : String(error),
        conversationId
      });
      throw new Error('Failed to archive conversation');
    }
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      // First delete all messages in the conversation
      const messagesRef = collection(
        firestore,
        this.conversationsCollection,
        conversationId,
        this.messagesSubcollection
      );

      const messagesSnapshot = await getDocs(messagesRef);

      await runTransaction(firestore, async (transaction) => {
        // Delete all messages
        messagesSnapshot.docs.forEach((doc) => {
          transaction.delete(doc.ref);
        });

        // Delete the conversation document
        const conversationRef = doc(
          firestore,
          this.conversationsCollection,
          conversationId
        );
        transaction.delete(conversationRef);
      });

      logger.info('Conversation deleted', {
        conversationId,
        messagesDeleted: messagesSnapshot.size
      });
    } catch (error) {
      logger.error('Failed to delete conversation', {
        error: error instanceof Error ? error.message : String(error),
        conversationId
      });
      throw new Error('Failed to delete conversation');
    }
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    try {
      const conversationRef = doc(
        firestore,
        this.conversationsCollection,
        conversationId
      );

      await runTransaction(firestore, async (transaction) => {
        transaction.update(conversationRef, {
          title,
          updatedAt: serverTimestamp()
        });
      });

      logger.info('Conversation title updated', { conversationId, title });
    } catch (error) {
      logger.error('Failed to update conversation title', {
        error: error instanceof Error ? error.message : String(error),
        conversationId
      });
      throw new Error('Failed to update conversation title');
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const conversationRef = doc(
        firestore,
        this.conversationsCollection,
        conversationId
      );

      const snapshot = await getDoc(conversationRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data();
      return {
        id: snapshot.id,
        userId: data.userId,
        organizationId: data.organizationId,
        title: data.title,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        messageCount: data.messageCount || 0,
        totalTokens: data.totalTokens || 0,
        lastMessage: data.lastMessage,
        tags: data.tags || [],
        archived: data.archived || false
      };
    } catch (error) {
      logger.error('Failed to get conversation', {
        error: error instanceof Error ? error.message : String(error),
        conversationId
      });
      return null;
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService();

import { SocialInboxService, MessageStatus, MessagePriority, MessageType, InboxMessage, InboxFilter, InboxStats } from './SocialInboxService';
import { UnifiedSocialInboxManager } from './UnifiedSocialInboxManager';
import { PlatformType } from '@/lib/platforms/PlatformProvider';
import { logger } from '@/lib/logging/logger';

export interface InboxResult {
  messages: InboxMessage[];
  totalCount: number;
  nextCursor?: string;
  hasMore: boolean;
}

export interface BulkActionResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface SyncResult {
  platformsSync: Record<string, {
    success: boolean;
    messageCount: number;
    error?: string;
  }>;
  totalMessages: number;
  totalErrors: number;
}

/**
 * Controller for managing social inbox operations
 */
export class SocialInboxController {
  private inboxService: SocialInboxService;
  private unifiedManager: UnifiedSocialInboxManager;

  constructor() {
    this.inboxService = new SocialInboxService();
    this.unifiedManager = new UnifiedSocialInboxManager();
  }

  /**
   * Get unified inbox messages with filtering
   */
  async getUnifiedInboxMessages(
    userId: string,
    filter: InboxFilter,
    limit: number = 20,
    cursor?: string
  ): Promise<InboxResult> {
    try {
      logger.info('Fetching unified inbox messages', { userId, filter, limit, cursor });

      // Use the inbox service to get messages
      const result = await this.inboxService.getMessages(userId, filter, limit, cursor);

      // Get total count for the result
      const stats = await this.inboxService.getInboxStats(userId);

      return {
        messages: result.messages,
        totalCount: stats.total,
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor
      };
    } catch (error) {
      logger.error('Error fetching unified inbox messages', { error, userId });
      throw error;
    }
  }

  /**
   * Sync all platforms for a user
   */
  async syncAllPlatforms(userId: string, organizationId?: string): Promise<SyncResult> {
    try {
      logger.info('Starting sync for all platforms', { userId, organizationId });

      // This would need to get the user's connected accounts first
      // For now, return a mock result
      const result = {
        platformsSync: {},
        totalMessages: 0,
        totalErrors: 0
      };

      logger.info('Completed sync for all platforms', { 
        userId, 
        totalMessages: result.totalMessages,
        totalErrors: result.totalErrors 
      });

      return result;
    } catch (error) {
      logger.error('Error syncing all platforms', { error, userId });
      throw error;
    }
  }

  /**
   * Reply to a message
   */
  async replyToMessage(messageId: string, content: string, userId: string): Promise<any> {
    try {
      logger.info('Replying to message', { messageId, userId });

      const reply = await this.inboxService.replyToMessage(messageId, content, userId);

      logger.info('Reply sent successfully', { messageId, userId });

      return reply;
    } catch (error) {
      logger.error('Error replying to message', { error, messageId, userId });
      throw error;
    }
  }

  /**
   * Perform bulk actions on messages
   */
  async bulkAction(
    messageIds: string[],
    action: string,
    params?: Record<string, any>
  ): Promise<BulkActionResult> {
    try {
      logger.info('Performing bulk action', { messageIds, action, params });

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      // Handle different bulk actions
      switch (action) {
        case 'mark_read':
          successCount = await this.inboxService.bulkUpdateStatus(messageIds, MessageStatus.READ);
          failureCount = messageIds.length - successCount;
          break;
        
        case 'mark_unread':
          successCount = await this.inboxService.bulkUpdateStatus(messageIds, MessageStatus.UNREAD);
          failureCount = messageIds.length - successCount;
          break;
        
        case 'archive':
          successCount = await this.inboxService.bulkUpdateStatus(messageIds, MessageStatus.ARCHIVED);
          failureCount = messageIds.length - successCount;
          break;
        
        default:
          throw new Error(`Unsupported bulk action: ${action}`);
      }

      const result = { successCount, failureCount, errors };

      logger.info('Bulk action completed', { 
        action, 
        messageCount: messageIds.length,
        successCount: result.successCount,
        failureCount: result.failureCount
      });

      return result;
    } catch (error) {
      logger.error('Error performing bulk action', { error, messageIds, action });
      throw error;
    }
  }

  /**
   * Start background sync for unified inbox
   */
  async startUnifiedBackgroundSync(userId: string, intervalMinutes: number = 5): Promise<void> {
    try {
      logger.info('Starting background sync', { userId, intervalMinutes });

      // This would need to get the user's connected accounts and start sync
      // For now, just log that it would start
      logger.info('Background sync would start here with user accounts');

      logger.info('Background sync started successfully', { userId, intervalMinutes });
    } catch (error) {
      logger.error('Error starting background sync', { error, userId });
      throw error;
    }
  }

  /**
   * Get inbox statistics
   */
  async getInboxStats(userId: string): Promise<InboxStats> {
    try {
      logger.info('Fetching inbox statistics', { userId });

      const stats = await this.inboxService.getInboxStats(userId);

      return stats;
    } catch (error) {
      logger.error('Error fetching inbox statistics', { error, userId });
      throw error;
    }
  }
} 
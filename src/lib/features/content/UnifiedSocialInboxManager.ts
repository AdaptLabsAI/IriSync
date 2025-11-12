import { SocialInboxService, InboxMessage, MessageType, MessageStatus, MessagePriority } from './SocialInboxService';
import { PlatformType } from '../platforms/PlatformProvider';
import { logger } from '../logging/logger';

// Import all social inbox adapters
import { TwitterSocialInboxAdapter } from './TwitterSocialInboxAdapter';
import { LinkedInSocialInboxAdapter } from './LinkedInSocialInboxAdapter';
import { TikTokSocialInboxAdapter } from './TikTokSocialInboxAdapter';
import { YouTubeSocialInboxAdapter } from './YouTubeSocialInboxAdapter';
import { RedditSocialInboxAdapter } from './RedditSocialInboxAdapter';
import { MastodonSocialInboxAdapter, createMastodonSocialInboxAdapter } from './MastodonSocialInboxAdapter';

// Import providers
import { TwitterProvider } from '../platforms/providers/TwitterProvider';
import { LinkedInProvider } from '../platforms/providers/LinkedInProvider';
import { TikTokProvider } from '../platforms/providers/TikTokProvider';
import { YouTubeProvider } from '../platforms/providers/YouTubeProvider';
import { RedditProvider } from '../platforms/providers/RedditProvider';
import { MastodonProvider } from '../platforms/providers/MastodonProvider';

export interface SocialAccount {
  userId: string;
  accountId: string;
  organizationId?: string;
  platformType: PlatformType;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  additionalData?: any;
  isActive: boolean;
}

export interface SyncConfiguration {
  intervalMinutes: number;
  enabledPlatforms: PlatformType[];
  syncTypes: {
    comments: boolean;
    mentions: boolean;
    directMessages: boolean;
    notifications: boolean;
  };
}

/**
 * Unified Social Inbox Manager
 * Coordinates all platform-specific social inbox adapters
 * Provides a single interface for managing social inbox operations
 */
export class UnifiedSocialInboxManager {
  private socialInboxService: SocialInboxService;
  private adapters: Map<PlatformType, any> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.socialInboxService = new SocialInboxService();
  }

  /**
   * Initialize the manager with connected accounts
   */
  async initialize(accounts: SocialAccount[]): Promise<void> {
    try {
      logger.info('Initializing Unified Social Inbox Manager', {
        accountCount: accounts.length,
        platforms: Array.from(new Set(accounts.map(acc => acc.platformType)))
      });

      // Initialize adapters for each platform
      for (const account of accounts) {
        if (!account.isActive) {
          continue;
        }

        await this.initializeAdapter(account);
      }

      this.isInitialized = true;
      logger.info('Unified Social Inbox Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Unified Social Inbox Manager', { error });
      throw error;
    }
  }

  /**
   * Start background sync for all connected accounts
   */
  async startBackgroundSync(
    accounts: SocialAccount[],
    config: SyncConfiguration = {
      intervalMinutes: 15,
      enabledPlatforms: Object.values(PlatformType),
      syncTypes: {
        comments: true,
        mentions: true,
        directMessages: true,
        notifications: true
      }
    }
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Manager not initialized. Call initialize() first.');
    }

    logger.info('Starting background sync for all platforms', {
      accountCount: accounts.length,
      config
    });

    // Group accounts by platform
    const accountsByPlatform = new Map<PlatformType, SocialAccount[]>();
    
    for (const account of accounts) {
      if (!account.isActive || !config.enabledPlatforms.includes(account.platformType)) {
        continue;
      }

      if (!accountsByPlatform.has(account.platformType)) {
        accountsByPlatform.set(account.platformType, []);
      }
      accountsByPlatform.get(account.platformType)!.push(account);
    }

    // Start sync for each platform
    for (const [platformType, platformAccounts] of Array.from(accountsByPlatform.entries())) {
      await this.startPlatformSync(platformType, platformAccounts, config);
    }
  }

  /**
   * Sync all platforms manually (one-time sync)
   */
  async syncAllPlatforms(accounts: SocialAccount[]): Promise<{
    totalMessages: number;
    messagesByPlatform: Record<PlatformType, number>;
    errors: Array<{ platform: PlatformType; error: string }>;
  }> {
    if (!this.isInitialized) {
      throw new Error('Manager not initialized. Call initialize() first.');
    }

    const results = {
      totalMessages: 0,
      messagesByPlatform: {} as Record<PlatformType, number>,
      errors: [] as Array<{ platform: PlatformType; error: string }>
    };

    logger.info('Starting manual sync for all platforms', {
      accountCount: accounts.length
    });

    // Sync each platform
    for (const account of accounts) {
      if (!account.isActive) {
        continue;
      }

      try {
        const messages = await this.syncPlatformAccount(account);
        results.totalMessages += messages.length;
        results.messagesByPlatform[account.platformType] = 
          (results.messagesByPlatform[account.platformType] || 0) + messages.length;

        logger.info('Platform sync completed', {
          platform: account.platformType,
          accountId: account.accountId,
          messageCount: messages.length
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push({
          platform: account.platformType,
          error: errorMessage
        });

        logger.error('Platform sync failed', {
          platform: account.platformType,
          accountId: account.accountId,
          error: errorMessage
        });
      }
    }

    logger.info('Manual sync completed', results);
    return results;
  }

  /**
   * Stop all background sync processes
   */
  stopBackgroundSync(): void {
    logger.info('Stopping all background sync processes');

    for (const [key, interval] of Array.from(this.syncIntervals.entries())) {
      clearInterval(interval);
      this.syncIntervals.delete(key);
    }

    logger.info('All background sync processes stopped');
  }

  /**
   * Process webhook event from any platform
   */
  async processWebhookEvent(
    platformType: PlatformType,
    event: any,
    accountId: string,
    userId: string,
    organizationId?: string
  ): Promise<InboxMessage | null> {
    try {
      const adapter = this.adapters.get(platformType);
      if (!adapter || !adapter.processWebhookEvent) {
        logger.warn('No adapter or webhook handler found for platform', { platformType });
        return null;
      }

      const message = await adapter.processWebhookEvent(event, accountId, userId, organizationId);
      
      if (message) {
        logger.info('Webhook event processed successfully', {
          platformType,
          messageId: message.id,
          messageType: message.type
        });
      }

      return message;
    } catch (error) {
      logger.error('Failed to process webhook event', {
        platformType,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Get inbox statistics across all platforms
   */
  async getUnifiedInboxStats(userId: string): Promise<{
    total: number;
    unread: number;
    byPlatform: Record<PlatformType, number>;
    byType: Record<MessageType, number>;
    byPriority: Record<MessagePriority, number>;
  }> {
    return await this.socialInboxService.getInboxStats(userId);
  }

  /**
   * Reply to a message using the appropriate platform adapter
   */
  async replyToMessage(
    messageId: string,
    content: string,
    userId: string
  ): Promise<InboxMessage> {
    return await this.socialInboxService.replyToMessage(messageId, content, userId);
  }

  // Private helper methods

  private async initializeAdapter(account: SocialAccount): Promise<void> {
    try {
      switch (account.platformType) {
        case PlatformType.TWITTER:
          await this.initializeTwitterAdapter(account);
          break;
        case PlatformType.LINKEDIN:
          await this.initializeLinkedInAdapter(account);
          break;
        case PlatformType.TIKTOK:
          await this.initializeTikTokAdapter(account);
          break;
        case PlatformType.YOUTUBE:
          await this.initializeYouTubeAdapter(account);
          break;
        case PlatformType.REDDIT:
          await this.initializeRedditAdapter(account);
          break;
        case PlatformType.MASTODON:
          await this.initializeMastodonAdapter(account);
          break;
        default:
          logger.warn('Unsupported platform type for social inbox', { 
            platformType: account.platformType 
          });
      }
    } catch (error) {
      logger.error('Failed to initialize adapter', {
        platformType: account.platformType,
        accountId: account.accountId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async initializeTwitterAdapter(account: SocialAccount): Promise<void> {
    const provider = new TwitterProvider(
      {
        clientId: process.env.TWITTER_API_KEY || '',
        clientSecret: process.env.TWITTER_API_SECRET || '',
        redirectUri: process.env.TWITTER_CALLBACK_URL || '',
        additionalParams: {
          apiKey: process.env.TWITTER_API_KEY,
          apiSecret: process.env.TWITTER_API_SECRET,
          bearerToken: process.env.TWITTER_BEARER_TOKEN,
          tier: process.env.TWITTER_API_TIER || 'free'
        }
      },
      {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
        additionalData: account.additionalData
      }
    );

    const adapter = new TwitterSocialInboxAdapter(provider);
    this.adapters.set(PlatformType.TWITTER, adapter);
  }

  private async initializeLinkedInAdapter(account: SocialAccount): Promise<void> {
    const provider = new LinkedInProvider(
      {
        clientId: process.env.LINKEDIN_CORE_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CORE_CLIENT_SECRET || '',
        redirectUri: process.env.LINKEDIN_CORE_CALLBACK_URL || '',
        additionalParams: {
          restApiUrl: process.env.LINKEDIN_REST_API_URL,
          useModernRestApi: true
        }
      },
      {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
        additionalData: account.additionalData
      }
    );

    const adapter = new LinkedInSocialInboxAdapter(provider);
    this.adapters.set(PlatformType.LINKEDIN, adapter);
  }

  private async initializeTikTokAdapter(account: SocialAccount): Promise<void> {
    const provider = new TikTokProvider(
      {
        clientId: process.env.TIKTOK_CLIENT_KEY || '',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
        redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=tiktok' || ''
      },
      {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
        additionalData: account.additionalData
      }
    );

    const adapter = new TikTokSocialInboxAdapter(provider);
    this.adapters.set(PlatformType.TIKTOK, adapter);
  }

  private async initializeYouTubeAdapter(account: SocialAccount): Promise<void> {
    const provider = new YouTubeProvider(
      {
        clientId: process.env.YOUTUBE_CLIENT_ID || '',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
        redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=youtube' || ''
      },
      {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
        additionalData: account.additionalData
      }
    );

    const adapter = new YouTubeSocialInboxAdapter(provider);
    this.adapters.set(PlatformType.YOUTUBE, adapter);
  }

  private async initializeRedditAdapter(account: SocialAccount): Promise<void> {
    const provider = new RedditProvider(
      {
        clientId: process.env.REDDIT_CLIENT_ID || '',
        clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
        redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=reddit' || ''
      },
      {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
        additionalData: account.additionalData
      }
    );

    const adapter = new RedditSocialInboxAdapter(provider);
    this.adapters.set(PlatformType.REDDIT, adapter);
  }

  private async initializeMastodonAdapter(account: SocialAccount): Promise<void> {
    const serverInstance = account.additionalData?.serverInstance || 'mastodon.social';
    
    const provider = new MastodonProvider(
      {
        clientId: process.env.MASTODON_CLIENT_ID || '',
        clientSecret: process.env.MASTODON_CLIENT_SECRET || '',
        redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=mastodon' || '',
        additionalParams: {
          serverInstance
        }
      },
      {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
        additionalData: account.additionalData
      }
    );

    const adapter = new MastodonSocialInboxAdapter(provider, serverInstance);
    this.adapters.set(PlatformType.MASTODON, adapter);
  }

  private async startPlatformSync(
    platformType: PlatformType,
    accounts: SocialAccount[],
    config: SyncConfiguration
  ): Promise<void> {
    const adapter = this.adapters.get(platformType);
    if (!adapter || !adapter.startBackgroundSync) {
      logger.warn('No adapter or background sync method found for platform', { platformType });
      return;
    }

    const syncKey = `${platformType}_sync`;
    
    // Stop existing sync if running
    if (this.syncIntervals.has(syncKey)) {
      clearInterval(this.syncIntervals.get(syncKey)!);
    }

    // Start new sync
    try {
      await adapter.startBackgroundSync(accounts, config.intervalMinutes);
      
      logger.info('Background sync started for platform', {
        platformType,
        accountCount: accounts.length,
        intervalMinutes: config.intervalMinutes
      });
    } catch (error) {
      logger.error('Failed to start background sync for platform', {
        platformType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async syncPlatformAccount(account: SocialAccount): Promise<InboxMessage[]> {
    const adapter = this.adapters.get(account.platformType);
    if (!adapter) {
      throw new Error(`No adapter found for platform ${account.platformType}`);
    }

    const messages: InboxMessage[] = [];

    // Sync different types of content based on platform capabilities
    try {
      // Sync comments/mentions
      if (adapter.syncCommentsToInbox) {
        const commentMessages = await adapter.syncCommentsToInbox(
          account.userId,
          account.accountId,
          account.organizationId
        );
        messages.push(...commentMessages);
      }

      // Sync notifications (for platforms that support it)
      if (adapter.syncNotificationsToInbox) {
        const notificationMessages = await adapter.syncNotificationsToInbox(
          account.userId,
          account.accountId,
          account.organizationId
        );
        messages.push(...notificationMessages);
      }

      // Sync direct messages/conversations
      if (adapter.syncConversationsToInbox) {
        const conversationMessages = await adapter.syncConversationsToInbox(
          account.userId,
          account.accountId,
          account.organizationId
        );
        messages.push(...conversationMessages);
      }

      // Platform-specific sync methods
      if (adapter.syncPrivateMessagesToInbox) {
        const privateMessages = await adapter.syncPrivateMessagesToInbox(
          account.userId,
          account.accountId,
          account.organizationId
        );
        messages.push(...privateMessages);
      }

      if (adapter.syncMentionsToInbox) {
        const mentionMessages = await adapter.syncMentionsToInbox(
          account.userId,
          account.accountId,
          account.organizationId
        );
        messages.push(...mentionMessages);
      }

    } catch (error) {
      logger.error('Error during platform account sync', {
        platformType: account.platformType,
        accountId: account.accountId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    return messages;
  }
}

// Create singleton instance
const unifiedSocialInboxManager = new UnifiedSocialInboxManager();

export default unifiedSocialInboxManager; 
// RealTimeUpdater - Real-time dashboard updates service
// Production-ready real-time updates following existing codebase patterns

import { logger } from '@/lib/core/logging/logger';
import {
  RealTimeConfig,
  RealTimeUpdateEvent,
  DashboardErrorClass,
  DashboardErrorType
} from '../types';

/**
 * Subscription interface
 */
interface Subscription {
  id: string;
  userId: string;
  dashboardId: string;
  callback: (data: any) => void;
  channels: string[];
  createdAt: Date;
  lastUpdate: Date;
}

/**
 * RealTimeUpdater - Manages real-time dashboard updates
 */
export class RealTimeUpdater {
  private subscriptions: Map<string, Subscription>;
  private config: RealTimeConfig;
  private updateInterval: NodeJS.Timeout | null;
  private connectionCount: number;

  constructor(config?: Partial<RealTimeConfig>) {
    this.subscriptions = new Map();
    this.connectionCount = 0;
    this.updateInterval = null;
    
    this.config = {
      enabled: true,
      updateInterval: 30, // 30 seconds default
      maxConnections: 1000,
      channels: ['dashboard', 'widgets', 'metrics'],
      fallbackToPolling: true,
      ...config
    };

    if (this.config.enabled) {
      this.startUpdateInterval();
    }
  }

  /**
   * Subscribe to real-time updates
   */
  async subscribe(
    userId: string,
    dashboardId: string,
    callback: (data: any) => void,
    channels?: string[]
  ): Promise<() => void> {
    try {
      if (!this.config.enabled) {
        logger.warn('Real-time updates are disabled');
        return () => {};
      }

      if (this.connectionCount >= this.config.maxConnections) {
        throw new DashboardErrorClass(
          DashboardErrorType.REAL_TIME_ERROR,
          'Maximum connections exceeded',
          undefined,
          undefined,
          new Date(),
          { userId, dashboardId, maxConnections: this.config.maxConnections }
        );
      }

      const subscriptionId = this.generateSubscriptionId(userId, dashboardId);
      const subscriptionChannels = channels || this.config.channels;

      const subscription: Subscription = {
        id: subscriptionId,
        userId,
        dashboardId,
        callback,
        channels: subscriptionChannels,
        createdAt: new Date(),
        lastUpdate: new Date()
      };

      this.subscriptions.set(subscriptionId, subscription);
      this.connectionCount++;

      logger.info('Real-time subscription created', {
        subscriptionId,
        userId,
        dashboardId,
        channels: subscriptionChannels,
        totalConnections: this.connectionCount
      });

      // Return unsubscribe function
      return () => this.unsubscribe(subscriptionId);
    } catch (error) {
      logger.error('Error creating real-time subscription', { userId, dashboardId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.REAL_TIME_ERROR,
        'Failed to create real-time subscription',
        undefined,
        undefined,
        new Date(),
        { userId, dashboardId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      
      if (subscription) {
        this.subscriptions.delete(subscriptionId);
        this.connectionCount--;

        logger.info('Real-time subscription removed', {
          subscriptionId,
          userId: subscription.userId,
          dashboardId: subscription.dashboardId,
          totalConnections: this.connectionCount
        });
      }
    } catch (error) {
      logger.error('Error removing real-time subscription', { subscriptionId, error });
    }
  }

  /**
   * Broadcast update to subscribers
   */
  async broadcast(
    userId: string,
    dashboardId: string,
    data: any,
    channel: string = 'dashboard'
  ): Promise<void> {
    try {
      if (!this.config.enabled) {
        return;
      }

      const event: RealTimeUpdateEvent = {
        type: 'dashboard_update',
        dashboardId,
        data,
        timestamp: new Date(),
        userId
      };

      let broadcastCount = 0;

      // Find matching subscriptions
      for (const [subscriptionId, subscription] of Array.from(this.subscriptions.entries())) {
        if (
          subscription.userId === userId &&
          subscription.dashboardId === dashboardId &&
          subscription.channels.includes(channel)
        ) {
          try {
            subscription.callback(event);
            subscription.lastUpdate = new Date();
            broadcastCount++;
          } catch (error) {
            logger.error('Error calling subscription callback', {
              subscriptionId,
              userId,
              dashboardId,
              error
            });
            // Remove broken subscription
            this.subscriptions.delete(subscriptionId);
            this.connectionCount--;
          }
        }
      }

      logger.debug('Real-time update broadcasted', {
        userId,
        dashboardId,
        channel,
        subscribers: broadcastCount
      });
    } catch (error) {
      logger.error('Error broadcasting real-time update', { userId, dashboardId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.REAL_TIME_ERROR,
        'Failed to broadcast real-time update',
        undefined,
        undefined,
        new Date(),
        { userId, dashboardId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Broadcast widget update
   */
  async broadcastWidgetUpdate(
    userId: string,
    dashboardId: string,
    widgetId: string,
    data: any
  ): Promise<void> {
    try {
      const event: RealTimeUpdateEvent = {
        type: 'widget_update',
        widgetId,
        dashboardId,
        data,
        timestamp: new Date(),
        userId
      };

      await this.broadcast(userId, dashboardId, event, 'widgets');
    } catch (error) {
      logger.error('Error broadcasting widget update', { userId, dashboardId, widgetId, error });
    }
  }

  /**
   * Broadcast metric update
   */
  async broadcastMetricUpdate(
    userId: string,
    dashboardId: string,
    metricData: any
  ): Promise<void> {
    try {
      const event: RealTimeUpdateEvent = {
        type: 'metric_update',
        dashboardId,
        data: metricData,
        timestamp: new Date(),
        userId
      };

      await this.broadcast(userId, dashboardId, event, 'metrics');
    } catch (error) {
      logger.error('Error broadcasting metric update', { userId, dashboardId, error });
    }
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    totalSubscriptions: number;
    connectionCount: number;
    subscriptionsByUser: Record<string, number>;
    subscriptionsByDashboard: Record<string, number>;
    averageUpdateFrequency: number;
  } {
    const subscriptionsByUser: Record<string, number> = {};
    const subscriptionsByDashboard: Record<string, number> = {};

    for (const subscription of Array.from(this.subscriptions.values())) {
      subscriptionsByUser[subscription.userId] = (subscriptionsByUser[subscription.userId] || 0) + 1;
      subscriptionsByDashboard[subscription.dashboardId] = (subscriptionsByDashboard[subscription.dashboardId] || 0) + 1;
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      connectionCount: this.connectionCount,
      subscriptionsByUser,
      subscriptionsByDashboard,
      averageUpdateFrequency: this.config.updateInterval
    };
  }

  /**
   * Check subscription health and cleanup stale connections
   */
  async healthCheck(): Promise<void> {
    try {
      const now = new Date();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes
      const staleSubscriptions: string[] = [];

      for (const [subscriptionId, subscription] of Array.from(this.subscriptions.entries())) {
        const timeSinceLastUpdate = now.getTime() - subscription.lastUpdate.getTime();
        
        if (timeSinceLastUpdate > staleThreshold) {
          staleSubscriptions.push(subscriptionId);
        }
      }

      // Remove stale subscriptions
      for (const subscriptionId of staleSubscriptions) {
        await this.unsubscribe(subscriptionId);
      }

      if (staleSubscriptions.length > 0) {
        logger.info('Cleaned up stale subscriptions', {
          removed: staleSubscriptions.length,
          remaining: this.subscriptions.size
        });
      }
    } catch (error) {
      logger.error('Error during subscription health check', { error });
    }
  }

  /**
   * Send heartbeat to all subscribers
   */
  async sendHeartbeat(): Promise<void> {
    try {
      const heartbeatData = {
        type: 'heartbeat',
        timestamp: new Date(),
        serverTime: Date.now()
      };

      let heartbeatsSent = 0;

      for (const subscription of Array.from(this.subscriptions.values())) {
        try {
          subscription.callback(heartbeatData);
          heartbeatsSent++;
        } catch (error) {
          logger.error('Error sending heartbeat', {
            subscriptionId: subscription.id,
            error
          });
        }
      }

      logger.debug('Heartbeats sent', { count: heartbeatsSent });
    } catch (error) {
      logger.error('Error sending heartbeats', { error });
    }
  }

  /**
   * Get active subscriptions for a user
   */
  getUserSubscriptions(userId: string): Subscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId);
  }

  /**
   * Get active subscriptions for a dashboard
   */
  getDashboardSubscriptions(dashboardId: string): Subscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.dashboardId === dashboardId);
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(userId: string, dashboardId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${userId}-${dashboardId}-${timestamp}-${random}`;
  }

  /**
   * Start update interval for polling fallback
   */
  private startUpdateInterval(): void {
    if (this.config.fallbackToPolling) {
      this.updateInterval = setInterval(() => {
        this.performPollingUpdate();
      }, this.config.updateInterval * 1000);

      logger.info('Real-time update interval started', {
        interval: this.config.updateInterval
      });
    }
  }

  /**
   * Perform polling update for fallback
   */
  private async performPollingUpdate(): Promise<void> {
    try {
      // Health check
      await this.healthCheck();

      // Send heartbeat every few intervals
      if (Date.now() % (this.config.updateInterval * 5 * 1000) < this.config.updateInterval * 1000) {
        await this.sendHeartbeat();
      }
    } catch (error) {
      logger.error('Error during polling update', { error });
    }
  }

  /**
   * Destroy real-time updater and cleanup
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Notify all subscribers of shutdown
    for (const subscription of Array.from(this.subscriptions.values())) {
      try {
        subscription.callback({
          type: 'shutdown',
          message: 'Real-time service is shutting down',
          timestamp: new Date()
        });
      } catch (error) {
        // Ignore callback errors during shutdown
      }
    }

    this.subscriptions.clear();
    this.connectionCount = 0;

    logger.info('Real-time updater destroyed');
  }
} 
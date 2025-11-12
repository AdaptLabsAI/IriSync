// DataAggregator - Data aggregation service for dashboard metrics
// Production-ready data aggregation following existing codebase patterns

import { logger } from '@/lib/logging/logger';
import { firestore } from '@/lib/firebase/client';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';

import {
  Platform,
  PlatformMetrics,
  DashboardErrorClass,
  DashboardErrorType
} from '../types';

import { CRMService } from '../../crm/CRMService';
import type { CRMConnection } from '../../crm/models/CRMConnection';

/**
 * DataAggregator - Aggregates data from multiple sources for dashboard metrics
 */
export class DataAggregator {
  private crmService: CRMService;

  constructor() {
    this.crmService = CRMService.getInstance();
  }

  /**
   * Aggregate platform metrics from all connected sources
   */
  async aggregatePlatformMetrics(
    userId: string,
    platforms?: Platform[],
    crmConnections?: CRMConnection[]
  ): Promise<PlatformMetrics[]> {
    try {
      logger.info('Aggregating platform metrics', { userId, platforms });

      const platformMetrics: PlatformMetrics[] = [];

      // Get social platform metrics
      const socialMetrics = await this.getSocialPlatformMetrics(userId, platforms);
      platformMetrics.push(...socialMetrics);

      // Get CRM platform metrics if connections provided
      if (crmConnections && crmConnections.length > 0) {
        const crmMetrics = await this.getCRMPlatformMetrics(userId, crmConnections, platforms);
        platformMetrics.push(...crmMetrics);
      }

      logger.info('Successfully aggregated platform metrics', { 
        userId, 
        platformCount: platformMetrics.length 
      });

      return platformMetrics;
    } catch (error) {
      logger.error('Error aggregating platform metrics', { userId, platforms, error });
      throw new DashboardErrorClass(
        DashboardErrorType.DATA_AGGREGATION_ERROR,
        'Failed to aggregate platform metrics',
        undefined,
        undefined,
        new Date(),
        { userId, platforms },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Get social platform metrics
   */
  private async getSocialPlatformMetrics(
    userId: string,
    platforms?: Platform[]
  ): Promise<PlatformMetrics[]> {
    try {
      const socialPlatforms = platforms?.filter(p => 
        [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.TWITTER, Platform.LINKEDIN, Platform.TIKTOK, Platform.YOUTUBE].includes(p)
      ) || [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.TWITTER, Platform.LINKEDIN, Platform.TIKTOK, Platform.YOUTUBE];

      const platformMetrics: PlatformMetrics[] = [];

      for (const platform of socialPlatforms) {
        try {
          const metrics = await this.getSocialPlatformData(userId, platform);
          if (metrics) {
            platformMetrics.push(metrics);
          }
        } catch (error) {
          logger.error('Error getting social platform metrics', { userId, platform, error });
          // Continue with other platforms
        }
      }

      return platformMetrics;
    } catch (error) {
      logger.error('Error getting social platform metrics', { userId, error });
      return [];
    }
  }

  /**
   * Get CRM platform metrics
   */
  private async getCRMPlatformMetrics(
    userId: string,
    crmConnections: CRMConnection[],
    platforms?: Platform[]
  ): Promise<PlatformMetrics[]> {
    try {
      const crmPlatforms = platforms?.filter(p => 
        [Platform.HUBSPOT, Platform.SALESFORCE, Platform.ZOHO, Platform.PIPEDRIVE, Platform.DYNAMICS, Platform.SUGARCRM].includes(p)
      ) || [Platform.HUBSPOT, Platform.SALESFORCE, Platform.ZOHO, Platform.PIPEDRIVE, Platform.DYNAMICS, Platform.SUGARCRM];

      const platformMetrics: PlatformMetrics[] = [];

      for (const connection of crmConnections) {
        if (crmPlatforms.includes(connection.platform as unknown as Platform)) {
          try {
            const metrics = await this.getCRMPlatformData(userId, connection);
            if (metrics) {
              platformMetrics.push(metrics);
            }
          } catch (error) {
            logger.error('Error getting CRM platform metrics', { 
              userId, 
              platform: connection.platform, 
              error 
            });
            // Continue with other platforms
          }
        }
      }

      return platformMetrics;
    } catch (error) {
      logger.error('Error getting CRM platform metrics', { userId, error });
      return [];
    }
  }

  /**
   * Get social platform data
   */
  private async getSocialPlatformData(
    userId: string,
    platform: Platform
  ): Promise<PlatformMetrics | null> {
    try {
      // Get platform connection status
      const connectionsRef = collection(firestore, 'users', userId, 'platformConnections');
      const connectionQuery = query(
        connectionsRef,
        where('platform', '==', platform),
        where('status', '==', 'connected')
      );

      const connectionSnapshot = await getDocs(connectionQuery);
      
      if (connectionSnapshot.empty) {
        return {
          platform,
          metrics: [],
          connectionStatus: 'disconnected',
          lastSync: new Date()
        };
      }

      const connectionData = connectionSnapshot.docs[0].data();

      // Get recent metrics for this platform
      const metricsRef = collection(firestore, 'users', userId, 'platformMetrics');
      const metricsQuery = query(
        metricsRef,
        where('platform', '==', platform),
        orderBy('timestamp', 'desc')
      );

      const metricsSnapshot = await getDocs(metricsQuery);
      const metrics = metricsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          value: data.value,
          previousValue: data.previousValue,
          change: data.change,
          changePercentage: data.changePercentage,
          platform,
          timeRange: data.timeRange,
          timestamp: data.timestamp.toDate(),
          metadata: data.metadata
        };
      });

      return {
        platform,
        metrics,
        connectionStatus: 'connected',
        lastSync: connectionData.lastSync?.toDate() || new Date(),
        accountInfo: {
          id: connectionData.accountId || '',
          name: connectionData.accountName || '',
          username: connectionData.username,
          profileImage: connectionData.profileImage
        }
      };
    } catch (error) {
      logger.error('Error getting social platform data', { userId, platform, error });
      return {
        platform,
        metrics: [],
        connectionStatus: 'error',
        lastSync: new Date()
      };
    }
  }

  /**
   * Get CRM platform data
   */
  private async getCRMPlatformData(
    userId: string,
    connection: CRMConnection
  ): Promise<PlatformMetrics | null> {
    try {
      const platform = connection.platform as unknown as Platform;

      // Get CRM metrics (deals, contacts, revenue, etc.)
      const crmMetrics = await this.calculateCRMMetrics(userId, connection);

      return {
        platform,
        metrics: crmMetrics,
        connectionStatus: connection.status === 'connected' ? 'connected' : 'disconnected',
        lastSync: connection.lastSyncAt || new Date(),
        accountInfo: {
          id: connection.accountId || '',
          name: connection.accountName || '',
          username: connection.accountName
        }
      };
    } catch (error) {
      logger.error('Error getting CRM platform data', { userId, platform: connection.platform, error });
      return {
        platform: connection.platform as unknown as Platform,
        metrics: [],
        connectionStatus: 'error',
        lastSync: new Date()
      };
    }
  }

  /**
   * Calculate CRM metrics
   */
  private async calculateCRMMetrics(
    userId: string,
    connection: CRMConnection
  ): Promise<any[]> {
    try {
      const metrics: any[] = [];
      const now = new Date();

      // Get deals data - using proper CRM service interface
      const dealsResponse = await this.crmService.getDeals(userId, {
        limit: 100
      });

      if (dealsResponse.success && dealsResponse.data) {
        const deals = dealsResponse.data;
        const wonDeals = deals.filter(deal => deal.status === 'won');
        const totalRevenue = wonDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0);

        // Revenue metric
        metrics.push({
          id: `revenue-${connection.platform}`,
          type: 'revenue',
          value: totalRevenue,
          platform: connection.platform as unknown as Platform,
          timeRange: 'last_30_days',
          timestamp: now,
          metadata: {
            dealCount: wonDeals.length,
            source: 'crm'
          }
        });

        // Conversions metric
        metrics.push({
          id: `conversions-${connection.platform}`,
          type: 'conversions',
          value: wonDeals.length,
          platform: connection.platform as unknown as Platform,
          timeRange: 'last_30_days',
          timestamp: now,
          metadata: {
            totalDeals: deals.length,
            source: 'crm'
          }
        });
      }

      // Get contacts data - using proper CRM service interface
      const contactsResponse = await this.crmService.getContacts(userId, {
        limit: 100
      });

      if (contactsResponse.success && contactsResponse.data) {
        const contacts = contactsResponse.data;

        // New contacts metric
        metrics.push({
          id: `new-contacts-${connection.platform}`,
          type: 'new_contacts',
          value: contacts.length,
          platform: connection.platform as unknown as Platform,
          timeRange: 'last_30_days',
          timestamp: now,
          metadata: {
            source: 'crm'
          }
        });
      }

      return metrics;
    } catch (error) {
      logger.error('Error calculating CRM metrics', { userId, platform: connection.platform, error });
      return [];
    }
  }

  /**
   * Aggregate cross-platform metrics
   */
  async aggregateCrossPlatformMetrics(
    userId: string,
    metricType: string,
    platforms: Platform[]
  ): Promise<{
    total: number;
    byPlatform: Record<Platform, number>;
    trends: Array<{ date: Date; value: number; platform: Platform }>;
  }> {
    try {
      logger.info('Aggregating cross-platform metrics', { userId, metricType, platforms });

      let total = 0;
      const byPlatform: Record<Platform, number> = {} as Record<Platform, number>;
      const trends: Array<{ date: Date; value: number; platform: Platform }> = [];

      for (const platform of platforms) {
        try {
          // Get metrics for this platform
          const metricsRef = collection(firestore, 'users', userId, 'platformMetrics');
          const metricsQuery = query(
            metricsRef,
            where('platform', '==', platform),
            where('type', '==', metricType),
            orderBy('timestamp', 'desc')
          );

          const snapshot = await getDocs(metricsQuery);
          let platformTotal = 0;

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const value = data.value || 0;
            platformTotal += value;

            trends.push({
              date: data.timestamp.toDate(),
              value,
              platform
            });
          });

          byPlatform[platform] = platformTotal;
          total += platformTotal;
        } catch (error) {
          logger.error('Error aggregating metrics for platform', { 
            userId, 
            metricType, 
            platform, 
            error 
          });
          byPlatform[platform] = 0;
        }
      }

      // Sort trends by date
      trends.sort((a, b) => a.date.getTime() - b.date.getTime());

      logger.info('Successfully aggregated cross-platform metrics', { 
        userId, 
        metricType, 
        total,
        platformCount: platforms.length
      });

      return { total, byPlatform, trends };
    } catch (error) {
      logger.error('Error aggregating cross-platform metrics', { userId, metricType, platforms, error });
      throw new DashboardErrorClass(
        DashboardErrorType.DATA_AGGREGATION_ERROR,
        'Failed to aggregate cross-platform metrics',
        undefined,
        undefined,
        new Date(),
        { userId, metricType, platforms },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Get aggregated performance summary
   */
  async getPerformanceSummary(
    userId: string,
    timeRange: { startDate: Date; endDate: Date },
    platforms?: Platform[]
  ): Promise<{
    totalEngagement: number;
    totalReach: number;
    totalFollowers: number;
    totalPosts: number;
    averageEngagementRate: number;
    topPerformingPlatform: Platform | null;
    growthRate: number;
  }> {
    try {
      logger.info('Getting performance summary', { userId, timeRange, platforms });

      let totalEngagement = 0;
      let totalReach = 0;
      let totalFollowers = 0;
      let totalPosts = 0;
      let topPerformingPlatform: Platform | null = null;
      let maxEngagement = 0;

      const targetPlatforms = platforms || Object.values(Platform);

      for (const platform of targetPlatforms) {
        try {
          // Get platform metrics
          const metricsRef = collection(firestore, 'users', userId, 'platformMetrics');
          const metricsQuery = query(
            metricsRef,
            where('platform', '==', platform),
            where('timestamp', '>=', Timestamp.fromDate(timeRange.startDate)),
            where('timestamp', '<=', Timestamp.fromDate(timeRange.endDate))
          );

          const snapshot = await getDocs(metricsQuery);
          let platformEngagement = 0;
          let platformReach = 0;
          let platformFollowers = 0;
          let platformPosts = 0;

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            switch (data.type) {
              case 'engagement':
                platformEngagement += data.value || 0;
                break;
              case 'reach':
                platformReach += data.value || 0;
                break;
              case 'followers':
                platformFollowers = Math.max(platformFollowers, data.value || 0);
                break;
              case 'posts_published':
                platformPosts += data.value || 0;
                break;
            }
          });

          totalEngagement += platformEngagement;
          totalReach += platformReach;
          totalFollowers += platformFollowers;
          totalPosts += platformPosts;

          // Track top performing platform
          if (platformEngagement > maxEngagement) {
            maxEngagement = platformEngagement;
            topPerformingPlatform = platform;
          }
        } catch (error) {
          logger.error('Error getting platform performance', { userId, platform, error });
          // Continue with other platforms
        }
      }

      const averageEngagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

      // Calculate growth rate (simplified - would need historical data for accurate calculation)
      const growthRate = 0; // Placeholder

      const summary = {
        totalEngagement,
        totalReach,
        totalFollowers,
        totalPosts,
        averageEngagementRate,
        topPerformingPlatform,
        growthRate
      };

      logger.info('Successfully generated performance summary', { userId, summary });

      return summary;
    } catch (error) {
      logger.error('Error getting performance summary', { userId, timeRange, platforms, error });
      throw new DashboardErrorClass(
        DashboardErrorType.DATA_AGGREGATION_ERROR,
        'Failed to get performance summary',
        undefined,
        undefined,
        new Date(),
        { userId, timeRange, platforms },
        error instanceof Error ? error.stack : undefined
      );
    }
  }
} 
import contentVersionService, { ContentVersion } from '../content/ContentVersionService';
import roiTrackingService, { ROICampaign, ROIMetrics } from '../analytics/ROITrackingService';
import realTimeMonitoringService, { MonitoringConfig, RealTimeEvent, MonitoringAlert } from '../analytics/RealTimeMonitoringService';
import platformAPIAccessManager, { APIAccessConfig, QuotaStatus } from '../platforms/PlatformAPIAccessManager';
import storyCreatorService, { StoryProject, StoryTemplate, AIStoryGenerationOptions } from '../platforms/StoryCreatorService';

/**
 * Feature Integration Service
 * Provides a unified API for all implemented features and handles their interactions
 */
export class FeatureIntegrationService {
  
  /**
   * Content Versioning Features
   */
  async createContentVersion(
    contentId: string,
    content: any,
    userId: string,
    comment?: string,
    source: 'manual' | 'auto-save' | 'ai-assist' | 'collaboration' = 'manual'
  ): Promise<ContentVersion> {
    return contentVersionService.createVersion(
      contentId,
      content,
      userId,
      comment,
      undefined,
      { source, userAgent: 'irisync-app' }
    );
  }

  async getContentVersionHistory(contentId: string, limit?: number): Promise<ContentVersion[]> {
    return contentVersionService.getVersionHistory(contentId, limit);
  }

  async revertContentToVersion(
    contentId: string,
    version: number,
    userId: string,
    comment?: string
  ): Promise<ContentVersion> {
    return contentVersionService.revertToVersion(contentId, version, userId, comment);
  }

  async compareContentVersions(
    contentId: string,
    versionA: number,
    versionB: number
  ) {
    return contentVersionService.compareVersions(contentId, versionA, versionB);
  }

  /**
   * ROI Tracking Features
   */
  async createROICampaign(campaign: Omit<ROICampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<ROICampaign> {
    return roiTrackingService.createCampaign(campaign);
  }

  async calculateCampaignROI(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ROIMetrics> {
    return roiTrackingService.calculateROIMetrics(campaignId, startDate, endDate);
  }

  async compareROIAcrossCampaigns(
    campaignIds: string[],
    period: { start: Date; end: Date }
  ) {
    return roiTrackingService.compareROI(campaignIds, period);
  }

  async getROITrends(
    campaignId: string,
    period: { start: Date; end: Date },
    interval: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ) {
    return roiTrackingService.getROITrends(campaignId, period, interval);
  }

  /**
   * Real-time Monitoring Features
   */
  async createMonitoringConfig(
    config: Omit<MonitoringConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MonitoringConfig> {
    return realTimeMonitoringService.createConfig(config);
  }

  async processRealTimeEvent(event: Omit<RealTimeEvent, 'id' | 'processedAt'>): Promise<void> {
    return realTimeMonitoringService.processEvent(event);
  }

  async getMonitoringAlerts(
    organizationId: string,
    status?: string,
    limit?: number
  ): Promise<MonitoringAlert[]> {
    return realTimeMonitoringService.getAlerts(organizationId, status, limit);
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    return realTimeMonitoringService.acknowledgeAlert(alertId, userId);
  }

  async calculateMonitoringStats(
    configId: string,
    startDate: Date,
    endDate: Date
  ) {
    return realTimeMonitoringService.calculateStats(configId, startDate, endDate);
  }

  /**
   * Platform API Access Management Features
   */
  async createAPIAccess(
    config: Omit<APIAccessConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<APIAccessConfig> {
    return platformAPIAccessManager.createAPIAccess(config);
  }

  async validateAPIRequest(
    configId: string,
    endpoint: string,
    method: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return platformAPIAccessManager.validateAPIAccess(configId, endpoint, method, ipAddress, userAgent);
  }

  async trackAPIUsage(usage: {
    configId: string;
    organizationId: string;
    platform: string;
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    dataTransferred: number;
    userAgent?: string;
    ipAddress?: string;
    userId?: string;
  }): Promise<void> {
    return platformAPIAccessManager.trackAPIUsage({
      ...usage,
      timestamp: new Date()
    });
  }

  async getQuotaStatus(configId: string): Promise<QuotaStatus[]> {
    return platformAPIAccessManager.getQuotaStatus(configId);
  }

  async getAPIUsageAnalytics(
    configId: string,
    startDate: Date,
    endDate: Date
  ) {
    return platformAPIAccessManager.getUsageAnalytics(configId, startDate, endDate);
  }

  /**
   * Story Creator Features
   */
  async createStoryProject(
    organizationId: string,
    userId: string,
    name: string,
    templateId?: string
  ): Promise<StoryProject> {
    return storyCreatorService.createStoryProject(organizationId, userId, name, templateId);
  }

  async generateAIStory(
    organizationId: string,
    userId: string,
    options: AIStoryGenerationOptions
  ): Promise<StoryProject> {
    return storyCreatorService.generateAIStory(organizationId, userId, options);
  }

  async getStoryTemplates(
    category?: string,
    platform?: any,
    premium?: boolean
  ): Promise<StoryTemplate[]> {
    return storyCreatorService.getTemplates(category, platform, premium);
  }

  async exportStory(
    project: StoryProject,
    options: {
      format: 'mp4' | 'gif' | 'images';
      quality: 'low' | 'medium' | 'high' | 'ultra';
      resolution: { width: number; height: number };
      fps?: number;
      compression?: number;
      watermark?: {
        enabled: boolean;
        text?: string;
        image?: string;
        position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
        opacity: number;
      };
    }
  ) {
    return storyCreatorService.exportStory(project, options);
  }

  async validateStoryForPlatform(content: any[], platform: any) {
    return storyCreatorService.validateStoryForPlatform(content, platform);
  }

  /**
   * Cross-feature Integration Methods
   */

  /**
   * Create content with automatic versioning
   */
  async createContentWithVersioning(
    contentData: any,
    userId: string,
    organizationId: string,
    comment?: string
  ): Promise<{ contentId: string; version: ContentVersion }> {
    // This would integrate with your content creation service
    const contentId = `content_${Date.now()}`;
    
    const version = await this.createContentVersion(
      contentId,
      { ...contentData, organizationId },
      userId,
      comment || 'Initial version'
    );

    return { contentId, version };
  }

  /**
   * Track ROI for story campaigns
   */
  async trackStoryROI(
    storyProject: StoryProject,
    campaignData: {
      budget: number;
      goals: Array<{
        type: 'revenue' | 'leads' | 'engagement' | 'awareness' | 'traffic';
        target: number;
        value?: number;
      }>;
    }
  ): Promise<ROICampaign> {
    const campaign = await this.createROICampaign({
      name: `Story Campaign: ${storyProject.name}`,
      description: `ROI tracking for story project ${storyProject.id}`,
      organizationId: storyProject.organizationId,
      userId: storyProject.userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      budget: {
        total: campaignData.budget,
        currency: 'USD',
        breakdown: {
          contentCreation: campaignData.budget * 0.3,
          adSpend: campaignData.budget * 0.6,
          toolsCosts: campaignData.budget * 0.1
        }
      },
      goals: campaignData.goals,
      platforms: storyProject.platforms.map((p: any) => p.toString()),
      contentIds: [storyProject.id],
      status: 'active'
    });

    return campaign;
  }

  /**
   * Monitor story performance in real-time
   */
  async setupStoryMonitoring(
    storyProject: StoryProject,
    keywords: string[],
    hashtags: string[]
  ): Promise<MonitoringConfig> {
    const config = await this.createMonitoringConfig({
      organizationId: storyProject.organizationId,
      userId: storyProject.userId,
      name: `Story Monitoring: ${storyProject.name}`,
      description: `Real-time monitoring for story project ${storyProject.id}`,
      isActive: true,
      platforms: storyProject.platforms.map((p: any) => p.toString()),
      keywords,
      hashtags,
      mentions: [],
      excludeKeywords: [],
      sentiment: 'all',
      languages: ['en'],
      alertThresholds: {
        mentionVolume: 10,
        sentimentScore: -0.5,
        engagementRate: 100
      },
      notifications: {
        inApp: true
      }
    });

    return config;
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  async getDashboardAnalytics(
    organizationId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    contentVersions: {
      totalVersions: number;
      activeProjects: number;
      collaborativeEdits: number;
    };
    roiMetrics: {
      totalCampaigns: number;
      averageROI: number;
      totalRevenue: number;
      totalSpend: number;
    };
    monitoring: {
      activeConfigs: number;
      totalEvents: number;
      activeAlerts: number;
      sentimentTrend: number;
    };
    apiUsage: {
      totalRequests: number;
      successRate: number;
      averageResponseTime: number;
      quotaUtilization: number;
    };
    stories: {
      totalProjects: number;
      publishedStories: number;
      aiGeneratedStories: number;
      averageEngagement: number;
    };
  }> {
    // This would aggregate data from all services
    // For now, returning mock data structure
    return {
      contentVersions: {
        totalVersions: 0,
        activeProjects: 0,
        collaborativeEdits: 0
      },
      roiMetrics: {
        totalCampaigns: 0,
        averageROI: 0,
        totalRevenue: 0,
        totalSpend: 0
      },
      monitoring: {
        activeConfigs: 0,
        totalEvents: 0,
        activeAlerts: 0,
        sentimentTrend: 0
      },
      apiUsage: {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        quotaUtilization: 0
      },
      stories: {
        totalProjects: 0,
        publishedStories: 0,
        aiGeneratedStories: 0,
        averageEngagement: 0
      }
    };
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      contentVersioning: boolean;
      roiTracking: boolean;
      realTimeMonitoring: boolean;
      apiAccessManagement: boolean;
      storyCreator: boolean;
    };
    timestamp: Date;
  }> {
    const services = {
      contentVersioning: true, // Would check actual service health
      roiTracking: true,
      realTimeMonitoring: true,
      apiAccessManagement: true,
      storyCreator: true
    };

    const allHealthy = Object.values(services).every(status => status);
    const anyUnhealthy = Object.values(services).some(status => !status);

    return {
      status: allHealthy ? 'healthy' : anyUnhealthy ? 'degraded' : 'unhealthy',
      services,
      timestamp: new Date()
    };
  }
}

// Create and export singleton instance
const featureIntegrationService = new FeatureIntegrationService();
export default featureIntegrationService; 
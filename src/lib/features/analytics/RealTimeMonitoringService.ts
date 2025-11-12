import { firestore } from '../firebase';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';
import { EventEmitter } from 'events';

/**
 * Interface for real-time monitoring configuration
 */
export interface MonitoringConfig {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  platforms: string[];
  keywords: string[];
  hashtags: string[];
  mentions: string[];
  excludeKeywords: string[];
  sentiment: 'all' | 'positive' | 'negative' | 'neutral';
  languages: string[];
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
    radius?: number;
  };
  alertThresholds: {
    mentionVolume?: number;
    sentimentScore?: number;
    engagementRate?: number;
    reachThreshold?: number;
  };
  notifications: {
    email?: string[];
    slack?: string;
    webhook?: string;
    inApp?: boolean;
    sms?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for real-time events
 */
export interface RealTimeEvent {
  id: string;
  configId: string;
  organizationId: string;
  type: 'mention' | 'hashtag' | 'engagement' | 'comment' | 'share' | 'dm' | 'review';
  platform: string;
  source: {
    id: string;
    username: string;
    displayName: string;
    profileUrl?: string;
    verified?: boolean;
    followerCount?: number;
  };
  content: {
    text: string;
    url?: string;
    mediaUrls?: string[];
    language?: string;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  sentiment: {
    score: number; // -1 to 1
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  metadata: {
    postId: string;
    parentId?: string;
    threadId?: string;
    isReply?: boolean;
    isRetweet?: boolean;
    originalAuthor?: string;
  };
  timestamp: Date;
  processedAt: Date;
}

/**
 * Interface for monitoring alerts
 */
export interface MonitoringAlert {
  id: string;
  configId: string;
  organizationId: string;
  type: 'volume_spike' | 'sentiment_drop' | 'viral_content' | 'crisis_detection' | 'competitor_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggerValue: number;
  threshold: number;
  events: string[]; // Event IDs that triggered this alert
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  notificationsSent: {
    channel: 'email' | 'slack' | 'webhook' | 'sms' | 'inApp';
    recipient: string;
    sentAt: Date;
    status: 'sent' | 'failed' | 'delivered';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for monitoring statistics
 */
export interface MonitoringStats {
  configId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
  eventsByPlatform: Record<string, number>;
  eventsByType: Record<string, number>;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
    averageScore: number;
  };
  topKeywords: Array<{
    keyword: string;
    count: number;
    sentiment: number;
  }>;
  topSources: Array<{
    username: string;
    platform: string;
    count: number;
    totalEngagement: number;
  }>;
  engagementMetrics: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
    averageEngagement: number;
  };
  alertsTriggered: number;
  responseTime: {
    averageMinutes: number;
    medianMinutes: number;
  };
  calculatedAt: Date;
}

/**
 * Real-time Social Media Monitoring Service
 */
export class RealTimeMonitoringService extends EventEmitter {
  private readonly CONFIGS_COLLECTION = 'monitoring_configs';
  private readonly EVENTS_COLLECTION = 'monitoring_events';
  private readonly ALERTS_COLLECTION = 'monitoring_alerts';
  private readonly STATS_COLLECTION = 'monitoring_stats';
  
  private activeConfigs: Map<string, MonitoringConfig> = new Map();
  private eventBuffer: Map<string, RealTimeEvent[]> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  
  constructor() {
    super();
    this.initializeMonitoring();
  }
  
  /**
   * Initialize monitoring service
   */
  private async initializeMonitoring(): Promise<void> {
    // Load active monitoring configurations
    await this.loadActiveConfigs();
    
    // Start event processing
    this.startEventProcessing();
    
    // Start alert processing
    this.startAlertProcessing();
  }
  
  /**
   * Create a new monitoring configuration
   */
  async createConfig(config: Omit<MonitoringConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<MonitoringConfig> {
    const configId = uuidv4();
    const now = new Date();
    
    const newConfig: MonitoringConfig = {
      ...config,
      id: configId,
      createdAt: now,
      updatedAt: now
    };
    
    await firestore
      .collection(this.CONFIGS_COLLECTION)
      .doc(configId)
      .set({
        ...newConfig,
        createdAt: Timestamp.fromDate(newConfig.createdAt),
        updatedAt: Timestamp.fromDate(newConfig.updatedAt)
      });
    
    if (newConfig.isActive) {
      this.activeConfigs.set(configId, newConfig);
    }
    
    return newConfig;
  }
  
  /**
   * Update monitoring configuration
   */
  async updateConfig(configId: string, updates: Partial<MonitoringConfig>): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    await firestore
      .collection(this.CONFIGS_COLLECTION)
      .doc(configId)
      .update(updateData);
    
    // Update active configs cache
    if (this.activeConfigs.has(configId)) {
      const existingConfig = this.activeConfigs.get(configId)!;
      const updatedConfig = { ...existingConfig, ...updates, updatedAt: new Date() };
      
      if (updatedConfig.isActive) {
        this.activeConfigs.set(configId, updatedConfig);
      } else {
        this.activeConfigs.delete(configId);
      }
    }
  }
  
  /**
   * Delete monitoring configuration
   */
  async deleteConfig(configId: string): Promise<void> {
    await firestore
      .collection(this.CONFIGS_COLLECTION)
      .doc(configId)
      .delete();
    
    this.activeConfigs.delete(configId);
    this.eventBuffer.delete(configId);
  }
  
  /**
   * Get monitoring configuration
   */
  async getConfig(configId: string): Promise<MonitoringConfig | null> {
    const doc = await firestore
      .collection(this.CONFIGS_COLLECTION)
      .doc(configId)
      .get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data()!;
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate()
    } as MonitoringConfig;
  }
  
  /**
   * Get monitoring configurations for an organization
   */
  async getConfigs(organizationId: string): Promise<MonitoringConfig[]> {
    const snapshot = await firestore
      .collection(this.CONFIGS_COLLECTION)
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as MonitoringConfig;
    });
  }
  
  /**
   * Process incoming real-time event
   */
  async processEvent(event: Omit<RealTimeEvent, 'id' | 'processedAt'>): Promise<void> {
    const eventId = uuidv4();
    const now = new Date();
    
    const newEvent: RealTimeEvent = {
      ...event,
      id: eventId,
      processedAt: now
    };
    
    // Store event
    await firestore
      .collection(this.EVENTS_COLLECTION)
      .doc(eventId)
      .set({
        ...newEvent,
        timestamp: Timestamp.fromDate(newEvent.timestamp),
        processedAt: Timestamp.fromDate(newEvent.processedAt)
      });
    
    // Check if event matches any active monitoring configs
    for (const [configId, config] of this.activeConfigs) {
      if (this.eventMatchesConfig(newEvent, config)) {
        // Add to event buffer for this config
        if (!this.eventBuffer.has(configId)) {
          this.eventBuffer.set(configId, []);
        }
        this.eventBuffer.get(configId)!.push(newEvent);
        
        // Emit real-time event
        this.emit('event', { configId, event: newEvent });
        
        // Check for alert conditions
        await this.checkAlertConditions(configId, config, newEvent);
      }
    }
  }
  
  /**
   * Get real-time events for a configuration
   */
  async getEvents(
    configId: string,
    startDate: Date,
    endDate: Date,
    limit?: number
  ): Promise<RealTimeEvent[]> {
    let query = firestore
      .collection(this.EVENTS_COLLECTION)
      .where('configId', '==', configId)
      .where('timestamp', '>=', Timestamp.fromDate(startDate))
      .where('timestamp', '<=', Timestamp.fromDate(endDate))
      .orderBy('timestamp', 'desc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        timestamp: data.timestamp.toDate(),
        processedAt: data.processedAt.toDate()
      } as RealTimeEvent;
    });
  }
  
  /**
   * Get monitoring alerts
   */
  async getAlerts(
    organizationId: string,
    status?: string,
    limit?: number
  ): Promise<MonitoringAlert[]> {
    let query = firestore
      .collection(this.ALERTS_COLLECTION)
      .where('organizationId', '==', organizationId);
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.orderBy('createdAt', 'desc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        acknowledgedAt: data.acknowledgedAt?.toDate(),
        resolvedAt: data.resolvedAt?.toDate(),
        notificationsSent: data.notificationsSent?.map((n: any) => ({
          ...n,
          sentAt: n.sentAt.toDate()
        })) || []
      } as MonitoringAlert;
    });
  }
  
  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await firestore
      .collection(this.ALERTS_COLLECTION)
      .doc(alertId)
      .update({
        status: 'acknowledged',
        acknowledgedBy: userId,
        acknowledgedAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      });
  }
  
  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string): Promise<void> {
    await firestore
      .collection(this.ALERTS_COLLECTION)
      .doc(alertId)
      .update({
        status: 'resolved',
        resolvedBy: userId,
        resolvedAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      });
  }
  
  /**
   * Calculate monitoring statistics
   */
  async calculateStats(
    configId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MonitoringStats> {
    const events = await this.getEvents(configId, startDate, endDate);
    const alerts = await this.getAlerts('', 'active'); // Would filter by config
    
    const stats: MonitoringStats = {
      configId,
      period: { start: startDate, end: endDate },
      totalEvents: events.length,
      eventsByPlatform: this.groupEventsByPlatform(events),
      eventsByType: this.groupEventsByType(events),
      sentimentBreakdown: this.calculateSentimentBreakdown(events),
      topKeywords: this.extractTopKeywords(events),
      topSources: this.extractTopSources(events),
      engagementMetrics: this.calculateEngagementMetrics(events),
      alertsTriggered: alerts.length,
      responseTime: this.calculateResponseTime(alerts),
      calculatedAt: new Date()
    };
    
    // Store stats
    await this.storeStats(stats);
    
    return stats;
  }
  
  /**
   * Load active monitoring configurations
   */
  private async loadActiveConfigs(): Promise<void> {
    const snapshot = await firestore
      .collection(this.CONFIGS_COLLECTION)
      .where('isActive', '==', true)
      .get();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const config = {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as MonitoringConfig;
      
      this.activeConfigs.set(config.id, config);
    });
  }
  
  /**
   * Check if event matches monitoring configuration
   */
  private eventMatchesConfig(event: RealTimeEvent, config: MonitoringConfig): boolean {
    // Check platform
    if (!config.platforms.includes(event.platform)) {
      return false;
    }
    
    // Check keywords
    const content = event.content.text.toLowerCase();
    const hasKeyword = config.keywords.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    // Check hashtags
    const hasHashtag = config.hashtags.some(hashtag => 
      content.includes(hashtag.toLowerCase())
    );
    
    // Check mentions
    const hasMention = config.mentions.some(mention => 
      content.includes(mention.toLowerCase())
    );
    
    // Check exclude keywords
    const hasExcludeKeyword = config.excludeKeywords.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    if (hasExcludeKeyword) {
      return false;
    }
    
    // Must match at least one criteria
    if (!hasKeyword && !hasHashtag && !hasMention) {
      return false;
    }
    
    // Check sentiment
    if (config.sentiment !== 'all' && event.sentiment.label !== config.sentiment) {
      return false;
    }
    
    // Check language
    if (config.languages.length > 0 && event.content.language) {
      if (!config.languages.includes(event.content.language)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Check alert conditions for an event
   */
  private async checkAlertConditions(
    configId: string,
    config: MonitoringConfig,
    event: RealTimeEvent
  ): Promise<void> {
    const now = new Date();
    const cooldownKey = `${configId}_${event.type}`;
    
    // Check cooldown (prevent spam alerts)
    if (this.alertCooldowns.has(cooldownKey)) {
      const lastAlert = this.alertCooldowns.get(cooldownKey)!;
      if (now.getTime() - lastAlert.getTime() < 300000) { // 5 minutes
        return;
      }
    }
    
    // Check volume spike
    if (config.alertThresholds.mentionVolume) {
      const recentEvents = this.eventBuffer.get(configId) || [];
      const lastHourEvents = recentEvents.filter(e => 
        now.getTime() - e.timestamp.getTime() < 3600000 // 1 hour
      );
      
      if (lastHourEvents.length >= config.alertThresholds.mentionVolume) {
        await this.createAlert(configId, config, 'volume_spike', {
          title: 'Mention Volume Spike Detected',
          description: `${lastHourEvents.length} mentions in the last hour`,
          triggerValue: lastHourEvents.length,
          threshold: config.alertThresholds.mentionVolume,
          events: [event.id]
        });
        
        this.alertCooldowns.set(cooldownKey, now);
      }
    }
    
    // Check sentiment drop
    if (config.alertThresholds.sentimentScore && event.sentiment.score < config.alertThresholds.sentimentScore) {
      await this.createAlert(configId, config, 'sentiment_drop', {
        title: 'Negative Sentiment Detected',
        description: `Sentiment score: ${event.sentiment.score}`,
        triggerValue: event.sentiment.score,
        threshold: config.alertThresholds.sentimentScore,
        events: [event.id]
      });
    }
    
    // Check viral content
    const totalEngagement = event.engagement.likes + event.engagement.comments + event.engagement.shares;
    if (config.alertThresholds.engagementRate && totalEngagement > config.alertThresholds.engagementRate) {
      await this.createAlert(configId, config, 'viral_content', {
        title: 'Viral Content Detected',
        description: `High engagement: ${totalEngagement} interactions`,
        triggerValue: totalEngagement,
        threshold: config.alertThresholds.engagementRate,
        events: [event.id]
      });
    }
  }
  
  /**
   * Create a monitoring alert
   */
  private async createAlert(
    configId: string,
    config: MonitoringConfig,
    type: MonitoringAlert['type'],
    alertData: {
      title: string;
      description: string;
      triggerValue: number;
      threshold: number;
      events: string[];
    }
  ): Promise<void> {
    const alertId = uuidv4();
    const now = new Date();
    
    const alert: MonitoringAlert = {
      id: alertId,
      configId,
      organizationId: config.organizationId,
      type,
      severity: this.calculateSeverity(type, alertData.triggerValue, alertData.threshold),
      title: alertData.title,
      description: alertData.description,
      triggerValue: alertData.triggerValue,
      threshold: alertData.threshold,
      events: alertData.events,
      status: 'active',
      notificationsSent: [],
      createdAt: now,
      updatedAt: now
    };
    
    // Store alert
    await firestore
      .collection(this.ALERTS_COLLECTION)
      .doc(alertId)
      .set({
        ...alert,
        createdAt: Timestamp.fromDate(alert.createdAt),
        updatedAt: Timestamp.fromDate(alert.updatedAt)
      });
    
    // Send notifications
    await this.sendAlertNotifications(alert, config);
    
    // Emit alert event
    this.emit('alert', alert);
  }
  
  /**
   * Calculate alert severity
   */
  private calculateSeverity(
    type: MonitoringAlert['type'],
    triggerValue: number,
    threshold: number
  ): MonitoringAlert['severity'] {
    const ratio = triggerValue / threshold;
    
    if (type === 'crisis_detection' || ratio > 5) {
      return 'critical';
    } else if (ratio > 3) {
      return 'high';
    } else if (ratio > 1.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(
    alert: MonitoringAlert,
    config: MonitoringConfig
  ): Promise<void> {
    const notifications: MonitoringAlert['notificationsSent'] = [];
    
    // Email notifications
    if (config.notifications.email?.length) {
      for (const email of config.notifications.email) {
        try {
          // Send email notification (integrate with email service)
          notifications.push({
            channel: 'email',
            recipient: email,
            sentAt: new Date(),
            status: 'sent'
          });
        } catch (error) {
          notifications.push({
            channel: 'email',
            recipient: email,
            sentAt: new Date(),
            status: 'failed'
          });
        }
      }
    }
    
    // Slack notifications
    if (config.notifications.slack) {
      try {
        // Send Slack notification (integrate with Slack API)
        notifications.push({
          channel: 'slack',
          recipient: config.notifications.slack,
          sentAt: new Date(),
          status: 'sent'
        });
      } catch (error) {
        notifications.push({
          channel: 'slack',
          recipient: config.notifications.slack,
          sentAt: new Date(),
          status: 'failed'
        });
      }
    }
    
    // Webhook notifications
    if (config.notifications.webhook) {
      try {
        // Send webhook notification
        notifications.push({
          channel: 'webhook',
          recipient: config.notifications.webhook,
          sentAt: new Date(),
          status: 'sent'
        });
      } catch (error) {
        notifications.push({
          channel: 'webhook',
          recipient: config.notifications.webhook,
          sentAt: new Date(),
          status: 'failed'
        });
      }
    }
    
    // Update alert with notification status
    if (notifications.length > 0) {
      await firestore
        .collection(this.ALERTS_COLLECTION)
        .doc(alert.id)
        .update({
          notificationsSent: notifications.map(n => ({
            ...n,
            sentAt: Timestamp.fromDate(n.sentAt)
          }))
        });
    }
  }
  
  /**
   * Start event processing loop
   */
  private startEventProcessing(): void {
    setInterval(() => {
      // Clean up old events from buffer (keep last 24 hours)
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      for (const [configId, events] of this.eventBuffer) {
        const filteredEvents = events.filter(event => event.timestamp > cutoff);
        this.eventBuffer.set(configId, filteredEvents);
      }
    }, 300000); // Every 5 minutes
  }
  
  /**
   * Start alert processing loop
   */
  private startAlertProcessing(): void {
    setInterval(() => {
      // Clean up old alert cooldowns
      const cutoff = new Date(Date.now() - 3600000); // 1 hour
      
      for (const [key, timestamp] of this.alertCooldowns) {
        if (timestamp < cutoff) {
          this.alertCooldowns.delete(key);
        }
      }
    }, 600000); // Every 10 minutes
  }
  
  /**
   * Helper methods for statistics calculation
   */
  private groupEventsByPlatform(events: RealTimeEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.platform] = (acc[event.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private groupEventsByType(events: RealTimeEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private calculateSentimentBreakdown(events: RealTimeEvent[]): MonitoringStats['sentimentBreakdown'] {
    const breakdown = { positive: 0, negative: 0, neutral: 0, averageScore: 0 };
    
    if (events.length === 0) return breakdown;
    
    let totalScore = 0;
    
    events.forEach(event => {
      breakdown[event.sentiment.label]++;
      totalScore += event.sentiment.score;
    });
    
    breakdown.averageScore = totalScore / events.length;
    
    return breakdown;
  }
  
  private extractTopKeywords(events: RealTimeEvent[]): MonitoringStats['topKeywords'] {
    // Simplified keyword extraction
    return [];
  }
  
  private extractTopSources(events: RealTimeEvent[]): MonitoringStats['topSources'] {
    const sources = new Map<string, { count: number; totalEngagement: number; platform: string }>();
    
    events.forEach(event => {
      const key = event.source.username;
      const existing = sources.get(key) || { count: 0, totalEngagement: 0, platform: event.platform };
      
      existing.count++;
      existing.totalEngagement += event.engagement.likes + event.engagement.comments + event.engagement.shares;
      
      sources.set(key, existing);
    });
    
    return Array.from(sources.entries())
      .map(([username, data]) => ({
        username,
        platform: data.platform,
        count: data.count,
        totalEngagement: data.totalEngagement
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  
  private calculateEngagementMetrics(events: RealTimeEvent[]): MonitoringStats['engagementMetrics'] {
    const metrics = {
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalViews: 0,
      averageEngagement: 0
    };
    
    if (events.length === 0) return metrics;
    
    events.forEach(event => {
      metrics.totalLikes += event.engagement.likes;
      metrics.totalComments += event.engagement.comments;
      metrics.totalShares += event.engagement.shares;
      metrics.totalViews += event.engagement.views || 0;
    });
    
    const totalEngagement = metrics.totalLikes + metrics.totalComments + metrics.totalShares;
    metrics.averageEngagement = totalEngagement / events.length;
    
    return metrics;
  }
  
  private calculateResponseTime(alerts: MonitoringAlert[]): MonitoringStats['responseTime'] {
    const responseTimes = alerts
      .filter(alert => alert.acknowledgedAt)
      .map(alert => {
        const responseTime = alert.acknowledgedAt!.getTime() - alert.createdAt.getTime();
        return responseTime / (1000 * 60); // Convert to minutes
      });
    
    if (responseTimes.length === 0) {
      return { averageMinutes: 0, medianMinutes: 0 };
    }
    
    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const sorted = responseTimes.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    return {
      averageMinutes: average,
      medianMinutes: median
    };
  }
  
  private async storeStats(stats: MonitoringStats): Promise<void> {
    const statsId = uuidv4();
    
    await firestore
      .collection(this.STATS_COLLECTION)
      .doc(statsId)
      .set({
        ...stats,
        period: {
          start: Timestamp.fromDate(stats.period.start),
          end: Timestamp.fromDate(stats.period.end)
        },
        calculatedAt: Timestamp.fromDate(stats.calculatedAt)
      });
  }
}

// Create and export singleton instance
const realTimeMonitoringService = new RealTimeMonitoringService();
export default realTimeMonitoringService; 
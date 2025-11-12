// Dashboard Service - Main orchestrator for all dashboard operations
// Production-ready service following existing codebase patterns

import { firestore } from '@/lib/core/firebase/client';
import { getFirestore } from '@/lib/core/firebase/admin';
import { logger } from '@/lib/core/logging/logger';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp 
} from 'firebase/firestore';

import {
  DashboardMetric,
  DashboardWidget,
  WidgetType,
  WidgetConfig,
  DashboardConfig,
  MetricType,
  TimeRange,
  Platform,
  PlatformMetrics,
  EngagementMetrics,
  AudienceMetrics,
  ContentMetrics,
  DashboardErrorType,
  DashboardApiResponse,
  PaginationParams,
  SearchParams,
  MetricsCalculationParams,
  WidgetRefreshParams,
  DashboardErrorClass
} from './types';

import { 
  Widget, 
  WidgetUtils, 
  WidgetData, 
  FirestoreWidget 
} from './models/Widget';

import { 
  Metrics, 
  MetricsUtils, 
  MetricsData, 
  FirestoreMetrics 
} from './models/Metrics';

import { 
  DashboardConfiguration, 
  DashboardConfigUtils, 
  DashboardConfigData, 
  FirestoreDashboardConfig 
} from './models/DashboardConfig';

import { MetricsCalculator } from './analytics/MetricsCalculator';
import { PerformanceAnalyzer } from './analytics/PerformanceAnalyzer';
import { AudienceAnalyzer } from './analytics/AudienceAnalyzer';
import { TrendAnalyzer } from './analytics/TrendAnalyzer';

import { WidgetFactory } from './widgets/WidgetFactory';
import { DataAggregator } from './data/DataAggregator';
import { CacheManager } from './data/CacheManager';
import { RealTimeUpdater } from './data/RealTimeUpdater';

// Import CRM service for data integration
import { CRMService } from '../crm/CRMService';

/**
 * Main Dashboard Service class
 * Orchestrates all dashboard operations and integrates with third-party platforms
 */
export class DashboardService {
  private static instance: DashboardService;
  private metricsCalculator: MetricsCalculator;
  private performanceAnalyzer: PerformanceAnalyzer;
  private audienceAnalyzer: AudienceAnalyzer;
  private trendAnalyzer: TrendAnalyzer;
  private widgetFactory: WidgetFactory;
  private dataAggregator: DataAggregator;
  private cacheManager: CacheManager;
  private realTimeUpdater: RealTimeUpdater;
  private crmService: CRMService;

  private constructor() {
    this.metricsCalculator = new MetricsCalculator();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.audienceAnalyzer = new AudienceAnalyzer();
    this.trendAnalyzer = new TrendAnalyzer();
    this.widgetFactory = new WidgetFactory();
    this.dataAggregator = new DataAggregator();
    this.cacheManager = new CacheManager();
    this.realTimeUpdater = new RealTimeUpdater();
    this.crmService = CRMService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  // ==================== DASHBOARD CONFIGURATION MANAGEMENT ====================

  /**
   * Get all dashboard configurations for a user
   */
  async getDashboards(userId: string, organizationId?: string): Promise<DashboardConfiguration[]> {
    try {
      logger.info('Fetching dashboard configurations', { userId, organizationId });

      const dashboardsRef = collection(firestore, 'dashboardConfigs');
      let q = query(
        dashboardsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      if (organizationId) {
        q = query(q, where('organizationId', '==', organizationId));
      }

      const snapshot = await getDocs(q);
      const dashboards = snapshot.docs.map(doc => 
        DashboardConfigUtils.fromFirestore(doc.data() as FirestoreDashboardConfig, doc.id)
      );

      logger.info('Successfully fetched dashboard configurations', { 
        userId, 
        organizationId, 
        count: dashboards.length 
      });

      return dashboards;
    } catch (error) {
      logger.error('Error fetching dashboard configurations', { userId, organizationId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.API_ERROR,
        'Failed to fetch dashboard configurations',
        undefined,
        undefined,
        new Date(),
        { userId, organizationId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Get a specific dashboard configuration
   */
  async getDashboard(dashboardId: string): Promise<DashboardConfiguration | null> {
    try {
      const docRef = doc(firestore, 'dashboardConfigs', dashboardId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return DashboardConfigUtils.fromFirestore(
        docSnap.data() as FirestoreDashboardConfig, 
        docSnap.id
      );
    } catch (error) {
      logger.error('Error fetching dashboard configuration', { dashboardId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.API_ERROR,
        'Failed to fetch dashboard configuration',
        undefined,
        undefined,
        new Date(),
        { dashboardId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Create a new dashboard configuration
   */
  async createDashboard(dashboard: DashboardConfigData & { userId: string; organizationId?: string }): Promise<DashboardConfiguration> {
    try {
      logger.info('Creating dashboard configuration', { 
        userId: dashboard.userId, 
        name: dashboard.name 
      });

      const dashboardConfig = DashboardConfigUtils.create(dashboard);
      const firestoreData = DashboardConfigUtils.toFirestore(dashboardConfig);
      const docRef = await addDoc(collection(firestore, 'dashboardConfigs'), firestoreData);

      const createdDashboard = {
        ...dashboardConfig,
        id: docRef.id
      };

      logger.info('Successfully created dashboard configuration', { 
        dashboardId: docRef.id,
        userId: dashboard.userId, 
        name: dashboard.name 
      });

      return createdDashboard;
    } catch (error) {
      logger.error('Error creating dashboard configuration', { userId: dashboard.userId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.API_ERROR,
        'Failed to create dashboard configuration',
        undefined,
        undefined,
        new Date(),
        { userId: dashboard.userId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Update a dashboard configuration
   */
  async updateDashboard(dashboardId: string, updates: Partial<DashboardConfigData>): Promise<DashboardConfiguration> {
    try {
      const docRef = doc(firestore, 'dashboardConfigs', dashboardId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new DashboardErrorClass(
          DashboardErrorType.API_ERROR,
          'Dashboard configuration not found',
          undefined,
          undefined,
          new Date(),
          { dashboardId }
        );
      }

      const currentDashboard = DashboardConfigUtils.fromFirestore(
        docSnap.data() as FirestoreDashboardConfig, 
        docSnap.id
      );

      const updatedDashboard = DashboardConfigUtils.update(currentDashboard, updates);
      const firestoreData = DashboardConfigUtils.toFirestore(updatedDashboard);

      await updateDoc(docRef, firestoreData as any);

      logger.info('Successfully updated dashboard configuration', { 
        dashboardId,
        updates: Object.keys(updates)
      });

      return updatedDashboard;
    } catch (error) {
      logger.error('Error updating dashboard configuration', { dashboardId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.API_ERROR,
        'Failed to update dashboard configuration',
        undefined,
        undefined,
        new Date(),
        { dashboardId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Delete a dashboard configuration
   */
  async deleteDashboard(dashboardId: string): Promise<void> {
    try {
      const docRef = doc(firestore, 'dashboardConfigs', dashboardId);
      await deleteDoc(docRef);

      // Also delete associated widgets
      await this.deleteWidgetsByDashboard(dashboardId);

      logger.info('Successfully deleted dashboard configuration', { dashboardId });
    } catch (error) {
      logger.error('Error deleting dashboard configuration', { dashboardId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.API_ERROR,
        'Failed to delete dashboard configuration',
        undefined,
        undefined,
        new Date(),
        { dashboardId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  // ==================== WIDGET MANAGEMENT ====================

  /**
   * Get widgets for a dashboard
   */
  async getWidgets(dashboardId: string): Promise<Widget[]> {
    try {
      const widgetsRef = collection(firestore, 'widgets');
      const q = query(
        widgetsRef,
        where('dashboardId', '==', dashboardId),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(q);
      const widgets = snapshot.docs.map(doc => 
        WidgetUtils.fromFirestore(doc.data() as FirestoreWidget, doc.id)
      );

      return widgets;
    } catch (error) {
      logger.error('Error fetching widgets', { dashboardId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.API_ERROR,
        'Failed to fetch widgets',
        undefined,
        undefined,
        new Date(),
        { dashboardId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Create a new widget
   */
  async createWidget(widget: WidgetData & { userId: string; dashboardId: string }): Promise<Widget> {
    try {
      const widgetData = WidgetUtils.create(widget);
      const firestoreData = WidgetUtils.toFirestore(widgetData);
      const docRef = await addDoc(collection(firestore, 'widgets'), firestoreData);

      const createdWidget = {
        ...widgetData,
        id: docRef.id
      };

      logger.info('Successfully created widget', { 
        widgetId: docRef.id,
        dashboardId: widget.dashboardId,
        type: widget.type
      });

      return createdWidget;
    } catch (error) {
      logger.error('Error creating widget', { userId: widget.userId, dashboardId: widget.dashboardId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.API_ERROR,
        'Failed to create widget',
        undefined,
        undefined,
        new Date(),
        { userId: widget.userId, dashboardId: widget.dashboardId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Update a widget
   */
  async updateWidget(widgetId: string, updates: Partial<WidgetData>): Promise<Widget> {
    try {
      const docRef = doc(firestore, 'widgets', widgetId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new DashboardErrorClass(
          DashboardErrorType.API_ERROR,
          'Widget not found',
          undefined,
          undefined,
          new Date(),
          { widgetId }
        );
      }

      const currentWidget = WidgetUtils.fromFirestore(
        docSnap.data() as FirestoreWidget, 
        docSnap.id
      );

      const updatedWidget = WidgetUtils.update(currentWidget, updates);
      const firestoreData = WidgetUtils.toFirestore(updatedWidget);

      await updateDoc(docRef, firestoreData as any);

      logger.info('Successfully updated widget', { 
        widgetId,
        updates: Object.keys(updates)
      });

      return updatedWidget;
    } catch (error) {
      logger.error('Error updating widget', { widgetId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.API_ERROR,
        'Failed to update widget',
        undefined,
        undefined,
        new Date(),
        { widgetId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Delete a widget
   */
  async deleteWidget(widgetId: string): Promise<void> {
    try {
      const docRef = doc(firestore, 'widgets', widgetId);
      await deleteDoc(docRef);

      logger.info('Successfully deleted widget', { widgetId });
    } catch (error) {
      logger.error('Error deleting widget', { widgetId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.API_ERROR,
        'Failed to delete widget',
        undefined,
        undefined,
        new Date(),
        { widgetId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Refresh widget data
   */
  async refreshWidget(params: WidgetRefreshParams): Promise<Widget> {
    try {
      const widget = await this.getWidget(params.widgetId);
      if (!widget) {
        throw new DashboardErrorClass(
          DashboardErrorType.API_ERROR,
          'Widget not found',
          undefined,
          undefined,
          new Date(),
          { widgetId: params.widgetId }
        );
      }

      // Generate new data based on widget type
      const newData = await this.widgetFactory.generateWidgetData(
        widget.type,
        widget.userId,
        widget.settings,
        params.timeRange,
        params.filters
      );

      // Update widget with new data
      const updatedWidget = await this.updateWidget(params.widgetId, {
        data: newData,
        lastUpdated: new Date()
      });

      logger.info('Successfully refreshed widget', { 
        widgetId: params.widgetId,
        type: widget.type
      });

      return updatedWidget;
    } catch (error) {
      logger.error('Error refreshing widget', { widgetId: params.widgetId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.WIDGET_ERROR,
        'Failed to refresh widget',
        undefined,
        params.widgetId,
        new Date(),
        { widgetId: params.widgetId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  // ==================== METRICS MANAGEMENT ====================

  /**
   * Calculate metrics for a user
   */
  async calculateMetrics(userId: string, params: MetricsCalculationParams): Promise<DashboardMetric[]> {
    try {
      logger.info('Calculating metrics', { userId, params });

      // Get time range dates
      const { startDate, endDate } = MetricsUtils.getTimeRangeDates(
        params.timeRange,
        params.startDate,
        params.endDate
      );

      // Calculate metrics using the metrics calculator
      const metrics = await this.metricsCalculator.calculateMetrics(
        userId,
        params.metricTypes || Object.values(MetricType),
        startDate,
        endDate,
        params.platforms,
        params.includeComparison
      );

      logger.info('Successfully calculated metrics', { 
        userId, 
        count: metrics.length,
        timeRange: params.timeRange
      });

      return metrics;
    } catch (error) {
      logger.error('Error calculating metrics', { userId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.METRICS_CALCULATION_ERROR,
        'Failed to calculate metrics',
        undefined,
        undefined,
        new Date(),
        { userId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Get platform metrics for a user
   */
  async getPlatformMetrics(userId: string, platforms?: Platform[]): Promise<PlatformMetrics[]> {
    try {
      // Get connected platforms from CRM and social integrations
      const crmConnections = await this.crmService.getConnections(userId);
      
      // Aggregate data from all connected platforms
      const platformMetrics = await this.dataAggregator.aggregatePlatformMetrics(
        userId,
        platforms,
        crmConnections
      );

      return platformMetrics;
    } catch (error) {
      logger.error('Error fetching platform metrics', { userId, platforms, error });
      throw new DashboardErrorClass(
        DashboardErrorType.DATA_AGGREGATION_ERROR,
        'Failed to fetch platform metrics',
        undefined,
        undefined,
        new Date(),
        { userId, platforms },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(userId: string, timeRange: TimeRange, platform?: Platform): Promise<EngagementMetrics> {
    try {
      return await this.audienceAnalyzer.calculateEngagementMetrics(
        userId,
        timeRange,
        platform
      );
    } catch (error) {
      logger.error('Error fetching engagement metrics', { userId, timeRange, platform, error });
      throw new DashboardErrorClass(
        DashboardErrorType.METRICS_CALCULATION_ERROR,
        'Failed to fetch engagement metrics',
        platform,
        undefined,
        new Date(),
        { userId, timeRange, platform },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Get audience metrics
   */
  async getAudienceMetrics(userId: string, timeRange: TimeRange, platform?: Platform): Promise<AudienceMetrics> {
    try {
      return await this.audienceAnalyzer.calculateAudienceMetrics(
        userId,
        timeRange,
        platform
      );
    } catch (error) {
      logger.error('Error fetching audience metrics', { userId, timeRange, platform, error });
      throw new DashboardErrorClass(
        DashboardErrorType.METRICS_CALCULATION_ERROR,
        'Failed to fetch audience metrics',
        platform,
        undefined,
        new Date(),
        { userId, timeRange, platform },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Get content metrics
   */
  async getContentMetrics(userId: string, timeRange: TimeRange): Promise<ContentMetrics> {
    try {
      return await this.performanceAnalyzer.calculateContentMetrics(
        userId,
        timeRange
      );
    } catch (error) {
      logger.error('Error fetching content metrics', { userId, timeRange, error });
      throw new DashboardErrorClass(
        DashboardErrorType.METRICS_CALCULATION_ERROR,
        'Failed to fetch content metrics',
        undefined,
        undefined,
        new Date(),
        { userId, timeRange },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  // ==================== REAL-TIME UPDATES ====================

  /**
   * Subscribe to real-time dashboard updates
   */
  async subscribeToUpdates(userId: string, dashboardId: string, callback: (data: any) => void): Promise<() => void> {
    try {
      return await this.realTimeUpdater.subscribe(userId, dashboardId, callback);
    } catch (error) {
      logger.error('Error subscribing to real-time updates', { userId, dashboardId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.REAL_TIME_ERROR,
        'Failed to subscribe to real-time updates',
        undefined,
        undefined,
        new Date(),
        { userId, dashboardId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Trigger real-time update
   */
  async triggerUpdate(userId: string, dashboardId: string, data: any): Promise<void> {
    try {
      await this.realTimeUpdater.broadcast(userId, dashboardId, data);
    } catch (error) {
      logger.error('Error triggering real-time update', { userId, dashboardId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.REAL_TIME_ERROR,
        'Failed to trigger real-time update',
        undefined,
        undefined,
        new Date(),
        { userId, dashboardId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Get a single widget
   */
  private async getWidget(widgetId: string): Promise<Widget | null> {
    try {
      const docRef = doc(firestore, 'widgets', widgetId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return WidgetUtils.fromFirestore(
        docSnap.data() as FirestoreWidget, 
        docSnap.id
      );
    } catch (error) {
      logger.error('Error fetching widget', { widgetId, error });
      return null;
    }
  }

  /**
   * Delete all widgets for a dashboard
   */
  private async deleteWidgetsByDashboard(dashboardId: string): Promise<void> {
    try {
      const widgetsRef = collection(firestore, 'widgets');
      const q = query(widgetsRef, where('dashboardId', '==', dashboardId));
      const snapshot = await getDocs(q);

      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      logger.info('Successfully deleted widgets for dashboard', { 
        dashboardId, 
        count: snapshot.docs.length 
      });
    } catch (error) {
      logger.error('Error deleting widgets for dashboard', { dashboardId, error });
      // Don't throw here as this is a cleanup operation
    }
  }

  /**
   * Initialize default dashboard for new user
   */
  async initializeDefaultDashboard(userId: string, organizationId?: string): Promise<DashboardConfiguration> {
    try {
      const defaultConfig = DashboardConfigUtils.getDefaultConfig(userId, organizationId);
      return await this.createDashboard(defaultConfig);
    } catch (error) {
      logger.error('Error initializing default dashboard', { userId, organizationId, error });
      throw new DashboardErrorClass(
        DashboardErrorType.API_ERROR,
        'Failed to initialize default dashboard',
        undefined,
        undefined,
        new Date(),
        { userId, organizationId },
        error instanceof Error ? error.stack : undefined
      );
    }
  }
} 
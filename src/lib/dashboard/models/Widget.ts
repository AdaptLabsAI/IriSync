// Widget Model - Dashboard widget data structure and utilities
// Production-ready model following existing codebase patterns

import { Timestamp } from 'firebase/firestore';
import { WidgetType, WidgetConfig, DashboardWidget } from '../types';

/**
 * Widget data interface for API operations
 */
export interface WidgetData {
  type: WidgetType;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings: Record<string, any>;
  isVisible: boolean;
  refreshInterval?: number;
  dataSource?: string;
  filters?: Record<string, any>;
  data?: any;
  lastUpdated?: Date;
}

/**
 * Widget interface for application use
 */
export interface Widget {
  id: string;
  userId: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings: Record<string, any>;
  isVisible: boolean;
  refreshInterval: number;
  dataSource?: string;
  filters?: Record<string, any>;
  data?: any;
  loading: boolean;
  error?: string;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firestore widget document structure
 */
export interface FirestoreWidget {
  userId: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings: Record<string, any>;
  isVisible: boolean;
  refreshInterval: number;
  dataSource?: string;
  filters?: Record<string, any>;
  data?: any;
  loading: boolean;
  error?: string;
  lastUpdated: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Widget utility functions
 */
export class WidgetUtils {
  /**
   * Convert Widget to Firestore format
   */
  static toFirestore(widget: Omit<Widget, 'id'>): FirestoreWidget {
    return {
      userId: widget.userId,
      dashboardId: widget.dashboardId,
      type: widget.type,
      title: widget.title,
      position: widget.position,
      settings: widget.settings,
      isVisible: widget.isVisible,
      refreshInterval: widget.refreshInterval,
      dataSource: widget.dataSource,
      filters: widget.filters,
      data: widget.data,
      loading: widget.loading,
      error: widget.error,
      lastUpdated: Timestamp.fromDate(widget.lastUpdated),
      createdAt: Timestamp.fromDate(widget.createdAt),
      updatedAt: Timestamp.fromDate(widget.updatedAt)
    };
  }

  /**
   * Convert Firestore document to Widget
   */
  static fromFirestore(doc: FirestoreWidget, id: string): Widget {
    return {
      id,
      userId: doc.userId,
      dashboardId: doc.dashboardId,
      type: doc.type,
      title: doc.title,
      position: doc.position,
      settings: doc.settings,
      isVisible: doc.isVisible,
      refreshInterval: doc.refreshInterval,
      dataSource: doc.dataSource,
      filters: doc.filters,
      data: doc.data,
      loading: doc.loading,
      error: doc.error,
      lastUpdated: doc.lastUpdated.toDate(),
      createdAt: doc.createdAt.toDate(),
      updatedAt: doc.updatedAt.toDate()
    };
  }

  /**
   * Create a new widget with default values
   */
  static create(data: WidgetData & { userId: string; dashboardId: string }): Omit<Widget, 'id'> {
    const now = new Date();
    
    return {
      userId: data.userId,
      dashboardId: data.dashboardId,
      type: data.type,
      title: data.title,
      position: data.position,
      settings: data.settings,
      isVisible: data.isVisible,
      refreshInterval: data.refreshInterval || 300, // 5 minutes default
      dataSource: data.dataSource,
      filters: data.filters,
      data: data.data,
      loading: false,
      error: undefined,
      lastUpdated: data.lastUpdated || now,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update widget with new data
   */
  static update(widget: Widget, updates: Partial<WidgetData>): Widget {
    return {
      ...widget,
      ...updates,
      updatedAt: new Date()
    };
  }

  /**
   * Validate widget configuration
   */
  static validate(widget: Partial<Widget>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!widget.type) {
      errors.push('Widget type is required');
    }

    if (!widget.title || widget.title.trim().length === 0) {
      errors.push('Widget title is required');
    }

    if (!widget.position) {
      errors.push('Widget position is required');
    } else {
      if (typeof widget.position.x !== 'number' || widget.position.x < 0) {
        errors.push('Widget position x must be a non-negative number');
      }
      if (typeof widget.position.y !== 'number' || widget.position.y < 0) {
        errors.push('Widget position y must be a non-negative number');
      }
      if (typeof widget.position.width !== 'number' || widget.position.width <= 0) {
        errors.push('Widget width must be a positive number');
      }
      if (typeof widget.position.height !== 'number' || widget.position.height <= 0) {
        errors.push('Widget height must be a positive number');
      }
    }

    if (widget.refreshInterval !== undefined && (typeof widget.refreshInterval !== 'number' || widget.refreshInterval < 30)) {
      errors.push('Widget refresh interval must be at least 30 seconds');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default widget configuration by type
   */
  static getDefaultConfig(type: WidgetType): Partial<WidgetConfig> {
    const defaults: Record<WidgetType, Partial<WidgetConfig>> = {
      [WidgetType.STATS]: {
        position: { x: 0, y: 0, width: 3, height: 2 },
        settings: { showComparison: true, showTrend: true },
        refreshInterval: 300
      },
      [WidgetType.CHART]: {
        position: { x: 0, y: 0, width: 6, height: 4 },
        settings: { chartType: 'line', showLegend: true, showGrid: true },
        refreshInterval: 300
      },
      [WidgetType.ACTIVITY]: {
        position: { x: 0, y: 0, width: 4, height: 6 },
        settings: { maxItems: 10, showTimestamp: true },
        refreshInterval: 60
      },
      [WidgetType.PLATFORM_OVERVIEW]: {
        position: { x: 0, y: 0, width: 8, height: 3 },
        settings: { showMetrics: true, showStatus: true },
        refreshInterval: 300
      },
      [WidgetType.PERFORMANCE_METRICS]: {
        position: { x: 0, y: 0, width: 6, height: 4 },
        settings: { showComparison: true, showBenchmark: true },
        refreshInterval: 300
      },
      [WidgetType.AUDIENCE_METRICS]: {
        position: { x: 0, y: 0, width: 6, height: 4 },
        settings: { showDemographics: true, showGrowth: true },
        refreshInterval: 600
      },
      [WidgetType.CONTENT_PERFORMANCE]: {
        position: { x: 0, y: 0, width: 8, height: 5 },
        settings: { maxPosts: 5, showEngagement: true },
        refreshInterval: 300
      },
      [WidgetType.UPCOMING_POSTS]: {
        position: { x: 0, y: 0, width: 4, height: 4 },
        settings: { maxPosts: 5, showPlatform: true },
        refreshInterval: 60
      },
      [WidgetType.NOTIFICATIONS]: {
        position: { x: 0, y: 0, width: 4, height: 6 },
        settings: { maxNotifications: 10, showTimestamp: true },
        refreshInterval: 30
      },
      [WidgetType.TOKEN_USAGE]: {
        position: { x: 0, y: 0, width: 3, height: 2 },
        settings: { showProgress: true, showReset: true },
        refreshInterval: 300
      }
    };

    return defaults[type] || {};
  }

  /**
   * Check if widget needs refresh
   */
  static needsRefresh(widget: Widget): boolean {
    if (!widget.refreshInterval) return false;
    
    const now = new Date();
    const lastUpdate = widget.lastUpdated;
    const refreshIntervalMs = widget.refreshInterval * 1000;
    
    return (now.getTime() - lastUpdate.getTime()) >= refreshIntervalMs;
  }

  /**
   * Get widget display name
   */
  static getDisplayName(type: WidgetType): string {
    const displayNames: Record<WidgetType, string> = {
      [WidgetType.STATS]: 'Statistics',
      [WidgetType.CHART]: 'Chart',
      [WidgetType.ACTIVITY]: 'Activity Feed',
      [WidgetType.PLATFORM_OVERVIEW]: 'Platform Overview',
      [WidgetType.PERFORMANCE_METRICS]: 'Performance Metrics',
      [WidgetType.AUDIENCE_METRICS]: 'Audience Metrics',
      [WidgetType.CONTENT_PERFORMANCE]: 'Content Performance',
      [WidgetType.UPCOMING_POSTS]: 'Upcoming Posts',
      [WidgetType.NOTIFICATIONS]: 'Notifications',
      [WidgetType.TOKEN_USAGE]: 'Token Usage'
    };

    return displayNames[type] || type;
  }
} 
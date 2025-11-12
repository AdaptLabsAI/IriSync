// DashboardConfig Model - Dashboard configuration data structure and utilities
// Production-ready model following existing codebase patterns

import { Timestamp } from 'firebase/firestore';
import { DashboardConfig, WidgetConfig } from '../types';

/**
 * Dashboard configuration data interface for API operations
 */
export interface DashboardConfigData {
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  layout: 'grid' | 'flex' | 'custom';
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: number;
  isDefault: boolean;
  isPublic: boolean;
}

/**
 * Dashboard configuration interface for application use
 */
export interface DashboardConfiguration {
  id: string;
  userId: string;
  organizationId?: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  layout: 'grid' | 'flex' | 'custom';
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: number;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firestore dashboard configuration document structure
 */
export interface FirestoreDashboardConfig {
  userId: string;
  organizationId?: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  layout: 'grid' | 'flex' | 'custom';
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: number;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Dashboard configuration utility functions
 */
export class DashboardConfigUtils {
  /**
   * Convert DashboardConfiguration to Firestore format
   */
  static toFirestore(config: Omit<DashboardConfiguration, 'id'>): FirestoreDashboardConfig {
    return {
      userId: config.userId,
      organizationId: config.organizationId,
      name: config.name,
      description: config.description,
      widgets: config.widgets,
      layout: config.layout,
      theme: config.theme,
      refreshInterval: config.refreshInterval,
      isDefault: config.isDefault,
      isPublic: config.isPublic,
      createdAt: Timestamp.fromDate(config.createdAt),
      updatedAt: Timestamp.fromDate(config.updatedAt)
    };
  }

  /**
   * Convert Firestore document to DashboardConfiguration
   */
  static fromFirestore(doc: FirestoreDashboardConfig, id: string): DashboardConfiguration {
    return {
      id,
      userId: doc.userId,
      organizationId: doc.organizationId,
      name: doc.name,
      description: doc.description,
      widgets: doc.widgets,
      layout: doc.layout,
      theme: doc.theme,
      refreshInterval: doc.refreshInterval,
      isDefault: doc.isDefault,
      isPublic: doc.isPublic,
      createdAt: doc.createdAt.toDate(),
      updatedAt: doc.updatedAt.toDate()
    };
  }

  /**
   * Create a new dashboard configuration with default values
   */
  static create(data: DashboardConfigData & { userId: string; organizationId?: string }): Omit<DashboardConfiguration, 'id'> {
    const now = new Date();
    
    return {
      userId: data.userId,
      organizationId: data.organizationId,
      name: data.name,
      description: data.description,
      widgets: data.widgets,
      layout: data.layout,
      theme: data.theme,
      refreshInterval: data.refreshInterval,
      isDefault: data.isDefault,
      isPublic: data.isPublic,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update dashboard configuration with new data
   */
  static update(config: DashboardConfiguration, updates: Partial<DashboardConfigData>): DashboardConfiguration {
    return {
      ...config,
      ...updates,
      updatedAt: new Date()
    };
  }

  /**
   * Validate dashboard configuration
   */
  static validate(config: Partial<DashboardConfiguration>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Dashboard name is required');
    }

    if (config.name && config.name.length > 100) {
      errors.push('Dashboard name must be 100 characters or less');
    }

    if (config.description && config.description.length > 500) {
      errors.push('Dashboard description must be 500 characters or less');
    }

    if (!config.layout || !['grid', 'flex', 'custom'].includes(config.layout)) {
      errors.push('Dashboard layout must be grid, flex, or custom');
    }

    if (!config.theme || !['light', 'dark', 'auto'].includes(config.theme)) {
      errors.push('Dashboard theme must be light, dark, or auto');
    }

    if (config.refreshInterval !== undefined && (typeof config.refreshInterval !== 'number' || config.refreshInterval < 30)) {
      errors.push('Dashboard refresh interval must be at least 30 seconds');
    }

    if (!Array.isArray(config.widgets)) {
      errors.push('Dashboard widgets must be an array');
    } else {
      // Validate each widget configuration
      config.widgets.forEach((widget, index) => {
        if (!widget.id) {
          errors.push(`Widget ${index + 1}: ID is required`);
        }
        if (!widget.type) {
          errors.push(`Widget ${index + 1}: Type is required`);
        }
        if (!widget.title) {
          errors.push(`Widget ${index + 1}: Title is required`);
        }
        if (!widget.position) {
          errors.push(`Widget ${index + 1}: Position is required`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default dashboard configuration
   */
  static getDefaultConfig(userId: string, organizationId?: string): Omit<DashboardConfiguration, 'id'> {
    const now = new Date();
    
    return {
      userId,
      organizationId,
      name: 'Default Dashboard',
      description: 'Your main dashboard with key metrics and insights',
      widgets: this.getDefaultWidgets(),
      layout: 'grid',
      theme: 'auto',
      refreshInterval: 300, // 5 minutes
      isDefault: true,
      isPublic: false,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Get default widget configurations
   */
  static getDefaultWidgets(): WidgetConfig[] {
    return [
      {
        id: 'stats-overview',
        type: 'stats' as any,
        title: 'Overview Stats',
        position: { x: 0, y: 0, width: 12, height: 2 },
        settings: { showComparison: true, showTrend: true },
        isVisible: true,
        refreshInterval: 300
      },
      {
        id: 'platform-overview',
        type: 'platform_overview' as any,
        title: 'Platform Overview',
        position: { x: 0, y: 2, width: 8, height: 3 },
        settings: { showMetrics: true, showStatus: true },
        isVisible: true,
        refreshInterval: 300
      },
      {
        id: 'upcoming-posts',
        type: 'upcoming_posts' as any,
        title: 'Upcoming Posts',
        position: { x: 8, y: 2, width: 4, height: 3 },
        settings: { maxPosts: 5, showPlatform: true },
        isVisible: true,
        refreshInterval: 60
      },
      {
        id: 'performance-chart',
        type: 'chart' as any,
        title: 'Performance Trends',
        position: { x: 0, y: 5, width: 8, height: 4 },
        settings: { chartType: 'line', showLegend: true, showGrid: true },
        isVisible: true,
        refreshInterval: 300
      },
      {
        id: 'activity-feed',
        type: 'activity' as any,
        title: 'Recent Activity',
        position: { x: 8, y: 5, width: 4, height: 4 },
        settings: { maxItems: 10, showTimestamp: true },
        isVisible: true,
        refreshInterval: 60
      }
    ];
  }

  /**
   * Clone dashboard configuration
   */
  static clone(config: DashboardConfiguration, newName: string): Omit<DashboardConfiguration, 'id'> {
    const now = new Date();
    
    return {
      ...config,
      name: newName,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      widgets: config.widgets.map(widget => ({
        ...widget,
        id: `${widget.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }))
    };
  }

  /**
   * Add widget to dashboard configuration
   */
  static addWidget(config: DashboardConfiguration, widget: WidgetConfig): DashboardConfiguration {
    return {
      ...config,
      widgets: [...config.widgets, widget],
      updatedAt: new Date()
    };
  }

  /**
   * Remove widget from dashboard configuration
   */
  static removeWidget(config: DashboardConfiguration, widgetId: string): DashboardConfiguration {
    return {
      ...config,
      widgets: config.widgets.filter(w => w.id !== widgetId),
      updatedAt: new Date()
    };
  }

  /**
   * Update widget in dashboard configuration
   */
  static updateWidget(config: DashboardConfiguration, widgetId: string, updates: Partial<WidgetConfig>): DashboardConfiguration {
    return {
      ...config,
      widgets: config.widgets.map(w => 
        w.id === widgetId ? { ...w, ...updates } : w
      ),
      updatedAt: new Date()
    };
  }

  /**
   * Reorder widgets in dashboard configuration
   */
  static reorderWidgets(config: DashboardConfiguration, widgetIds: string[]): DashboardConfiguration {
    const widgetMap = new Map(config.widgets.map(w => [w.id, w]));
    const reorderedWidgets = widgetIds
      .map(id => widgetMap.get(id))
      .filter(Boolean) as WidgetConfig[];
    
    return {
      ...config,
      widgets: reorderedWidgets,
      updatedAt: new Date()
    };
  }

  /**
   * Get widget by ID
   */
  static getWidget(config: DashboardConfiguration, widgetId: string): WidgetConfig | undefined {
    return config.widgets.find(w => w.id === widgetId);
  }

  /**
   * Check if dashboard has widget type
   */
  static hasWidgetType(config: DashboardConfiguration, type: string): boolean {
    return config.widgets.some(w => w.type === type);
  }

  /**
   * Get widgets by type
   */
  static getWidgetsByType(config: DashboardConfiguration, type: string): WidgetConfig[] {
    return config.widgets.filter(w => w.type === type);
  }

  /**
   * Calculate dashboard grid size
   */
  static calculateGridSize(config: DashboardConfiguration): { width: number; height: number } {
    if (config.widgets.length === 0) {
      return { width: 12, height: 6 };
    }

    const maxX = Math.max(...config.widgets.map(w => w.position.x + w.position.width));
    const maxY = Math.max(...config.widgets.map(w => w.position.y + w.position.height));

    return {
      width: Math.max(maxX, 12),
      height: Math.max(maxY, 6)
    };
  }
} 
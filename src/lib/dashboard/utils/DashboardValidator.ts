// DashboardValidator - Comprehensive validation utilities for dashboard components
// Production-ready validation following existing codebase patterns

import {
  DashboardConfig,
  WidgetConfig,
  WidgetType,
  MetricType,
  TimeRange,
  Platform,
  DashboardMetric,
  DashboardErrorClass,
  DashboardErrorType
} from '../types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100 validation score
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  recommendation?: string;
}

/**
 * DashboardValidator - Validates dashboard components and configurations
 */
export class DashboardValidator {
  
  /**
   * Validate complete dashboard configuration
   */
  static validateDashboard(dashboard: Partial<DashboardConfig>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic required fields
      if (!dashboard.name || dashboard.name.trim().length === 0) {
        errors.push({
          field: 'name',
          message: 'Dashboard name is required',
          code: 'DASHBOARD_NAME_REQUIRED',
          severity: 'critical'
        });
      }

      if (!dashboard.userId) {
        errors.push({
          field: 'userId',
          message: 'User ID is required',
          code: 'USER_ID_REQUIRED',
          severity: 'critical'
        });
      }

      // Name validation
      if (dashboard.name && dashboard.name.length > 100) {
        errors.push({
          field: 'name',
          message: 'Dashboard name must be 100 characters or less',
          code: 'DASHBOARD_NAME_TOO_LONG',
          severity: 'high'
        });
      }

      if (dashboard.name && dashboard.name.length < 3) {
        warnings.push({
          field: 'name',
          message: 'Dashboard name is very short',
          code: 'DASHBOARD_NAME_SHORT',
          recommendation: 'Consider using a more descriptive name'
        });
      }

      // Description validation
      if (dashboard.description && dashboard.description.length > 500) {
        errors.push({
          field: 'description',
          message: 'Dashboard description must be 500 characters or less',
          code: 'DASHBOARD_DESCRIPTION_TOO_LONG',
          severity: 'medium'
        });
      }

      // Layout validation
      if (dashboard.layout && !['grid', 'flex', 'custom'].includes(dashboard.layout)) {
        errors.push({
          field: 'layout',
          message: 'Dashboard layout must be grid, flex, or custom',
          code: 'INVALID_LAYOUT',
          severity: 'high'
        });
      }

      // Theme validation
      if (dashboard.theme && !['light', 'dark', 'auto'].includes(dashboard.theme)) {
        errors.push({
          field: 'theme',
          message: 'Dashboard theme must be light, dark, or auto',
          code: 'INVALID_THEME',
          severity: 'medium'
        });
      }

      // Refresh interval validation
      if (dashboard.refreshInterval !== undefined) {
        if (typeof dashboard.refreshInterval !== 'number' || dashboard.refreshInterval < 30) {
          errors.push({
            field: 'refreshInterval',
            message: 'Dashboard refresh interval must be at least 30 seconds',
            code: 'INVALID_REFRESH_INTERVAL',
            severity: 'medium'
          });
        } else if (dashboard.refreshInterval < 60) {
          warnings.push({
            field: 'refreshInterval',
            message: 'Very frequent refresh intervals may impact performance',
            code: 'FREQUENT_REFRESH_WARNING',
            recommendation: 'Consider using 60 seconds or more for better performance'
          });
        }
      }

      // Widgets validation
      if (!Array.isArray(dashboard.widgets)) {
        errors.push({
          field: 'widgets',
          message: 'Dashboard widgets must be an array',
          code: 'WIDGETS_NOT_ARRAY',
          severity: 'critical'
        });
      } else {
        // Validate each widget
        dashboard.widgets.forEach((widget, index) => {
          const widgetResult = this.validateWidget(widget);
          
          // Add widget-specific errors with field prefixes
          widgetResult.errors.forEach(error => {
            errors.push({
              ...error,
              field: `widgets[${index}].${error.field}`,
              message: `Widget ${index + 1}: ${error.message}`
            });
          });

          widgetResult.warnings.forEach(warning => {
            warnings.push({
              ...warning,
              field: `widgets[${index}].${warning.field}`,
              message: `Widget ${index + 1}: ${warning.message}`
            });
          });
        });

        // Check for widget overlaps in grid layout
        if (dashboard.layout === 'grid') {
          const overlaps = this.detectWidgetOverlaps(dashboard.widgets);
          overlaps.forEach(overlap => {
            warnings.push({
              field: 'widgets',
              message: `Widgets ${overlap.widget1} and ${overlap.widget2} may overlap`,
              code: 'WIDGET_OVERLAP_WARNING',
              recommendation: 'Adjust widget positions to avoid overlaps'
            });
          });
        }

        // Check widget count
        if (dashboard.widgets.length === 0) {
          warnings.push({
            field: 'widgets',
            message: 'Dashboard has no widgets',
            code: 'NO_WIDGETS_WARNING',
            recommendation: 'Add widgets to make the dashboard useful'
          });
        } else if (dashboard.widgets.length > 20) {
          warnings.push({
            field: 'widgets',
            message: 'Dashboard has many widgets',
            code: 'MANY_WIDGETS_WARNING',
            recommendation: 'Consider splitting into multiple dashboards for better performance'
          });
        }
      }

      // Calculate validation score
      const score = this.calculateValidationScore(errors, warnings);

      return {
        isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
        errors,
        warnings,
        score
      };
    } catch (error) {
      console.error('Error validating dashboard', { dashboard, error });
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: 'Validation failed due to internal error',
          code: 'VALIDATION_ERROR',
          severity: 'critical'
        }],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * Validate widget configuration
   */
  static validateWidget(widget: Partial<WidgetConfig>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!widget.id) {
      errors.push({
        field: 'id',
        message: 'Widget ID is required',
        code: 'WIDGET_ID_REQUIRED',
        severity: 'critical'
      });
    }

    if (!widget.type) {
      errors.push({
        field: 'type',
        message: 'Widget type is required',
        code: 'WIDGET_TYPE_REQUIRED',
        severity: 'critical'
      });
    } else if (!Object.values(WidgetType).includes(widget.type as WidgetType)) {
      errors.push({
        field: 'type',
        message: 'Invalid widget type',
        code: 'INVALID_WIDGET_TYPE',
        severity: 'high'
      });
    }

    if (!widget.title || widget.title.trim().length === 0) {
      errors.push({
        field: 'title',
        message: 'Widget title is required',
        code: 'WIDGET_TITLE_REQUIRED',
        severity: 'high'
      });
    }

    // Title length validation
    if (widget.title && widget.title.length > 100) {
      errors.push({
        field: 'title',
        message: 'Widget title must be 100 characters or less',
        code: 'WIDGET_TITLE_TOO_LONG',
        severity: 'medium'
      });
    }

    // Position validation
    if (!widget.position) {
      errors.push({
        field: 'position',
        message: 'Widget position is required',
        code: 'WIDGET_POSITION_REQUIRED',
        severity: 'critical'
      });
    } else {
      if (typeof widget.position.x !== 'number' || widget.position.x < 0) {
        errors.push({
          field: 'position.x',
          message: 'Widget X position must be a non-negative number',
          code: 'INVALID_POSITION_X',
          severity: 'high'
        });
      }

      if (typeof widget.position.y !== 'number' || widget.position.y < 0) {
        errors.push({
          field: 'position.y',
          message: 'Widget Y position must be a non-negative number',
          code: 'INVALID_POSITION_Y',
          severity: 'high'
        });
      }

      if (typeof widget.position.width !== 'number' || widget.position.width <= 0) {
        errors.push({
          field: 'position.width',
          message: 'Widget width must be a positive number',
          code: 'INVALID_POSITION_WIDTH',
          severity: 'high'
        });
      }

      if (typeof widget.position.height !== 'number' || widget.position.height <= 0) {
        errors.push({
          field: 'position.height',
          message: 'Widget height must be a positive number',
          code: 'INVALID_POSITION_HEIGHT',
          severity: 'high'
        });
      }

      // Size recommendations
      if (widget.position.width && widget.position.width > 12) {
        warnings.push({
          field: 'position.width',
          message: 'Widget is very wide',
          code: 'WIDGET_TOO_WIDE',
          recommendation: 'Consider reducing width for better layout'
        });
      }

      if (widget.position.height && widget.position.height > 8) {
        warnings.push({
          field: 'position.height',
          message: 'Widget is very tall',
          code: 'WIDGET_TOO_TALL',
          recommendation: 'Consider reducing height for better layout'
        });
      }
    }

    // Refresh interval validation
    if (widget.refreshInterval !== undefined) {
      if (typeof widget.refreshInterval !== 'number' || widget.refreshInterval < 30) {
        errors.push({
          field: 'refreshInterval',
          message: 'Widget refresh interval must be at least 30 seconds',
          code: 'INVALID_WIDGET_REFRESH_INTERVAL',
          severity: 'medium'
        });
      }
    }

    // Settings validation
    if (widget.settings && typeof widget.settings !== 'object') {
      errors.push({
        field: 'settings',
        message: 'Widget settings must be an object',
        code: 'INVALID_WIDGET_SETTINGS',
        severity: 'medium'
      });
    }

    const score = this.calculateValidationScore(errors, warnings);

    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings,
      score
    };
  }

  /**
   * Validate metric data
   */
  static validateMetric(metric: Partial<DashboardMetric>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!metric.id) {
      errors.push({
        field: 'id',
        message: 'Metric ID is required',
        code: 'METRIC_ID_REQUIRED',
        severity: 'critical'
      });
    }

    if (!metric.type) {
      errors.push({
        field: 'type',
        message: 'Metric type is required',
        code: 'METRIC_TYPE_REQUIRED',
        severity: 'critical'
      });
    } else if (!Object.values(MetricType).includes(metric.type as MetricType)) {
      errors.push({
        field: 'type',
        message: 'Invalid metric type',
        code: 'INVALID_METRIC_TYPE',
        severity: 'high'
      });
    }

    if (typeof metric.value !== 'number') {
      errors.push({
        field: 'value',
        message: 'Metric value must be a number',
        code: 'INVALID_METRIC_VALUE',
        severity: 'critical'
      });
    } else {
      // Value range validation
      if (metric.value < 0 && !this.isNegativeValueAllowed(metric.type)) {
        warnings.push({
          field: 'value',
          message: 'Metric has negative value',
          code: 'NEGATIVE_METRIC_VALUE',
          recommendation: 'Verify if negative values are expected for this metric type'
        });
      }

      if (metric.value > 1000000) {
        warnings.push({
          field: 'value',
          message: 'Metric has very large value',
          code: 'LARGE_METRIC_VALUE',
          recommendation: 'Consider using appropriate units or formatting'
        });
      }
    }

    // Time range validation
    if (!metric.timeRange) {
      errors.push({
        field: 'timeRange',
        message: 'Metric time range is required',
        code: 'METRIC_TIMERANGE_REQUIRED',
        severity: 'high'
      });
    } else if (!Object.values(TimeRange).includes(metric.timeRange as TimeRange)) {
      errors.push({
        field: 'timeRange',
        message: 'Invalid metric time range',
        code: 'INVALID_METRIC_TIMERANGE',
        severity: 'high'
      });
    }

    // Timestamp validation
    if (!metric.timestamp) {
      errors.push({
        field: 'timestamp',
        message: 'Metric timestamp is required',
        code: 'METRIC_TIMESTAMP_REQUIRED',
        severity: 'high'
      });
    } else if (!(metric.timestamp instanceof Date)) {
      errors.push({
        field: 'timestamp',
        message: 'Metric timestamp must be a Date object',
        code: 'INVALID_METRIC_TIMESTAMP',
        severity: 'high'
      });
    } else {
      // Check if timestamp is too old or in the future
      const now = new Date();
      const daysDiff = (now.getTime() - metric.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 365) {
        warnings.push({
          field: 'timestamp',
          message: 'Metric timestamp is very old',
          code: 'OLD_METRIC_TIMESTAMP',
          recommendation: 'Verify if this historical data is still relevant'
        });
      }

      if (metric.timestamp > now) {
        warnings.push({
          field: 'timestamp',
          message: 'Metric timestamp is in the future',
          code: 'FUTURE_METRIC_TIMESTAMP',
          recommendation: 'Check if the timestamp is correct'
        });
      }
    }

    // Platform validation
    if (metric.platform && !Object.values(Platform).includes(metric.platform as Platform)) {
      errors.push({
        field: 'platform',
        message: 'Invalid platform',
        code: 'INVALID_PLATFORM',
        severity: 'medium'
      });
    }

    const score = this.calculateValidationScore(errors, warnings);

    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings,
      score
    };
  }

  /**
   * Detect widget overlaps in grid layout
   */
  private static detectWidgetOverlaps(widgets: WidgetConfig[]): Array<{ widget1: number; widget2: number }> {
    const overlaps: Array<{ widget1: number; widget2: number }> = [];

    for (let i = 0; i < widgets.length; i++) {
      for (let j = i + 1; j < widgets.length; j++) {
        const widget1 = widgets[i];
        const widget2 = widgets[j];

        if (this.doWidgetsOverlap(widget1.position, widget2.position)) {
          overlaps.push({ widget1: i, widget2: j });
        }
      }
    }

    return overlaps;
  }

  /**
   * Check if two widget positions overlap
   */
  private static doWidgetsOverlap(
    pos1: { x: number; y: number; width: number; height: number },
    pos2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      pos1.x + pos1.width <= pos2.x ||
      pos2.x + pos2.width <= pos1.x ||
      pos1.y + pos1.height <= pos2.y ||
      pos2.y + pos2.height <= pos1.y
    );
  }

  /**
   * Check if negative values are allowed for a metric type
   */
  private static isNegativeValueAllowed(metricType?: MetricType): boolean {
    const allowNegative = [
      MetricType.GROWTH_RATE,
      MetricType.SENTIMENT_SCORE
    ];
    
    return metricType ? allowNegative.includes(metricType) : false;
  }

  /**
   * Calculate validation score based on errors and warnings
   */
  private static calculateValidationScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    let score = 100;

    // Deduct points for errors
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    // Deduct points for warnings
    warnings.forEach(() => {
      score -= 2;
    });

    return Math.max(0, score);
  }

  /**
   * Validate data integrity across multiple metrics
   */
  static validateDataIntegrity(metrics: DashboardMetric[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for duplicate metrics
    const metricKeys = new Set<string>();
    metrics.forEach((metric, index) => {
      const key = `${metric.type}-${metric.platform}-${metric.timeRange}`;
      if (metricKeys.has(key)) {
        warnings.push({
          field: `metrics[${index}]`,
          message: 'Duplicate metric detected',
          code: 'DUPLICATE_METRIC',
          recommendation: 'Remove or consolidate duplicate metrics'
        });
      }
      metricKeys.add(key);
    });

    // Check for inconsistent time ranges
    const timeRanges = new Set(metrics.map(m => m.timeRange));
    if (timeRanges.size > 3) {
      warnings.push({
        field: 'metrics',
        message: 'Many different time ranges in metrics',
        code: 'INCONSISTENT_TIME_RANGES',
        recommendation: 'Consider standardizing time ranges for better comparison'
      });
    }

    const score = this.calculateValidationScore(errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score
    };
  }
} 
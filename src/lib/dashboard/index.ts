// Dashboard Library Main Export
// Centralized exports for all Dashboard functionality

// Types
export type {
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
  DashboardError,
  DashboardErrorClass,
  DashboardErrorType,
  CacheConfig,
  RealTimeConfig,
  AggregationConfig,
  DashboardApiResponse,
  PaginationParams,
  SearchParams,
  MetricsCalculationParams,
  WidgetRefreshParams,
  DashboardExportConfig,
  RealTimeUpdateEvent,
  PerformanceBenchmark
} from './types';

// Models
export type { Widget, WidgetData, FirestoreWidget, WidgetUtils } from './models/Widget';
export type { Metrics, MetricsData, FirestoreMetrics, MetricsUtils } from './models/Metrics';
export type { DashboardConfiguration, DashboardConfigData, FirestoreDashboardConfig, DashboardConfigUtils } from './models/DashboardConfig';

export { DashboardService } from './DashboardService';

// Analytics Components
export { MetricsCalculator } from './analytics/MetricsCalculator';
export { PerformanceAnalyzer } from './analytics/PerformanceAnalyzer';
export { AudienceAnalyzer } from './analytics/AudienceAnalyzer';
export { TrendAnalyzer } from './analytics/TrendAnalyzer';

// Widget Components
export { WidgetFactory } from './widgets/WidgetFactory';

// Data Components
export { DataAggregator } from './data/DataAggregator';
export { CacheManager } from './data/CacheManager';
export { RealTimeUpdater } from './data/RealTimeUpdater';

// Utility Components - Import from utils index
export { 
  DashboardValidator,
  MetricsFormatter,
  ChartDataProcessor
} from './utils';

// Utility Types - Import from utils index
export type { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  FormatOptions, 
  FormattedMetric,
  ChartDataPoint, 
  ChartDataset, 
  ProcessedChartData, 
  ChartOptions, 
  ChartProcessingOptions 
} from './utils';

// End of exports 
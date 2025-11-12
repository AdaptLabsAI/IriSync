import { Timestamp } from 'firebase/firestore';
import { MetricDefinition } from './metrics';

/**
 * Report status
 */
export enum ReportStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ARCHIVED = 'archived'
}

/**
 * Report type
 */
export enum ReportType {
  PERFORMANCE = 'performance',
  CONTENT = 'content',
  AUDIENCE = 'audience',
  ENGAGEMENT = 'engagement',
  CONVERSION = 'conversion',
  COMPETITOR = 'competitor',
  CUSTOM = 'custom'
}

/**
 * Report timeframe
 */
export enum ReportTimeframe {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom'
}

/**
 * Report format
 */
export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
  HTML = 'html'
}

/**
 * Chart type
 */
export enum ChartType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter',
  RADAR = 'radar',
  TABLE = 'table',
  NUMBER = 'number',
  HEATMAP = 'heatmap',
  COMPARISON = 'comparison'
}

/**
 * Report chart configuration
 */
export interface ReportChart {
  id: string;
  type: ChartType;
  title: string;
  description?: string;
  metrics: string[]; // Array of metric IDs
  dimensions: string[]; // Dimensions to group by
  filters?: Record<string, any>;
  sort?: {
    metric: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
  visualization: {
    colors?: string[];
    showLegend: boolean;
    showLabels: boolean;
    stacked?: boolean;
    includeZero?: boolean;
    minValue?: number;
    maxValue?: number;
  };
}

/**
 * Report configuration
 */
export interface ReportDefinition {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  timeframe: ReportTimeframe;
  dateRange?: {
    start: string;
    end: string;
  };
  metrics: string[]; // Array of metric IDs
  charts: ReportChart[];
  filters?: Record<string, any>;
  comparisonPeriod?: {
    type: 'previous_period' | 'previous_year' | 'custom';
    customRange?: {
      start: string;
      end: string;
    };
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 where 0 is Sunday
    dayOfMonth?: number; // 1-31
    time?: string; // HH:MM in 24-hour format
    timezone?: string; // e.g., 'America/New_York'
  };
  delivery?: {
    email?: string[];
    saveToLibrary: boolean;
    formats: ReportFormat[];
  };
  platformIds?: string[]; // Array of platform IDs to include
  tags?: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastGenerated?: Timestamp;
  status: ReportStatus;
}

/**
 * Report instance (a generated report)
 */
export interface ReportInstance {
  id: string;
  definitionId: string;
  name: string;
  description?: string;
  status: ReportStatus;
  generatedAt: Timestamp;
  completedAt?: Timestamp;
  errorMessage?: string;
  dateRange: {
    start: string;
    end: string;
  };
  comparisonRange?: {
    start: string;
    end: string;
  };
  metrics: {
    metric: MetricDefinition;
    values: {
      date: string;
      value: number;
    }[];
    summary: {
      current: number;
      previous?: number;
      change?: number;
      changePercentage?: number;
    };
  }[];
  charts: (ReportChart & {
    data: any; // Chart data in a format ready for rendering
  })[];
  fileUrls?: Record<ReportFormat, string>;
  downloadCount: number;
  insights?: string; // AI-generated insights
  createdBy: string;
  viewedBy: string[];
  sharedWith?: string[];
}

/**
 * Report scheduling configuration
 */
export interface ReportSchedule {
  id: string;
  reportId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 where 0 is Sunday
  dayOfMonth?: number; // 1-31
  time: string; // HH:MM in 24-hour format
  timezone: string; // e.g., 'America/New_York'
  isEnabled: boolean;
  recipients: string[];
  formats: ReportFormat[];
  includeComparison: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastRun?: Timestamp;
  nextRun?: Timestamp;
}

/**
 * Report delivery log
 */
export interface ReportDeliveryLog {
  id: string;
  reportId: string;
  reportInstanceId: string;
  deliveredAt: Timestamp;
  recipients: string[];
  formats: ReportFormat[];
  status: 'success' | 'partial' | 'failed';
  errorDetails?: Record<string, string>;
}

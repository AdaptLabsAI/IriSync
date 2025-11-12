import { Timestamp } from 'firebase/firestore';
import { TimePeriod } from './events';

/**
 * Supported metric data types
 */
export enum MetricType {
  COUNT = 'count',
  PERCENTAGE = 'percentage',
  RATIO = 'ratio',
  CURRENCY = 'currency',
  DURATION = 'duration',
  NUMBER = 'number',
  BOOLEAN = 'boolean'
}

/**
 * Supported comparison methods for metrics
 */
export enum ComparisonMethod {
  ABSOLUTE = 'absolute',
  PERCENTAGE = 'percentage',
  RATIO = 'ratio'
}

/**
 * Metric trend direction
 */
export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  NEUTRAL = 'neutral'
}

/**
 * Valuation of a trend
 */
export enum TrendValuation {
  POSITIVE = 'positive', // Up and good (e.g., revenue increase)
  NEGATIVE = 'negative', // Down and bad (e.g., conversion rate decrease)
  NEUTRAL = 'neutral'    // No clear valuation or stable
}

/**
 * Definition of a KPI metric
 */
export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  type: MetricType;
  formula: string; // Could be a simple reference or a complex formula
  unit?: string;
  decimalPlaces?: number;
  isHigherBetter: boolean; // Whether higher values are better
  includeInDashboard: boolean;
  defaultComparisonPeriod: TimePeriod;
  tags: string[];
  benchmarks?: {
    industry?: number;
    internal?: number;
    competitor?: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Metric value for a specific time period
 */
export interface MetricValue {
  id: string;
  metricId: string;
  date: string;
  value: number;
  periodType: TimePeriod;
  organizationId?: string;
  platformId?: string;
  tags?: string[];
}

/**
 * Metric with actual value and comparison
 */
export interface MetricWithComparison {
  metric: MetricDefinition;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  trendDirection: TrendDirection;
  trendValuation: TrendValuation;
  comparisonPeriod: TimePeriod;
  comparisonLabel: string; // e.g., "vs. Previous Month"
  benchmarkDifference?: {
    industry?: number;
    internal?: number;
    competitor?: number;
  };
}

/**
 * Dashboard metric card configuration
 */
export interface DashboardMetricConfig {
  id: string;
  metricId: string;
  userId: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visualization: 'number' | 'sparkline' | 'bar' | 'line' | 'pie';
  comparisonPeriod: TimePeriod;
  showChange: boolean;
  showTrend: boolean;
  showBenchmarks: boolean;
  customLabel?: string;
  customColor?: string;
  filters?: Record<string, any>;
}

/**
 * Report configuration for metrics
 */
export interface MetricReportConfig {
  id: string;
  name: string;
  description: string;
  metrics: string[]; // Array of metric IDs
  filters: Record<string, any>;
  dateRange: {
    start: string;
    end: string;
  };
  comparisonPeriod?: TimePeriod;
  visualizations: {
    type: 'table' | 'bar' | 'line' | 'pie' | 'area' | 'radar';
    metrics: string[];
    title: string;
    description?: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
  scheduledDelivery?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6, where 0 is Sunday
    dayOfMonth?: number; // 1-31
    recipients: string[]; // Email addresses
    format: 'pdf' | 'csv' | 'excel';
    includeNotes: boolean;
  };
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastGenerated?: Timestamp;
}

/**
 * Alert configuration for metric thresholds
 */
export interface MetricAlert {
  id: string;
  metricId: string;
  name: string;
  condition: 'above' | 'below' | 'equal' | 'changes_by';
  threshold: number;
  thresholdType: 'absolute' | 'percentage';
  comparisonPeriod?: TimePeriod;
  checkFrequency: 'realtime' | 'hourly' | 'daily';
  notificationChannels: {
    email?: string[];
    slack?: string;
    webhook?: string;
    inApp?: boolean;
  };
  isEnabled: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastTriggered?: Timestamp;
  snoozeUntil?: Timestamp;
}

/**
 * Alert event record
 */
export interface MetricAlertEvent {
  id: string;
  alertId: string;
  metricId: string;
  triggeredAt: Timestamp;
  value: number;
  threshold: number;
  notificationsDelivered: {
    channel: 'email' | 'slack' | 'webhook' | 'inApp';
    recipient: string;
    status: 'delivered' | 'failed';
    time: Timestamp;
  }[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Timestamp;
}

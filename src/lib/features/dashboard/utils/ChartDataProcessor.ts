// ChartDataProcessor - Chart data processing utilities for dashboard visualizations
// Production-ready chart data processing following existing codebase patterns

import {
  DashboardMetric,
  MetricType,
  Platform,
  TimeRange
} from '../types';

/**
 * Chart data point interface
 */
export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

/**
 * Chart dataset interface
 */
export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  type?: 'line' | 'bar' | 'area';
}

/**
 * Processed chart data interface
 */
export interface ProcessedChartData {
  labels: string[];
  datasets: ChartDataset[];
  options?: ChartOptions;
  metadata?: {
    totalDataPoints: number;
    dateRange?: { start: Date; end: Date };
    platforms?: Platform[];
    metricTypes?: MetricType[];
  };
}

/**
 * Chart options interface
 */
export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  scales?: {
    x?: ScaleOptions;
    y?: ScaleOptions;
  };
  plugins?: {
    legend?: LegendOptions;
    tooltip?: TooltipOptions;
  };
  animation?: AnimationOptions;
}

/**
 * Scale options interface
 */
export interface ScaleOptions {
  type?: 'linear' | 'logarithmic' | 'time' | 'category';
  display?: boolean;
  title?: {
    display: boolean;
    text: string;
  };
  min?: number;
  max?: number;
  beginAtZero?: boolean;
}

/**
 * Legend options interface
 */
export interface LegendOptions {
  display?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  labels?: {
    usePointStyle?: boolean;
    padding?: number;
  };
}

/**
 * Tooltip options interface
 */
export interface TooltipOptions {
  enabled?: boolean;
  mode?: 'point' | 'nearest' | 'index' | 'dataset';
  intersect?: boolean;
  callbacks?: {
    label?: (context: any) => string;
    title?: (context: any) => string;
  };
}

/**
 * Animation options interface
 */
export interface AnimationOptions {
  duration?: number;
  easing?: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
  delay?: number;
}

/**
 * Chart processing options
 */
export interface ChartProcessingOptions {
  chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  groupBy?: 'time' | 'platform' | 'metric';
  timeGranularity?: 'hour' | 'day' | 'week' | 'month';
  aggregation?: 'sum' | 'average' | 'max' | 'min' | 'count';
  fillMissingData?: boolean;
  smoothing?: boolean;
  colorScheme?: 'default' | 'vibrant' | 'pastel' | 'monochrome';
  maxDataPoints?: number;
  sortBy?: 'value' | 'label' | 'date';
  sortOrder?: 'asc' | 'desc';
}

/**
 * ChartDataProcessor - Processes dashboard metrics for chart visualization
 */
export class ChartDataProcessor {
  private static readonly DEFAULT_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6B7280'  // Gray
  ];

  private static readonly PLATFORM_COLORS: Record<Platform, string> = {
    [Platform.FACEBOOK]: '#1877F2',
    [Platform.INSTAGRAM]: '#E4405F',
    [Platform.TWITTER]: '#1DA1F2',
    [Platform.LINKEDIN]: '#0A66C2',
    [Platform.TIKTOK]: '#000000',
    [Platform.YOUTUBE]: '#FF0000',
    [Platform.PINTEREST]: '#BD081C',
    [Platform.REDDIT]: '#FF4500',
    [Platform.MASTODON]: '#6364FF',
    [Platform.THREADS]: '#000000',
    [Platform.HUBSPOT]: '#FF7A59',
    [Platform.SALESFORCE]: '#00A1E0',
    [Platform.ZOHO]: '#C83E3E',
    [Platform.PIPEDRIVE]: '#1A1A1A',
    [Platform.DYNAMICS]: '#0078D4',
    [Platform.SUGARCRM]: '#E61718'
  };

  /**
   * Process metrics for time series chart
   */
  static processTimeSeriesData(
    metrics: DashboardMetric[],
    options: ChartProcessingOptions = {}
  ): ProcessedChartData {
    const {
      chartType = 'line',
      timeGranularity = 'day',
      aggregation = 'sum',
      fillMissingData = true,
      smoothing = false,
      colorScheme = 'default',
      maxDataPoints = 100
    } = options;

    // Group metrics by time
    const timeGroups = this.groupMetricsByTime(metrics, timeGranularity);
    
    // Aggregate data points
    const aggregatedData = this.aggregateTimeSeriesData(timeGroups, aggregation);
    
    // Fill missing data points if requested
    const processedData = fillMissingData 
      ? this.fillMissingTimePoints(aggregatedData, timeGranularity)
      : aggregatedData;

    // Limit data points if necessary
    const limitedData = this.limitDataPoints(processedData, maxDataPoints);

    // Apply smoothing if requested
    const finalData = smoothing ? this.applySmoothingToTimeSeries(limitedData) : limitedData;

    // Create chart datasets
    const datasets: ChartDataset[] = [{
      label: 'Metrics',
      data: finalData.map(point => ({
        x: point.date,
        y: point.value,
        label: this.formatTimeLabel(point.date, timeGranularity)
      })),
      backgroundColor: this.getColor(0, colorScheme),
      borderColor: this.getColor(0, colorScheme),
      borderWidth: 2,
      fill: chartType === 'area',
      tension: smoothing ? 0.4 : 0
    }];

    const labels = finalData.map(point => this.formatTimeLabel(point.date, timeGranularity));

    return {
      labels,
      datasets,
      options: this.getTimeSeriesChartOptions(chartType, timeGranularity),
      metadata: {
        totalDataPoints: finalData.length,
        dateRange: finalData.length > 0 ? {
          start: finalData[0].date,
          end: finalData[finalData.length - 1].date
        } : undefined,
        metricTypes: Array.from(new Set(metrics.map(m => m.type)))
      }
    };
  }

  /**
   * Process metrics for platform comparison chart
   */
  static processPlatformComparisonData(
    metrics: DashboardMetric[],
    options: ChartProcessingOptions = {}
  ): ProcessedChartData {
    const {
      chartType = 'bar',
      aggregation = 'sum',
      colorScheme = 'default',
      sortBy = 'value',
      sortOrder = 'desc'
    } = options;

    // Group metrics by platform
    const platformGroups = this.groupMetricsByPlatform(metrics);
    
    // Aggregate data for each platform
    const aggregatedData = Object.entries(platformGroups).map(([platform, platformMetrics]) => ({
      platform: platform as Platform,
      value: this.aggregateMetricValues(platformMetrics, aggregation),
      count: platformMetrics.length
    }));

    // Sort data
    const sortedData = this.sortPlatformData(aggregatedData, sortBy, sortOrder);

    // Create chart datasets
    const datasets: ChartDataset[] = [{
      label: 'Platform Metrics',
      data: sortedData.map((item, index) => ({
        x: item.platform,
        y: item.value,
        label: this.getPlatformDisplayName(item.platform),
        color: this.getPlatformColor(item.platform)
      })),
      backgroundColor: sortedData.map(item => this.getPlatformColor(item.platform)) as string[],
      borderColor: sortedData.map(item => this.getPlatformColor(item.platform)) as string[],
      borderWidth: 1
    }];

    const labels = sortedData.map(item => this.getPlatformDisplayName(item.platform));

    return {
      labels,
      datasets,
      options: this.getPlatformComparisonChartOptions(chartType),
      metadata: {
        totalDataPoints: sortedData.length,
        platforms: sortedData.map(item => item.platform),
        metricTypes: Array.from(new Set(metrics.map(m => m.type)))
      }
    };
  }

  /**
   * Process metrics for metric type distribution chart
   */
  static processMetricDistributionData(
    metrics: DashboardMetric[],
    options: ChartProcessingOptions = {}
  ): ProcessedChartData {
    const {
      chartType = 'pie',
      aggregation = 'sum',
      colorScheme = 'vibrant',
      sortBy = 'value',
      sortOrder = 'desc'
    } = options;

    // Group metrics by type
    const metricGroups = this.groupMetricsByType(metrics);
    
    // Aggregate data for each metric type
    const aggregatedData = Object.entries(metricGroups).map(([metricType, typeMetrics]) => ({
      metricType: metricType as MetricType,
      value: this.aggregateMetricValues(typeMetrics, aggregation),
      count: typeMetrics.length
    }));

    // Sort data
    const sortedData = this.sortMetricData(aggregatedData, sortBy, sortOrder);

    // Create chart datasets
    const datasets: ChartDataset[] = [{
      label: 'Metric Distribution',
      data: sortedData.map((item, index) => ({
        x: item.metricType,
        y: item.value,
        label: this.getMetricDisplayName(item.metricType),
        color: this.getColor(index, colorScheme)
      })),
      backgroundColor: sortedData.map((_, index) => this.getColor(index, colorScheme)) as string[],
      borderColor: '#ffffff',
      borderWidth: 2
    }];

    const labels = sortedData.map(item => this.getMetricDisplayName(item.metricType));

    return {
      labels,
      datasets,
      options: this.getDistributionChartOptions(chartType),
      metadata: {
        totalDataPoints: sortedData.length,
        metricTypes: Array.from(new Set(metrics.map(m => m.type)))
      }
    };
  }

  /**
   * Process metrics for multi-series comparison
   */
  static processMultiSeriesData(
    metrics: DashboardMetric[],
    groupByField: 'platform' | 'metric',
    options: ChartProcessingOptions = {}
  ): ProcessedChartData {
    const {
      chartType = 'line',
      timeGranularity = 'day',
      aggregation = 'sum',
      colorScheme = 'default',
      maxDataPoints = 100
    } = options;

    // Group metrics by the specified field and time
    const groupedData = groupByField === 'platform' 
      ? this.groupMetricsByPlatformAndTime(metrics, timeGranularity)
      : this.groupMetricsByTypeAndTime(metrics, timeGranularity);

    // Create datasets for each group
    const datasets: ChartDataset[] = Object.entries(groupedData).map(([groupKey, timeData], index) => {
      const aggregatedData = this.aggregateTimeSeriesData(timeData, aggregation);
      const limitedData = this.limitDataPoints(aggregatedData, maxDataPoints);

      return {
        label: groupByField === 'platform' 
          ? this.getPlatformDisplayName(groupKey as Platform)
          : this.getMetricDisplayName(groupKey as MetricType),
        data: limitedData.map(point => ({
          x: point.date,
          y: point.value,
          label: this.formatTimeLabel(point.date, timeGranularity)
        })),
        backgroundColor: groupByField === 'platform'
          ? this.getPlatformColor(groupKey as Platform)
          : this.getColor(index, colorScheme),
        borderColor: groupByField === 'platform'
          ? this.getPlatformColor(groupKey as Platform)
          : this.getColor(index, colorScheme),
        borderWidth: 2,
        fill: chartType === 'area',
        tension: 0.1
      };
    });

    // Get all unique time points for labels
    const allTimePoints = new Set<string>();
    Object.values(groupedData).forEach(timeData => {
      Object.keys(timeData).forEach(timePoint => allTimePoints.add(timePoint));
    });

    const sortedTimePoints = Array.from(allTimePoints).sort();
    const labels = sortedTimePoints.map(timePoint => 
      this.formatTimeLabel(new Date(timePoint), timeGranularity)
    );

    return {
      labels,
      datasets,
      options: this.getMultiSeriesChartOptions(chartType, timeGranularity),
      metadata: {
        totalDataPoints: datasets.reduce((sum, dataset) => sum + dataset.data.length, 0),
        platforms: groupByField === 'platform' ? Object.keys(groupedData) as Platform[] : undefined,
        metricTypes: groupByField === 'metric' ? Object.keys(groupedData) as MetricType[] : undefined
      }
    };
  }

  /**
   * Group metrics by time period
   */
  private static groupMetricsByTime(
    metrics: DashboardMetric[],
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): Record<string, DashboardMetric[]> {
    const groups: Record<string, DashboardMetric[]> = {};

    metrics.forEach(metric => {
      const timeKey = this.getTimeKey(metric.timestamp, granularity);
      if (!groups[timeKey]) {
        groups[timeKey] = [];
      }
      groups[timeKey].push(metric);
    });

    return groups;
  }

  /**
   * Group metrics by platform
   */
  private static groupMetricsByPlatform(metrics: DashboardMetric[]): Record<string, DashboardMetric[]> {
    const groups: Record<string, DashboardMetric[]> = {};

    metrics.forEach(metric => {
      const platform = metric.platform || 'unknown';
      if (!groups[platform]) {
        groups[platform] = [];
      }
      groups[platform].push(metric);
    });

    return groups;
  }

  /**
   * Group metrics by type
   */
  private static groupMetricsByType(metrics: DashboardMetric[]): Record<string, DashboardMetric[]> {
    const groups: Record<string, DashboardMetric[]> = {};

    metrics.forEach(metric => {
      const type = metric.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(metric);
    });

    return groups;
  }

  /**
   * Group metrics by platform and time
   */
  private static groupMetricsByPlatformAndTime(
    metrics: DashboardMetric[],
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): Record<string, Record<string, DashboardMetric[]>> {
    const groups: Record<string, Record<string, DashboardMetric[]>> = {};

    metrics.forEach(metric => {
      const platform = metric.platform || 'unknown';
      const timeKey = this.getTimeKey(metric.timestamp, granularity);

      if (!groups[platform]) {
        groups[platform] = {};
      }
      if (!groups[platform][timeKey]) {
        groups[platform][timeKey] = [];
      }
      groups[platform][timeKey].push(metric);
    });

    return groups;
  }

  /**
   * Group metrics by type and time
   */
  private static groupMetricsByTypeAndTime(
    metrics: DashboardMetric[],
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): Record<string, Record<string, DashboardMetric[]>> {
    const groups: Record<string, Record<string, DashboardMetric[]>> = {};

    metrics.forEach(metric => {
      const type = metric.type;
      const timeKey = this.getTimeKey(metric.timestamp, granularity);

      if (!groups[type]) {
        groups[type] = {};
      }
      if (!groups[type][timeKey]) {
        groups[type][timeKey] = [];
      }
      groups[type][timeKey].push(metric);
    });

    return groups;
  }

  /**
   * Get time key for grouping
   */
  private static getTimeKey(date: Date, granularity: 'hour' | 'day' | 'week' | 'month'): string {
    const d = new Date(date);
    
    switch (granularity) {
      case 'hour':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}`;
      case 'day':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}`;
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      default:
        return d.toISOString().split('T')[0];
    }
  }

  /**
   * Aggregate time series data
   */
  private static aggregateTimeSeriesData(
    timeGroups: Record<string, DashboardMetric[]>,
    aggregation: 'sum' | 'average' | 'max' | 'min' | 'count'
  ): Array<{ date: Date; value: number }> {
    return Object.entries(timeGroups).map(([timeKey, metrics]) => ({
      date: this.parseTimeKey(timeKey),
      value: this.aggregateMetricValues(metrics, aggregation)
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Aggregate metric values
   */
  private static aggregateMetricValues(
    metrics: DashboardMetric[],
    aggregation: 'sum' | 'average' | 'max' | 'min' | 'count'
  ): number {
    if (metrics.length === 0) return 0;

    const values = metrics.map(m => m.value);

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, value) => sum + value, 0);
      case 'average':
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      case 'count':
        return values.length;
      default:
        return values.reduce((sum, value) => sum + value, 0);
    }
  }

  /**
   * Parse time key back to Date
   */
  private static parseTimeKey(timeKey: string): Date {
    // Handle different time key formats
    if (timeKey.includes('-W')) {
      // Week format: YYYY-WNN
      const [year, week] = timeKey.split('-W');
      const date = new Date(parseInt(year), 0, 1);
      date.setDate(date.getDate() + (parseInt(week) - 1) * 7);
      return date;
    } else if (timeKey.split('-').length === 4) {
      // Hour format: YYYY-MM-DD-HH
      const [year, month, day, hour] = timeKey.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour));
    } else if (timeKey.split('-').length === 3) {
      // Day format: YYYY-MM-DD
      const [year, month, day] = timeKey.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      // Month format: YYYY-MM
      const [year, month] = timeKey.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, 1);
    }
  }

  /**
   * Fill missing time points
   */
  private static fillMissingTimePoints(
    data: Array<{ date: Date; value: number }>,
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): Array<{ date: Date; value: number }> {
    if (data.length < 2) return data;

    const result: Array<{ date: Date; value: number }> = [];
    const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (let i = 0; i < sortedData.length - 1; i++) {
      result.push(sortedData[i]);

      const current = sortedData[i].date;
      const next = sortedData[i + 1].date;
      const missingPoints = this.generateMissingTimePoints(current, next, granularity);

      missingPoints.forEach(date => {
        result.push({ date, value: 0 });
      });
    }

    result.push(sortedData[sortedData.length - 1]);
    return result;
  }

  /**
   * Generate missing time points between two dates
   */
  private static generateMissingTimePoints(
    start: Date,
    end: Date,
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): Date[] {
    const points: Date[] = [];
    const current = new Date(start);

    while (current < end) {
      switch (granularity) {
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }

      if (current < end) {
        points.push(new Date(current));
      }
    }

    return points;
  }

  /**
   * Apply smoothing to time series data
   */
  private static applySmoothingToTimeSeries(
    data: Array<{ date: Date; value: number }>
  ): Array<{ date: Date; value: number }> {
    if (data.length < 3) return data;

    const smoothed = [...data];
    const windowSize = Math.min(3, Math.floor(data.length / 10));

    for (let i = windowSize; i < data.length - windowSize; i++) {
      let sum = 0;
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        sum += data[j].value;
      }
      smoothed[i].value = sum / (2 * windowSize + 1);
    }

    return smoothed;
  }

  /**
   * Limit data points to maximum
   */
  private static limitDataPoints<T>(data: T[], maxPoints: number): T[] {
    if (data.length <= maxPoints) return data;

    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % step === 0);
  }

  /**
   * Sort platform data
   */
  private static sortPlatformData(
    data: Array<{ platform: Platform; value: number; count: number }>,
    sortBy: 'value' | 'label' | 'date',
    sortOrder: 'asc' | 'desc'
  ): Array<{ platform: Platform; value: number; count: number }> {
    const sorted = [...data].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'label':
          comparison = a.platform.localeCompare(b.platform);
          break;
        default:
          comparison = a.value - b.value;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * Sort metric data
   */
  private static sortMetricData(
    data: Array<{ metricType: MetricType; value: number; count: number }>,
    sortBy: 'value' | 'label' | 'date',
    sortOrder: 'asc' | 'desc'
  ): Array<{ metricType: MetricType; value: number; count: number }> {
    const sorted = [...data].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'label':
          comparison = a.metricType.localeCompare(b.metricType);
          break;
        default:
          comparison = a.value - b.value;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * Format time label
   */
  private static formatTimeLabel(date: Date, granularity: 'hour' | 'day' | 'week' | 'month'): string {
    switch (granularity) {
      case 'hour':
        return date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric' 
        });
      case 'day':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case 'week':
        return `Week of ${date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })}`;
      case 'month':
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
      default:
        return date.toLocaleDateString();
    }
  }

  /**
   * Get color for chart elements
   */
  private static getColor(index: number, scheme: 'default' | 'vibrant' | 'pastel' | 'monochrome'): string {
    const colors = this.getColorScheme(scheme);
    return colors[index % colors.length];
  }

  /**
   * Get color scheme
   */
  private static getColorScheme(scheme: 'default' | 'vibrant' | 'pastel' | 'monochrome'): string[] {
    switch (scheme) {
      case 'vibrant':
        return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
      case 'pastel':
        return ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFD1FF', '#E0BBE4', '#C7CEEA'];
      case 'monochrome':
        return ['#2D3748', '#4A5568', '#718096', '#A0AEC0', '#CBD5E0', '#E2E8F0', '#F7FAFC'];
      default:
        return this.DEFAULT_COLORS;
    }
  }

  /**
   * Get platform color
   */
  private static getPlatformColor(platform: Platform): string {
    return this.PLATFORM_COLORS[platform] || this.DEFAULT_COLORS[0];
  }

  /**
   * Get platform display name
   */
  private static getPlatformDisplayName(platform: Platform): string {
    const names: Record<Platform, string> = {
      [Platform.FACEBOOK]: 'Facebook',
      [Platform.INSTAGRAM]: 'Instagram',
      [Platform.TWITTER]: 'Twitter',
      [Platform.LINKEDIN]: 'LinkedIn',
      [Platform.TIKTOK]: 'TikTok',
      [Platform.YOUTUBE]: 'YouTube',
      [Platform.PINTEREST]: 'Pinterest',
      [Platform.REDDIT]: 'Reddit',
      [Platform.MASTODON]: 'Mastodon',
      [Platform.THREADS]: 'Threads',
      [Platform.HUBSPOT]: 'HubSpot',
      [Platform.SALESFORCE]: 'Salesforce',
      [Platform.ZOHO]: 'Zoho',
      [Platform.PIPEDRIVE]: 'Pipedrive',
      [Platform.DYNAMICS]: 'Dynamics 365',
      [Platform.SUGARCRM]: 'SugarCRM'
    };

    return names[platform] || platform;
  }

  /**
   * Get metric display name
   */
  private static getMetricDisplayName(metricType: MetricType): string {
    const names: Record<MetricType, string> = {
      [MetricType.ENGAGEMENT]: 'Engagement',
      [MetricType.REACH]: 'Reach',
      [MetricType.IMPRESSIONS]: 'Impressions',
      [MetricType.FOLLOWERS]: 'Followers',
      [MetricType.LIKES]: 'Likes',
      [MetricType.COMMENTS]: 'Comments',
      [MetricType.SHARES]: 'Shares',
      [MetricType.CLICKS]: 'Clicks',
      [MetricType.CONVERSIONS]: 'Conversions',
      [MetricType.REVENUE]: 'Revenue',
      [MetricType.POSTS_PUBLISHED]: 'Posts',
      [MetricType.RESPONSE_TIME]: 'Response Time',
      [MetricType.SENTIMENT_SCORE]: 'Sentiment',
      [MetricType.GROWTH_RATE]: 'Growth Rate',
      [MetricType.ENGAGEMENT_RATE]: 'Engagement Rate'
    };

    return names[metricType] || metricType;
  }

  /**
   * Get chart options for time series
   */
  private static getTimeSeriesChartOptions(
    chartType: string,
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          display: true,
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          type: 'linear',
          display: true,
          title: {
            display: true,
            text: 'Value'
          },
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false
        }
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuad'
      }
    };
  }

  /**
   * Get chart options for platform comparison
   */
  private static getPlatformComparisonChartOptions(chartType: string): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'category',
          display: true,
          title: {
            display: true,
            text: 'Platform'
          }
        },
        y: {
          type: 'linear',
          display: true,
          title: {
            display: true,
            text: 'Value'
          },
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          mode: 'point'
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuad'
      }
    };
  }

  /**
   * Get chart options for distribution charts
   */
  private static getDistributionChartOptions(chartType: string): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((sum: number, item: any) => sum + item.y, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        duration: 1200,
        easing: 'easeInOutQuad'
      }
    };
  }

  /**
   * Get chart options for multi-series charts
   */
  private static getMultiSeriesChartOptions(
    chartType: string,
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          display: true,
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          type: 'linear',
          display: true,
          title: {
            display: true,
            text: 'Value'
          },
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false
        }
      },
      animation: {
        duration: 800,
        easing: 'easeInOutQuad'
      }
    };
  }
} 
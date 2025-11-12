// MetricsFormatter - Comprehensive formatting utilities for dashboard metrics
// Production-ready formatting following existing codebase patterns

import {
  MetricType,
  DashboardMetric,
  Platform,
  TimeRange
} from '../types';

/**
 * Formatting options interface
 */
export interface FormatOptions {
  locale?: string;
  currency?: string;
  precision?: number;
  compact?: boolean;
  showSign?: boolean;
  showUnit?: boolean;
  customUnit?: string;
}

/**
 * Formatted metric result interface
 */
export interface FormattedMetric {
  value: string;
  unit?: string;
  change?: string;
  changeIcon?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'red' | 'blue' | 'gray';
  tooltip?: string;
}

/**
 * MetricsFormatter - Formats dashboard metrics for display
 */
export class MetricsFormatter {
  private static readonly DEFAULT_LOCALE = 'en-US';
  private static readonly DEFAULT_CURRENCY = 'USD';

  /**
   * Format a dashboard metric for display
   */
  static formatMetric(
    metric: DashboardMetric,
    options: FormatOptions = {}
  ): FormattedMetric {
    const {
      locale = this.DEFAULT_LOCALE,
      precision,
      compact = false,
      showSign = false,
      showUnit = true,
      customUnit
    } = options;

    // Format the main value
    const formattedValue = this.formatValue(
      metric.value,
      metric.type,
      { locale, precision, compact, showSign, customUnit }
    );

    // Format change if available
    let formattedChange: string | undefined;
    let changeIcon: 'up' | 'down' | 'neutral' | undefined;
    let color: 'green' | 'red' | 'blue' | 'gray' = 'blue';

    if (metric.change !== undefined && metric.changePercentage !== undefined) {
      formattedChange = this.formatChange(metric.changePercentage, { locale, showSign: true });
      changeIcon = this.getChangeIcon(metric.change);
      color = this.getChangeColor(metric.change, metric.type);
    }

    // Get unit
    const unit = showUnit ? (customUnit || this.getMetricUnit(metric.type)) : undefined;

    // Generate tooltip
    const tooltip = this.generateTooltip(metric, options);

    return {
      value: formattedValue,
      unit,
      change: formattedChange,
      changeIcon,
      color,
      tooltip
    };
  }

  /**
   * Format a numeric value based on metric type
   */
  static formatValue(
    value: number,
    metricType: MetricType,
    options: Partial<FormatOptions> = {}
  ): string {
    const {
      locale = this.DEFAULT_LOCALE,
      precision,
      compact = false,
      showSign = false,
      customUnit
    } = options;

    // Handle special cases
    if (isNaN(value) || !isFinite(value)) {
      return 'N/A';
    }

    // Determine formatting based on metric type
    switch (metricType) {
      case MetricType.REVENUE:
        return this.formatCurrency(value, { locale, compact, precision });

      case MetricType.ENGAGEMENT_RATE:
      case MetricType.GROWTH_RATE:
        return this.formatPercentage(value, { locale, precision: precision ?? 1, showSign });

      case MetricType.SENTIMENT_SCORE:
        return this.formatDecimal(value, { locale, precision: precision ?? 2, showSign });

      case MetricType.RESPONSE_TIME:
        return this.formatDuration(value, { compact });

      case MetricType.FOLLOWERS:
      case MetricType.REACH:
      case MetricType.IMPRESSIONS:
      case MetricType.LIKES:
      case MetricType.COMMENTS:
      case MetricType.SHARES:
      case MetricType.CLICKS:
      case MetricType.CONVERSIONS:
      case MetricType.POSTS_PUBLISHED:
        return this.formatNumber(value, { locale, compact, precision: precision ?? 0 });

      case MetricType.ENGAGEMENT:
        return this.formatNumber(value, { locale, compact, precision: precision ?? 0 });

      default:
        return this.formatNumber(value, { locale, compact, precision });
    }
  }

  /**
   * Format currency values
   */
  static formatCurrency(
    value: number,
    options: { locale?: string; currency?: string; compact?: boolean; precision?: number } = {}
  ): string {
    const {
      locale = this.DEFAULT_LOCALE,
      currency = this.DEFAULT_CURRENCY,
      compact = false,
      precision
    } = options;

    if (compact && Math.abs(value) >= 1000) {
      return this.formatCompactCurrency(value, locale, currency);
    }

    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: precision ?? (value % 1 === 0 ? 0 : 2),
      maximumFractionDigits: precision ?? 2
    });

    return formatter.format(value);
  }

  /**
   * Format compact currency (e.g., $1.2K, $3.4M)
   */
  private static formatCompactCurrency(value: number, locale: string, currency: string): string {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    let formattedValue: string;
    let suffix: string;

    if (absValue >= 1e9) {
      formattedValue = (absValue / 1e9).toFixed(1);
      suffix = 'B';
    } else if (absValue >= 1e6) {
      formattedValue = (absValue / 1e6).toFixed(1);
      suffix = 'M';
    } else if (absValue >= 1e3) {
      formattedValue = (absValue / 1e3).toFixed(1);
      suffix = 'K';
    } else {
      return this.formatCurrency(value, { locale, currency, compact: false });
    }

    // Remove trailing .0
    formattedValue = formattedValue.replace(/\.0$/, '');

    const currencySymbol = this.getCurrencySymbol(currency, locale);
    return `${sign}${currencySymbol}${formattedValue}${suffix}`;
  }

  /**
   * Format percentage values
   */
  static formatPercentage(
    value: number,
    options: { locale?: string; precision?: number; showSign?: boolean } = {}
  ): string {
    const {
      locale = this.DEFAULT_LOCALE,
      precision = 1,
      showSign = false
    } = options;

    const formatter = new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
      signDisplay: showSign ? 'always' : 'auto'
    });

    return formatter.format(value / 100);
  }

  /**
   * Format decimal numbers
   */
  static formatDecimal(
    value: number,
    options: { locale?: string; precision?: number; showSign?: boolean } = {}
  ): string {
    const {
      locale = this.DEFAULT_LOCALE,
      precision = 2,
      showSign = false
    } = options;

    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
      signDisplay: showSign ? 'always' : 'auto'
    });

    return formatter.format(value);
  }

  /**
   * Format large numbers with compact notation
   */
  static formatNumber(
    value: number,
    options: { locale?: string; compact?: boolean; precision?: number } = {}
  ): string {
    const {
      locale = this.DEFAULT_LOCALE,
      compact = false,
      precision = 0
    } = options;

    if (compact && Math.abs(value) >= 1000) {
      return this.formatCompactNumber(value, locale, precision);
    }

    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });

    return formatter.format(value);
  }

  /**
   * Format compact numbers (e.g., 1.2K, 3.4M)
   */
  private static formatCompactNumber(value: number, locale: string, precision: number): string {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    let formattedValue: string;
    let suffix: string;

    if (absValue >= 1e9) {
      formattedValue = (absValue / 1e9).toFixed(precision);
      suffix = 'B';
    } else if (absValue >= 1e6) {
      formattedValue = (absValue / 1e6).toFixed(precision);
      suffix = 'M';
    } else if (absValue >= 1e3) {
      formattedValue = (absValue / 1e3).toFixed(precision);
      suffix = 'K';
    } else {
      return this.formatNumber(value, { locale, compact: false, precision });
    }

    // Remove trailing zeros after decimal
    formattedValue = formattedValue.replace(/\.?0+$/, '');

    return `${sign}${formattedValue}${suffix}`;
  }

  /**
   * Format duration values (in seconds)
   */
  static formatDuration(
    seconds: number,
    options: { compact?: boolean } = {}
  ): string {
    const { compact = false } = options;

    if (seconds < 60) {
      return compact ? `${Math.round(seconds)}s` : `${Math.round(seconds)} seconds`;
    }

    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      
      if (compact) {
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
      } else {
        return remainingSeconds > 0 
          ? `${minutes} min ${remainingSeconds} sec` 
          : `${minutes} minutes`;
      }
    }

    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    
    if (compact) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else {
      return remainingMinutes > 0 
        ? `${hours} hr ${remainingMinutes} min` 
        : `${hours} hours`;
    }
  }

  /**
   * Format change values
   */
  static formatChange(
    changePercentage: number,
    options: { locale?: string; showSign?: boolean } = {}
  ): string {
    const { locale = this.DEFAULT_LOCALE, showSign = true } = options;

    return this.formatPercentage(changePercentage, { locale, showSign, precision: 1 });
  }

  /**
   * Get change icon based on change value
   */
  static getChangeIcon(change: number): 'up' | 'down' | 'neutral' {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'neutral';
  }

  /**
   * Get change color based on change value and metric type
   */
  static getChangeColor(change: number, metricType: MetricType): 'green' | 'red' | 'blue' | 'gray' {
    if (change === 0) return 'gray';

    // For most metrics, positive change is good (green)
    const positiveIsGood = ![
      MetricType.RESPONSE_TIME // Lower response time is better
    ].includes(metricType);

    if (positiveIsGood) {
      return change > 0 ? 'green' : 'red';
    } else {
      return change > 0 ? 'red' : 'green';
    }
  }

  /**
   * Get metric unit
   */
  static getMetricUnit(metricType: MetricType): string | undefined {
    const units: Partial<Record<MetricType, string>> = {
      [MetricType.ENGAGEMENT_RATE]: '%',
      [MetricType.GROWTH_RATE]: '%',
      [MetricType.RESPONSE_TIME]: 'avg',
      [MetricType.SENTIMENT_SCORE]: '/10'
    };

    return units[metricType];
  }

  /**
   * Generate tooltip text for a metric
   */
  static generateTooltip(metric: DashboardMetric, options: FormatOptions = {}): string {
    const parts: string[] = [];

    // Add metric type and platform
    const metricName = this.getMetricDisplayName(metric.type);
    parts.push(metricName);

    if (metric.platform) {
      const platformName = this.getPlatformDisplayName(metric.platform);
      parts.push(`on ${platformName}`);
    }

    // Add time range
    const timeRangeName = this.getTimeRangeDisplayName(metric.timeRange);
    parts.push(`for ${timeRangeName}`);

    // Add change information if available
    if (metric.change !== undefined && metric.changePercentage !== undefined) {
      const changeText = metric.change > 0 ? 'increased' : metric.change < 0 ? 'decreased' : 'unchanged';
      const changeValue = this.formatChange(metric.changePercentage, { showSign: false });
      parts.push(`(${changeText} by ${changeValue})`);
    }

    return parts.join(' ');
  }

  /**
   * Get display name for metric type
   */
  static getMetricDisplayName(metricType: MetricType): string {
    const names: Record<MetricType, string> = {
      [MetricType.ENGAGEMENT]: 'Total Engagement',
      [MetricType.REACH]: 'Reach',
      [MetricType.IMPRESSIONS]: 'Impressions',
      [MetricType.FOLLOWERS]: 'Followers',
      [MetricType.LIKES]: 'Likes',
      [MetricType.COMMENTS]: 'Comments',
      [MetricType.SHARES]: 'Shares',
      [MetricType.CLICKS]: 'Clicks',
      [MetricType.CONVERSIONS]: 'Conversions',
      [MetricType.REVENUE]: 'Revenue',
      [MetricType.POSTS_PUBLISHED]: 'Posts Published',
      [MetricType.RESPONSE_TIME]: 'Response Time',
      [MetricType.SENTIMENT_SCORE]: 'Sentiment Score',
      [MetricType.GROWTH_RATE]: 'Growth Rate',
      [MetricType.ENGAGEMENT_RATE]: 'Engagement Rate'
    };

    return names[metricType] || metricType;
  }

  /**
   * Get display name for platform
   */
  static getPlatformDisplayName(platform: Platform): string {
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
   * Get display name for time range
   */
  static getTimeRangeDisplayName(timeRange: TimeRange): string {
    const names: Record<TimeRange, string> = {
      [TimeRange.LAST_24_HOURS]: 'last 24 hours',
      [TimeRange.LAST_7_DAYS]: 'last 7 days',
      [TimeRange.LAST_30_DAYS]: 'last 30 days',
      [TimeRange.LAST_90_DAYS]: 'last 90 days',
      [TimeRange.LAST_6_MONTHS]: 'last 6 months',
      [TimeRange.LAST_YEAR]: 'last year',
      [TimeRange.CUSTOM]: 'custom period'
    };

    return names[timeRange] || timeRange;
  }

  /**
   * Get currency symbol for a currency code
   */
  private static getCurrencySymbol(currency: string, locale: string): string {
    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });

      const parts = formatter.formatToParts(0);
      const currencyPart = parts.find(part => part.type === 'currency');
      return currencyPart?.value || currency;
    } catch {
      return currency;
    }
  }

  /**
   * Format multiple metrics for comparison
   */
  static formatMetricsComparison(
    metrics: DashboardMetric[],
    options: FormatOptions = {}
  ): Array<FormattedMetric & { label: string }> {
    return metrics.map(metric => ({
      ...this.formatMetric(metric, options),
      label: this.getMetricDisplayName(metric.type)
    }));
  }

  /**
   * Format metric for table display
   */
  static formatMetricForTable(
    metric: DashboardMetric,
    options: FormatOptions = {}
  ): {
    value: string;
    change: string;
    changeColor: string;
    rawValue: number;
    rawChange?: number;
  } {
    const formatted = this.formatMetric(metric, options);
    
    return {
      value: formatted.value + (formatted.unit ? ` ${formatted.unit}` : ''),
      change: formatted.change || 'N/A',
      changeColor: formatted.color || 'gray',
      rawValue: metric.value,
      rawChange: metric.change
    };
  }
} 
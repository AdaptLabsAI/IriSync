import { 
  MetricDefinition, 
  MetricValue, 
  TrendDirection, 
  TrendValuation 
} from '../models/metrics';
import { TimePeriod } from '../models/events';
import { formatDate } from './time-series';

/**
 * Comparison result for metrics
 */
export interface MetricComparison {
  metricId: string;
  metricName: string;
  current: {
    value: number;
    period: string;
  };
  previous: {
    value: number;
    period: string;
  };
  change: number;
  changePercentage: number;
  trendDirection: TrendDirection;
  trendValuation: TrendValuation;
  isHigherBetter: boolean;
  comparisonLabel: string;
  unit?: string;
}

/**
 * Calculate comparison between two periods for a metric
 * @param metric The metric definition
 * @param currentValue Current period value
 * @param previousValue Previous period value
 * @param currentPeriod Current period description
 * @param previousPeriod Previous period description
 * @returns Metric comparison result
 */
export function compareMetric(
  metric: MetricDefinition,
  currentValue: number,
  previousValue: number,
  currentPeriod: string,
  previousPeriod: string
): MetricComparison {
  // Calculate changes
  const change = currentValue - previousValue;
  const changePercentage = previousValue !== 0 ? (change / previousValue) * 100 : 0;
  
  // Determine trend direction
  let trendDirection: TrendDirection = TrendDirection.NEUTRAL;
  if (change > 0) {
    trendDirection = TrendDirection.UP;
  } else if (change < 0) {
    trendDirection = TrendDirection.DOWN;
  }
  
  // Determine valuation of the trend
  let trendValuation: TrendValuation = TrendValuation.NEUTRAL;
  if (trendDirection !== TrendDirection.NEUTRAL) {
    const isPositiveTrend = metric.isHigherBetter 
      ? trendDirection === TrendDirection.UP 
      : trendDirection === TrendDirection.DOWN;
      
    trendValuation = isPositiveTrend 
      ? TrendValuation.POSITIVE 
      : TrendValuation.NEGATIVE;
  }
  
  return {
    metricId: metric.id,
    metricName: metric.name,
    current: {
      value: currentValue,
      period: currentPeriod
    },
    previous: {
      value: previousValue,
      period: previousPeriod
    },
    change,
    changePercentage,
    trendDirection,
    trendValuation,
    isHigherBetter: metric.isHigherBetter,
    comparisonLabel: `vs. ${previousPeriod}`,
    unit: metric.unit
  };
}

/**
 * Calculate the date range for a previous period relative to a current period
 * @param currentStartDate Current period start date
 * @param currentEndDate Current period end date
 * @param comparisonType The type of comparison
 * @returns Previous period date range
 */
export function calculatePreviousPeriod(
  currentStartDate: string,
  currentEndDate: string,
  comparisonType: 'previous_period' | 'previous_year' | 'same_period_last_year' = 'previous_period'
): { startDate: string, endDate: string } {
  const startDate = new Date(currentStartDate);
  const endDate = new Date(currentEndDate);
  
  // Calculate the duration of the current period in milliseconds
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
  
  // Clone the dates
  const previousStart = new Date(startDate);
  const previousEnd = new Date(endDate);
  
  if (comparisonType === 'previous_year' || comparisonType === 'same_period_last_year') {
    // Go back one year
    previousStart.setFullYear(previousStart.getFullYear() - 1);
    previousEnd.setFullYear(previousEnd.getFullYear() - 1);
  } else {
    // Default: previous period of same duration
    previousStart.setDate(previousStart.getDate() - durationDays);
    previousEnd.setDate(previousEnd.getDate() - durationDays);
  }
  
  return {
    startDate: formatDate(previousStart),
    endDate: formatDate(previousEnd)
  };
}

/**
 * Generate a human-readable label for a period
 * @param startDate Start date
 * @param endDate End date
 * @returns Human-readable period label
 */
export function generatePeriodLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check if this is a single day
  if (startDate === endDate) {
    return startDate;
  }
  
  // Check if this is a month
  if (
    start.getDate() === 1 && 
    end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate() &&
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  
  // Check if this is a quarter
  const quarterMonths = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11]];
  const startQ = Math.floor(start.getMonth() / 3);
  const endQ = Math.floor(end.getMonth() / 3);
  
  if (
    startQ === endQ &&
    start.getDate() === 1 &&
    end.getDate() === new Date(end.getFullYear(), (endQ + 1) * 3, 0).getDate() &&
    start.getMonth() === startQ * 3 &&
    end.getMonth() === (endQ * 3) + 2 &&
    start.getFullYear() === end.getFullYear()
  ) {
    return `Q${startQ + 1} ${start.getFullYear()}`;
  }
  
  // Check if this is a year
  if (
    start.getDate() === 1 &&
    start.getMonth() === 0 &&
    end.getMonth() === 11 &&
    end.getDate() === 31 &&
    start.getFullYear() === end.getFullYear()
  ) {
    return start.getFullYear().toString();
  }
  
  // Default: simplified date range
  return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

/**
 * Detect the time period type from a date range
 * @param startDate Start date
 * @param endDate End date
 * @returns Detected time period type
 */
export function detectTimePeriod(startDate: string, endDate: string): TimePeriod {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculate the duration of the period in days
  const durationMs = end.getTime() - start.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
  
  // Check if this is a single day
  if (durationDays === 0) {
    return TimePeriod.DAY;
  }
  
  // Check if this is approximately a week (6-8 days)
  if (durationDays >= 6 && durationDays <= 8) {
    return TimePeriod.WEEK;
  }
  
  // Check if this is a month
  if (
    start.getDate() === 1 && 
    end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate() &&
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return TimePeriod.MONTH;
  }
  
  // Check if this is a quarter (around 90 days)
  if (durationDays >= 88 && durationDays <= 92) {
    return TimePeriod.QUARTER;
  }
  
  // Check if this is a year (364-366 days)
  if (durationDays >= 364 && durationDays <= 366) {
    return TimePeriod.YEAR;
  }
  
  // Default to the most appropriate based on duration
  if (durationDays <= 31) {
    return TimePeriod.MONTH;
  } else if (durationDays <= 100) {
    return TimePeriod.QUARTER;
  } else {
    return TimePeriod.YEAR;
  }
}

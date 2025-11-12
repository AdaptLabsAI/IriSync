import { Timestamp } from 'firebase/firestore';
import { MetricValue } from '../models/metrics';
import { TimePeriod } from '../models/events';

/**
 * Time-series data point interface
 */
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
}

/**
 * Time-series data interface
 */
export interface TimeSeriesData {
  data: TimeSeriesDataPoint[];
  metric: string;
  unit?: string;
  total: number;
  average: number;
  min: number;
  max: number;
  previousTotal?: number;
  previousAverage?: number;
  totalChange?: number;
  totalChangePercentage?: number;
}

/**
 * Generate a time-series dataset from metric values
 * @param metricValues Array of metric values
 * @param previousValues Optional array of previous period values for comparison
 * @param metricId The metric ID
 * @param unit Optional unit of measurement
 * @returns Time-series data
 */
export function generateTimeSeries(
  metricValues: MetricValue[],
  previousValues: MetricValue[] = [],
  metricId: string,
  unit?: string
): TimeSeriesData {
  // Sort by date
  const sortedValues = [...metricValues].sort((a, b) => a.date.localeCompare(b.date));
  const sortedPrevious = [...previousValues].sort((a, b) => a.date.localeCompare(b.date));
  
  // Generate data points
  const dataPoints: TimeSeriesDataPoint[] = sortedValues.map(value => {
    // Find matching previous value if available
    const previousIndex = sortedPrevious.findIndex(
      p => p.date.substring(8) === value.date.substring(8)
    );
    
    const previousValue = previousIndex >= 0 ? sortedPrevious[previousIndex].value : undefined;
    let change: number | undefined;
    let changePercentage: number | undefined;
    
    if (previousValue !== undefined) {
      change = value.value - previousValue;
      changePercentage = previousValue !== 0 ? (change / previousValue) * 100 : 0;
    }
    
    return {
      date: value.date,
      value: value.value,
      previousValue,
      change,
      changePercentage
    };
  });
  
  // Calculate summary statistics
  const total = dataPoints.reduce((sum, point) => sum + point.value, 0);
  const average = dataPoints.length > 0 ? total / dataPoints.length : 0;
  const min = dataPoints.length > 0 ? Math.min(...dataPoints.map(p => p.value)) : 0;
  const max = dataPoints.length > 0 ? Math.max(...dataPoints.map(p => p.value)) : 0;
  
  // Calculate previous period totals if available
  const previousTotal = sortedPrevious.reduce((sum, value) => sum + value.value, 0);
  const previousAverage = sortedPrevious.length > 0 ? previousTotal / sortedPrevious.length : 0;
  
  // Calculate total changes
  const totalChange = previousTotal > 0 ? total - previousTotal : undefined;
  const totalChangePercentage = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : undefined;
  
  return {
    data: dataPoints,
    metric: metricId,
    unit,
    total,
    average,
    min,
    max,
    previousTotal: previousTotal > 0 ? previousTotal : undefined,
    previousAverage: previousAverage > 0 ? previousAverage : undefined,
    totalChange,
    totalChangePercentage
  };
}

/**
 * Generate date ranges for a given period
 * @param periodType The time period type
 * @param count The number of periods to generate
 * @param endDate Optional end date, defaults to today
 * @returns Array of date ranges
 */
export function generateDateRanges(
  periodType: TimePeriod,
  count: number,
  endDate: Date = new Date()
): Array<{start: string, end: string}> {
  const ranges: Array<{start: string, end: string}> = [];
  const end = new Date(endDate);
  
  for (let i = 0; i < count; i++) {
    let start: Date;
    
    // Clone the end date to use as the start of this range
    const rangeEnd = new Date(end);
    
    switch (periodType) {
      case TimePeriod.DAY:
        // Start is the same day for daily
        start = new Date(rangeEnd);
        break;
        
      case TimePeriod.WEEK:
        // Start is 6 days earlier (7 day period)
        start = new Date(rangeEnd);
        start.setDate(start.getDate() - 6);
        break;
        
      case TimePeriod.MONTH:
        // Start is the first day of the month
        start = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
        break;
        
      case TimePeriod.QUARTER:
        // Start is the first day of the quarter
        const quarter = Math.floor(rangeEnd.getMonth() / 3);
        start = new Date(rangeEnd.getFullYear(), quarter * 3, 1);
        break;
        
      case TimePeriod.YEAR:
        // Start is the first day of the year
        start = new Date(rangeEnd.getFullYear(), 0, 1);
        break;
        
      default:
        start = new Date(rangeEnd);
        break;
    }
    
    // Format dates as YYYY-MM-DD
    const startStr = formatDate(start);
    const endStr = formatDate(rangeEnd);
    
    // Add to ranges
    ranges.push({
      start: startStr,
      end: endStr
    });
    
    // Move end date back for next iteration based on period type
    switch (periodType) {
      case TimePeriod.DAY:
        end.setDate(end.getDate() - 1);
        break;
        
      case TimePeriod.WEEK:
        end.setDate(end.getDate() - 7);
        break;
        
      case TimePeriod.MONTH:
        end.setMonth(end.getMonth() - 1);
        break;
        
      case TimePeriod.QUARTER:
        end.setMonth(end.getMonth() - 3);
        break;
        
      case TimePeriod.YEAR:
        end.setFullYear(end.getFullYear() - 1);
        break;
    }
  }
  
  return ranges;
}

/**
 * Format a date as YYYY-MM-DD
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate a list of dates between start and end dates
 * @param startDate Start date
 * @param endDate End date
 * @param includeTime Whether to include time in the result
 * @returns Array of date strings
 */
export function generateDateList(
  startDate: string, 
  endDate: string,
  includeTime: boolean = false
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Ensure start is before or equal to end
  if (start > end) {
    return [];
  }
  
  // Clone start date to avoid modifying the original
  const current = new Date(start);
  
  // Generate dates until we reach the end date
  while (current <= end) {
    if (includeTime) {
      dates.push(current.toISOString());
    } else {
      dates.push(formatDate(current));
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Fill in missing dates in a time series to ensure continuity
 * @param data Existing time-series data points
 * @param startDate Start date
 * @param endDate End date
 * @returns Complete time-series with no gaps
 */
export function fillMissingDates(
  data: TimeSeriesDataPoint[],
  startDate: string,
  endDate: string
): TimeSeriesDataPoint[] {
  // Generate a complete list of dates in the range
  const allDates = generateDateList(startDate, endDate);
  
  // Create a map of existing data points
  const dataMap = new Map<string, TimeSeriesDataPoint>();
  data.forEach(point => {
    dataMap.set(point.date, point);
  });
  
  // Create the complete time series with no gaps
  return allDates.map(date => {
    if (dataMap.has(date)) {
      return dataMap.get(date)!;
    } else {
      // Create an empty data point for missing dates
      return {
        date,
        value: 0
      };
    }
  });
}

import { Timestamp } from 'firebase/firestore';
import logger from '../../../core/logging/logger';

/**
 * Trend direction
 */
export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
  FLUCTUATING = 'fluctuating'
}

/**
 * Anomaly type
 */
export enum AnomalyType {
  SPIKE = 'spike',
  DROP = 'drop',
  SUSTAINED_INCREASE = 'sustained_increase',
  SUSTAINED_DECREASE = 'sustained_decrease',
  PATTERN_BREAK = 'pattern_break'
}

/**
 * Anomaly detection result
 */
export interface Anomaly {
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  percentDeviation: number;
  type: AnomalyType;
  confidence: number;
  context?: string;
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  direction: TrendDirection;
  slope: number;
  strength: number; // 0-1 scale where 1 is a perfect trend
  startValue: number;
  endValue: number;
  changePercent: number;
  timeSpan: {
    start: Date;
    end: Date;
    durationDays: number;
  };
  anomalies: Anomaly[];
  forecast?: {
    nextValue: number;
    confidence: number;
  };
}

/**
 * Data point for time series analysis
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Moving average type
 */
export enum MovingAverageType {
  SIMPLE = 'simple',
  WEIGHTED = 'weighted',
  EXPONENTIAL = 'exponential'
}

/**
 * Simple moving average calculation
 * @param data Array of time series points
 * @param windowSize Size of the moving window (number of points)
 * @returns Array of smoothed values
 */
export function calculateSMA(data: TimeSeriesPoint[], windowSize: number): number[] {
  if (data.length < windowSize) {
    return data.map(point => point.value);
  }

  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      // Not enough data for full window, use average of available points
      const slice = data.slice(0, i + 1);
      const avg = slice.reduce((sum, point) => sum + point.value, 0) / slice.length;
      result.push(avg);
    } else {
      // Full window available
      const slice = data.slice(i - windowSize + 1, i + 1);
      const avg = slice.reduce((sum, point) => sum + point.value, 0) / windowSize;
      result.push(avg);
    }
  }
  
  return result;
}

/**
 * Exponential moving average calculation
 * @param data Array of time series points
 * @param alpha Smoothing factor (0-1)
 * @returns Array of smoothed values
 */
export function calculateEMA(data: TimeSeriesPoint[], alpha: number): number[] {
  if (data.length === 0) return [];
  if (data.length === 1) return [data[0].value];
  
  const result: number[] = [data[0].value];
  
  for (let i = 1; i < data.length; i++) {
    const currentValue = data[i].value;
    const previousEMA = result[i - 1];
    const ema = alpha * currentValue + (1 - alpha) * previousEMA;
    result.push(ema);
  }
  
  return result;
}

/**
 * Calculate linear regression for trend detection
 * @param data Array of time series points
 * @returns Slope, intercept, and r-squared of the regression line
 */
export function calculateLinearRegression(data: TimeSeriesPoint[]): { slope: number; intercept: number; rSquared: number } {
  if (data.length < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }
  
  // Convert timestamps to numeric values (milliseconds since epoch)
  const x = data.map(point => point.timestamp.getTime());
  const y = data.map(point => point.value);
  
  const n = data.length;
  
  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY);
    denominator += (x[i] - meanX) ** 2;
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;
  
  // Calculate R-squared
  const predictedY = x.map(xi => slope * xi + intercept);
  const totalVariation = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);
  const unexplainedVariation = y.reduce((sum, yi, i) => sum + (yi - predictedY[i]) ** 2, 0);
  const rSquared = 1 - (unexplainedVariation / (totalVariation || 1)); // Avoid division by zero
  
  return { slope, intercept, rSquared };
}

/**
 * Detect anomalies in time series data
 * @param data Array of time series points
 * @param sensitivityThreshold Z-score threshold for anomaly detection (default: 2.5)
 * @returns Array of detected anomalies
 */
export function detectAnomalies(data: TimeSeriesPoint[], sensitivityThreshold: number = 2.5): Anomaly[] {
  if (data.length < 5) {
    logger.info('Not enough data points for anomaly detection', { dataPoints: data.length });
    return [];
  }
  
  // Calculate moving average and standard deviation
  const values = data.map(point => point.value);
  const movingAverage = calculateSMA(data, Math.max(5, Math.floor(data.length / 5)));
  
  const anomalies: Anomaly[] = [];
  
  // Calculate standard deviation
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => (val - mean) ** 2);
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Detect anomalies based on z-score
  for (let i = 0; i < data.length; i++) {
    const expectedValue = movingAverage[i];
    const actualValue = data[i].value;
    const deviation = actualValue - expectedValue;
    const zScore = stdDev !== 0 ? Math.abs(deviation) / stdDev : 0;
    
    if (zScore > sensitivityThreshold) {
      // It's an anomaly
      const percentDeviation = (deviation / expectedValue) * 100;
      const type = deviation > 0 ? AnomalyType.SPIKE : AnomalyType.DROP;
      
      // Determine confidence based on z-score (higher z-score = higher confidence)
      // Normalize to 0-1 range
      const confidence = Math.min(zScore / (sensitivityThreshold * 2), 1);
      
      anomalies.push({
        timestamp: data[i].timestamp,
        value: actualValue,
        expectedValue,
        deviation,
        percentDeviation,
        type,
        confidence,
        context: determineAnomalyContext(data, i, type)
      });
    }
  }
  
  // Detect sustained trends (multiple consecutive points in same direction)
  const sustainedTrendLength = Math.max(3, Math.floor(data.length / 10));
  detectSustainedTrends(data, sustainedTrendLength, anomalies);
  
  return anomalies;
}

/**
 * Detect sustained trends in the data
 * @param data Array of time series points
 * @param minLength Minimum length for a sustained trend
 * @param anomalies Existing anomalies array to append to
 */
function detectSustainedTrends(
  data: TimeSeriesPoint[], 
  minLength: number, 
  anomalies: Anomaly[]
): void {
  if (data.length < minLength + 2) return;
  
  let increasingCount = 0;
  let decreasingCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i].value > data[i-1].value) {
      increasingCount++;
      decreasingCount = 0;
    } else if (data[i].value < data[i-1].value) {
      decreasingCount++;
      increasingCount = 0;
    } else {
      // Value unchanged
      increasingCount = 0;
      decreasingCount = 0;
    }
    
    // Check if we have a sustained trend
    if (increasingCount >= minLength && !anomalyExists(anomalies, data[i].timestamp)) {
      const startValue = data[i - increasingCount].value;
      const endValue = data[i].value;
      const percentChange = ((endValue - startValue) / startValue) * 100;
      
      anomalies.push({
        timestamp: data[i].timestamp,
        value: endValue,
        expectedValue: startValue,
        deviation: endValue - startValue,
        percentDeviation: percentChange,
        type: AnomalyType.SUSTAINED_INCREASE,
        confidence: 0.7 + Math.min(increasingCount / (minLength * 2), 0.3), // 0.7-1.0 range
        context: `Sustained increase over ${increasingCount} periods, total change: ${percentChange.toFixed(2)}%`
      });
    } else if (decreasingCount >= minLength && !anomalyExists(anomalies, data[i].timestamp)) {
      const startValue = data[i - decreasingCount].value;
      const endValue = data[i].value;
      const percentChange = ((endValue - startValue) / startValue) * 100;
      
      anomalies.push({
        timestamp: data[i].timestamp,
        value: endValue,
        expectedValue: startValue,
        deviation: endValue - startValue,
        percentDeviation: percentChange,
        type: AnomalyType.SUSTAINED_DECREASE,
        confidence: 0.7 + Math.min(decreasingCount / (minLength * 2), 0.3), // 0.7-1.0 range
        context: `Sustained decrease over ${decreasingCount} periods, total change: ${percentChange.toFixed(2)}%`
      });
    }
  }
}

/**
 * Check if an anomaly already exists at a given timestamp
 * @param anomalies Existing anomalies array
 * @param timestamp Timestamp to check
 * @returns True if an anomaly exists at the timestamp
 */
function anomalyExists(anomalies: Anomaly[], timestamp: Date): boolean {
  return anomalies.some(anomaly => 
    anomaly.timestamp.getTime() === timestamp.getTime()
  );
}

/**
 * Determine context message for an anomaly
 * @param data Time series data
 * @param index Index of the anomaly
 * @param type Type of anomaly
 * @returns Context message
 */
function determineAnomalyContext(
  data: TimeSeriesPoint[], 
  index: number, 
  type: AnomalyType
): string {
  if (index === 0) {
    return 'Anomaly detected in first data point';
  }
  
  const currentValue = data[index].value;
  const previousValue = data[index-1].value;
  const percentChange = ((currentValue - previousValue) / previousValue) * 100;
  
  if (type === AnomalyType.SPIKE) {
    return `Unexpected increase of ${percentChange.toFixed(2)}% from previous value`;
  } else {
    return `Unexpected decrease of ${Math.abs(percentChange).toFixed(2)}% from previous value`;
  }
}

/**
 * Analyze trend in time series data
 * @param data Array of time series points
 * @returns Trend analysis result
 */
export function analyzeTrend(data: TimeSeriesPoint[]): TrendAnalysis {
  if (data.length < 2) {
    logger.info('Not enough data points for trend analysis', { dataPoints: data.length });
    return {
      direction: TrendDirection.STABLE,
      slope: 0,
      strength: 0,
      startValue: data.length > 0 ? data[0].value : 0,
      endValue: data.length > 0 ? data[data.length - 1].value : 0,
      changePercent: 0,
      timeSpan: {
        start: data.length > 0 ? data[0].timestamp : new Date(),
        end: data.length > 0 ? data[data.length - 1].timestamp : new Date(),
        durationDays: 0
      },
      anomalies: []
    };
  }
  
  // Sort data by timestamp (oldest first)
  data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Calculate linear regression
  const { slope, intercept, rSquared } = calculateLinearRegression(data);
  
  // Determine trend direction and strength
  let direction: TrendDirection;
  if (Math.abs(slope) < 0.00001) {
    direction = TrendDirection.STABLE;
  } else if (slope > 0) {
    direction = TrendDirection.UP;
  } else {
    direction = TrendDirection.DOWN;
  }
  
  // Calculate start and end values
  const startValue = data[0].value;
  const endValue = data[data.length - 1].value;
  const changePercent = startValue !== 0 ? ((endValue - startValue) / startValue) * 100 : 0;
  
  // Calculate time span
  const startDate = data[0].timestamp;
  const endDate = data[data.length - 1].timestamp;
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = durationMs / (1000 * 60 * 60 * 24);
  
  // Detect anomalies
  const anomalies = detectAnomalies(data);
  
  // Generate simple forecast
  const lastTimestamp = data[data.length - 1].timestamp.getTime();
  const nextTimestampDelta = data.length > 1 ? 
    (lastTimestamp - data[data.length - 2].timestamp.getTime()) : 
    24 * 60 * 60 * 1000; // 1 day in milliseconds
  
  const nextTimestamp = lastTimestamp + nextTimestampDelta;
  const nextValue = slope * nextTimestamp + intercept;
  
  // Create and return trend analysis
  return {
    direction,
    slope,
    strength: rSquared, // R-squared as a measure of trend strength
    startValue,
    endValue,
    changePercent,
    timeSpan: {
      start: startDate,
      end: endDate,
      durationDays
    },
    anomalies,
    forecast: {
      nextValue,
      confidence: Math.max(0.5, rSquared) // Minimum confidence of 0.5
    }
  };
}

/**
 * Detect seasonality patterns in time series data
 * @param data Array of time series points
 * @param expectedPeriodDays Expected period length in days (e.g., 7 for weekly)
 * @returns Correlation strength (0-1) and detected period
 */
export function detectSeasonality(
  data: TimeSeriesPoint[], 
  expectedPeriodDays?: number
): { 
  hasSeasonality: boolean;
  correlationStrength: number;
  detectedPeriodDays: number | null;
  confidence: number;
} {
  if (data.length < 10) {
    return {
      hasSeasonality: false,
      correlationStrength: 0,
      detectedPeriodDays: null,
      confidence: 0
    };
  }
  
  // Extract values and timestamps
  const values = data.map(point => point.value);
  const timestamps = data.map(point => point.timestamp.getTime());
  
  // Calculate the average time interval between points in days
  let totalInterval = 0;
  for (let i = 1; i < timestamps.length; i++) {
    totalInterval += (timestamps[i] - timestamps[i-1]) / (1000 * 60 * 60 * 24);
  }
  const avgIntervalDays = totalInterval / (timestamps.length - 1);
  
  // If expected period is provided, check correlation at that period
  if (expectedPeriodDays) {
    const expectedLag = Math.round(expectedPeriodDays / avgIntervalDays);
    if (expectedLag >= values.length / 2) {
      return {
        hasSeasonality: false,
        correlationStrength: 0,
        detectedPeriodDays: null,
        confidence: 0
      };
    }
    
    const correlation = calculateAutocorrelation(values, expectedLag);
    const hasSeasonality = correlation > 0.5;
    
    return {
      hasSeasonality,
      correlationStrength: correlation,
      detectedPeriodDays: expectedPeriodDays,
      confidence: correlation
    };
  }
  
  // Try to detect the period automatically by checking different lags
  const maxLag = Math.floor(values.length / 2);
  let maxCorrelation = 0;
  let bestLag = 0;
  
  for (let lag = 1; lag < maxLag; lag++) {
    const correlation = calculateAutocorrelation(values, lag);
    if (correlation > maxCorrelation) {
      maxCorrelation = correlation;
      bestLag = lag;
    }
  }
  
  const hasSeasonality = maxCorrelation > 0.5;
  const detectedPeriodDays = hasSeasonality ? bestLag * avgIntervalDays : null;
  
  return {
    hasSeasonality,
    correlationStrength: maxCorrelation,
    detectedPeriodDays,
    confidence: maxCorrelation
  };
}

/**
 * Calculate autocorrelation for a given lag
 * @param values Array of values
 * @param lag Lag to calculate autocorrelation for
 * @returns Autocorrelation coefficient (-1 to 1)
 */
function calculateAutocorrelation(values: number[], lag: number): number {
  if (lag >= values.length) return 0;
  
  const n = values.length - lag;
  
  // Calculate mean
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  // Calculate variance
  let variance = 0;
  for (let i = 0; i < values.length; i++) {
    variance += (values[i] - mean) ** 2;
  }
  variance /= values.length;
  
  if (variance === 0) return 0; // No variation in the data
  
  // Calculate autocorrelation
  let autocorrelation = 0;
  for (let i = 0; i < n; i++) {
    autocorrelation += (values[i] - mean) * (values[i + lag] - mean);
  }
  
  return autocorrelation / (n * variance);
}

/**
 * Compare trends between two time series
 * @param series1 First time series
 * @param series2 Second time series
 * @returns Correlation and similarity metrics
 */
export function compareTrends(
  series1: TimeSeriesPoint[], 
  series2: TimeSeriesPoint[]
): {
  correlation: number;
  trendSimilarity: number;
  growthRatioDiff: number;
  leadLagRelationship: {
    series1LeadsDays: number | null;
    confidence: number;
  };
} {
  // Default return for insufficient data
  if (series1.length < 5 || series2.length < 5) {
    return {
      correlation: 0,
      trendSimilarity: 0,
      growthRatioDiff: 0,
      leadLagRelationship: {
        series1LeadsDays: null,
        confidence: 0
      }
    };
  }
  
  // Normalize timestamps by interpolating to common points
  const interpolatedData = interpolateTimeSeries(series1, series2);
  
  // Calculate correlation
  const values1 = interpolatedData.series1.map(point => point.value);
  const values2 = interpolatedData.series2.map(point => point.value);
  const correlation = calculatePearsonCorrelation(values1, values2);
  
  // Calculate trend similarity by comparing linear regression slopes
  const trend1 = calculateLinearRegression(interpolatedData.series1);
  const trend2 = calculateLinearRegression(interpolatedData.series2);
  
  // Normalize slopes for comparison
  const normalizeFactor = Math.max(
    Math.abs(trend1.slope),
    Math.abs(trend2.slope),
    0.00001 // Avoid division by zero
  );
  
  const normalizedSlope1 = trend1.slope / normalizeFactor;
  const normalizedSlope2 = trend2.slope / normalizeFactor;
  const trendSimilarity = 1 - Math.abs(normalizedSlope1 - normalizedSlope2);
  
  // Calculate growth ratio difference
  const growth1 = series1[series1.length - 1].value / series1[0].value;
  const growth2 = series2[series2.length - 1].value / series2[0].value;
  const growthRatioDiff = Math.abs(growth1 - growth2);
  
  // Detect lead-lag relationship
  const leadLag = detectLeadLag(values1, values2, 
    interpolatedData.avgIntervalDays);
  
  return {
    correlation,
    trendSimilarity,
    growthRatioDiff,
    leadLagRelationship: leadLag
  };
}

/**
 * Interpolate two time series to a common time grid
 * @param series1 First time series
 * @param series2 Second time series
 * @returns Interpolated series with common timestamps
 */
function interpolateTimeSeries(
  series1: TimeSeriesPoint[], 
  series2: TimeSeriesPoint[]
): {
  series1: TimeSeriesPoint[];
  series2: TimeSeriesPoint[];
  avgIntervalDays: number;
} {
  // Sort both series by timestamp
  series1.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  series2.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Find common time range
  const start = new Date(Math.max(
    series1[0].timestamp.getTime(),
    series2[0].timestamp.getTime()
  ));
  
  const end = new Date(Math.min(
    series1[series1.length - 1].timestamp.getTime(),
    series2[series2.length - 1].timestamp.getTime()
  ));
  
  // If no overlap, return empty results
  if (start.getTime() > end.getTime()) {
    return {
      series1: [],
      series2: [],
      avgIntervalDays: 0
    };
  }
  
  // Calculate average interval in series1 (in days)
  let totalInterval = 0;
  for (let i = 1; i < series1.length; i++) {
    totalInterval += (series1[i].timestamp.getTime() - series1[i-1].timestamp.getTime());
  }
  const avgIntervalMs = totalInterval / (series1.length - 1);
  const avgIntervalDays = avgIntervalMs / (1000 * 60 * 60 * 24);
  
  // Create common time points
  const pointCount = Math.min(20, Math.floor((end.getTime() - start.getTime()) / avgIntervalMs));
  const step = (end.getTime() - start.getTime()) / (pointCount - 1);
  
  const commonTimes: Date[] = [];
  for (let i = 0; i < pointCount; i++) {
    commonTimes.push(new Date(start.getTime() + i * step));
  }
  
  // Linear interpolation function
  const interpolate = (time: Date, series: TimeSeriesPoint[]): number => {
    const timeMs = time.getTime();
    
    // If time is exactly on a data point, return that value
    for (const point of series) {
      if (point.timestamp.getTime() === timeMs) {
        return point.value;
      }
    }
    
    // Find the two nearest points for interpolation
    let before = series[0];
    let after = series[series.length - 1];
    
    for (let i = 0; i < series.length; i++) {
      if (series[i].timestamp.getTime() > timeMs) {
        after = series[i];
        if (i > 0) {
          before = series[i - 1];
        }
        break;
      }
    }
    
    // Linear interpolation
    const t1 = before.timestamp.getTime();
    const t2 = after.timestamp.getTime();
    const v1 = before.value;
    const v2 = after.value;
    
    if (t1 === t2) return v1; // Avoid division by zero
    
    const ratio = (timeMs - t1) / (t2 - t1);
    return v1 + ratio * (v2 - v1);
  };
  
  // Create interpolated series
  const interpolated1: TimeSeriesPoint[] = commonTimes.map(time => ({
    timestamp: time,
    value: interpolate(time, series1)
  }));
  
  const interpolated2: TimeSeriesPoint[] = commonTimes.map(time => ({
    timestamp: time,
    value: interpolate(time, series2)
  }));
  
  return {
    series1: interpolated1,
    series2: interpolated2,
    avgIntervalDays
  };
}

/**
 * Calculate Pearson correlation coefficient
 * @param x First array of values
 * @param y Second array of values
 * @returns Correlation coefficient (-1 to 1)
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  
  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate covariance and variances
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  
  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    covariance += diffX * diffY;
    varianceX += diffX ** 2;
    varianceY += diffY ** 2;
  }
  
  // Calculate correlation
  if (varianceX === 0 || varianceY === 0) return 0; // Avoid division by zero
  
  return covariance / (Math.sqrt(varianceX) * Math.sqrt(varianceY));
}

/**
 * Detect lead-lag relationship between two time series
 * @param values1 First array of values
 * @param values2 Second array of values
 * @param avgIntervalDays Average interval between points in days
 * @returns Lead-lag relationship with confidence
 */
function detectLeadLag(
  values1: number[], 
  values2: number[], 
  avgIntervalDays: number
): {
  series1LeadsDays: number | null;
  confidence: number;
} {
  if (values1.length !== values2.length || values1.length < 5) {
    return {
      series1LeadsDays: null,
      confidence: 0
    };
  }
  
  const maxLag = Math.floor(values1.length / 3);
  let bestCorrelation = 0;
  let bestLag = 0;
  
  // Test different lags to find the best correlation
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let correlation = 0;
    let count = 0;
    
    for (let i = 0; i < values1.length; i++) {
      const j = i + lag;
      if (j >= 0 && j < values1.length) {
        correlation += values1[i] * values2[j];
        count++;
      }
    }
    
    correlation /= count;
    
    if (Math.abs(correlation) > Math.abs(bestCorrelation)) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }
  
  // Convert lag to days
  const leadDays = bestLag !== 0 ? bestLag * avgIntervalDays : null;
  
  // Series1 leads if lag is negative
  const series1LeadsDays = leadDays !== null ? (bestLag < 0 ? -leadDays : leadDays) : null;
  
  return {
    series1LeadsDays,
    confidence: Math.abs(bestCorrelation)
  };
}

// TrendAnalyzer - Trend analysis and forecasting engine
// Production-ready analytics component following existing codebase patterns

import { logger } from '@/lib/core/logging/logger';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase';

import {
  MetricType,
  TimeRange,
  Platform,
  DashboardErrorClass,
  DashboardErrorType
} from '../types';

import { MetricsUtils } from '../models/Metrics';

/**
 * Trend data point interface
 */
export interface TrendDataPoint {
  date: Date;
  value: number;
  change?: number;
  changePercentage?: number;
}

/**
 * Trend analysis result interface
 */
export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  strength: 'strong' | 'moderate' | 'weak';
  confidence: number; // 0-100
  slope: number;
  correlation: number;
  forecast?: TrendDataPoint[];
  seasonality?: {
    detected: boolean;
    period?: number;
    strength?: number;
  };
}

/**
 * TrendAnalyzer - Analyzes trends and provides forecasting
 */
export class TrendAnalyzer {
  
  /**
   * Analyze metric trends over time
   */
  async analyzeMetricTrend(
    userId: string,
    metricType: MetricType,
    timeRange: TimeRange,
    platform?: Platform
  ): Promise<TrendAnalysis> {
    try {
      logger.info('Analyzing metric trend', { userId, metricType, timeRange, platform });

      const trendData = await this.getMetricTrendData(userId, metricType, timeRange, platform);
      
      if (trendData.length < 3) {
        // Not enough data for trend analysis
        return {
          trend: 'stable',
          strength: 'weak',
          confidence: 0,
          slope: 0,
          correlation: 0
        };
      }

      const analysis = this.performTrendAnalysis(trendData);
      
      logger.info('Successfully analyzed metric trend', { 
        userId, 
        metricType, 
        trend: analysis.trend,
        strength: analysis.strength,
        confidence: analysis.confidence
      });

      return analysis;
    } catch (error) {
      logger.error('Error analyzing metric trend', { userId, metricType, timeRange, platform, error });
      throw new DashboardErrorClass(
        DashboardErrorType.METRICS_CALCULATION_ERROR,
        'Failed to analyze metric trend',
        platform,
        undefined,
        new Date(),
        { userId, metricType, timeRange, platform },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Get comparative trends across platforms
   */
  async getComparativeTrends(
    userId: string,
    metricType: MetricType,
    timeRange: TimeRange,
    platforms: Platform[]
  ): Promise<Record<Platform, TrendAnalysis>> {
    try {
      const results: Partial<Record<Platform, TrendAnalysis>> = {};

      for (const platform of platforms) {
        try {
          results[platform] = await this.analyzeMetricTrend(
            userId,
            metricType,
            timeRange,
            platform
          );
        } catch (error) {
          logger.error('Error analyzing trend for platform', { 
            userId, 
            metricType, 
            platform, 
            error 
          });
          // Continue with other platforms
        }
      }

      return results as Record<Platform, TrendAnalysis>;
    } catch (error) {
      logger.error('Error getting comparative trends', { userId, metricType, timeRange, platforms, error });
      throw new DashboardErrorClass(
        DashboardErrorType.METRICS_CALCULATION_ERROR,
        'Failed to get comparative trends',
        undefined,
        undefined,
        new Date(),
        { userId, metricType, timeRange, platforms },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Generate trend forecast
   */
  async generateForecast(
    userId: string,
    metricType: MetricType,
    timeRange: TimeRange,
    forecastPeriods: number = 7,
    platform?: Platform
  ): Promise<TrendDataPoint[]> {
    try {
      const historicalData = await this.getMetricTrendData(userId, metricType, timeRange, platform);
      
      if (historicalData.length < 5) {
        // Not enough data for forecasting
        return [];
      }

      const forecast = this.generateLinearForecast(historicalData, forecastPeriods);
      
      logger.info('Successfully generated forecast', { 
        userId, 
        metricType, 
        forecastPeriods,
        platform
      });

      return forecast;
    } catch (error) {
      logger.error('Error generating forecast', { userId, metricType, timeRange, forecastPeriods, platform, error });
      return [];
    }
  }

  /**
   * Detect seasonal patterns
   */
  async detectSeasonality(
    userId: string,
    metricType: MetricType,
    timeRange: TimeRange,
    platform?: Platform
  ): Promise<{
    detected: boolean;
    period?: number;
    strength?: number;
    patterns?: Record<string, number>;
  }> {
    try {
      const trendData = await this.getMetricTrendData(userId, metricType, timeRange, platform);
      
      if (trendData.length < 14) {
        // Need at least 2 weeks of data for seasonality detection
        return { detected: false };
      }

      const seasonality = this.analyzeSeasonality(trendData);
      
      return seasonality;
    } catch (error) {
      logger.error('Error detecting seasonality', { userId, metricType, timeRange, platform, error });
      return { detected: false };
    }
  }

  /**
   * Get metric trend data from Firestore
   */
  private async getMetricTrendData(
    userId: string,
    metricType: MetricType,
    timeRange: TimeRange,
    platform?: Platform
  ): Promise<TrendDataPoint[]> {
    try {
      const { startDate, endDate } = MetricsUtils.getTimeRangeDates(timeRange);

      // Get historical metrics data
      const metricsRef = collection(firestore, 'users', userId, 'metrics');
      let q = query(
        metricsRef,
        where('type', '==', metricType),
        where('calculatedAt', '>=', Timestamp.fromDate(startDate)),
        where('calculatedAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('calculatedAt', 'asc')
      );

      if (platform) {
        q = query(q, where('platform', '==', platform));
      }

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          date: data.calculatedAt.toDate(),
          value: data.value || 0,
          change: data.change,
          changePercentage: data.changePercentage
        };
      });
    } catch (error) {
      logger.error('Error getting metric trend data', { userId, metricType, timeRange, platform, error });
      return [];
    }
  }

  /**
   * Perform statistical trend analysis
   */
  private performTrendAnalysis(data: TrendDataPoint[]): TrendAnalysis {
    if (data.length < 2) {
      return {
        trend: 'stable',
        strength: 'weak',
        confidence: 0,
        slope: 0,
        correlation: 0
      };
    }

    // Convert dates to numeric values for regression
    const startTime = data[0].date.getTime();
    const x = data.map((point, index) => index);
    const y = data.map(point => point.value);

    // Calculate linear regression
    const { slope, correlation } = this.calculateLinearRegression(x, y);

    // Determine trend direction
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.01) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Determine trend strength based on correlation coefficient
    let strength: 'strong' | 'moderate' | 'weak';
    const absCorrelation = Math.abs(correlation);
    if (absCorrelation > 0.7) {
      strength = 'strong';
    } else if (absCorrelation > 0.4) {
      strength = 'moderate';
    } else {
      strength = 'weak';
    }

    // Calculate confidence (based on correlation and data points)
    const confidence = Math.min(100, absCorrelation * 100 * Math.min(1, data.length / 10));

    // Detect seasonality
    const seasonality = this.analyzeSeasonality(data);

    return {
      trend,
      strength,
      confidence,
      slope,
      correlation,
      seasonality
    };
  }

  /**
   * Calculate linear regression
   */
  private calculateLinearRegression(x: number[], y: number[]): { slope: number; intercept: number; correlation: number } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    return { slope, intercept, correlation };
  }

  /**
   * Generate linear forecast
   */
  private generateLinearForecast(data: TrendDataPoint[], periods: number): TrendDataPoint[] {
    if (data.length < 2) return [];

    const x = data.map((_, index) => index);
    const y = data.map(point => point.value);
    const { slope, intercept } = this.calculateLinearRegression(x, y);

    const lastDate = data[data.length - 1].date;
    const forecast: TrendDataPoint[] = [];

    for (let i = 1; i <= periods; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i);
      
      const futureX = data.length + i - 1;
      const predictedValue = Math.max(0, slope * futureX + intercept);

      forecast.push({
        date: futureDate,
        value: predictedValue
      });
    }

    return forecast;
  }

  /**
   * Analyze seasonality patterns
   */
  private analyzeSeasonality(data: TrendDataPoint[]): {
    detected: boolean;
    period?: number;
    strength?: number;
    patterns?: Record<string, number>;
  } {
    if (data.length < 14) {
      return { detected: false };
    }

    // Analyze daily patterns (day of week)
    const dayPatterns: Record<string, number[]> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    data.forEach(point => {
      const dayOfWeek = point.date.getDay();
      const dayName = dayNames[dayOfWeek];
      
      if (!dayPatterns[dayName]) {
        dayPatterns[dayName] = [];
      }
      dayPatterns[dayName].push(point.value);
    });

    // Calculate average for each day
    const dayAverages: Record<string, number> = {};
    Object.entries(dayPatterns).forEach(([day, values]) => {
      dayAverages[day] = values.reduce((a, b) => a + b, 0) / values.length;
    });

    // Calculate variance to determine if there's a pattern
    const allAverages = Object.values(dayAverages);
    const overallAverage = allAverages.reduce((a, b) => a + b, 0) / allAverages.length;
    const variance = allAverages.reduce((sum, avg) => sum + Math.pow(avg - overallAverage, 2), 0) / allAverages.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Consider seasonality detected if standard deviation is significant
    const coefficientOfVariation = overallAverage > 0 ? standardDeviation / overallAverage : 0;
    const detected = coefficientOfVariation > 0.1; // 10% threshold

    return {
      detected,
      period: detected ? 7 : undefined, // Weekly pattern
      strength: detected ? coefficientOfVariation : undefined,
      patterns: detected ? dayAverages : undefined
    };
  }

  /**
   * Get trend insights and recommendations
   */
  async getTrendInsights(
    userId: string,
    metricType: MetricType,
    timeRange: TimeRange,
    platform?: Platform
  ): Promise<{
    insights: string[];
    recommendations: string[];
    alerts: string[];
  }> {
    try {
      const analysis = await this.analyzeMetricTrend(userId, metricType, timeRange, platform);
      const seasonality = await this.detectSeasonality(userId, metricType, timeRange, platform);
      
      const insights: string[] = [];
      const recommendations: string[] = [];
      const alerts: string[] = [];

      // Generate insights based on trend analysis
      if (analysis.trend === 'increasing' && analysis.strength === 'strong') {
        insights.push(`${MetricsUtils.getDisplayName(metricType)} is showing strong upward growth`);
        recommendations.push('Continue current strategies as they are working well');
      } else if (analysis.trend === 'decreasing' && analysis.strength === 'strong') {
        insights.push(`${MetricsUtils.getDisplayName(metricType)} is declining significantly`);
        alerts.push('Immediate attention needed to address declining metrics');
        recommendations.push('Review and adjust current content strategy');
      } else if (analysis.trend === 'stable') {
        insights.push(`${MetricsUtils.getDisplayName(metricType)} is remaining stable`);
        recommendations.push('Consider testing new approaches to drive growth');
      }

      // Add seasonality insights
      if (seasonality.detected && seasonality.patterns) {
        const bestDay = Object.entries(seasonality.patterns)
          .sort(([,a], [,b]) => b - a)[0][0];
        insights.push(`Best performance typically occurs on ${bestDay}`);
        recommendations.push(`Schedule important content for ${bestDay} to maximize impact`);
      }

      // Add confidence-based insights
      if (analysis.confidence < 50) {
        insights.push('Trend analysis has low confidence due to data variability');
        recommendations.push('Collect more data over a longer period for better insights');
      }

      return { insights, recommendations, alerts };
    } catch (error) {
      logger.error('Error getting trend insights', { userId, metricType, timeRange, platform, error });
      return { insights: [], recommendations: [], alerts: [] };
    }
  }
} 
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy,
  limit,
  doc
} from 'firebase/firestore';
import { firestore as db } from '../../../lib/core/firebase';
import logger from '../../../lib/logging/logger';
import { TimeSeriesPoint, TrendDirection, analyzeTrend, compareTrends } from './trend-detector';
import { CompetitorData } from '../models/benchmarking';
import { CompetitorSnapshot } from './tracker';

/**
 * Comparative analysis result
 */
export interface CompetitiveComparison {
  timeframe: {
    start: Date;
    end: Date;
  };
  metrics: {
    [metricId: string]: {
      label: string;
      userValue: number;
      competitorValue: number;
      difference: number;
      percentDifference: number;
      userTrend: TrendDirection;
      competitorTrend: TrendDirection;
      isLeading: boolean;
    };
  };
  overallPerformance: {
    userLeadingMetrics: string[];
    competitorLeadingMetrics: string[];
    significantGaps: string[];
    growthOpportunities: string[];
  };
  historicalData: {
    [metricId: string]: {
      userHistory: TimeSeriesPoint[];
      competitorHistory: TimeSeriesPoint[];
      correlation: number;
      userLeading: boolean;
    }
  };
}

/**
 * Competitor comparison performance
 */
export interface CompetitorPerformance {
  period: 'week' | 'month' | 'quarter' | 'year';
  startDate: Date;
  endDate: Date;
  metrics: Record<string, number>;
  growth: Record<string, {
    value: number;
    percentChange: number;
  }>;
  engagement: {
    total: number;
    perPost: number;
    perFollower: number;
  };
  contentVolume: number;
  contentFrequency: number;
  bestPerforming: {
    metricId: string;
    value: number;
    percentAboveAverage: number;
  };
  worstPerforming: {
    metricId: string;
    value: number;
    percentBelowAverage: number;
  };
}

/**
 * Compare user performance against a competitor
 * @param userId User ID
 * @param competitorId Competitor ID
 * @param platformId Platform ID 
 * @param startDate Start date for comparison
 * @param endDate End date for comparison
 * @param metricIds Array of metrics to compare
 * @returns Competitive comparison
 */
export async function compareWithCompetitor(
  userId: string,
  competitorId: string,
  platformId: string,
  startDate: Date,
  endDate: Date,
  metricIds: string[] = []
): Promise<CompetitiveComparison> {
  try {
    logger.info('Starting competitor comparison', { 
      userId, 
      competitorId, 
      platformId,
      timeframe: { startDate, endDate } 
    });

    // Get competitor data
    const competitorData = await getCompetitorData(competitorId);
    if (!competitorData) {
      throw new Error(`Competitor data not found for ID: ${competitorId}`);
    }

    // Get user data
    const userData = await getUserData(userId, platformId);
    if (!userData) {
      throw new Error(`User data not found for platform: ${platformId}`);
    }

    // Get historical snapshots for competitor
    const competitorSnapshots = await getCompetitorSnapshots(
      competitorId, 
      platformId, 
      startDate, 
      endDate
    );

    // Get historical metrics for user
    const userMetrics = await getUserMetrics(
      userId, 
      platformId, 
      startDate, 
      endDate
    );

    // If no specific metrics provided, use all available metrics
    const metricsToCompare = metricIds.length > 0 
      ? metricIds 
      : Object.keys(competitorData.metrics);

    // Process each metric for comparison
    const metricComparisons = await processMetricComparisons(
      metricsToCompare,
      userData,
      competitorData,
      userMetrics,
      competitorSnapshots
    );

    // Analyze results to find leading metrics, gaps, and opportunities
    const overallPerformance = analyzeOverallPerformance(metricComparisons);

    // Build historical time series for each metric
    const historicalData = buildHistoricalData(
      metricsToCompare,
      userMetrics,
      competitorSnapshots
    );

    logger.info('Completed competitor comparison', { 
      userId, 
      competitorId,
      metricsCompared: metricsToCompare.length
    });

    // Build and return complete comparison
    return {
      timeframe: {
        start: startDate,
        end: endDate
      },
      metrics: metricComparisons,
      overallPerformance,
      historicalData
    };
  } catch (error) {
    logger.error('Error comparing with competitor', { 
      error, 
      userId, 
      competitorId, 
      platformId 
    });
    throw error;
  }
}

/**
 * Get most recent snapshot data for a competitor
 * @param competitorId Competitor ID
 * @returns Competitor data
 */
async function getCompetitorData(competitorId: string): Promise<CompetitorData | null> {
  try {
    const competitorRef = doc(db, 'competitors', competitorId);
    const competitorDoc = await getDocs(query(collection(db, 'competitors'), where('__name__', '==', competitorRef.id)));
    
    if (competitorDoc.empty) {
      logger.warn('Competitor not found', { competitorId });
      return null;
    }
    
    return competitorDoc.docs[0].data() as CompetitorData;
  } catch (error) {
    logger.error('Error getting competitor data', { error, competitorId });
    return null;
  }
}

/**
 * Get user data for a specific platform
 * @param userId User ID
 * @param platformId Platform ID
 * @returns User data for platform
 */
async function getUserData(
  userId: string, 
  platformId: string
): Promise<Record<string, any> | null> {
  try {
    // Query user's platform account
    const userPlatformQuery = query(
      collection(db, 'platformAccounts'),
      where('userId', '==', userId),
      where('platformId', '==', platformId)
    );
    
    const userPlatformSnapshot = await getDocs(userPlatformQuery);
    
    if (userPlatformSnapshot.empty) {
      logger.warn('User platform account not found', { userId, platformId });
      return null;
    }
    
    return userPlatformSnapshot.docs[0].data();
  } catch (error) {
    logger.error('Error getting user data', { error, userId, platformId });
    return null;
  }
}

/**
 * Get historical snapshots for a competitor
 * @param competitorId Competitor ID
 * @param platformId Platform ID
 * @param startDate Start date
 * @param endDate End date
 * @returns Array of competitor snapshots
 */
async function getCompetitorSnapshots(
  competitorId: string,
  platformId: string,
  startDate: Date,
  endDate: Date
): Promise<CompetitorSnapshot[]> {
  try {
    const q = query(
      collection(db, 'competitorSnapshots'),
      where('competitorId', '==', competitorId),
      where('platformId', '==', platformId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'asc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as CompetitorSnapshot);
  } catch (error) {
    logger.error('Error getting competitor snapshots', { 
      error, 
      competitorId, 
      platformId,
      timeframe: { startDate, endDate }
    });
    return [];
  }
}

/**
 * Get historical metrics for a user
 * @param userId User ID
 * @param platformId Platform ID
 * @param startDate Start date
 * @param endDate End date
 * @returns Array of user metric snapshots
 */
async function getUserMetrics(
  userId: string,
  platformId: string,
  startDate: Date,
  endDate: Date
): Promise<{ timestamp: Timestamp, metrics: Record<string, number> }[]> {
  try {
    const q = query(
      collection(db, 'userMetrics'),
      where('userId', '==', userId),
      where('platformId', '==', platformId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'asc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      timestamp: doc.data().timestamp,
      metrics: doc.data().metrics
    }));
  } catch (error) {
    logger.error('Error getting user metrics', { 
      error, 
      userId, 
      platformId,
      timeframe: { startDate, endDate }
    });
    return [];
  }
}

/**
 * Process metric comparisons
 * @param metricIds Metric IDs to compare
 * @param userData User data
 * @param competitorData Competitor data
 * @param userMetrics User historical metrics
 * @param competitorSnapshots Competitor historical snapshots
 * @returns Processed metric comparisons
 */
async function processMetricComparisons(
  metricIds: string[],
  userData: Record<string, any>,
  competitorData: CompetitorData,
  userMetrics: { timestamp: Timestamp, metrics: Record<string, number> }[],
  competitorSnapshots: CompetitorSnapshot[]
): Promise<CompetitiveComparison['metrics']> {
  // Get the most recent user metrics
  const latestUserMetrics = userMetrics.length > 0 
    ? userMetrics[userMetrics.length - 1].metrics 
    : {};
  
  // Initialize result object
  const metricComparisons: CompetitiveComparison['metrics'] = {};
  
  // Process each metric
  for (const metricId of metricIds) {
    // Skip if metric doesn't exist in either dataset
    if (!(metricId in latestUserMetrics) && !(metricId in competitorData.metrics)) {
      continue;
    }
    
    // Get current values (default to 0 if not available)
    const userValue = latestUserMetrics[metricId] || 0;
    const competitorValue = competitorData.metrics[metricId] || 0;
    
    // Calculate difference and percent difference
    const difference = userValue - competitorValue;
    const percentDifference = competitorValue !== 0 
      ? (difference / competitorValue) * 100 
      : userValue > 0 ? 100 : 0;
    
    // Determine if user is leading for this metric
    const isLeading = userValue > competitorValue;
    
    // Analyze trends for both user and competitor
    const userHistory = createTimeSeriesFromMetrics(userMetrics, metricId);
    const competitorHistory = createTimeSeriesFromSnapshots(competitorSnapshots, metricId);
    
    const userTrendAnalysis = analyzeTrend(userHistory);
    const competitorTrendAnalysis = analyzeTrend(competitorHistory);
    
    // Store the comparison for this metric
    metricComparisons[metricId] = {
      label: metricId, // Ideally, replace with a human-readable label from a metric definitions store
      userValue,
      competitorValue,
      difference,
      percentDifference,
      userTrend: userTrendAnalysis.direction,
      competitorTrend: competitorTrendAnalysis.direction,
      isLeading
    };
  }
  
  return metricComparisons;
}

/**
 * Analyze overall performance across all metrics
 * @param metricComparisons Metric comparisons
 * @returns Overall performance analysis
 */
function analyzeOverallPerformance(
  metricComparisons: CompetitiveComparison['metrics']
): CompetitiveComparison['overallPerformance'] {
  const userLeadingMetrics: string[] = [];
  const competitorLeadingMetrics: string[] = [];
  const significantGaps: string[] = [];
  const growthOpportunities: string[] = [];
  
  // Analyze each metric
  for (const [metricId, comparison] of Object.entries(metricComparisons)) {
    // Categorize by who's leading
    if (comparison.isLeading) {
      userLeadingMetrics.push(metricId);
      
      // If user is leading by a significant margin, it's a significant advantage
      if (comparison.percentDifference >= 25) {
        significantGaps.push(metricId);
      }
    } else {
      competitorLeadingMetrics.push(metricId);
      
      // If competitor is leading but user is trending up, it's a growth opportunity
      if (comparison.userTrend === TrendDirection.UP && 
          (comparison.competitorTrend === TrendDirection.DOWN || 
           comparison.competitorTrend === TrendDirection.STABLE)) {
        growthOpportunities.push(metricId);
      }
      
      // If competitor is leading by a significant margin, it's a significant gap
      if (comparison.percentDifference <= -25) {
        significantGaps.push(metricId);
      }
    }
  }
  
  return {
    userLeadingMetrics,
    competitorLeadingMetrics,
    significantGaps,
    growthOpportunities
  };
}

/**
 * Build historical data for time series comparison
 * @param metricIds Metrics to include
 * @param userMetrics User historical metrics
 * @param competitorSnapshots Competitor historical snapshots
 * @returns Historical data for comparison
 */
function buildHistoricalData(
  metricIds: string[],
  userMetrics: { timestamp: Timestamp, metrics: Record<string, number> }[],
  competitorSnapshots: CompetitorSnapshot[]
): CompetitiveComparison['historicalData'] {
  const result: CompetitiveComparison['historicalData'] = {};
  
  for (const metricId of metricIds) {
    // Create time series for user and competitor
    const userHistory = createTimeSeriesFromMetrics(userMetrics, metricId);
    const competitorHistory = createTimeSeriesFromSnapshots(competitorSnapshots, metricId);
    
    // Skip if either series is empty
    if (userHistory.length === 0 || competitorHistory.length === 0) {
      continue;
    }
    
    // Compare the trends
    const trendComparison = compareTrends(userHistory, competitorHistory);
    
    // Calculate if user is leading over time (based on average values)
    const userAvg = userHistory.reduce((sum, point) => sum + point.value, 0) / userHistory.length;
    const competitorAvg = competitorHistory.reduce((sum, point) => sum + point.value, 0) / competitorHistory.length;
    const userLeading = userAvg > competitorAvg;
    
    // Store the historical data
    result[metricId] = {
      userHistory,
      competitorHistory,
      correlation: trendComparison.correlation,
      userLeading
    };
  }
  
  return result;
}

/**
 * Create time series from user metrics
 * @param userMetrics User metrics history
 * @param metricId Metric ID to extract
 * @returns Time series points
 */
function createTimeSeriesFromMetrics(
  userMetrics: { timestamp: Timestamp, metrics: Record<string, number> }[],
  metricId: string
): TimeSeriesPoint[] {
  return userMetrics
    .filter(snapshot => metricId in snapshot.metrics)
    .map(snapshot => ({
      timestamp: snapshot.timestamp.toDate(),
      value: snapshot.metrics[metricId]
    }));
}

/**
 * Create time series from competitor snapshots
 * @param snapshots Competitor snapshots
 * @param metricId Metric ID to extract
 * @returns Time series points
 */
function createTimeSeriesFromSnapshots(
  snapshots: CompetitorSnapshot[],
  metricId: string
): TimeSeriesPoint[] {
  return snapshots
    .filter(snapshot => metricId in snapshot.metrics)
    .map(snapshot => ({
      timestamp: snapshot.timestamp.toDate(),
      value: snapshot.metrics[metricId]
    }));
}

/**
 * Get competitive performance analysis
 * @param userId User ID
 * @param platformId Platform ID
 * @param period Analysis period
 * @returns Performance analysis
 */
export async function getCompetitivePerformance(
  userId: string,
  platformId: string,
  period: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<CompetitorPerformance> {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }
    
    // Get user metrics for the period
    const userMetrics = await getUserMetrics(userId, platformId, startDate, endDate);
    
    if (userMetrics.length < 2) {
      throw new Error('Insufficient user metrics data for analysis');
    }
    
    // Extract the first and last snapshots
    const firstSnapshot = userMetrics[0];
    const lastSnapshot = userMetrics[userMetrics.length - 1];
    
    // Calculate metrics
    const metrics = lastSnapshot.metrics;
    
    // Calculate growth for each metric
    const growth: Record<string, { value: number; percentChange: number }> = {};
    
    for (const [metricId, currentValue] of Object.entries(lastSnapshot.metrics)) {
      const previousValue = firstSnapshot.metrics[metricId] || 0;
      const change = currentValue - previousValue;
      const percentChange = previousValue !== 0 
        ? (change / previousValue) * 100 
        : currentValue > 0 ? 100 : 0;
      
      growth[metricId] = {
        value: change,
        percentChange
      };
    }
    
    // Calculate engagement metrics (simplified version)
    const totalEngagement = metrics.likes || 0 + metrics.comments || 0 + metrics.shares || 0;
    const perPost = totalEngagement / (metrics.postCount || 1);
    const perFollower = totalEngagement / (metrics.followerCount || 1);
    
    // Calculate content metrics
    const contentVolume = metrics.postCount || 0;
    const contentFrequency = contentVolume / getDaysInPeriod(period);
    
    // Find best and worst performing metrics
    const performanceMetrics = Object.entries(growth)
      .filter(([metricId, _]) => metricId !== 'postCount' && metricId !== 'followerCount')
      .map(([metricId, growthData]) => ({
        metricId,
        value: metrics[metricId] || 0,
        percentChange: growthData.percentChange
      }));
    
    const avgPercentChange = performanceMetrics.reduce((sum, metric) => sum + metric.percentChange, 0) / 
      (performanceMetrics.length || 1);

    let best: { metricId: string; value: number; percentAboveAverage: number; };
    let worst: { metricId: string; value: number; percentBelowAverage: number; };

    if (performanceMetrics.length > 0) {
      const bestPerfMetric = performanceMetrics.reduce((b, current) => 
        current.percentChange > b.percentChange ? current : b, 
        performanceMetrics[0]
      );
    
      const worstPerfMetric = performanceMetrics.reduce((w, current) => 
        current.percentChange < w.percentChange ? current : w, 
        performanceMetrics[0]
      );
      
      best = {
        metricId: bestPerfMetric.metricId,
        value: bestPerfMetric.value,
        percentAboveAverage: bestPerfMetric.percentChange - avgPercentChange
      };
      
      worst = {
        metricId: worstPerfMetric.metricId,
        value: worstPerfMetric.value,
        percentBelowAverage: avgPercentChange - worstPerfMetric.percentChange
      };
    } else {
      best = { metricId: '', value: 0, percentAboveAverage: 0 };
      worst = { metricId: '', value: 0, percentBelowAverage: 0 };
    }
    
    return {
      period,
      startDate,
      endDate,
      metrics,
      growth,
      engagement: {
        total: totalEngagement,
        perPost,
        perFollower
      },
      contentVolume,
      contentFrequency,
      bestPerforming: best,
      worstPerforming: worst
    };
  } catch (error) {
    logger.error('Error getting competitive performance', { 
      error, 
      userId, 
      platformId, 
      period 
    });
    throw error;
  }
}

/**
 * Calculate days in a period
 * @param period Period type
 * @returns Number of days
 */
function getDaysInPeriod(period: 'week' | 'month' | 'quarter' | 'year'): number {
  switch (period) {
    case 'week':
      return 7;
    case 'month':
      return 30;
    case 'quarter':
      return 91;
    case 'year':
      return 365;
  }
}

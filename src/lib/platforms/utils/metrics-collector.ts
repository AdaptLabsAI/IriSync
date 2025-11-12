import { firestore } from 'firebase-admin';
import { PlatformMetrics } from '../models/metrics';
import { PlatformType } from '../PlatformProvider';

/**
 * Store metrics data for a platform account in Firestore
 */
export async function storeMetrics(
  userId: string,
  metrics: PlatformMetrics
): Promise<void> {
  const { platformType, accountId, period, startDate, endDate } = metrics;
  
  try {
    // Generate a document ID based on platform, account, and time period
    const docId = `${platformType}_${accountId}_${startDate.toISOString()}_${endDate.toISOString()}`;
    
    // Store the metrics data
    await firestore()
      .collection('users').doc(userId)
      .collection('metrics').doc(docId)
      .set({
        platformType,
        accountId,
        period,
        startDate: firestore.Timestamp.fromDate(startDate),
        endDate: firestore.Timestamp.fromDate(endDate),
        data: metrics,
        createdAt: firestore.FieldValue.serverTimestamp()
      });
      
  } catch (error) {
    console.error('Error storing metrics:', error);
    throw new Error('Failed to store platform metrics');
  }
}

/**
 * Retrieve metrics for a specific time period
 */
export async function getMetrics(
  userId: string,
  platformType: PlatformType,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<PlatformMetrics | null> {
  try {
    // Query Firestore for matching metrics
    const snapshot = await firestore()
      .collection('users').doc(userId)
      .collection('metrics')
      .where('platformType', '==', platformType)
      .where('accountId', '==', accountId)
      .where('startDate', '>=', firestore.Timestamp.fromDate(startDate))
      .where('endDate', '<=', firestore.Timestamp.fromDate(endDate))
      .orderBy('startDate', 'desc')
      .limit(1)
      .get();
      
    if (snapshot.empty) {
      return null;
    }
    
    // Return the first matching metrics record
    const data = snapshot.docs[0].data();
    return data.data as PlatformMetrics;
    
  } catch (error) {
    console.error('Error retrieving metrics:', error);
    throw new Error('Failed to retrieve platform metrics');
  }
}

/**
 * Aggregate metrics across multiple platforms
 */
export async function aggregateMetricsAcrossPlatforms(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Record<PlatformType, PlatformMetrics[]>> {
  try {
    // Query for all metrics in the date range
    const snapshot = await firestore()
      .collection('users').doc(userId)
      .collection('metrics')
      .where('startDate', '>=', firestore.Timestamp.fromDate(startDate))
      .where('endDate', '<=', firestore.Timestamp.fromDate(endDate))
      .get();
      
    // Group metrics by platform type
    const results: Record<PlatformType, PlatformMetrics[]> = {} as Record<PlatformType, PlatformMetrics[]>;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const platformType = data.platformType as PlatformType;
      
      if (!results[platformType]) {
        results[platformType] = [];
      }
      
      results[platformType].push(data.data as PlatformMetrics);
    });
    
    return results;
    
  } catch (error) {
    console.error('Error aggregating metrics:', error);
    throw new Error('Failed to aggregate platform metrics');
  }
}

/**
 * Generate comparison between two time periods
 */
export function generateComparisonMetrics(
  currentMetrics: PlatformMetrics,
  previousPeriodMetrics: PlatformMetrics
): PlatformMetrics {
  // Clone the current metrics
  const comparisonMetrics: PlatformMetrics = { ...currentMetrics };
  
  // Add comparison data
  comparisonMetrics.comparisonPeriod = {
    startDate: previousPeriodMetrics.startDate,
    endDate: previousPeriodMetrics.endDate,
    engagement: previousPeriodMetrics.engagement,
    audience: previousPeriodMetrics.audience,
    content: previousPeriodMetrics.content
  };
  
  return comparisonMetrics;
}

/**
 * Calculate growth percentages between current and previous metrics
 */
export function calculateGrowthMetrics(metrics: PlatformMetrics): Record<string, number> {
  const growth: Record<string, number> = {};
  
  // Return empty object if no comparison data
  if (!metrics.comparisonPeriod) {
    return growth;
  }
  
  const current = metrics;
  const previous = metrics.comparisonPeriod;
  
  // Calculate audience growth
  growth.followersGrowth = calculatePercentageChange(
    current.audience.followers,
    previous.audience.followers
  );
  
  growth.reachGrowth = calculatePercentageChange(
    current.audience.reach,
    previous.audience.reach
  );
  
  growth.impressionsGrowth = calculatePercentageChange(
    current.audience.impressions,
    previous.audience.impressions
  );
  
  // Calculate engagement growth
  growth.engagementGrowth = calculatePercentageChange(
    current.engagement.totalEngagements,
    previous.engagement.totalEngagements
  );
  
  growth.engagementRateGrowth = calculatePercentageChange(
    current.engagement.engagementRate,
    previous.engagement.engagementRate
  );
  
  growth.likesGrowth = calculatePercentageChange(
    current.engagement.likes,
    previous.engagement.likes
  );
  
  growth.commentsGrowth = calculatePercentageChange(
    current.engagement.comments,
    previous.engagement.comments
  );
  
  growth.sharesGrowth = calculatePercentageChange(
    current.engagement.shares,
    previous.engagement.shares
  );
  
  return growth;
}

/**
 * Helper to calculate percentage change between two values
 */
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  
  return ((current - previous) / previous) * 100;
}

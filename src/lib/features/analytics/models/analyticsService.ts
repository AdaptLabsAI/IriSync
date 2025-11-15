import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

interface AnalyticsParams {
  platform?: string;
  timeRange?: string;
  tabType?: string;
}

/**
 * Get a user's analytics summary data
 * @param userId User ID
 * @param params Optional parameters for filtering analytics data
 * @returns Promise resolving to analytics data object
 */
export async function getUserAnalyticsSummary(
  userId: string, 
  params: AnalyticsParams = {}
): Promise<any> {
  try {
    // Lazy import to avoid build-time initialization
    const { firestore } = await import('../../../core/firebase');
    // Create a query to get analytics data
    let analyticsQuery = query(
      collection(firestore, 'analytics'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(30) // Get the last 30 days of data
    );
    
    // Add platform filter if specified
    if (params.platform && params.platform !== 'all') {
      analyticsQuery = query(analyticsQuery, where('platform', '==', params.platform));
    }
    
    const analyticsSnapshot = await getDocs(analyticsQuery);
    
    // If there are no results, return null
    if (analyticsSnapshot.empty) {
      return null;
    }
    
    // Process and aggregate the analytics data based on time range
    const analyticsData = analyticsSnapshot.docs.map(doc => doc.data());
    
    // Process data based on time range
    let filteredData = analyticsData;
    const now = new Date();
    
    if (params.timeRange) {
      switch (params.timeRange) {
        case '7d':
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          filteredData = analyticsData.filter(data => 
            new Date(data.date) >= sevenDaysAgo
          );
          break;
          
        case '30d':
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 30);
          filteredData = analyticsData.filter(data => 
            new Date(data.date) >= thirtyDaysAgo
          );
          break;
          
        case '90d':
          const ninetyDaysAgo = new Date(now);
          ninetyDaysAgo.setDate(now.getDate() - 90);
          filteredData = analyticsData.filter(data => 
            new Date(data.date) >= ninetyDaysAgo
          );
          break;
          
        case 'ytd':
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          filteredData = analyticsData.filter(data => 
            new Date(data.date) >= startOfYear
          );
          break;
      }
    }
    
    // Aggregate the data
    // This is a placeholder implementation. In a real app, you would
    // perform more sophisticated aggregation based on metric types.
    const summary = {
      engagementRate: calculateAverage(filteredData, 'engagementRate'),
      impressions: sumValues(filteredData, 'impressions'),
      clicks: sumValues(filteredData, 'clicks'),
      followers: getMostRecent(filteredData, 'followers'),
      posts: filteredData.length,
      data: filteredData,
      timeRange: params.timeRange || '30d'
    };
    
    return summary;
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return null;
  }
}

// Helper functions for data aggregation
function calculateAverage(data: any[], field: string): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
  return sum / data.length;
}

function sumValues(data: any[], field: string): number {
  return data.reduce((acc, item) => acc + (item[field] || 0), 0);
}

function getMostRecent(data: any[], field: string): number {
  if (data.length === 0) return 0;
  // Assumes data is already sorted by date in descending order
  return data[0][field] || 0;
} 
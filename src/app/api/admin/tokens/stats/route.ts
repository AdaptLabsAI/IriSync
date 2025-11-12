import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { firestore } from '@/lib/core/firebase/admin';
import { AITaskType } from '@/lib/features/ai/models/AITask';
import { SubscriptionTier } from '@/lib/features/subscription/models/subscription';
import { logger } from '@/lib/core/logging/logger';

// Define the token usage record interface
interface TokenUsageRecord {
  id: string;
  userId: string;
  taskType: string;
  tokensUsed: number;
  timestamp: Date;
  provider: string;
  model: string;
  success: boolean;
  remainingTokens?: number;
  operation?: string;
  metadata?: Record<string, any>;
}

/**
 * GET handler for token usage statistics
 * Restricted to Admin role
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    // Create date filters
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    } else {
      // Default date range based on period
      const now = new Date();
      let periodStart: Date;
      
      switch (period) {
        case 'day':
          periodStart = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          // Get first day of the week (Sunday)
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - now.getDay());
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all':
          periodStart = new Date(0); // Beginning of time
          break;
        case 'month':
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
      
      dateFilter = {
        timestamp: {
          $gte: periodStart,
        },
      };
    }
    
    // Query token usage records
    const tokenUsageSnapshot = await firestore
      .collection('tokenUsage')
      .where('timestamp', '>=', dateFilter.timestamp.$gte)
      .orderBy('timestamp', 'desc')
      .limit(10000) // Reasonable limit for stats calculation
      .get();
    
    // Process results
    const usageRecords: TokenUsageRecord[] = tokenUsageSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || 'unknown',
        taskType: data.taskType || 'unknown',
        tokensUsed: data.tokensUsed || 1,
        timestamp: data.timestamp?.toDate() || new Date(),
        provider: data.provider || 'unknown',
        model: data.model || 'unknown',
        success: !!data.success,
        remainingTokens: data.remainingTokens,
        operation: data.operation,
        metadata: data.metadata
      };
    });
    
    // Get users with subscription information using organization-centric approach
    const userIds = Array.from(new Set(usageRecords.map(record => record.userId)));
    const userSubscriptions: Record<string, string> = {};
    
    // Batch users into groups of 10 to avoid large IN queries
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batchIds = userIds.slice(i, i + batchSize);
      const usersSnapshot = await firestore
        .collection('users')
        .where('id', 'in', batchIds)
        .get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userData.id;
        
        try {
          // Use organization-centric approach
          const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
          
          if (orgId) {
            const orgDoc = await firestore.collection('organizations').doc(orgId).get();
            
            if (orgDoc.exists) {
              const orgData = orgDoc.data();
              if (orgData?.billing?.subscriptionTier) {
                userSubscriptions[userId] = orgData.billing.subscriptionTier;
                continue;
              }
            }
          }
          
          // Fallback to deprecated user field with warning
          if (userData.subscriptionTier) {
            console.warn('Using deprecated user.subscriptionTier field', { userId });
            userSubscriptions[userId] = userData.subscriptionTier;
          } else {
            userSubscriptions[userId] = 'none';
          }
        } catch (error) {
          console.error('Error getting subscription tier for user:', { userId, error });
          userSubscriptions[userId] = 'none';
        }
      }
    }
    
    // Calculate statistics
    const stats = {
      total: usageRecords.length,
      totalTokensUsed: usageRecords.reduce((sum, record) => sum + record.tokensUsed, 0),
      byTaskType: {} as Record<string, number>,
      bySubscriptionTier: {} as Record<string, number>,
      byProvider: {} as Record<string, number>,
      byModel: {} as Record<string, number>,
      byDay: {} as Record<string, number>,
      topUsers: [] as Array<{userId: string; tokenCount: number, tier: string}>,
      usageHistory: [] as Array<{date: string; count: number}>,
      // Count free (CUSTOMER_SUPPORT) vs. paid operations
      freeOperations: 0,
      paidOperations: 0,
      // Success rate
      successCount: 0,
      failureCount: 0
    };
    
    // Calculate by task type
    usageRecords.forEach(record => {
      stats.byTaskType[record.taskType] = (stats.byTaskType[record.taskType] || 0) + 1;
      
      // Track free vs paid operations
      if (record.taskType === AITaskType.CUSTOMER_SUPPORT) {
        stats.freeOperations++;
      } else {
        stats.paidOperations++;
      }
      
      // Track success/failure
      if (record.success) {
        stats.successCount++;
      } else {
        stats.failureCount++;
      }
      
      // By provider
      stats.byProvider[record.provider] = (stats.byProvider[record.provider] || 0) + 1;
      
      // By model
      stats.byModel[record.model] = (stats.byModel[record.model] || 0) + 1;
      
      // By subscription tier
      const tier = userSubscriptions[record.userId] || 'unknown';
      stats.bySubscriptionTier[tier] = (stats.bySubscriptionTier[tier] || 0) + 1;
      
      // By day
      const day = record.timestamp.toISOString().split('T')[0];
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;
    });
    
    // Calculate top users
    const userUsage: Record<string, number> = {};
    usageRecords.forEach(record => {
      userUsage[record.userId] = (userUsage[record.userId] || 0) + record.tokensUsed;
    });
    
    stats.topUsers = Object.entries(userUsage)
      .map(([userId, tokenCount]) => ({
        userId,
        tokenCount,
        tier: userSubscriptions[userId] || 'unknown'
      }))
      .sort((a, b) => b.tokenCount - a.tokenCount)
      .slice(0, 20); // Top 20 users
    
    // Format usage history
    stats.usageHistory = Object.entries(stats.byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return NextResponse.json({ stats });
  } catch (error) {
    logger.error('Error fetching token usage statistics', { error });
    return NextResponse.json(
      { error: 'Failed to fetch token usage statistics' },
      { status: 500 }
    );
  }
}); 
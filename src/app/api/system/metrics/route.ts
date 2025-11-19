/**
 * System Metrics API
 * GET /api/system/metrics - Get historical system metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth/nextauth';
import { SystemMetricsResponse, SystemMetricsDataPoint } from '@/lib/features/system/models/health';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/system/metrics
 * Get historical system performance metrics
 * Query params: range ('24h' | '7d' | '30d')
 * Accessible to admin users only
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { firestore } = await import('@/lib/core/firebase');
    const { doc, getDoc, collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');

    const userDoc = await getDoc(doc(firestore, 'users', session.user.id));

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const role = userData.role || 'user';

    // Only admin and super_admin can access system metrics
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h';

    // Calculate time range
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case '24h':
        startDate.setHours(endDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        startDate.setHours(endDate.getHours() - 24);
    }

    // Query historical health snapshots
    const healthQuery = query(
      collection(firestore, 'systemHealth'),
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const healthSnapshot = await getDocs(healthQuery);

    // Transform data into metrics data points
    const dataPoints: SystemMetricsDataPoint[] = healthSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        responseTime: data.metrics?.avgResponseTime || 0,
        errorCount: Math.floor((data.metrics?.errorRate || 0) * (data.metrics?.totalRequests || 0) / 100),
        requestCount: data.metrics?.totalRequests || 0,
        activeUsers: data.metrics?.activeUsers || 0,
      };
    });

    // Calculate summary stats
    const summary = {
      avgResponseTime: dataPoints.length > 0
        ? dataPoints.reduce((sum, dp) => sum + dp.responseTime, 0) / dataPoints.length
        : 0,
      totalErrors: dataPoints.reduce((sum, dp) => sum + dp.errorCount, 0),
      totalRequests: dataPoints.reduce((sum, dp) => sum + dp.requestCount, 0),
      uptimePercentage: dataPoints.length > 0
        ? ((dataPoints.length - dataPoints.filter(dp => dp.errorCount > 0).length) / dataPoints.length) * 100
        : 100,
    };

    const response: SystemMetricsResponse = {
      range,
      dataPoints,
      summary,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error) {
    console.error('Error fetching system metrics:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

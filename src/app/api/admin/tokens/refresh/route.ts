import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { tokenRefreshScheduler } from '@/lib/core/scheduler/token-refresh-scheduler';
import { logger } from '@/lib/core/logging/logger';

/**
 * POST /api/admin/tokens/refresh
 * Manually trigger monthly token refresh and audit token packages
 * Admin only endpoint
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'refresh_monthly':
        logger.info('Admin triggered monthly token refresh', { adminUserId: adminUser.id });
        
        const refreshResult = await tokenRefreshScheduler.runMonthlyRefresh();
        
        return NextResponse.json({
          success: refreshResult.success,
          message: refreshResult.success 
            ? `Successfully refreshed tokens for ${refreshResult.refreshedCount} users`
            : 'Token refresh failed',
          data: {
            refreshedCount: refreshResult.refreshedCount,
            errors: refreshResult.errors
          }
        });

      case 'audit_packages':
        logger.info('Admin triggered token package audit', { adminUserId: adminUser.id });
        
        const auditResult = await tokenRefreshScheduler.auditTokenPackageUsage();
        
        return NextResponse.json({
          success: true,
          message: 'Token package audit completed',
          data: auditResult
        });

      case 'get_package_stats':
        logger.info('Admin requested token package stats', { adminUserId: adminUser.id });
        
        const statsResult = await tokenRefreshScheduler.getTokenPackageStats();
        
        return NextResponse.json({
          success: true,
          message: 'Token package statistics retrieved',
          data: statsResult
        });

      case 'initialize_packages':
        logger.info('Admin triggered token package initialization', { adminUserId: adminUser.id });
        
        await tokenRefreshScheduler.initializeDefaultTokenPackages();
        
        return NextResponse.json({
          success: true,
          message: 'Default token packages initialized successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Supported actions: refresh_monthly, audit_packages, get_package_stats, initialize_packages'
        }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error in admin token refresh endpoint', { 
      error: error instanceof Error ? error.message : String(error),
      adminUserId: adminUser?.id 
    });
    
    return NextResponse.json({
      success: false,
      message: 'Failed to process token refresh request',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

/**
 * GET /api/admin/tokens/refresh
 * Get token refresh status and package audit information
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    logger.info('Admin requested token refresh status', { adminUserId: adminUser.id });

    // Get package stats and audit info
    const [packageStats, auditResult] = await Promise.all([
      tokenRefreshScheduler.getTokenPackageStats(),
      tokenRefreshScheduler.auditTokenPackageUsage()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        packageStats,
        audit: auditResult,
        lastRefreshCheck: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting token refresh status', { 
      error: error instanceof Error ? error.message : String(error),
      adminUserId: adminUser?.id 
    });
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get token refresh status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}); 
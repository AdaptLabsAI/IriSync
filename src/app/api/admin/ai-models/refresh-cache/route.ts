import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { firestore } from '@/lib/core/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { TieredModelRouter } from '@/lib/features/ai/models/tiered-model-router';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - this route requires runtime environment variables
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Global router instance
let globalModelRouter: TieredModelRouter;

/**
 * Get or create the global model router instance
 */
function getGlobalModelRouter(): TieredModelRouter {
  if (!globalModelRouter) {
    globalModelRouter = new TieredModelRouter();
  }
  return globalModelRouter;
}

/**
 * Check if user has admin privileges
 */
async function checkAdminAccess(userId: string): Promise<boolean> {
  // Check if Firestore is available (it won't be during build)
  if (!firestore) {
    console.warn('Firestore not available - skipping admin check');
    return false;
  }

  try {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    return userData.role === 'admin' || userData.role === 'super_admin';
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}

/**
 * POST - Force refresh the AI model router cache
 */
export async function POST(req: NextRequest) {
  try {
    // Check if Firebase is available (won't be during build)
    if (!firestore) {
      return NextResponse.json({ 
        error: 'Service Unavailable', 
        message: 'Firebase is not initialized. Please check server configuration.' 
      }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAdminAccess = await checkAdminAccess(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Admin access required' 
      }, { status: 403 });
    }

    // Get the global router instance and refresh its cache
    const modelRouter = getGlobalModelRouter();
    
    // Get cache status before refresh
    const statusBefore = modelRouter.getConfigurationCacheStatus();
    
    // Force refresh the cache
    await modelRouter.refreshModelConfigurations();
    
    // Get cache status after refresh
    const statusAfter = modelRouter.getConfigurationCacheStatus();

    logger.info('AI model router cache refreshed', {
      adminId: session.user.id,
      cacheSizeBefore: statusBefore.cacheSize,
      cacheSizeAfter: statusAfter.cacheSize,
      lastUpdateBefore: statusBefore.lastUpdate,
      lastUpdateAfter: statusAfter.lastUpdate
    });

    return NextResponse.json({
      success: true,
      message: 'AI model router cache refreshed successfully',
      cacheStatus: {
        before: statusBefore,
        after: statusAfter
      }
    });

  } catch (error) {    
    logger.error('Error refreshing AI model router cache', {       
        error: error instanceof Error ? error.message : String(error)    
    });
    
    return NextResponse.json({ 
      error: 'Failed to refresh cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Get current cache status
 */
export async function GET(req: NextRequest) {
  try {
    // Check if Firebase is available (won't be during build)
    if (!firestore) {
      return NextResponse.json({ 
        error: 'Service Unavailable', 
        message: 'Firebase is not initialized. Please check server configuration.' 
      }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAdminAccess = await checkAdminAccess(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Admin access required' 
      }, { status: 403 });
    }

    // Get the global router instance
    const modelRouter = getGlobalModelRouter();
    const cacheStatus = modelRouter.getConfigurationCacheStatus();

    return NextResponse.json({
      success: true,
      cacheStatus,
      recommendations: {
        shouldRefresh: !cacheStatus.isValid,
        cacheAge: cacheStatus.lastUpdate 
          ? Math.floor((Date.now() - cacheStatus.lastUpdate.getTime()) / 1000)
          : null,
        cacheAgeFormatted: cacheStatus.lastUpdate
          ? formatDuration(Date.now() - cacheStatus.lastUpdate.getTime())
          : 'Never loaded'
      }
    });

  } catch (error) {
        const session = await getServerSession(authOptions);    
        logger.error('Error getting AI model router cache status', {       
            error: error instanceof Error ? error.message : String(error),      
            adminId: session?.user?.id    
        });
    
    return NextResponse.json({ 
      error: 'Failed to get cache status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Format duration in milliseconds to a human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
} 
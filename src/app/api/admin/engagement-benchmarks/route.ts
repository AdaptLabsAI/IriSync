import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { firebaseAdmin, serverTimestamp } from '@/lib/core/firebase/admin';
import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { logger } from '@/lib/core/logging/logger';
import { 
  DEFAULT_ENGAGEMENT_BENCHMARKS, 
  EngagementBenchmarkLevels, 
  PlatformEngagementBenchmarks 
} from '@/lib/features/analytics/models/engagement-benchmarks';
import { EngagementBenchmarkService } from '@/lib/features/analytics/engagement-benchmark-service';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Collection name constants
const AUDIT_LOGS_COLLECTION = 'auditLogs';

/**
 * Log admin actions for audit trail
 */
async function logAdminAction(adminUser: { id: string, email: string, role: string }, action: string, details: any) {
  try {
    const logRef = firebaseAdmin.firestore().collection(AUDIT_LOGS_COLLECTION).doc();
    await logRef.set({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminRole: adminUser.role,
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // Log but don't fail the request if audit logging fails
    logger.error('Failed to create audit log', { error, action, adminId: adminUser.id });
  }
}

/**
 * Format timestamp to ISO string for API responses
 */
function formatTimestamp(timestamp: Timestamp | null | undefined) {
  if (!timestamp) return null;
  return timestamp instanceof Timestamp ? timestamp.toDate().toISOString() : timestamp;
}

/**
 * Validation schema for benchmark levels
 */
const benchmarkLevelsSchema = z.object({
  low: z.number().min(0).max(100),
  average: z.number().min(0).max(100),
  high: z.number().min(0).max(100)
}).refine(data => data.low < data.average && data.average < data.high, {
  message: "Benchmark values must be in ascending order: low < average < high"
});

/**
 * Validation schema for creating/updating a benchmark
 */
const benchmarkSchema = z.object({
  platform: z.enum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok']),
  benchmarks: benchmarkLevelsSchema,
  description: z.string().optional()
});

/**
 * GET handler for retrieving all benchmarks
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Create benchmark service
    const benchmarkService = new EngagementBenchmarkService();
    
    // Get all benchmarks
    const benchmarks = await benchmarkService.getAllBenchmarks();
    
    // Format timestamps for API response
    const formattedBenchmarks = benchmarks.map(benchmark => ({
      ...benchmark,
      updatedAt: formatTimestamp(benchmark.updatedAt)
    }));
    
    // Log admin action
    await logAdminAction(adminUser, 'LIST_ENGAGEMENT_BENCHMARKS', {
      count: benchmarks.length
    });
    
    // Return formatted response
    return NextResponse.json({ benchmarks: formattedBenchmarks });
  } catch (error) {
    // Log error details
    logger.error('Error in admin engagement benchmarks GET handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to retrieve engagement benchmarks',
        message: 'An unexpected error occurred while retrieving engagement benchmarks. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * POST handler for creating/updating a custom benchmark
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = benchmarkSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const benchmarkData = validationResult.data;
    
    // Create benchmark service
    const benchmarkService = new EngagementBenchmarkService();
    
    // Generate custom benchmark ID
    const benchmarkId = `${benchmarkData.platform}_custom`;
    
    // Create benchmark object
    const benchmark: PlatformEngagementBenchmarks = {
      id: benchmarkId,
      platform: benchmarkData.platform,
      benchmarks: benchmarkData.benchmarks,
      description: benchmarkData.description || `Custom engagement benchmark for ${benchmarkData.platform}`,
      updatedAt: Timestamp.fromDate(new Date()),
      updatedBy: adminUser.id,
      isDefault: false
    };
    
    // Create or update benchmark
    await benchmarkService.updateBenchmark(
      benchmark.platform,
      benchmark.benchmarks,
      benchmark.updatedBy,
      benchmark.description
    );
    
    // Log admin action
    await logAdminAction(adminUser, 'CREATE_UPDATE_BENCHMARK', {
      platform: benchmark.platform,
      benchmarks: benchmark.benchmarks,
      description: benchmark.description
    });
    
    // Return success response
    return NextResponse.json({
      message: 'Engagement benchmark created/updated successfully',
      benchmark: {
        ...benchmark,
        updatedAt: formatTimestamp(benchmark.updatedAt)
      }
    }, {
      status: 201
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin engagement benchmarks POST handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to create/update engagement benchmark',
        message: 'An unexpected error occurred while creating/updating the engagement benchmark. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE handler for removing a custom benchmark (resets to default)
 */
export const DELETE = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get platform from query params
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform');
    
    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        { status: 400 }
      );
    }
    
    // Validate platform
    if (!['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be one of: instagram, facebook, twitter, linkedin, tiktok' },
        { status: 400 }
      );
    }
    
    // Create benchmark service
    const benchmarkService = new EngagementBenchmarkService();
    
    // Delete custom benchmark (this resets to default)
    await benchmarkService.resetToDefault(platform, adminUser.id);
    
    // Get the default benchmark that will now be used
    const defaultBenchmark = DEFAULT_ENGAGEMENT_BENCHMARKS[platform];
    
    // Log admin action
    await logAdminAction(adminUser, 'RESET_BENCHMARK', {
      platform,
      resetToDefault: defaultBenchmark
    });
    
    // Return success response
    return NextResponse.json({
      message: `Engagement benchmark for ${platform} reset to default`,
      defaultBenchmark
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin engagement benchmarks DELETE handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to reset engagement benchmark',
        message: 'An unexpected error occurred while resetting the engagement benchmark. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * PUT handler for resetting all benchmarks to default
 */
export const PUT = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Check for reset flag
    if (body.resetAllToDefault !== true) {
      return NextResponse.json(
        { error: 'resetAllToDefault must be true to perform this action' },
        { status: 400 }
      );
    }
    
    // Create benchmark service
    const benchmarkService = new EngagementBenchmarkService();
    
    // Reset all benchmarks to default
    const platforms = Object.keys(DEFAULT_ENGAGEMENT_BENCHMARKS);
    for (const platform of platforms) {
      await benchmarkService.resetToDefault(platform, adminUser.id);
    }
    
    // Force re-initialization by clearing and retrieving again
    // This will trigger initializeDefaultBenchmarks() internally when getAllBenchmarks is called on an empty collection
    
    // Get all benchmarks after reset, which will reinitialize defaults if needed
    const updatedBenchmarks = await benchmarkService.getAllBenchmarks();
    
    // Format timestamps for API response
    const formattedBenchmarks = updatedBenchmarks.map(benchmark => ({
      ...benchmark,
      updatedAt: formatTimestamp(benchmark.updatedAt)
    }));
    
    // Log admin action
    await logAdminAction(adminUser, 'RESET_ALL_BENCHMARKS', {
      platforms,
      defaultBenchmarks: DEFAULT_ENGAGEMENT_BENCHMARKS
    });
    
    // Return success response
    return NextResponse.json({
      message: 'All engagement benchmarks reset to default values',
      benchmarks: formattedBenchmarks
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin engagement benchmarks PUT handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to reset all engagement benchmarks',
        message: 'An unexpected error occurred while resetting engagement benchmarks. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
}); 
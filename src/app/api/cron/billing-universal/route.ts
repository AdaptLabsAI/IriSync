import { NextRequest, NextResponse } from 'next/server';
import { universalBillingService } from '@/lib/features/subscription/UniversalBillingService';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * Universal billing cron endpoint for all subscription tiers
 * This replaces the enterprise-only billing cron job
 * 
 * Cron schedule: "0 9 * * *" (9:00 AM UTC daily)
 * 
 * Authentication: API key required
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authenticate the cron request
    const authHeader = req.headers.get('authorization');
    const cronApiKey = process.env.CRON_API_KEY;
    
    if (!cronApiKey) {
      logger.error('CRON_API_KEY environment variable not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${cronApiKey}`) {
      logger.warn('Unauthorized cron request attempted', {
        authHeader,
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      });
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.info('Starting universal billing cron job', {
      timestamp: new Date().toISOString(),
      jobType: 'universal_billing_check'
    });
    
    // Run the universal billing check
    await universalBillingService.checkForPastDueSubscriptions();
    
    const duration = Date.now() - startTime;
    
    logger.info('Universal billing cron job completed successfully', {
      duration,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Universal billing check completed',
      duration,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Universal billing cron job failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      {
        error: 'Billing check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for the cron job
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronApiKey = process.env.CRON_API_KEY;
    
    if (!cronApiKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${cronApiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      status: 'healthy',
      service: 'universal-billing-cron',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
    
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
} 
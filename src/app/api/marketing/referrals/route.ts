import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { ReferralService } from '@/lib/features/referrals/ReferralService';
import { handleApiError } from '@/lib/features/auth/utils';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * GET /api/referrals - Get user's referral code and statistics
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const userId = session.user.id;

    const referralService = new ReferralService();

    switch (action) {
      case 'stats': {
        // Get comprehensive referral statistics
        const stats = await referralService.getUserReferralStats(userId);
        
        return NextResponse.json({
          success: true,
          stats
        });
      }

      case 'validate': {
        // Validate a referral code
        const code = searchParams.get('code');
        
        if (!code) {
          return NextResponse.json(
            { error: 'Referral code is required' },
            { status: 400 }
          );
        }

        const validation = await referralService.validateReferralCode(code, userId);
        
        return NextResponse.json({
          success: true,
          validation
        });
      }

      default: {
        // Get user's referral code (default action)
        const referralCode = await referralService.getUserReferralCode(userId);
        
        return NextResponse.json({
          success: true,
          referralCode,
          shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/register?ref=${referralCode}`
        });
      }
    }

  } catch (error) {
    logger.error('Error in referrals API', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      handleApiError(error, '/api/referrals', 'referral operation'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/referrals - Create a referral relationship
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { referralCode, source } = body;

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    const referralService = new ReferralService();
    
    // Get client IP and user agent for tracking
    const forwarded = req.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const referral = await referralService.createReferral(
      referralCode,
      session.user.id,
      {
        ipAddress,
        userAgent,
        source: source || 'manual'
      }
    );

    logger.info('Referral relationship created via API', {
      referralId: referral.id,
      referrerUserId: referral.referrerUserId,
      referredUserId: session.user.id,
      code: referralCode
    });

    return NextResponse.json({
      success: true,
      message: 'Referral relationship created successfully',
      referral: {
        id: referral.id,
        code: referral.referralCode,
        status: referral.status
      }
    });

  } catch (error) {
    logger.error('Error creating referral relationship', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create referral relationship',
        success: false 
      },
      { status: 400 }
    );
  }
} 
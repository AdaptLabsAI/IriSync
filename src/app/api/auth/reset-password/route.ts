import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger';
import { handleApiError } from '@/lib/auth/utils';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Firebase password reset should be handled directly on the client side
    // This endpoint just logs the request and returns a common response
    // for security reasons (not revealing if email exists or not)
    
    logger.info({ email }, 'Password reset requested');
    
    return NextResponse.json({
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      handleApiError(error, '/api/auth/reset-password', 'password reset'),
      { status: 500 }
    );
  }
}

// Implement OPTIONS for CORS support
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
} 
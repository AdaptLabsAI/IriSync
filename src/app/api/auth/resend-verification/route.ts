import { NextRequest, NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/core/firebase/admin';
import { sendEmailVerificationLink } from '@/lib/core/notifications/email';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
        
    // Try to get the user by email
    const userRecord = await firebaseAdmin
      .auth()
      .getUserByEmail(email)
      .catch(() => null);
    
    // If user doesn't exist or is already verified, don't reveal this information
    // for security reasons, but log it
    if (!userRecord) {
      logger.info(`Verification email requested for non-existent user: ${email}`);
      
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ 
        success: true,
        message: 'If your email is registered and not verified, you will receive a verification link'
      });
    }
    
    // If user is already verified, just return success
    if (userRecord.emailVerified) {
      logger.info(`Verification email requested for already verified user: ${email}`);
      
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ 
        success: true,
        message: 'If your email is registered and not verified, you will receive a verification link'
      });
    }
    
    // Generate a new verification link
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.irisync.com'}/auth/verify-email?uid=${userRecord.uid}`,
      handleCodeInApp: true,
    };
    
    const verificationLink = await firebaseAdmin
      .auth()
      .generateEmailVerificationLink(email, actionCodeSettings)
      .catch(error => {
        logger.error('Error generating verification link:', { error, email });
        throw new Error(`Failed to generate verification link: ${error.message}`);
      });
    
    // Send the email using our custom template
    await sendEmailVerificationLink(
      email, 
      verificationLink, 
      userRecord.displayName || ''
    ).catch(error => {
      logger.error('Error sending verification email template:', { error, email });
      throw new Error(`Failed to send email template: ${error.message}`);
    });
    
    logger.info(`Verification email resent to ${email} for user ${userRecord.uid}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Verification email sent successfully' 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Resend verification API error:', { error: errorMessage });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        message: 'Failed to send verification email',
      },
      { status: 500 }
    );
  }
}

// Options for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
} 
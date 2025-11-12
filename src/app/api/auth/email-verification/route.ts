import { NextRequest, NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/core/firebase/admin';
import { sendEmailVerificationLink } from '@/lib/core/notifications/email';
import { logger } from '@/lib/core/logging/logger';

export async function POST(request: NextRequest) {
  try {
    const { uid, email, displayName } = await request.json();
    
    if (!uid || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    
    // Use Firebase Admin SDK to generate a custom verification link
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.irisync.com'}/auth/verify-email?uid=${uid}`,
      handleCodeInApp: true,
    };
    
    // Generate a verification link
    const verificationLink = await firebaseAdmin
      .auth()
      .generateEmailVerificationLink(email, actionCodeSettings)
      .catch((error: Error) => {
        logger.error('Error generating verification link:', { error, email, uid });
        throw new Error(`Failed to generate verification link: ${error.message}`);
      });
    
    // Send the email using our custom template
    await sendEmailVerificationLink(email, verificationLink, displayName)
      .catch(error => {
        logger.error('Error sending verification email template:', { error, email, uid });
        throw new Error(`Failed to send email template: ${error.message}`);
      });
    
    logger.info(`Verification email sent to ${email} for user ${uid}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Verification email sent successfully' 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Email verification API error:', { error: errorMessage });
    
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
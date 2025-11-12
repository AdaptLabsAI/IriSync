import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { SubscriptionTier as BaseSubscriptionTier } from '@/lib/features/subscription/models/subscription';
import { UserService } from '@/lib/features/auth/user-service';
import { UserRole } from '@/lib/core/models/User';
import { auth as clientAuth } from '@/lib/core/firebase';
import { auth as adminAuth } from '@/lib/core/firebase/admin';
import logger from '@/lib/core/logging/logger';
import { handleApiError } from '@/lib/features/auth/utils';

// Service instances
const userService = new UserService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      subscriptionTier,
      businessType,
      companyName,
      companySize,
      acceptTerms
    } = body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (!acceptTerms) {
      return NextResponse.json(
        { error: 'Terms and conditions must be accepted' },
        { status: 400 }
      );
    }

    // Validate subscription tier - Enterprise customers must use quote form
    const validTiers = ['creator', 'influencer'];
    if (!validTiers.includes(subscriptionTier)) {
      if (subscriptionTier === 'enterprise') {
        return NextResponse.json(
          { 
            error: 'Enterprise customers must use our custom quote process',
            redirectTo: '/enterprise/quote',
            title: 'Enterprise Registration',
            message: 'To ensure you receive the best pricing and features for your enterprise needs, please use our custom quote form. This allows us to tailor a solution specifically for your organization.',
            action: 'Continue to Enterprise Quote Form'
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Validate business details for company registration
    if (businessType === 'company' && !companyName) {
      return NextResponse.json(
        { error: 'Company name is required for business accounts' },
        { status: 400 }
      );
    }

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(clientAuth, email, password);
      const userRecord = userCredential.user;

      // Map subscription tier to enum
      let tierEnum: BaseSubscriptionTier;
      
      switch (subscriptionTier) {
        case 'creator':
          tierEnum = BaseSubscriptionTier.CREATOR;
          break;
        case 'influencer':
          tierEnum = BaseSubscriptionTier.INFLUENCER;
          break;
        default:
          tierEnum = BaseSubscriptionTier.CREATOR;
      }

      // Create user and organization - NO BILLING SETUP YET
      const result = await userService.createUser({
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        firebaseAuthId: userRecord.uid,
        role: UserRole.USER,
        status: 'active',
        organizations: []
      }, {
        subscriptionTier: tierEnum,
        organizationType: businessType === 'company' ? 'business' : 'personal',
        companyName: businessType === 'company' ? companyName : undefined,
        seats: 1,
        customToken: true,
        userSettings: true,
        defaultFolders: true
      });

      // Set custom claims to include role and preferred subscription tier
      await adminAuth.setCustomUserClaims(userRecord.uid, {
        role: UserRole.USER,
        preferredTier: subscriptionTier // Store their preference for trial setup
      });

      logger.info('User registered successfully - trial eligible', {
        userId: userRecord.uid,
        organizationId: result.organizationId,
        preferredTier: subscriptionTier,
        businessType
      });

      // Return success - user will be prompted to start trial after login
      return NextResponse.json({
        success: true,
        message: 'Account created successfully! You can start your 7-day free trial after logging in.',
        userId: userRecord.uid,
        customToken: result.customToken,
        organizationId: result.organizationId,
        preferredTier: subscriptionTier,
        nextStep: 'start_trial', // Frontend knows to show trial setup
        trialEligible: true
      });
      
    } catch (firebaseError) {
      console.error('Firebase error:', firebaseError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      handleApiError(error, '/api/auth/register', 'user registration'),
      { status: 500 }
    );
  }
}

/**
 * GET method not allowed
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

// Implement OPTIONS for CORS support
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
} 
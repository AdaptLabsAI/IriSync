import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/features/auth/utils';
import { ensureUserDocument } from '@/lib/features/auth/sync';
import { logger } from '@/lib/core/logging/logger';
import { handleApiError } from '@/lib/features/auth/utils';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * Ensure user document API route
 * 
 * This endpoint ensures that the authenticated user has a corresponding Firestore document.
 * It's meant to be called as part of the auth flow if a user gets a permission denied error.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user ID
    const userId = await verifyAuthentication(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json().catch(() => ({}));
    const forceUpdate = body.forceUpdate || false;
    
    // Ensure user document exists
    const userData = await ensureUserDocument(userId, forceUpdate);
    
    if (!userData) {
      return NextResponse.json(
        { error: 'Failed to ensure user document' },
        { status: 500 }
      );
    }
    
    // Return a sanitized user object (without sensitive information)
    const sanitizedUser = {
      id: userId,
      uid: userId,
      email: userData.email,
      name: userData.name,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      emailVerified: userData.emailVerified,
      currentOrganizationId: userData.currentOrganizationId,
      personalOrganizationId: userData.personalOrganizationId,
      // Legacy field for backward compatibility
      organizationId: userData.currentOrganizationId || userData.personalOrganizationId,
      businessType: userData.businessType,
      companyName: userData.companyName,
      subscription: {
        tier: userData.subscription.tier,
        status: userData.subscription.status
      }
    };
    
    logger.info(`User document ensured for ${userId}`);
    
    return NextResponse.json({
      success: true,
      user: sanitizedUser
    });
  } catch (error) {
    logger.error('Error ensuring user document:', error);
    return NextResponse.json(
      handleApiError(error, '/api/auth/ensure-document', 'ensuring user document'),
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests - redirects to POST
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user ID
    const userId = await verifyAuthentication(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Ensure user document exists (never force update on GET)
    const userData = await ensureUserDocument(userId, false);
    
    if (!userData) {
      return NextResponse.json(
        { error: 'Failed to ensure user document' },
        { status: 500 }
      );
    }
    
    // Return a sanitized user object (without sensitive information)
    const sanitizedUser = {
      id: userId,
      uid: userId,
      email: userData.email,
      name: userData.name,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      emailVerified: userData.emailVerified,
      currentOrganizationId: userData.currentOrganizationId,
      personalOrganizationId: userData.personalOrganizationId,
      // Legacy field for backward compatibility
      organizationId: userData.currentOrganizationId || userData.personalOrganizationId,
      businessType: userData.businessType,
      companyName: userData.companyName,
      subscription: {
        tier: userData.subscription.tier,
        status: userData.subscription.status
      }
    };
    
    return NextResponse.json({
      success: true,
      user: sanitizedUser
    });
  } catch (error) {
    logger.error('Error ensuring user document:', error);
    return NextResponse.json(
      handleApiError(error, '/api/auth/ensure-document', 'ensuring user document'),
      { status: 500 }
    );
  }
} 
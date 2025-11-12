/**
 * Error handling middleware for authentication-related errors
 * 
 * This middleware detects permission denied errors from Firestore,
 * determines if they're caused by missing user documents, and tries to resolve them
 * by creating the necessary documents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from './utils';
import { ensureUserDocument } from './sync';
import { logger } from '@/lib/logging/logger';

/**
 * Middleware that handles Firestore permission denied errors
 * by ensuring user documents exist
 */
export async function authErrorMiddleware(
  request: NextRequest,
  errorData: any
) {
  // Check if this is a permission denied error from Firestore
  const isPermissionDenied = 
    errorData?.code === 'permission-denied' || 
    errorData?.error?.code === 'permission-denied' ||
    errorData?.message?.includes('Permission denied') ||
    errorData?.error?.message?.includes('Permission denied');
  
  if (!isPermissionDenied) {
    // If not a permission denied error, just return the original error
    return NextResponse.json(errorData, { status: errorData.status || 403 });
  }
  
  try {
    // Verify authentication
    const userId = await verifyAuthentication(request);
    
    if (!userId) {
      // User isn't authenticated, return original error
      return NextResponse.json(errorData, { status: errorData.status || 403 });
    }
    
    // Try to create/ensure the user document exists
    logger.info(`Attempting to fix permission denied error for user ${userId}`);
    const userData = await ensureUserDocument(userId, true);
    
    if (!userData) {
      // Failed to create user document, return original error
      logger.error(`Failed to create user document for ${userId}`);
      return NextResponse.json(errorData, { status: errorData.status || 403 });
    }
    
    // Document was created/updated successfully, let's try the original request again
    logger.info(`User document created/updated for ${userId}, redirecting to retry original request`);
    
            // Return a response that signals the client to retry the original request    
    return NextResponse.json({      
      error: 'permission_denied_fixed',      
      message: 'User document has been created. Please retry your request.',      
      user: {        
        id: userId,        
        role: userData.role,        
        organizationId: userData.currentOrganizationId || userData.personalOrganizationId      
      },      
      shouldRetry: true    
    }, { status: 409 }); // 409 Conflict - temporary condition that might be fixed with a retry
  } catch (error) {
    logger.error('Error in auth error middleware:', error);
    return NextResponse.json(errorData, { status: errorData.status || 403 });
  }
}

/**
 * Check if the error is a Firestore permission denied error
 */
export function isPermissionDeniedError(error: any): boolean {
  if (!error) return false;
  
  return (
    error.code === 'permission-denied' ||
    error.name === 'FirebaseError' && error.code === 'permission-denied' ||
    error.message?.includes('Permission denied') ||
    error.message?.includes('PERMISSION_DENIED') ||
    error.error?.code === 'permission-denied' ||
    error.error?.message?.includes('Permission denied')
  );
} 
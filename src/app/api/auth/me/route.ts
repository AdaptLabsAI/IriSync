import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/features/auth/utils';
import { getFirestore } from '@/lib/core/firebase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { validateUserOrganizationConnections } from '@/lib/core/utils';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Debug endpoint to get the current user information
 * This is useful for troubleshooting authentication issues
 */
export async function GET(req: NextRequest) {
  try {
    // Try to get user from NextAuth session
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id;
    
    // Also try to verify Firebase auth
    const firebaseUserId = await verifyAuthentication(req);
    
    // If we don't have either auth method, return unauthorized
    if (!sessionUserId && !firebaseUserId) {
      return NextResponse.json({ 
        message: 'Not authenticated',
        nextAuth: { authenticated: false },
        firebase: { authenticated: false }
      }, { status: 401 });
    }
    
    // Use the ID we found and ensure it's a string
    const userId = sessionUserId || firebaseUserId;
    
    // Safety check to ensure userId is a string
    if (!userId) {
      return NextResponse.json({ 
        message: 'User ID is missing',
        error: 'Authentication issue detected'
      }, { status: 401 });
    }
    
    // Get the user data from Firestore
    const db = getFirestore();
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    // Check if we found a user document
    if (!userDoc.exists) {
      return NextResponse.json({ 
        message: 'User document not found',
        userId: userId,
        authenticated: true,
        auth: {
          nextAuth: !!sessionUserId,
          firebase: !!firebaseUserId
        }
      }, { status: 404 });
    }
    
    const userData = userDoc.data();
    let organizationData = null;
    
    // Validate and get the organization ID for the user
    const orgValidation = await validateUserOrganizationConnections(userId, userData, db);

    // Update user document if organization connections were fixed
    if (!orgValidation.isValid) {
      console.warn('Fixed organization connections for user in /api/auth/me', { 
        userId: userId, 
        errors: orgValidation.errors 
      });
      
      await updateDoc(userDocRef as any, {
        personalOrganizationId: orgValidation.personalOrganizationId,
        currentOrganizationId: orgValidation.currentOrganizationId,
        updatedAt: serverTimestamp() // Use serverTimestamp for Firestore
      });
      // Optionally, re-fetch userData if the updated fields are critical for the rest of the response
      // const updatedUserDoc = await userDocRef.get();
      // userData = updatedUserDoc.data(); 
    }

    // Get the user's organization using the validated ID
    if (orgValidation.currentOrganizationId) {
      const orgDocRef = db.collection('organizations').doc(orgValidation.currentOrganizationId);
      const orgDoc = await orgDocRef.get();
      if (orgDoc.exists) {
        organizationData = orgDoc.data();
      } else {
        // This case should ideally be rare if validateUserOrganizationConnections works correctly
        // and creates/repairs orgs, but good to log if it happens.
        console.error('Organization document not found even after validation', { 
          userId, 
          organizationId: orgValidation.currentOrganizationId 
        });
      }
    }
    
    // Return the user information
    return NextResponse.json({
      message: 'Authentication debug information',
      auth: {
        nextAuth: {
          authenticated: !!sessionUserId,
          session: session
        },
        firebase: {
          authenticated: !!firebaseUserId,
          userId: firebaseUserId
        }
      },
      user: {
        id: userId,
        ...userData,
        // Remove sensitive info
        passwordHash: undefined,
      },
      organization: organizationData,
    });
    
  } catch (error) {
    console.error('Error getting user info:', error);
    return NextResponse.json({ 
      error: 'Server error',
      message: 'An error occurred while getting user information',
      errorDetail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
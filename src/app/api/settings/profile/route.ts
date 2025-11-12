import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getFirestore, serverTimestamp } from '@/lib/firebase/admin';
import { logger } from '@/lib/logging/logger';

const firestore = getFirestore();

interface SessionUser {
  id?: string;
  email?: string;
}

/**
 * Verify user authentication and return userId if authenticated
 */
async function verifyAuthentication(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  
  const user = session.user as SessionUser;
  return user.id || null;
}

/**
 * Get the current user's profile including organization data
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = session.user as SessionUser;
    const userId = user.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid session', message: 'User ID not found in session' },
        { status: 400 }
      );
    }
    
    // Get the user profile from Firestore
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Not found', message: 'User profile not found' },
        { status: 404 }
      );
    }
    
    const userData = userDoc.data();
    
    // Get organization data if the user has an organization
    let organizationData = null;
    const organizationId = userData?.currentOrganizationId || userData?.personalOrganizationId;
    if (organizationId) {
      // Warn about deprecated field usage
      if (userData?.organizationId) {
        console.warn('Using deprecated user.organizationId field', { userId });
      }
      
      const orgDoc = await firestore.collection('organizations').doc(organizationId).get();
      
      if (orgDoc.exists) {
        const orgData = orgDoc.data();
        
        // Get user's role in the organization
        const memberDoc = await firestore
          .collection('organizations')
          .doc(organizationId)
          .collection('members')
          .doc(userId)
          .get();
        
        const memberRole = memberDoc.exists ? memberDoc.data()?.role : 'member';
        
        organizationData = {
          id: orgDoc.id,
          name: orgData?.name,
          subscriptionTier: orgData?.subscriptionTier,
          role: memberRole
        };
      }
    }
    
    // Construct the user profile with organization data
    const profile = {
      id: userDoc.id,
      email: userData?.email,
      name: userData?.name || user.email,
      image: userData?.image,
      role: userData?.role || 'user',
      createdAt: userData?.createdAt ? userData?.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: userData?.updatedAt ? userData?.updatedAt.toDate().toISOString() : new Date().toISOString(),
      // Add organization data if it exists
      ...(organizationData && {
        organizationId: organizationData.id,
        organizationName: organizationData.name,
        organizationRole: organizationData.role,
        organizationSubscriptionTier: organizationData.subscriptionTier
      })
    };
    
    return NextResponse.json({ 
      success: true, 
      profile 
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const userId = await verifyAuthentication(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { name, firstName, lastName, avatar, companyName, companySize } = body;
    
    // Get Firestore instance
    const firestore = getFirestore();
    
    // Prepare updates
    const updates: Record<string, any> = {
      updatedAt: serverTimestamp()
    };
    
    // Add fields if they exist in the request
    if (name) updates.name = name;
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (avatar) updates.avatar = avatar;
    if (companyName) updates.companyName = companyName;
    if (companySize) updates.companySize = companySize;
    
    // Update user document
    await firestore.collection('users').doc(userId).update(updates);
    
    // Log activity
    await firestore.collection('users').doc(userId).collection('activity').add({
      action: 'update_profile',
      timestamp: serverTimestamp(),
      details: {
        updatedFields: Object.keys(updates).filter(k => k !== 'updatedAt')
      }
    });
    
    // Log successful request
    logger.info({ userId, updatedFields: Object.keys(updates) }, 'Profile updated successfully');
    
    return NextResponse.json({ 
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error({ error: errorMsg }, 'Error updating user profile');
    
    return NextResponse.json({ 
      error: 'Failed to update profile', 
      message: 'An error occurred while updating your profile'
    }, { status: 500 });
  }
} 
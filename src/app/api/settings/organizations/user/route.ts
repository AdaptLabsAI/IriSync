import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getOrganizationsByUser } from '@/lib/team/users/organization';
import { logger } from '@/lib/logging/logger';

interface SessionUser {
  id?: string;
  email?: string;
}

/**
 * API to get all organizations a user belongs to
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

    // Get all organizations the user belongs to
    const organizations = await getOrganizationsByUser(userId);

    // Format the response
    const formattedOrganizations = organizations.map(org => ({
      id: org.id,
      name: org.name,
      subscriptionTier: org.metadata?.subscriptionTier || org.plan || 'creator',
      role: org.role,
      logo: org.metadata?.logoUrl || null,
      memberCount: org.members?.length || 0
    }));

    return NextResponse.json({ 
      success: true, 
      organizations: formattedOrganizations
    });
  } catch (error) {
    logger.error('Error fetching user organizations', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
} 
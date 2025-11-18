/**
 * Team Invite API
 * POST /api/team/invite - Send team invitation
 * GET /api/team/invite - Get pending invitations
 * DELETE /api/team/invite - Cancel invitation
 * PATCH /api/team/invite - Accept invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { firestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { teamService, TeamRole } from '@/lib/features/team/TeamService';

/**
 * POST /api/team/invite
 * Send team invitation
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's organization
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User Not Found', message: 'User document not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Organization not found' },
        { status: 400 }
      );
    }

    // Check permissions
    const hasPermission = await teamService.hasPermission(userId, organizationId, 'canInviteMembers');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to invite team members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'email and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(TeamRole).includes(role)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: `Invalid role. Must be one of: ${Object.values(TeamRole).join(', ')}` },
        { status: 400 }
      );
    }

    // Create invitation
    const invite = await teamService.createInvite(
      organizationId,
      email,
      role,
      userId,
      userData.name || userData.email
    );

    // TODO: Send invitation email
    // This would integrate with email service

    return NextResponse.json({
      success: true,
      invite,
      message: 'Invitation sent successfully',
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to send invitation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/team/invite
 * Get pending invitations
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's organization
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User Not Found', message: 'User document not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Organization not found' },
        { status: 400 }
      );
    }

    // Get pending invitations
    const invites = await teamService.getPendingInvites(organizationId);

    return NextResponse.json({
      success: true,
      invites,
      count: invites.length,
    });
  } catch (error) {
    console.error('Error getting invitations:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get invitations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/team/invite
 * Accept invitation
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const body = await request.json();
    const { inviteId } = body;

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'inviteId is required' },
        { status: 400 }
      );
    }

    // Get user data
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    const userName = userDoc.exists() ? userDoc.data().name || userDoc.data().email : undefined;

    // Accept invitation
    const member = await teamService.acceptInvite(inviteId, userId, userName);

    return NextResponse.json({
      success: true,
      member,
      message: 'Invitation accepted successfully',
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to accept invitation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/invite
 * Cancel invitation
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's organization
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User Not Found', message: 'User document not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Organization not found' },
        { status: 400 }
      );
    }

    // Check permissions
    const hasPermission = await teamService.hasPermission(userId, organizationId, 'canInviteMembers');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to cancel invitations' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const inviteId = searchParams.get('inviteId');

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'inviteId query parameter is required' },
        { status: 400 }
      );
    }

    // Cancel invitation
    await teamService.cancelInvite(inviteId, userId);

    return NextResponse.json({
      success: true,
      message: 'Invitation canceled successfully',
    });
  } catch (error) {
    console.error('Error canceling invitation:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to cancel invitation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Team Members API
 * GET /api/team/members - List team members
 * POST /api/team/members - Add team member
 * PATCH /api/team/members - Update member role
 * DELETE /api/team/members - Remove member
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { firestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { teamService, TeamRole } from '@/lib/features/team/TeamService';

/**
 * GET /api/team/members
 * List team members for organization
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

    // Get team members
    const members = await teamService.getTeamMembers(organizationId);

    return NextResponse.json({
      success: true,
      members,
      count: members.length,
    });
  } catch (error) {
    console.error('Error getting team members:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get team members',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team/members
 * Add team member to organization
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
        { error: 'Forbidden', message: 'You do not have permission to add team members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { newUserId, email, role, name } = body;

    if (!newUserId || !email || !role) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'newUserId, email, and role are required' },
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

    // Add team member
    const member = await teamService.addTeamMember(
      newUserId,
      organizationId,
      email,
      role,
      userId,
      name
    );

    return NextResponse.json({
      success: true,
      member,
      message: 'Team member added successfully',
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to add team member',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/team/members
 * Update team member role
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
    const hasPermission = await teamService.hasPermission(userId, organizationId, 'canManageRoles');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to manage roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, newRole } = body;

    if (!memberId || !newRole) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'memberId and newRole are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(TeamRole).includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: `Invalid role. Must be one of: ${Object.values(TeamRole).join(', ')}` },
        { status: 400 }
      );
    }

    // Update member role
    await teamService.updateMemberRole(memberId, newRole, userId);

    return NextResponse.json({
      success: true,
      message: 'Member role updated successfully',
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to update member role',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/members
 * Remove team member
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
    const hasPermission = await teamService.hasPermission(userId, organizationId, 'canRemoveMembers');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to remove team members' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'memberId query parameter is required' },
        { status: 400 }
      );
    }

    // Remove member
    await teamService.removeMember(memberId, userId);

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to remove team member',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy
} from 'firebase/firestore';
import { firestore } from '../../../../../lib/core/firebase';
import { OrganizationRole, TeamRole } from '../../../../../lib/features/user/types';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


interface TeamMembership {
  teamId: string;
  teamName: string;
  organizationId: string;
  organizationName: string;
  organizationRole: OrganizationRole;
  teamRole?: TeamRole;
  joinedAt: string;
  isActive: boolean;
  permissions: string[];
}

/**
 * Get all team memberships for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;
    
    // Query all teams where user is a member
    const teamsRef = collection(firestore, 'teams');
    const teamsQuery = query(
      teamsRef,
      where('members', 'array-contains-any', [
        { userId },
        { userId, isActive: true }
      ]),
      orderBy('name')
    );
    
    const teamsSnapshot = await getDocs(teamsQuery);
    const memberships: TeamMembership[] = [];
    
    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const teamId = teamDoc.id;
      
      // Find user's membership in this team
      const userMembership = teamData.members?.find((m: any) => 
        m.userId === userId && m.isActive !== false
      );
      
      if (userMembership) {
        // Get organization information
        let organizationName = teamData.organizationName || 'Default Organization';
        
        const membership: TeamMembership = {
          teamId,
          teamName: teamData.name,
          organizationId: teamData.organizationId,
          organizationName,
          organizationRole: userMembership.organizationRole as OrganizationRole,
          teamRole: userMembership.teamRole as TeamRole,
          joinedAt: userMembership.joinedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          isActive: userMembership.isActive !== false,
          permissions: calculatePermissions(
            userMembership.organizationRole as OrganizationRole,
            userMembership.teamRole as TeamRole
          )
        };
        
        memberships.push(membership);
      }
    }
    
    return NextResponse.json({
      teams: memberships,
      count: memberships.length
    });
    
  } catch (error) {
    console.error('Error fetching team memberships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team memberships' },
      { status: 500 }
    );
  }
}

/**
 * Calculate permissions based on organization and team roles
 */
function calculatePermissions(
  organizationRole: OrganizationRole,
  teamRole?: TeamRole
): string[] {
  const permissions: string[] = [];
  
  // Organization-level permissions
  switch (organizationRole) {
    case OrganizationRole.OWNER:
      permissions.push(
        'manage_organization',
        'manage_billing',
        'manage_all_teams',
        'view_all_analytics',
        'manage_users',
        'create_content',
        'edit_content',
        'delete_content',
        'publish_content',
        'manage_settings'
      );
      break;
      
    case OrganizationRole.ORG_ADMIN:
      permissions.push(
        'manage_all_teams',
        'view_all_analytics',
        'manage_users',
        'create_content',
        'edit_content',
        'delete_content',
        'publish_content',
        'manage_settings'
      );
      break;
      
    case OrganizationRole.VIEWER:
      permissions.push(
        'view_analytics',
        'view_content'
      );
      break;
      
    case OrganizationRole.MEMBER:
      // Team-level permissions for members
      if (teamRole) {
        switch (teamRole) {
          case TeamRole.TEAM_ADMIN:
            permissions.push(
              'manage_team',
              'manage_team_members',
              'view_team_analytics',
              'create_content',
              'edit_content',
              'delete_content',
              'publish_content',
              'assign_tasks'
            );
            break;
            
          case TeamRole.EDITOR:
            permissions.push(
              'view_team_analytics',
              'create_content',
              'edit_content',
              'publish_content',
              'assign_tasks'
            );
            break;
            
          case TeamRole.CONTRIBUTOR:
            permissions.push(
              'create_content',
              'edit_own_content',
              'view_assigned_tasks'
            );
            break;
            
          case TeamRole.OBSERVER:
            permissions.push(
              'view_content',
              'view_assigned_tasks'
            );
            break;
        }
      }
      break;
  }
  
  return permissions;
} 
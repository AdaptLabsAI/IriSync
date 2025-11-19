import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { handleApiError } from '@/lib/features/auth/utils';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * Switch user's current team context
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;
    const { teamId, organizationId } = await request.json();
    
    if (!teamId || !organizationId) {
      return NextResponse.json(
        { error: 'teamId and organizationId are required' },
        { status: 400 }
      );
    }
    
    // Verify the team exists and user is a member
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const teamsRef = collection(firestore, 'teams');
    const teamQuery = query(teamsRef, where('id', '==', teamId));
    const teamSnapshot = await getDocs(teamQuery);
    
    if (teamSnapshot.empty) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    const teamData = teamSnapshot.docs[0].data();
    
    // Verify team belongs to the specified organization
    if (teamData.organizationId !== organizationId) {
      return NextResponse.json({ 
        error: 'Team does not belong to the specified organization' 
      }, { status: 400 });
    }
    
    // Verify user is a member of this team
    const userMember = teamData.members?.find((m: any) => m.userId === userId);
    if (!userMember) {
      return NextResponse.json({ 
        error: 'User is not a member of this team' 
      }, { status: 403 });
    }
    
    // Update user's current team in their user document
    const usersRef = collection(firestore, 'users');
    const userQuery = query(usersRef, where('id', '==', userId));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      // If user document doesn't exist, create it
      const userDocRef = doc(usersRef, userId);
      await updateDoc(userDocRef, {
        currentTeamId: teamId,
        currentOrganizationId: organizationId,
        lastTeamSwitch: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Update existing user document
      const userDocRef = userSnapshot.docs[0].ref;
      await updateDoc(userDocRef, {
        currentTeamId: teamId,
        lastTeamSwitch: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    // Log the team switch activity
    logger.info('Info', { type: 'team_switch',
      userId,
      teamId,
      organizationId,
      teamName: teamData.name
    }, `User ${userId} switched to team ${teamData.name}`);
    
    return NextResponse.json({
      message: 'Team switched successfully',
      teamId,
      teamName: teamData.name,
      organizationId
    });
    
  } catch (error) {
    console.error('Error switching teams:', error);
    logger.error('Error', { type: 'team_switch_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Failed to switch teams');
    
    return NextResponse.json(
      handleApiError(error, '/api/settings/teams/switch', 'switching teams'),
      { status: 500 }
    );
  }
}

/**
 * Get user's current team context
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;
    const url = new URL(request.url);
    const organizationId = url.searchParams.get('organizationId');
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }
    
    // Get user's current team from user document
    const usersRef = collection(firestore, 'users');
    const userQuery = query(usersRef, where('id', '==', userId));
    const userSnapshot = await getDocs(userQuery);
    
    let currentTeamId = null;
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      currentTeamId = userData.currentTeamId;
    }
    
    // If no current team is set, find user's default team in the organization
    if (!currentTeamId) {
      const teamsRef = collection(firestore, 'teams');
      const userTeamsQuery = query(
        teamsRef, 
        where('organizationId', '==', organizationId)
      );
      const teamsSnapshot = await getDocs(userTeamsQuery);
      
      // Find teams where user is a member
      const userTeams = teamsSnapshot.docs.filter(doc => {
        const teamData = doc.data();
        return teamData.members?.some((m: any) => m.userId === userId);
      });
      
      if (userTeams.length > 0) {
        // Prefer default team, otherwise use first team
        const defaultTeam = userTeams.find(doc => doc.data().isDefault);
        const selectedTeam = defaultTeam || userTeams[0];
        currentTeamId = selectedTeam.data().id;
        
        // Update user document with the selected team
        if (!userSnapshot.empty) {
          await updateDoc(userSnapshot.docs[0].ref, {
            currentTeamId,
            updatedAt: serverTimestamp()
          });
        }
      }
    }
    
    // Get team details if we have a current team
    let teamDetails = null;
    if (currentTeamId) {
      const teamsRef = collection(firestore, 'teams');
      const teamQuery = query(teamsRef, where('id', '==', currentTeamId));
      const teamSnapshot = await getDocs(teamQuery);
      
      if (!teamSnapshot.empty) {
        const teamData = teamSnapshot.docs[0].data();
        const userMember = teamData.members?.find((m: any) => m.userId === userId);
        
        teamDetails = {
          id: currentTeamId,
          name: teamData.name,
          description: teamData.description,
          organizationId: teamData.organizationId,
          memberCount: teamData.members?.length || 0,
          userRole: {
            organizationRole: userMember?.organizationRole,
            teamRole: userMember?.teamRole
          },
          isDefault: teamData.isDefault || false
        };
      }
    }
    
    return NextResponse.json({
      currentTeamId,
      teamDetails,
      organizationId
    });
    
  } catch (error) {
    console.error('Error getting current team:', error);
    return NextResponse.json(
      handleApiError(error, '/api/settings/teams/switch', 'getting current team'),
      { status: 500 }
    );
  }
} 
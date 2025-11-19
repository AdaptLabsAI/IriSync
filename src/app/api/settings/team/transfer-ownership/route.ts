import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { doc, getDoc, runTransaction, Timestamp } from 'firebase/firestore';
import { 
  Organization, 
  FirestoreOrganization, 
  FirestoreOrganizationMember, 
  OrganizationRoleType,
  firestoreToOrganization
} from '@/lib/core/models/Organization';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
  role?: string;
}

/**
 * Get user's current organization and team context
 */
async function getUserOrganizationContext(userId: string) {
  const userDoc = await getDoc(doc(firestore, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc.data();
  const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;
  
  if (!organizationId) {
    throw new Error('User has no organization context');
  }
  
  const orgDoc = await getDoc(doc(firestore, 'organizations', organizationId));
  if (!orgDoc.exists()) {
    throw new Error('Organization not found');
  }
  
  const membersDoc = await getDoc(doc(firestore, 'organizations', organizationId, 'members', 'data'));
  const teamsDoc = await getDoc(doc(firestore, 'organizations', organizationId, 'teams', 'data'));
  
  const orgData = orgDoc.data() as FirestoreOrganization;
  const membersData = membersDoc.exists() ? membersDoc.data() : {};
  const teamsData = teamsDoc.exists() ? teamsDoc.data() : {};
  
  const members: FirestoreOrganizationMember[] = Object.values(membersData);
  const organization = firestoreToOrganization(organizationId, orgData, members, teamsData);
  
  return { organization, organizationId };
}

/**
 * Transfer team ownership
 * POST /api/settings/team/transfer-ownership
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ 
        error: { 
          type: 'UNAUTHORIZED',
          message: 'Authentication required to transfer ownership',
          timestamp: new Date().toISOString()
        }
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: { 
          type: 'UNAUTHORIZED',
          message: 'User ID not found in session',
          timestamp: new Date().toISOString()
        }
      }, { status: 401 });
    }
    
    const { teamId, newOwnerId, confirmed } = await req.json();
    
    if (!teamId || !newOwnerId) {
      return NextResponse.json({ 
        error: { 
          type: 'VALIDATION_ERROR',
          message: 'Team ID and new owner ID are required',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }
    
    if (!confirmed) {
      return NextResponse.json({ 
        error: { 
          type: 'CONFIRMATION_REQUIRED',
          message: 'Ownership transfer must be confirmed',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }
    
    // Get user's organization context
    const { organization, organizationId } = await getUserOrganizationContext(user.id);
    
    // Check if current user is the owner
    if (organization.ownerUserId !== user.id) {
      return NextResponse.json({ 
        error: { 
          type: 'FORBIDDEN',
          message: 'Only the organization owner can transfer ownership',
          timestamp: new Date().toISOString()
        }
      }, { status: 403 });
    }
    
    // Check if new owner is a member of the organization
    const newOwnerMember = organization.members[newOwnerId];
    if (!newOwnerMember) {
      return NextResponse.json({ 
        error: { 
          type: 'MEMBER_NOT_FOUND',
          message: 'The specified user is not a member of this organization',
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }
    
    // Check if team exists
    const team = organization.teams?.[teamId];
    if (!team) {
      return NextResponse.json({ 
        error: { 
          type: 'TEAM_NOT_FOUND',
          message: 'The specified team was not found',
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }
    
    // Check if new owner is a member of the team
    if (!team.memberIds.includes(newOwnerId)) {
      return NextResponse.json({ 
        error: { 
          type: 'NOT_TEAM_MEMBER',
          message: 'The new owner must be a member of the team',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }
    
    // Perform the ownership transfer
    await runTransaction(firestore, async (transaction) => {
      const orgRef = doc(firestore, 'organizations', organizationId);
      const membersRef = doc(firestore, 'organizations', organizationId, 'members', 'data');
      const teamsRef = doc(firestore, 'organizations', organizationId, 'teams', 'data');
      
      // Update organization owner
      transaction.update(orgRef, {
        ownerUserId: newOwnerId,
        updatedAt: Timestamp.now()
      });
      
      // Update member roles
      const updatedMembers = { ...organization.members };
      
      // Previous owner becomes org admin
      if (updatedMembers[user.id!]) {
        updatedMembers[user.id!] = {
          ...updatedMembers[user.id!],
          role: OrganizationRoleType.ADMIN
        };
      }
      
      // New owner gets owner role
      if (updatedMembers[newOwnerId]) {
        updatedMembers[newOwnerId] = {
          ...updatedMembers[newOwnerId],
          role: OrganizationRoleType.OWNER
        };
      }
      
      transaction.set(membersRef, updatedMembers);
      
      // Update team structure - make new owner a manager if not already
      const updatedTeams = { ...organization.teams };
      if (organization.teams && updatedTeams[teamId] && !updatedTeams[teamId].managers.includes(newOwnerId)) {
        updatedTeams[teamId] = {
          ...updatedTeams[teamId],
          managers: [...updatedTeams[teamId].managers, newOwnerId],
          updatedAt: Timestamp.now()
        };
        
        transaction.set(teamsRef, updatedTeams);
      }
    });
    
    // Log the ownership transfer
    console.log(`Ownership transferred from ${user.id} to ${newOwnerId} for organization ${organizationId}`);
    
    return NextResponse.json({ 
      success: true,
      message: `Ownership successfully transferred to ${newOwnerMember.displayName || newOwnerMember.email}`,
      data: {
        previousOwner: user.id,
        newOwner: newOwnerId,
        organizationId,
        teamId,
        transferredAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error transferring ownership:', error);
    return NextResponse.json({ 
      error: { 
        type: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to transfer ownership',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
} 
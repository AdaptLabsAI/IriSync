import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { 
  Organization, 
  FirestoreOrganization, 
  FirestoreOrganizationMember, 
  OrganizationRoleType,
  organizationToFirestore,
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
  const firestore = getFirebaseFirestore();
  if (!firestore) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
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
 * Map role names to organization roles
 */
function mapRoleToOrganizationRole(role: string): OrganizationRoleType {
  switch (role.toLowerCase()) {
    case 'owner':
      return OrganizationRoleType.OWNER;
    case 'org_admin':
      return OrganizationRoleType.ADMIN;
    case 'member':
      return OrganizationRoleType.MEMBER;
    case 'viewer':
      return OrganizationRoleType.VIEWER;
    case 'admin':
      throw new Error('Invalid role: "admin" is reserved for system administrators. Use "org_admin" for organization administrators.');
    case 'guest':
      // Legacy support - guest was the old name for viewer
      console.warn('Using deprecated "guest" role, use "viewer" instead');
      return OrganizationRoleType.VIEWER;
    default:
      throw new Error(`Invalid role: "${role}". Valid roles are: owner, org_admin, member, viewer`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required to update member roles',
        endpoint: '/api/settings/team/role'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session',
        endpoint: '/api/settings/team/role'
      }, { status: 401 });
    }
    
    const { email, role } = await req.json();
    if (!email || !role) {
      return NextResponse.json({ 
        error: 'Missing fields',
        message: 'Email and role are required',
        endpoint: '/api/settings/team/role'
      }, { status: 400 });
    }
    
    // Get user's organization context
    const { organization, organizationId } = await getUserOrganizationContext(user.id);
    
    // Check if user can update roles (must be owner or admin)
    const userMember = organization.members[user.id];
    if (!userMember || (userMember.role !== OrganizationRoleType.OWNER && userMember.role !== OrganizationRoleType.ADMIN)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Only organization owners and admins can update member roles',
        endpoint: '/api/settings/team/role'
      }, { status: 403 });
    }
    
    // Find member to update
    const memberToUpdate = Object.values(organization.members).find(m => m.email === email);
    if (!memberToUpdate) {
      return NextResponse.json({ 
        error: 'Member not found',
        message: 'The specified member was not found in the organization',
        endpoint: '/api/settings/team/role'
      }, { status: 404 });
    }
    
    // Prevent changing owner role unless you are the owner
    if (memberToUpdate.role === OrganizationRoleType.OWNER && userMember.role !== OrganizationRoleType.OWNER) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Only the owner can change the owner role',
        endpoint: '/api/settings/team/role'
      }, { status: 403 });
    }
    
    // Prevent non-owners from assigning owner role
    if (role === 'owner' && userMember.role !== OrganizationRoleType.OWNER) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Only the owner can assign the owner role',
        endpoint: '/api/settings/team/role'
      }, { status: 403 });
    }
    
    // Prevent users from changing their own role
    if (memberToUpdate.userId === user.id) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You cannot change your own role',
        endpoint: '/api/settings/team/role'
      }, { status: 403 });
    }
    
    // Map role to organization role
    const newOrgRole = mapRoleToOrganizationRole(role);
    
    // Update member role in organization
    await runTransaction(firestore, async (transaction) => {
      const membersRef = doc(firestore, 'organizations', organizationId, 'members', 'data');
      
      // Update member role
      const updatedMembers = { ...organization.members };
      updatedMembers[memberToUpdate.userId] = {
        ...updatedMembers[memberToUpdate.userId],
        role: newOrgRole
      };
      
      transaction.set(membersRef, updatedMembers);
    });
    
    return NextResponse.json({ 
      success: true,
      message: `Role updated to ${role} successfully`
    });
    
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ 
      error: 'Error updating role',
      message: error instanceof Error ? error.message : 'Failed to update member role',
      endpoint: '/api/settings/team/role'
    }, { status: 500 });
  }
} 
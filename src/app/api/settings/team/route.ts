import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, DocumentData, runTransaction } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { 
  Organization, 
  FirestoreOrganization, 
  FirestoreOrganizationMember, 
  FirestoreTeam,
  firestoreToOrganization,
  organizationToFirestore,
  OrganizationRoleType
} from '@/lib/core/models/Organization';
import { OrganizationRole, TeamRole } from '@/lib/features/user/types';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Type definitions
interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
  role?: string;
}

interface TeamMemberResponse {
  userId: string;
  email: string;
  name: string;
  role: string;
  status?: 'active' | 'pending';
}

interface TeamInviteResponse {
  email: string;
  invitedBy: string;
  role: string;
  token: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface TeamResponse {
  id: string;
  name: string;
  organizationId: string;
  members: TeamMemberResponse[];
  invites: TeamInviteResponse[];
}

const getEmailProvider = () => {
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  if (process.env.POSTMARK_API_KEY) return 'postmark';
  if (process.env.MAILCHIMP_API_KEY) return 'mailchimp';
  return null;
};

const sendInviteEmail = async (email: string, teamId: string, token: string, invitedBy: string) => {
  try {
    const provider = getEmailProvider();
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?teamId=${teamId}&token=${token}`;
    const subject = 'You have been invited to join a team on Irisync';
    const text = `You have been invited by ${invitedBy} to join their team. Click here to accept: ${inviteUrl}`;
    
    if (provider === 'sendgrid') {
      // SendGrid API
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }], subject }],
          from: { email: process.env.EMAIL_FROM || 'noreply@irisync.com', name: 'Irisync' },
          content: [{ type: 'text/plain', value: text }],
        }),
      });
      if (!res.ok) throw new Error('Failed to send invite email via SendGrid');
    } else if (provider === 'postmark') {
      // Postmark API
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': process.env.POSTMARK_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: process.env.EMAIL_FROM || 'noreply@irisync.com',
          To: email,
          Subject: subject,
          TextBody: text,
        }),
      });
      if (!res.ok) throw new Error('Failed to send invite email via Postmark');
    } else if (provider === 'mailchimp') {
      // Mailchimp Transactional (Mandrill) API
      const res = await fetch('https://mandrillapp.com/api/1.0/messages/send.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: process.env.MAILCHIMP_API_KEY!,
          message: {
            from_email: process.env.EMAIL_FROM || 'noreply@irisync.com',
            to: [{ email, type: 'to' }],
            subject,
            text,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to send invite email via Mailchimp');
    } else {
      throw new Error('No email provider configured');
    }
    return true;
  } catch (error) {
    console.error('Error sending invite email:', error);
    return false;
  }
};

/**
 * Get user's current organization and team context
 */
async function getUserOrganizationContext(userId: string) {
  // Get user data to find current organization
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
  
  // Get organization data
  const orgDoc = await getDoc(doc(firestore, 'organizations', organizationId));
  if (!orgDoc.exists()) {
    throw new Error('Organization not found');
  }
  
  // Get organization members
  const membersDoc = await getDoc(doc(firestore, 'organizations', organizationId, 'members', 'data'));
  const teamsDoc = await getDoc(doc(firestore, 'organizations', organizationId, 'teams', 'data'));
  
  const orgData = orgDoc.data() as FirestoreOrganization;
  const membersData = membersDoc.exists() ? membersDoc.data() : {};
  const teamsData = teamsDoc.exists() ? teamsDoc.data() : {};
  
  // Convert members object to array
  const members: FirestoreOrganizationMember[] = Object.values(membersData);
  
  const organization = firestoreToOrganization(organizationId, orgData, members, teamsData);
  
  return { organization, organizationId };
}

/**
 * Get or create default team for user in organization
 */
function getOrCreateDefaultTeam(organization: Organization, userId: string): { team: any; teamId: string } {
  // Find user's teams
  const userTeams = Object.entries(organization.teams || {}).filter(([teamId, team]) => 
    team.memberIds.includes(userId)
  );
  
  // If user has teams, return the first one (or could be more sophisticated)
  if (userTeams.length > 0) {
    const [teamId, team] = userTeams[0];
    return { team, teamId };
  }
  
  // Create default team if none exists
  const teamId = `team_${uuidv4()}`;
  const defaultTeam = {
    id: teamId,
    name: organization.isPersonalOrg ? 'Personal Team' : 'Default Team',
    description: 'Default team for organization',
    memberIds: [userId],
    managers: [userId],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  return { team: defaultTeam, teamId };
}

/**
 * Convert organization team data to API response format
 */
function formatTeamResponse(
  teamId: string, 
  team: any, 
  organization: Organization,
  pendingInvites: any[] = []
): TeamResponse {
  // Get team members with their organization roles
  const members: TeamMemberResponse[] = team.memberIds.map((memberId: string) => {
    const orgMember = organization.members[memberId];
    if (!orgMember) return null;
    
    // Map organization role to team role
    let role = 'member';
    if (organization.ownerUserId === memberId) {
      role = 'owner';
    } else if (team.managers.includes(memberId)) {
      role = 'admin';
    } else {
      switch (orgMember.role) {
        case OrganizationRoleType.ADMIN:
          role = 'admin';
          break;
        case OrganizationRoleType.MEMBER:
          role = 'member';
          break;
        case OrganizationRoleType.VIEWER:
          role = 'viewer';
          break;
        default:
          role = 'member';
      }
    }
    
    return {
      userId: orgMember.userId,
      email: orgMember.email,
      name: orgMember.displayName,
      role,
      status: 'active' as const
    };
  }).filter(Boolean);
  
  // Format pending invites
  const invites: TeamInviteResponse[] = pendingInvites.map(invite => ({
    email: invite.email,
    invitedBy: invite.invitedBy,
    role: invite.role,
    token: invite.token,
    status: invite.status,
    createdAt: invite.createdAt
  }));
  
  return {
    id: teamId,
    name: team.name,
    organizationId: organization.id,
    members,
    invites
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required to access team settings',
        endpoint: '/api/settings/team' 
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session',
        endpoint: '/api/settings/team' 
      }, { status: 401 });
    }
    
    // Get user's organization context
    const { organization, organizationId } = await getUserOrganizationContext(user.id);
    
    // Check if user is member of organization
    if (!organization.members[user.id]) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'User is not a member of this organization',
        endpoint: '/api/settings/team' 
      }, { status: 403 });
    }
    
    // Get or create default team
    const { team, teamId } = getOrCreateDefaultTeam(organization, user.id);
    
    // If we created a new team, save it to the organization
    if (!organization.teams?.[teamId]) {
      await runTransaction(firestore, async (transaction) => {
        const orgRef = doc(firestore, 'organizations', organizationId);
        const teamsRef = doc(firestore, 'organizations', organizationId, 'teams', 'data');
        
        // Update organization teams
        const updatedOrg = {
          ...organization,
          teams: {
            ...organization.teams,
            [teamId]: team
          }
        };
        
        const { teams } = organizationToFirestore(updatedOrg);
        transaction.set(teamsRef, teams);
      });
    }
    
    // Get pending invites (stored separately for now)
    const invitesDoc = await getDoc(doc(firestore, 'team_invites', teamId));
    const pendingInvites = invitesDoc.exists() ? invitesDoc.data().invites || [] : [];
    
    const teamResponse = formatTeamResponse(teamId, team, organization, pendingInvites);
    
    return NextResponse.json({ team: teamResponse });
    
  } catch (error) {
    console.error('Error fetching team data:', error);
    return NextResponse.json({ 
      error: 'Error loading data',
      message: error instanceof Error ? error.message : 'Failed to load team information',
      endpoint: '/api/settings/team'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required to invite team members',
        endpoint: '/api/settings/team'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session',
        endpoint: '/api/settings/team'
      }, { status: 401 });
    }
    
    const { email, role = 'member' } = await req.json();
    if (!email) {
      return NextResponse.json({ 
        error: 'Email required',
        message: 'Email address is required to send an invitation',
        endpoint: '/api/settings/team'
      }, { status: 400 });
    }
    
    // Get user's organization context
    const { organization, organizationId } = await getUserOrganizationContext(user.id);
    
    // Check if user can invite (must be owner or admin)
    const userMember = organization.members[user.id];
    if (!userMember || (userMember.role !== OrganizationRoleType.OWNER && userMember.role !== OrganizationRoleType.ADMIN)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Only organization owners and admins can invite members',
        endpoint: '/api/settings/team'
      }, { status: 403 });
    }
    
    // Get user's default team
    const { team, teamId } = getOrCreateDefaultTeam(organization, user.id);
    
    // Check if email is already invited
    const invitesDoc = await getDoc(doc(firestore, 'team_invites', teamId));
    const existingInvites = invitesDoc.exists() ? invitesDoc.data().invites || [] : [];
    const existingInvite = existingInvites.find((inv: any) => inv.email === email);
    
    if (existingInvite) {
      return NextResponse.json({ 
        error: 'Already invited',
        message: 'This email has already been invited to the team',
        endpoint: '/api/settings/team'
      }, { status: 400 });
    }
    
    // Generate invite token
    const token = uuidv4();
    const invite = { 
      email, 
      invitedBy: user.email || '', 
      role, 
      token, 
      status: 'pending', 
      createdAt: new Date().toISOString(),
      teamId,
      organizationId
    };
    
    // Save invite
    await setDoc(doc(firestore, 'team_invites', teamId), {
      invites: [...existingInvites, invite]
    }, { merge: true });
    
    const emailSent = await sendInviteEmail(email, teamId, token, user.email || 'A team member');
    
    return NextResponse.json({ 
      success: true,
      emailSent: emailSent,
      message: emailSent ? 'Invitation sent successfully' : 'Invitation created but email could not be sent'
    });
    
  } catch (error) {
    console.error('Error inviting team member:', error);
    return NextResponse.json({ 
      error: 'Error loading data',
      message: error instanceof Error ? error.message : 'Failed to process team member invitation',
      endpoint: '/api/settings/team'
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required to remove team members',
        endpoint: '/api/settings/team'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session',
        endpoint: '/api/settings/team'
      }, { status: 401 });
    }
    
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ 
        error: 'Email required',
        message: 'Email address is required to remove member',
        endpoint: '/api/settings/team'
      }, { status: 400 });
    }
    
    // Get user's organization context
    const { organization, organizationId } = await getUserOrganizationContext(user.id);
    
    // Check if user can remove members (must be owner or admin)
    const userMember = organization.members[user.id];
    if (!userMember || (userMember.role !== OrganizationRoleType.OWNER && userMember.role !== OrganizationRoleType.ADMIN)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Only organization owners and admins can remove members',
        endpoint: '/api/settings/team'
      }, { status: 403 });
    }
    
    // Get user's default team
    const { team, teamId } = getOrCreateDefaultTeam(organization, user.id);
    
    // Find member to remove
    const memberToRemove = Object.values(organization.members).find(m => m.email === email);
    
    if (memberToRemove) {
      // Remove from organization (this will handle team removal too)
      await runTransaction(firestore, async (transaction) => {
        const membersRef = doc(firestore, 'organizations', organizationId, 'members', 'data');
        const teamsRef = doc(firestore, 'organizations', organizationId, 'teams', 'data');
        
        // Remove member from organization
        const updatedMembers = { ...organization.members };
        delete updatedMembers[memberToRemove.userId];
        
        // Remove member from all teams
        const updatedTeams = { ...organization.teams };
        Object.keys(updatedTeams).forEach(tId => {
          updatedTeams[tId] = {
            ...updatedTeams[tId],
            memberIds: updatedTeams[tId].memberIds.filter(id => id !== memberToRemove.userId),
            managers: updatedTeams[tId].managers.filter(id => id !== memberToRemove.userId)
          };
        });
        
        transaction.set(membersRef, updatedMembers);
        transaction.set(teamsRef, updatedTeams);
      });
    } else {
      // Remove from pending invites
      const invitesDoc = await getDoc(doc(firestore, 'team_invites', teamId));
      if (invitesDoc.exists()) {
        const invites = invitesDoc.data().invites || [];
        const updatedInvites = invites.filter((inv: any) => inv.email !== email);
        
        await setDoc(doc(firestore, 'team_invites', teamId), {
          invites: updatedInvites
        });
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Member removed successfully'
    });
    
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ 
      error: 'Error loading data',
      message: error instanceof Error ? error.message : 'Failed to remove team member',
      endpoint: '/api/settings/team'
    }, { status: 500 });
  }
} 
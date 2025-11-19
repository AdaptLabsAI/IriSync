import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
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
 * Get or create default team for user in organization
 */
function getOrCreateDefaultTeam(organization: Organization, userId: string): { team: any; teamId: string } {
  const userTeams = Object.entries(organization.teams || {}).filter(([teamId, team]) => 
    team.memberIds.includes(userId)
  );
  
  if (userTeams.length > 0) {
    const [teamId, team] = userTeams[0];
    return { team, teamId };
  }
  
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required to resend invitations',
        endpoint: '/api/settings/team/invite'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session',
        endpoint: '/api/settings/team/invite'
      }, { status: 401 });
    }
    
    const { email, resend } = await req.json();
    if (!email) {
      return NextResponse.json({ 
        error: 'Email required',
        message: 'Email address is required to resend invitation',
        endpoint: '/api/settings/team/invite'
      }, { status: 400 });
    }
    
    // Get user's organization context
    const { organization, organizationId } = await getUserOrganizationContext(user.id);
    
    // Check if user can resend invites (must be owner or admin)
    const userMember = organization.members[user.id];
    if (!userMember || (userMember.role !== OrganizationRoleType.OWNER && userMember.role !== OrganizationRoleType.ADMIN)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Only organization owners and admins can resend invitations',
        endpoint: '/api/settings/team/invite'
      }, { status: 403 });
    }
    
    // Get user's default team
    const { team, teamId } = getOrCreateDefaultTeam(organization, user.id);
    
    // Get existing invites
    const invitesDoc = await getDoc(doc(firestore, 'team_invites', teamId));
    const existingInvites = invitesDoc.exists() ? invitesDoc.data().invites || [] : [];
    
    // Find the invite to resend
    const inviteIndex = existingInvites.findIndex((inv: any) => inv.email === email);
    if (inviteIndex === -1) {
      return NextResponse.json({ 
        error: 'Invite not found',
        message: 'No pending invitation found for this email address',
        endpoint: '/api/settings/team/invite'
      }, { status: 404 });
    }
    
    const existingInvite = existingInvites[inviteIndex];
    
    // Generate new token for security
    const newToken = uuidv4();
    const updatedInvite = {
      ...existingInvite,
      token: newToken,
      createdAt: new Date().toISOString(),
      resent: true,
      resentBy: user.email,
      resentAt: new Date().toISOString()
    };
    
    // Update the invite
    const updatedInvites = [...existingInvites];
    updatedInvites[inviteIndex] = updatedInvite;
    
    // Save updated invites
    await setDoc(doc(firestore, 'team_invites', teamId), {
      invites: updatedInvites
    });
    
    // Send the email
    const emailSent = await sendInviteEmail(email, teamId, newToken, user.email || 'A team member');
    
    return NextResponse.json({ 
      success: true,
      emailSent: emailSent,
      message: emailSent ? 'Invitation resent successfully' : 'Invitation updated but email could not be sent'
    });
    
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json({ 
      error: 'Error resending invitation',
      message: error instanceof Error ? error.message : 'Failed to resend invitation',
      endpoint: '/api/settings/team/invite'
    }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getOrganization, isMemberOfOrganization } from '@/lib/features/team/users/organization';
import { firestore } from '@/lib/core/firebase/admin';
import { logger } from '@/lib/core/logging/logger';
import { TeamAuditLogger } from '@/lib/features/team/activity/audit-logger';
import { AuditLogCategory, AuditLogSeverity } from '@/lib/features/team/activity/audit-logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


interface SessionUser {
  id?: string;
  email?: string;
}

/**
 * API to switch the user's active organization
 */
export async function POST(request: NextRequest) {
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

    // Get the requested organization ID from the request body
    const { organizationId } = await request.json();
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing data', message: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Verify the organization exists
    const organization = await getOrganization(organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Not found', message: 'Organization not found' },
        { status: 404 }
      );
    }

    // Verify the user is a member of the organization
    const isMember = await isMemberOfOrganization(userId, organizationId);
    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Update the user's active organization
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({
      organizationId,
      lastOrganizationSwitch: new Date()
    });

    // Log the organization switch
    const auditLogger = new TeamAuditLogger();
    await auditLogger.log({
      userId,
      category: AuditLogCategory.ORGANIZATION,
      action: 'organization_switch',
      severity: AuditLogSeverity.INFO,
      organizationId,
      metadata: {
        organizationName: organization.name
      }
    });

    logger.info('User switched organization', {
      userId,
      organizationId,
      actionType: 'organization_switch'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully switched organization',
      organization: {
        id: organization.id,
        name: organization.name,
        subscriptionTier: organization.plan
      }
    });
  } catch (error) {
    logger.error('Error switching organization', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to switch organization' },
      { status: 500 }
    );
  }
} 
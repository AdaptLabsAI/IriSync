/**
 * Workflow Approval API
 * POST /api/workflows/approve - Approve content
 * POST /api/workflows/reject - Reject content
 * POST /api/workflows/changes - Request changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { teamService } from '@/lib/features/team/TeamService';
import { workflowService } from '@/lib/features/team/WorkflowService';

/**
 * POST /api/workflows/approve
 * Approve content submission
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
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
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
    const hasPermission = await teamService.hasPermission(userId, organizationId, 'canApproveContent');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to approve content' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { submissionId, action, comment } = body;

    if (!submissionId || !action) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'submissionId and action are required' },
        { status: 400 }
      );
    }

    let submission;

    switch (action) {
      case 'approve':
        submission = await workflowService.approveContent(submissionId, userId, comment);
        break;

      case 'reject':
        if (!comment) {
          return NextResponse.json(
            { error: 'Invalid Request', message: 'comment is required for rejection' },
            { status: 400 }
          );
        }
        submission = await workflowService.rejectContent(submissionId, userId, comment);
        break;

      case 'request_changes':
        if (!comment) {
          return NextResponse.json(
            { error: 'Invalid Request', message: 'comment is required for requesting changes' },
            { status: 400 }
          );
        }
        submission = await workflowService.requestChanges(submissionId, userId, comment);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid Request', message: 'action must be one of: approve, reject, request_changes' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      submission,
      message: `Content ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent back for changes'} successfully`,
    });
  } catch (error) {
    console.error('Error processing approval action:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to process approval action',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

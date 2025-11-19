/**
 * Workflow Submission API
 * POST /api/workflows/submit - Submit content for approval
 * GET /api/workflows/submit - Get submissions (pending, all, or user's)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { workflowService, ApprovalState } from '@/lib/features/team/WorkflowService';

/**
 * POST /api/workflows/submit
 * Submit content for approval
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

    const body = await request.json();
    const { workflowId, contentType, contentData, contentId } = body;

    if (!workflowId || !contentType || !contentData) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'workflowId, contentType, and contentData are required' },
        { status: 400 }
      );
    }

    // Validate content type
    if (!['post', 'campaign', 'media'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'contentType must be one of: post, campaign, media' },
        { status: 400 }
      );
    }

    // Submit for approval
    const submission = await workflowService.submitForApproval(
      organizationId,
      workflowId,
      contentType,
      contentData,
      userId,
      contentId
    );

    return NextResponse.json({
      success: true,
      submission,
      message: 'Content submitted for approval successfully',
    });
  } catch (error) {
    console.error('Error submitting for approval:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to submit for approval',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/submit
 * Get submissions
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'pending'; // pending, all, my
    const state = searchParams.get('state') as ApprovalState | undefined;
    const contentType = searchParams.get('contentType') as 'post' | 'campaign' | 'media' | undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    let submissions;

    if (view === 'pending') {
      // Get submissions pending approval by current user
      submissions = await workflowService.getPendingSubmissions(userId, organizationId);
    } else if (view === 'my') {
      // Get submissions created by current user
      submissions = await workflowService.getSubmissions(
        organizationId,
        {
          state,
          contentType,
          submittedBy: userId,
        },
        limit
      );
    } else {
      // Get all submissions for organization
      submissions = await workflowService.getSubmissions(
        organizationId,
        {
          state,
          contentType,
        },
        limit
      );
    }

    return NextResponse.json({
      success: true,
      submissions,
      count: submissions.length,
      view,
    });
  } catch (error) {
    console.error('Error getting submissions:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get submissions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

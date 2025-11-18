/**
 * Workflows API
 * GET /api/workflows - List approval workflows
 * POST /api/workflows - Create workflow
 * DELETE /api/workflows - Delete workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { firestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { teamService } from '@/lib/features/team/TeamService';
import { workflowService, WorkflowType } from '@/lib/features/team/WorkflowService';

/**
 * GET /api/workflows
 * List approval workflows
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

    // Get workflows
    const workflows = await workflowService.getWorkflows(organizationId);

    return NextResponse.json({
      success: true,
      workflows,
      count: workflows.length,
    });
  } catch (error) {
    console.error('Error getting workflows:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get workflows',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows
 * Create approval workflow
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
    const hasPermission = await teamService.hasPermission(userId, organizationId, 'canCreateWorkflows');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to create workflows' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type, approvers, description } = body;

    if (!name || !type || !approvers || !Array.isArray(approvers)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'name, type, and approvers (array) are required' },
        { status: 400 }
      );
    }

    // Validate workflow type
    if (!Object.values(WorkflowType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid Request', message: `Invalid type. Must be one of: ${Object.values(WorkflowType).join(', ')}` },
        { status: 400 }
      );
    }

    // Create workflow
    const workflow = await workflowService.createWorkflow(
      organizationId,
      name,
      type,
      approvers,
      userId,
      description
    );

    return NextResponse.json({
      success: true,
      workflow,
      message: 'Workflow created successfully',
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to create workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows
 * Delete workflow
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
    const hasPermission = await teamService.hasPermission(userId, organizationId, 'canCreateWorkflows');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to delete workflows' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const workflowId = searchParams.get('workflowId');

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'workflowId query parameter is required' },
        { status: 400 }
      );
    }

    // Delete workflow
    await workflowService.deleteWorkflow(workflowId, userId);

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to delete workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

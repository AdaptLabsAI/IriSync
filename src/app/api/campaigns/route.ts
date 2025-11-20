/**
 * Campaigns API
 * GET /api/campaigns - List campaigns
 * POST /api/campaigns - Create campaign
 * PATCH /api/campaigns - Update campaign
 * DELETE /api/campaigns - Delete campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore  } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { campaignService, CampaignStatus, CampaignType } from '@/lib/features/campaigns/CampaignService';
import { teamService } from '@/lib/features/team/TeamService';

/**
 * GET /api/campaigns
 * List campaigns for organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as CampaignStatus | undefined;
    const type = searchParams.get('type') as CampaignType | undefined;
    const createdBy = searchParams.get('createdBy') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    const campaigns = await campaignService.getCampaigns(
      organizationId,
      { status, type, createdBy },
      limit
    );

    return NextResponse.json({
      success: true,
      campaigns,
      count: campaigns.length,
    });
  } catch (error) {
    console.error('Error getting campaigns:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get campaigns',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns
 * Create new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

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
    const hasPermission = await teamService.hasPermission(userId, organizationId, 'canCreateContent');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to create campaigns' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type, goals, description, budget, startDate, endDate, tags, assignedTo } = body;

    if (!name || !type || !goals) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'name, type, and goals are required' },
        { status: 400 }
      );
    }

    const campaign = await campaignService.createCampaign(
      organizationId,
      name,
      type,
      goals,
      userId,
      {
        description,
        budget,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        tags,
        assignedTo,
      }
    );

    return NextResponse.json({
      success: true,
      campaign,
      message: 'Campaign created successfully',
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to create campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campaigns
 * Update campaign
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

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

    const hasPermission = await teamService.hasPermission(userId, organizationId, 'canEditContent');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to edit campaigns' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { campaignId, updates } = body;

    if (!campaignId || !updates) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'campaignId and updates are required' },
        { status: 400 }
      );
    }

    await campaignService.updateCampaign(campaignId, updates);

    return NextResponse.json({
      success: true,
      message: 'Campaign updated successfully',
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to update campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns
 * Delete campaign
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

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

    const hasPermission = await teamService.hasPermission(userId, organizationId, 'canDeleteContent');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to delete campaigns' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'campaignId query parameter is required' },
        { status: 400 }
      );
    }

    await campaignService.deleteCampaign(campaignId);

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to delete campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

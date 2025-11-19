/**
 * Media Assets API
 * GET /api/media/assets - Search/list media assets
 * PATCH /api/media/assets - Update asset metadata
 * DELETE /api/media/assets - Delete asset
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { mediaAssetService, SearchOptions } from '@/lib/features/media/MediaAssetService';

/**
 * GET /api/media/assets
 * Search and filter media assets
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as any;
    const category = searchParams.get('category') as any;
    const tags = searchParams.get('tags')?.split(',');
    const folderId = searchParams.get('folderId') || undefined;
    const isBrandAsset = searchParams.get('isBrandAsset') === 'true' ? true : searchParams.get('isBrandAsset') === 'false' ? false : undefined;
    const isFavorite = searchParams.get('isFavorite') === 'true' ? true : undefined;
    const isArchived = searchParams.get('isArchived') === 'true' ? true : searchParams.get('isArchived') === 'false' ? false : undefined;
    const searchQuery = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') as any;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    const options: SearchOptions = {
      type,
      category,
      tags,
      folderId,
      isBrandAsset,
      isFavorite,
      isArchived,
      searchQuery,
      sortBy,
      sortOrder,
      limit,
    };

    // Search assets
    const assets = await mediaAssetService.searchAssets(userId, organizationId, options);

    return NextResponse.json({
      success: true,
      assets,
      count: assets.length,
      filters: options,
    });
  } catch (error) {
    console.error('Error searching assets:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to search assets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/media/assets
 * Update asset metadata
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { assetId, updates, action } = body;

    if (!assetId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'assetId is required' },
        { status: 400 }
      );
    }

    // Handle specific actions
    if (action) {
      switch (action) {
        case 'favorite':
          await mediaAssetService.toggleFavorite(assetId, updates.isFavorite);
          break;
        case 'archive':
          await mediaAssetService.archiveAsset(assetId);
          break;
        case 'restore':
          await mediaAssetService.restoreAsset(assetId);
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid Request', message: `Unknown action: ${action}` },
            { status: 400 }
          );
      }
    } else if (updates) {
      // General metadata update
      await mediaAssetService.updateAsset(assetId, updates);
    }

    // Get updated asset
    const updatedAsset = await mediaAssetService.getAsset(assetId);

    return NextResponse.json({
      success: true,
      asset: updatedAsset,
      message: 'Asset updated successfully',
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to update asset',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/assets
 * Delete an asset
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

    const searchParams = request.nextUrl.searchParams;
    const assetId = searchParams.get('assetId');

    if (!assetId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'assetId query parameter is required' },
        { status: 400 }
      );
    }

    // Delete asset
    await mediaAssetService.deleteAsset(assetId);

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to delete asset',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

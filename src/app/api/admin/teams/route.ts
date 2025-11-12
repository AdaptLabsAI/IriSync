import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/route-handlers';
import { firestore } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { logger } from '@/lib/logging/logger';

/**
 * GET handler for teams with pagination and filtering
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('pageSize') || '25');
    const page = parseInt(searchParams.get('page') || '1');
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const lastDocId = searchParams.get('lastDocId');

    // Validate parameters
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'Invalid pageSize parameter. Must be between 1 and 100.' },
        { status: 400 }
      );
    }

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'Invalid page parameter. Must be greater than 0.' },
        { status: 400 }
      );
    }

    // Build query
    const constraints = [];

    // Add status filter if provided
    if (status) {
      constraints.push(where('status', '==', status));
    }

    // Add ordering
    constraints.push(orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc'));

    // Add limit
    constraints.push(limit(pageSize));

    // Create the query with all constraints
    let teamsQuery = query(collection(firestore, 'teams'), ...constraints);

    // Apply pagination if lastDocId provided
    if (lastDocId) {
      try {
        const lastDocSnapshot = await getDoc(doc(firestore, 'teams', lastDocId));
        if (lastDocSnapshot.exists()) {
          // Create a new query with startAfter
          teamsQuery = query(
            collection(firestore, 'teams'), 
            ...constraints,
            startAfter(lastDocSnapshot)
          );
        }
      } catch (error) {
        logger.warn('Invalid lastDocId provided for pagination', { lastDocId, error });
      }
    }

    // Execute query
    const teamsSnapshot = await getDocs(teamsQuery);

    // Format teams data for response
    const teams = await Promise.all(
      teamsSnapshot.docs.map(async (teamDoc) => {
        const teamData = teamDoc.data();
        
        // Get member count
        const membersQuery = query(
          collection(firestore, 'teamMembers'),
          where('teamId', '==', teamDoc.id)
        );
        const membersSnapshot = await getDocs(membersQuery);
        
        // Get organization info
        let organizationName = 'Unknown Organization';
        if (teamData.organizationId) {
          try {
            const orgDoc = await getDoc(doc(firestore, 'organizations', teamData.organizationId));
            if (orgDoc.exists()) {
              organizationName = orgDoc.data().name || organizationName;
            }
          } catch (error) {
            logger.warn('Error fetching organization info', { 
              organizationId: teamData.organizationId, 
              error 
            });
          }
        }

        return {
          id: teamDoc.id,
          name: teamData.name,
          description: teamData.description || '',
          organizationId: teamData.organizationId,
          organizationName,
          status: teamData.status || 'active',
          memberCount: membersSnapshot.size,
          createdAt: teamData.createdAt?.toDate?.()?.toISOString() || teamData.createdAt,
          updatedAt: teamData.updatedAt?.toDate?.()?.toISOString() || teamData.updatedAt,
          createdBy: teamData.createdBy,
          settings: teamData.settings || {}
        };
      })
    );

    // Filter by search term if provided
    const filteredTeams = search
      ? teams.filter(team =>
          team.name.toLowerCase().includes(search.toLowerCase()) ||
          team.description.toLowerCase().includes(search.toLowerCase()) ||
          team.organizationName.toLowerCase().includes(search.toLowerCase())
        )
      : teams;

    // Get total count for pagination
    let totalCount = 0;
    try {
      const countQuery = status 
        ? query(collection(firestore, 'teams'), where('status', '==', status))
        : collection(firestore, 'teams');
      
      const countSnapshot = await getDocs(countQuery);
      totalCount = countSnapshot.size;
    } catch (error) {
      logger.warn('Error getting total teams count', { error });
    }

    // Calculate pagination info
    const hasMore = filteredTeams.length === pageSize;
    const lastVisible = teamsSnapshot.docs.length > 0 
      ? teamsSnapshot.docs[teamsSnapshot.docs.length - 1].id 
      : null;

    logger.info('Admin fetched teams', {
      adminId: adminUser.id,
      filters: { status, search },
      pagination: { page, pageSize },
      resultCount: filteredTeams.length
    });

    return NextResponse.json({
      teams: filteredTeams,
      pagination: {
        totalCount,
        pageSize,
        currentPage: page,
        hasMore,
        lastDocId: lastVisible
      }
    });

  } catch (error) {
    logger.error('Error in admin teams GET handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });

    return NextResponse.json(
      { 
        error: 'Failed to retrieve teams',
        message: 'An unexpected error occurred while retrieving teams. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
}); 
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { firestore } from '@/lib/core/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * Check if user has admin privileges
 */
async function checkAdminAccess(userId: string): Promise<boolean> {
  const userDoc = await getDoc(doc(firestore, 'users', userId));
  if (!userDoc.exists()) return false;
  
  const userData = userDoc.data();
  return userData.role === 'admin' || userData.role === 'super_admin';
}

/**
 * DELETE - Delete a specific job listing
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAdminAccess = await checkAdminAccess(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check if job exists
    const jobRef = doc(firestore, 'jobListings', params.id);
    const jobDoc = await getDoc(jobRef);
    
    if (!jobDoc.exists()) {
      return NextResponse.json(
        { error: 'Job listing not found' },
        { status: 404 }
      );
    }

    // Delete the job listing
    await deleteDoc(jobRef);

    logger.info('Job listing deleted', { 
      jobId: params.id, 
      authorId: session.user.id 
    });

    return NextResponse.json({ 
      message: 'Job listing deleted successfully',
      deleted: true
    });

  } catch (error) {
    logger.error('Error deleting job listing', { error, jobId: params.id });
    return NextResponse.json(
      { error: 'Failed to delete job listing' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a specific job listing
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAdminAccess = await checkAdminAccess(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check if job exists
    const jobRef = doc(firestore, 'jobListings', params.id);
    const jobDoc = await getDoc(jobRef);
    
    if (!jobDoc.exists()) {
      return NextResponse.json(
        { error: 'Job listing not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Update job listing
    const updateData = {
      ...body,
      updatedAt: serverTimestamp(),
      updatedBy: session.user.id
    };

    // Handle status change to published
    if (body.status === 'published' && jobDoc.data().status !== 'published') {
      updateData.publishedAt = serverTimestamp();
    }

    await updateDoc(jobRef, updateData);

    // Return updated job listing
    const updatedJob = await getDoc(jobRef);
    const responseJob = {
      id: params.id,
      ...updatedJob.data()
    };

    logger.info('Job listing updated', { 
      jobId: params.id, 
      authorId: session.user.id 
    });

    return NextResponse.json(responseJob);

  } catch (error) {
    logger.error('Error updating job listing', { error, jobId: params.id });
    return NextResponse.json(
      { error: 'Failed to update job listing' },
      { status: 500 }
    );
  }
} 
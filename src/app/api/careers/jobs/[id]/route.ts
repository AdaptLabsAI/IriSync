import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { firestore as db } from '@/lib/core/firebase';
import { JobStatus } from '@/lib/careers/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { handleApiError } from '@/lib/features/auth/utils';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const jobId = params.id;

    // Get job document
    const jobDoc = await getDoc(doc(db, 'jobListings', jobId));
    
    if (!jobDoc.exists()) {
      return NextResponse.json(
        { error: 'Job listing not found' },
        { status: 404 }
      );
    }
    
    // Get job data
    const jobData = jobDoc.data();
    
    // Convert Firestore timestamps to ISO strings
    const formattedJob = {
      ...jobData,
      id: jobDoc.id,
      createdAt: jobData.createdAt?.toDate().toISOString(),
      updatedAt: jobData.updatedAt?.toDate().toISOString(),
      publishedAt: jobData.publishedAt?.toDate().toISOString(),
      expiresAt: jobData.expiresAt?.toDate().toISOString()
    };
    
    // Check if job is published or user is admin
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;
    const isAdmin = user?.role === 'admin';
    
    if (jobData.status !== JobStatus.PUBLISHED && !isAdmin) {
      return NextResponse.json(
        { error: 'Job listing not available' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(formattedJob);
  } catch (error) {
    console.error('Error fetching job listing:', error);
    return NextResponse.json(
      handleApiError(error, `/api/careers/jobs/${params.id}`, 'fetching job listing'),
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated and has admin rights
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Cast session.user to include role
    const user = session.user as { role?: string };

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const jobId = params.id;

    // Check if job exists
    const jobDoc = await getDoc(doc(db, 'jobListings', jobId));
    
    if (!jobDoc.exists()) {
      return NextResponse.json(
        { error: 'Job listing not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const jobData = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'department', 'jobType', 'location', 'description', 'requirements', 'responsibilities'];
    for (const field of requiredFields) {
      if (!jobData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Update slug if title changed
    if (jobData.title !== jobDoc.data().title) {
      jobData.slug = jobData.title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');
    }
    
    // Set timestamps
    const now = Timestamp.now();
    jobData.updatedAt = now;
    
    // Set publishedAt if status changed to published
    if (jobData.status === JobStatus.PUBLISHED && jobDoc.data().status !== JobStatus.PUBLISHED) {
      jobData.publishedAt = now;
    }
    
    // Update document in Firestore
    await updateDoc(doc(db, 'jobListings', jobId), jobData);
    
    // Get updated job data
    const updatedJobDoc = await getDoc(doc(db, 'jobListings', jobId));
    const updatedData = updatedJobDoc.data();
    
    // Format response
    const formattedJob = {
      ...updatedData,
      id: jobId,
      createdAt: updatedData?.createdAt?.toDate().toISOString(),
      updatedAt: updatedData?.updatedAt?.toDate().toISOString(),
      publishedAt: updatedData?.publishedAt?.toDate().toISOString(),
      expiresAt: updatedData?.expiresAt?.toDate().toISOString()
    };
    
    return NextResponse.json(formattedJob);
  } catch (error) {
    console.error('Error updating job listing:', error);
    return NextResponse.json(
      handleApiError(error, `/api/careers/jobs/${params.id}`, 'updating job listing'),
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated and has admin rights
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Cast session.user to include role
    const user = session.user as { role?: string };

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const jobId = params.id;

    // Check if job exists
    const jobDoc = await getDoc(doc(db, 'jobListings', jobId));
    
    if (!jobDoc.exists()) {
      return NextResponse.json(
        { error: 'Job listing not found' },
        { status: 404 }
      );
    }
    
    // Delete document from Firestore
    await deleteDoc(doc(db, 'jobListings', jobId));
    
    return NextResponse.json(
      { message: 'Job listing deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting job listing:', error);
    return NextResponse.json(
      handleApiError(error, `/api/careers/jobs/${params.id}`, 'deleting job listing'),
      { status: 500 }
    );
  }
} 
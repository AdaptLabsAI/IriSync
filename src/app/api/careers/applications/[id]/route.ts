import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { firestore as db } from '@/lib/core/firebase';
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
    
    const applicationId = params.id;
    
    // Get application document
    const applicationDoc = await getDoc(doc(db, 'jobApplications', applicationId));
    
    if (!applicationDoc.exists()) {
      return NextResponse.json(
        { error: 'Job application not found' },
        { status: 404 }
      );
    }
    
    // Get application data
    const applicationData = applicationDoc.data();
    
    // Convert Firestore timestamps to ISO strings
    const formattedApplication = {
      ...applicationData,
      id: applicationDoc.id,
      createdAt: applicationData.createdAt?.toDate().toISOString(),
      updatedAt: applicationData.updatedAt?.toDate().toISOString(),
      reviewedAt: applicationData.reviewedAt?.toDate().toISOString(),
      interviewScheduled: applicationData.interviewScheduled?.toDate().toISOString(),
    };
    
    return NextResponse.json(formattedApplication);
  } catch (error) {
    console.error('Error fetching job application:', error);
    return NextResponse.json(
      handleApiError(error, `/api/careers/applications/${params.id}`, 'fetching job application'),
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
    const user = session.user as { role?: string; id?: string };
    
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    const applicationId = params.id;
    
    // Check if application exists
    const applicationDoc = await getDoc(doc(db, 'jobApplications', applicationId));
    
    if (!applicationDoc.exists()) {
      return NextResponse.json(
        { error: 'Job application not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const updateData = await request.json();
    
    // Set timestamps
    const now = Timestamp.now();
    updateData.updatedAt = now;
    
    // If status is changed to 'reviewed', set reviewedAt and reviewedBy
    if (
      updateData.status === 'reviewed' && 
      applicationDoc.data().status !== 'reviewed'
    ) {
      updateData.reviewedAt = now;
      updateData.reviewedBy = user.id || 'unknown';
    }
    
    // Update document in Firestore
    await updateDoc(doc(db, 'jobApplications', applicationId), updateData);
    
    // Get updated application data
    const updatedDoc = await getDoc(doc(db, 'jobApplications', applicationId));
    const updatedData = updatedDoc.data();
    
    // Format response
    const formattedApplication = {
      ...updatedData,
      id: applicationId,
      createdAt: updatedData?.createdAt?.toDate().toISOString(),
      updatedAt: updatedData?.updatedAt?.toDate().toISOString(),
      reviewedAt: updatedData?.reviewedAt?.toDate().toISOString(),
      interviewScheduled: updatedData?.interviewScheduled?.toDate().toISOString(),
    };
    
    return NextResponse.json(formattedApplication);
  } catch (error) {
    console.error('Error updating job application:', error);
    return NextResponse.json(
      handleApiError(error, `/api/careers/applications/${params.id}`, 'updating job application'),
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
    
    const applicationId = params.id;
    
    // Check if application exists
    const applicationDoc = await getDoc(doc(db, 'jobApplications', applicationId));
    
    if (!applicationDoc.exists()) {
      return NextResponse.json(
        { error: 'Job application not found' },
        { status: 404 }
      );
    }
    
    // Delete document from Firestore
    await deleteDoc(doc(db, 'jobApplications', applicationId));
    
    return NextResponse.json(
      { message: 'Job application deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting job application:', error);
    return NextResponse.json(
      handleApiError(error, `/api/careers/applications/${params.id}`, 'deleting job application'),
      { status: 500 }
    );
  }
} 
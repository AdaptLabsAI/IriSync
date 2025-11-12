import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { firestore as db } from '@/lib/core/firebase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { sendRejectionEmail } from '@/lib/core/notifications/careers';
import { handleApiError } from '@/lib/features/auth/utils';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and has admin rights
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Cast session.user to include role and other properties
    const user = session.user as { role?: string; id?: string; email?: string; name?: string };
    
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { applicationId, reason } = await request.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Get application document
    const applicationDoc = await getDoc(doc(db, 'jobApplications', applicationId));
    
    if (!applicationDoc.exists()) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const applicationData = applicationDoc.data();
    
    // Get job document
    const jobDoc = await getDoc(doc(db, 'jobListings', applicationData.jobId));
    
    if (!jobDoc.exists()) {
      return NextResponse.json(
        { error: 'Job listing not found' },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data();

    // Create application and job objects for email function
    const application = {
      id: applicationDoc.id,
      ...applicationData,
      createdAt: applicationData.createdAt?.toDate(),
      updatedAt: applicationData.updatedAt?.toDate()
    };

    const job = {
      id: jobDoc.id,
      ...jobData,
      createdAt: jobData.createdAt?.toDate(),
      updatedAt: jobData.updatedAt?.toDate(),
      publishedAt: jobData.publishedAt?.toDate(),
      expiresAt: jobData.expiresAt?.toDate()
    };

    // Send rejection email
    const emailSent = await sendRejectionEmail(application as any, job as any, reason);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send rejection email' },
        { status: 500 }
      );
    }

    // Update application status to rejected
    await updateDoc(doc(db, 'jobApplications', applicationId), {
      status: 'rejected',
      rejectionReason: reason || null,
      rejectedAt: Timestamp.now(),
      rejectedBy: user.id || user.email,
      updatedAt: Timestamp.now()
    });

    return NextResponse.json({
      message: 'Rejection email sent successfully',
      applicationId,
      status: 'rejected'
    });

  } catch (error) {
    console.error('Error sending rejection email:', error);
    return NextResponse.json(
      handleApiError(error, '/api/careers/applications/actions/reject', 'sending rejection email'),
      { status: 500 }
    );
  }
} 
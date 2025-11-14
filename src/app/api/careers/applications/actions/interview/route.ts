import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { firestore as db } from '@/lib/core/firebase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { sendInterviewRequestEmail } from '@/lib/core/notifications/careers';
import { handleApiError } from '@/lib/features/auth/utils';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


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

    const { applicationId, interviewDetails } = await request.json();

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

    // Default interview details if not provided
    const defaultInterviewDetails = {
      interviewType: 'video' as const,
      duration: '1 hour',
      message: 'We look forward to discussing this opportunity with you.',
      interviewerName: user.name || 'Our hiring team',
      ...interviewDetails
    };

    // Send interview request email
    const emailSent = await sendInterviewRequestEmail(
      application as any, 
      job as any, 
      defaultInterviewDetails
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send interview invitation email' },
        { status: 500 }
      );
    }

    // Update application status to interviewing
    await updateDoc(doc(db, 'jobApplications', applicationId), {
      status: 'interviewing',
      interviewDetails: defaultInterviewDetails,
      interviewScheduled: Timestamp.now(),
      interviewInvitedBy: user.id || user.email,
      updatedAt: Timestamp.now()
    });

    return NextResponse.json({
      message: 'Interview invitation sent successfully',
      applicationId,
      status: 'interviewing',
      interviewDetails: defaultInterviewDetails
    });

  } catch (error) {
    console.error('Error sending interview invitation:', error);
    return NextResponse.json(
      handleApiError(error, '/api/careers/applications/actions/interview', 'sending interview invitation'),
      { status: 500 }
    );
  }
} 
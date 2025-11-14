import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, query, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { firestore as db } from '@/lib/core/firebase';
import { JobApplicationStatus } from '@/lib/careers/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { handleApiError } from '@/lib/features/auth/utils';
import { sendApplicationConfirmation, sendNewApplicationNotification } from '@/lib/core/notifications/careers';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// GET handler for retrieving job applications (admin only)
export async function GET(request: NextRequest) {
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
    
    // Parse URL parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status');
    const email = searchParams.get('email');
    
    // Build query with filters
    let applicationsQuery = collection(db, 'jobApplications');
    
    // Apply filters
    const constraints = [];
    
    if (jobId) {
      constraints.push(where('jobId', '==', jobId));
    }
    
    if (status) {
      constraints.push(where('status', '==', status));
    }
    
    if (email) {
      constraints.push(where('email', '==', email));
    }
    
    // Add default sorting (newest applications first)
    constraints.push(orderBy('createdAt', 'desc'));
    
    // Execute query
    const querySnapshot = await getDocs(
      constraints.length > 0 
        ? query(applicationsQuery, ...constraints) 
        : applicationsQuery
    );
    
    // Convert documents to application objects
    const applications = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firestore timestamps to ISO strings
      const convertedData = {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
        reviewedAt: data.reviewedAt?.toDate().toISOString(),
        interviewScheduled: data.interviewScheduled?.toDate().toISOString(),
      };
      
      return convertedData;
    });
    
    return NextResponse.json(applications);
  } catch (error) {
    console.error('Error fetching job applications:', error);
    return NextResponse.json(
      handleApiError(error, '/api/careers/applications', 'fetching job applications'),
      { status: 500 }
    );
  }
}

// POST handler for submitting a job application (public access)
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const applicationData = await request.json();
    
    // Validate required fields
    const requiredFields = ['jobId', 'firstName', 'lastName', 'email', 'resumeUrl'];
    for (const field of requiredFields) {
      if (!applicationData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Set timestamps and initial status
    const now = Timestamp.now();
    
    // Prepare data for Firestore
    const newApplicationData = {
      ...applicationData,
      status: JobApplicationStatus.NEW,
      createdAt: now,
      updatedAt: now,
      // Add any additional custom fields submitted
      customFields: applicationData.customFields || {}
    };
    
    // Add document to Firestore
    const docRef = await addDoc(collection(db, 'jobApplications'), newApplicationData);
    
    // Create the application object with ID for email functions
    const applicationWithId = {
      id: docRef.id,
      ...newApplicationData,
      createdAt: now.toDate(),
      updatedAt: now.toDate()
    };
    
    // Send emails in background (don't block the response)
    Promise.resolve().then(async () => {
      try {
        // Fetch job details for emails
        const jobDoc = await getDoc(doc(db, 'jobListings', applicationData.jobId));
        if (jobDoc.exists()) {
          const jobData = jobDoc.data();
          const job = {
            id: jobDoc.id,
            ...jobData,
            createdAt: jobData.createdAt?.toDate(),
            updatedAt: jobData.updatedAt?.toDate(),
            publishedAt: jobData.publishedAt?.toDate(),
            expiresAt: jobData.expiresAt?.toDate()
          };

          // Send confirmation email to applicant
          await sendApplicationConfirmation(applicationWithId as any, job as any);
          
          // Send notification email to job poster (if posterEmail exists)
          if (jobData.posterEmail) {
            await sendNewApplicationNotification(
              applicationWithId as any, 
              job as any, 
              jobData.posterEmail, 
              jobData.posterName
            );
          }
        }
      } catch (emailError) {
        console.error('Failed to send application emails:', emailError);
        // Don't fail the API call if emails fail
      }
    });
    
    // Return the created application with ID
    return NextResponse.json({
      id: docRef.id,
      ...newApplicationData,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString()
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting job application:', error);
    return NextResponse.json(
      handleApiError(error, '/api/careers/applications', 'submitting job application'),
      { status: 500 }
    );
  }
} 
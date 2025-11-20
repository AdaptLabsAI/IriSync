import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { firestore as db } from '@/lib/core/firebase';
import { JobListing, JobStatus } from '@/lib/careers/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { handleApiError } from '@/lib/features/auth/utils';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// GET handler for retrieving job listings with optional filtering
export async function GET(request: NextRequest) {
  try {
    // Parse URL parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const featured = searchParams.get('featured');
    const jobType = searchParams.get('jobType');
    const locationType = searchParams.get('locationType');
    const isPublic = searchParams.get('public') === 'true';

    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // Build query with filters
    let jobsQuery = collection(db, 'jobListings');
    
    // Apply filters if provided
    const constraints = [];
    
    // For public access, only show published jobs
    if (isPublic) {
      constraints.push(where('status', '==', 'published'));
    } else {
      // For admin access, filter by status if provided
      if (status) {
        constraints.push(where('status', '==', status));
      }
    }
    
    if (department) {
      constraints.push(where('department', '==', department));
    }
    
    if (featured) {
      constraints.push(where('featured', '==', featured === 'true'));
    }
    
    if (jobType) {
      constraints.push(where('jobType', '==', jobType));
    }
    
    if (locationType) {
      constraints.push(where('location.type', '==', locationType));
    }
    
    // Add default sorting
    constraints.push(orderBy('featured', 'desc'));
    constraints.push(orderBy('publishedAt', 'desc'));
    
    // Execute query
    const querySnapshot = await getDocs(query(jobsQuery, ...constraints));
    
    // Convert documents to job listings
    const jobListings = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firestore timestamps to ISO strings
      const convertedData = {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
        publishedAt: data.publishedAt?.toDate().toISOString(),
        expiresAt: data.expiresAt?.toDate().toISOString()
      };
      
      return convertedData;
    });
    
    return NextResponse.json(jobListings);
  } catch (error) {
    console.error('Error fetching job listings:', error);
    return NextResponse.json(
      handleApiError(error, '/api/careers/jobs', 'fetching job listings'),
      { status: 500 }
    );
  }
}

// POST handler for creating a new job listing (admin only)
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
    
    // Cast session.user to include role
    const user = session.user as { role?: string; id?: string };
    
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
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
    
    // Create slug from title
    const slug = jobData.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-');
    
    // Set timestamps
    const now = Timestamp.now();
    
    // Prepare data for Firestore
    const newJobData = {
      ...jobData,
      slug,
      status: jobData.status || JobStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
      publishedAt: jobData.status === JobStatus.PUBLISHED ? now : null,
      createdBy: user.id || 'unknown'
    };

    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // Add document to Firestore
    const docRef = await addDoc(collection(db, 'jobListings'), newJobData);
    
    // Return the created job with ID
    return NextResponse.json({
      id: docRef.id,
      ...newJobData,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
      publishedAt: newJobData.publishedAt ? now.toDate().toISOString() : null
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating job listing:', error);
    return NextResponse.json(
      handleApiError(error, '/api/careers/jobs', 'creating job listing'),
      { status: 500 }
    );
  }
} 
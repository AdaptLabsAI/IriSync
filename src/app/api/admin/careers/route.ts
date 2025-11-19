import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';
import { JobListing, JobApplication, JobType, JobLocationType } from '@/lib/careers/models';
import { z } from 'zod';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * Check if user has admin privileges
 */
async function checkAdminAccess(userId: string): Promise<boolean> {
  const firestore = getFirebaseFirestore();
  if (!firestore) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const userDoc = await getDoc(doc(firestore, 'users', userId));
  if (!userDoc.exists()) return false;
  
  const userData = userDoc.data();
  return userData.role === 'admin' || userData.role === 'super_admin';
}

/**
 * Format job listing for API response
 */
function formatJobListing(id: string, data: any): JobListing {
  return {
    id,
    title: data.title,
    slug: data.slug,
    department: data.department,
    location: data.location,
    jobType: data.jobType,
    description: data.description,
    requirements: data.requirements || '',
    responsibilities: data.responsibilities || '',
    benefits: data.benefits || [],
    skills: data.skills || [],
    salaryRange: data.salaryRange,
    status: data.status,
    publishedAt: data.publishedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    expiresAt: data.expiresAt,
    featured: data.featured || false
  };
}

/**
 * Format job application for API response
 */
function formatJobApplication(id: string, data: any): JobApplication {
  return {
    id,
    jobId: data.jobId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    resumeUrl: data.resumeUrl,
    coverLetterUrl: data.coverLetterUrl,
    linkedinUrl: data.linkedinUrl,
    portfolioUrl: data.portfolioUrl,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    notes: data.notes,
    rating: data.rating
  };
}

/**
 * GET - Retrieve job listings and applications for admin
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const includeApplications = searchParams.get('includeApplications') === 'true';

    // Fetch job listings
    const jobsQuery = query(
      collection(firestore, 'jobListings'),
      orderBy('updatedAt', 'desc')
    );
    
    const jobsSnapshot = await getDocs(jobsQuery);
    const jobListings: JobListing[] = [];
    
    jobsSnapshot.forEach((doc) => {
      jobListings.push(formatJobListing(doc.id, doc.data()));
    });

    let applications: JobApplication[] = [];

    // Fetch applications if requested
    if (includeApplications) {
      const applicationsQuery = query(
        collection(firestore, 'jobApplications'),
        orderBy('appliedAt', 'desc'),
        limit(100) // Limit to recent applications
      );
      
      const applicationsSnapshot = await getDocs(applicationsQuery);
      
      applicationsSnapshot.forEach((doc) => {
        applications.push(formatJobApplication(doc.id, doc.data()));
      });
    }

    return NextResponse.json({
      jobListings,
      applications: includeApplications ? applications : undefined
    });

  } catch (error) {
    logger.error('Error fetching careers data', { error });
    return NextResponse.json(
      { error: 'Failed to fetch careers data' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new job listing
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    
    // Validate required fields
    const {
      title,
      department,
      location,
      locationType,
      jobType,
      description,
      requirements = [],
      benefits = [],
      salaryRange,
      status = 'draft'
    } = body;

    if (!title || !department || !location || !description) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'title, department, location, and description are required' },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Create job listing
    const jobData = {
      title,
      slug,
      department,
      location,
      locationType: locationType || 'remote',
      jobType: jobType || 'full-time',
      description,
      requirements,
      benefits,
      salaryRange,
      status,
      publishedAt: status === 'published' ? serverTimestamp() : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: session.user.id,
      applicationCount: 0
    };

    const docRef = doc(collection(firestore, 'jobListings'));
    await setDoc(docRef, jobData);

    // Return the created job listing
    const createdJob = await getDoc(docRef);
    const responseJob = formatJobListing(docRef.id, createdJob.data());

    logger.info('Job listing created', { 
      jobId: docRef.id, 
      title, 
      authorId: session.user.id 
    });

    return NextResponse.json(responseJob, { status: 201 });

  } catch (error) {
    logger.error('Error creating job listing', { error });
    return NextResponse.json(
      { error: 'Failed to create job listing' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a job listing
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing job ID' },
        { status: 400 }
      );
    }

    // Check if job exists
    const jobRef = doc(firestore, 'jobListings', id);
    const jobDoc = await getDoc(jobRef);
    
    if (!jobDoc.exists()) {
      return NextResponse.json(
        { error: 'Job listing not found' },
        { status: 404 }
      );
    }

    // Update job listing
    const updatedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
      updatedBy: session.user.id
    };

    // Handle status change to published
    if (updateData.status === 'published' && jobDoc.data().status !== 'published') {
      updatedData.publishedAt = serverTimestamp();
    }

    await updateDoc(jobRef, updatedData);

    // Return updated job listing
    const updatedJob = await getDoc(jobRef);
    const responseJob = formatJobListing(id, updatedJob.data());

    logger.info('Job listing updated', { 
      jobId: id, 
      authorId: session.user.id 
    });

    return NextResponse.json(responseJob);

  } catch (error) {
    logger.error('Error updating job listing', { error });
    return NextResponse.json(
      { error: 'Failed to update job listing' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a job listing
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing job ID' },
        { status: 400 }
      );
    }

    // Check if job exists
    const jobRef = doc(firestore, 'jobListings', jobId);
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
      jobId, 
      authorId: session.user.id 
    });

    return NextResponse.json({ 
      message: 'Job listing deleted successfully',
      deleted: true
    });

  } catch (error) {
    logger.error('Error deleting job listing', { error });
    return NextResponse.json(
      { error: 'Failed to delete job listing' },
      { status: 500 }
    );
  }
} 
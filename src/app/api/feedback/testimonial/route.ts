import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirestore } from '@/lib/core/firebase/admin';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    // Get the current session (optional - users can submit anonymously too)
    const session = await getServerSession(authOptions);
    
    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.content || !data.name) {
      return NextResponse.json({ 
        success: false,
        message: 'Name and testimonial content are required'
      }, { status: 400 });
    }
    
    // Validate rating
    if (data.rating < 1 || data.rating > 5) {
      return NextResponse.json({ 
        success: false,
        message: 'Rating must be between 1 and 5'
      }, { status: 400 });
    }
    
    // Validate passcode is provided
    if (!data.passcode) {
      return NextResponse.json({
        success: false,
        message: 'Invalid testimonial request. Passcode is required.'
      }, { status: 401 });
    }
    
    // Check passcode against testimonial requests
    const db = getFirestore();
    const requestsSnapshot = await db.collection('testimonialRequests')
      .where('passcode', '==', data.passcode)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    
    if (requestsSnapshot.empty) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired testimonial request'
      }, { status: 401 });
    }
    
    const testimonialRequest = requestsSnapshot.docs[0].data();
    const requestId = requestsSnapshot.docs[0].id;
    
    // Verify this is not a duplicate submission
    if (testimonialRequest.submitted) {
      return NextResponse.json({
        success: false,
        message: 'A testimonial has already been submitted using this link'
      }, { status: 400 });
    }
    
    // If user is logged in, validate they match the testimonial request
    if (session?.user && testimonialRequest.userId && (session.user as any).id !== testimonialRequest.userId) {
      return NextResponse.json({
        success: false,
        message: 'User mismatch. Please submit using the account that received the invitation.'
      }, { status: 401 });
    }
    
    // Prepare testimonial data
    const testimonialData = {
      name: data.name,
      role: data.role || null,
      company: data.company || null,
      content: data.content,
      rating: typeof data.rating === 'number' ? data.rating : parseFloat(data.rating) || 5,
      userId: session?.user ? (session.user as any).id || null : testimonialRequest.userId || null,
      email: session?.user?.email || testimonialRequest.email || null,
      isPublished: !!data.allowPublish, // Only publish if user explicitly allows
      featured: false, // Admin can set this later
      createdAt: new Date(),
      status: 'pending', // All testimonials start as pending until approved
      source: 'invited_submission',
      requestId: requestId,
      tier: testimonialRequest.tier || null
    };
    
    // Save to Firestore
    const testimonialRef = await db.collection('testimonials').add(testimonialData);
    
    // Update the testimonial request to mark as submitted
    await db.collection('testimonialRequests').doc(requestId).update({
      status: 'completed',
      submitted: true,
      submittedAt: new Date(),
      testimonialId: testimonialRef.id
    });
    
    // Create notification for admin
    await db.collection('notifications').add({
      type: 'new_testimonial',
      title: 'New Testimonial Submission',
      message: `New testimonial from ${data.name} is awaiting review`,
      createdAt: new Date(),
      read: false,
      resourceId: testimonialRef.id,
      resourceType: 'testimonial'
    });
    
    // Return success response
    return NextResponse.json({ 
      success: true,
      message: 'Testimonial submitted successfully. Thank you for your feedback!',
      id: testimonialRef.id
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error submitting testimonial:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false,
      message: 'Failed to submit testimonial',
      error: errorMessage
    }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirestore } from '@/lib/core/firebase/admin';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    // Get the current session (optional)
    const session = await getServerSession(authOptions);
    
    // Get passcode from URL parameters
    const url = new URL(request.url);
    const passcode = url.searchParams.get('passcode');
    const userId = url.searchParams.get('userId');
    
    if (!passcode) {
      return NextResponse.json({
        valid: false,
        message: 'No passcode provided'
      }, { status: 400 });
    }
    
    // Query Firestore for testimonial request with this passcode
    const db = getFirestore();
    const requestsSnapshot = await db.collection('testimonialRequests')
      .where('passcode', '==', passcode)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    
    if (requestsSnapshot.empty) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid or expired testimonial request'
      }, { status: 404 });
    }
    
    const testimonialRequest = requestsSnapshot.docs[0].data();
    
    // If request is expired (older than 30 days)
    const now = new Date();
    const requestDate = testimonialRequest.sentAt.toDate();
    const daysSinceSent = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceSent > 30) {
      return NextResponse.json({
        valid: false,
        message: 'Testimonial request has expired'
      }, { status: 400 });
    }
    
    // If userId is provided, check if it matches the request
    if (userId && testimonialRequest.userId !== userId) {
      return NextResponse.json({
        valid: false,
        message: 'User mismatch'
      }, { status: 401 });
    }
    
    // Get user data if available
    let userData = null;
    if (testimonialRequest.userId) {
      const userDoc = await db.collection('users').doc(testimonialRequest.userId).get();
      if (userDoc.exists) {
        const user = userDoc.data();
        if (user) {
          userData = {
            name: user.displayName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') || '',
            company: user.company || '',
            role: user.role || user.jobTitle || ''
          };
        }
      }
    }
    
    // Update the testimonial request to viewed
    await db.collection('testimonialRequests').doc(requestsSnapshot.docs[0].id).update({
      viewedAt: now
    });
    
    return NextResponse.json({
      valid: true,
      userData,
      requestId: requestsSnapshot.docs[0].id
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error validating testimonial request:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      valid: false,
      message: 'Failed to validate testimonial request',
      error: errorMessage
    }, { status: 500 });
  }
} 
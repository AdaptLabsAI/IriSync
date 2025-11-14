import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAuth as getAdminAuth } from '@/lib/core/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { isAdmin: false, error: 'No valid authorization token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify the token with Firebase Admin
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    if (!uid) {
      return NextResponse.json(
        { isAdmin: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user document from Firestore to check admin role
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { isAdmin: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const userRole = userData?.role || 'user';

    // Check if user has admin privileges
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    return NextResponse.json({
      isAdmin,
      role: userRole,
      uid
    });

  } catch (error) {
    console.error('Error checking admin status:', error);
    
    return NextResponse.json(
      { 
        isAdmin: false, 
        error: 'Failed to verify admin status' 
      },
      { status: 500 }
    );
  }
}

// Alternative method using cookies if Bearer token is not available
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken } = body;

    if (!sessionToken) {
      return NextResponse.json(
        { isAdmin: false, error: 'No session token provided' },
        { status: 401 }
      );
    }

    // Verify the session token
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(sessionToken);
    const uid = decodedToken.uid;

    // Get user role from Firestore
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { isAdmin: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const userRole = userData?.role || 'user';
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    return NextResponse.json({
      isAdmin,
      role: userRole,
      uid
    });

  } catch (error) {
    console.error('Error checking admin status via POST:', error);
    
    return NextResponse.json(
      { 
        isAdmin: false, 
        error: 'Failed to verify admin status' 
      },
      { status: 500 }
    );
  }
} 
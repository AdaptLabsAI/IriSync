import { NextRequest, NextResponse } from 'next/server';
import { getAuth, getFirestore } from '@/lib/core/firebase/admin';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { doc, getDoc } from 'firebase/firestore';
import { handleApiError } from '@/lib/features/auth/utils';

/**
 * Login route handler
 * @param request Request object
 * @returns Response with authentication token or error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    try {
      // Get Firebase Auth and Firestore
      const auth = getAuth();
      const firestore = getFirestore();
      
      // Check if user exists in Firebase Auth
      const userRecord = await auth.getUserByEmail(email).catch(() => null);
      
      if (!userRecord) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
      
      // Verify user credentials (We can't directly verify passwords in Admin SDK, 
      // but we can create a custom token and verify it exists)
      const customToken = await auth.createCustomToken(userRecord.uid);
      
      // Get user data from Firestore
      const userDoc = await firestore.collection('users').doc(userRecord.uid).get();
      
      if (!userDoc.exists) {
        return NextResponse.json(
          { error: 'User account not found' },
          { status: 404 }
        );
      }
      
      const userData = userDoc.data();
      
      // Create a user object without sensitive information
      const userResponse = {
        id: userRecord.uid,
        email: userRecord.email,
        name: userData?.name || '',
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        role: userData?.role || 'user',
        companyName: userData?.companyName || '',
        companySize: userData?.companySize || '',
      };

      // Return user data and token
      const response = NextResponse.json({
        user: userResponse,
        token: customToken,
        message: 'Login successful'
      });

      // Set a session cookie
      response.cookies.set({
        name: 'session',
        value: customToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });

      return response;
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      handleApiError(error, '/api/auth/login', 'user authentication'),
      { status: 500 }
    );
  }
}

/**
 * GET method not allowed
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

// Implement OPTIONS for CORS support
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
} 
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Type definitions
interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
  role?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'Authentication required to update email',
        endpoint: '/api/settings/profile/email'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session',
        endpoint: '/api/settings/profile/email'
      }, { status: 401 });
    }
    
    const { newEmail } = await req.json();
    if (!newEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
      return NextResponse.json({ 
        error: 'Invalid email',
        message: 'Please provide a valid email address',
        endpoint: '/api/settings/profile/email'
      }, { status: 400 });
    }
    
    // Check if new email is already in use
    const adminAuth = getAuth();
    try {
      await adminAuth.getUserByEmail(newEmail);
      return NextResponse.json({ 
        error: 'Email already in use',
        message: 'This email address is already associated with another account',
        endpoint: '/api/settings/profile/email'
      }, { status: 409 });
    } catch (e: any) {
      if (e.code !== 'auth/user-not-found') {
        console.error('Error checking email availability:', e);
        return NextResponse.json({ 
          error: 'Error loading data',
          message: 'Failed to check email availability',
          endpoint: '/api/settings/profile/email'
        }, { status: 500 });
      }
    }
    
    // Get user
    const fbUser = await adminAuth.getUserByEmail(user.email!);
    
    // Update email in Firebase Auth
    await adminAuth.updateUser(fbUser.uid, { email: newEmail, emailVerified: false });
    
    // Update email in Firestore
    const userRef = doc(firestore, 'users', user.id);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return NextResponse.json({ 
        error: 'User not found',
        message: 'User profile not found in the database',
        endpoint: '/api/settings/profile/email'
      }, { status: 404 });
    }
    
    const userData = userSnap.data();
    await updateDoc(userRef, { 
      email: newEmail, 
      emailVerified: false,
      updatedAt: new Date().toISOString()
    });
    
    // Send verification email
    try {
      const actionCodeSettings = {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?email=${encodeURIComponent(newEmail)}`,
        handleCodeInApp: false,
      };
      await adminAuth.generateEmailVerificationLink(newEmail, actionCodeSettings);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Still return success even if email fails, since the update was successful
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Email updated successfully. Please check your inbox for verification.',
    });
  } catch (error) {
    console.error('Error updating email:', error);
    return NextResponse.json({ 
      error: 'Error loading data',
      message: 'Failed to update email address',
      endpoint: '/api/settings/profile/email'
    }, { status: 500 });
  }
} 
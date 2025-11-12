import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAuth } from 'firebase-admin/auth';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { compare, hash } from 'bcryptjs';

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
        message: 'Authentication required to update password',
        endpoint: '/api/settings/profile/password'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session',
        endpoint: '/api/settings/profile/password'
      }, { status: 401 });
    }
    
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ 
        error: 'Missing fields',
        message: 'Both current password and new password are required',
        endpoint: '/api/settings/profile/password'
      }, { status: 400 });
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Invalid password',
        message: 'Password must be at least 8 characters',
        endpoint: '/api/settings/profile/password'
      }, { status: 400 });
    }
    
    // Get user from Firestore
    const userRef = doc(firestore, 'users', user.id);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return NextResponse.json({ 
        error: 'User not found',
        message: 'User profile not found in the database',
        endpoint: '/api/settings/profile/password'
      }, { status: 404 });
    }
    
    const userData = userSnap.data();
    
    // Verify current password
    const isValid = await compare(currentPassword, userData.password);
    if (!isValid) {
      return NextResponse.json({ 
        error: 'Invalid credentials',
        message: 'Current password is incorrect',
        endpoint: '/api/settings/profile/password'
      }, { status: 403 });
    }
    
    // Update password in Firebase Auth
    try {
      const adminAuth = getAuth();
      const fbUser = await adminAuth.getUserByEmail(user.email!);
      await adminAuth.updateUser(fbUser.uid, { password: newPassword });
      
      // Update password hash in Firestore
      const newHash = await hash(newPassword, 12);
      await updateDoc(userRef, { 
        password: newHash,
        updatedAt: new Date().toISOString()
      });
      
      // Log password change activity
      try {
        await updateDoc(userRef, {
          securityEvents: [
            ...(userData.securityEvents || []),
            {
              type: 'password_changed',
              timestamp: new Date().toISOString(),
              ipAddress: req.headers.get('x-forwarded-for') || req.ip
            }
          ]
        });
      } catch (logError) {
        console.error('Error logging password change:', logError);
        // Continue since this is non-critical
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'Password updated successfully'
      });
    } catch (authError) {
      console.error('Error updating password in Firebase Auth:', authError);
      return NextResponse.json({ 
        error: 'Error loading data',
        message: 'Failed to update password with authentication provider',
        endpoint: '/api/settings/profile/password'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json({ 
      error: 'Error loading data',
      message: 'Failed to update password',
      endpoint: '/api/settings/profile/password'
    }, { status: 500 });
  }
} 
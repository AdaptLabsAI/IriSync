/**
 * System Health API
 * GET /api/system/health - Get current system health status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth/nextauth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { healthCheckService } from '@/lib/features/system';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/system/health
 * Get comprehensive system health status
 * Accessible to admin users only
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { firestore } = await import('@/lib/core/firebase');
    const { doc, getDoc } = await import('firebase/firestore');

  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const userDoc = await getDoc(doc(firestore, 'users', session.user.id));

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const role = userData.role || 'user';

    // Only admin and super_admin can access system health
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get system health
    const health = await healthCheckService.getSystemHealth();

    // Optionally save snapshot for historical tracking
    // await healthCheckService.saveHealthSnapshot(health);

    return NextResponse.json({
      success: true,
      data: health,
    });

  } catch (error) {
    console.error('Error checking system health:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

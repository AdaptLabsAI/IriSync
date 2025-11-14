import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getToken } from 'next-auth/jwt';
import { hasPermission, systemRoles } from '@/lib/features/team/role';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    // Get both session and token for debugging
    const session = await getServerSession(authOptions);
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Test the permission check that's failing
    const hasAdminAccess = hasPermission(token || { role: '' }, 'platform-settings', 'read', systemRoles);
    
    return NextResponse.json({
      session: {
        user: session.user,
        isAdmin: (session.user as any).isAdmin,
        role: (session.user as any).role || session.user.role,
        subscriptionTier: (session.user as any).subscriptionTier
      },
      token: {
        role: token?.role,
        sub: token?.sub,
        organizationId: token?.organizationId,
        subscriptionTier: token?.subscriptionTier
      },
      permissionTest: {
        hasAdminAccess,
        tokenRole: token?.role,
        availableRoles: Object.keys(systemRoles),
        testData: {
          userOrRole: { role: token?.role || '' },
          resource: 'platform-settings',
          action: 'read'
        }
      }
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
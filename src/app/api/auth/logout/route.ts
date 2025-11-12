import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logging/logger';

/**
 * Handles user logout by clearing all session cookies
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    
    // Get session info for logging
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    logger.info(`User logout requested`, { userId });
    
    // Clear all auth cookies
    cookieStore.delete('next-auth.session-token');
    cookieStore.delete('next-auth.callback-url');
    cookieStore.delete('next-auth.csrf-token');
    cookieStore.delete('firebase-session-token');
    cookieStore.delete('session');
    
    // Log successful logout
    logger.info(`User logout successful`, { userId });
    
    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error during logout', { error: String(error) });
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}

/**
 * Handles GET requests to logout endpoint
 */
export async function GET() {
  try {
    const cookieStore = cookies();
    
    // Clear all auth cookies
    cookieStore.delete('next-auth.session-token');
    cookieStore.delete('next-auth.callback-url');
    cookieStore.delete('next-auth.csrf-token');
    cookieStore.delete('firebase-session-token');
    cookieStore.delete('session');
    
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL));
  } catch (error) {
    logger.error('Error during logout', { error: String(error) });
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL));
  }
} 
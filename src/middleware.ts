import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from './lib/models/User';
import { hasPermission, systemRoles } from './lib/team/role';

// Paths that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/admin',
];

// Paths that are only for non-authenticated users
const AUTH_PATHS = [
  '/login',
  '/register',
  '/reset-password',
];

// Create a special paths list that should be accessible regardless of auth state
const UNRESTRICTED_PATHS = [
  '/logout',
  '/api/auth/logout'
];

// Define path mappings for support and legal pages
// These routes don't need special handling anymore since they use route groups
// Remove them from the explicit pathMappings to prevent redirect issues
const pathMappings: Record<string, string> = {
  // Support and legal routes are handled by route groups in Next.js app router
  // Removing them from here prevents potential redirect loops
  
  // Fix auth path mappings to handle route groups correctly
  '/auth/login': '/login',
  '/auth/register': '/register',
  '/auth/reset-password': '/reset-password',
  '/auth/logout': '/logout',
};

// Marketing and public pages that should be accessible without specific handling
const PUBLIC_PATHS = [
  '/support',
  '/documentation',
  '/roadmap',
  '/system-status',
  '/integrations',
  '/blog',
  '/features-pricing'
];

// Define allowed origins for CORS
// IMPORTANT: Do not hard-code localhost in production - use environment variables
// In production, this should include the actual deployment URL
const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL || '',
  'https://iri-sync.vercel.app',
  'https://www.irisync.com',
  // Only include localhost in development
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3002'] : [])
].filter(Boolean); // Remove empty strings

/**
 * Role-based access control (RBAC) helper
 * @param user User token object
 * @param path string
 * @returns boolean (true if access allowed)
 */
function hasRouteAccess(user: any, path: string): boolean {
  if (!user) return false; // No user, no access
  
  // /admin requires platform-settings read permission
  if (path.startsWith('/admin')) {
    return hasPermission(user, 'platform-settings', 'read', systemRoles);
  }
  // For other paths, check if the user has a valid role
  return !!user.role; // Only allow access if user has a role
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get('origin') || '';
  
  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    // Check if the origin is allowed
    const isAllowedOrigin = allowedOrigins.includes(origin);
    
    // For API requests, we need to handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      
      response.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : allowedOrigins[0]);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      response.headers.set('Access-Control-Max-Age', '86400');
      
      return response;
    }
    
    // For actual API requests, handle the response with appropriate CORS headers
    const response = NextResponse.next();
    
    // Set CORS headers
    response.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : allowedOrigins[0]);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  }
  
  // Get the token and determine authentication status
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // Check for a Firebase session cookie as a fallback
  const firebaseSession = req.cookies.get('firebase-session-token')?.value || 
                          req.cookies.get('session')?.value;
                          
  // User is authenticated if they have a NextAuth token OR a Firebase session
  // WARNING: We only consider a user authenticated if they have a real token
  const isAuthenticated = !!token || !!firebaseSession;
  
  // RBAC: Check user role for protected paths
  // Remove default role assignment - only use role from token
  let userToken = token || null;
  
  // /admin RBAC enforcement
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      console.log('RBAC: Unauthenticated access attempt to /admin:', pathname);
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (!hasRouteAccess(userToken, pathname)) {
      console.warn(`RBAC: Access denied for user to ${pathname}`);
      // For API, return 403 JSON; for web, redirect to dashboard or show error
      if (pathname.startsWith('/admin/api') || pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Handle any path mappings first (for legacy URL support)
  const redirectPath = pathMappings[pathname];
  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

  // If on protected path without auth, ALWAYS redirect to login
  if (PROTECTED_PATHS.some(path => pathname.startsWith(path)) && !isAuthenticated) {
    console.log('Redirecting to login from protected path:', pathname);
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Add special case for logout path - always allow access
  if (UNRESTRICTED_PATHS.some(path => pathname === path || pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth pages
  if (AUTH_PATHS.some(path => pathname === path) && isAuthenticated) {
    console.log('Redirecting authenticated user to dashboard from:', pathname);
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Redirect root to dashboard for authenticated users or landing for others
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    // Non-authenticated users see the landing page, which is handled by the home route
  }

  // Check if the path is in public marketing section
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    // These pages should always be accessible, no additional handling needed
    return NextResponse.next();
  }

  // Continue with the request
  return NextResponse.next();
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    // Only include the following specific paths:
    '/dashboard/:path*',
    '/admin/:path*',
    '/auth/:path*',
    '/api/:path*',
    '/login',
    '/register',
    '/reset-password',
    '/integrations', // Add direct matcher for integrations
    '/'  // Only include the root path
  ],
}; 
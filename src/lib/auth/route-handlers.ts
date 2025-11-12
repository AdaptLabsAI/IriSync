import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, AuthUser } from './token';
import { hasPermission, systemRoles } from '../team/role';

/**
 * Type for API handler functions with authentication
 */
export type AuthenticatedHandler = (
  request: NextRequest,
  user: AuthUser
) => Promise<NextResponse> | NextResponse;

/**
 * Type for API handler functions with admin authentication
 */
export type AdminHandler = (
  request: NextRequest,
  user: AuthUser
) => Promise<NextResponse> | NextResponse;

/**
 * Interface for authentication verification options
 */
interface VerifyOptions {
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

/**
 * Middleware to verify authentication for API route handlers
 * @param handler The API route handler function
 * @param options Authentication verification options
 * @returns A wrapped handler with authentication
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: VerifyOptions = {}
) {
  return async function (request: NextRequest) {
    // Get token from cookies or Authorization header
    let token = request.cookies.get('auth-token')?.value;
    
    // If not in cookies, check Authorization header
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    try {
      // Verify token and get user
      const user = await verifyAuthToken(token);
      
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Invalid or expired token' },
          { status: 401 }
        );
      }
      
      // Check for admin requirement
      if (options.requireAdmin && user.role !== 'admin' && user.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        );
      }
      
      // Check for super admin requirement
      if (options.requireSuperAdmin && user.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Super Admin access required' },
          { status: 403 }
        );
      }
      
      // Call handler with authenticated user
      return handler(request, user);
    } catch (error) {
      console.error('Auth verification error:', error);
      
      return NextResponse.json(
        { error: 'Authentication error', message: 'Failed to verify authentication' },
        { status: 401 }
      );
    }
  };
}

/**
 * Middleware to verify resource/action permission for API route handlers
 * @param handler The API route handler function
 * @param resource Resource string
 * @param action Action string
 * @returns A wrapped handler with permission check
 */
export function withPermission(
  handler: AuthenticatedHandler,
  resource: string,
  action: string
) {
  return withAuth(async (request: NextRequest, user: AuthUser) => {
    if (!hasPermission(user, resource, action, systemRoles)) {
      return NextResponse.json(
        { error: 'Forbidden', message: `Permission '${resource}:${action}' required` },
        { status: 403 }
      );
    }
    return handler(request, user);
  });
}

/**
 * Middleware to verify admin authentication for API route handlers
 * @param handler The API route handler function
 * @returns A wrapped handler with admin authentication
 */
export function withAdmin(handler: AdminHandler) {
  // Require platform-settings read permission for admin
  return withPermission(handler, 'platform-settings', 'read');
}

/**
 * Middleware to verify super admin authentication for API route handlers
 * @param handler The API route handler function
 * @returns A wrapped handler with super admin authentication
 */
export function withSuperAdmin(handler: AdminHandler) {
  // Require admin-management permission for super admin
  return withPermission(handler, 'admin-management', 'create');
} 
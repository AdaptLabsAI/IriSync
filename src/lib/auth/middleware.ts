import { NextApiRequest, NextApiResponse } from 'next';
import { AuthService } from './auth-service';
import { UserRole, isRegularUser } from '../core/models/User';
import { getFirebaseFirestore } from '../core/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { OrganizationRole, getOrganization, getUserOrganizationRole, isMemberOfOrganization } from '../team/users/organization';
import { getCurrentUser } from './token';
import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '../core/logging/logger';

const logger = new Logger({
  minLevel: 'info',
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production'
});

/**
 * Interface for extended request with user data
 */
export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    organizationId?: string;
  };
}

/**
 * Type for API handler function
 */
type ApiHandler = (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void;

/**
 * Middleware to verify authentication for protected routes
 * @param handler API route handler
 * @returns Wrapped handler with authentication
 */
export function verifyAuth(handler: ApiHandler): ApiHandler {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Get authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }
      
      // Extract token
      const token = authHeader.split(' ')[1];
      
      // Verify token
      const authService = new AuthService();
      const payload = authService.verifyToken(token);
      
      if (!payload) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        });
      }
      
      // Add user data to request
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role as UserRole,
        organizationId: payload.organizationId
      };
      
      // Call the original handler
      return handler(req, res);
    } catch (error) {
      console.error('Authentication error:', error);
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication failed'
      });
    }
  };
}

/**
 * Middleware to verify admin role
 * @param handler API route handler
 * @returns Wrapped handler with admin verification
 */
export function verifyAdmin(handler: ApiHandler): ApiHandler {
  return verifyAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Check if user has admin role
    if (req.user?.role !== UserRole.ADMIN && req.user?.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    
    // Call the original handler
    return handler(req, res);
  });
}

/**
 * Middleware to verify super admin role
 * @param handler API route handler
 * @returns Wrapped handler with super admin verification
 */
export function verifySuperAdmin(handler: ApiHandler): ApiHandler {
  return verifyAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Check if user has super admin role
    if (req.user?.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Super Admin access required'
      });
    }
    
    // Call the original handler
    return handler(req, res);
  });
}

/**
 * Middleware to verify organization access (fully production-ready)
 * - Allows SUPER_ADMIN and ADMIN global access
 * - Checks org membership and role using canonical utilities
 * - Supports fine-grained permission checks (optional)
 * - Logs all access denials and errors
 * - Extensible for future permission models
 * @param handler API route handler
 * @param requiredRoles (optional) Array of allowed org roles (e.g., [OrganizationRole.ADMIN, OrganizationRole.OWNER])
 * @returns Wrapped handler with organization verification
 */
export function verifyOrganizationAccess(
  handler: ApiHandler,
  requiredRoles?: OrganizationRole[]
): ApiHandler {
  return verifyAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const organizationId = (req.query.organizationId || req.body?.organizationId) as string;
    if (!organizationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Organization ID is required'
      });
    }
    // Allow global admins
    if (req.user?.role === UserRole.SUPER_ADMIN || req.user?.role === UserRole.ADMIN) {
      req.user.organizationId = organizationId;
      return handler(req, res);
    }
    try {
      // Check membership using canonical utility
      const isMember = await isMemberOfOrganization(req.user!.userId, organizationId);
      if (!isMember) {
        console.warn(`OrgAccess: User ${req.user?.userId} denied for org ${organizationId} (not a member)`);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this organization'
        });
      }
      // If fine-grained roles required, check them
      if (requiredRoles && requiredRoles.length > 0) {
        const hasRole = await hasOrganizationRole(req.user!.userId, organizationId, requiredRoles);
        if (!hasRole) {
          console.warn(`OrgAccess: User ${req.user?.userId} denied for org ${organizationId} (missing required role)`);
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have the required role for this organization'
          });
        }
      }
      // Attach orgId to user for downstream use
      req.user!.organizationId = organizationId;
      return handler(req, res);
    } catch (error) {
      console.error('OrgAccess error:', error, { userId: req.user?.userId, organizationId });
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to verify organization access'
      });
    }
  });
}

/**
 * Middleware to check if the user is authenticated
 * 
 * @param req Next.js request object
 * @returns Response or undefined to continue
 */
export async function authMiddleware(req: NextRequest) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  return NextResponse.next();
}

/**
 * Check if a user has one of the required organization roles
 * 
 * @param userId User ID to check
 * @param organizationId Organization ID to check
 * @param requiredRoles Array of roles that would satisfy the permission check
 * @returns True if the user has one of the required roles
 */
export async function hasOrganizationRole(
  userId: string, 
  organizationId: string, 
  requiredRoles: OrganizationRole[]
): Promise<boolean> {
  try {
    if (!userId || !organizationId) {
      return false;
    }
    
    // Get the organization document
    const orgDoc = await getDoc(doc(firestore, 'organizations', organizationId));
    
    if (!orgDoc.exists()) {
      logger.warn('Organization not found', { organizationId });
      return false;
    }
    
    const orgData = orgDoc.data();
    
    // Check if the user is the owner (highest permission level)
    if (orgData.ownerId === userId) {
      return true;
    }
    
    // Check if the user is an admin
    if (requiredRoles.includes(OrganizationRole.ADMIN) && 
        orgData.adminUserIds?.includes(userId)) {
      return true;
    }
    
    // Get the organization member entry for the user
    const memberDoc = await getDoc(
      doc(firestore, 'organizations', organizationId, 'members', userId)
    );
    
    if (!memberDoc.exists()) {
      logger.warn('User is not a member of organization', { userId, organizationId });
      return false;
    }
    
    const memberData = memberDoc.data();
    const userRole = memberData.role;
    
    // Check if user's role is in the required roles
    return requiredRoles.includes(userRole);
  } catch (error) {
    logger.error('Error checking organization role', { error, userId, organizationId });
    return false;
  }
}

/**
 * Middleware to check if the user has one of the required organization roles
 * 
 * @param organizationIdParam URL parameter containing organization ID
 * @param requiredRoles Array of roles that would satisfy the permission check
 * @returns Middleware function
 */
export function requireOrganizationRole(
  organizationIdParam: string, 
  requiredRoles: OrganizationRole[]
) {
  return async (req: NextRequest) => {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    const url = new URL(req.url);
    const organizationId = url.searchParams.get(organizationIdParam);
    
    if (!organizationId) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    const hasRole = await hasOrganizationRole(user.id, organizationId, requiredRoles);
    
    if (!hasRole) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    return NextResponse.next();
  };
} 
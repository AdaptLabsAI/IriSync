import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../core/logging/logger';
import { getDoc, queryDocs } from '../core/database/firestore';

/**
 * Admin role levels (IriSync platform only)
 */
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
}

/**
 * Admin user interface
 */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: Date | string;
  lastLogin?: Date | string;
}

/**
 * Verify if a user is an admin
 */
export async function verifyAdmin(userId: string): Promise<AdminUser | null> {
  try {
    if (!userId) {
      return null;
    }
    
    const admin = await getDoc<AdminUser>('admins', userId);
    return admin;
  } catch (error) {
    logger.error('Error verifying admin status', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    return null;
  }
}

/**
 * Check if a user is a super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const admin = await verifyAdmin(userId);
    return admin?.role === AdminRole.SUPER_ADMIN;
  } catch (error) {
    logger.error('Error checking super admin status', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    return false;
  }
}

/**
 * Get all admins
 */
export async function getAllAdmins(): Promise<AdminUser[]> {
  try {
    const admins = await queryDocs<AdminUser>('admins', [], { field: 'createdAt', direction: 'desc' });
    return admins;
  } catch (error) {
    logger.error('Error getting all admins', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Middleware to verify admin access
 */
export function adminAuthMiddleware(allowedRoles: AdminRole[] = [AdminRole.SUPER_ADMIN, AdminRole.ADMIN]) {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      // Extract user ID from the request
      // This would typically come from a session or token
      const userId = req.headers['x-user-id'] as string || '';
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Verify admin status
      const admin = await verifyAdmin(userId);
      
      if (!admin) {
        return res.status(403).json({ error: 'Forbidden - Admin access required' });
      }
      
      // Check if the admin has one of the allowed roles
      if (!allowedRoles.includes(admin.role)) {
        return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      }
      
      // Attach admin to request for later use
      (req as any).admin = admin;
      
      // Continue to the next middleware or handler
      next();
    } catch (error) {
      logger.error('Error in admin auth middleware', {
        error: error instanceof Error ? error.message : String(error),
        url: req.url,
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to verify super admin access
 */
export function superAdminAuthMiddleware() {
  return adminAuthMiddleware([AdminRole.SUPER_ADMIN]);
}

/**
 * Helper to create a new admin user
 */
export async function createAdmin(
  userId: string,
  email: string,
  name: string,
  role: AdminRole = AdminRole.ADMIN
): Promise<AdminUser> {
  try {
    // Check if user already exists in the admins collection
    const existingAdmin = await getDoc<AdminUser>('admins', userId);
    
    if (existingAdmin) {
      throw new Error(`User with ID ${userId} is already an admin`);
    }
    
    logger.info('Creating new admin user', { userId, email, role });
    
    // Get Firestore instance
    const admin = require('firebase-admin');
    const firestore = admin.firestore();
    
    // Create admin user data
    const adminData: AdminUser = {
      id: userId,
      email,
      name,
      role,
      createdAt: new Date(),
    };
    
    // Write to Firestore
    await firestore.collection('admins').doc(userId).set({
      ...adminData,
      createdAt: admin.firestore.Timestamp.fromDate(new Date())
    });
    
    // Also update the main user record to mark as admin
    await firestore.collection('users').doc(userId).update({
      isAdmin: true,
      adminRole: role,
      updatedAt: admin.firestore.Timestamp.fromDate(new Date())
    });
    
    // Log the action for audit trail
    await firestore.collection('adminAuditLogs').add({
      action: 'create_admin',
      targetUserId: userId,
      performedBy: 'system', // This should be replaced with the ID of the admin performing this action
      details: {
        email,
        name,
        role
      },
      timestamp: admin.firestore.Timestamp.fromDate(new Date())
    });
    
    return adminData;
  } catch (error) {
    logger.error('Error creating admin user', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      email,
    });
    throw new Error(`Failed to create admin user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 
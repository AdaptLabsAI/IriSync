import { useSession } from 'next-auth/react';

/**
 * Hook to check if a user has a specific permission
 * @param requiredPermission The permission to check for
 * @returns Whether the user has the required permission
 */
export function usePermissionCheck(requiredPermission?: string): boolean {
  const { data: session } = useSession();
  
  // If no permission is required, allow access
  if (!requiredPermission) return true;
  
  // If no user is logged in, deny access
  if (!session?.user) return false;
  
  // Get the user's permissions from their session
  // This would come from your auth provider (e.g. NextAuth.js)
  const userPermissions = (session.user as any).permissions || [];
  
  // Check if the user has the required permission
  return userPermissions.includes(requiredPermission);
} 
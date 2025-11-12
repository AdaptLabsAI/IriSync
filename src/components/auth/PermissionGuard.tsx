'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { useOrganization } from '../../hooks/useOrganization';

interface PermissionGuardProps {
  resource: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * PermissionGuard component that conditionally renders children based on user permissions
 */
export default function PermissionGuard({ 
  resource, 
  action, 
  children,
  fallback = null
}: PermissionGuardProps) {
  const { data: session, status } = useSession();
  const { organization } = useOrganization();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading' || !session || !organization) {
      return;
    }

    const checkPermission = async () => {
      try {
        const response = await axios.get(`/api/auth/permissions/check`, {
          params: {
            organizationId: organization.id,
            resource,
            action
          }
        });
        
        setHasPermission(response.data.hasPermission);
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [session, organization, resource, action, status]);

  // If still loading, return null (or could return a loading state)
  if (isLoading || status === 'loading') {
    return null;
  }

  // If no permission, return the fallback
  if (!hasPermission) {
    return <>{fallback}</>;
  }

  // If has permission, return the children
  return <>{children}</>;
} 
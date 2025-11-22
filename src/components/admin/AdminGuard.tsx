'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { getAuth } from 'firebase/auth';

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * AdminGuard component restricts access to admin pages to users with admin privileges
 */
export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check admin status
    const verifyAdminStatus = async () => {
      if (!loading && user) {
        try {
          // Get the user's auth token for verification
          const token = await getAuthToken();
          
          if (!token) {
            setError('Authentication token not available');
            setIsVerifying(false);
            return;
          }

          // Call the API to check admin status
          const response = await fetch('/api/auth/check-admin', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Admin check failed: ${response.status}`);
          }
          
          const data = await response.json();
          setIsAdmin(data.isAdmin);
          
          if (!data.isAdmin) {
            setError('Admin privileges required');
          }
        } catch (err) {
          console.error('Error checking admin status:', err);
          setError('Failed to verify admin status');
          setIsAdmin(false);
        } finally {
          setIsVerifying(false);
        }
      } else if (!loading && !user) {
        // Not logged in
        setIsVerifying(false);
      }
    };

    verifyAdminStatus();
  }, [user, loading]);

  // Function to get auth token from Firebase Auth
  const getAuthToken = async (): Promise<string | null> => {
    try {
      // Get Firebase Auth instance
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Get the ID token from Firebase Auth
        return await currentUser.getIdToken();
      }
      
      // Fallback: try to get from NextAuth session
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const session = await response.json();
        if (session?.accessToken) {
          return session.accessToken;
        }
        if (session?.user?.accessToken) {
          return session.user.accessToken;
        }
        // If using Firebase ID token from session
        if (session?.user?.idToken) {
          return session.user.idToken;
        }
      }
      
      // Last resort: check if user object has token method
      if (user && typeof (user as any).getIdToken === 'function') {
        return await (user as any).getIdToken();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Show loading state while checking authentication and admin status
  if (loading || isVerifying) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh' 
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography>Verifying admin access...</Typography>
        </Box>
      </Box>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    // Use client-side navigation to the login page
    router.push('/login?redirect=/admin');
    
    // Show loading state during redirect
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh' 
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography>Redirecting to login...</Typography>
        </Box>
      </Box>
    );
  }

  // If not an admin, show access denied message
  if (!isAdmin || error) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh' 
        }}
      >
        <Box 
          sx={{ 
            textAlign: 'center', 
            maxWidth: 'md', 
            p: 4, 
            borderRadius: 1, 
            border: 1, 
            borderColor: 'divider' 
          }}
        >
          <Typography variant="h5" component="h1" sx={{ mb: 2, color: 'error.main' }}>
            Access Denied
          </Typography>
          <Typography sx={{ mb: 3 }}>
            {error || 'You do not have administrative privileges required to access this area.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="primary" 
              color="primary" 
              onClick={() => router.push('/dashboard')}
            >
              Return to Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // If admin access verified, render children
  return <>{children}</>;
} 
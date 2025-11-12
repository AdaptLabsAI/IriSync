'use client';

import { useEffect, useState } from 'react';
import { Layout, Container, Typography, Loading } from '@/components/ui/new';
import { getAuth, signOut as firebaseSignOut } from 'firebase/auth';
import { signOut as nextAuthSignOut } from 'next-auth/react';

export default function LogoutPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Sign out from Firebase
        const auth = getAuth();
        await firebaseSignOut(auth);
        
        // Sign out from NextAuth
        await nextAuthSignOut({ redirect: false });
        
        // Call our custom API for server-side logout
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to logout on server');
        }
        
        // Force a hard refresh to the home page
        window.location.href = '/';
      } catch (error) {
        console.error('Logout error:', error);
        setError('Failed to log out. Please try again or close your browser.');
        
        // Even on error, try to navigate to home after a delay
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    };

    handleLogout();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <Container maxWidth="sm">
          <div className="text-center">
            {error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <Typography variant="body" className="text-red-700">
                  {error}
                </Typography>
              </div>
            ) : (
              <div className="space-y-4">
                <Loading size="lg" />
                <Typography variant="h5">
                  Logging out...
                </Typography>
              </div>
            )}
          </div>
        </Container>
      </div>
    </Layout>
  );
} 
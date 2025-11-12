'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';

/**
 * Legacy OAuth callback page for platform authorizations
 * This page redirects to the new callback page in the (dashboard) route group for better organization
 */
export default function LegacyPlatformCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [redirectAttempts, setRedirectAttempts] = useState(0);
  
  // Determine target redirect path from environment variables
  const dashboardCallbackPath = process.env.NEXT_PUBLIC_DASHBOARD_CALLBACK_PATH || '/platforms/callback';
  
  useEffect(() => {
    const performRedirect = () => {
      try {
        // Get all search params to forward them
        const params = new URLSearchParams();
        
        // Use the searchParams object if it exists
        if (searchParams) {
          searchParams.forEach((value, key) => {
            params.append(key, value);
          });
        }
        
        // Check for error in params
        if (params.get('error')) {
          throw new Error(`Authentication error: ${params.get('error_description') || params.get('error')}`);
        }
        
        // Redirect to the new callback location with all params
        const redirectUrl = `${dashboardCallbackPath}?${params.toString()}`;
        router.push(redirectUrl);
      } catch (err) {
        console.error('Error processing platform callback:', err);
        setError((err as Error).message || 'Failed to process authentication callback');
      }
    };

    // Only perform redirect if we haven't exceeded retry attempts
    if (!error && redirectAttempts < 3) {
      performRedirect();
    }
  }, [searchParams, router, dashboardCallbackPath, redirectAttempts, error]);

  // Handle retry button click
  const handleRetry = () => {
    setError(null);
    setRedirectAttempts(prev => prev + 1);
  };

  // Show error if redirect failed
  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100vh"
        p={3}
      >
        <Alert 
          severity="error" 
          sx={{ maxWidth: 600, mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          API: {dashboardCallbackPath}
        </Typography>
      </Box>
    );
  }

  // Loading state while redirecting
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
    >
      <CircularProgress size={60} />
      <Typography variant="h6" mt={3}>
        Redirecting to platform authorization...
      </Typography>
    </Box>
  );
} 
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Box, Container, Typography, CircularProgress, Alert, Button, Paper } from '@mui/material';
import { useToast } from '@/components/ui/use-toast';
import { doc, setDoc, updateDoc, collection, getDoc, serverTimestamp } from 'firebase/firestore';
import { firestore, auth } from '@/lib/firebase/client';
import { logger } from '@/lib/logging/logger';

/**
 * Enhanced OAuth callback page for platform authorizations
 * This page is displayed after a user authorizes a platform connection
 */
export default function PlatformCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [platformName, setPlatformName] = useState<string>('');

  // Extract and validate params with null checks
  const platform = searchParams?.get('platform') || '';
  const platformType = searchParams?.get('type') || 'social'; // Default to social if not specified
  const code = searchParams?.get('code') || '';
  const error_param = searchParams?.get('error') || '';
  const state = searchParams?.get('state') || '';

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Clear any previous errors
        setError(null);
        setLoading(true);
        
        // Check for errors from the OAuth provider
        if (error_param) {
          setError(`Authorization failed: ${error_param}`);
          setLoading(false);
          return;
        }
        
        // Validate required params
        if (!platform) {
          setError('Missing platform parameter');
          setLoading(false);
          return;
        }
        
        if (!code) {
          setError('Missing authorization code');
          setLoading(false);
          return;
        }
        
        // Format the platform name for display
        setPlatformName(platform.charAt(0).toUpperCase() + platform.slice(1));
        
        // Get current user
        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.uid) {
          throw new Error('You must be logged in to connect platforms');
        }
        
        // Process OAuth token exchange via Firebase HTTP callable function
        // First, check if we should still use the API for token exchange
        try {
          // This part still needs to call the API since OAuth token exchange requires server-side secrets
          const response = await fetch(`/api/platforms/callback/${platformType}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              platform,
              code,
              state,
            }),
          });
          
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Failed to complete authorization. API: /api/platforms/callback/${platformType}`);
          }
          
          const tokenData = await response.json();
          
          // Now use Firebase to store the connection
          const userPlatformsRef = collection(firestore, 'users', currentUser.uid, 'platforms');
          const platformDocRef = doc(userPlatformsRef, platform);
          
          // Check if the platform is already connected
          const platformDoc = await getDoc(platformDocRef);
          
          // Prepare platform data
          const platformData = {
            name: platformName,
            platformId: platform,
            platformType: platformType,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            tokenExpiry: tokenData.expiresAt ? new Date(tokenData.expiresAt) : null,
            isConnected: true,
            updatedAt: serverTimestamp(),
            ...(platformDoc.exists() ? {} : { createdAt: serverTimestamp() })
          };
          
          // Save to Firestore
          if (platformDoc.exists()) {
            await updateDoc(platformDocRef, platformData);
          } else {
            await setDoc(platformDocRef, platformData);
          }
          
          // Add platform connection event to activity log
          const activityRef = collection(firestore, 'activities');
          const activityDoc = doc(activityRef);
          await setDoc(activityDoc, {
            type: 'platform_connection',
            userId: currentUser.uid,
            username: currentUser.displayName || 'User',
            platform: platformName,
            timestamp: serverTimestamp(),
            action: 'connected'
          });
          
          // Mark as successful
          setSuccess(true);
          toast({
            title: 'Connection Successful',
            description: `${platformName} has been successfully connected!`,
          });
        } catch (apiError) {
          // Handle API-specific errors
          logger.error({
            type: 'platform_connection_error',
            platform,
            error: apiError instanceof Error ? apiError.message : String(apiError)
          });
          
          throw new Error(
            apiError instanceof Error 
              ? `${apiError.message}. API: /api/platforms/callback/${platformType}`
              : `Failed to complete authorization. API: /api/platforms/callback/${platformType}`
          );
        }
      } catch (err) {
        console.error('Callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to complete platform authorization';
        setError(errorMessage);
        toast({
          title: 'Connection Failed',
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [platform, code, error_param, state, platformType, toast]);

  const navigateToDashboard = () => {
    router.push('/dashboard/settings/connections');
  };

  const retryConnection = () => {
    // Redirect to the connections page to try again
    router.push('/dashboard/settings/connections');
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <CircularProgress size={60} />
            <Typography variant="h5">
              Completing {platformName || 'Platform'} Connection
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please wait while we verify your credentials...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
            <Typography variant="h5">
              Connection Failed
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              There was a problem connecting to {platformName || 'the platform'}.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={retryConnection}>
                Try Again
              </Button>
              <Button variant="contained" onClick={navigateToDashboard}>
                Return to Connections
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Box sx={{ 
              bgcolor: 'success.main', 
              color: 'white', 
              borderRadius: '50%', 
              width: 60, 
              height: 60, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mb: 2
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </Box>
            <Typography variant="h5">
              Connection Successful!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Your {platformName} account has been successfully connected to Irisync.
            </Typography>
            <Button variant="contained" onClick={navigateToDashboard}>
              Continue to Connections
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
} 
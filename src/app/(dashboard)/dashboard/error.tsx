'use client';

import React, { useEffect } from 'react';
import { Box, Button, Typography, Paper, Stack } from '@mui/material';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { logger } from '@/lib/core/logging/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log the error to the server
  useEffect(() => {
    logger.error({
      type: 'dashboard_client_error',
      error: error.message,
      stack: error.stack,
      digest: error.digest
    }, 'Dashboard client error');
  }, [error]);

  // Extract API endpoint from error message if available
  const apiEndpoint = error.message.includes('API:') 
    ? error.message.split('API:')[1].trim() 
    : undefined;

  // Format the error message without the API endpoint part
  const errorMessage = apiEndpoint 
    ? error.message.split('API:')[0].trim() 
    : error.message;

  return (
    <Box sx={{ py: 4, px: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 600,
          mx: 'auto',
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'error.light'
        }}
      >
        <Stack spacing={4} alignItems="center">
          <ErrorOutlineIcon color="error" sx={{ fontSize: 64 }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" color="error" gutterBottom>
              Something went wrong!
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              {errorMessage}
            </Typography>
            
            {apiEndpoint && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 2 }}>
                Failed API: {apiEndpoint}
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">
              Please try refreshing the page or contact support if the problem persists.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => reset()}
              startIcon={<RefreshIcon />}
            >
              Try again
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              onClick={() => window.location.href = '/'}
            >
              Go to Home
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
} 
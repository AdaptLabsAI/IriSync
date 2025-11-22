'use client';

import React from 'react';
import { Box, Button, Typography, Paper, Stack } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  apiEndpoint?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Here you could send the error to your error reporting service
    // Example: reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Paper 
          elevation={3}
          sx={{ 
            p: 3, 
            my: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'error.light'
          }}
        >
          <Stack spacing={2} direction="row" alignItems="center">
            <ErrorOutlineIcon color="error" sx={{ fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" color="error">
                Error Loading Data
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {this.state.error?.message || 'An unexpected error occurred'}
              </Typography>
              {this.props.apiEndpoint && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Failed API: {this.props.apiEndpoint}
                </Typography>
              )}
            </Box>
            <Button 
              variant="outline" 
              color="primary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </Button>
          </Stack>
        </Paper>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
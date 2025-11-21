'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { NotificationProvider } from '../components/ui/mui-components';
import { Box, CircularProgress, Alert, Button, AlertTitle, Container, Paper, Typography } from '@mui/material';
import { Providers as AuthProviders } from '../providers';
import { GlobalErrorBoundary } from '../components/common/GlobalErrorBoundary';
import { useAuth } from '../providers/AuthProvider';
import { TeamProvider } from '../context/TeamContext';
import { ToastProvider } from '../components/ui/use-toast'; // MUI-based toast provider
import Link from 'next/link';

// Define theme customizations based on the brand guidelines
const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
  },
  palette: {
    primary: {
      light: '#4DDB8B', // Lighter shade of #00C957
      main: '#00C957', // Main green color as requested
      dark: '#009A42', // Darker shade for hover states
      contrastText: '#fff',
    },
    secondary: {
      light: '#9871E9', // Lighter shade of royal purple
      main: '#6A35D4', // Royal purple as the secondary color
      dark: '#4D1FB2', // Darker shade for hover states
      contrastText: '#fff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
        },
      },
    },
  },
});

// Define globally available Flex component
export const Flex = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
  return <Box display="flex" {...props}>{children}</Box>;
};

// Loading fallback component to show during suspense
function LoadingFallback() {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      width: '100%' 
    }}>
      <CircularProgress size={48} />
    </Box>
  );
}

// Firebase error handler component
// This component displays an error UI when Firebase client configuration is incomplete
// or when Firebase fails to initialize in the browser.
// 
// It will NOT show errors for:
// - SSR usage of Firebase client (developer error, logged but not shown to users)
// - Authentication failures (handled by individual auth forms)
// - Network errors (handled by individual operations)
// 
// It ONLY shows for:
// - Missing or incomplete NEXT_PUBLIC_FIREBASE_* environment variables
// - Firebase initialization failures in the browser (runtime errors)
const FirebaseErrorHandler = ({ children }: { children: React.ReactNode }) => {
  const { error } = useAuth();

  if (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom color="error">
            Firebase Authentication Error
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            Firebase authentication is temporarily unavailable. Please try again later.
          </Alert>
          <Typography paragraph>
            {isProduction 
              ? 'If this problem persists, please contact support or check server environment variables.'
              : 'There was a problem with the Firebase configuration. This usually happens when environment variables are not properly set up.'
            }
          </Typography>
          {!isProduction && (
            <>
              <Typography paragraph>
                To fix this issue in development:
              </Typography>
              <Box component="ol" sx={{ ml: 4 }}>
                <li>Check that your <code>.env.local</code> file exists in the project root</li>
                <li>Verify that it contains all the required Firebase environment variables</li>
                <li>Ensure variables have the correct <code>NEXT_PUBLIC_</code> prefix for client-side access</li>
                <li>Restart the development server after making changes</li>
              </Box>
            </>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
            {isProduction 
              ? 'Environment variables are configured in the hosting platform (e.g., Vercel project settings).'
              : 'Development environment variables should be in .env.local file.'
            }
          </Typography>
          {!isProduction && (
            <Box sx={{ mt: 4 }}>
              <Button 
                component={Link} 
                href="/api/debug/firebase-config-status" 
                variant="contained" 
                color="primary"
                target="_blank"
              >
                Check Firebase Configuration
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    );
  }

  return <>{children}</>;
};

// Custom error handling component
function AppErrorHandler({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Add global error handler
    const errorHandler = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setError(event.error);
      setHasError(true);
      event.preventDefault();
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  // Reset error state
  const resetError = () => {
    setHasError(false);
    setError(null);
  };

  if (hasError) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          p: 2,
        }}
      >
        <Alert 
          severity="error" 
          sx={{ maxWidth: 500 }}
          action={
            <Button onClick={resetError} color="inherit" size="small">
              Retry
            </Button>
          }
        >
          <AlertTitle>Application Error</AlertTitle>
          An error occurred while loading the application.
          <Box component="pre" sx={{ mt: 2, fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
            {process.env.NODE_ENV === 'development' && error ? error.stack : 'Please try again or contact support if the issue persists.'}
          </Box>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorHandler>
      <AuthProviders>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider> {/* Use ToastProvider instead of NotificationProvider */}
            <GlobalErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <FirebaseErrorHandler>
                  <TeamProvider>
                    {children}
                  </TeamProvider>
                </FirebaseErrorHandler>
              </Suspense>
            </GlobalErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </AuthProviders>
    </AppErrorHandler>
  );
}

export default Providers;

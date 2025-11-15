'use client';

import React, { ReactNode } from 'react';
import { TodoProvider } from '../context/TodoContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthProvider, useAuth } from './AuthProvider';
import { Alert, Box, Button, Container, Typography, Paper } from '@mui/material';
import Link from 'next/link';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

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
const FirebaseErrorHandler = ({ children }: { children: ReactNode }) => {
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
              ? 'If this problem persists, please contact support.'
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
                href="/api/debug/env" 
                variant="contained" 
                color="primary"
                target="_blank"
              >
                Check Environment Variables
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    );
  }

  return <>{children}</>;
};

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <FirebaseErrorHandler>
          <TodoProvider>
            {children}
          </TodoProvider>
        </FirebaseErrorHandler>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default AppProviders; 
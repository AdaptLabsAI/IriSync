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
const FirebaseErrorHandler = ({ children }: { children: ReactNode }) => {
  const { error } = useAuth();

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom color="error">
            Firebase Configuration Error
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Typography paragraph>
            There was a problem with the Firebase configuration. This usually happens when environment variables are not properly set up.
          </Typography>
          <Typography paragraph>
            To fix this issue:
          </Typography>
          <Box component="ol" sx={{ ml: 4 }}>
            <li>Check that your <code>.env.local</code> file exists in the project root</li>
            <li>Verify that it contains all the required Firebase environment variables</li>
            <li>Make sure server-side variables do not have <code>NEXT_PUBLIC_</code> prefix</li>
            <li>Restart the development server after making changes</li>
          </Box>
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
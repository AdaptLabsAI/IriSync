'use client';

import { useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper,
  Stack
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProfileSettingsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error('Profile settings error:', error);
  }, [error]);

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper 
        elevation={3}
        sx={{ 
          p: 4, 
          textAlign: 'center',
          borderRadius: 2,
          bgcolor: 'error.light',
          color: 'error.contrastText'
        }}
      >
        <Stack spacing={3} alignItems="center">
          <ErrorIcon sx={{ fontSize: 72, color: 'error.main' }} />
          
          <Box>
            <Typography variant="h4" gutterBottom>
              Profile Settings Error
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              We couldn't load your profile settings. Please try again.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Error: {error.message || 'Unknown error'}
            </Typography>
          </Box>
          
          <Box>
            <Button 
              variant="contained" 
              onClick={reset}
              color="primary"
              sx={{ 
                px: 4,
                bgcolor: 'background.paper',
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'background.paper',
                  opacity: 0.9
                }
              }}
            >
              Try again
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
} 
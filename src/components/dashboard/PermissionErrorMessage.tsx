'use client';

import { Box, Typography, Button } from '@mui/material';

interface PermissionErrorMessageProps {
  message: string;
}

export default function PermissionErrorMessage({ message }: PermissionErrorMessageProps) {
  return (
    <Box sx={{ p: 3, mb: 3, bgcolor: 'error.lighter', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ color: 'error.main', mb: 1 }}>
        Firebase Permission Error
      </Typography>
      <Typography>
        {message}
      </Typography>
      <Button 
        variant="primary" 
        color="primary" 
        sx={{ mt: 2 }}
        onClick={() => window.location.href = '/logout'}
      >
        Sign Out and Try Again
      </Button>
    </Box>
  );
} 
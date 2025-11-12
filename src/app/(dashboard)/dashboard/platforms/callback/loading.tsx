import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  CircularProgress,
  Paper
} from '@mui/material';

export default function PlatformCallbackLoading() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3
        }}
      >
        <CircularProgress size={60} thickness={4} />
        
        <Box>
          <Typography variant="h5" gutterBottom>
            Connecting to Platform
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please wait while we complete the connection process...
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
} 
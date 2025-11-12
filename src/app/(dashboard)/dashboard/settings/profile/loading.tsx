import React from 'react';
import { 
  Box, 
  Container, 
  Skeleton, 
  Paper, 
  Divider
} from '@mui/material';

export default function ProfileSettingsLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="250px" height={40} />
        <Skeleton variant="text" width="400px" height={24} />
      </Box>
      
      <Paper sx={{ p: 3 }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
            <Skeleton variant="text" width={100} height={32} />
            <Skeleton variant="text" width={100} height={32} />
            <Skeleton variant="text" width={100} height={32} />
          </Box>
          <Skeleton variant="rectangular" width={100} height={2} />
        </Box>
        
        {/* Profile avatar section */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
          <Skeleton variant="circular" width={80} height={80} />
          <Box>
            <Skeleton variant="text" width={150} height={24} sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
            </Box>
          </Box>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Form fields */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '250px' }}>
            <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1, width: '100%' }} />
          </Box>
          
          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '250px' }}>
            <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1, width: '100%' }} />
          </Box>
          
          <Box sx={{ width: '100%' }}>
            <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1, width: '100%' }} />
          </Box>
          
          <Box sx={{ width: '100%' }}>
            <Skeleton variant="text" width={150} height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1, width: '100%' }} />
          </Box>
        </Box>
        
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Skeleton variant="rectangular" width={100} height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
        </Box>
      </Paper>
    </Container>
  );
} 
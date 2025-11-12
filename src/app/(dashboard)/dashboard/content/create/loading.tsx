import React from 'react';
import { 
  Box, 
  Container, 
  Skeleton, 
  Grid, 
  Paper, 
  Divider, 
  Stack
} from '@mui/material';

export default function ContentCreationLoading() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="250px" height={40} />
        <Skeleton variant="text" width="400px" height={24} />
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box width="100%">
          <Paper sx={{ p: 0 }}>
            {/* Tab Skeleton */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1, display: 'flex' }}>
              <Skeleton variant="rectangular" width={120} height={32} sx={{ mr: 2, borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={120} height={32} sx={{ mr: 2, borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: 1 }} />
            </Box>
            
            <Box sx={{ p: 3 }}>
              {/* Form Skeleton */}
              <Stack spacing={4}>
                {/* Platform selection */}
                <Box>
                  <Skeleton variant="text" width="200px" height={32} sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {[1, 2, 3, 4].map((_, i) => (
                      <Skeleton 
                        key={i}
                        variant="rectangular" 
                        width="200px" 
                        height={60} 
                        sx={{ borderRadius: 1 }}
                      />
                    ))}
                  </Box>
                </Box>
                
                {/* Content field */}
                <Box>
                  <Skeleton variant="text" width="150px" height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
                </Box>
                
                {/* Media section */}
                <Box>
                  <Skeleton variant="text" width="180px" height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
                </Box>
                
                {/* Scheduling */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton variant="rectangular" width={42} height={24} sx={{ mr: 1, borderRadius: 1 }} />
                  <Skeleton variant="text" width="150px" height={24} />
                </Box>
                
                {/* Submit button */}
                <Box>
                  <Skeleton variant="rectangular" width={150} height={48} sx={{ borderRadius: 1 }} />
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
} 
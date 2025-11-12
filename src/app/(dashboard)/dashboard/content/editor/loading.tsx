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

export default function ContentEditorLoading() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="250px" height={40} />
        <Skeleton variant="text" width="400px" height={24} />
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box width="100%">
          <Paper sx={{ p: 3 }}>
            {/* Toolbar skeleton */}
            <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((_, index) => (
                <Skeleton 
                  key={index}
                  variant="rectangular" 
                  width={40} 
                  height={40} 
                  sx={{ borderRadius: 1 }}
                />
              ))}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Content editor skeleton */}
            <Box sx={{ mb: 4 }}>
              <Skeleton variant="text" width="100%" height={28} />
              <Skeleton variant="text" width="90%" height={28} sx={{ mt: 1 }} />
              <Skeleton variant="text" width="95%" height={28} sx={{ mt: 1 }} />
              <Skeleton variant="text" width="85%" height={28} sx={{ mt: 1 }} />
              <Skeleton variant="text" width="75%" height={28} sx={{ mt: 1 }} />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Settings skeleton */}
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
              </Box>
              <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
} 
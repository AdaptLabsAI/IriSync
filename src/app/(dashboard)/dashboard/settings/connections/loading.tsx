import React from 'react';
import { 
  Box, 
  Container, 
  Skeleton, 
  Paper, 
  Divider,
  Grid,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';

export default function ConnectionsSettingsLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="280px" height={40} />
        <Skeleton variant="text" width="400px" height={24} />
      </Box>
      
      {/* Connection categories */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        {Array(3).fill(0).map((_, index) => (
          <Skeleton key={index} variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
        ))}
      </Box>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Platform connection cards */}
        {Array(6).fill(0).map((_, index) => (
          <Box key={index} sx={{ width: { xs: '100%', md: '50%', lg: '33.33%' } }}>
            <Card variant="outlined">
              <CardHeader
                avatar={<Skeleton variant="circular" width={40} height={40} />}
                title={<Skeleton variant="text" width="60%" height={24} />}
                subheader={<Skeleton variant="text" width="40%" height={20} />}
              />
              <Divider />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="90%" height={20} />
                  <Skeleton variant="text" width="75%" height={20} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Skeleton variant="circular" width={16} height={16} sx={{ mr: 1 }} />
                  <Skeleton variant="text" width="40%" height={20} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton variant="circular" width={16} height={16} sx={{ mr: 1 }} />
                  <Skeleton variant="text" width="60%" height={20} />
                </Box>
              </CardContent>
              <Divider />
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
              </Box>
            </Card>
          </Box>
        ))}
      </Box>
    </Container>
  );
} 
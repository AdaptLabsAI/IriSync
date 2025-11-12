import React from 'react';
import { 
  Box, 
  Container, 
  Skeleton, 
  Grid, 
  Paper, 
  Divider,
  Card,
  CardContent
} from '@mui/material';

export default function MediaLibraryLoading() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="250px" height={40} />
        <Skeleton variant="text" width="400px" height={24} />
      </Box>
      
      {/* Toolbar and search */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
        </Box>
        <Skeleton variant="rectangular" width={240} height={40} sx={{ borderRadius: 1 }} />
      </Box>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Skeleton variant="text" width={60} height={24} />
            <Skeleton variant="rectangular" width={180} height={40} sx={{ borderRadius: 1 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Skeleton variant="text" width={60} height={24} />
            <Skeleton variant="rectangular" width={180} height={40} sx={{ borderRadius: 1 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Skeleton variant="text" width={60} height={24} />
            <Skeleton variant="rectangular" width={180} height={40} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>
      </Paper>
      
      {/* Media Gallery */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, margin: -1.5 }}>
        {Array(12).fill(0).map((_, index) => (
          <Box 
            key={index} 
            sx={{ 
              width: { 
                xs: 'calc(100% - 24px)', 
                sm: 'calc(50% - 24px)', 
                md: 'calc(33.33% - 24px)', 
                lg: 'calc(25% - 24px)' 
              },
              margin: 1.5
            }}
          >
            <Card sx={{ height: '100%' }}>
              <Skeleton 
                variant="rectangular" 
                height={180} 
                width="100%" 
                sx={{ display: 'block' }}
              />
              <CardContent>
                <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Skeleton variant="text" width="40%" height={20} />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="circular" width={24} height={24} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
      
      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Skeleton variant="rectangular" width={300} height={36} sx={{ borderRadius: 1 }} />
      </Box>
    </Container>
  );
} 
import React from 'react';
import { 
  Box, 
  Container, 
  Skeleton, 
  Paper, 
  Divider
} from '@mui/material';

export default function AnalyticsLoading() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="180px" height={40} />
        <Skeleton variant="text" width="400px" height={24} />
      </Box>
      
      {/* Analytics Overview Skeleton */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5, mb: 4 }}>
        {[1, 2, 3, 4].map((_, index) => (
          <Box 
            key={index} 
            sx={{ 
              width: { xs: '100%', sm: '50%', md: '25%' }, 
              p: 1.5 
            }}
          >
            <Paper sx={{ p: 2 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={38} sx={{ my: 1 }} />
              <Skeleton variant="text" width="90%" height={20} />
            </Paper>
          </Box>
        ))}
      </Box>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -2 }}>
        {/* Left Column */}
        <Box sx={{ width: { xs: '100%', lg: '66.66%' }, p: 2 }}>
          {/* Engagement Graph Skeleton */}
          <Paper sx={{ p: 3, mb: 4, height: '320px' }}>
            <Skeleton variant="text" width="180px" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={240} />
          </Paper>
          
          {/* Performance Metrics Skeleton */}
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width="200px" height={32} sx={{ mb: 1 }} />
            <Divider sx={{ mb: 2 }} />
            
            {/* Metrics table skeleton */}
            <Box>
              {[1, 2, 3, 4, 5].map((_, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    mb: 2, 
                    py: 1,
                    borderBottom: index < 4 ? '1px solid #eee' : 'none'
                  }}
                >
                  <Skeleton variant="text" width="35%" height={24} />
                  <Skeleton variant="text" width="15%" height={24} />
                  <Skeleton variant="text" width="15%" height={24} />
                  <Skeleton variant="text" width="20%" height={24} />
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
        
        {/* Right Column */}
        <Box sx={{ width: { xs: '100%', lg: '33.33%' }, p: 2 }}>
          {/* Platform Comparison Skeleton */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Skeleton variant="text" width="160px" height={32} sx={{ mb: 1 }} />
            <Divider sx={{ mb: 2 }} />
            
            {[1, 2, 3].map((_, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Skeleton variant="text" width="120px" height={24} />
                  <Skeleton variant="text" width="40px" height={24} />
                </Box>
                <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 4, mb: 0.5 }} />
              </Box>
            ))}
          </Paper>
          
          {/* Audience Metrics Skeleton */}
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width="160px" height={32} sx={{ mb: 1 }} />
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton variant="rectangular" height={120} />
              <Skeleton variant="rectangular" height={120} />
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
} 
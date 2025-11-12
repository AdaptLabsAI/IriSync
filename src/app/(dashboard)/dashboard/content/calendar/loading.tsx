import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  Divider,
  Skeleton
} from '@mui/material';

export default function CalendarLoading() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="250px" height={40} />
        <Skeleton variant="text" width="400px" height={24} />
      </Box>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
        {/* Left sidebar - Upcoming posts skeleton */}
        <Box sx={{ width: { xs: '100%', md: '25%' }, p: 1.5 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Skeleton variant="text" width="150px" height={32} sx={{ mb: 2 }} />
            <Divider sx={{ mb: 2 }} />
            
            {/* Upcoming posts list skeleton */}
            {[1, 2, 3, 4, 5].map((_, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Skeleton variant="text" width="80%" height={24} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Skeleton variant="text" width="40%" height={20} />
                  <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
                </Box>
                {index < 4 && <Divider sx={{ my: 2 }} />}
              </Box>
            ))}
          </Paper>
        </Box>
        
        {/* Main calendar view skeleton */}
        <Box sx={{ width: { xs: '100%', md: '75%' }, p: 1.5 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            {/* Calendar header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton variant="text" width="200px" height={32} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
              </Box>
            </Box>
            
            {/* Calendar grid */}
            <Box>
              {/* Days of week */}
              <Box sx={{ display: 'flex', mb: 1 }}>
                {Array(7).fill(0).map((_, i) => (
                  <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
                    <Skeleton variant="text" width="50%" height={24} sx={{ mx: 'auto' }} />
                  </Box>
                ))}
              </Box>
              
              {/* Calendar days */}
              {Array(5).fill(0).map((_, weekIndex) => (
                <Box key={weekIndex} sx={{ display: 'flex', mb: 1 }}>
                  {Array(7).fill(0).map((_, dayIndex) => (
                    <Box 
                      key={dayIndex} 
                      sx={{ 
                        flex: 1,
                        height: 120, 
                        border: '1px solid', 
                        borderColor: 'grey.200',
                        p: 1
                      }}
                    >
                      <Skeleton variant="text" width="24px" height={20} />
                      {/* Random posts in calendar */}
                      {Math.random() > 0.7 && (
                        <Skeleton 
                          variant="rectangular" 
                          width="100%" 
                          height={24} 
                          sx={{ mt: 1, borderRadius: 0.5 }} 
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
} 
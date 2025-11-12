import React from 'react';
import { 
  Box, 
  Container, 
  Skeleton, 
  Card, 
  CardContent,
  CardHeader,
  Divider
} from '@mui/material';

export default function DashboardLoading() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="250px" height={40} />
        <Skeleton variant="text" width="400px" height={24} />
      </Box>
      
      {/* Key Metrics Skeleton */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {[1, 2, 3, 4].map((_, index) => (
          <Box key={index} sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '250px' }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="40%" height={42} sx={{ my: 1 }} />
                <Skeleton variant="text" width="90%" height={24} />
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mt: 2 }}>
        {/* Left Column */}
        <Box sx={{ flex: '1 1 calc(66.666% - 16px)', minWidth: '300px' }}>
          {/* Upcoming Posts Skeleton */}
          <Card sx={{ mb: 4 }}>
            <CardHeader 
              title={<Skeleton variant="text" width="120px" height={32} />}
            />
            <Divider />
            <CardContent>
              {[1, 2, 3].map((_, index) => (
                <Box key={index} sx={{ mb: 3 }}>
                  {index > 0 && <Divider sx={{ my: 2 }} />}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Skeleton variant="text" width="180px" height={28} />
                      <Skeleton variant="text" width="160px" height={20} />
                    </Box>
                    <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                  </Box>
                </Box>
              ))}
              <Box sx={{ mt: 2 }}>
                <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
              </Box>
            </CardContent>
          </Card>
          
          {/* Content Performance Skeleton */}
          <Card>
            <CardHeader 
              title={<Skeleton variant="text" width="180px" height={32} />}
            />
            <Divider />
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {[1, 2, 3].map((_, index) => (
                  <Box key={index} sx={{ flex: '1 1 calc(33.333% - 8px)', minWidth: '200px' }}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <Skeleton variant="rectangular" height={140} />
                      <CardContent>
                        <Skeleton variant="text" height={24} sx={{ mb: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Skeleton variant="text" width="28%" height={32} />
                          <Skeleton variant="text" width="28%" height={32} />
                          <Skeleton variant="text" width="28%" height={32} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        {/* Right Column */}
        <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '300px' }}>
          {/* Platform Overview Skeleton */}
          <Card>
            <CardHeader 
              title={<Skeleton variant="text" width="160px" height={32} />}
            />
            <Divider />
            <CardContent>
              {[1, 2, 3].map((_, index) => (
                <Box key={index}>
                  {index > 0 && <Divider sx={{ my: 2 }} />}
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Skeleton variant="text" width="100px" height={24} />
                      <Skeleton variant="text" width="70px" height={24} />
                    </Box>
                    <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 1 }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Skeleton variant="text" width="60px" height={20} />
                    <Skeleton variant="text" width="40px" height={20} />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
} 
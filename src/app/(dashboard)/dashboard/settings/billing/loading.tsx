import React from 'react';
import { 
  Box, 
  Container, 
  Skeleton, 
  Paper, 
  Divider,
  Grid,
  Card,
  CardContent
} from '@mui/material';

export default function BillingSettingsLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="250px" height={40} />
        <Skeleton variant="text" width="400px" height={24} />
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        {/* Current plan */}
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width="200px" height={32} sx={{ mb: 2 }} />
          <Card variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Skeleton variant="text" width="160px" height={28} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="240px" height={20} />
              </Box>
              <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
            </Box>
          </Card>
        </Box>
        
        <Divider sx={{ my: 4 }} />
        
        {/* Payment method */}
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width="180px" height={32} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            <Box sx={{ width: { xs: '100%', md: '50%' } }}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Skeleton variant="rectangular" width={40} height={30} sx={{ mr: 2, borderRadius: 1 }} />
                  <Skeleton variant="text" width="180px" height={24} />
                </Box>
                <Skeleton variant="text" width="120px" height={20} />
              </Card>
            </Box>
            <Box sx={{ width: { xs: '100%', md: '50%' } }}>
              <Card variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Skeleton variant="rectangular" width={180} height={40} sx={{ borderRadius: 1 }} />
              </Card>
            </Box>
          </Box>
        </Box>
        
        <Divider sx={{ my: 4 }} />
        
        {/* Billing history */}
        <Box>
          <Skeleton variant="text" width="180px" height={32} sx={{ mb: 3 }} />
          
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton variant="text" width="100px" height={24} />
            <Skeleton variant="text" width="100px" height={24} />
            <Skeleton variant="text" width="100px" height={24} />
            <Skeleton variant="text" width="100px" height={24} />
          </Box>
          
          {Array(3).fill(0).map((_, index) => (
            <Box key={index} sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              py: 2,
              borderBottom: index < 2 ? 1 : 0,
              borderColor: 'divider'
            }}>
              <Skeleton variant="text" width="150px" height={24} />
              <Skeleton variant="text" width="100px" height={24} />
              <Skeleton variant="text" width="80px" height={24} />
              <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
            </Box>
          ))}
        </Box>
      </Paper>
    </Container>
  );
} 
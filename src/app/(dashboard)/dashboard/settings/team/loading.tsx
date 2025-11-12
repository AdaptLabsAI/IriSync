import React from 'react';
import { 
  Box, 
  Container, 
  Skeleton, 
  Paper, 
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Card
} from '@mui/material';

export default function TeamSettingsLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="220px" height={40} />
        <Skeleton variant="text" width="400px" height={24} />
      </Box>
      
      {/* Team stats cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {Array(3).fill(0).map((_, index) => (
          <Box key={index} sx={{ width: { xs: '100%', md: '33.33%' } }}>
            <Card variant="outlined" sx={{ p: 3 }}>
              <Skeleton variant="text" width="120px" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="80px" height={40} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="180px" height={18} />
            </Card>
          </Box>
        ))}
      </Box>
      
      {/* Team members section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="text" width="180px" height={32} />
          <Skeleton variant="rectangular" width={160} height={40} sx={{ borderRadius: 1 }} />
        </Box>
        
        {/* Search and filter */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Skeleton variant="rectangular" width={240} height={40} sx={{ borderRadius: 1 }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>
        
        {/* Team members table */}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><Skeleton variant="text" width="120px" height={24} /></TableCell>
              <TableCell><Skeleton variant="text" width="120px" height={24} /></TableCell>
              <TableCell><Skeleton variant="text" width="120px" height={24} /></TableCell>
              <TableCell><Skeleton variant="text" width="120px" height={24} /></TableCell>
              <TableCell><Skeleton variant="text" width="120px" height={24} /></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array(5).fill(0).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                    <Box>
                      <Skeleton variant="text" width="120px" height={24} />
                      <Skeleton variant="text" width="180px" height={18} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell><Skeleton variant="text" width="120px" height={24} /></TableCell>
                <TableCell><Skeleton variant="text" width="120px" height={24} /></TableCell>
                <TableCell><Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 16 }} /></TableCell>
                <TableCell>
                  <Skeleton variant="circular" width={32} height={32} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Skeleton variant="rectangular" width={240} height={36} sx={{ borderRadius: 1 }} />
        </Box>
      </Paper>
      
      {/* Invitations section */}
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width="180px" height={32} sx={{ mb: 3 }} />
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            <Box sx={{ width: { xs: '100%', md: '80%' } }}>
              <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1, width: '100%' }} />
            </Box>
            <Box sx={{ width: { xs: '100%', md: '20%' } }}>
              <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1, width: '100%' }} />
            </Box>
          </Box>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Pending invitations */}
        <Skeleton variant="text" width="220px" height={24} sx={{ mb: 2 }} />
        {Array(2).fill(0).map((_, index) => (
          <Box 
            key={index}
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              py: 2,
              borderBottom: index < 1 ? 1 : 0,
              borderColor: 'divider'
            }}
          >
            <Box>
              <Skeleton variant="text" width="180px" height={24} />
              <Skeleton variant="text" width="120px" height={18} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
            </Box>
          </Box>
        ))}
      </Paper>
    </Container>
  );
} 
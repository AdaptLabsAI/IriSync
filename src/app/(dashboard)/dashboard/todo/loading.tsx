import React from 'react';
import { 
  Box, 
  Container, 
  Skeleton, 
  Paper, 
  Divider,
  List,
  ListItem
} from '@mui/material';

export default function TodoLoading() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="180px" height={40} />
        <Skeleton variant="text" width="300px" height={24} />
      </Box>
      
      {/* Todo controls */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton variant="rectangular" width={200} height={40} sx={{ borderRadius: 1 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton variant="rectangular" width={100} height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={100} height={40} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>
      
      {/* Todo list */}
      <Paper elevation={2}>
        {/* Tabs/Categories */}
        <Box sx={{ p: 2, display: 'flex', borderBottom: 1, borderColor: 'divider', gap: 2 }}>
          <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1 }} />
        </Box>
        
        {/* Todo items */}
        <List>
          {Array(7).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              <ListItem sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <Skeleton variant="circular" width={24} height={24} sx={{ mr: 2 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="70%" height={24} />
                    <Skeleton variant="text" width="50%" height={18} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Skeleton variant="rectangular" width={70} height={28} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                  </Box>
                </Box>
              </ListItem>
              {index < 6 && <Divider />}
            </React.Fragment>
          ))}
        </List>
        
        {/* Pagination */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider' }}>
          <Skeleton variant="text" width={100} height={24} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="circular" width={32} height={32} />
          </Box>
        </Box>
      </Paper>
    </Container>
  );
} 
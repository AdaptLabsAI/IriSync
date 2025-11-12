import React from 'react';
import { 
  Box, 
  Container, 
  Skeleton, 
  Grid, 
  Paper, 
  Divider,
  List,
  ListItem
} from '@mui/material';

export default function ContentInboxLoading() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="250px" height={40} />
        <Skeleton variant="text" width="400px" height={24} />
      </Box>
      
      {/* Search and filters */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Skeleton variant="rectangular" width={240} height={40} sx={{ borderRadius: 1 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Sidebar - Message list */}
        <Box sx={{ width: { xs: '100%', md: '33.3%', lg: '25%' } }}>
          <Paper sx={{ height: '75vh', overflow: 'hidden' }}>
            {/* Tabs */}
            <Box sx={{ p: 2, display: 'flex', borderBottom: 1, borderColor: 'divider' }}>
              <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1, mr: 2 }} />
              <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1 }} />
            </Box>
            
            {/* Message list */}
            <List sx={{ height: 'calc(100% - 58px)', overflow: 'auto', px: 1 }}>
              {Array(8).fill(0).map((_, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ px: 2, py: 1.5 }}>
                    <Box sx={{ display: 'flex', width: '100%' }}>
                      {/* Avatar */}
                      <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
                      
                      {/* Message content */}
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Skeleton variant="text" width="50%" height={20} />
                          <Skeleton variant="text" width="25%" height={20} />
                        </Box>
                        <Skeleton variant="text" width="80%" height={20} />
                        <Skeleton variant="text" width="70%" height={20} />
                      </Box>
                    </Box>
                  </ListItem>
                  {index < 7 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
        
        {/* Main content - Message detail */}
        <Box sx={{ width: { xs: '100%', md: '66.7%', lg: '75%' } }}>
          <Paper sx={{ height: '75vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Message header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                  <Skeleton variant="text" width={180} height={24} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="circular" width={32} height={32} />
                </Box>
              </Box>
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
            
            {/* Message thread */}
            <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
              {Array(4).fill(0).map((_, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    mb: 4, 
                    display: 'flex',
                    flexDirection: index % 2 === 0 ? 'row' : 'row-reverse'
                  }}
                >
                  <Skeleton 
                    variant="circular" 
                    width={40} 
                    height={40} 
                    sx={{ mx: 2, alignSelf: 'flex-start' }} 
                  />
                  <Box 
                    sx={{ 
                      maxWidth: '60%',
                      p: 2, 
                      borderRadius: 2,
                      bgcolor: index % 2 === 0 ? 'grey.100' : 'primary.lighter'
                    }}
                  >
                    <Skeleton variant="text" width="100%" height={20} />
                    <Skeleton variant="text" width="90%" height={20} />
                    <Skeleton variant="text" width="70%" height={20} />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Skeleton variant="text" width="30%" height={16} />
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
            
            {/* Message input */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ position: 'relative' }}>
                <Skeleton 
                  variant="rectangular" 
                  height={100} 
                  sx={{ borderRadius: 1, width: '100%' }} 
                />
                <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 1 }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 16 }} />
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
} 
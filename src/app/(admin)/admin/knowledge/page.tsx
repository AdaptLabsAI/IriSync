'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  InputAdornment,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import ArchiveIcon from '@mui/icons-material/Archive';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import AdminGuard from '@/components/admin/AdminGuard';
import useApi from '@/hooks/useApi';

// Define the knowledge item type based on the API model
interface KnowledgeItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  status: string;
  slug: string;
  accessLevel: string;
  contentType: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface KnowledgeResponse {
  items: KnowledgeItem[];
  totalCount: number;
  hasMore: boolean;
}

export default function AdminKnowledgePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<KnowledgeItem[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [actionItem, setActionItem] = useState<KnowledgeItem | null>(null);
  
  // Use the API hook to fetch knowledge items
  const { 
    data, 
    isLoading, 
    error, 
    refetch,
    patch
  } = useApi<KnowledgeResponse>('/api/admin/knowledge', {
    params: {
      limit: 50,
      sortField: 'updatedAt',
      sortOrder: 'desc'
    }
  });
  
  // Update filtered items when data or search query changes
  useEffect(() => {
    if (data?.items) {
      if (!searchQuery) {
        setFilteredItems(data.items);
      } else {
        const query = searchQuery.toLowerCase();
        setFilteredItems(
          data.items.filter(item => 
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query) ||
            item.tags.some(tag => tag.toLowerCase().includes(query))
          )
        );
      }
    }
  }, [data, searchQuery]);
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  const handleCreateKnowledge = () => {
    router.push('/admin/knowledge/new');
  };
  
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, item: KnowledgeItem) => {
    setAnchorEl(event.currentTarget);
    setActionItem(item);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActionItem(null);
  };
  
  const handleEdit = (id: string) => {
    handleCloseMenu();
    router.push(`/admin/knowledge/${id}`);
  };
  
  const handleView = (slug: string) => {
    handleCloseMenu();
    // Open in a new tab
    window.open(`/knowledge/${slug}`, '_blank');
  };
  
  const handleUpdateStatus = async (id: string, status: string) => {
    handleCloseMenu();
    try {
      await patch({ status }, { url: `/api/admin/knowledge/${id}` });
      refetch();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'error';
      default:
        return 'default';
    }
  };
  
  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'public':
        return 'success';
      case 'registered':
        return 'info';
      case 'paid':
        return 'primary';
      case 'influencer':
        return 'secondary';
      case 'enterprise':
        return 'error';
      default:
        return 'default';
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ py: 10, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography sx={{ mt: 2 }}>Loading knowledge base content...</Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ py: 4 }}>
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Retry
              </Button>
            }
          >
            Error loading data: {error.message || 'Failed to load knowledge base content'}
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              API: /api/admin/knowledge
            </Typography>
          </Alert>
          
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No content available
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Try refreshing the page or check your connection.
            </Typography>
            <Button variant="outlined" onClick={() => refetch()}>
              Refresh
            </Button>
          </Paper>
        </Box>
      );
    }

    if (!data?.items?.length) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No knowledge base articles found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Get started by creating your first article
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleCreateKnowledge}
          >
            Create Article
          </Button>
        </Paper>
      );
    }

    return (
      <Paper>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Access Level</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Box sx={{ maxWidth: 400 }}>
                      <Typography variant="body1" fontWeight={500} noWrap>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                        {item.description}
                      </Typography>
                      {item.tags && item.tags.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {item.tags.slice(0, 3).map((tag) => (
                            <Chip 
                              key={tag} 
                              label={tag} 
                              size="small" 
                              sx={{ height: 20, fontSize: '0.7rem' }} 
                            />
                          ))}
                          {item.tags.length > 3 && (
                            <Chip 
                              label={`+${item.tags.length - 3}`} 
                              size="small" 
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }} 
                            />
                          )}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    <Chip 
                      label={item.status} 
                      size="small" 
                      color={getStatusColor(item.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={item.accessLevel} 
                      size="small" 
                      color={getAccessLevelColor(item.accessLevel) as any}
                    />
                  </TableCell>
                  <TableCell>{formatDate(item.updatedAt)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEdit(item.id)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton 
                        size="small" 
                        aria-label="more"
                        onClick={(e) => handleOpenMenu(e, item)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  return (
    <AdminGuard>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">Knowledge Base Management</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Create and manage knowledge base articles and documentation
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <TextField
          placeholder="Search knowledge base..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => router.push('/admin/knowledge-base')}
          >
            Manage Knowledge Base
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateKnowledge}
          >
            Create Article
          </Button>
        </Box>
      </Box>
      
      {renderContent()}
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        {actionItem && (
          <>
            <MenuItem onClick={() => handleEdit(actionItem.id)}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            
            {actionItem.status === 'published' && (
              <MenuItem onClick={() => handleView(actionItem.slug)}>
                <ListItemIcon>
                  <VisibilityIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>View</ListItemText>
              </MenuItem>
            )}
            
            {actionItem.status === 'draft' && (
              <MenuItem onClick={() => handleUpdateStatus(actionItem.id, 'published')}>
                <ListItemIcon>
                  <PublishIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Publish</ListItemText>
              </MenuItem>
            )}
            
            {actionItem.status === 'published' && (
              <MenuItem onClick={() => handleUpdateStatus(actionItem.id, 'draft')}>
                <ListItemIcon>
                  <UnpublishedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Unpublish</ListItemText>
              </MenuItem>
            )}
            
            {actionItem.status !== 'archived' && (
              <MenuItem onClick={() => handleUpdateStatus(actionItem.id, 'archived')}>
                <ListItemIcon>
                  <ArchiveIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Archive</ListItemText>
              </MenuItem>
            )}
            
            <MenuItem onClick={handleCloseMenu} sx={{ color: 'error.main' }}>
              <ListItemIcon sx={{ color: 'error.main' }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </AdminGuard>
  );
} 
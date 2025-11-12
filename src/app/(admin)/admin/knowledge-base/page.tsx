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
  Tooltip,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent
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
import { 
  KnowledgeContentType, 
  KnowledgeStatus, 
  KnowledgeAccessLevel 
} from '@/lib/features/knowledge/models';

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
  pagination: {
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
    lastDocId?: string;
  };
}

export default function AdminKnowledgeBasePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<KnowledgeItem[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [actionItem, setActionItem] = useState<KnowledgeItem | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [accessLevelFilter, setAccessLevelFilter] = useState<string>('');
  
  // Define the API query parameters based on filters
  const queryParams = {
    limit: 50,
    sortField: 'updatedAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    contentType: contentTypeFilter || undefined,
    status: statusFilter || undefined,
    accessLevel: accessLevelFilter || undefined
  };
  
  // Use the API hook to fetch knowledge items
  const { 
    data, 
    isLoading, 
    error, 
    refetch,
    patch,
  } = useApi<KnowledgeResponse>('/api/admin/knowledge', {
    params: queryParams
  });
  
  // Create a separate API hook for delete operations
  const { 
    post: handleDeleteRequest 
  } = useApi<any>('/api/admin/knowledge', {}, false);
  
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
  
  const handleContentTypeFilterChange = (event: SelectChangeEvent) => {
    setContentTypeFilter(event.target.value);
  };
  
  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
  };
  
  const handleAccessLevelFilterChange = (event: SelectChangeEvent) => {
    setAccessLevelFilter(event.target.value);
  };
  
  const handleClearFilters = () => {
    setContentTypeFilter('');
    setStatusFilter('');
    setAccessLevelFilter('');
    setSearchQuery('');
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
  
  const handleDelete = async (id: string) => {
    handleCloseMenu();
    if (window.confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      try {
        await handleDeleteRequest({ ids: [id] }, { method: 'DELETE' });
        refetch();
      } catch (error) {
        console.error('Error deleting article:', error);
      }
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case KnowledgeStatus.PUBLISHED:
        return 'success';
      case KnowledgeStatus.DRAFT:
        return 'warning';
      case KnowledgeStatus.ARCHIVED:
        return 'error';
      default:
        return 'default';
    }
  };
  
  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case KnowledgeContentType.DOCUMENTATION:
        return 'Documentation';
      case KnowledgeContentType.TUTORIAL:
        return 'Tutorial';
      case KnowledgeContentType.FAQ:
        return 'FAQ';
      case KnowledgeContentType.TROUBLESHOOTING:
        return 'Troubleshooting';
      case KnowledgeContentType.GUIDE:
        return 'Guide';
      default:
        return type;
    }
  };
  
  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case KnowledgeAccessLevel.PUBLIC:
        return 'success';
      case KnowledgeAccessLevel.REGISTERED:
        return 'info';
      case KnowledgeAccessLevel.PAID:
        return 'primary';
      case KnowledgeAccessLevel.INFLUENCER:
        return 'secondary';
      case KnowledgeAccessLevel.ENTERPRISE:
        return 'error';
      case KnowledgeAccessLevel.PRIVATE:
        return 'default';
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

    if (!filteredItems?.length) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No knowledge base articles found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {searchQuery || contentTypeFilter || statusFilter || accessLevelFilter
              ? 'Try adjusting your filters or search query'
              : 'Get started by creating your first article'}
          </Typography>
          {searchQuery || contentTypeFilter || statusFilter || accessLevelFilter ? (
            <Button 
              variant="outlined" 
              onClick={handleClearFilters}
              sx={{ mr: 2 }}
            >
              Clear Filters
            </Button>
          ) : null}
          <Button 
            variant="contained" 
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
                <TableCell>Type</TableCell>
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
                    <Box sx={{ maxWidth: 300 }}>
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
                  <TableCell>{getContentTypeLabel(item.contentType)}</TableCell>
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
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, flexGrow: 1 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="content-type-filter-label">Content Type</InputLabel>
            <Select
              labelId="content-type-filter-label"
              id="content-type-filter"
              value={contentTypeFilter}
              label="Content Type"
              onChange={handleContentTypeFilterChange}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value={KnowledgeContentType.DOCUMENTATION}>Documentation</MenuItem>
              <MenuItem value={KnowledgeContentType.TUTORIAL}>Tutorial</MenuItem>
              <MenuItem value={KnowledgeContentType.FAQ}>FAQ</MenuItem>
              <MenuItem value={KnowledgeContentType.TROUBLESHOOTING}>Troubleshooting</MenuItem>
              <MenuItem value={KnowledgeContentType.GUIDE}>Guide</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={statusFilter}
              label="Status"
              onChange={handleStatusFilterChange}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value={KnowledgeStatus.PUBLISHED}>Published</MenuItem>
              <MenuItem value={KnowledgeStatus.DRAFT}>Draft</MenuItem>
              <MenuItem value={KnowledgeStatus.ARCHIVED}>Archived</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="access-level-filter-label">Access Level</InputLabel>
            <Select
              labelId="access-level-filter-label"
              id="access-level-filter"
              value={accessLevelFilter}
              label="Access Level"
              onChange={handleAccessLevelFilterChange}
            >
              <MenuItem value="">All Levels</MenuItem>
              <MenuItem value={KnowledgeAccessLevel.PUBLIC}>Public</MenuItem>
              <MenuItem value={KnowledgeAccessLevel.REGISTERED}>Registered</MenuItem>
              <MenuItem value={KnowledgeAccessLevel.PAID}>Paid</MenuItem>
              <MenuItem value={KnowledgeAccessLevel.INFLUENCER}>Influencer</MenuItem>
              <MenuItem value={KnowledgeAccessLevel.ENTERPRISE}>Enterprise</MenuItem>
              <MenuItem value={KnowledgeAccessLevel.PRIVATE}>Private</MenuItem>
            </Select>
          </FormControl>
          
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
            sx={{ minWidth: 200, flexGrow: 1 }}
          />
          
          {(searchQuery || contentTypeFilter || statusFilter || accessLevelFilter) && (
            <Button 
              variant="outlined"
              onClick={handleClearFilters}
              size="small"
            >
              Clear Filters
            </Button>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, ml: { xs: 0, md: 2 }, mt: { xs: 2, md: 0 } }}>
          <Button
            variant="outlined"
            onClick={() => router.push('/admin/knowledge-base/categories')}
          >
            Manage Categories
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
            
            {actionItem.status === KnowledgeStatus.PUBLISHED && (
              <MenuItem onClick={() => handleView(actionItem.slug)}>
                <ListItemIcon>
                  <VisibilityIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>View</ListItemText>
              </MenuItem>
            )}
            
            {actionItem.status === KnowledgeStatus.DRAFT && (
              <MenuItem onClick={() => handleUpdateStatus(actionItem.id, KnowledgeStatus.PUBLISHED)}>
                <ListItemIcon>
                  <PublishIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Publish</ListItemText>
              </MenuItem>
            )}
            
            {actionItem.status === KnowledgeStatus.PUBLISHED && (
              <MenuItem onClick={() => handleUpdateStatus(actionItem.id, KnowledgeStatus.DRAFT)}>
                <ListItemIcon>
                  <UnpublishedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Unpublish</ListItemText>
              </MenuItem>
            )}
            
            {actionItem.status !== KnowledgeStatus.ARCHIVED && (
              <MenuItem onClick={() => handleUpdateStatus(actionItem.id, KnowledgeStatus.ARCHIVED)}>
                <ListItemIcon>
                  <ArchiveIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Archive</ListItemText>
              </MenuItem>
            )}
            
            <MenuItem onClick={() => handleDelete(actionItem.id)} sx={{ color: 'error.main' }}>
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
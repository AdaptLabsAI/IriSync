'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Select,
  MenuItem,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  LinearProgress,
  Pagination,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  KnowledgeContentType,
  KnowledgeStatus,
  KnowledgeAccessLevel
} from '@/lib/features/knowledge/models';
import AdminLayout from '@/components/layouts/AdminLayout';
import Grid from '@/components/ui/grid';

interface DocItem {
  id: string;
  title: string;
  contentType: string;
  category: string;
  status: string;
  accessLevel: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  excerpt?: string;
}

interface Category {
  name: string;
  count: number;
}

const AdminDocumentationPage = () => {
  const router = useRouter();
  
  // State
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<DocItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [accessLevelFilter, setAccessLevelFilter] = useState<string>('');
  
  // Fetch documentation data
  const fetchDocs = async () => {
    try {
      setLoading(true);
      
      // Build query params for API request
      const params = new URLSearchParams();
      params.append('contentType', KnowledgeContentType.DOCUMENTATION);
      
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (accessLevelFilter) params.append('accessLevel', accessLevelFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      params.append('page', page.toString());
      params.append('limit', '10');
      
      // Fetch documentation
      const response = await fetch(`/api/admin/knowledge?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch documentation');
      }
      
      const data = await response.json();
      
      setDocs(data.items);
      setFilteredDocs(data.items);
      setTotalPages(Math.ceil(data.total / 10));
      
      // Update URL with filters
      const url = new URL(window.location.href);
      url.searchParams.set('category', categoryFilter || '');
      url.searchParams.set('status', statusFilter || '');
      url.searchParams.set('accessLevel', accessLevelFilter || '');
      url.searchParams.set('page', page.toString());
      url.searchParams.set('search', searchQuery || '');
      window.history.replaceState({}, '', url.toString());
      
    } catch (error) {
      console.error('Error fetching documentation:', error);
      toast.error({
        title: 'Error',
        description: 'Failed to fetch documentation. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/knowledge/categories');
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error({
        title: 'Error',
        description: 'Failed to fetch categories. Please try again.'
      });
    }
  };
  
  // Effect to load data
  useEffect(() => {
    fetchDocs();
    fetchCategories();
    
    // Load filters from URL on initial mount
    const url = new URL(window.location.href);
    const categoryParam = url.searchParams.get('category');
    const statusParam = url.searchParams.get('status');
    const accessParam = url.searchParams.get('accessLevel');
    const pageParam = url.searchParams.get('page');
    const searchParam = url.searchParams.get('search');
    
    if (categoryParam) setCategoryFilter(categoryParam);
    if (statusParam) setStatusFilter(statusParam);
    if (accessParam) setAccessLevelFilter(accessParam);
    if (pageParam) setPage(parseInt(pageParam, 10) || 1);
    if (searchParam) setSearchQuery(searchParam);
  }, [categoryFilter, statusFilter, accessLevelFilter, page, searchQuery]);
  
  // Handle delete doc
  const handleDelete = async (docId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/knowledge/${docId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete documentation');
      }
      
      toast.success({
        title: 'Success',
        description: 'Documentation deleted successfully'
      });
      
      setDeleteDialogOpen(false);
      fetchDocs(); // Refresh list
    } catch (error) {
      console.error('Error deleting documentation:', error);
      toast.error({
        title: 'Error',
        description: 'Failed to delete documentation. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle create doc
  const handleCreateDoc = () => {
    router.push('/admin/documentation/create');
  };
  
  // Handle edit doc
  const handleEditDoc = (docId: string) => {
    router.push(`/admin/documentation/edit/${docId}`);
  };
  
  // Handle view doc
  const handleViewDoc = (slug: string) => {
    window.open(`/documentation/${slug}`, '_blank');
  };
  
  // Handle search
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    fetchDocs();
  };
  
  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  // Get status badge color
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
  
  // Get access level label
  const getAccessLevelLabel = (level: string) => {
    switch (level) {
      case KnowledgeAccessLevel.PUBLIC:
        return 'Public';
      case KnowledgeAccessLevel.REGISTERED:
        return 'Registered';
      case KnowledgeAccessLevel.PAID:
        return 'Paid';
      case KnowledgeAccessLevel.INFLUENCER:
        return 'Influencer';
      case KnowledgeAccessLevel.ENTERPRISE:
        return 'Enterprise';
      case KnowledgeAccessLevel.PRIVATE:
        return 'Private';
      default:
        return level;
    }
  };
  
  return (
    <AdminLayout>
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Documentation Management
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleCreateDoc}
          >
            Add Documentation
          </Button>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage documentation pages, categories, and publishing status.
        </Typography>
        
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <form onSubmit={handleSearch}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="category-filter-label">Category</InputLabel>
                  <Select
                    labelId="category-filter-label"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.name} value={category.name}>
                        {category.name} ({category.count})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="status-filter-label">Status</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value={KnowledgeStatus.DRAFT}>Draft</MenuItem>
                    <MenuItem value={KnowledgeStatus.PUBLISHED}>Published</MenuItem>
                    <MenuItem value={KnowledgeStatus.ARCHIVED}>Archived</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="access-filter-label">Access Level</InputLabel>
                  <Select
                    labelId="access-filter-label"
                    value={accessLevelFilter}
                    onChange={(e) => setAccessLevelFilter(e.target.value)}
                    label="Access Level"
                  >
                    <MenuItem value="">All Access Levels</MenuItem>
                    <MenuItem value={KnowledgeAccessLevel.PUBLIC}>Public</MenuItem>
                    <MenuItem value={KnowledgeAccessLevel.REGISTERED}>Registered</MenuItem>
                    <MenuItem value={KnowledgeAccessLevel.PAID}>Paid</MenuItem>
                    <MenuItem value={KnowledgeAccessLevel.INFLUENCER}>Influencer</MenuItem>
                    <MenuItem value={KnowledgeAccessLevel.ENTERPRISE}>Enterprise</MenuItem>
                    <MenuItem value={KnowledgeAccessLevel.PRIVATE}>Private</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  placeholder="Search by title or content"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <IconButton type="submit" edge="end">
                        <SearchIcon />
                      </IconButton>
                    ),
                  }}
                  size="small"
                />
              </Grid>
            </Grid>
          </form>
        </Paper>
        
        {/* Loading indicator */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {/* Docs Table */}
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Access Level</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell width="180">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocs.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No documentation found. Try adjusting your filters or create a new document.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {doc.title}
                      </Typography>
                      {doc.excerpt && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {doc.excerpt.substring(0, 100)}...
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{doc.category}</TableCell>
                    <TableCell>
                      <Chip 
                        label={doc.status} 
                        size="small" 
                        color={getStatusColor(doc.status) as any}
                      />
                    </TableCell>
                    <TableCell>{getAccessLevelLabel(doc.accessLevel)}</TableCell>
                    <TableCell>
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        color="primary" 
                        size="small"
                        onClick={() => handleViewDoc(doc.slug)}
                        title="View"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        color="primary" 
                        size="small"
                        onClick={() => handleEditDoc(doc.id)}
                        title="Edit"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        size="small"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </Paper>
        
        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Documentation</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete &quot;{selectedDoc?.title}&quot;? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialogOpen(false)} 
              color="primary"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedDoc && handleDelete(selectedDoc.id)} 
              color="error"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : undefined}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default AdminDocumentationPage; 
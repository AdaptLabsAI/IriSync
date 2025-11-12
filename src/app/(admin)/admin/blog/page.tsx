'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Tabs, 
  Tab, 
  TextField,
  InputAdornment,
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
  CircularProgress,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  ListItemIcon,
  ListItemText,
  Select
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import CommentIcon from '@mui/icons-material/Comment';
import ShareIcon from '@mui/icons-material/Share';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import ArchiveIcon from '@mui/icons-material/Archive';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import AdminGuard from '@/components/admin/AdminGuard';
import useApi from '@/hooks/useApi';
import { BlogPost, BlogPostStatus } from '@/lib/features/blog/models';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`blog-tabpanel-${index}`}
      aria-labelledby={`blog-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `blog-tab-${index}`,
    'aria-controls': `blog-tabpanel-${index}`,
  };
}

interface BlogPostsResponse {
  posts: BlogPost[];
  hasMore: boolean;
  lastDoc: any;
}

export default function AdminBlogPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  
  // API hook for fetching blog posts
  const { 
    data, 
    isLoading, 
    error, 
    refetch,
    patch
  } = useApi<BlogPostsResponse>('/api/blog', {
    params: {
      limit: 20,
      sortField: 'updatedAt',
      sortOrder: 'desc',
      status: activeTab === 0 ? '' : activeTab === 1 ? BlogPostStatus.PUBLISHED : BlogPostStatus.DRAFT
    }
  });
  
  // Filter posts when data or search query changes
  useEffect(() => {
    if (data?.posts) {
      if (!searchQuery) {
        setFilteredPosts(data.posts);
      } else {
        const query = searchQuery.toLowerCase();
        setFilteredPosts(
          data.posts.filter(post => 
            post.title.toLowerCase().includes(query) ||
            post.excerpt.toLowerCase().includes(query) ||
            post.tags.some(tag => tag.toLowerCase().includes(query))
          )
        );
      }
    }
  }, [data, searchQuery]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    refetch({
      params: {
        status: newValue === 0 ? '' : newValue === 1 ? BlogPostStatus.PUBLISHED : BlogPostStatus.DRAFT
      }
    });
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  const handleCreatePost = () => {
    router.push('/admin/blog/new');
  };
  
  const handlePostActionClick = (event: React.MouseEvent<HTMLElement>, postId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedPostId(postId);
  };
  
  const handleActionMenuClose = () => {
    setAnchorEl(null);
    setSelectedPostId(null);
  };
  
  const handleEditPost = (id: string) => {
    handleActionMenuClose();
    router.push(`/admin/blog/${id}`);
  };
  
  const handleViewPost = (slug: string) => {
    handleActionMenuClose();
    // Open in a new tab
    window.open(`/blog/${slug}`, '_blank');
  };
  
  const handleDeletePost = async (id: string) => {
    handleActionMenuClose();
    
    try {
      await patch({ status: BlogPostStatus.ARCHIVED }, { 
        url: `/api/blog/${id}`,
        method: 'DELETE'
      });
      
      setSnackbar({
        open: true,
        message: 'Post deleted successfully',
        severity: 'success'
      });
      
      // Refetch posts
      refetch();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete post',
        severity: 'error'
      });
    }
  };
  
  const handleUpdateStatus = async (id: string, status: BlogPostStatus) => {
    handleActionMenuClose();
    
    try {
      await patch({ status }, { 
        url: `/api/blog/${id}`,
        method: 'PATCH'
      });
      
      setSnackbar({
        open: true,
        message: `Post ${status === BlogPostStatus.PUBLISHED ? 'published' : 'unpublished'} successfully`,
        severity: 'success'
      });
      
      // Refetch posts
      refetch();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : `Failed to ${status === BlogPostStatus.PUBLISHED ? 'publish' : 'unpublish'} post`,
        severity: 'error'
      });
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const getSelectedPost = () => {
    return data?.posts.find(post => post.id === selectedPostId) || null;
  };
  
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  const renderPosts = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Alert 
          severity="error" 
          sx={{ my: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => refetch()}
            >
              Retry
            </Button>
          }
        >
          Error loading blog posts: {error.message || 'An unexpected error occurred'}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            API: /api/blog
          </Typography>
        </Alert>
      );
    }
    
    if (!filteredPosts || filteredPosts.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No blog posts found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {searchQuery 
              ? 'Try a different search term' 
              : 'Get started by creating your first blog post'}
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreatePost}
            >
              Create Post
            </Button>
          )}
        </Box>
      );
    }
    
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Published</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPosts.map(post => (
              <TableRow key={post.id}>
                <TableCell>
                  <Box sx={{ maxWidth: 300 }}>
                    <Typography variant="body1" fontWeight={500} noWrap title={post.title}>
                      {post.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                      {post.excerpt}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {post.author.avatar ? (
                      <Avatar src={post.author.avatar} sx={{ width: 30, height: 30, mr: 1 }} />
                    ) : (
                      <Avatar sx={{ width: 30, height: 30, mr: 1 }}>
                        {post.author.name.charAt(0)}
                      </Avatar>
                    )}
                    <Typography variant="body2">{post.author.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={post.status}
                    color={post.status === BlogPostStatus.PUBLISHED ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {post.publishedAt ? (
                    formatDate(post.publishedAt.toString())
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Not published
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 200 }}>
                    {post.tags.slice(0, 3).map(tag => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                    {post.tags.length > 3 && (
                      <Chip 
                        label={`+${post.tags.length - 3}`} 
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditPost(post.id)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handlePostActionClick(e, post.id)}
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
    );
  };

  return (
    <AdminGuard>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Blog Management
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage blog posts, authors, and publishing status.
        </Typography>
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Select displayEmpty value={''} sx={{ minWidth: 160 }}>
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
            <Select displayEmpty value={''} sx={{ minWidth: 160 }}>
              <MenuItem value="">All Authors</MenuItem>
              <MenuItem value="jane">Jane Doe</MenuItem>
              <MenuItem value="john">John Smith</MenuItem>
            </Select>
            <TextField placeholder="Search by title or content" sx={{ minWidth: 240 }} />
            <Button variant="contained">Add Post</Button>
          </Box>
        </Paper>
        {/* Blog Table */}
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Published</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* TODO: Map blog posts here */}
              <TableRow>
                <TableCell>example-id</TableCell>
                <TableCell>How to Grow Your Audience</TableCell>
                <TableCell>Jane Doe</TableCell>
                <TableCell>Published</TableCell>
                <TableCell>2024-06-01</TableCell>
                <TableCell><Button variant="outlined">Edit</Button></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
        {/* TODO: Add post details dialog, add/edit flow, etc. */}
      </Box>
      
      {/* Post action menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionMenuClose}
      >
        {getSelectedPost() && (
          <>
            <MenuItem onClick={() => handleEditPost(getSelectedPost()!.id)}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            
            {getSelectedPost()!.status === BlogPostStatus.PUBLISHED && (
              <MenuItem onClick={() => handleViewPost(getSelectedPost()!.slug)}>
                <ListItemIcon>
                  <VisibilityIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>View</ListItemText>
        </MenuItem>
            )}
            
            {getSelectedPost()!.status === BlogPostStatus.DRAFT && (
              <MenuItem onClick={() => handleUpdateStatus(getSelectedPost()!.id, BlogPostStatus.PUBLISHED)}>
                <ListItemIcon>
                  <PublishIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Publish</ListItemText>
        </MenuItem>
            )}
            
            {getSelectedPost()!.status === BlogPostStatus.PUBLISHED && (
              <MenuItem onClick={() => handleUpdateStatus(getSelectedPost()!.id, BlogPostStatus.DRAFT)}>
                <ListItemIcon>
                  <UnpublishedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Unpublish</ListItemText>
          </MenuItem>
        )}
            
        <Divider />
            
            <MenuItem 
              onClick={() => handleDeletePost(getSelectedPost()!.id)}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'error.main' }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
        </MenuItem>
          </>
        )}
      </Menu>
      
      {/* Status notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AdminGuard>
  );
} 
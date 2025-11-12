'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Menu,
  MenuItem,
  IconButton,
  Stack,
  TextField,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Card,
  CardContent,
  Container,
  Paper,
  CircularProgress,
  Alert,
  SelectChangeEvent,
  ButtonGroup,
  Divider
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '../../../../components/layouts/DashboardLayout';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase/client';

// Define properly typed interfaces
interface ContentPost {
  id: string;
  title: string;
  platform: string;
  status: 'published' | 'scheduled' | 'draft';
  date: string;
  engagement: 'High' | 'Medium' | 'Low' | 'N/A';
  authorName: string;
  authorId: string;
  content: string;
  scheduledFor?: Timestamp;
  publishedAt?: Timestamp;
  updatedAt: Timestamp;
  createdAt: Timestamp;
  aiGenerated?: boolean;
}

interface Author {
  id: string;
  name: string;
}

export default function ContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tabIndex, setTabIndex] = useState(0);
  const [contentPosts, setContentPosts] = useState<ContentPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [authors, setAuthors] = useState<Author[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const open = Boolean(anchorEl);

  // Check for success message from URL params
  useEffect(() => {
    if (searchParams) {
      const created = searchParams.get('created');
      if (created === 'smart') {
        setSuccessMessage('Content created successfully using Smart Creator! 🎉');
        // Clear the URL parameter
        window.history.replaceState({}, '', '/dashboard/content');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchContentData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create query to get content posts from Firestore
        const postsRef = collection(firestore, 'contentPosts');
        let postsQuery = query(
          postsRef,
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(postsQuery);
        
        if (querySnapshot.empty) {
          setContentPosts([]);
          setFilteredPosts([]);
          setLoading(false);
          return;
        }
        
        // Map document data to ContentPost interface
        const posts: ContentPost[] = [];
        const authorsMap = new Map<string, Author>();
        const platformsSet = new Set<string>();
        
        querySnapshot.forEach(doc => {
          const data = doc.data();
          
          // Format dates properly
          const formattedDate = data.publishedAt 
            ? new Date(data.publishedAt.toDate()).toLocaleDateString()
            : data.scheduledFor
              ? new Date(data.scheduledFor.toDate()).toLocaleDateString()
              : new Date(data.createdAt.toDate()).toLocaleDateString();
              
          // Add to platforms set
          if (data.platform) {
            platformsSet.add(data.platform);
          }
          
          // Add to authors map
          if (data.authorId && data.authorName) {
            authorsMap.set(data.authorId, {
              id: data.authorId,
              name: data.authorName
            });
          }
          
          posts.push({
            id: doc.id,
            title: data.title || 'Untitled',
            platform: data.platform || 'Unknown',
            status: data.status || 'draft',
            date: formattedDate,
            engagement: data.engagement || 'N/A',
            authorName: data.authorName || 'Unknown',
            authorId: data.authorId || '',
            content: data.content || '',
            scheduledFor: data.scheduledFor,
            publishedAt: data.publishedAt,
            updatedAt: data.updatedAt,
            createdAt: data.createdAt,
            aiGenerated: data.aiGenerated || false
          });
        });
        
        // Extract unique authors and platforms
        setAuthors(Array.from(authorsMap.values()));
        setPlatforms(Array.from(platformsSet));
        
        // Set posts data
        setContentPosts(posts);
        setFilteredPosts(posts);
      } catch (error) {
        console.error('Error fetching content posts:', error);
        setError(`Failed to load content data. API: /api/content/posts - ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContentData();
  }, []);
  
  // Apply filters whenever tab, search, platform or author selection changes
  useEffect(() => {
    if (contentPosts.length === 0) return;
    
    let result = [...contentPosts];
    
    // Filter by status based on active tab
    if (tabIndex === 1) { // Published
      result = result.filter(post => post.status === 'published');
    } else if (tabIndex === 2) { // Scheduled
      result = result.filter(post => post.status === 'scheduled');
    } else if (tabIndex === 3) { // Drafts
      result = result.filter(post => post.status === 'draft');
    }
    
    // Filter by platform if selected
    if (selectedPlatform) {
      result = result.filter(post => post.platform === selectedPlatform);
    }
    
    // Filter by author if selected
    if (selectedAuthor) {
      result = result.filter(post => post.authorId === selectedAuthor);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(post => 
        post.title.toLowerCase().includes(term) || 
        post.content.toLowerCase().includes(term)
      );
    }
    
    setFilteredPosts(result);
  }, [tabIndex, searchTerm, selectedPlatform, selectedAuthor, contentPosts]);
  
  const getStatusBadge = (status: ContentPost['status']) => {
    switch (status) {
      case 'published':
        return <Chip label="Published" color="success" size="small" />;
      case 'scheduled':
        return <Chip label="Scheduled" color="primary" size="small" />;
      case 'draft':
        return <Chip label="Draft" color="default" size="small" />;
      default:
        return <Chip label="Unknown" size="small" />;
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handlePlatformChange = (event: SelectChangeEvent) => {
    setSelectedPlatform(event.target.value);
  };
  
  const handleAuthorChange = (event: SelectChangeEvent) => {
    setSelectedAuthor(event.target.value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, postId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedPostId(postId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPostId(null);
  };
  
  const handleEditPost = () => {
    if (selectedPostId) {
      router.push(`/dashboard/content/editor?id=${selectedPostId}`);
    }
    handleMenuClose();
  };
  
  const handleViewPost = () => {
    if (selectedPostId) {
      router.push(`/dashboard/content/view?id=${selectedPostId}`);
    }
    handleMenuClose();
  };
  
  const handleCreatePost = () => {
    router.push('/dashboard/content/create');
  };

  const handleSmartCreate = () => {
    router.push('/dashboard/content/smart-create');
  };
  
  if (error) {
    return (
      <DashboardLayout>
        <Alert 
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <Box>
        {/* Success Message */}
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            onClose={() => setSuccessMessage(null)}
          >
            {successMessage}
          </Alert>
        )}

        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 6 
          }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>Content Management</Typography>
            <Typography variant="body1" color="text.secondary">
              Create, schedule, and analyze your social media content
            </Typography>
          </Box>
          
          {/* Enhanced Create Buttons */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              startIcon={<AutoAwesomeIcon />}
              onClick={handleSmartCreate}
              sx={{ 
                background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a67d8 0%, #6b46c1 100%)',
                }
              }}
            >
              ✨ Smart Creator
            </Button>
            
            <Button 
              variant="outlined" 
              color="primary" 
              size="large"
              startIcon={<AddIcon />}
              onClick={handleCreatePost}
            >
              Traditional Create
            </Button>
          </Box>
        </Box>

        {/* Smart Creator Feature Highlight */}
        <Card 
          sx={{ 
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
            }
          }}
          onClick={() => router.push('/dashboard/content/smart-creator')}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                  <AutoAwesomeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Smart Content Creator
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.9 }}>
                  Describe your content idea in natural language and let AI create optimized posts for all your platforms. 
                  Generate engaging content in under 2 minutes!
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Chip 
                    label="AI-Powered" 
                    size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Chip 
                    label="Multi-Platform" 
                    size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Chip 
                    label="2-Min Setup" 
                    size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  sx={{ 
                    bgcolor: 'white',
                    color: '#667eea',
                    fontWeight: 'bold',
                    px: 3,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.9)'
                    }
                  }}
                >
                  Try Smart Creator
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ mb: 6 }}>
          <CardContent>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' }, 
                mb: 4,
                gap: 2
              }}
            >
              <TextField
                placeholder="Search content..."
                size="small"
                sx={{ maxWidth: { md: '320px' } }}
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                sx={{ ml: { md: 'auto' } }}
              >
                <FormControl sx={{ minWidth: 180 }} size="small">
                  <InputLabel>All Platforms</InputLabel>
                  <Select 
                    label="All Platforms"
                    value={selectedPlatform}
                    onChange={handlePlatformChange}
                  >
                    <MenuItem value="">All Platforms</MenuItem>
                    {platforms.map(platform => (
                      <MenuItem key={platform} value={platform}>
                        {platform}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl sx={{ minWidth: 180 }} size="small">
                  <InputLabel>All Authors</InputLabel>
                  <Select 
                    label="All Authors"
                    value={selectedAuthor}
                    onChange={handleAuthorChange}
                  >
                    <MenuItem value="">All Authors</MenuItem>
                    {authors.map(author => (
                      <MenuItem key={author.id} value={author.id}>
                        {author.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabIndex} 
                onChange={handleTabChange} 
                aria-label="content tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label={`All (${contentPosts.length})`} />
                <Tab label={`Published (${contentPosts.filter(p => p.status === 'published').length})`} />
                <Tab label={`Scheduled (${contentPosts.filter(p => p.status === 'scheduled').length})`} />
                <Tab label={`Drafts (${contentPosts.filter(p => p.status === 'draft').length})`} />
              </Tabs>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : filteredPosts.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <AutoAwesomeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No content posts found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {contentPosts.length === 0 
                      ? "Get started by creating your first post with our Smart Creator!"
                      : "No content posts match your current filters."
                    }
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<AutoAwesomeIcon />}
                    onClick={handleSmartCreate}
                    size="large"
                  >
                    Create Your First Post
                  </Button>
                </Box>
              ) : (
                <Paper elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Platform</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Engagement</TableCell>
                        <TableCell>Author</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell width="50px"></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPosts.map(post => (
                        <TableRow key={post.id}>
                          <TableCell sx={{ fontWeight: 500 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {post.aiGenerated && (
                                <AutoAwesomeIcon 
                                  sx={{ fontSize: 16, color: 'primary.main' }} 
                                />
                              )}
                              {post.title}
                            </Box>
                          </TableCell>
                          <TableCell>{post.platform}</TableCell>
                          <TableCell>{getStatusBadge(post.status)}</TableCell>
                          <TableCell>{post.date}</TableCell>
                          <TableCell>
                            {post.engagement !== 'N/A' ? (
                              <Chip 
                                label={post.engagement}
                                color={
                                  post.engagement === 'High' ? 'success' : 
                                  post.engagement === 'Medium' ? 'warning' : 
                                  'error'
                                }
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>{post.authorName}</TableCell>
                          <TableCell>
                            {post.aiGenerated ? (
                              <Chip 
                                label="Smart Creator" 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                                icon={<AutoAwesomeIcon />}
                              />
                            ) : (
                              <Chip 
                                label="Manual" 
                                size="small" 
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={(event) => handleMenuOpen(event, post.id)}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewPost}>View</MenuItem>
        <MenuItem onClick={handleEditPost}>Edit</MenuItem>
        <MenuItem onClick={handleMenuClose}>Delete</MenuItem>
      </Menu>
    </DashboardLayout>
  );
} 
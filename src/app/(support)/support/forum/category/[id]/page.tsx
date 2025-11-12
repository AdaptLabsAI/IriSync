'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemButton,
  Breadcrumbs,
  Link as MuiLink,
  Alert,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ForumIcon from '@mui/icons-material/Forum';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';

// Define forum categories
const FORUM_CATEGORIES = [
  { id: 'general', name: 'General', icon: <ForumIcon />, color: '#00C957' },
  { id: 'help', name: 'Help & Support', icon: <QuestionAnswerIcon />, color: '#6A35D4' },
  { id: 'announcements', name: 'Announcements', icon: <NewReleasesIcon />, color: '#FFA500' },
  { id: 'tips', name: 'Tips & Tricks', icon: <TipsAndUpdatesIcon />, color: '#1E90FF' }
];

// Sample discussions for categories (simulate API response)
const DISCUSSIONS_BY_CATEGORY = {
  'general': [
    {
      id: 'disc-4',
      title: 'Best way to analyze competitor content?',
      category: 'general',
      author: 'Jamie L.',
      replies: 16,
      views: 189,
      lastActive: '3 days ago',
      solved: true
    },
    {
      id: 'disc-7',
      title: 'Suggestion: Add custom tagging for scheduled posts',
      category: 'general',
      author: 'Taylor R.',
      replies: 8,
      views: 67,
      lastActive: '1 hour ago',
      solved: false
    },
    {
      id: 'disc-12',
      title: 'What\'s your content calendar strategy?',
      category: 'general',
      author: 'Morgan B.',
      replies: 14,
      views: 134,
      lastActive: '2 days ago',
      solved: false
    }
  ],
  'help': [
    {
      id: 'disc-2',
      title: 'How to train the AI to match your brand voice?',
      category: 'help',
      author: 'Michael T.',
      replies: 18,
      views: 245,
      lastActive: '4 hours ago',
      solved: false
    },
    {
      id: 'disc-5',
      title: 'Trouble connecting my TikTok account',
      category: 'help',
      author: 'Alex P.',
      replies: 7,
      views: 112,
      lastActive: '5 days ago',
      solved: true
    },
    {
      id: 'disc-6',
      title: 'How to interpret the engagement metrics dashboard?',
      category: 'help',
      author: 'Chris M.',
      replies: 3,
      views: 45,
      lastActive: '30 minutes ago',
      solved: false
    }
  ],
  'announcements': [
    {
      id: 'disc-3',
      title: 'IriSync v2.4 Released with Enhanced Analytics',
      category: 'announcements',
      author: 'IriSync Team',
      replies: 42,
      views: 512,
      lastActive: '1 day ago',
      solved: false
    },
    {
      id: 'disc-15',
      title: 'Upcoming Maintenance: June 15th, 2025',
      category: 'announcements',
      author: 'Support Team',
      replies: 3,
      views: 278,
      lastActive: '1 day ago',
      solved: false
    },
    {
      id: 'disc-16',
      title: 'New Content Templates Available',
      category: 'announcements',
      author: 'Product Team',
      replies: 12,
      views: 345,
      lastActive: '3 days ago',
      solved: false
    }
  ],
  'tips': [
    {
      id: 'disc-1',
      title: 'Best practices for scheduling Instagram posts',
      category: 'tips',
      author: 'Sarah J.',
      replies: 24,
      views: 328,
      lastActive: '2 hours ago',
      solved: true
    },
    {
      id: 'disc-8',
      title: 'How to optimize hashtags across different platforms',
      category: 'tips',
      author: 'Jordan K.',
      replies: 12,
      views: 98,
      lastActive: '2 hours ago',
      solved: false
    },
    {
      id: 'disc-19',
      title: 'Quick AI prompt tricks for better content',
      category: 'tips',
      author: 'Lee H.',
      replies: 18,
      views: 214,
      lastActive: '4 days ago',
      solved: true
    }
  ]
};

export default function ForumCategoryPage({ params }: { params: { id: string } }) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Find current category
  const currentCategory = FORUM_CATEGORIES.find(cat => cat.id === params.id);
  
  useEffect(() => {
    // Simulate API fetch
    const fetchCategoryDiscussions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real application, this would be an API call
        // await fetch(`/api/forum/categories/${params.id}/discussions`)
        
        // For now, use our mock data
        const categoryDiscussions = DISCUSSIONS_BY_CATEGORY[params.id as keyof typeof DISCUSSIONS_BY_CATEGORY] || [];
        setDiscussions(categoryDiscussions);
      } catch (error) {
        console.error(`Error fetching discussions for category ${params.id}:`, error);
        setError('Failed to load discussions for this category');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategoryDiscussions();
  }, [params.id]);
  
  // Filter discussions based on search query
  const filteredDiscussions = discussions.filter(disc => 
    searchQuery === '' || 
    disc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get category color
  const getCategoryColor = () => {
    return currentCategory ? currentCategory.color : theme.palette.primary.main;
  };
  
  // Get category icon
  const getCategoryIcon = () => {
    return currentCategory ? currentCategory.icon : <ForumIcon />;
  };
  
  if (!currentCategory) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          Category not found. The requested forum category does not exist.
        </Alert>
        <Button 
          component={Link} 
          href="/support/forum" 
          startIcon={<ArrowBackIcon />}
          variant="outlined"
        >
          Back to Forum
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header and Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <MuiLink component={Link} href="/support" color="inherit">
            Support
          </MuiLink>
          <MuiLink component={Link} href="/support/forum" color="inherit">
            Forum
          </MuiLink>
          <Typography color="text.primary">{currentCategory.name}</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            color: getCategoryColor(), 
            mr: 2, 
            fontSize: '2rem'
          }}>
            {getCategoryIcon()}
          </Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            {currentCategory.name}
          </Typography>
        </Box>
        
        <Chip 
          label={`${discussions.length} discussions`} 
          size="small"
          sx={{ 
            bgcolor: `${getCategoryColor()}20`,
            color: getCategoryColor(),
          }}
        />
      </Box>
      
      {/* Search and New Discussion */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <TextField
          placeholder="Search discussions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          sx={{ minWidth: { xs: '100%', sm: '180px' } }}
          component={Link}
          href="/support/forum/create"
        >
          New Discussion
        </Button>
      </Box>
      
      {/* Discussions List */}
      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">
            Loading discussions...
          </Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      ) : filteredDiscussions.length > 0 ? (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {filteredDiscussions.map((discussion) => (
            <React.Fragment key={discussion.id}>
              <ListItem 
                alignItems="flex-start" 
                component={Paper} 
                variant="outlined"
                sx={{ 
                  mb: 2, 
                  borderRadius: 1,
                  '&:hover': { 
                    boxShadow: 1,
                    bgcolor: 'rgba(0, 0, 0, 0.01)'
                  }
                }}
              >
                <ListItemButton component={Link} href={`/support/forum/${discussion.id}`}>
                  <Box sx={{ 
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '7fr 5fr' },
                    gap: 2,
                    width: '100%'
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {discussion.solved && (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
                            label="Solved"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                        )}
                      </Box>
                      <Typography 
                        variant="subtitle1" 
                        fontWeight="medium"
                        sx={{ mb: 1 }}
                      >
                        {discussion.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                        <Avatar 
                          alt={discussion.author} 
                          sx={{ width: 24, height: 24, mr: 1, fontSize: '0.8rem' }}
                        >
                          {discussion.author.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          {discussion.author}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                        mt: { xs: 1, sm: 0 },
                        gap: 3
                      }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Replies
                          </Typography>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {discussion.replies}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Views
                          </Typography>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {discussion.views}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Last Active
                          </Typography>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {discussion.lastActive}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </ListItemButton>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      ) : (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">
            No discussions found for your search.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Try adjusting your search terms or be the first to start a discussion.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
            {searchQuery && (
              <Button 
                variant="outlined" 
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            )}
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              component={Link}
              href="/support/forum/create"
            >
              New Discussion
            </Button>
          </Box>
        </Box>
      )}
    </Container>
  );
} 
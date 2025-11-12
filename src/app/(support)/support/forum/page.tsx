'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Breadcrumbs,
  Link as MuiLink,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import Grid from '@/components/ui/grid';
import Link from 'next/link';
import ForumIcon from '@mui/icons-material/Forum';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { useSession } from 'next-auth/react';

// Interface definitions for type safety
interface ForumCategory {
  id: string;
  name: string;
  description: string;
  iconType: string;
  topicCount: number;
  postCount: number;
}

interface ForumDiscussion {
  id: string;
  title: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  categoryId: string;
  categoryName: string;
  replies: number;
  views: number;
  lastActivity: string;
}

interface ForumStats {
  memberCount: number;
  topicCount: number;
  postCount: number;
}

export default function ForumPage() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [discussions, setDiscussions] = useState<ForumDiscussion[]>([]);
  const [stats, setStats] = useState<ForumStats>({
    memberCount: 0,
    topicCount: 0,
    postCount: 0
  });
  const [loading, setLoading] = useState({
    categories: true,
    discussions: true,
    stats: true
  });
  const [error, setError] = useState({
    categories: false,
    discussions: false,
    stats: false
  });

  // Helper function to get appropriate icon based on category type
  const getCategoryIcon = (iconType: string) => {
    switch (iconType) {
      case 'forum':
        return <ForumIcon color="primary" />;
      case 'chat':
        return <ChatIcon color="secondary" />;
      case 'question':
        return <QuestionAnswerIcon sx={{ color: '#4caf50' }} />;
      case 'people':
        return <PeopleIcon sx={{ color: '#ff9800' }} />;
      default:
        return <ForumIcon color="primary" />;
    }
  };

  // Fetch forum categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/forum/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Error fetching forum categories:', err);
        setError(prev => ({ ...prev, categories: true }));
      } finally {
        setLoading(prev => ({ ...prev, categories: false }));
      }
    };

    fetchCategories();
  }, []);

  // Fetch recent discussions
  useEffect(() => {
    const fetchDiscussions = async () => {
      try {
        const response = await fetch('/api/forum/discussions/recent');
        if (!response.ok) {
          throw new Error('Failed to fetch recent discussions');
        }
        const data = await response.json();
        setDiscussions(data.discussions || []);
      } catch (err) {
        console.error('Error fetching recent discussions:', err);
        setError(prev => ({ ...prev, discussions: true }));
      } finally {
        setLoading(prev => ({ ...prev, discussions: false }));
      }
    };

    fetchDiscussions();
  }, []);

  // Fetch forum stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/forum/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch forum stats');
        }
        const data = await response.json();
        setStats(data.stats || {
          memberCount: 0,
          topicCount: 0,
          postCount: 0
        });
      } catch (err) {
        console.error('Error fetching forum stats:', err);
        setError(prev => ({ ...prev, stats: true }));
      } finally {
        setLoading(prev => ({ ...prev, stats: false }));
      }
    };

    fetchStats();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header & Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <MuiLink component={Link} href="/support" color="inherit">
            Support
          </MuiLink>
          <Typography color="text.primary">Community Forum</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h3" component="h1">
            Community Forum
          </Typography>
          {session ? (
            <Button 
              variant="contained" 
              color="primary"
              component={Link}
              href="/support/forum/create"
            >
              Start New Discussion
            </Button>
          ) : (
            <Button 
              variant="outlined" 
              color="primary"
              component={Link}
              href="/login"
            >
              Login to Participate
            </Button>
          )}
        </Box>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Connect with the IriSync community to share insights, ask questions, and learn from others
        </Typography>
      </Box>
      
      {/* Community Stats */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.light', color: 'white' }}>
        {loading.stats ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress color="inherit" size={40} />
          </Box>
        ) : error.stats ? (
          <Alert severity="error" sx={{ bgcolor: 'transparent', color: 'white', borderColor: 'white' }}>
            Unable to load community statistics
          </Alert>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold">{stats.memberCount.toLocaleString()}</Typography>
                <Typography variant="body1">Community Members</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold">{stats.topicCount.toLocaleString()}</Typography>
                <Typography variant="body1">Discussion Topics</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold">{stats.postCount.toLocaleString()}</Typography>
                <Typography variant="body1">Total Posts</Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </Paper>
      
      {/* Categories */}
      <Box mb={6}>
        <Typography variant="h5" component="h2" gutterBottom>
          Forum Categories
        </Typography>
        
        {loading.categories ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error.categories ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Unable to load forum categories. Please try again later.
          </Alert>
        ) : categories.length === 0 ? (
          <Alert severity="info">
            No forum categories are available at this time.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {categories.map((category) => (
              <Grid item xs={12} md={6} key={category.id}>
                <Card 
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  component={Link}
                  href={`/support/forum/category/${category.id}`}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ mr: 2 }}>
                        {getCategoryIcon(category.iconType)}
                      </Box>
                      <Typography variant="h6">
                        {category.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {category.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        {category.topicCount} topics
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {category.postCount} posts
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
      
      {/* Recent Discussions */}
      <Box mb={6}>
        <Typography variant="h5" component="h2" gutterBottom>
          Recent Discussions
        </Typography>
        
        {loading.discussions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error.discussions ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Unable to load recent discussions. Please try again later.
          </Alert>
        ) : discussions.length === 0 ? (
          <Alert severity="info">
            No discussions have been started yet. Be the first to create a topic!
          </Alert>
        ) : (
          <Paper>
            <List sx={{ p: 0 }}>
              {discussions.map((discussion, index) => (
                <React.Fragment key={discussion.id}>
                  <ListItem 
                    component={Link}
                    href={`/support/forum/${discussion.id}`}
                    sx={{ 
                      p: 2,
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        src={discussion.author.avatar}
                        alt={discussion.author.name}
                        sx={{ width: 48, height: 48 }}
                      />
                    </ListItemAvatar>
                    <ListItemText 
                      primary={
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="h6" component="div">
                            {discussion.title}
                          </Typography>
                          <Box sx={{ display: 'flex', mt: 1 }}>
                            <Chip 
                              label={discussion.categoryName} 
                              size="small" 
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              by {discussion.author.name}
                            </Typography>
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Box>
                            <Typography component="span" variant="body2" color="text.secondary">
                              {discussion.replies} replies
                            </Typography>
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ mx: 1 }}>
                              •
                            </Typography>
                            <Typography component="span" variant="body2" color="text.secondary">
                              {discussion.views} views
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Last activity: {discussion.lastActivity}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < discussions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            component={Link}
            href="/support/forum/all"
            disabled={discussions.length === 0}
          >
            View All Discussions
          </Button>
        </Box>
      </Box>
      
      {/* Community Guidelines */}
      <Paper sx={{ p: 4, bgcolor: 'background.paper' }}>
        <Typography variant="h5" gutterBottom>
          Community Guidelines
        </Typography>
        <Typography paragraph>
          To ensure a positive experience for all members, please follow these guidelines when participating in our community forum:
        </Typography>
        <List sx={{ listStyleType: 'disc', pl: 4 }}>
          <ListItem sx={{ display: 'list-item', p: 0.5 }}>
            <Typography>Be respectful and constructive in all interactions</Typography>
          </ListItem>
          <ListItem sx={{ display: 'list-item', p: 0.5 }}>
            <Typography>Stay on topic and post in the appropriate categories</Typography>
          </ListItem>
          <ListItem sx={{ display: 'list-item', p: 0.5 }}>
            <Typography>Do not share personal or sensitive information</Typography>
          </ListItem>
          <ListItem sx={{ display: 'list-item', p: 0.5 }}>
            <Typography>No self-promotion or spam</Typography>
          </ListItem>
          <ListItem sx={{ display: 'list-item', p: 0.5 }}>
            <Typography>Check if your question has already been answered before posting</Typography>
          </ListItem>
        </List>
        <Typography>
          For more detailed information, please refer to our <MuiLink component={Link} href="/terms">Terms of Service</MuiLink> and <MuiLink component={Link} href="/privacy">Privacy Policy</MuiLink>.
        </Typography>
      </Paper>
    </Container>
  );
} 
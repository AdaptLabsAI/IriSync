'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Stack,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CalendarToday as CalendarIcon,
  Message as MessageIcon,
  BarChart as AnalyticsIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Dashboard Home Page (Overview)
 *
 * Hootsuite-inspired dashboard showing:
 * - Key metrics (posts, engagement, reach, growth)
 * - Upcoming scheduled posts
 * - Recent activity
 * - Quick actions
 * - Platform status
 */
export default function DashboardContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    engagement: 0,
    reach: 0,
    growth: 0
  });
  const [upcomingPosts, setUpcomingPosts] = useState<any[]>([]);

  // Load dashboard data
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        // Fetch dashboard stats and upcoming posts
        const [statsRes, postsRes] = await Promise.all([
          fetch('/api/analytics/summary').catch(() => null),
          fetch('/api/content/upcoming?limit=5').catch(() => null)
        ]);

        if (statsRes?.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (postsRes?.ok) {
          const postsData = await postsRes.json();
          setUpcomingPosts(postsData.posts || []);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Mock data for demonstration (fallback if API fails)
  const mockStats = [
    {
      label: 'Total Posts',
      value: stats.totalPosts || 24,
      change: '+12%',
      isUp: true,
      icon: <CalendarIcon />,
      color: 'primary'
    },
    {
      label: 'Engagement Rate',
      value: `${stats.engagement || 18}%`,
      change: '+5.2%',
      isUp: true,
      icon: <MessageIcon />,
      color: 'success'
    },
    {
      label: 'Total Reach',
      value: `${(stats.reach || 45200).toLocaleString()}`,
      change: '+8.3%',
      isUp: true,
      icon: <AnalyticsIcon />,
      color: 'info'
    },
    {
      label: 'Follower Growth',
      value: `${stats.growth || 892}`,
      change: '+15.1%',
      isUp: true,
      icon: <TrendingUpIcon />,
      color: 'warning'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'published',
      title: 'Post published successfully',
      description: 'Tech Conference announcement on Instagram',
      time: '2 hours ago',
      avatar: 'https://via.placeholder.com/40'
    },
    {
      id: 2,
      type: 'scheduled',
      title: 'Post scheduled',
      description: 'Webinar Series on LinkedIn',
      time: '4 hours ago',
      avatar: 'https://via.placeholder.com/40'
    },
    {
      id: 3,
      type: 'comment',
      title: 'New comment received',
      description: 'Someone commented on your latest post',
      time: '6 hours ago',
      avatar: 'https://via.placeholder.com/40'
    }
  ];

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              🏠 Home
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Welcome back! Here's your social media performance overview
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Tooltip title="Refresh data">
              <IconButton onClick={() => window.location.reload()}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/dashboard/planner')}
              sx={{
                bgcolor: '#00C853',
                '&:hover': { bgcolor: '#00A046' },
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Create Post
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {mockStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      {stat.label}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {stat.value}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: `${stat.color}.light`,
                      color: `${stat.color}.dark`,
                      width: 48,
                      height: 48
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  {stat.isUp ? (
                    <TrendingUpIcon fontSize="small" color="success" />
                  ) : (
                    <TrendingDownIcon fontSize="small" color="error" />
                  )}
                  <Typography
                    variant="body2"
                    color={stat.isUp ? 'success.main' : 'error.main'}
                    fontWeight="medium"
                  >
                    {stat.change}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    vs last month
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Upcoming Posts */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Upcoming Posts
              </Typography>
              <Button
                endIcon={<ArrowForwardIcon />}
                onClick={() => router.push('/dashboard/planner')}
                sx={{ textTransform: 'none' }}
              >
                View All
              </Button>
            </Stack>
            <Divider sx={{ mb: 2 }} />

            {upcomingPosts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Upcoming Posts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Schedule your first post to see it here
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/dashboard/planner')}
                  sx={{ bgcolor: '#00C853', '&:hover': { bgcolor: '#00A046' } }}
                >
                  Schedule Post
                </Button>
              </Box>
            ) : (
              <List>
                {upcomingPosts.map((post, index) => (
                  <React.Fragment key={post.id}>
                    <ListItem
                      alignItems="flex-start"
                      secondaryAction={
                        <Chip
                          label={post.platform}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      }
                    >
                      <ListItemAvatar>
                        <Avatar src={post.image} alt={post.title} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={post.title}
                        secondary={
                          <React.Fragment>
                            <Typography component="span" variant="body2" color="text.primary">
                              {post.description}
                            </Typography>
                            <br />
                            <Typography component="span" variant="caption" color="text.secondary">
                              {post.date} at {post.time}
                            </Typography>
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                    {index < upcomingPosts.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Recent Activity
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <List>
              {recentActivity.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem alignItems="flex-start" disablePadding sx={{ mb: 2 }}>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor:
                            activity.type === 'published'
                              ? 'success.light'
                              : activity.type === 'scheduled'
                              ? 'info.light'
                              : 'warning.light',
                          width: 40,
                          height: 40
                        }}
                      >
                        {activity.type === 'published' ? '✓' : activity.type === 'scheduled' ? '⏰' : '💬'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight="medium">
                          {activity.title}
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography component="span" variant="caption" color="text.secondary">
                            {activity.description}
                          </Typography>
                          <br />
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {activity.time}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < recentActivity.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => router.push('/dashboard/inbox')}
              sx={{ mt: 2, textTransform: 'none' }}
            >
              View All Activity
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<CalendarIcon />}
              onClick={() => router.push('/dashboard/planner')}
              sx={{ py: 1.5, textTransform: 'none' }}
            >
              Schedule Post
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<MessageIcon />}
              onClick={() => router.push('/dashboard/inbox')}
              sx={{ py: 1.5, textTransform: 'none' }}
            >
              View Inbox
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AnalyticsIcon />}
              onClick={() => router.push('/dashboard/analytics')}
              sx={{ py: 1.5, textTransform: 'none' }}
            >
              View Analytics
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => router.push('/dashboard/platforms')}
              sx={{ py: 1.5, textTransform: 'none' }}
            >
              Connect Platform
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

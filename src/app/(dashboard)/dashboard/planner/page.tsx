'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarMonth as CalendarIcon,
  ViewWeek as WeekIcon,
  ViewDay as DayIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import CalendarView from '@/components/dashboard/CalendarView';
import UpcomingPostsList from '@/components/dashboard/UpcomingPostsList';
import { useSession } from 'next-auth/react';
import { tokens } from '@/styles/tokens';

// Define interface for scheduled posts
interface ScheduledPost {
  id: string;
  title: string;
  platform: string;
  scheduledFor: Date;
  status: 'ready' | 'draft';
  content: string;
}

/**
 * Planner Page (Content Calendar & Scheduling)
 *
 * Hootsuite-inspired calendar view for scheduling and managing social media posts.
 *
 * Features:
 * - Calendar view (month, week, day)
 * - Drag-and-drop scheduling
 * - Filter by platform and status
 * - Quick post creation
 * - Upcoming posts list
 * - Best time to post suggestions (future)
 */
export default function PlannerPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  // Fetch scheduled posts from API
  useEffect(() => {
    const fetchScheduledPosts = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch next 3 months of scheduled posts
        const startDate = new Date();
        const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

        const params = new URLSearchParams({
          start: startDate.toISOString(),
          end: endDate.toISOString()
        });

        const response = await fetch(`/api/content/calendar?${params}`, {
          next: { revalidate: 300 },
          headers: {
            'Cache-Control': 'max-age=300'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch posts: ${response.statusText}`);
        }

        const data = await response.json();

        // Convert string dates to Date objects
        const postsWithDates = data.posts.map((post: any) => ({
          ...post,
          scheduledFor: new Date(post.scheduledFor)
        }));

        setPosts(postsWithDates);
      } catch (err) {
        console.error('Error fetching scheduled posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load scheduled posts');
      } finally {
        setLoading(false);
      }
    };

    fetchScheduledPosts();
  }, [session?.user?.id]);

  // Handle view change
  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: 'month' | 'week' | 'day' | null
  ) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  // Calculate statistics
  const totalPosts = posts.length;
  const readyPosts = posts.filter(p => p.status === 'ready').length;
  const draftPosts = posts.filter(p => p.status === 'draft').length;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 600,
                fontSize: tokens.typography.fontSize.h1,
                color: tokens.colors.text.primary
              }}
            >
              Planner
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: tokens.colors.text.secondary,
                fontSize: tokens.typography.fontSize.body
              }}
            >
              Schedule and manage your social media content calendar
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              bgcolor: tokens.colors.primary.main,
              '&:hover': { bgcolor: tokens.colors.primary.dark },
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: tokens.borderRadius.md,
              boxShadow: tokens.shadows.md,
            }}
          >
            Create Post
          </Button>
        </Stack>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{
              borderRadius: tokens.borderRadius.md,
              boxShadow: tokens.shadows.md,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: tokens.shadows.lg,
              },
            }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Scheduled
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {totalPosts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{
              borderRadius: tokens.borderRadius.md,
              boxShadow: tokens.shadows.md,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: tokens.shadows.lg,
              },
            }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Ready to Publish
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {readyPosts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{
              borderRadius: tokens.borderRadius.md,
              boxShadow: tokens.shadows.md,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: tokens.shadows.lg,
              },
            }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Drafts
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {draftPosts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* View Controls */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={handleViewChange}
            aria-label="calendar view"
            size="small"
          >
            <ToggleButton value="month" aria-label="month view">
              <Tooltip title="Month View">
                <CalendarIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="week" aria-label="week view">
              <Tooltip title="Week View">
                <WeekIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="day" aria-label="day view">
              <Tooltip title="Day View">
                <DayIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          <Stack direction="row" spacing={1}>
            <Chip label="All Platforms" size="small" />
            <IconButton size="small">
              <FilterIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Calendar View */}
      <Paper sx={{
        p: 3,
        mb: 3,
        borderRadius: tokens.borderRadius.md,
        boxShadow: tokens.shadows.md,
      }}>
        <CalendarView posts={posts} />
      </Paper>

      {/* Upcoming Posts List */}
      <Paper sx={{
        p: 3,
        borderRadius: tokens.borderRadius.md,
        boxShadow: tokens.shadows.md,
      }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Upcoming Posts
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <UpcomingPostsList posts={posts.slice(0, 10)} />
      </Paper>
    </Container>
  );
}

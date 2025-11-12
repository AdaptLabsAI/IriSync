'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import CalendarView from '@/components/dashboard/CalendarView';
import UpcomingPostsList from '@/components/dashboard/UpcomingPostsList';
import { useSession } from 'next-auth/react';

// Define interface for calendar posts
interface CalendarPost {
  id: string;
  title: string;
  platform: string;
  scheduledFor: Date;
  status: 'ready' | 'draft';
  content: string;
}

export default function ContentCalendarPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch calendar data from API with caching
  useEffect(() => {
    const fetchCalendarData = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Add date range parameters (next 3 months)
        const startDate = new Date();
        const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        
        const params = new URLSearchParams({
          start: startDate.toISOString(),
          end: endDate.toISOString()
        });
        
        const response = await fetch(`/api/content/calendar?${params}`, {
          // Enable caching for 5 minutes
          next: { revalidate: 300 },
          headers: {
            'Cache-Control': 'max-age=300'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch calendar data: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Convert string dates back to Date objects
        const postsWithDates = data.posts.map((post: any) => ({
          ...post,
          scheduledFor: new Date(post.scheduledFor)
        }));
        
        setPosts(postsWithDates);
      } catch (err) {
        console.error('Error fetching calendar data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [session?.user?.id]);

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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  // Group posts by date for the sidebar
  const today = new Date();
  const upcomingPosts = posts
    .filter(post => post.scheduledFor > today)
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Content Calendar</Typography>
        <Typography variant="body1" color="text.secondary">
          Schedule and manage your upcoming social media posts
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Left sidebar - Upcoming posts */}
        <Box sx={{ width: { xs: '100%', md: '33.3%', lg: '25%' } }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Posts
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {upcomingPosts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No upcoming posts scheduled
              </Typography>
            ) : (
              <UpcomingPostsList posts={upcomingPosts} />
            )}
          </Paper>
        </Box>
        
        {/* Main calendar view */}
        <Box sx={{ width: { xs: '100%', md: '66.7%', lg: '75%' } }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <CalendarView posts={posts} />
          </Paper>
        </Box>
      </Box>
    </Container>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Divider,
  List,
  ListItem,
  Breadcrumbs,
  Link as MuiLink,
  Tab,
  Tabs,
  Button
} from '@mui/material';
import Link from 'next/link';
import Grid from '@/components/ui/grid';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import Timeline from '@mui/lab/Timeline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConstructionIcon from '@mui/icons-material/Construction';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { useSession } from 'next-auth/react';

// Roadmap item interface
interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'completed' | 'considering';
  timeframe: string;
  category: string;
  voteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function RoadmapPage() {
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const { data: session } = useSession();
  
  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/roadmap');
        if (response.ok) {
          const data = await response.json();
          setRoadmapItems(data.items || []);
        } else {
          console.error("Failed to fetch roadmap data");
          setRoadmapItems([]);
        }
      } catch (error) {
        console.error("Error fetching roadmap data:", error);
        setRoadmapItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRoadmap();
  }, []);
  
  useEffect(() => {
    const fetchUserVotes = async () => {
      if (session?.user) {
        try {
          const response = await fetch('/api/roadmap/votes');
          if (response.ok) {
            const data = await response.json();
            setUserVotes(new Set(data.votes || []));
          }
        } catch (error) {
          console.error("Error fetching user votes:", error);
        }
      }
    };
    
    fetchUserVotes();
  }, [session]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const handleVote = async (itemId: string) => {
    if (!session?.user) {
      alert("Please log in to vote for roadmap items.");
      return;
    }
    
    const hasVoted = userVotes.has(itemId);
    
    try {
      const response = await fetch(`/api/roadmap/${itemId}/vote`, {
        method: hasVoted ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const newVotes = new Set(userVotes);
        if (hasVoted) {
          newVotes.delete(itemId);
        } else {
          newVotes.add(itemId);
        }
        setUserVotes(newVotes);
        
        // Update the vote count in the UI
        setRoadmapItems(items => 
          items.map(item => 
            item.id === itemId 
              ? { ...item, voteCount: item.voteCount + (hasVoted ? -1 : 1) }
              : item
          )
        );
      } else {
        console.error('Failed to vote:', response.statusText);
        alert('Failed to record your vote. Please try again.');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to record your vote. Please try again.');
    }
  };
  
  const getStatusDot = (status: string) => {
    switch (status) {
      case 'completed':
        return <TimelineDot color="success" variant="filled"><CheckCircleIcon /></TimelineDot>;
      case 'in-progress':
        return <TimelineDot color="primary" variant="filled"><ConstructionIcon /></TimelineDot>;
      case 'planned':
        return <TimelineDot color="info" variant="filled"><AccessTimeIcon /></TimelineDot>;
      case 'considering':
        return <TimelineDot color="warning" variant="outlined"><LightbulbIcon /></TimelineDot>;
      default:
        return <TimelineDot />;
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'planned':
        return 'Planned';
      case 'considering':
        return 'Considering';
      default:
        return status;
    }
  };
  
  const getStatusColor = (status: string): "success" | "info" | "warning" | "default" | "primary" | "secondary" | "error" => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'primary';
      case 'planned':
        return 'info';
      case 'considering':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  const filteredItems = activeTab === 0
    ? roadmapItems
    : activeTab === 1
      ? roadmapItems.filter(item => item.status === 'completed')
      : activeTab === 2
        ? roadmapItems.filter(item => item.status === 'in-progress')
        : activeTab === 3
          ? roadmapItems.filter(item => item.status === 'planned')
          : roadmapItems.filter(item => item.status === 'considering');
  
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header & Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <Typography color="text.primary">Roadmap</Typography>
        </Breadcrumbs>
        
        <Typography variant="h3" component="h1" gutterBottom>
          IriSync Product Roadmap
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          See what features we're working on, what we've released, and what's coming next
        </Typography>
      </Box>
      
      {/* Feature Request CTA */}
      <Paper sx={{ p: 4, mb: 6, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h5" gutterBottom>
              Have a feature idea?
            </Typography>
            <Typography variant="body1">
              We'd love to hear your suggestions for how we can improve IriSync. Submit your ideas and vote on existing ones to help shape our product roadmap.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Button 
              variant="contained" 
              color="secondary"
              component={Link}
              href="/support/feedback"
              sx={{ color: '#fff' }}
            >
              Submit Feature Request
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Tabs for filtering */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All" />
          <Tab label="Completed" />
          <Tab label="In Progress" />
          <Tab label="Planned" />
          <Tab label="Considering" />
        </Tabs>
      </Box>
      
      {isLoading ? (
        <Box textAlign="center" py={8}>
          <Typography>Loading roadmap...</Typography>
        </Box>
      ) : filteredItems.length > 0 ? (
        <Timeline position="alternate">
          {filteredItems.map((item, index) => (
            <TimelineItem key={item.id}>
              <TimelineSeparator>
                {getStatusDot(item.status)}
                {index < filteredItems.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 3, 
                    mb: 2,
                    borderLeft: 3,
                    borderColor: (theme) => {
                      const status = getStatusColor(item.status);
                      switch (status) {
                        case 'success': return theme.palette.success.main;
                        case 'primary': return theme.palette.primary.main;
                        case 'info': return theme.palette.info.main;
                        case 'warning': return theme.palette.warning.main;
                        case 'error': return theme.palette.error.main;
                        default: return theme.palette.grey[500];
                      }
                    }
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="h3">
                      {item.title}
                    </Typography>
                    <Chip 
                      label={getStatusLabel(item.status)} 
                      color={getStatusColor(item.status)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" paragraph>
                    {item.description}
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Chip 
                        label={item.timeframe} 
                        size="small" 
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label={item.category} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                    <Button
                      size="small"
                      variant={userVotes.has(item.id) ? "contained" : "outlined"}
                      color="primary"
                      onClick={() => handleVote(item.id)}
                      startIcon={userVotes.has(item.id) ? <CheckCircleIcon /> : null}
                    >
                      {userVotes.has(item.id) ? "Voted" : "Vote"} ({item.voteCount})
                    </Button>
                  </Box>
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      ) : (
        <Box textAlign="center" py={8}>
          <Typography variant="h6">No items found</Typography>
          <Typography variant="body2" color="text.secondary">
            There are no roadmap items matching the current filter
          </Typography>
        </Box>
      )}
    </Container>
  );
} 
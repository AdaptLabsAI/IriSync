'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Link as MuiLink,
  Breadcrumbs
} from '@mui/material';
import Grid from '@/components/ui/grid';
import Link from 'next/link';
import Image from 'next/image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import GroupsIcon from '@mui/icons-material/Groups';
import SettingsIcon from '@mui/icons-material/Settings';
import TimelineIcon from '@mui/icons-material/Timeline';
import SecurityIcon from '@mui/icons-material/Security';
import MainLayout from '@/components/layouts/MainLayout';

function AboutPageContent() {
  // Actual team members data with improved bios
  const teamMembers = [
    {
      name: 'Frank Bosio',
      role: 'CFO',
      bio: 'Frank joined IriSync in 2025 as a co-founder during the company\'s expansion phase. With experience in financial strategy and business operations, he manages the company\'s financial aspects and growth initiatives.',
      image: '/images/frank.png'
    }
  ];
  
  // Accurate company milestones
  const timeline = [
    {
      year: 2025,
      title: 'IriSync Founded',
      description: 'IriSync was established as an AI marketing company.'
    },
    {
      year: 2025,
      title: 'Expansion',
      description: 'Frank Bosio joined as a cofounder to support the company\'s operations.'
    }
  ];
  
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header & Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <Typography color="text.primary">About Us</Typography>
        </Breadcrumbs>
        
        <Typography variant="h3" component="h1" gutterBottom>
          About IriSync
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Learn about our mission, team, and the technology behind our platform
        </Typography>
      </Box>
      
      {/* Hero Section */}
      <Paper
        sx={{
          p: { xs: 3, md: 6 },
          mb: 6,
          backgroundImage: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
          color: 'white',
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Typography variant="h2" component="h2" gutterBottom fontWeight="bold">
            Our Mission
          </Typography>
          <Typography variant="h5" component="p" sx={{ maxWidth: 800, mb: 4 }}>
            To provide businesses with AI-powered tools for social media management, helping them create, schedule, and analyze content more efficiently.
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            sx={{ 
              bgcolor: 'white', 
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)'
              }
            }}
            component={Link}
            href="/features-pricing"
          >
            Explore Our Platform
          </Button>
        </Box>
      </Paper>
      
      {/* About Company */}
      <Box sx={{ py: 8 }}>
        <Typography variant="h2" component="h1" gutterBottom align="center">
          Our Story
        </Typography>
        <Typography variant="body1" paragraph>
          IriSync is a marketing technology company founded in 2025, focused on AI-powered social media management. Our platform provides automated content creation, scheduling, and analytics for businesses.
        </Typography>
        <Typography variant="body1" paragraph>
          Incorporated in Delaware with our team based in New York, we aim to provide practical AI marketing solutions that help businesses streamline their social media presence and engagement.
        </Typography>
      </Box>
      
      {/* Our Technology */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          Our Technology
        </Typography>
        
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SettingsIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="AI-Powered Marketing"
                  secondary="Our platform uses advanced AI to automate and optimize social media content creation and scheduling."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Enterprise-Grade Security"
                  secondary="Built with security at its core, ensuring your marketing data and content are always protected."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <TimelineIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Marketing Analytics"
                  secondary="Comprehensive analytics tools to track campaign performance and optimize your social media strategy."
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </Box>
      
      {/* Team Section */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom align="center">
          Our Team
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 6 }}>
          Meet the experts leading IriSync
        </Typography>
        
        <Grid container spacing={4}>
          {teamMembers.map((member) => (
            <Grid item xs={12} md={4} key={member.name}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Avatar
                    src={member.image}
                    alt={member.name}
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      mx: 'auto', 
                      mb: 2,
                      border: '4px solid',
                      borderColor: 'primary.main'
                    }}
                  />
                  <Typography variant="h5" component="h3" gutterBottom>
                    {member.name}
                  </Typography>
                  <Typography variant="subtitle1" color="primary" gutterBottom>
                    {member.role}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {member.bio}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}

export default function AboutPage() {
  return (
    <MainLayout>
      <AboutPageContent />
    </MainLayout>
  );
}
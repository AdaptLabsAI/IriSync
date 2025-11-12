'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Breadcrumbs,
  Link as MuiLink,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import Grid from '@/components/ui/grid';
import Link from 'next/link';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ForumIcon from '@mui/icons-material/Forum';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import TimelineIcon from '@mui/icons-material/Timeline';
import SettingsSystemDaydreamIcon from '@mui/icons-material/SettingsSystemDaydream';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LanguageIcon from '@mui/icons-material/Language';

export default function SupportPage() {
  // Single flat array of all resources for better organization
  const allResources = [
    {
      title: 'Documentation',
      description: 'Browse our comprehensive guides and API references',
      icon: <DescriptionIcon color="primary" fontSize="large" />,
      link: '/documentation',
      category: 'Self-Help',
      priority: 'primary'
    },
    {
      title: 'Frequently Asked Questions',
      description: 'Quick answers to common questions',
      icon: <HelpOutlineIcon color="primary" fontSize="large" />,
      link: '/support/faq',
      category: 'Self-Help',
      priority: 'primary'
    },
    {
      title: 'Community Forum',
      description: 'Connect with other users and share experiences',
      icon: <ForumIcon color="primary" fontSize="large" />,
      link: '/support/forum',
      category: 'Community',
      priority: 'primary'
    },
    {
      title: 'Product Roadmap',
      description: 'See what features we\'re working on',
      icon: <TimelineIcon color="primary" fontSize="large" />,
      link: '/roadmap',
      category: 'Information',
      priority: 'primary'
    },
    {
      title: 'System Status',
      description: 'Check the current status of IriSync services',
      icon: <SettingsSystemDaydreamIcon color="primary" fontSize="large" />,
      link: '/system-status',
      category: 'Information',
      priority: 'secondary'
    }
  ];

  // Popular quick help topics
  const quickHelpTopics = [
    {
      question: "How do I connect my social media accounts?",
      answer: "Visit the Settings > Connections page to connect your social accounts.",
      icon: <LanguageIcon color="primary" />
    },
    {
      question: "Where can I find my analytics data?",
      answer: "Your analytics are available in the Dashboard > Analytics section.",
      icon: <HelpOutlineIcon color="primary" />
    },
    {
      question: "How do I use the AI content generator?",
      answer: "Go to Content > Create New > AI Generator to access our AI tools.",
      icon: <HelpOutlineIcon color="primary" />
    },
    {
      question: "Can I schedule posts across multiple platforms?",
      answer: "Yes! Use the Content Calendar to schedule posts for multiple platforms simultaneously.",
      icon: <HelpOutlineIcon color="primary" />
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
          <Typography color="text.primary">Support</Typography>
        </Breadcrumbs>
        
        <Typography variant="h3" component="h1" gutterBottom>
          IriSync Support Center
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Find help, resources, and self-service options
        </Typography>
      </Box>
      
      {/* Hero banner with documentation CTA */}
      <Paper
        elevation={3}
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
          <Typography variant="h4" component="h2" gutterBottom fontWeight="bold">
            How can we help you today?
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: 800, mx: 'auto', mb: 4, opacity: 0.9 }}>
            Find answers quickly with our comprehensive self-help resources
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained" 
              size="large"
              component={Link}
              href="/documentation"
              startIcon={<DescriptionIcon />}
              sx={{ 
                bgcolor: 'white', 
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)'
                }
              }}
            >
              Browse Documentation
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              href="/support/faq"
              startIcon={<HelpOutlineIcon />}
              sx={{
                bgcolor: 'transparent',
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'white'
                }
              }}
            >
              View FAQs
            </Button>
          </Stack>
        </Box>
      </Paper>
      
      {/* Support Resources - Single Grid Layout */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" component="h2">
            Support Resources
          </Typography>
          <Divider sx={{ ml: 2, flexGrow: 1 }} />
        </Box>
        
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(3, 1fr)' 
          },
          gap: 3
        }}>
          {allResources.map((resource, index) => (
            <Card 
              key={index}
              elevation={2}
              sx={{ 
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                },
                cursor: 'pointer',
                borderLeft: 4,
                borderColor: resource.priority === 'primary' ? 'primary.main' : 'secondary.main'
              }}
              component={Link}
              href={resource.link}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ mr: 2, color: 'primary.main' }}>
                    {resource.icon}
                  </Box>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <Typography variant="h6" component="h3">
                        {resource.title}
                      </Typography>
                      <Chip 
                        label={resource.category} 
                        size="small" 
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          bgcolor: 'grey.100'
                        }} 
                      />
                    </Stack>
                    <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      {resource.description}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
      
      {/* Quick Help Section */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            Quick Help
          </Typography>
          <Divider sx={{ ml: 2, flexGrow: 1 }} />
        </Box>
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
          <Grid container spacing={2}>
            {quickHelpTopics.map((topic, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Box sx={{ 
                  p: 2, 
                  display: 'flex', 
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' }
                }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {topic.icon}
                  </ListItemIcon>
                  <Box>
                    <Typography variant="subtitle1" color="text.primary" fontWeight="medium">
                      {topic.question}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {topic.answer}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
}
'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Card, 
  CardContent, 
  TextField,
  InputAdornment,
  Chip,
  Breadcrumbs,
  Link as MuiLink,
  Alert,
  Button,
  Divider,
  Paper
} from '@mui/material';
import Grid from '@/components/ui/grid';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';
import LockIcon from '@mui/icons-material/Lock';
import ApiIcon from '@mui/icons-material/Api';
import ExtensionIcon from '@mui/icons-material/Extension';
import WebhookIcon from '@mui/icons-material/Webhook';
import PeopleIcon from '@mui/icons-material/People';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/layouts/MainLayout';

// API guides data
const API_GUIDES = [
  {
    id: 'authentication',
    title: 'Authentication',
    description: 'Learn how to authenticate with the IriSync API',
    icon: <LockIcon color="primary" />,
    path: '/documentation/api-guides/authentication',
    tags: ['api', 'auth', 'security']
  },
  {
    id: 'endpoints',
    title: 'API Endpoints Reference',
    description: 'Complete reference for all API endpoints and parameters',
    icon: <ApiIcon color="primary" />,
    path: '/documentation/api-guides/endpoints',
    tags: ['api', 'reference', 'endpoints']
  },
  {
    id: 'integration',
    title: 'Platform Integration',
    description: 'How to integrate third-party platforms with IriSync',
    icon: <IntegrationInstructionsIcon color="primary" />,
    path: '/documentation/api-guides/integration',
    tags: ['api', 'integration', 'platforms']
  },
  {
    id: 'webhooks',
    title: 'Using Webhooks',
    description: 'Set up and manage webhooks for real-time notifications',
    icon: <WebhookIcon color="primary" />,
    path: '/documentation/api-guides/webhooks',
    tags: ['api', 'webhooks', 'events']
  },
  {
    id: 'content-api',
    title: 'Content Management API',
    description: 'API endpoints for creating and managing content',
    icon: <DescriptionIcon color="primary" />,
    path: '/documentation/api-guides/content-api',
    tags: ['api', 'content', 'management']
  },
  {
    id: 'analytics-api',
    title: 'Analytics API',
    description: 'Access and analyze performance data via the API',
    icon: <AutoGraphIcon color="primary" />,
    path: '/documentation/api-guides/analytics-api',
    tags: ['api', 'analytics', 'reporting']
  },
  {
    id: 'user-management',
    title: 'User Management API',
    description: 'Manage users, teams, and permissions programmatically',
    icon: <PeopleIcon color="primary" />,
    path: '/documentation/api-guides/user-management',
    tags: ['api', 'users', 'authentication']
  },
  {
    id: 'extensions',
    title: 'Building Extensions',
    description: 'Create custom extensions for IriSync using our API',
    icon: <ExtensionIcon color="primary" />,
    path: '/documentation/api-guides/extensions',
    tags: ['api', 'extensions', 'development']
  }
];

function ApiGuidesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: session } = useSession();
  
  // Filter guides based on search
  const filteredGuides = API_GUIDES.filter(guide => 
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header and Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <MuiLink component={Link} href="/documentation" color="inherit">
            Documentation
          </MuiLink>
          <Typography color="text.primary">API Guides</Typography>
        </Breadcrumbs>
        
        <Typography variant="h3" component="h1" gutterBottom>
          API Guides
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Complete documentation for integrating with the IriSync API
        </Typography>
      </Box>
      
      {/* Search */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search API guides..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>
      
      {/* Introduction */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Getting Started with the IriSync API
        </Typography>
        <Typography paragraph>
          The IriSync API allows you to programmatically access and manipulate data within your IriSync account.
          You can create, read, update, and delete various resources, as well as automate workflows and integrate
          with other systems.
        </Typography>
        <Typography paragraph>
          All API endpoints are accessible via HTTPS and follow RESTful conventions. Responses are returned
          in JSON format. Authentication is required for all API requests and is handled via OAuth 2.0 or API keys.
        </Typography>
        <Box mt={2}>
          <Button 
            variant="contained" 
            color="primary" 
            component={Link} 
            href="/api-reference" 
            startIcon={<CodeIcon />}
          >
            API Reference
          </Button>
        </Box>
      </Paper>
      
      {/* API Guides Grid */}
      <Typography variant="h5" component="h2" gutterBottom>
        API Documentation
      </Typography>
      
      <Grid container spacing={3}>
        {filteredGuides.map((guide) => (
          <Grid item xs={12} sm={6} md={4} key={guide.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6
                }
              }}
              component={Link}
              href={guide.path}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ mr: 2 }}>
                    {guide.icon}
                  </Box>
                  <Typography variant="h6" component="h3">
                    {guide.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {guide.description}
                </Typography>
                <Box sx={{ mt: 'auto', pt: 2 }}>
                  {guide.tags.map((tag) => (
                    <Chip 
                      key={tag} 
                      label={tag} 
                      size="small" 
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Help Resources */}
      <Box mt={6} mb={2}>
        <Divider />
      </Box>
      
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Need Help?
        </Typography>
        <Typography paragraph>
          If you need assistance with our API, there are several resources available to help you:
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <DescriptionIcon color="primary" sx={{ mt: 0.5, mr: 1 }} />
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  API Reference
                </Typography>
                <Typography variant="body2" paragraph>
                  Comprehensive reference for all endpoints
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  component={Link} 
                  href="/api-reference"
                >
                  View
                </Button>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <PeopleIcon color="primary" sx={{ mt: 0.5, mr: 1 }} />
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Developer Community
                </Typography>
                <Typography variant="body2" paragraph>
                  Connect with other developers using the IriSync API
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  component={Link} 
                  href="/support/forum"
                >
                  Join
                </Button>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <CodeIcon color="primary" sx={{ mt: 0.5, mr: 1 }} />
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Examples & SDKs
                </Typography>
                <Typography variant="body2" paragraph>
                  Code examples and libraries for popular languages
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  component={Link} 
                  href="/documentation/api-guides/examples"
                >
                  Explore
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

export default function Page() {
  return (
    <MainLayout>
      <ApiGuidesPage />
    </MainLayout>
  );
} 
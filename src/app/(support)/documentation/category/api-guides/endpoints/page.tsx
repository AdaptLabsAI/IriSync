'use client';

import React from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Breadcrumbs,
  Link as MuiLink,
  Divider,
  Alert,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Grid
} from '@mui/material';
import ApiIcon from '@mui/icons-material/Api';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/layouts/MainLayout';
import { SyntaxHighlighter, materialLight } from '@/lib/features/support/syntax-highlighter';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import WebhookIcon from '@mui/icons-material/Webhook';

// Example code for API endpoints
const codeExamples = {
  users: {
    getUser: `// Get a user by ID
fetch('https://api.irisync.com/api/users/123', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`,
    listUsers: `// List all users with pagination
fetch('https://api.irisync.com/api/users?page=1&limit=25', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`
  },
  content: {
    getContent: `// Get content by ID
fetch('https://api.irisync.com/api/content/posts/456', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`,
    createContent: `// Create new content
fetch('https://api.irisync.com/api/content/posts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Post Title',
    content: 'This is the content of the post',
    status: 'draft',
    tags: ['news', 'announcement']
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`
  },
  analytics: {
    getStats: `// Get analytics statistics
fetch('https://api.irisync.com/api/analytics/stats?from=2023-01-01&to=2023-01-31', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`
  }
};

// Endpoint categories
const endpointCategories = [
  {
    id: 'users',
    title: 'User Endpoints',
    description: 'Manage users, profiles, and authentication',
    icon: <PersonIcon color="primary" />,
    endpoints: [
      { method: 'GET', path: '/api/users', description: 'List all users' },
      { method: 'GET', path: '/api/users/{id}', description: 'Get a specific user' },
      { method: 'POST', path: '/api/users', description: 'Create a new user' },
      { method: 'PUT', path: '/api/users/{id}', description: 'Update a user' },
      { method: 'DELETE', path: '/api/users/{id}', description: 'Delete a user' }
    ]
  },
  {
    id: 'content',
    title: 'Content Endpoints',
    description: 'Manage content, posts, and media',
    icon: <DescriptionIcon color="primary" />,
    endpoints: [
      { method: 'GET', path: '/api/content/posts', description: 'List all posts' },
      { method: 'GET', path: '/api/content/posts/{id}', description: 'Get a specific post' },
      { method: 'POST', path: '/api/content/posts', description: 'Create a new post' },
      { method: 'PUT', path: '/api/content/posts/{id}', description: 'Update a post' },
      { method: 'DELETE', path: '/api/content/posts/{id}', description: 'Delete a post' },
      { method: 'GET', path: '/api/content/media', description: 'List all media' },
      { method: 'POST', path: '/api/content/media', description: 'Upload media' }
    ]
  },
  {
    id: 'analytics',
    title: 'Analytics Endpoints',
    description: 'Retrieve analytics and reporting data',
    icon: <AutoGraphIcon color="primary" />,
    endpoints: [
      { method: 'GET', path: '/api/analytics/stats', description: 'Get performance statistics' },
      { method: 'GET', path: '/api/analytics/events', description: 'Get tracked events' },
      { method: 'GET', path: '/api/analytics/content/{id}', description: 'Get performance for specific content' }
    ]
  },
  {
    id: 'webhooks',
    title: 'Webhook Endpoints',
    description: 'Manage webhooks and event subscriptions',
    icon: <WebhookIcon color="primary" />,
    endpoints: [
      { method: 'GET', path: '/api/webhooks', description: 'List all webhooks' },
      { method: 'POST', path: '/api/webhooks', description: 'Create a new webhook' },
      { method: 'PUT', path: '/api/webhooks/{id}', description: 'Update a webhook' },
      { method: 'DELETE', path: '/api/webhooks/{id}', description: 'Delete a webhook' }
    ]
  }
];

function EndpointsPage() {
  const [activeTab, setActiveTab] = React.useState(0);
  const { data: session } = useSession();
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
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
          <MuiLink component={Link} href="/documentation/category/api-guides" color="inherit">
            API Guides
          </MuiLink>
          <Typography color="text.primary">API Endpoints Reference</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ApiIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
          <Typography variant="h3" component="h1">
            API Endpoints Reference
          </Typography>
        </Box>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Complete reference documentation for all IriSync API endpoints
        </Typography>
        
        <Divider sx={{ mt: 3, mb: 4 }} />
      </Box>
      
      {/* Introduction */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Overview
        </Typography>
        <Typography paragraph>
          The IriSync API is organized around REST principles. All API endpoints accept form-encoded request bodies, 
          return JSON-encoded responses, and use standard HTTP response codes, authentication, and verbs.
        </Typography>
        <Typography paragraph>
          Our API has predictable resource-oriented URLs, accepts JSON-encoded request bodies, returns 
          JSON-encoded responses, and uses standard HTTP response codes, authentication, and verbs.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Base URL</Typography>
          <Typography variant="body2">
            All API endpoints are relative to: <code>https://api.irisync.com</code>
          </Typography>
        </Alert>
      </Paper>
      
      {/* Categories Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Users" />
          <Tab label="Content" />
          <Tab label="Analytics" />
          <Tab label="Webhooks" />
        </Tabs>
        
        {/* Endpoints by Category */}
        {endpointCategories.map((category, index) => (
          <Box key={category.id} sx={{ p: 4, display: activeTab === index ? 'block' : 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              {category.icon}
              <Typography variant="h5" sx={{ ml: 1 }}>
                {category.title}
              </Typography>
            </Box>
            <Typography paragraph>
              {category.description}
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Available Endpoints
              </Typography>
              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <List sx={{ p: 0 }}>
                  {category.endpoints.map((endpoint, idx) => (
                    <React.Fragment key={endpoint.path}>
                      <ListItem sx={{
                        borderBottom: idx < category.endpoints.length - 1 ? '1px solid rgba(0, 0, 0, 0.12)' : 'none',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                      }}>
                        <Box sx={{ 
                          mr: 2, 
                          bgcolor: endpoint.method === 'GET' ? 'success.main' :
                                  endpoint.method === 'POST' ? 'info.main' :
                                  endpoint.method === 'PUT' ? 'warning.main' : 'error.main',
                          color: 'white',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          minWidth: '60px',
                          textAlign: 'center'
                        }}>
                          {endpoint.method}
                        </Box>
                        <ListItemText 
                          primary={
                            <Typography component="code" sx={{ fontFamily: 'monospace', fontSize: '1rem' }}>
                              {endpoint.path}
                            </Typography>
                          }
                          secondary={endpoint.description}
                        />
                        <Button 
                          variant="outlined" 
                          size="small"
                          component={Link}
                          href={`/api-reference${endpoint.path}`}
                        >
                          Details
                        </Button>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Example Requests
              </Typography>
              {index === 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Get User by ID
                  </Typography>
                  <SyntaxHighlighter
                    language="javascript"
                    style={materialLight}
                    customStyle={{
                      borderRadius: 4,
                      padding: 16,
                      fontSize: 14,
                      marginBottom: 20
                    }}
                  >
                    {codeExamples.users.getUser}
                  </SyntaxHighlighter>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    List Users
                  </Typography>
                  <SyntaxHighlighter
                    language="javascript"
                    style={materialLight}
                    customStyle={{
                      borderRadius: 4,
                      padding: 16,
                      fontSize: 14
                    }}
                  >
                    {codeExamples.users.listUsers}
                  </SyntaxHighlighter>
                </>
              )}
              
              {index === 1 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Get Content by ID
                  </Typography>
                  <SyntaxHighlighter
                    language="javascript"
                    style={materialLight}
                    customStyle={{
                      borderRadius: 4,
                      padding: 16,
                      fontSize: 14,
                      marginBottom: 20
                    }}
                  >
                    {codeExamples.content.getContent}
                  </SyntaxHighlighter>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Create Content
                  </Typography>
                  <SyntaxHighlighter
                    language="javascript"
                    style={materialLight}
                    customStyle={{
                      borderRadius: 4,
                      padding: 16,
                      fontSize: 14
                    }}
                  >
                    {codeExamples.content.createContent}
                  </SyntaxHighlighter>
                </>
              )}
              
              {index === 2 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Get Analytics Statistics
                  </Typography>
                  <SyntaxHighlighter
                    language="javascript"
                    style={materialLight}
                    customStyle={{
                      borderRadius: 4,
                      padding: 16,
                      fontSize: 14
                    }}
                  >
                    {codeExamples.analytics.getStats}
                  </SyntaxHighlighter>
                </>
              )}
            </Box>
          </Box>
        ))}
      </Paper>
      
      {/* Response Formats */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Response Format
        </Typography>
        <Typography paragraph>
          All API responses are returned in JSON format. Successful responses typically include:
        </Typography>
        <SyntaxHighlighter
          language="json"
          style={materialLight}
          customStyle={{
            borderRadius: 4,
            padding: 16,
            fontSize: 14,
            marginBottom: 20
          }}
        >
          {`{
  "success": true,
  "data": { ... }, // The requested resource or result
  "meta": {
    "pagination": { // Only included for list endpoints
      "total": 100,
      "count": 25,
      "perPage": 25,
      "currentPage": 1,
      "totalPages": 4
    }
  }
}`}
        </SyntaxHighlighter>
        
        <Typography paragraph>
          Error responses include:
        </Typography>
        <SyntaxHighlighter
          language="json"
          style={materialLight}
          customStyle={{
            borderRadius: 4,
            padding: 16,
            fontSize: 14
          }}
        >
          {`{
  "success": false,
  "error": {
    "code": "resource_not_found",
    "message": "The requested resource was not found",
    "status": 404,
    "details": { ... } // Additional context, if available
  }
}`}
        </SyntaxHighlighter>
      </Paper>
      
      {/* Pagination */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Pagination
        </Typography>
        <Typography paragraph>
          List endpoints support pagination through the following query parameters:
        </Typography>
        <List>
          <ListItem>
            <ListItemText 
              primary={<Typography component="code">page</Typography>}
              secondary="Page number (starting from 1)" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary={<Typography component="code">limit</Typography>}
              secondary="Number of items per page (default: 25, max: 100)" 
            />
          </ListItem>
        </List>
        <Typography paragraph>
          Example request with pagination:
        </Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
          <Typography fontFamily="monospace">
            GET /api/content/posts?page=2&limit=50
          </Typography>
        </Box>
      </Paper>
      
      {/* Rate Limiting */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Rate Limiting
        </Typography>
        <Typography paragraph>
          The IriSync API implements rate limiting to ensure fair usage and API stability. Rate limits are based on:
        </Typography>
        <List>
          <ListItem>
            <ListItemText 
              primary="Authentication method"
              secondary="OAuth tokens have higher limits than API keys" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Subscription tier"
              secondary="Higher tiers have higher rate limits" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Endpoint type"
              secondary="Read endpoints have higher limits than write endpoints" 
            />
          </ListItem>
        </List>
        <Typography paragraph>
          Rate limit headers are included in all API responses:
        </Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
          <Typography fontFamily="monospace">
            X-RateLimit-Limit: 1000<br />
            X-RateLimit-Remaining: 995<br />
            X-RateLimit-Reset: 1620000000
          </Typography>
        </Box>
      </Paper>
      
      {/* Next Steps */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Next Steps
        </Typography>
        <Typography paragraph>
          Explore these resources to learn more about specific API functionality:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/documentation/category/api-guides/authentication"
            startIcon={<VpnKeyIcon />}
          >
            Authentication
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/documentation/category/api-guides/webhooks"
            startIcon={<WebhookIcon />}
          >
            Using Webhooks
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/documentation/category/api-guides/content-api"
            startIcon={<DescriptionIcon />}
          >
            Content Management API
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/api-reference"
            startIcon={<ApiIcon />}
          >
            Full API Reference
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default function WrappedEndpointsPage() {
  return (
    <MainLayout>
      <EndpointsPage />
    </MainLayout>
  );
} 
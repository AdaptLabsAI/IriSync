'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  Breadcrumbs,
  Link as MuiLink,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  IconButton,
  Collapse,
  Button,
  Alert
} from '@mui/material';
import Link from 'next/link';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CodeIcon from '@mui/icons-material/Code';
import GetAppIcon from '@mui/icons-material/GetApp';
// Import with proper type handling for optional dependencies
import { SyntaxHighlighter, materialLight } from '@/lib/features/support/syntax-highlighter';

// Interface for API endpoints
interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  title: string;
  description: string;
  authentication: boolean;
  parameters?: {
    name: string;
    type: string;
    description: string;
    required: boolean;
    location: 'path' | 'query' | 'body' | 'header';
  }[];
  responses: {
    code: number;
    description: string;
    example?: string;
    schema?: string;
  }[];
  examples: {
    request?: string;
    response: string;
  };
  tags: string[];
}

// API categories
const API_CATEGORIES = [
  { id: 'all', label: 'All Endpoints' },
  { id: 'users', label: 'User Management' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'content', label: 'Content Management' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'integrations', label: 'Integrations' }
];

// Method to color mapping
const methodColors: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  DELETE: '#f93e3e',
  PATCH: '#50e3c2'
};

// Example API endpoints
const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'get-users',
    method: 'GET',
    path: '/api/users',
    title: 'List Users',
    description: 'Retrieves a list of users, paginated and with optional filtering.',
    authentication: true,
    parameters: [
      {
        name: 'page',
        type: 'integer',
        description: 'Page number for pagination (1-based)',
        required: false,
        location: 'query'
      },
      {
        name: 'limit',
        type: 'integer',
        description: 'Number of results per page (default: 50, max: 100)',
        required: false,
        location: 'query'
      },
      {
        name: 'role',
        type: 'string',
        description: 'Filter users by role (e.g., "admin", "user")',
        required: false,
        location: 'query'
      }
    ],
    responses: [
      {
        code: 200,
        description: 'Successful operation',
        schema: 'UserList',
        example: `{
  "data": [
    {
      "id": "u12345",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "u12346",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "admin",
      "createdAt": "2025-02-20T14:15:00Z"
    }
  ],
  "pagination": {
    "total": 125,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}`
      },
      {
        code: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
        example: `{
  "error": "Unauthorized",
  "message": "Authentication token is missing or invalid"
}`
      },
      {
        code: 403,
        description: 'Forbidden - Insufficient permissions to list users',
        example: `{
  "error": "Forbidden",
  "message": "Insufficient permissions to list users"
}`
      }
    ],
    examples: {
      request: `curl -X GET "https://api.irisync.com/api/users?page=1&limit=50" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: `{
  "data": [
    {
      "id": "u12345",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "2025-01-15T10:30:00Z"
    },
    // More users...
  ],
  "pagination": {
    "total": 125,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}`
    },
    tags: ['users', 'authentication']
  },
  {
    id: 'get-user',
    method: 'GET',
    path: '/api/users/{userId}',
    title: 'Get User',
    description: 'Retrieves a single user by ID.',
    authentication: true,
    parameters: [
      {
        name: 'userId',
        type: 'string',
        description: 'ID of the user to retrieve',
        required: true,
        location: 'path'
      }
    ],
    responses: [
      {
        code: 200,
        description: 'Successful operation',
        schema: 'User',
        example: `{
  "id": "u12345",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "createdAt": "2025-01-15T10:30:00Z",
  "lastLogin": "2025-05-09T08:45:00Z",
  "settings": {
    "notifications": true,
    "twoFactorAuth": false
  }
}`
      },
      {
        code: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
        example: `{
  "error": "Unauthorized",
  "message": "Authentication token is missing or invalid"
}`
      },
      {
        code: 404,
        description: 'Not Found - User with the specified ID does not exist',
        example: `{
  "error": "Not Found",
  "message": "User with ID 'u12345' not found"
}`
      }
    ],
    examples: {
      request: `curl -X GET "https://api.irisync.com/api/users/u12345" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: `{
  "id": "u12345",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "createdAt": "2025-01-15T10:30:00Z",
  "lastLogin": "2025-05-09T08:45:00Z",
  "settings": {
    "notifications": true,
    "twoFactorAuth": false
  }
}`
    },
    tags: ['users', 'authentication']
  },
  {
    id: 'create-user',
    method: 'POST',
    path: '/api/users',
    title: 'Create User',
    description: 'Creates a new user account.',
    authentication: true,
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Full name of the user',
        required: true,
        location: 'body'
      },
      {
        name: 'email',
        type: 'string',
        description: 'Email address of the user (must be unique)',
        required: true,
        location: 'body'
      },
      {
        name: 'password',
        type: 'string',
        description: 'User password (min 8 characters)',
        required: true,
        location: 'body'
      },
      {
        name: 'role',
        type: 'string',
        description: 'User role (default: "user")',
        required: false,
        location: 'body'
      }
    ],
    responses: [
      {
        code: 201,
        description: 'User created successfully',
        schema: 'User',
        example: `{
  "id": "u12347",
  "name": "New User",
  "email": "newuser@example.com",
  "role": "user",
  "createdAt": "2025-05-09T10:30:00Z"
}`
      },
      {
        code: 400,
        description: 'Bad Request - Validation errors or email already exists',
        example: `{
  "error": "Bad Request",
  "message": "Validation error",
  "details": [
    {
      "field": "email",
      "message": "Email address already in use"
    }
  ]
}`
      },
      {
        code: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
        example: `{
  "error": "Unauthorized",
  "message": "Authentication token is missing or invalid"
}`
      },
      {
        code: 403,
        description: 'Forbidden - Insufficient permissions to create users',
        example: `{
  "error": "Forbidden",
  "message": "Insufficient permissions to create users"
}`
      }
    ],
    examples: {
      request: `curl -X POST "https://api.irisync.com/api/users" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "New User",
    "email": "newuser@example.com",
    "password": "securepassword123",
    "role": "user"
  }'`,
      response: `{
  "id": "u12347",
  "name": "New User",
  "email": "newuser@example.com",
  "role": "user",
  "createdAt": "2025-05-09T10:30:00Z"
}`
    },
    tags: ['users', 'authentication']
  },
  {
    id: 'delete-user',
    method: 'DELETE',
    path: '/api/users/{userId}',
    title: 'Delete User',
    description: 'Deletes a user account permanently.',
    authentication: true,
    parameters: [
      {
        name: 'userId',
        type: 'string',
        description: 'ID of the user to delete',
        required: true,
        location: 'path'
      }
    ],
    responses: [
      {
        code: 204,
        description: 'No Content - User successfully deleted',
        example: ''
      },
      {
        code: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
        example: `{
  "error": "Unauthorized",
  "message": "Authentication token is missing or invalid"
}`
      },
      {
        code: 403,
        description: 'Forbidden - Insufficient permissions to delete users',
        example: `{
  "error": "Forbidden",
  "message": "Insufficient permissions to delete users"
}`
      },
      {
        code: 404,
        description: 'Not Found - User with the specified ID does not exist',
        example: `{
  "error": "Not Found",
  "message": "User with ID 'u12345' not found"
}`
      }
    ],
    examples: {
      request: `curl -X DELETE "https://api.irisync.com/api/users/u12345" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: ''
    },
    tags: ['users', 'authentication']
  },
  {
    id: 'get-integrations',
    method: 'GET',
    path: '/api/integrations',
    title: 'List Integrations',
    description: 'Retrieves a list of all available integrations that can be connected to your account.',
    authentication: true,
    parameters: [
      {
        name: 'category',
        type: 'string',
        description: 'Filter integrations by category (e.g., "social", "design", "storage")',
        required: false,
        location: 'query'
      },
      {
        name: 'status',
        type: 'string',
        description: 'Filter by status ("active", "coming_soon")',
        required: false,
        location: 'query'
      }
    ],
    responses: [
      {
        code: 200,
        description: 'Successful operation',
        schema: 'IntegrationList',
        example: `{
  "data": [
    {
      "id": "facebook",
      "name": "Facebook",
      "type": "social",
      "description": "Connect and manage Facebook pages and groups",
      "status": "active",
      "icon": "https://api.irisync.com/icons/facebook.svg"
    },
    {
      "id": "canva",
      "name": "Canva",
      "type": "design",
      "description": "Import designs from Canva to your content",
      "status": "active",
      "icon": "https://api.irisync.com/icons/canva.svg"
    }
  ]
}`
      },
      {
        code: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
        example: `{
  "error": "Unauthorized",
  "message": "Authentication token is missing or invalid"
}`
      }
    ],
    examples: {
      request: `curl -X GET "https://api.irisync.com/api/integrations?category=social" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: `{
  "data": [
    {
      "id": "facebook",
      "name": "Facebook",
      "type": "social",
      "description": "Connect and manage Facebook pages and groups",
      "status": "active",
      "icon": "https://api.irisync.com/icons/facebook.svg"
    },
    {
      "id": "instagram",
      "name": "Instagram",
      "type": "social",
      "description": "Schedule posts and stories on Instagram",
      "status": "active",
      "icon": "https://api.irisync.com/icons/instagram.svg"
    }
  ]
}`
    },
    tags: ['integrations']
  },
  {
    id: 'get-integration',
    method: 'GET',
    path: '/api/integrations/{integrationId}',
    title: 'Get Integration Details',
    description: 'Retrieves detailed information about a specific integration.',
    authentication: true,
    parameters: [
      {
        name: 'integrationId',
        type: 'string',
        description: 'ID of the integration to retrieve',
        required: true,
        location: 'path'
      }
    ],
    responses: [
      {
        code: 200,
        description: 'Successful operation',
        schema: 'Integration',
        example: `{
  "id": "facebook",
  "name": "Facebook",
  "type": "social",
  "description": "Connect and manage Facebook pages and groups",
  "status": "active",
  "icon": "https://api.irisync.com/icons/facebook.svg",
  "authMethod": "oauth2",
  "scopes": ["pages_manage_posts", "pages_read_engagement"],
  "endpoints": {
    "authorize": "/api/integrations/connect/facebook",
    "callback": "/api/platforms/callback?provider=facebook"
  },
  "setupSteps": [
    "Connect your Facebook account",
    "Select pages to manage",
    "Grant required permissions"
  ]
}`
      },
      {
        code: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
        example: `{
  "error": "Unauthorized",
  "message": "Authentication token is missing or invalid"
}`
      },
      {
        code: 404,
        description: 'Not Found - Integration with the specified ID does not exist',
        example: `{
  "error": "Not Found",
  "message": "Integration with ID 'invalid-id' not found"
}`
      }
    ],
    examples: {
      request: `curl -X GET "https://api.irisync.com/api/integrations/facebook" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: `{
  "id": "facebook",
  "name": "Facebook",
  "type": "social",
  "description": "Connect and manage Facebook pages and groups",
  "status": "active",
  "icon": "https://api.irisync.com/icons/facebook.svg",
  "authMethod": "oauth2",
  "scopes": ["pages_manage_posts", "pages_read_engagement"],
  "endpoints": {
    "authorize": "/api/integrations/connect/facebook",
    "callback": "/api/platforms/callback?provider=facebook"
  },
  "setupSteps": [
    "Connect your Facebook account",
    "Select pages to manage",
    "Grant required permissions"
  ]
}`
    },
    tags: ['integrations']
  },
  {
    id: 'get-connected-integrations',
    method: 'GET',
    path: '/api/integrations/connected',
    title: 'List Connected Integrations',
    description: 'Retrieves all integrations that are connected to the user\'s account.',
    authentication: true,
    responses: [
      {
        code: 200,
        description: 'Successful operation',
        schema: 'ConnectedIntegrationList',
        example: `{
  "data": [
    {
      "integrationId": "facebook",
      "status": "connected",
      "connectedAt": "2025-03-15T14:30:00Z",
      "lastSyncAt": "2025-03-15T15:45:00Z",
      "meta": {
        "pages": ["Page 1", "Page 2"],
        "accountName": "Jane Smith"
      }
    },
    {
      "integrationId": "canva",
      "status": "connected",
      "connectedAt": "2025-02-10T09:15:00Z",
      "lastSyncAt": "2025-03-14T11:20:00Z",
      "meta": {
        "workspaces": ["Marketing", "Social Media"]
      }
    }
  ]
}`
      },
      {
        code: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
        example: `{
  "error": "Unauthorized",
  "message": "Authentication token is missing or invalid"
}`
      }
    ],
    examples: {
      request: `curl -X GET "https://api.irisync.com/api/integrations/connected" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: `{
  "data": [
    {
      "integrationId": "facebook",
      "status": "connected",
      "connectedAt": "2025-03-15T14:30:00Z",
      "lastSyncAt": "2025-03-15T15:45:00Z",
      "meta": {
        "pages": ["Page 1", "Page 2"],
        "accountName": "Jane Smith"
      }
    }
  ]
}`
    },
    tags: ['integrations']
  },
  {
    id: 'connect-integration',
    method: 'POST',
    path: '/api/integrations/connect/{integrationId}',
    title: 'Connect Integration',
    description: 'Initiates the connection process for a specific integration. For OAuth flows, this returns an authorization URL. For API key integrations, the connection is established directly.',
    authentication: true,
    parameters: [
      {
        name: 'integrationId',
        type: 'string',
        description: 'ID of the integration to connect',
        required: true,
        location: 'path'
      },
      {
        name: 'redirectUrl',
        type: 'string',
        description: 'URL to redirect after OAuth authentication (for OAuth flows)',
        required: false,
        location: 'body'
      },
      {
        name: 'apiKey',
        type: 'string',
        description: 'API key for the service (for API key-based integrations)',
        required: false,
        location: 'body'
      }
    ],
    responses: [
      {
        code: 200,
        description: 'Connection process initiated successfully',
        schema: 'ConnectionResponse',
        example: `{
  "status": "pending",
  "authUrl": "https://facebook.com/oauth/authorize?client_id=xyz&redirect_uri=https://app.irisync.com/api/platforms/callback&state=abc123",
  "provider": "facebook"
}`
      },
      {
        code: 201,
        description: 'Connection established successfully (for API key integrations)',
        schema: 'ConnectionResponse',
        example: `{
  "status": "connected",
  "connectionId": "conn_12345",
  "provider": "airtable"
}`
      },
      {
        code: 400,
        description: 'Bad Request - Missing required parameters or invalid data',
        example: `{
  "error": "Bad Request",
  "message": "API key is required for this integration"
}`
      },
      {
        code: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
        example: `{
  "error": "Unauthorized",
  "message": "Authentication token is missing or invalid"
}`
      },
      {
        code: 404,
        description: 'Not Found - Integration with the specified ID does not exist',
        example: `{
  "error": "Not Found",
  "message": "Integration with ID 'invalid-id' not found"
}`
      }
    ],
    examples: {
      request: `curl -X POST "https://api.irisync.com/api/integrations/connect/facebook" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "redirectUrl": "https://app.irisync.com/dashboard/settings/connections"
  }'`,
      response: `{
  "status": "pending",
  "authUrl": "https://facebook.com/oauth/authorize?client_id=xyz&redirect_uri=https://app.irisync.com/api/platforms/callback&state=abc123",
  "provider": "facebook"
}`
    },
    tags: ['integrations']
  },
  {
    id: 'disconnect-integration',
    method: 'DELETE',
    path: '/api/integrations/disconnect/{integrationId}',
    title: 'Disconnect Integration',
    description: 'Disconnects a specific integration from the user\'s account.',
    authentication: true,
    parameters: [
      {
        name: 'integrationId',
        type: 'string',
        description: 'ID of the integration to disconnect',
        required: true,
        location: 'path'
      }
    ],
    responses: [
      {
        code: 200,
        description: 'Integration successfully disconnected',
        schema: 'DisconnectionResponse',
        example: `{
  "status": "disconnected",
  "provider": "facebook"
}`
      },
      {
        code: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
        example: `{
  "error": "Unauthorized",
  "message": "Authentication token is missing or invalid"
}`
      },
      {
        code: 404,
        description: 'Not Found - Integration connection not found',
        example: `{
  "error": "Not Found",
  "message": "No connected integration found for ID 'facebook'"
}`
      }
    ],
    examples: {
      request: `curl -X DELETE "https://api.irisync.com/api/integrations/disconnect/facebook" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: `{
  "status": "disconnected",
  "provider": "facebook"
}`
    },
    tags: ['integrations']
  }
];

function ApiReferencePageContent() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({});
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  
  // Handle category change
  const handleCategoryChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedCategory(newValue);
  };
  
  // Filter endpoints based on category and search
  const filteredEndpoints = API_ENDPOINTS.filter(endpoint => {
    // Filter by category
    const categoryMatch = selectedCategory === 'all' || endpoint.tags.includes(selectedCategory);
    
    // Filter by search
    const searchMatch = searchQuery === '' || 
      endpoint.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return categoryMatch && searchMatch;
  });
  
  // Toggle endpoint expansion
  const toggleEndpoint = (id: string) => {
    setExpandedEndpoints(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Copy code to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSnippet(id);
      setTimeout(() => setCopiedSnippet(null), 2000);
    });
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header & Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <Typography color="text.primary">API Reference</Typography>
        </Breadcrumbs>
        
        <Typography variant="h3" component="h1" gutterBottom>
          API Reference
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Complete reference for the IriSync API endpoints
        </Typography>
      </Box>
      
      {/* API Key Information */}
      <Alert 
        severity="info" 
        variant="outlined" 
        sx={{ mb: 4 }}
        action={
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<GetAppIcon />}
            href="/documentation/api-guides/authentication"
          >
            API Guide
          </Button>
        }
      >
        <Typography variant="subtitle2">API Keys Required</Typography>
        <Typography variant="body2">
          All API requests require authentication. You can generate API keys in your account settings.
        </Typography>
      </Alert>
      
      {/* Search and Categories */}
      <Box mb={4}>
        <TextField
          fullWidth
          placeholder="Search endpoints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />
        
        <Tabs
          value={selectedCategory}
          onChange={handleCategoryChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {API_CATEGORIES.map((category) => (
            <Tab 
              key={category.id} 
              label={category.label} 
              value={category.id} 
            />
          ))}
        </Tabs>
      </Box>
      
      {/* Endpoints */}
      {filteredEndpoints.length > 0 ? (
        <Box>
          {filteredEndpoints.map((endpoint) => (
            <Paper 
              key={endpoint.id} 
              sx={{ 
                mb: 3, 
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              {/* Endpoint Header */}
              <Box 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'grey.50'
                }}
                onClick={() => toggleEndpoint(endpoint.id)}
              >
                <Chip 
                  label={endpoint.method}
                  size="small"
                  sx={{ 
                    fontWeight: 'bold',
                    bgcolor: methodColors[endpoint.method],
                    color: 'white',
                    mr: 2,
                    minWidth: 60,
                    textAlign: 'center'
                  }}
                />
                
                <Typography 
                  variant="subtitle1" 
                  component="span" 
                  sx={{ 
                    mr: 2,
                    fontFamily: 'monospace',
                    fontWeight: 'medium'
                  }}
                >
                  {endpoint.path}
                </Typography>
                
                <Typography variant="body2" sx={{ flexGrow: 1, color: 'text.secondary' }}>
                  {endpoint.title}
                </Typography>
                
                <IconButton size="small">
                  {expandedEndpoints[endpoint.id] ? (
                    <ExpandLessIcon />
                  ) : (
                    <ExpandMoreIcon />
                  )}
                </IconButton>
              </Box>
              
              {/* Endpoint Details */}
              <Collapse in={expandedEndpoints[endpoint.id]}>
                <Box sx={{ p: 3 }}>
                  <Typography variant="body1" paragraph>
                    {endpoint.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                    {endpoint.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                    {endpoint.authentication && (
                      <Chip 
                        label="Requires Authentication" 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  {/* Parameters */}
                  {endpoint.parameters && endpoint.parameters.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h6" gutterBottom>
                        Parameters
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Name</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Location</TableCell>
                              <TableCell>Required</TableCell>
                              <TableCell>Description</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {endpoint.parameters.map((param) => (
                              <TableRow key={param.name}>
                                <TableCell><code>{param.name}</code></TableCell>
                                <TableCell><code>{param.type}</code></TableCell>
                                <TableCell>{param.location}</TableCell>
                                <TableCell>
                                  {param.required ? (
                                    <Typography color="error">Required</Typography>
                                  ) : (
                                    <Typography color="text.secondary">Optional</Typography>
                                  )}
                                </TableCell>
                                <TableCell>{param.description}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                  
                  {/* Responses */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                      Responses
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Code</TableCell>
                            <TableCell>Description</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {endpoint.responses.map((response) => (
                            <TableRow key={response.code}>
                              <TableCell>
                                <Chip
                                  label={response.code}
                                  size="small"
                                  color={
                                    response.code < 300 ? 'success' :
                                    response.code < 400 ? 'info' :
                                    response.code < 500 ? 'warning' : 'error'
                                  }
                                />
                              </TableCell>
                              <TableCell>{response.description}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                  
                  {/* Example Request */}
                  {endpoint.examples.request && (
                    <Box sx={{ mb: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2">Example Request</Typography>
                        <IconButton 
                          size="small"
                          onClick={() => copyToClipboard(endpoint.examples.request!, `${endpoint.id}-request`)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box position="relative">
                        {copiedSnippet === `${endpoint.id}-request` && (
                          <Chip 
                            label="Copied!"
                            size="small"
                            color="success"
                            sx={{ 
                              position: 'absolute', 
                              top: 8, 
                              right: 8, 
                              zIndex: 1 
                            }}
                          />
                        )}
                        <SyntaxHighlighter
                          language="bash"
                          style={materialLight}
                          customStyle={{
                            borderRadius: 4,
                            padding: 16,
                            fontSize: 14,
                            marginTop: 0
                          }}
                        >
                          {endpoint.examples.request}
                        </SyntaxHighlighter>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Example Response */}
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2">Example Response</Typography>
                      <IconButton 
                        size="small"
                        onClick={() => copyToClipboard(endpoint.examples.response, `${endpoint.id}-response`)}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box position="relative">
                      {copiedSnippet === `${endpoint.id}-response` && (
                        <Chip 
                          label="Copied!"
                          size="small"
                          color="success"
                          sx={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 8, 
                            zIndex: 1 
                          }}
                        />
                      )}
                      <SyntaxHighlighter
                        language="json"
                        style={materialLight}
                        customStyle={{
                          borderRadius: 4,
                          padding: 16,
                          fontSize: 14,
                          marginTop: 0
                        }}
                      >
                        {endpoint.examples.response}
                      </SyntaxHighlighter>
                    </Box>
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          ))}
        </Box>
      ) : (
        <Box textAlign="center" py={6}>
          <Typography variant="h6">No endpoints found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try changing your search or category filter
          </Typography>
        </Box>
      )}
    </Container>
  );
}

export default function ApiReferencePage() {
  return (
    <ApiReferencePageContent />
  );
} 
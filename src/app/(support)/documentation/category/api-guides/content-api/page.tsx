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
  Grid,
  Chip
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/layouts/MainLayout';
import ArticleIcon from '@mui/icons-material/Article';
import CreateIcon from '@mui/icons-material/Create';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import LaunchIcon from '@mui/icons-material/Launch';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
// Import with proper type handling for optional dependencies
import { SyntaxHighlighter, materialLight } from '@/lib/features/support/syntax-highlighter';

// Example code snippet
const codeExample = `// Create a new content post
const createPost = async (postData) => {
  const response = await fetch('https://api.irisync.com/api/content/posts', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: postData.title,
      content: postData.content,
      status: 'draft',
      tags: postData.tags || []
    })
  });
  
  return response.json();
};`;

function ContentApiPage() {
  const { data: session } = useSession();
  
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
          <Typography color="text.primary">Content Management API</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <DescriptionIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
          <Typography variant="h3" component="h1">
            Content Management API
          </Typography>
        </Box>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          API endpoints for creating and managing content
        </Typography>
        
        <Divider sx={{ mt: 3, mb: 4 }} />
      </Box>
      
      {/* Introduction */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Overview
        </Typography>
        <Typography paragraph>
          The Content Management API allows you to programmatically create, read, update, and delete content in your 
          IriSync account. With this API, you can automate content workflows, schedule posts, and synchronize content 
          with other systems.
        </Typography>
        <Typography paragraph>
          Content in IriSync is organized into different types such as posts, media, and templates. Each content 
          type has its own set of endpoints and supported operations.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Authentication Required</Typography>
          <Typography variant="body2">
            All Content API endpoints require authentication. See the <Link href="/documentation/category/api-guides/authentication">Authentication Guide</Link> for details.
          </Typography>
        </Alert>
      </Paper>
      
      {/* Example */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Example Usage
        </Typography>
        <Typography paragraph>
          Here's a simple example of creating a new content post:
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
          {codeExample}
        </SyntaxHighlighter>
        
        <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
          Key Endpoints
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography sx={{ fontFamily: 'monospace', mb: 1 }}>
              GET /api/content/posts - List all posts
            </Typography>
          </li>
          <li>
            <Typography sx={{ fontFamily: 'monospace', mb: 1 }}>
              GET /api/content/posts/{'{id}'} - Get a specific post
            </Typography>
          </li>
          <li>
            <Typography sx={{ fontFamily: 'monospace', mb: 1 }}>
              POST /api/content/posts - Create a new post
            </Typography>
          </li>
          <li>
            <Typography sx={{ fontFamily: 'monospace', mb: 1 }}>
              PUT /api/content/posts/{'{id}'} - Update a post
            </Typography>
          </li>
          <li>
            <Typography sx={{ fontFamily: 'monospace' }}>
              DELETE /api/content/posts/{'{id}'} - Delete a post
            </Typography>
          </li>
        </Box>
      </Paper>
      
      {/* Next Steps */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Next Steps
        </Typography>
        <Typography paragraph>
          Explore these related resources:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/documentation/category/api-guides/authentication"
          >
            API Authentication
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/documentation/category/api-guides/webhooks"
          >
            Using Webhooks
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/api-reference#content"
          >
            Content API Reference
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default function WrappedContentApiPage() {
  return (
    <MainLayout>
      <ContentApiPage />
    </MainLayout>
  );
} 
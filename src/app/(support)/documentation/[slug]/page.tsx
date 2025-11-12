'use client';

import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Breadcrumbs,
  Link as MuiLink,
  Chip,
  Divider,
  Button,
  Alert,
  IconButton,
  useTheme
} from '@mui/material';
import Link from 'next/link';
import { collection, doc, getDoc, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase';
import { useSession } from 'next-auth/react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import MainLayout from '@/components/layouts/MainLayout';

// Documentation category data 
const DOC_CATEGORIES = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Essential guides to start using IriSync',
    icon: 'rocket',
    color: '#4285F4',
  },
  {
    id: 'api-guides',
    name: 'API Guides',
    description: 'How to use the IriSync API for integrations',
    icon: 'code',
    color: '#34A853',
  },
  {
    id: 'platform-guides',
    name: 'Platform Guides',
    description: 'Detailed guides for IriSync\'s platform features',
    icon: 'layers',
    color: '#FBBC05',
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description: 'Solutions for common issues',
    icon: 'bug',
    color: '#EA4335',
  },
  {
    id: 'best-practices',
    name: 'Best Practices',
    description: 'Recommendations and optimizations',
    icon: 'star',
    color: '#8E24AA',
  },
  {
    id: 'release-notes',
    name: 'Release Notes',
    description: 'Updates and new features',
    icon: 'new_releases',
    color: '#0097A7',
  }
];

// Sample docs for testing
const SAMPLE_DOCS = {
  'getting-started-intro': {
    id: 'getting-started-intro',
    title: 'Getting Started with IriSync',
    description: 'A comprehensive guide to start using IriSync',
    categoryId: 'getting-started',
    content: `
# Getting Started with IriSync

Welcome to IriSync! This guide will help you get up and running with the platform quickly and efficiently.

## What is IriSync?

IriSync is a comprehensive AI-powered social media management platform designed to help businesses create, schedule, and analyze content across multiple platforms. With advanced AI tools, seamless integrations, and intuitive analytics, IriSync streamlines your social media workflow.

## Setting Up Your Account

1. **Create Your Account**: Sign up at [IriSync.com](https://irisync.com)
2. **Connect Your Social Platforms**: Navigate to Settings > Connections to link your social media accounts
3. **Set Up Your Team**: Invite team members and assign appropriate permissions

## Key Features

### Content Creation & Scheduling
- AI-assisted content generation
- Calendar-based visual scheduling
- Cross-platform posting

### Analytics & Reporting
- Engagement metrics
- Audience growth tracking
- Competitive analysis

### AI Tools
- Content optimization
- Audience analysis
- Trend identification

## Next Steps

Once you've set up your account, check out these resources:
- [Platform Guides](/documentation/platform-guides)
- [API Documentation](/api-reference)
- [Best Practices](/documentation/best-practices)

If you need assistance, our [Support Team](/support) is ready to help!
    `,
    lastUpdated: new Date(2025, 4, 15),
    createdAt: new Date(2025, 3, 15),
    createdBy: 'Admin',
    updatedBy: 'Admin',
    tags: ['beginner', 'setup', 'onboarding'],
  },
  'api-guides-authentication': {
    id: 'api-guides-authentication',
    title: 'API Authentication',
    description: 'Learn how to authenticate with the IriSync API',
    categoryId: 'api-guides',
    content: `
# API Authentication Guide

This guide explains how to authenticate with the IriSync API to access its powerful features programmatically.

## Authentication Methods

IriSync supports two authentication methods:

1. **API Key Authentication**: Simple authentication using an API key in the request header.
2. **OAuth 2.0**: More secure authentication for user-specific access.

## API Key Authentication

### Obtaining an API Key

1. Log in to your IriSync account
2. Navigate to Settings > API Keys
3. Click "Generate New API Key"
4. Store your key securely - it won't be shown again!

### Using Your API Key

Include your API key in the \`X-API-Key\` header:

\`\`\`javascript
fetch('https://api.irisync.com/v1/content', {
  headers: {
    'X-API-Key': 'your-api-key-here'
  }
})
\`\`\`

## OAuth 2.0 Authentication

OAuth 2.0 allows you to access the API on behalf of a user.

### Register Your Application

1. Go to Settings > Developer > Applications
2. Click "Register New Application"
3. Enter your application details and redirect URI
4. Note your Client ID and Client Secret

### Authentication Flow

1. **Authorization Request**: Redirect users to the authorization URL
2. **User Consent**: User approves access to their data
3. **Authorization Code**: Receive an authorization code
4. **Token Exchange**: Exchange code for access and refresh tokens
5. **API Requests**: Use the access token for API calls

### Example Authorization Request

\`\`\`
https://auth.irisync.com/oauth2/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  scope=read:content write:content
\`\`\`

## Security Best Practices

- Never expose API keys or client secrets in client-side code
- Use appropriate scopes to limit access
- Implement token refresh logic for long-running applications
- Revoke unused API keys and tokens

## Next Steps

Now that you understand authentication, check out the [API Endpoints Reference](/documentation/api-guides/endpoints) to start using the API.
    `,
    lastUpdated: new Date(2025, 4, 10),
    createdAt: new Date(2025, 3, 20),
    createdBy: 'Admin',
    updatedBy: 'Admin',
    tags: ['api', 'authentication', 'security'],
  }
};

// Documentation page interface
interface DocPageData {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  lastUpdated: Date;
  createdAt: Date;
  createdBy: string;
  updatedBy: string;
  tags: string[];
  content: string;
}

function DocPage({ params }: { params: { slug: string } }) {
  const theme = useTheme();
  const { data: session } = useSession();
  const [doc, setDoc] = useState<DocPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchDoc = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/content/documentation/${params.slug}`);
        if (response.ok) {
          const data = await response.json();
          setDoc(data.doc || null);
        } else if (response.status === 404) {
          setError('Documentation page not found');
        } else {
          setError('Failed to load documentation');
        }
      } catch (error) {
        console.error('Error fetching documentation:', error);
        setError('Unable to load documentation');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDoc();
  }, [params.slug]);
  
  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = DOC_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };
  
  // Get category color by ID
  const getCategoryColor = (categoryId: string) => {
    const category = DOC_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.color : '#000000';
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Render Markdown content (using a simple approach)
  const renderContent = (content: string) => {
    // Basic Markdown rendering - in a real app, use a proper Markdown renderer
    const formattedContent = content
      // Headers
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      // Bold and Italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br />');
    
    return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />;
  };
  
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Loading documentation...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  if (error || !doc) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error || 'Documentation not found'}
        </Alert>
        <Button 
          component={Link} 
          href="/documentation" 
          startIcon={<ArrowBackIcon />}
          variant="outlined"
        >
          Back to Documentation
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <MuiLink component={Link} href="/documentation" color="inherit">
            Documentation
          </MuiLink>
          <MuiLink 
            component={Link} 
            href={`/documentation/category/${doc.categoryId}`} 
            color="inherit"
          >
            {getCategoryName(doc.categoryId)}
          </MuiLink>
          <Typography color="text.primary">{doc.title}</Typography>
        </Breadcrumbs>
      </Box>
      
      {/* Doc Header */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Chip 
                icon={<FolderIcon />}
                label={getCategoryName(doc.categoryId)} 
                size="small"
                sx={{ 
                  mr: 1,
                  bgcolor: `${getCategoryColor(doc.categoryId)}20`,
                  color: getCategoryColor(doc.categoryId),
                }}
              />
              {doc.tags.map((tag: string) => (
                <Chip 
                  key={tag} 
                  label={tag} 
                  size="small"
                  variant="outlined"
                  sx={{ mr: 0.5 }}
                />
              ))}
            </Box>
            <Typography variant="h3" component="h1" gutterBottom>
              {doc.title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {doc.description}
            </Typography>
          </Box>
          
          {session?.user && (session.user as any).role === 'admin' && (
            <IconButton 
              component={Link} 
              href={`/admin/documentation/edit/${doc.id}`}
              aria-label="Edit documentation"
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              <EditIcon />
            </IconButton>
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 4 }}>
            Last updated: {formatDate(doc.lastUpdated)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            By: {doc.updatedBy}
          </Typography>
        </Box>
      </Paper>
      
      {/* Doc Content */}
      <Paper sx={{ p: 4 }}>
        <Box sx={{ 
          typography: 'body1',
          '& h1': { 
            fontSize: '2rem',
            fontWeight: 'bold',
            mb: 2,
            mt: 3,
            pb: 1,
            borderBottom: '1px solid',
            borderColor: 'divider'
          },
          '& h2': { 
            fontSize: '1.5rem',
            fontWeight: 'bold',
            mb: 2,
            mt: 3 
          },
          '& h3': { 
            fontSize: '1.25rem',
            fontWeight: 'bold',
            mb: 1.5,
            mt: 2.5 
          },
          '& pre': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            p: 2,
            borderRadius: 1,
            overflow: 'auto',
            my: 2
          },
          '& code': {
            fontFamily: 'monospace',
            fontSize: '0.9em',
          },
          '& a': {
            color: 'primary.main',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline'
            }
          },
          '& li': {
            mb: 1
          }
        }}>
          {renderContent(doc.content)}
        </Box>
      </Paper>
      
      {/* Related Docs (in a real app, would fetch related docs) */}
      <Box mt={6}>
        <Typography variant="h5" gutterBottom>
          Related Documentation
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            More {getCategoryName(doc.categoryId)} documentation will be displayed here.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}

// Wrap with MainLayout
export default function WrappedDocPage({ params }: { params: { slug: string } }) {
  return (
    <MainLayout>
      <DocPage params={params} />
    </MainLayout>
  );
} 
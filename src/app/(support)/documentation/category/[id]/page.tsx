'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Card, 
  CardContent, 
  TextField,
  InputAdornment,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Breadcrumbs,
  Link as MuiLink,
  Alert,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/layouts/MainLayout';

// Documentation category data (same as in main docs page)
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

// Documentation page interface
interface DocPage {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  lastUpdated: Date;
  createdAt: Date;
  createdBy: string;
  updatedBy: string;
  path: string;
  tags: string[];
}

function CategoryDocumentationPage({ params }: { params: { id: string } }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryDocs, setCategoryDocs] = useState<DocPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  
  // Find the current category from the params
  const currentCategory = DOC_CATEGORIES.find(category => category.id === params.id);
  
  useEffect(() => {
    const fetchCategoryDocs = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/content/documentation/category/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setCategoryDocs(data.docs || []);
        } else if (response.status === 404) {
          setError('Category not found');
        } else {
          setError('Failed to load documentation category');
        }
      } catch (error) {
        console.error('Error fetching category documentation:', error);
        setError('Unable to load documentation category');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategoryDocs();
  }, [params.id]);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Filter docs based on search query
  const filteredDocs = categoryDocs.filter((doc) => 
    searchQuery === '' || 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  if (!currentCategory) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          Category not found. The requested category does not exist.
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
      {/* Header & Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <MuiLink component={Link} href="/documentation" color="inherit">
            Documentation
          </MuiLink>
          <Typography color="text.primary">{currentCategory.name}</Typography>
        </Breadcrumbs>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              {currentCategory.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {currentCategory.description}
            </Typography>
          </Box>
          
          {session?.user && (session.user as any).role === 'admin' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              component={Link}
              href="/admin/documentation/create"
            >
              Create New
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Search */}
      <Box mb={6}>
        <TextField
          fullWidth
          placeholder={`Search ${currentCategory.name} documentation...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ 
            bgcolor: 'background.paper',
            borderRadius: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
            }
          }}
        />
      </Box>
      
      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading state */}
      {isLoading ? (
        <Box textAlign="center" py={4}>
          <Typography variant="h6">Loading...</Typography>
        </Box>
      ) : (
        <>
          {/* Document list */}
          {filteredDocs.length > 0 ? (
            <Paper>
              <List>
                {filteredDocs.map((doc) => (
                  <ListItem 
                    key={doc.id}
                    component={Link}
                    href={doc.path}
                    divider
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <ListItemIcon>
                      <DescriptionIcon sx={{ color: currentCategory.color }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.title}
                      secondary={
                        <>
                          <Typography variant="body2" component="span">
                            {doc.description}
                          </Typography>
                          <Box mt={0.5} display="flex" alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Updated: {formatDate(doc.lastUpdated)}
                            </Typography>
                            <Box display="flex" ml={2}>
                              {doc.tags.map(tag => (
                                <Chip 
                                  key={tag} 
                                  label={tag} 
                                  size="small"
                                  sx={{ mr: 0.5, height: 20, fontSize: '0.7rem' }}
                                />
                              ))}
                            </Box>
                          </Box>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="h6">No documents found</Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery ? 
                  'Try different search terms or browse all documents.' : 
                  'No documents are available in this category yet.'}
              </Typography>
              
              {session?.user && (session.user as any).role === 'admin' && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  component={Link}
                  href="/admin/documentation/create"
                  sx={{ mt: 2 }}
                >
                  Create First Document
                </Button>
              )}
            </Box>
          )}
        </>
      )}
    </Container>
  );
}

// Wrap with MainLayout
export default function WrappedCategoryPage({ params }: { params: { id: string } }) {
  return (
    <MainLayout>
      <CategoryDocumentationPage params={params} />
    </MainLayout>
  );
} 
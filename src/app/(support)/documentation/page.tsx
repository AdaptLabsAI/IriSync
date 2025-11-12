'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  TextField,
  InputAdornment,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import Link from 'next/link';
import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useSession } from 'next-auth/react';

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

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentDocs, setRecentDocs] = useState<DocPage[]>([]);
  const [popularDocs, setPopularDocs] = useState<DocPage[]>([]);
  const { data: session } = useSession();
  
  useEffect(() => {
    const fetchRecentDocs = async () => {
      try {
        const response = await fetch('/api/content/documentation?limit=5&sort=recent');
        if (response.ok) {
          const data = await response.json();
          setRecentDocs(data.docs || []);
        } else {
          console.error("Failed to fetch recent documentation");
          setRecentDocs([]);
        }
      } catch (error) {
        console.error("Error fetching recent documentation:", error);
        setRecentDocs([]);
      }
    };
    
    fetchRecentDocs();
  }, []);
  
  useEffect(() => {
    const fetchPopularDocs = async () => {
      try {
        const response = await fetch('/api/content/documentation?limit=5&sort=popular');
        if (response.ok) {
          const data = await response.json();
          setPopularDocs(data.docs || []);
        } else {
          console.error("Failed to fetch popular documentation");
          setPopularDocs([]);
        }
      } catch (error) {
        console.error("Error fetching popular documentation:", error);
        setPopularDocs([]);
      }
    };
    
    fetchPopularDocs();
  }, []);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Filter docs based on search query
  const filteredDocs = [...recentDocs, ...popularDocs]
    .filter((doc, index, self) => 
      // Remove duplicates
      index === self.findIndex((d) => d.id === doc.id)
    )
    .filter((doc) => 
      searchQuery === '' || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header & Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <Typography color="text.primary">Documentation</Typography>
        </Breadcrumbs>
        
        <Typography variant="h3" component="h1" gutterBottom>
          Documentation
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Find guides, tutorials, and reference materials for IriSync
        </Typography>

        {session?.user && (session.user as any).role === 'admin' && (
          <Box mt={2}>
            <Chip
              label="Create New Documentation"
              component={Link}
              href="/admin/documentation/create"
              clickable
              color="primary"
              sx={{ mr: 1 }}
            />
            <Chip
              label="Manage Documentation"
              component={Link}
              href="/admin/documentation/manage"
              clickable
              variant="outlined"
            />
          </Box>
        )}
      </Box>
      
      {/* Search */}
      <Box mb={6}>
        <TextField
          fullWidth
          placeholder="Search documentation..."
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
      
      {/* Categories */}
      {searchQuery === '' && (
        <Box mb={6}>
          <Typography variant="h5" component="h2" gutterBottom>
            Documentation Categories
          </Typography>
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3
            }}
          >
            {DOC_CATEGORIES.map((category) => (
              <Card 
                key={category.id}
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.shadows[4],
                  },
                  borderLeft: `4px solid ${category.color}`,
                }}
                component={Link}
                href={`/documentation/category/${category.id}`}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <FolderIcon sx={{ color: category.color, mr: 1 }} />
                    <Typography variant="h6" component="h3">
                      {category.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {category.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}
      
      {/* Recent and Popular docs */}
      {searchQuery === '' ? (
        <>
          {/* Recent Docs */}
          <Box mb={6}>
            <Typography variant="h5" component="h2" gutterBottom>
              Recently Updated
            </Typography>
            <Paper>
              <List>
                {recentDocs.map((doc) => (
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
                      <DescriptionIcon color="primary" />
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
          </Box>
          
          {/* Popular Docs */}
          <Box mb={6}>
            <Typography variant="h5" component="h2" gutterBottom>
              Most Popular
            </Typography>
            <Paper>
              <List>
                {popularDocs.map((doc) => (
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
                      <DescriptionIcon color="primary" />
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
          </Box>
        </>
      ) : (
        // Search Results
        <Box mb={6}>
          <Typography variant="h5" component="h2" gutterBottom>
            Search Results
          </Typography>
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
                      <DescriptionIcon color="primary" />
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
              <Typography variant="h6">No results found</Typography>
              <Typography variant="body2" color="text.secondary">
                Try different keywords or browse the categories
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
} 
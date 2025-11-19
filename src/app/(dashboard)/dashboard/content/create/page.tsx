'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import ContentCreationForm from '../../../../../components/content/ContentCreationForm';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '@/lib/core/firebase/client';
import { logger } from '@/lib/core/logging/logger';

export default function ContentCreationPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateContent = async (contentData: any) => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      if (!auth) {
        throw new Error('Authentication not initialized');
      }

      if (!firestore) {
        throw new Error('Firestore not initialized');
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to create content');
      }

      // Prepare content data with metadata
      const completeContentData = {
        ...contentData,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Unknown User',
        authorEmail: currentUser.email || 'unknown@example.com',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Save to Firestore
      const contentRef = collection(firestore, 'contentPosts');
      const docRef = await addDoc(contentRef, completeContentData);
      
      // Log activity
      const activityRef = collection(firestore, 'activities');
      await addDoc(activityRef, {
        type: 'content_created',
        userId: currentUser.uid,
        username: currentUser.displayName || 'User',
        contentId: docRef.id,
        contentTitle: contentData.title || 'Untitled Content',
        timestamp: serverTimestamp(),
        platform: contentData.platform || 'Unknown'
      });
      
      // Navigate to content list or editor
      router.push(`/dashboard/content/editor?id=${docRef.id}`);
    } catch (error) {
      console.error('Error creating content:', error);
      logger.error({
        type: 'content_creation_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      setError(`Failed to create content: ${error instanceof Error ? error.message : 'Unknown error'}. Collection: contentPosts`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Create Content</Typography>
        <Typography variant="body1" color="text.secondary">
          Create, preview, and schedule content for your social media platforms
        </Typography>
      </Box>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Paper sx={{ p: 0 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
              aria-label="content creation options"
            >
              <Tab label="Create Post" />
              <Tab label="AI Content Generator" disabled />
              <Tab label="Content Template" disabled />
            </Tabs>
            
            <Box sx={{ p: 3, position: 'relative' }}>
              {loading && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  zIndex: 1
                }}>
                  <CircularProgress />
                </Box>
              )}
              <ContentCreationForm onSubmit={handleCreateContent} disabled={loading} />
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
} 
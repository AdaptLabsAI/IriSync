'use client';

import { useState, useEffect } from 'react';
import { CircularProgress, Alert, Box, Button, Typography, Paper, Container } from '@mui/material';
import { doc, getDoc, updateDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { firestore, auth } from '@/lib/core/firebase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/core/logging/logger';
import ContentEditorForm from '../../../../../components/content/editor/ContentEditorForm';

interface ContentPost {
  id: string;
  title: string;
  content: string;
  platform: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: Date;
  authorId: string;
  authorName: string;
  createdAt: any;
  updatedAt: any;
  [key: string]: any; // Allow additional fields
}

export default function EditorPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<ContentPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams?.get('id');

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        
        if (!postId) {
          throw new Error('No post ID provided');
        }
        
        // Get current user
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('You must be logged in to edit content');
        }
        
        // Get post from Firestore
        const postRef = doc(firestore, 'contentPosts', postId);
        const postSnapshot = await getDoc(postRef);
        
        if (!postSnapshot.exists()) {
          throw new Error(`Post with ID ${postId} not found`);
        }
        
        const postData = postSnapshot.data();
        
        // Check if user has permission to edit this post
        if (postData.authorId !== currentUser.uid) {
          // For admins or team members, you could add additional checks here
          logger.warn({
            type: 'unauthorized_edit_attempt',
            userId: currentUser.uid,
            postId,
            postAuthorId: postData.authorId
          });
        }
        
        // Format Firebase data properly, especially dates
        const formattedPost: ContentPost = {
          id: postSnapshot.id,
          title: postData.title || 'Untitled',
          content: postData.content || '',
          platform: postData.platform || '',
          status: postData.status || 'draft',
          authorId: postData.authorId || '',
          authorName: postData.authorName || 'Unknown',
          createdAt: postData.createdAt,
          updatedAt: postData.updatedAt,
          scheduledFor: postData.scheduledFor ? postData.scheduledFor.toDate() : undefined
        };
        
        setPost(formattedPost);
      } catch (error) {
        console.error('Error fetching post:', error);
        logger.error({
          type: 'content_editor_fetch_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          postId
        });
        
        setError(`Failed to load post: ${error instanceof Error ? error.message : 'Unknown error'}. Collection: contentPosts, Document: ${postId}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (postId) {
      fetchData();
    } else {
      setError('No post ID provided in URL');
      setIsLoading(false);
    }
  }, [postId]);

  const handleSave = async (updatedData: Partial<ContentPost>) => {
    try {
      setIsSaving(true);
      setSaveError(null);
      
      if (!postId || !post) {
        throw new Error('No post data available');
      }
      
      // Get current user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to save changes');
      }
      
      // Update post in Firestore
      const postRef = doc(firestore, 'contentPosts', postId);
      await updateDoc(postRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setPost({
        ...post,
        ...updatedData,
        updatedAt: new Date()
      });
      
      // Log activity
      logger.info({
        type: 'content_updated',
        userId: currentUser.uid,
        postId,
        platform: updatedData.platform || post.platform
      });
      
      return true;
    } catch (error) {
      console.error('Error saving post:', error);
      logger.error({
        type: 'content_editor_save_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        postId
      });
      
      setSaveError(`Failed to save post: ${error instanceof Error ? error.message : 'Unknown error'}. Collection: contentPosts, Document: ${postId}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigateBack = () => {
    router.push('/dashboard/content');
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
          <CircularProgress size={48} />
          <Typography variant="h6" sx={{ mt: 2 }}>Loading post...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleNavigateBack}>
              Return to Content
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {post?.title || 'Edit Content'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Edit and update your content
        </Typography>
      </Box>
      
      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveError}
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        {post ? (
          <ContentEditorForm 
            post={post} 
            onSave={handleSave} 
            isSaving={isSaving} 
          />
        ) : (
          <Typography variant="body1" color="text.secondary">
            No post data available.
          </Typography>
        )}
      </Paper>
    </Container>
  );
} 
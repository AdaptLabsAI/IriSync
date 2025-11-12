'use client';

import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Breadcrumbs,
  Link as MuiLink,
  Alert,
  Chip,
  Divider,
  useTheme
} from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Define forum categories
const FORUM_CATEGORIES = [
  { id: 'general', name: 'General', icon: <ForumIcon />, color: '#00C957' },
  { id: 'help', name: 'Help & Support', icon: <QuestionAnswerIcon />, color: '#6A35D4' },
  { id: 'announcements', name: 'Announcements', icon: <NewReleasesIcon />, color: '#FFA500' },
  { id: 'tips', name: 'Tips & Tricks', icon: <TipsAndUpdatesIcon />, color: '#1E90FF' }
];

// Form validation schema
const forumPostSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  category: z.string().min(1, 'Please select a category'),
  content: z.string()
    .min(20, 'Content must be at least 20 characters')
    .max(5000, 'Content cannot exceed 5000 characters')
});

type ForumPostFormValues = z.infer<typeof forumPostSchema>;

export default function CreateDiscussionPage() {
  const theme = useTheme();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Initialize form
  const { 
    control, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<ForumPostFormValues>({
    resolver: zodResolver(forumPostSchema),
    defaultValues: {
      title: '',
      category: '',
      content: ''
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: ForumPostFormValues) => {
    if (!session?.user) {
      setSubmitError('You must be logged in to create a discussion');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // In a real application, this would be an API call
      // const response = await fetch('/api/forum/discussions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     ...data,
      //     authorId: session.user.id,
      //     authorName: session.user.name,
      //   })
      // });
      
      // Simulate successful submission with delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate API response
      const apiResponse = {
        success: true,
        discussionId: `disc-${Date.now()}`
      };
      
      // Success!
      setSubmitSuccess(true);
      
      // Redirect to the new discussion
      setTimeout(() => {
        router.push(`/support/forum/${apiResponse.discussionId}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error creating discussion:', error);
      setSubmitError('Failed to create discussion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Redirect if not logged in
  if (status === 'unauthenticated') {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="warning" sx={{ mb: 4 }}>
          You need to be logged in to create a discussion.
        </Alert>
        <Button 
          variant="contained" 
          component={Link} 
          href={`/auth/login?callbackUrl=${encodeURIComponent('/support/forum/create')}`}
        >
          Log In
        </Button>
      </Container>
    );
  }
  
  // Loading state
  if (status === 'loading') {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">
            Loading...
          </Typography>
        </Box>
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
          <MuiLink component={Link} href="/support" color="inherit">
            Support
          </MuiLink>
          <MuiLink component={Link} href="/support/forum" color="inherit">
            Forum
          </MuiLink>
          <Typography color="text.primary">Create Discussion</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Create a New Discussion
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Share your question, idea, or start a conversation with the community
        </Typography>
      </Box>
      
      {/* Success/Error Messages */}
      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 4 }}>
          Discussion created successfully! Redirecting...
        </Alert>
      )}
      
      {submitError && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {submitError}
        </Alert>
      )}
      
      {/* Form */}
      <Paper elevation={0} sx={{ p: 4, mb: 4, border: '1px solid', borderColor: 'divider' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Title */}
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Discussion Title"
                placeholder="Enter a concise title for your discussion"
                fullWidth
                margin="normal"
                error={!!errors.title}
                helperText={errors.title?.message}
                disabled={isSubmitting}
              />
            )}
          />
          
          {/* Category */}
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <FormControl 
                fullWidth
                margin="normal"
                error={!!errors.category}
                disabled={isSubmitting}
              >
                <InputLabel>Category</InputLabel>
                <Select
                  {...field}
                  label="Category"
                >
                  {FORUM_CATEGORIES.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 1, color: category.color }}>
                          {category.icon}
                        </Box>
                        {category.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.category && (
                  <FormHelperText>{errors.category.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />
          
          {/* Content */}
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Discussion Content"
                placeholder="Write the details of your question or topic here..."
                multiline
                rows={8}
                fullWidth
                margin="normal"
                error={!!errors.content}
                helperText={errors.content?.message}
                disabled={isSubmitting}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'inherit',
                  }
                }}
              />
            )}
          />
          
          <Divider sx={{ my: 3 }} />
          
          {/* Guidelines */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Community Guidelines:
            </Typography>
            <Typography variant="body2">
              • Be respectful and constructive in your discussions<br />
              • Provide context and details to help others understand your question<br />
              • Use appropriate categories to help others find your discussion<br />
              • Mark solutions when your question is answered
            </Typography>
          </Box>
          
          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              component={Link}
              href="/support/forum"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Post Discussion'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
} 
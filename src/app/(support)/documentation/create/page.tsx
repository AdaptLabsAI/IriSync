'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Autocomplete,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Breadcrumbs,
  Link as MuiLink,
  FormHelperText,
  CircularProgress
} from '@mui/material';
import Grid from '@/components/ui/grid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  doc, 
  collection, 
  addDoc, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase';
import RichTextEditor from '@/components/common/RichTextEditor';

// Fallback RichTextEditor if the imported one doesn't work
const FallbackEditor = ({ value, onChange, error }: { value: string, onChange: (value: string) => void, error?: boolean }) => {
  return (
    <TextField
      multiline
      fullWidth
      minRows={10}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      placeholder="Write content here..."
      sx={{ 
        '& .MuiOutlinedInput-root': {
          fontFamily: 'monospace',
        }
      }}
    />
  );
};

// Documentation category data (same as in the main documentation page)
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

// Common tags for autocompletion
const COMMON_TAGS = [
  'api', 'authentication', 'beginners', 'best-practices', 'configuration',
  'deployment', 'getting-started', 'integration', 'optimization', 'security',
  'troubleshooting', 'tutorial', 'update', 'webhook'
];

// Form validation schema
const documentSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(300, 'Description cannot exceed 300 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  tags: z.array(z.string()).min(1, 'Add at least one tag').max(10, 'Cannot add more than 10 tags')
});

type DocumentFormValues = z.infer<typeof documentSchema>;

export default function CreateDocumentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Initialize form 
  const { 
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors } 
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      categoryId: '',
      content: '',
      tags: []
    }
  });
  
  // Auto-generate slug when title changes
  const title = watch('title');
  useEffect(() => {
    if (title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
        
      setValue('slug', generatedSlug);
    }
  }, [title, setValue]);
  
  // Redirect if not admin
  useEffect(() => {
    if (status === 'authenticated') {
      const user = session?.user as any;
      if (!user?.role || user.role !== 'admin') {
        router.push('/documentation');
      }
    } else if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/documentation/create');
    }
  }, [session, status, router]);
  
  // Submit form handler
  const onSubmit = async (data: DocumentFormValues) => {
    if (!session?.user) return;
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const user = session.user as any;
      const docData = {
        title: data.title,
        slug: data.slug,
        description: data.description,
        categoryId: data.categoryId,
        content: data.content,
        tags: data.tags,
        status: 'published',
        viewCount: 0,
        createdAt: serverTimestamp(),
        createdBy: user.id || user.email,
        createdByName: user.name || 'Admin',
        updatedAt: serverTimestamp(),
        updatedBy: user.id || user.email,
        updatedByName: user.name || 'Admin',
        lastUpdated: Timestamp.now(),
        publishedAt: Timestamp.now(),
        path: `/documentation/${data.categoryId}/${data.slug}`
      };
      
      const docRef = await addDoc(collection(firestore, 'documentation'), docData);
      
      // Success!
      setSubmitSuccess(true);
      
      // Redirect after short delay
      setTimeout(() => {
        router.push(`/documentation/${data.categoryId}/${data.slug}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error creating document:', error);
      setSubmitError('Failed to create document. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state if still checking session
  if (status === 'loading') {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading...</Typography>
      </Container>
    );
  }
  
  // Check if user is admin
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  
  if (!isAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          You do not have permission to access this page.
        </Alert>
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
          <Typography color="text.primary">Create New Document</Typography>
        </Breadcrumbs>
        
        <Typography variant="h3" component="h1" gutterBottom>
          Create New Documentation
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Create a new documentation page for users
        </Typography>
      </Box>
      
      {/* Success/Error Messages */}
      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 4 }}>
          Document created successfully! Redirecting...
        </Alert>
      )}
      
      {submitError && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {submitError}
        </Alert>
      )}
      
      {/* Form */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Title */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                {...register('title')}
                error={!!errors.title}
                helperText={errors.title?.message}
                disabled={isSubmitting}
              />
            </Grid>
            
            {/* Slug */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Slug"
                {...register('slug')}
                error={!!errors.slug}
                helperText={errors.slug?.message || 'URL-friendly identifier for this document'}
                disabled={isSubmitting}
              />
            </Grid>
            
            {/* Category */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.categoryId}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      {...field}
                      label="Category"
                      disabled={isSubmitting}
                    >
                      {DOC_CATEGORIES.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.categoryId && (
                      <FormHelperText>{errors.categoryId.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            
            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                {...register('description')}
                error={!!errors.description}
                helperText={errors.description?.message}
                disabled={isSubmitting}
              />
            </Grid>
            
            {/* Tags */}
            <Grid item xs={12}>
              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.tags}>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={COMMON_TAGS}
                      value={field.value}
                      onChange={(_, newValue) => {
                        field.onChange(newValue);
                      }}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={option}
                            {...getTagProps({ index })}
                            key={index}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Tags"
                          error={!!errors.tags}
                          helperText={errors.tags?.message}
                          placeholder="Add tags"
                        />
                      )}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                )}
              />
            </Grid>
            
            {/* Content */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Content
              </Typography>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <Box sx={{ mb: 1 }}>
                    <FallbackEditor
                      value={field.value}
                      onChange={field.onChange}
                      error={!!errors.content}
                    />
                    {errors.content && (
                      <FormHelperText error>
                        {errors.content.message}
                      </FormHelperText>
                    )}
                  </Box>
                )}
              />
            </Grid>
            
            {/* Submit Button */}
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                component={Link}
                href="/documentation"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Document'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
} 
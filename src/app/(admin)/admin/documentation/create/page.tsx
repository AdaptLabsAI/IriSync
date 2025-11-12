'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  Autocomplete,
  Chip,
  FormHelperText,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';
import {
  KnowledgeContentType,
  KnowledgeStatus,
  KnowledgeAccessLevel
} from '@/lib/features/knowledge/models';
import dynamic from 'next/dynamic';
import AdminLayout from '@/components/layouts/AdminLayout';
import Grid from '@/components/ui/grid';

// Dynamically import the rich text editor to avoid SSR issues
const RichTextEditor = dynamic(() => import('@/components/common/RichTextEditor/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <Box sx={{ minHeight: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <CircularProgress />
    </Box>
  )
});

// Validation schema
const createDocumentationSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  content: z.string().min(20, 'Content must be at least 20 characters'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()),
  status: z.enum([
    KnowledgeStatus.DRAFT,
    KnowledgeStatus.PUBLISHED,
    KnowledgeStatus.ARCHIVED
  ]),
  accessLevel: z.enum([
    KnowledgeAccessLevel.PUBLIC,
    KnowledgeAccessLevel.REGISTERED,
    KnowledgeAccessLevel.PAID,
    KnowledgeAccessLevel.INFLUENCER,
    KnowledgeAccessLevel.ENTERPRISE,
    KnowledgeAccessLevel.PRIVATE
  ]),
  excerpt: z.string().optional(),
  includeInSitemap: z.boolean().default(true),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).default([])
});

type FormData = z.infer<typeof createDocumentationSchema>;

const CreateDocumentationPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<string>('');
  const [showNewCategoryField, setShowNewCategoryField] = useState(false);
  const [expandSeo, setExpandSeo] = useState(false);

  // Setup form
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(createDocumentationSchema) as any,
    defaultValues: {
      title: '',
      content: '',
      category: '',
      tags: [],
      status: KnowledgeStatus.DRAFT,
      accessLevel: KnowledgeAccessLevel.PUBLIC,
      excerpt: '',
      includeInSitemap: true,
      seoTitle: '',
      seoDescription: '',
      seoKeywords: []
    }
  });

  // Watch for current status value
  const statusValue = watch('status');
  const titleValue = watch('title');

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/admin/knowledge/categories');
        
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories.map((cat: any) => cat.name));
        } else {
          toast.error({
            title: 'Error',
            description: 'Failed to fetch categories'
          });
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error({
          title: 'Error',
          description: 'Failed to fetch categories'
        });
      }
    };

    fetchCategories();
  }, []);

  // Update SEO title when main title changes
  useEffect(() => {
    if (titleValue && !watch('seoTitle')) {
      setValue('seoTitle', titleValue);
    }
  }, [titleValue, setValue, watch]);

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      // Handle new category creation if needed
      if (showNewCategoryField && newCategory) {
        // Add the new category to the knowledge categories
        const categoryResponse = await fetch('/api/admin/knowledge/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: newCategory })
        });

        if (!categoryResponse.ok) {
          throw new Error('Failed to create new category');
        }

        // Update the data to use the new category
        data.category = newCategory;
      }

      // Prepare the documentation data
      const documentationData = {
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags,
        status: data.status,
        accessLevel: data.accessLevel,
        excerpt: data.excerpt,
        seo: {
          title: data.seoTitle || data.title,
          description: data.seoDescription,
          keywords: data.seoKeywords
        }
      };

      // Create the documentation
      const response = await fetch('/api/admin/documentation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(documentationData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create documentation');
      }

      toast.success({
        title: 'Success',
        description: 'Documentation created successfully'
      });

      router.push('/admin/documentation');
    } catch (error) {
      console.error('Error creating documentation:', error);
      toast.error({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create documentation'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/admin/documentation')}
            sx={{ mr: 2 }}
          >
            Back to Documentation
          </Button>
          <Typography variant="h4">Create Documentation</Typography>
        </Box>

        <form onSubmit={handleSubmit(onSubmit as any)}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3}>
              {/* Title */}
              <Grid item xs={12}>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Title"
                      fullWidth
                      error={!!errors.title}
                      helperText={errors.title?.message}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>

              {/* Category */}
              <Grid item xs={12} md={6}>
                {!showNewCategoryField ? (
                  <>
                    <Controller
                      name="category"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.category}>
                          <InputLabel id="category-label">Category</InputLabel>
                          <Select
                            {...field}
                            labelId="category-label"
                            label="Category"
                            disabled={loading}
                          >
                            {categories.map((category) => (
                              <MenuItem key={category} value={category}>
                                {category}
                              </MenuItem>
                            ))}
                            <MenuItem value="__new__" onClick={() => setShowNewCategoryField(true)}>
                              <em>+ Add New Category</em>
                            </MenuItem>
                          </Select>
                          {errors.category && (
                            <FormHelperText>{errors.category.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  </>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      label="New Category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      fullWidth
                      autoFocus
                      disabled={loading}
                    />
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setShowNewCategoryField(false)}
                      startIcon={<CloseIcon />}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Grid>

              {/* Status */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.status}>
                      <InputLabel id="status-label">Status</InputLabel>
                      <Select
                        {...field}
                        labelId="status-label"
                        label="Status"
                        disabled={loading}
                      >
                        <MenuItem value={KnowledgeStatus.DRAFT}>Draft</MenuItem>
                        <MenuItem value={KnowledgeStatus.PUBLISHED}>Published</MenuItem>
                        <MenuItem value={KnowledgeStatus.ARCHIVED}>Archived</MenuItem>
                      </Select>
                      {errors.status && (
                        <FormHelperText>{errors.status.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Access Level */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="accessLevel"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.accessLevel}>
                      <InputLabel id="access-level-label">Access Level</InputLabel>
                      <Select
                        {...field}
                        labelId="access-level-label"
                        label="Access Level"
                        disabled={loading}
                      >
                        <MenuItem value={KnowledgeAccessLevel.PUBLIC}>Public (Everyone)</MenuItem>
                        <MenuItem value={KnowledgeAccessLevel.REGISTERED}>Registered Users</MenuItem>
                        <MenuItem value={KnowledgeAccessLevel.PAID}>Paid Subscribers</MenuItem>
                        <MenuItem value={KnowledgeAccessLevel.INFLUENCER}>Influencer Tier+</MenuItem>
                        <MenuItem value={KnowledgeAccessLevel.ENTERPRISE}>Enterprise Tier Only</MenuItem>
                        <MenuItem value={KnowledgeAccessLevel.PRIVATE}>Private (Admins Only)</MenuItem>
                      </Select>
                      {errors.accessLevel && (
                        <FormHelperText>{errors.accessLevel.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Tags */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="tags"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      multiple
                      options={[]}
                      freeSolo
                      value={field.value}
                      onChange={(_, newValue) => field.onChange(newValue)}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const { key, ...tagProps } = getTagProps({ index });
                          return (
                            <Chip
                              key={key}
                              label={option} 
                              {...tagProps} 
                            />
                          );
                        })
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Tags"
                          placeholder="Add tags"
                          helperText="Press Enter to add a tag"
                          error={!!errors.tags}
                        />
                      )}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>

              {/* Excerpt */}
              <Grid item xs={12}>
                <Controller
                  name="excerpt"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Excerpt"
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="A brief summary of the documentation (used in listings and search results)"
                      error={!!errors.excerpt}
                      helperText={errors.excerpt?.message || ''}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* SEO Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: expandSeo ? 2 : 0
            }}>
              <Typography variant="h6">SEO Settings</Typography>
              <Button 
                onClick={() => setExpandSeo(!expandSeo)}
                color="primary"
              >
                {expandSeo ? 'Collapse' : 'Expand'}
              </Button>
            </Box>
            
            {expandSeo && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Controller
                        name="includeInSitemap"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            disabled={loading}
                          />
                        )}
                      />
                    }
                    label="Include in sitemap"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Controller
                    name="seoTitle"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="SEO Title"
                        fullWidth
                        placeholder="Leave empty to use the main title"
                        disabled={loading}
                      />
                    )}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Controller
                    name="seoDescription"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="SEO Description"
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Meta description for search engines"
                        disabled={loading}
                      />
                    )}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Controller
                    name="seoKeywords"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        options={[]}
                        freeSolo
                        value={field.value}
                        onChange={(_, newValue) => field.onChange(newValue)}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => {
                            const { key, ...tagProps } = getTagProps({ index });
                            return (
                              <Chip
                                key={key}
                                label={option} 
                                {...tagProps} 
                              />
                            );
                          })
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="SEO Keywords"
                            placeholder="Add keywords"
                            helperText="Press Enter to add a keyword"
                          />
                        )}
                        disabled={loading}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            )}
          </Paper>

          {/* Content Editor */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Content</Typography>
            
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <>
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    disabled={loading}
                  />
                  {errors.content && (
                    <FormHelperText error>{errors.content.message}</FormHelperText>
                  )}
                </>
              )}
            />
          </Paper>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => router.push('/admin/documentation')}
              startIcon={<CloseIcon />}
              disabled={loading}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={loading}
            >
              {statusValue === KnowledgeStatus.DRAFT ? 'Save as Draft' : 'Publish'}
            </Button>
          </Box>
        </form>
      </Box>
    </AdminLayout>
  );
};

export default CreateDocumentationPage; 
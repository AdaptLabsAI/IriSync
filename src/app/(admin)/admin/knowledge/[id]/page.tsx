'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AdminGuard from '@/components/admin/AdminGuard';
import RichTextEditor from '@/components/common/RichTextEditor';
import useApi from '@/hooks/useApi';
import { KnowledgeContentType, KnowledgeStatus, KnowledgeAccessLevel } from '@/lib/knowledge/models';

// Categories for dropdown
const CATEGORIES = [
  'Getting Started',
  'User Guide',
  'Tutorials',
  'Troubleshooting',
  'FAQs',
  'API Documentation',
  'Best Practices',
  'Release Notes'
];

interface PageProps {
  params: {
    id: string;
  };
}

interface KnowledgeArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  contentType: KnowledgeContentType;
  category: string;
  tags: string[];
  status: KnowledgeStatus;
  accessLevel: KnowledgeAccessLevel;
  slug: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  excerpt?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  relatedContentIds?: string[];
}

interface ApiResponse {
  content: KnowledgeArticle;
}

export default function EditKnowledgeArticlePage({ params }: PageProps) {
  const router = useRouter();
  const { id } = params;
  
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({
    title: '',
    description: '',
    category: '',
    content: ''
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: [] as string[],
    content: '',
    contentType: KnowledgeContentType.DOCUMENTATION,
    accessLevel: KnowledgeAccessLevel.PRIVATE,
    status: KnowledgeStatus.DRAFT,
    excerpt: ''
  });
  
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  
  // Fetch article data
  const { 
    data, 
    isLoading: isLoadingArticle, 
    error: fetchError, 
    refetch 
  } = useApi<ApiResponse>(`/api/admin/knowledge/${id}`, {
    method: 'GET'
  });
  
  // Update article data
  const {
    isLoading: isUpdating,
    error: updateError,
    patch
  } = useApi<any>(`/api/admin/knowledge/${id}`, {}, false);
  
  // When data is fetched, populate the form
  useEffect(() => {
    if (data?.content) {
      const { content } = data;
      setFormData({
        title: content.title || '',
        description: content.description || '',
        category: content.category || '',
        tags: content.tags || [],
        content: content.content || '',
        contentType: content.contentType || KnowledgeContentType.DOCUMENTATION,
        accessLevel: content.accessLevel || KnowledgeAccessLevel.PRIVATE,
        status: content.status || KnowledgeStatus.DRAFT,
        excerpt: content.excerpt || ''
      });
    }
  }, [data]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value
    });
    
    // Clear error when field is edited
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name as string]: ''
      });
    }
  };
  
  // Handle select changes specifically
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value
    });
    
    // Clear error when field is edited
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name as string]: ''
      });
    }
  };
  
  const handleContentChange = (content: string) => {
    setFormData({
      ...formData,
      content
    });
    
    // Clear error when content is edited
    if (errors.content) {
      setErrors({
        ...errors,
        content: ''
      });
    }
  };
  
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };
  
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() !== '') {
      e.preventDefault();
      
      // Only add if not already in tags
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tagInput.trim()]
        });
      }
      
      setTagInput('');
    }
  };
  
  const handleDeleteTag = (tagToDelete: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToDelete)
    });
  };
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isPublished = e.target.checked;
    setFormData({
      ...formData,
      status: isPublished ? KnowledgeStatus.PUBLISHED : KnowledgeStatus.DRAFT
    });
  };
  
  const validateForm = () => {
    const newErrors = {
      title: '',
      description: '',
      category: '',
      content: ''
    };
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }
    
    setErrors(newErrors);
    
    // Form is valid if all error fields are empty
    return !Object.values(newErrors).some(error => error);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await patch(formData);
      
      setNotification({
        open: true,
        message: 'Article updated successfully',
        severity: 'success'
      });
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.push('/admin/knowledge');
      }, 1500);
    } catch (error) {
      setNotification({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to update article',
        severity: 'error'
      });
    }
  };
  
  const handleCancel = () => {
    router.push('/admin/knowledge');
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // Render loading state
  if (isLoadingArticle) {
    return (
      <AdminGuard>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </AdminGuard>
    );
  }

  // Render error state
  if (fetchError) {
    return (
      <AdminGuard>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1">Edit Knowledge Article</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Update article #{id}
          </Typography>
        </Box>
        
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Error loading article: {fetchError.message || 'Failed to load article'}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            API: /api/admin/knowledge/{id}
          </Typography>
        </Alert>
        
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleCancel}
          sx={{ mt: 2 }}
        >
          Return to Knowledge Base
        </Button>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">Edit Knowledge Article</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Update article #{id}
        </Typography>
      </Box>
      
      {updateError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error updating article: {updateError.message || 'Failed to update article'}
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Title field */}
            <TextField
              name="title"
              label="Title"
              fullWidth
              required
              value={formData.title}
              onChange={handleChange}
              error={!!errors.title}
              helperText={errors.title}
            />
            
            {/* Description field */}
            <TextField
              name="description"
              label="Description"
              fullWidth
              required
              multiline
              rows={2}
              value={formData.description}
              onChange={handleChange}
              error={!!errors.description}
              helperText={errors.description}
            />
            
            {/* Two-column layout for category and content type */}
            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
              <FormControl fullWidth required error={!!errors.category}>
                <InputLabel id="category-label">Category</InputLabel>
                <Select
                  labelId="category-label"
                  name="category"
                  value={formData.category}
                  label="Category"
                  onChange={handleSelectChange}
                >
                  {CATEGORIES.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
                {errors.category && (
                  <Typography variant="caption" color="error">
                    {errors.category}
                  </Typography>
                )}
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel id="content-type-label">Content Type</InputLabel>
                <Select
                  labelId="content-type-label"
                  name="contentType"
                  value={formData.contentType}
                  label="Content Type"
                  onChange={handleSelectChange}
                >
                  <MenuItem value={KnowledgeContentType.DOCUMENTATION}>Documentation</MenuItem>
                  <MenuItem value={KnowledgeContentType.TUTORIAL}>Tutorial</MenuItem>
                  <MenuItem value={KnowledgeContentType.FAQ}>FAQ</MenuItem>
                  <MenuItem value={KnowledgeContentType.TROUBLESHOOTING}>Troubleshooting</MenuItem>
                  <MenuItem value={KnowledgeContentType.GUIDE}>Guide</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            {/* Two-column layout for tags and access level */}
            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Tags (press Enter to add)"
                  fullWidth
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleAddTag}
                />
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {formData.tags.map(tag => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      onDelete={() => handleDeleteTag(tag)}
                    />
                  ))}
                </Box>
              </Box>
              
              <FormControl fullWidth>
                <InputLabel id="access-level-label">Access Level</InputLabel>
                <Select
                  labelId="access-level-label"
                  name="accessLevel"
                  value={formData.accessLevel}
                  label="Access Level"
                  onChange={handleSelectChange}
                >
                  <MenuItem value={KnowledgeAccessLevel.PUBLIC}>Public</MenuItem>
                  <MenuItem value={KnowledgeAccessLevel.REGISTERED}>Registered Users</MenuItem>
                  <MenuItem value={KnowledgeAccessLevel.PAID}>Paid Subscribers</MenuItem>
                  <MenuItem value={KnowledgeAccessLevel.INFLUENCER}>Influencer Plan</MenuItem>
                  <MenuItem value={KnowledgeAccessLevel.ENTERPRISE}>Enterprise</MenuItem>
                  <MenuItem value={KnowledgeAccessLevel.PRIVATE}>Private (Admin Only)</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            {/* Published switch */}
            <Box>
              <FormControlLabel
                control={
                  <Switch 
                    checked={formData.status === KnowledgeStatus.PUBLISHED}
                    onChange={handleStatusChange}
                    color="primary"
                  />
                }
                label={formData.status === KnowledgeStatus.PUBLISHED ? "Published" : "Draft"}
              />
            </Box>
            
            {/* Content editor */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Content
              </Typography>
              {errors.content && (
                <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
                  {errors.content}
                </Typography>
              )}
              <Paper variant="outlined" sx={{ p: 1 }}>
                <RichTextEditor 
                  initialValue={formData.content} 
                  onChange={handleContentChange} 
                />
              </Paper>
            </Box>
            
            {/* Action buttons */}
            <Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button 
                  variant="outlined"
                  onClick={handleCancel}
                  startIcon={<ArrowBackIcon />}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </Box>
        </form>
      </Paper>
      
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={notification.severity} onClose={handleCloseNotification}>
          {notification.message}
        </Alert>
      </Snackbar>
    </AdminGuard>
  );
} 
'use client';

import React, { useState } from 'react';
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

// RichTextEditor component interface
interface RichTextEditorProps {
  initialValue?: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

// Import the RichTextEditor dynamically to avoid prop type errors
const RichTextEditor = (props: RichTextEditorProps) => {
  const DynamicRichTextEditor = React.lazy(() => 
    import('@/components/common/RichTextEditor')
  );
  
  return (
    <React.Suspense fallback={<Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>}>
      <DynamicRichTextEditor {...props} />
    </React.Suspense>
  );
};

export default function NewKnowledgeArticlePage() {
  const router = useRouter();
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
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({
    title: '',
    description: '',
    category: '',
    content: ''
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  
  // Create knowledge article API
  const {
    isLoading: isCreating,
    error: createError,
    post
  } = useApi<{ id: string }>('/api/admin/knowledge', {}, false);
  
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
  const handleSelectChange = (e: SelectChangeEvent) => {
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
      const response = await post(formData);
      
      setNotification({
        open: true,
        message: 'Article created successfully',
        severity: 'success'
      });
      
      // Navigate to the new article after a short delay
      setTimeout(() => {
        if (response?.id) {
          router.push(`/admin/knowledge/${response.id}`);
        } else {
          router.push('/admin/knowledge');
        }
      }, 1500);
    } catch (error) {
      setNotification({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to create article',
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

  return (
    <AdminGuard>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">Create Knowledge Article</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Add a new article to the knowledge base
        </Typography>
      </Box>
      
      {createError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error creating article: {createError.message || 'Failed to create article'}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            API: /api/admin/knowledge
          </Typography>
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                  placeholder="Enter article content here..."
                />
              </Paper>
            </Box>
            
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
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Creating...
                    </>
                  ) : 'Create Article'}
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
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Rating,
  FormControlLabel,
  Switch,
  Alert,
  Stack,
  CircularProgress,
  Divider,
  Avatar,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AdminGuard from '@/components/admin/AdminGuard';

interface TestimonialData {
  id?: string;
  name: string;
  role: string;
  company: string;
  content: string;
  avatar?: string;
  rating: number;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function TestimonialEditPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params?.id === 'new';
  const testimonialId = !isNew ? params?.id as string : null;

  const [testimonial, setTestimonial] = useState<TestimonialData>({
    name: '',
    role: '',
    company: '',
    content: '',
    avatar: '',
    rating: 5,
    isPublished: false
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch testimonial data if editing an existing testimonial
  useEffect(() => {
    if (!isNew && testimonialId) {
      fetchTestimonial();
    }
  }, [testimonialId, isNew]);

  const fetchTestimonial = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/testimonials/${testimonialId}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setTestimonial(data);
    } catch (err) {
      console.error('Error fetching testimonial:', err);
      setError('Failed to load testimonial data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTestimonial({
      ...testimonial,
      [name]: value
    });
  };

  const handleRatingChange = (_: React.SyntheticEvent, newValue: number | null) => {
    setTestimonial({
      ...testimonial,
      rating: newValue || 0
    });
  };

  const handlePublishedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTestimonial({
      ...testimonial,
      isPublished: e.target.checked
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate required fields
      const requiredFields = ['name', 'role', 'company', 'content'];
      const missingFields = requiredFields.filter(field => !testimonial[field as keyof TestimonialData]);
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      }
      
      // Create or update testimonial
      const url = isNew 
        ? '/api/admin/testimonials' 
        : `/api/admin/testimonials/${testimonialId}`;
      
      const method = isNew ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testimonial),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      
      const savedTestimonial = await response.json();
      
      if (isNew) {
        // If creating a new testimonial, redirect to the edit page for the new testimonial
        setSuccess('Testimonial created successfully');
        setTimeout(() => {
          router.push(`/admin/testimonials/${savedTestimonial.id}`);
        }, 1500);
      } else {
        // If updating an existing testimonial, stay on the same page
        setTestimonial(savedTestimonial);
        setSuccess('Testimonial updated successfully');
      }
    } catch (err) {
      console.error('Error saving testimonial:', err);
      setError((err as Error).message || 'Failed to save testimonial');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push('/admin/testimonials');
  };

  return (
    <AdminGuard>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Testimonials
        </Button>
        
        <Typography variant="h4" component="h1">
          {isNew ? 'Add New Testimonial' : 'Edit Testimonial'}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          {isNew 
            ? 'Create a new customer testimonial' 
            : 'Update the details of this testimonial'}
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Avatar 
                src={testimonial.avatar} 
                alt={testimonial.name || 'Customer'} 
                sx={{ width: 80, height: 80 }}
              >
                {testimonial.name ? testimonial.name.charAt(0) : '?'}
              </Avatar>
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Customer Photo (optional)
                </Typography>
                <TextField
                  fullWidth
                  name="avatar"
                  label="Avatar URL"
                  value={testimonial.avatar || ''}
                  onChange={handleInputChange}
                  size="small"
                  placeholder="https://example.com/avatar.jpg"
                  InputProps={{
                    endAdornment: (
                      <IconButton size="small" component="span">
                        <PhotoCameraIcon />
                      </IconButton>
                    ),
                  }}
                  helperText="Enter URL for customer photo"
                />
              </Box>
            </Stack>
            
            <Divider />
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                required
                name="name"
                label="Customer Name"
                value={testimonial.name}
                onChange={handleInputChange}
                error={!testimonial.name}
                helperText={!testimonial.name ? 'Name is required' : ''}
              />
              
              <TextField
                fullWidth
                required
                name="role"
                label="Position/Title"
                value={testimonial.role}
                onChange={handleInputChange}
                error={!testimonial.role}
                helperText={!testimonial.role ? 'Position is required' : ''}
              />
            </Stack>
            
            <TextField
              fullWidth
              required
              name="company"
              label="Company"
              value={testimonial.company}
              onChange={handleInputChange}
              error={!testimonial.company}
              helperText={!testimonial.company ? 'Company is required' : ''}
            />
            
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Rating
              </Typography>
              <Rating
                name="rating"
                value={testimonial.rating}
                onChange={handleRatingChange}
                size="large"
                precision={0.5}
              />
            </Box>
            
            <TextField
              fullWidth
              required
              name="content"
              label="Testimonial Content"
              value={testimonial.content}
              onChange={handleInputChange}
              multiline
              rows={5}
              error={!testimonial.content}
              helperText={
                !testimonial.content
                  ? 'Testimonial content is required'
                  : `${testimonial.content.length} characters (recommended: 100-250 characters)`
              }
            />
            
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={testimonial.isPublished}
                    onChange={handlePublishedChange}
                    name="isPublished"
                  />
                }
                label="Published (visible on website)"
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
              >
                Cancel
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : isNew ? 'Create Testimonial' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}
    </AdminGuard>
  );
} 
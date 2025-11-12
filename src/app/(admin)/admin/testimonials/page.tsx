'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  Rating,
  Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SearchIcon from '@mui/icons-material/Search';
import AdminGuard from '@/components/admin/AdminGuard';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  avatar?: string;
  rating: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
}

export default function TestimonialsManagementPage() {
  const router = useRouter();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testimonialToDelete, setTestimonialToDelete] = useState<Testimonial | null>(null);
  const [publishingStatus, setPublishingStatus] = useState<Record<string, boolean>>({});

  // Fetch testimonials
  const fetchTestimonials = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/testimonials');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setTestimonials(data);
    } catch (err) {
      console.error('Error fetching testimonials:', err);
      setError('Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  // Handle search
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Filter testimonials based on search query
  const filteredTestimonials = testimonials.filter(testimonial => {
    const searchLower = searchQuery.toLowerCase();
    return (
      testimonial.name.toLowerCase().includes(searchLower) ||
      testimonial.role.toLowerCase().includes(searchLower) ||
      testimonial.company.toLowerCase().includes(searchLower) ||
      testimonial.content.toLowerCase().includes(searchLower)
    );
  });

  // Handle create new testimonial
  const handleCreateTestimonial = () => {
    router.push('/admin/testimonials/new');
  };

  // Handle edit testimonial
  const handleEditTestimonial = (id: string) => {
    router.push(`/admin/testimonials/${id}`);
  };

  // Handle delete testimonial dialog
  const handleDeleteDialogOpen = (testimonial: Testimonial) => {
    setTestimonialToDelete(testimonial);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setTestimonialToDelete(null);
  };

  // Handle delete testimonial
  const handleDeleteTestimonial = async () => {
    if (!testimonialToDelete) return;
    
    try {
      const response = await fetch(`/api/admin/testimonials/${testimonialToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Update UI by removing the deleted testimonial
      setTestimonials(prev => prev.filter(t => t.id !== testimonialToDelete.id));
      handleDeleteDialogClose();
    } catch (err) {
      console.error('Error deleting testimonial:', err);
      setError('Failed to delete testimonial');
    }
  };

  // Handle toggle publish status
  const handleTogglePublish = async (testimonial: Testimonial) => {
    // Set loading state for this specific testimonial
    setPublishingStatus(prev => ({ ...prev, [testimonial.id]: true }));
    
    try {
      const response = await fetch(`/api/admin/testimonials/${testimonial.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testimonial,
          isPublished: !testimonial.isPublished,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const updatedTestimonial = await response.json();
      
      // Update the testimonials array with the updated testimonial
      setTestimonials(prev => 
        prev.map(t => (t.id === testimonial.id ? updatedTestimonial : t))
      );
    } catch (err) {
      console.error('Error updating testimonial publish status:', err);
      setError('Failed to update testimonial status');
    } finally {
      setPublishingStatus(prev => ({ ...prev, [testimonial.id]: false }));
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <AdminGuard>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">Testimonials Management</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Create and manage customer testimonials
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <TextField
          placeholder="Search testimonials..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateTestimonial}
        >
          Add Testimonial
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date Added</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTestimonials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No testimonials found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTestimonials.map((testimonial) => (
                  <TableRow key={testimonial.id}>
                    <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                      {testimonial.avatar ? (
                        <Avatar src={testimonial.avatar} alt={testimonial.name} sx={{ mr: 2 }} />
                      ) : (
                        <Avatar sx={{ mr: 2 }}>{testimonial.name.charAt(0)}</Avatar>
                      )}
                      {testimonial.name}
                    </TableCell>
                    <TableCell>{testimonial.role}</TableCell>
                    <TableCell>
                      <Rating value={testimonial.rating} readOnly size="small" />
                    </TableCell>
                    <TableCell>{testimonial.company}</TableCell>
                    <TableCell>
                      <Chip 
                        label={testimonial.isPublished ? 'Published' : 'Draft'} 
                        color={testimonial.isPublished ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(testimonial.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={testimonial.isPublished ? 'Unpublish' : 'Publish'}>
                        <IconButton 
                          onClick={() => handleTogglePublish(testimonial)}
                          disabled={publishingStatus[testimonial.id]}
                          color={testimonial.isPublished ? 'success' : 'default'}
                        >
                          {publishingStatus[testimonial.id] ? (
                            <CircularProgress size={24} />
                          ) : testimonial.isPublished ? (
                            <VisibilityIcon />
                          ) : (
                            <VisibilityOffIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleEditTestimonial(testimonial.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          onClick={() => handleDeleteDialogOpen(testimonial)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
      >
        <DialogTitle>Delete Testimonial</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the testimonial from <strong>{testimonialToDelete?.name}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={handleDeleteTestimonial} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </AdminGuard>
  );
} 
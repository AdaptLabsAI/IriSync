'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import Grid from '@/components/ui/grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSession } from 'next-auth/react';
import { doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';

// RoadmapItem interface
interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'completed' | 'considering';
  timeframe: string;
  category: string;
  voteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminRoadmapPage() {
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [editItem, setEditItem] = useState<RoadmapItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'planned' as 'planned' | 'in-progress' | 'completed' | 'considering',
    timeframe: '',
    category: ''
  });
  const { data: session } = useSession();

  useEffect(() => {
    fetchRoadmapItems();
  }, []);

  const fetchRoadmapItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/roadmap');
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setRoadmapItems(data);
    } catch (error) {
      console.error('Failed to fetch roadmap items:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load roadmap items',
        severity: 'error'
      });
      setRoadmapItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value
    });
  };

  const handleOpenDialog = (item?: RoadmapItem) => {
    if (item) {
      // Edit mode
      setEditItem(item);
      setFormData({
        title: item.title,
        description: item.description,
        status: item.status,
        timeframe: item.timeframe,
        category: item.category
      });
    } else {
      // Add mode
      setEditItem(null);
      setFormData({
        title: '',
        description: '',
        status: 'planned',
        timeframe: '',
        category: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmDelete = (item: RoadmapItem) => {
    setEditItem(item);
    setOpenDeleteDialog(true);
  };

  const handleDeleteItem = async () => {
    if (!editItem || !firestore) return;

    try {
      // Delete from Firestore using the correct collection name
      await deleteDoc(doc(firestore, 'roadmapItems', editItem.id));
      
      // Update local state
      setRoadmapItems(roadmapItems.filter(item => item.id !== editItem.id));
      
      setSnackbar({
        open: true,
        message: 'Roadmap item deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting roadmap item:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete roadmap item',
        severity: 'error'
      });
    } finally {
      setOpenDeleteDialog(false);
      setEditItem(null);
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.title || !formData.description || !formData.status || !formData.timeframe || !formData.category) {
      setSnackbar({
        open: true,
        message: 'Please fill all required fields',
        severity: 'error'
      });
      return;
    }

    try {
      if (editItem) {
        // Update existing item using the correct collection name
        if (!firestore) {
          throw new Error('Firestore not initialized');
        }
        await updateDoc(doc(firestore, 'roadmapItems', editItem.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });

        // Update local state
        setRoadmapItems(roadmapItems.map(item => 
          item.id === editItem.id 
            ? { ...item, ...formData, updatedAt: new Date() }
            : item
        ));

        setSnackbar({
          open: true,
          message: 'Roadmap item updated successfully',
          severity: 'success'
        });
      } else {
        // Add new item
        const response = await fetch('/api/admin/roadmap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const newItem = await response.json();
        setRoadmapItems([newItem, ...roadmapItems]);

        setSnackbar({
          open: true,
          message: 'Roadmap item added successfully',
          severity: 'success'
        });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error saving roadmap item:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save roadmap item',
        severity: 'error'
      });
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return <Chip label="Completed" color="success" size="small" />;
      case 'in-progress':
        return <Chip label="In Progress" color="primary" size="small" />;
      case 'planned':
        return <Chip label="Planned" color="info" size="small" />;
      case 'considering':
        return <Chip label="Considering" color="warning" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Roadmap
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Item
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Timeframe</TableCell>
                <TableCell>Votes</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roadmapItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>{getStatusChip(item.status)}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.timeframe}</TableCell>
                  <TableCell>{item.voteCount}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(item)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleConfirmDelete(item)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {roadmapItems.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography sx={{ py: 2 }}>No roadmap items found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editItem ? 'Edit Roadmap Item' : 'Add New Roadmap Item'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    label="Status"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="planned">Planned</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="considering">Considering</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Timeframe"
                  name="timeframe"
                  value={formData.timeframe}
                  onChange={handleInputChange}
                  placeholder="e.g. Q3 2025"
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editItem ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{editItem?.title}&quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteItem} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
} 
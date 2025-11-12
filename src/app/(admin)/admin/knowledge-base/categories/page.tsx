'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Snackbar,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import AdminGuard from '@/components/admin/AdminGuard';
import useApi from '@/hooks/useApi';

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  title: string;
  initialValue?: string;
  loading?: boolean;
}

const CategoryDialog: React.FC<CategoryDialogProps> = ({ 
  open, 
  onClose, 
  onSave, 
  title, 
  initialValue = '',
  loading = false 
}) => {
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState('');

  useEffect(() => {
    // Reset form when dialog opens/closes
    if (open) {
      setName(initialValue);
      setError('');
    }
  }, [open, initialValue]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }
    onSave(name.trim());
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Category Name"
          fullWidth
          required
          value={name}
          onChange={handleNameChange}
          error={!!error}
          helperText={error}
          disabled={loading}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function KnowledgeCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [dialogState, setDialogState] = useState({
    open: false,
    isEdit: false,
    currentCategory: '',
    title: ''
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    open: false,
    category: ''
  });

  // API hooks
  const { 
    data, 
    isLoading: isLoadingCategories, 
    error: fetchError,
    refetch
  } = useApi<{ categories: string[] }>('/api/admin/knowledge-base/categories');

  const {
    isLoading: isSaving,
    error: saveError,
    post: createCategory
  } = useApi<any>('/api/admin/knowledge-base/categories', {}, false);

  const {
    isLoading: isDeleting,
    error: deleteError,
    post: deleteCategory
  } = useApi<any>('/api/admin/knowledge-base/categories/delete', {}, false);

  // Update local state when data is fetched
  useEffect(() => {
    if (data?.categories) {
      setCategories(data.categories);
    }
  }, [data]);

  // Navigate back to knowledge base
  const handleBack = () => {
    router.push('/admin/knowledge-base');
  };

  // Open dialog to add new category
  const handleAddCategory = () => {
    setDialogState({
      open: true,
      isEdit: false,
      currentCategory: '',
      title: 'Add Category'
    });
  };

  // Open dialog to edit category
  const handleEditCategory = (category: string) => {
    setDialogState({
      open: true,
      isEdit: true,
      currentCategory: category,
      title: 'Edit Category'
    });
  };

  // Open dialog to confirm category deletion
  const handleDeleteConfirmation = (category: string) => {
    setDeleteConfirmation({
      open: true,
      category
    });
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogState({
      ...dialogState,
      open: false
    });
  };

  // Close delete confirmation
  const handleCloseDeleteConfirmation = () => {
    setDeleteConfirmation({
      open: false,
      category: ''
    });
  };

  // Save category (create or update)
  const handleSaveCategory = async (name: string) => {
    try {
      if (dialogState.isEdit) {
        // Update existing category
        await createCategory({ 
          oldName: dialogState.currentCategory,
          newName: name
        });
        
        setNotification({
          open: true,
          message: 'Category updated successfully',
          severity: 'success'
        });
      } else {
        // Create new category
        await createCategory({ name });
        
        setNotification({
          open: true,
          message: 'Category created successfully',
          severity: 'success'
        });
      }
      
      // Refresh categories
      refetch();
      
      // Close dialog
      handleCloseDialog();
    } catch (error) {
      setNotification({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save category',
        severity: 'error'
      });
    }
  };

  // Delete category
  const handleDeleteCategory = async () => {
    try {
      await deleteCategory({ name: deleteConfirmation.category });
      
      setNotification({
        open: true,
        message: 'Category deleted successfully',
        severity: 'success'
      });
      
      // Refresh categories
      refetch();
      
      // Close dialog
      handleCloseDeleteConfirmation();
    } catch (error) {
      setNotification({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete category',
        severity: 'error'
      });
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  return (
    <AdminGuard>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Knowledge Base
        </Button>
        
        <Typography variant="h4" component="h1">Knowledge Base Categories</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Manage categories for organizing knowledge base articles
        </Typography>
      </Box>

      {fetchError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading categories: {fetchError.message || 'Failed to load categories'}
        </Alert>
      )}

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error saving category: {saveError.message || 'Failed to save category'}
        </Alert>
      )}

      {deleteError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error deleting category: {deleteError.message || 'Failed to delete category'}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddCategory}
        >
          Add Category
        </Button>
      </Box>

      <Paper>
        {isLoadingCategories ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : categories.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No categories found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Start by creating your first category
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={handleAddCategory}
            >
              Add Category
            </Button>
          </Box>
        ) : (
          <List>
            {categories.map((category, index) => (
              <React.Fragment key={category}>
                <ListItem>
                  <ListItemText primary={category} />
                  <ListItemSecondaryAction>
                    <Tooltip title="Edit">
                      <IconButton edge="end" onClick={() => handleEditCategory(category)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton edge="end" onClick={() => handleDeleteConfirmation(category)} sx={{ ml: 1 }}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < categories.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Add/Edit Category Dialog */}
      <CategoryDialog
        open={dialogState.open}
        onClose={handleCloseDialog}
        onSave={handleSaveCategory}
        title={dialogState.title}
        initialValue={dialogState.currentCategory}
        loading={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmation.open}
        onClose={isDeleting ? undefined : handleCloseDeleteConfirmation}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the category <strong>&quot;{deleteConfirmation.category}&quot;</strong>? This may affect any knowledge base articles using this category.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirmation} disabled={isDeleting}>Cancel</Button>
          <Button 
            color="error" 
            onClick={handleDeleteCategory} 
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
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
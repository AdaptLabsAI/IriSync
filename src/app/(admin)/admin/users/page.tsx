'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Alert,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AdminGuard from '@/components/admin/AdminGuard';
import useApi from '@/hooks/useApi';
import CreateAdminUserForm from '@/components/admin/CreateAdminUserForm';
import axios from 'axios';

// Define user type
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string;
  createdAt: string;
}

// User Dialog Component
const UserDialog = ({ 
  open, 
  onClose, 
  onSubmit, 
  user,
  isSubmitting
}: { 
  open: boolean; 
  onClose: () => void; 
  onSubmit: (data: any) => void; 
  user?: User;
  isSubmitting: boolean;
}) => {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    role: user?.role || 'user',
    status: user?.status || 'active'
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...user,
      ...formData
    });
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{user ? 'Edit User' : 'Create New User'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '240px' }}>
              <TextField
                autoFocus
                margin="dense"
                name="firstName"
                label="First Name"
                type="text"
                fullWidth
                required
                value={formData.firstName}
                onChange={handleTextChange}
                disabled={isSubmitting}
              />
            </Box>
            
            <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '240px' }}>
              <TextField
                margin="dense"
                name="lastName"
                label="Last Name"
                type="text"
                fullWidth
                required
                value={formData.lastName}
                onChange={handleTextChange}
                disabled={isSubmitting}
              />
            </Box>
            
            <Box sx={{ width: '100%' }}>
              <TextField
                margin="dense"
                name="email"
                label="Email Address"
                type="email"
                fullWidth
                required
                value={formData.email}
                onChange={handleTextChange}
                disabled={isSubmitting}
              />
            </Box>
            
            <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '240px' }}>
              <FormControl fullWidth margin="dense">
                <InputLabel id="role-select-label">Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  name="role"
                  value={formData.role}
                  label="Role"
                  onChange={handleSelectChange}
                  disabled={isSubmitting}
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="editor">Editor</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '240px' }}>
              <FormControl fullWidth margin="dense">
                <InputLabel id="status-select-label">Status</InputLabel>
                <Select
                  labelId="status-select-label"
                  name="status"
                  value={formData.status}
                  label="Status"
                  onChange={handleSelectChange}
                  disabled={isSubmitting}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button 
            type="submit"
            variant="contained" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : user ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// Delete Confirmation Dialog
const DeleteConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  userName,
  isDeleting
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  isDeleting: boolean;
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete user <strong>{userName}</strong>? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isDeleting}>Cancel</Button>
        <Button 
          onClick={onConfirm} 
          color="error" 
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Users Table Component
const UsersTable = ({
  users,
  isLoading,
  searchQuery,
  onEdit,
  onDelete,
  onView
}: {
  users: User[];
  isLoading: boolean;
  searchQuery: string;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onView: (user: User) => void;
}) => {
  // Filter users based on search query
  const filteredUsers = searchQuery.trim() === '' 
    ? users 
    : users.filter(user => {
        const query = searchQuery.toLowerCase();
        return (
          user.firstName.toLowerCase().includes(query) ||
          user.lastName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
        );
      });
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };
  
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch (e) {
      return dateStr;
    }
  };
  
  return (
    <TableContainer>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <CircularProgress size={32} />
                <Typography variant="body2" sx={{ mt: 1 }}>Loading users...</Typography>
              </TableCell>
            </TableRow>
          ) : filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <Typography variant="body1">No users found</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {searchQuery.trim() !== '' 
                    ? 'Try adjusting your search criteria'
                    : 'Add users to get started'
                  }
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      src={user.avatarUrl} 
                      alt={`${user.firstName} ${user.lastName}`}
                      sx={{ mr: 2, width: 40, height: 40 }}
                    >
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body1">{user.firstName} {user.lastName}</Typography>
                      <Typography variant="body2" color="text.secondary">ID: {user.id}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.role} 
                    size="small" 
                    color={user.role === 'super_admin' ? 'secondary' : 'primary'}
                    variant={user.role === 'user' ? 'outlined' : 'filled'}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.status} 
                    size="small" 
                    color={getStatusColor(user.status) as any}
                  />
                </TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small" 
                    onClick={() => onView(user)}
                    sx={{ mr: 1 }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => onEdit(user)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => onDelete(user)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<string>('admin'); // Default to regular admin
  
  // Add state for showing/hiding the create admin form
  const [showCreateAdminForm, setShowCreateAdminForm] = useState(false);

  // Setup API calls using fetch instead of the useApi hook which is for component-specific endpoints
  const fetchApi = async <T,>(endpoint: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    return await response.json() as T;
  };
  
  useEffect(() => {
    // Fetch users
    fetchApi<{users: User[]}>('/api/admin/users')
      .then((data) => {
        setUsers(data.users || []);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
        setIsLoading(false);
      });
      
    // Fetch current admin role
    fetchApi<{role: string}>('/api/auth/me')
      .then((data) => {
        if (data.role) {
          setAdminRole(data.role);
        }
      })
      .catch((err: Error) => {
        console.error('Error fetching admin info:', err);
      });
  }, []);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleCreateUser = () => {
    setCurrentUser(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentUser(null);
  };

  const handleViewUser = (user: User) => {
    // Handle view user
    console.log("View user:", user);
  };

  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = (user: User) => {
    setCurrentUser(user);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteUserConfirmed = async () => {
    if (!currentUser) return;
    
    setIsDeleting(true);
    try {
      await fetchApi(`/api/admin/users/${currentUser.id}`, { 
        method: 'DELETE'
      });
      setUsers(prevUsers => prevUsers.filter(u => u.id !== currentUser.id));
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting user:", error);
      setError("Failed to delete user. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUserSaved = async (userData: any) => {
    setIsSubmitting(true);
    try {
      if (currentUser) {
        // Update existing user
        const response = await fetchApi<{user: User}>(`/api/admin/users/${currentUser.id}`, { 
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });
        setUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? response.user : u));
      } else {
        // Create new user
        const response = await fetchApi<{user: User}>('/api/admin/users', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });
        setUsers(prevUsers => [response.user, ...prevUsers]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving user:", error);
      setError("Failed to save user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add handler for admin user creation success
  const handleAdminUserCreated = (newUser: User) => {
    // Add the new user to the list
    setUsers(prevUsers => [newUser, ...prevUsers]);
  };

  return (
    <AdminGuard>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">User Management</Typography>
        <Box>
          {/* Add button to toggle admin creation form */}
          <Button 
            onClick={() => setShowCreateAdminForm(!showCreateAdminForm)}
            variant="outlined"
            sx={{ mr: 2 }}
          >
            {showCreateAdminForm ? 'Hide Admin Form' : 'Create Admin'}
          </Button>
          <Button 
            variant="contained" 
            startIcon={<PersonAddIcon />}
            onClick={handleCreateUser}
          >
            Add User
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}
      
      {/* Add the CreateAdminUserForm component when shown */}
      {showCreateAdminForm && (
        <CreateAdminUserForm 
          onSuccess={handleAdminUserCreated} 
          currentUserRole={adminRole}
        />
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          placeholder="Search users..."
          fullWidth
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <Paper>
        <UsersTable 
          users={users}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onEdit={handleEditUser}
          onDelete={handleDeleteConfirm}
          onView={handleViewUser}
        />
      </Paper>

      {/* Existing dialogs */}
      <UserDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleUserSaved}
        user={currentUser || undefined}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteUserConfirmed}
        userName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}
        isDeleting={isDeleting}
      />
    </AdminGuard>
  );
} 
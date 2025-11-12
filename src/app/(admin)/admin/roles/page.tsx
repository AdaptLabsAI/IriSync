'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Switch,
  Grid,
  LinearProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormGroup,
  FormHelperText,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import AdminGuard from '@/components/admin/AdminGuard';
import { Role, Permission } from '@/lib/team/role';

// Available resources and actions for permissions
const availableResources = [
  { 
    id: 'content', 
    name: 'Content', 
    actions: [
      { id: 'read', name: 'View' },
      { id: 'create', name: 'Create' },
      { id: 'update', name: 'Edit' },
      { id: 'delete', name: 'Delete' },
      { id: 'publish', name: 'Publish' },
      { id: 'approve', name: 'Approve' }
    ] 
  },
  { 
    id: 'users', 
    name: 'Team Members', 
    actions: [
      { id: 'read', name: 'View' },
      { id: 'create', name: 'Invite' },
      { id: 'update', name: 'Edit' },
      { id: 'delete', name: 'Remove' }
    ] 
  },
  { 
    id: 'roles', 
    name: 'Roles', 
    actions: [
      { id: 'read', name: 'View' },
      { id: 'create', name: 'Create' },
      { id: 'update', name: 'Edit' },
      { id: 'delete', name: 'Delete' }
    ] 
  },
  { 
    id: 'analytics', 
    name: 'Analytics', 
    actions: [
      { id: 'read', name: 'View' },
      { id: 'export', name: 'Export' }
    ] 
  },
  { 
    id: 'settings', 
    name: 'Settings', 
    actions: [
      { id: 'read', name: 'View' },
      { id: 'update', name: 'Edit' }
    ] 
  },
  { 
    id: 'social-accounts', 
    name: 'Social Accounts', 
    actions: [
      { id: 'read', name: 'View' },
      { id: 'create', name: 'Connect' },
      { id: 'update', name: 'Edit' },
      { id: 'delete', name: 'Disconnect' }
    ] 
  },
];

function RoleManagementUI() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [systemRoles, setSystemRoles] = useState<Role[]>([]);
  const [customRoles, setCustomRoles] = useState<Role[]>([]);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  
  // Form states
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [roleParent, setRoleParent] = useState<string | null>(null);
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'success' });
  
  // Load roles
  useEffect(() => {
    fetchRoles();
  }, []);
  
  // Split roles into system and custom after fetching
  useEffect(() => {
    if (roles.length > 0) {
      setSystemRoles(roles.filter(role => role.isSystem));
      setCustomRoles(roles.filter(role => !role.isSystem));
    }
  }, [roles]);
  
  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/roles');
      
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }
      
      const data = await response.json();
      setRoles(data.roles);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching roles');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };
  
  const handleOpenDialog = (role?: Role) => {
    if (role) {
      // Editing existing role
      setRoleToEdit(role);
      setRoleName(role.name);
      setRoleDescription(role.description);
      setRolePermissions([...role.permissions]);
      setRoleParent(role.parentRoles?.[0] || null);
    } else {
      // Creating new role
      setRoleToEdit(null);
      setRoleName('');
      setRoleDescription('');
      setRolePermissions([]);
      setRoleParent(null);
    }
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  const handleDeleteRole = (roleId: string) => {
    setRoleToDelete(roleId);
    setConfirmDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/roles/${roleToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete role');
      }
      
      setSnackbar({
        open: true,
        message: 'Role deleted successfully',
        severity: 'success',
      });
      
      fetchRoles();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to delete role',
        severity: 'error',
      });
    } finally {
      setIsSubmitting(false);
      setConfirmDialogOpen(false);
      setRoleToDelete(null);
    }
  };
  
  const handleCancelDelete = () => {
    setConfirmDialogOpen(false);
    setRoleToDelete(null);
  };
  
  const handleSubmitRole = async () => {
    // Validate form
    if (!roleName.trim()) {
      setSnackbar({
        open: true,
        message: 'Role name is required',
        severity: 'error',
      });
      return;
    }
    
    if (!roleDescription.trim()) {
      setSnackbar({
        open: true,
        message: 'Role description is required',
        severity: 'error',
      });
      return;
    }
    
    if (rolePermissions.length === 0) {
      setSnackbar({
        open: true,
        message: 'At least one permission is required',
        severity: 'error',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const method = roleToEdit ? 'PUT' : 'POST';
      const url = roleToEdit ? `/api/admin/roles/${roleToEdit.id}` : '/api/admin/roles';
      const parentRoles = roleParent ? [roleParent] : undefined;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roleName,
          description: roleDescription,
          permissions: rolePermissions,
          parentRoles,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${roleToEdit ? 'update' : 'create'} role`);
      }
      
      setSnackbar({
        open: true,
        message: `Role ${roleToEdit ? 'updated' : 'created'} successfully`,
        severity: 'success',
      });
      
      fetchRoles();
      handleCloseDialog();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || `Failed to ${roleToEdit ? 'update' : 'create'} role`,
        severity: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCloneRole = (role: Role) => {
    setRoleName(`${role.name} (Copy)`);
    setRoleDescription(role.description);
    setRolePermissions([...role.permissions]);
    setRoleParent(role.parentRoles?.[0] || null);
    setRoleToEdit(null);
    setDialogOpen(true);
  };
  
  const handleTogglePermission = (resource: string, action: string) => {
    setRolePermissions(prevPermissions => {
      // Check if the resource already exists in permissions
      const resourceIndex = prevPermissions.findIndex(p => p.resource === resource);
      
      if (resourceIndex === -1) {
        // If the resource doesn't exist, add it with the selected action
        return [...prevPermissions, { resource, actions: [action] }];
      } else {
        // If the resource exists, check if the action is already in the actions array
        const permission = prevPermissions[resourceIndex];
        const actionIndex = permission.actions.indexOf(action);
        
        if (actionIndex === -1) {
          // If the action doesn't exist, add it
          const updatedPermission = {
            ...permission,
            actions: [...permission.actions, action],
          };
          
          const updatedPermissions = [...prevPermissions];
          updatedPermissions[resourceIndex] = updatedPermission;
          
          return updatedPermissions;
        } else {
          // If the action exists, remove it
          const updatedActions = permission.actions.filter(a => a !== action);
          
          if (updatedActions.length === 0) {
            // If no actions left, remove the resource
            return prevPermissions.filter((_, i) => i !== resourceIndex);
          } else {
            // Otherwise, update the actions for the resource
            const updatedPermission = {
              ...permission,
              actions: updatedActions,
            };
            
            const updatedPermissions = [...prevPermissions];
            updatedPermissions[resourceIndex] = updatedPermission;
            
            return updatedPermissions;
          }
        }
      }
    });
  };
  
  const isPermissionSelected = (resource: string, action: string): boolean => {
    const permission = rolePermissions.find(p => p.resource === resource);
    return permission ? permission.actions.includes(action) : false;
  };
  
  const getPermissionCount = (role: Role): number => {
    return role.permissions.reduce((total, permission) => total + permission.actions.length, 0);
  };
  
  const renderPermissionBadge = (role: Role) => {
    const count = getPermissionCount(role);
    let color: 'success' | 'primary' | 'error' | 'warning' | 'default' = 'default';
    
    if (count > 15) {
      color = 'error';
    } else if (count > 10) {
      color = 'warning';
    } else if (count > 5) {
      color = 'primary';
    } else {
      color = 'success';
    }
    
    return <Chip label={`${count} permissions`} color={color} size="small" />;
  };
  
  const renderPermissionMatrix = () => {
  return (
      <Box sx={{ mt: 3, maxHeight: '400px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Permission Matrix
      </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Resource</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableResources.map(resource => (
              <TableRow key={resource.id}>
                <TableCell width="25%">
                  <Typography variant="body2" fontWeight="medium">
                    {resource.name}
                  </Typography>
                </TableCell>
              <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {resource.actions.map(action => (
                      <FormControlLabel
                        key={`${resource.id}-${action.id}`}
                        control={
                          <Checkbox
                            checked={isPermissionSelected(resource.id, action.id)}
                            onChange={() => handleTogglePermission(resource.id, action.id)}
                            size="small"
                          />
                        }
                        label={<Typography variant="body2">{action.name}</Typography>}
                      />
                    ))}
                  </Box>
              </TableCell>
            </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };
  
  const renderRoleCreationDialog = () => {
    return (
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {roleToEdit ? 'Edit Role' : 'Create New Role'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Role Name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Description"
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              rows={2}
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Parent Role (Optional)</InputLabel>
              <Select
                value={roleParent || ''}
                onChange={(e) => setRoleParent(e.target.value || null)}
                label="Parent Role (Optional)"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {systemRoles.map(role => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Inherit permissions from a parent role
              </FormHelperText>
            </FormControl>
            
            {renderPermissionMatrix()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitRole}
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {roleToEdit ? 'Update' : 'Create'} Role
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  const renderConfirmDeleteDialog = () => {
    const roleToDeleteObj = roles.find(r => r.id === roleToDelete);
    
    return (
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelDelete}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the role &quot;{roleToDeleteObj?.name}&quot;? This action cannot be undone.
            Users assigned to this role will need to be reassigned to another role.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  const renderRoleCards = (rolesToRender: Role[]) => {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3, mt: 3 }}>
        {rolesToRender.map(role => (
          <Card key={role.id} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">{role.name}</Typography>
                <Box>
                  {!role.isSystem && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(role)}
                        aria-label="edit role"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteRole(role.id)}
                        aria-label="delete role"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => handleCloneRole(role)}
                    aria-label="clone role"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {role.description}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {renderPermissionBadge(role)}
                {role.isSystem && (
                  <Chip label="System" color="info" size="small" />
                )}
                {role.isCustom && (
                  <Chip label="Custom" color="secondary" size="small" />
                )}
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              <Typography variant="body2" fontWeight="medium" sx={{ mt: 1 }}>
                Resource Access:
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {role.permissions.map(permission => (
                  <Tooltip 
                    key={permission.resource}
                    title={`Actions: ${permission.actions.join(', ')}`}
                  >
                    <Chip
                      label={permission.resource}
                      size="small"
                      variant="outlined"
                      sx={{ m: 0.5 }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };
  
  const renderEmptyState = (type: 'system' | 'custom') => {
    if (type === 'system') {
      return (
        <Box sx={{ mt: 3, textAlign: 'center', p: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No system roles found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            There should be system-defined roles. This may be a configuration issue.
          </Typography>
        </Box>
      );
    } else {
      return (
        <Box sx={{ mt: 3, textAlign: 'center', p: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No custom roles found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create custom roles to define specific permission sets for your organization.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ mt: 2 }}
          >
            Create Custom Role
          </Button>
        </Box>
      );
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }} align="center">
          Loading roles...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" gutterBottom>
            Role & Permission Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage custom roles and granular permissions for your organization or team.
          </Typography>
        </div>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchRoles} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ ml: 1 }}
          >
            Create Role
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Role Management Overview
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="subtitle2">System Roles</Typography>
                <Typography variant="h4">{systemRoles.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Pre-defined roles with standard permissions
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="subtitle2">Custom Roles</Typography>
                <Typography variant="h4">{customRoles.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Organization-specific roles with custom permissions
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="subtitle2">Total Resources</Typography>
                <Typography variant="h4">{availableResources.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Resources that can be controlled with permissions
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
      
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label="System Roles" />
        <Tab label="Custom Roles" />
      </Tabs>
      
      {currentTab === 0 && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            System-defined roles with pre-configured permissions
          </Typography>
          {systemRoles.length > 0 ? renderRoleCards(systemRoles) : renderEmptyState('system')}
        </>
      )}
      
      {currentTab === 1 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Typography variant="subtitle1">
              Custom roles defined for your organization
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="small"
            >
              Create Custom Role
            </Button>
          </Box>
          {customRoles.length > 0 ? renderRoleCards(customRoles) : renderEmptyState('custom')}
        </>
      )}
      
      {renderRoleCreationDialog()}
      {renderConfirmDeleteDialog()}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function AdminRolesPage() {
  return (
    <AdminGuard>
      <RoleManagementUI />
    </AdminGuard>
  );
} 
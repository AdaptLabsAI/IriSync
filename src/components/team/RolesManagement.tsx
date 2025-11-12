'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useNotification } from '../ui/mui-components';
import { Role, Permission } from '../../lib/team/role';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Tabs,
  Tab,
  Alert,
  AlertTitle,
  MenuItem,
  FormControl,
  FormLabel,
  Dialog,
  DialogContent, 
  DialogTitle,
  DialogActions,
  Checkbox,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';

interface RolesManagementProps {
  roles: Role[];
  organizationId: string;
  onRolesUpdated: (roles: Role[]) => void;
  subscriptionTier: string;
}

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

// Define role form schema
const roleFormSchema = z.object({
  name: z.string().min(1, { message: 'Role name is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  permissions: z.array(
    z.object({
      resource: z.string(),
      actions: z.array(z.string())
    })
  ).refine((permissions) => permissions.length > 0, {
    message: 'At least one permission is required',
  }),
  parentRoles: z.array(z.string()).optional(),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

export default function RolesManagement({ 
  roles, 
  organizationId,
  onRolesUpdated,
  subscriptionTier 
}: RolesManagementProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const notification = useNotification();

  const systemRoles = roles.filter(role => role.isSystem);
  const customRoles = roles.filter(role => role.isCustom);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
      parentRoles: [],
    },
  });

  const handleCreateRole = async (data: RoleFormValues) => {
    if (!organizationId) return;
    
    setIsSubmitting(true);
    try {
      // Format permissions to only include resources with selected actions
      const formattedPermissions = data.permissions.filter(p => p.actions.length > 0);
      
      const response = await axios.post('/api/team/roles', {
        organizationId,
        name: data.name,
        description: data.description,
        permissions: formattedPermissions,
        parentRoles: data.parentRoles?.length ? data.parentRoles : undefined
      });
      
      // Update roles list
      const rolesResponse = await axios.get(`/api/team/roles?organizationId=${organizationId}`);
      onRolesUpdated(rolesResponse.data.data);
      
      notification.success({
        title: 'Success',
        description: 'Role created successfully.'
      });
      
      form.reset();
      setIsCreating(false);
    } catch (error: any) {
      console.error('Error creating role:', error);
      
      notification.error({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to create role.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!organizationId || !roleToDelete) return;
    
    try {
      await axios.delete(`/api/team/roles?organizationId=${organizationId}&roleId=${roleToDelete}`);
      
      // Update roles list
      const rolesResponse = await axios.get(`/api/team/roles?organizationId=${organizationId}`);
      onRolesUpdated(rolesResponse.data.data);
      
      notification.success({
        title: 'Success',
        description: 'Role deleted successfully.'
      });
      
      setRoleToDelete(null);
    } catch (error: any) {
      console.error('Error deleting role:', error);
      
      notification.error({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to delete role.'
      });
    }
  };

  // If not on enterprise tier, show limited access message for custom roles
  const isCustomRolesLimited = subscriptionTier !== 'enterprise' && customRoles.length >= 2;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Role Management</h2>
      
      <Box sx={{ width: '100%' }}>
        <Tabs value={0} onChange={(e, newValue) => console.log(newValue)}>
          <div className="flex justify-between items-center mb-4">
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="System Roles" />
              <Tab label="Custom Roles" />
            </Box>
            
            {!isCustomRolesLimited && (
              <Dialog open={isCreating} onClose={() => setIsCreating(false)}>
                <DialogTitle>Create Custom Role</DialogTitle>
                <DialogContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Create a new role with custom permissions for your team members.
                    </Typography>
                  </Box>
                  
                  <form onSubmit={form.handleSubmit(handleCreateRole)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <TextField
                        fullWidth
                        label="Role Name"
                        {...form.register('name')}
                        error={!!form.formState.errors.name}
                        helperText={form.formState.errors.name?.message}
                      />
                      
                      <TextField
                        fullWidth
                        label="Description"
                        {...form.register('description')}
                      />
                      
                      <TextField
                        fullWidth
                        label="Inherit Permissions From (Optional)"
                        select
                        {...form.register('parentRoles')}
                        SelectProps={{
                          multiple: true,
                        }}
                      >
                        {roles.filter(role => !role.id.includes('owner')).map((role) => (
                          <MenuItem key={role.id} value={role.id}>
                            {role.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      
                      <TextField
                        fullWidth
                        label="Permissions"
                        select
                        {...form.register('permissions')}
                        SelectProps={{
                          multiple: true,
                        }}
                      >
                        {availableResources.map((resource) => (
                          <optgroup key={resource.id} label={resource.name}>
                            {resource.actions.map((action) => (
                              <MenuItem key={`${resource.id}-${action.id}`} value={`${resource.id}-${action.id}`}>
                                {action.name}
                              </MenuItem>
                            ))}
                          </optgroup>
                        ))}
                      </TextField>
                    </div>
                    
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Role'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </Tabs>
      </Box>
    </div>
  );
}
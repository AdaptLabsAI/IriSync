import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { UserCog, Plus, Pencil, Trash2, X, Check, Info, Shield } from 'lucide-react';
import Dialog from '../ui/dialog';
import { Input } from '../ui/input/Input';
import { Textarea } from '../ui/textarea/Textarea';
import { Checkbox } from '../ui/checkbox/Checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isEnterprise?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[]; // array of permission IDs
  isDefault?: boolean;
  isSystem?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CustomRoleButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Available permissions
   */
  availablePermissions: Permission[];
  /**
   * Existing roles
   */
  existingRoles?: Role[];
  /**
   * Callback when a role is created
   */
  onCreateRole?: (role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  /**
   * Callback when a role is updated
   */
  onUpdateRole?: (roleId: string, updates: Partial<Role>) => Promise<void>;
  /**
   * Callback when a role is deleted
   */
  onDeleteRole?: (roleId: string) => Promise<void>;
  /**
   * Current user ID
   */
  currentUserId: string;
}

/**
 * A button for creating and managing custom team roles with specific permissions.
 * This feature is available only on the enterprise tier and requires the 'team:manage_roles' permission.
 */
const CustomRoleButton: React.FC<CustomRoleButtonProps> = ({
  availablePermissions,
  existingRoles = [],
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  currentUserId,
  variant = 'outline',
  size = 'sm',
  children,
  ...buttonProps
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('roles');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Group permissions by category
  const permissionsByCategory = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
  
  // New role state
  const [newRole, setNewRole] = useState<Omit<Role, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    description: '',
    permissions: [],
    createdBy: currentUserId,
    isDefault: false,
    isSystem: false
  });
  
  const handleClick = () => {
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedRole(null);
    setIsEditMode(false);
    resetNewRoleForm();
  };

  const resetNewRoleForm = () => {
    setNewRole({
      name: '',
      description: '',
      permissions: [],
      createdBy: currentUserId,
      isDefault: false,
      isSystem: false
    });
  };

  const handleCreateRole = async () => {
    if (!onCreateRole || !newRole.name.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      await onCreateRole(newRole);
      resetNewRoleForm();
      setActiveTab('roles');
    } catch (error) {
      console.error('Error creating role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!onUpdateRole || !selectedRole || isLoading) return;
    
    const updates: Partial<Role> = {};
    
    if (selectedRole.name !== newRole.name) updates.name = newRole.name;
    if (selectedRole.description !== newRole.description) updates.description = newRole.description;
    
    // We need to check if the permissions arrays are different
    if (
      selectedRole.permissions.length !== newRole.permissions.length || 
      !selectedRole.permissions.every(p => newRole.permissions.includes(p))
    ) {
      updates.permissions = newRole.permissions;
    }
    
    if (Object.keys(updates).length === 0) {
      setIsEditMode(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      await onUpdateRole(selectedRole.id, updates);
      setIsEditMode(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!onDeleteRole || isLoading) return;
    
    if (!confirm('Are you sure you want to delete this role? Users with this role will lose these permissions.')) return;
    
    setIsLoading(true);
    
    try {
      await onDeleteRole(roleId);
      setSelectedRole(null);
    } catch (error) {
      console.error('Error deleting role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setNewRole({
      name: role.name,
      description: role.description || '',
      permissions: [...role.permissions],
      isDefault: role.isDefault || false,
      isSystem: role.isSystem || false,
      createdBy: role.createdBy || currentUserId
    });
  };

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    if (checked) {
      setNewRole({
        ...newRole,
        permissions: [...newRole.permissions, permissionId]
      });
    } else {
      setNewRole({
        ...newRole,
        permissions: newRole.permissions.filter(id => id !== permissionId)
      });
    }
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    const categoryPermissionIds = permissionsByCategory[category].map(p => p.id);
    
    if (checked) {
      // Add all permissions from this category that aren't already included
      const newPermissions = [
        ...newRole.permissions,
        ...categoryPermissionIds.filter(id => !newRole.permissions.includes(id))
      ];
      setNewRole({
        ...newRole,
        permissions: newPermissions
      });
    } else {
      // Remove all permissions from this category
      setNewRole({
        ...newRole,
        permissions: newRole.permissions.filter(id => !categoryPermissionIds.includes(id))
      });
    }
  };

  const isCategoryChecked = (category: string) => {
    const categoryPermissionIds = permissionsByCategory[category].map(p => p.id);
    return categoryPermissionIds.every(id => newRole.permissions.includes(id));
  };

  const isCategoryIndeterminate = (category: string) => {
    const categoryPermissionIds = permissionsByCategory[category].map(p => p.id);
    const selectedCount = categoryPermissionIds.filter(id => newRole.permissions.includes(id)).length;
    return selectedCount > 0 && selectedCount < categoryPermissionIds.length;
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        leftIcon={<UserCog className="h-4 w-4" />}
        requiredPermission="team:manage_roles"
        featureTier="enterprise"
        {...buttonProps}
      >
        {children || 'Custom Roles'}
      </Button>

      <Dialog
        open={isDialogOpen}
        onClose={handleClose}
        title={selectedRole && !isEditMode ? `Role: ${selectedRole.name}` : 'Custom Roles'}
        className="max-w-3xl"
      >
        {selectedRole && !isEditMode ? (
          // Role details view
          <div className="space-y-4">
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRole(null)}
                leftIcon={<X className="h-4 w-4" />}
                className="text-gray-500"
              >
                Back to list
              </Button>
              
              {!selectedRole.isSystem && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                    leftIcon={<Pencil className="h-4 w-4" />}
                  >
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteRole(selectedRole.id)}
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    className="text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
            
            <div className="border-b pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">{selectedRole.name}</h3>
                {selectedRole.isSystem && (
                  <div className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-md flex items-center">
                    <Shield className="h-3 w-3 mr-1" />
                    System Role
                  </div>
                )}
                {selectedRole.isDefault && (
                  <div className="px-2 py-0.5 bg-[#00FF6A]/10 text-[#00CC44] text-xs rounded-md flex items-center">
                    <Check className="h-3 w-3 mr-1" />
                    Default
                  </div>
                )}
              </div>
              
              {selectedRole.description && (
                <p className="mt-2 text-sm text-gray-600">{selectedRole.description}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Permissions</h4>
              
              <div className="space-y-6">
                {Object.entries(permissionsByCategory).map(([category, permissions]) => {
                  const categoryPermissions = permissions.filter(p => 
                    selectedRole.permissions.includes(p.id)
                  );
                  
                  if (categoryPermissions.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-3">
                      <h5 className="text-sm font-medium border-b pb-2 capitalize">{category}</h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3">
                        {categoryPermissions.map(permission => (
                          <div key={permission.id} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-[#00CC44]" />
                            <div>
                              <div className="text-sm font-medium">{permission.name}</div>
                              <div className="text-xs text-gray-500">{permission.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {selectedRole.createdAt && (
              <div className="pt-3 text-xs text-gray-500">
                Created {new Date(selectedRole.createdAt).toLocaleString()}
                {selectedRole.updatedAt && selectedRole.createdAt.toString() !== selectedRole.updatedAt.toString() && 
                  ` • Last updated ${new Date(selectedRole.updatedAt).toLocaleString()}`
                }
              </div>
            )}
          </div>
        ) : selectedRole && isEditMode ? (
          // Role edit view
          <div className="space-y-4">
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditMode(false);
                  setNewRole({
                    name: selectedRole.name,
                    description: selectedRole.description || '',
                    permissions: [...selectedRole.permissions],
                    isDefault: selectedRole.isDefault || false,
                    isSystem: selectedRole.isSystem || false,
                    createdBy: selectedRole.createdBy || currentUserId
                  });
                }}
                leftIcon={<X className="h-4 w-4" />}
                className="text-gray-500"
              >
                Cancel
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name*
                </label>
                <Input
                  id="name"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="Enter role name"
                  required
                  disabled={selectedRole.isSystem}
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Enter role description"
                  rows={2}
                  disabled={selectedRole.isSystem}
                />
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Permissions
                </label>
                
                <div className="border rounded-md p-4 max-h-[50vh] overflow-y-auto">
                  <div className="space-y-6">
                    {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={isCategoryChecked(category)}
                            indeterminate={isCategoryIndeterminate(category)}
                            onChange={(e) => handleCategoryToggle(category, e.target.checked)}
                            disabled={selectedRole.isSystem}
                          />
                          <label 
                            htmlFor={`category-${category}`} 
                            className="text-sm font-medium capitalize"
                          >
                            {category}
                          </label>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 ml-6">
                          {permissions.map(permission => (
                            <div key={permission.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`permission-${permission.id}`}
                                checked={newRole.permissions.includes(permission.id)}
                                onChange={(e) => handlePermissionToggle(permission.id, e.target.checked)}
                                disabled={selectedRole.isSystem || (permission.isEnterprise && !buttonProps.featureTier)}
                              />
                              <div>
                                <label 
                                  htmlFor={`permission-${permission.id}`} 
                                  className="text-sm font-medium flex items-center gap-1"
                                >
                                  {permission.name}
                                  {permission.isEnterprise && (
                                    <div className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                      Enterprise
                                    </div>
                                  )}
                                </label>
                                <div className="text-xs text-gray-500">{permission.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  onClick={handleUpdateRole}
                  disabled={!newRole.name.trim() || isLoading || selectedRole.isSystem}
                  loading={isLoading}
                >
                  Update Role
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Roles list and create view
          <div className="space-y-4">
            <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="roles">All Roles ({existingRoles.length})</TabsTrigger>
                <TabsTrigger value="create" disabled={!onCreateRole}>Create New</TabsTrigger>
              </TabsList>
              
              <TabsContent value="roles" className="space-y-4">
                {existingRoles.length > 0 ? (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {existingRoles.map(role => (
                      <div
                        key={role.id}
                        className="p-4 border rounded-lg hover:border-gray-400 cursor-pointer transition-colors"
                        onClick={() => handleSelectRole(role)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-grow">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{role.name}</h3>
                              {role.isSystem && (
                                <div className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-md flex items-center">
                                  <Shield className="h-3 w-3 mr-1" />
                                  System
                                </div>
                              )}
                              {role.isDefault && (
                                <div className="px-2 py-0.5 bg-[#00FF6A]/10 text-[#00CC44] text-xs rounded-md flex items-center">
                                  <Check className="h-3 w-3 mr-1" />
                                  Default
                                </div>
                              )}
                            </div>
                            
                            {role.description && (
                              <p className="mt-1 text-sm text-gray-600">{role.description}</p>
                            )}
                            
                            <div className="mt-2 flex flex-wrap gap-1">
                              {Object.entries(permissionsByCategory)
                                .filter(([_, permissions]) => 
                                  permissions.some(p => role.permissions.includes(p.id))
                                )
                                .map(([category]) => (
                                  <div 
                                    key={category} 
                                    className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded capitalize"
                                  >
                                    {category}
                                  </div>
                                ))}
                            </div>
                          </div>
                          
                          <div className="flex flex-shrink-0 text-xs text-gray-500">
                            {role.permissions.length} permissions
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-md border-dashed">
                    <UserCog className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No custom roles defined</p>
                    {onCreateRole && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setActiveTab('create')}
                        leftIcon={<Plus className="h-4 w-4" />}
                      >
                        Create New Role
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="create" className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2 mb-4">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Custom Roles (Enterprise Feature)</p>
                    <p className="mt-1">
                      Custom roles allow you to define specific permissions for team members.
                      This gives you fine-grained control over who can access and perform various actions within your workspace.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="new-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Role Name*
                    </label>
                    <Input
                      id="new-name"
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                      placeholder="Enter role name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="new-description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Textarea
                      id="new-description"
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      placeholder="Enter role description"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-3">
                      <Checkbox
                        id="is-default"
                        checked={!!newRole.isDefault}
                        onChange={(e) => setNewRole({ ...newRole, isDefault: e.target.checked })}
                      />
                      <label htmlFor="is-default" className="ml-2 text-sm font-medium text-gray-700">
                        Make this the default role for new team members
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Permissions
                    </label>
                    
                    <div className="border rounded-md p-4 max-h-[50vh] overflow-y-auto">
                      <div className="space-y-6">
                        {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                          <div key={category} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`new-category-${category}`}
                                checked={isCategoryChecked(category)}
                                indeterminate={isCategoryIndeterminate(category)}
                                onChange={(e) => handleCategoryToggle(category, e.target.checked)}
                              />
                              <label 
                                htmlFor={`new-category-${category}`} 
                                className="text-sm font-medium capitalize"
                              >
                                {category}
                              </label>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 ml-6">
                              {permissions.map(permission => (
                                <div key={permission.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`new-permission-${permission.id}`}
                                    checked={newRole.permissions.includes(permission.id)}
                                    onChange={(e) => handlePermissionToggle(permission.id, e.target.checked)}
                                    disabled={permission.isEnterprise && !buttonProps.featureTier}
                                  />
                                  <div>
                                    <label 
                                      htmlFor={`new-permission-${permission.id}`} 
                                      className="text-sm font-medium flex items-center gap-1"
                                    >
                                      {permission.name}
                                      {permission.isEnterprise && (
                                        <div className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                          Enterprise
                                        </div>
                                      )}
                                    </label>
                                    <div className="text-xs text-gray-500">{permission.description}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button
                      variant="outline"
                      className="mr-2"
                      onClick={() => {
                        resetNewRoleForm();
                        setActiveTab('roles');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleCreateRole}
                      disabled={!newRole.name.trim() || isLoading || !newRole.permissions.length}
                      loading={isLoading}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Create Role
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </Dialog>
    </>
  );
};

export default CustomRoleButton; 
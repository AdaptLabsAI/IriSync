'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tabs,
  Tab,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Button,
  Alert,
  Chip,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  Badge,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import SaveIcon from '@mui/icons-material/Save';
import ResetIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import {
  TeamMember,
  getEffectivePermissions,
  DEFAULT_ORGANIZATION_PERMISSIONS,
  DEFAULT_TEAM_PERMISSIONS,
  AVAILABLE_PERMISSIONS,
  PermissionCategory,
  getPermissionsByCategory,
  getRolePermissionSummary,
  getTeamRolePermissionSummary
} from '../../lib/team/users/team-structure';
import { OrganizationRole, TeamRole } from '../../lib/user/types';

interface UserPermissionsFormProps {
  teamMember: TeamMember;
  onSave: (updatedMember: TeamMember) => Promise<void>;
  readOnly?: boolean;
}

const categoryLabels: Record<PermissionCategory, string> = {
  [PermissionCategory.TEAM]: 'Team Management',
  [PermissionCategory.CONTENT]: 'Content Management',
  [PermissionCategory.PLATFORMS]: 'Platforms',
  [PermissionCategory.ANALYTICS]: 'Analytics & Reports',
  [PermissionCategory.SETTINGS]: 'Settings',
  [PermissionCategory.CRM]: 'CRM & Leads',
  [PermissionCategory.MESSAGING]: 'Messaging',
  [PermissionCategory.ADVANCED]: 'Advanced Features'
};

const categoryIcons: Record<PermissionCategory, React.ReactElement> = {
  [PermissionCategory.TEAM]: <SecurityIcon fontSize="small" />,
  [PermissionCategory.CONTENT]: <InfoIcon fontSize="small" />,
  [PermissionCategory.PLATFORMS]: <InfoIcon fontSize="small" />,
  [PermissionCategory.ANALYTICS]: <InfoIcon fontSize="small" />,
  [PermissionCategory.SETTINGS]: <InfoIcon fontSize="small" />,
  [PermissionCategory.CRM]: <InfoIcon fontSize="small" />,
  [PermissionCategory.MESSAGING]: <InfoIcon fontSize="small" />,
  [PermissionCategory.ADVANCED]: <LockIcon fontSize="small" />
};

export default function UserPermissionsForm({ teamMember, onSave, readOnly = false }: UserPermissionsFormProps) {
  const [activeTab, setActiveTab] = useState<PermissionCategory>(PermissionCategory.CONTENT);
  const [additionalPermissions, setAdditionalPermissions] = useState<string[]>(teamMember.additionalPermissions || []);
  const [restrictedPermissions, setRestrictedPermissions] = useState<string[]>(teamMember.restrictedPermissions || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [compactView, setCompactView] = useState(false);
  
  // Get permissions by category
  const permissionsByCategory = getPermissionsByCategory();
  
  // Get the default permissions for this user's roles
  const defaultOrgPermissions = DEFAULT_ORGANIZATION_PERMISSIONS[teamMember.organizationRole];
  const defaultTeamPermissions = teamMember.teamRole ? DEFAULT_TEAM_PERMISSIONS[teamMember.teamRole] : [];
  const defaultRolePermissions = [...defaultOrgPermissions, ...defaultTeamPermissions];
  
  // Get the current effective permissions
  const effectivePermissions = getEffectivePermissions(teamMember);
  
  // Get role permission summaries
  const orgPermissionSummaries = getRolePermissionSummary(teamMember.organizationRole);
  const teamPermissionSummaries = teamMember.teamRole ? getTeamRolePermissionSummary(teamMember.teamRole) : null;
  
  // Reset form when team member changes
  useEffect(() => {
    setAdditionalPermissions(teamMember.additionalPermissions || []);
    setRestrictedPermissions(teamMember.restrictedPermissions || []);
    setSuccess(false);
    setError(null);
  }, [teamMember]);
  
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Update the team member with new permissions
      const updatedMember: TeamMember = {
        ...teamMember,
        additionalPermissions,
        restrictedPermissions
      };
      
      await onSave(updatedMember);
      setSuccess(true);
      
      // Clear success message after a delay
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = () => {
    setAdditionalPermissions(teamMember.additionalPermissions || []);
    setRestrictedPermissions(teamMember.restrictedPermissions || []);
    setSuccess(false);
    setError(null);
  };
  
  const handleTogglePermission = (permissionId: string) => {
    // If permission is default for the role
    const isDefaultPermission = defaultRolePermissions.includes(permissionId);
    
    if (isDefaultPermission) {
      // If it's a default permission, we need to restrict it or remove the restriction
      if (restrictedPermissions.includes(permissionId)) {
        // Remove from restricted
        setRestrictedPermissions(restrictedPermissions.filter(p => p !== permissionId));
      } else {
        // Add to restricted
        setRestrictedPermissions([...restrictedPermissions, permissionId]);
      }
    } else {
      // If it's not a default permission, we need to add or remove from additional
      if (additionalPermissions.includes(permissionId)) {
        // Remove from additional
        setAdditionalPermissions(additionalPermissions.filter(p => p !== permissionId));
      } else {
        // Add to additional
        setAdditionalPermissions([...additionalPermissions, permissionId]);
      }
    }
  };
  
  const isPermissionChecked = (permissionId: string): boolean => {
    return effectivePermissions.includes(permissionId);
  };

  const isCustomized = (permissionId: string): boolean => {
    const isDefault = defaultRolePermissions.includes(permissionId);
    return (isDefault && restrictedPermissions.includes(permissionId)) || 
           (!isDefault && additionalPermissions.includes(permissionId));
  };

  const getCustomizationCount = (): number => {
    return (additionalPermissions?.length || 0) + (restrictedPermissions?.length || 0);
  };

  const hasCustomizations = getCustomizationCount() > 0;
  
  return (
    <Card>
      <CardHeader 
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              {teamMember.name}'s Permissions
            </Typography>
            {hasCustomizations && (
              <Chip 
                size="small" 
                color="secondary" 
                label={`${getCustomizationCount()} custom settings`} 
              />
            )}
          </Box>
        }
        subheader={
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Role: {teamMember.teamRole ? teamMember.teamRole.charAt(0).toUpperCase() + teamMember.teamRole.slice(1) : 'Organization Admin'}
            </Typography>
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ mr: 1 }}>
                Compact View
              </Typography>
              <Switch 
                size="small" 
                checked={compactView} 
                onChange={(e: any) => setCompactView(e.target.checked)} 
              />
            </Box>
          </Box>
        }
        action={
          !readOnly && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                startIcon={<ResetIcon />} 
                onClick={handleReset}
                disabled={saving}
              >
                Reset
              </Button>
              <Button 
                variant="contained" 
                startIcon={<SaveIcon />} 
                onClick={handleSave}
                disabled={saving}
              >
                Save Changes
              </Button>
            </Box>
          )
        }
      />
      
      <Divider />
      
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ m: 2 }}>
          Permissions updated successfully
        </Alert>
      )}
      
      {/* Role Overview */}
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.paper' }}>
        <Typography variant="subtitle1" gutterBottom>
          Role Overview: {teamMember.teamRole ? teamMember.teamRole.charAt(0).toUpperCase() + teamMember.teamRole.slice(1) : 'Organization Admin'}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {getOrganizationRoleDescription(teamMember.organizationRole)}
        </Typography>
        
        {/* Role Access Summary Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Access Level</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(orgPermissionSummaries).map(([category, summary]) => (
                <TableRow 
                  key={category}
                  hover
                  onClick={() => setActiveTab(category as PermissionCategory)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {categoryIcons[category as PermissionCategory]}
                      {categoryLabels[category as PermissionCategory]}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      size="small"
                      label={summary}
                      color={
                        summary === 'Full access' ? 'success' :
                        summary === 'Most capabilities' ? 'primary' :
                        summary === 'Partial access' ? 'info' :
                        summary === 'Limited access' ? 'warning' :
                        'default'
                      }
                      variant={summary === 'No access' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
          
        {(teamMember.organizationRole === OrganizationRole.ORG_ADMIN || teamMember.organizationRole === OrganizationRole.OWNER) && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {teamMember.organizationRole === OrganizationRole.OWNER 
                ? "Organization owners have access to all permissions by default and cannot have their permissions restricted."
                : "Organization admins have access to all permissions by default and cannot have their permissions restricted."
              }
            </Typography>
          </Alert>
        )}
        
        {/* Customization Summary */}
        {hasCustomizations && teamMember.organizationRole !== OrganizationRole.ORG_ADMIN && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Custom Permission Adjustments
            </Typography>
            
            {restrictedPermissions.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="error" gutterBottom>
                  Restricted Default Permissions ({restrictedPermissions.length}):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {restrictedPermissions.map(perm => (
                    <Chip 
                      key={perm}
                      size="small"
                      label={getPermissionLabel(perm)}
                      color="error"
                      variant="outlined"
                      onDelete={!readOnly ? () => handleTogglePermission(perm) : undefined}
                      deleteIcon={<CancelIcon />}
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {additionalPermissions.length > 0 && (
              <Box>
                <Typography variant="body2" color="success.main" gutterBottom>
                  Additional Permissions ({additionalPermissions.length}):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {additionalPermissions.map(perm => (
                    <Chip 
                      key={perm}
                      size="small"
                      label={getPermissionLabel(perm)}
                      color="success"
                      onDelete={!readOnly ? () => handleTogglePermission(perm) : undefined}
                      deleteIcon={<CancelIcon />}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        )}
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {Object.values(PermissionCategory).map((category) => (
            <Tab 
              key={category} 
              label={categoryLabels[category]} 
              value={category} 
              icon={categoryIcons[category]}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>
      
      <CardContent>
        {/* Permissions by category */}
        {teamMember.organizationRole !== OrganizationRole.ORG_ADMIN && teamMember.organizationRole !== OrganizationRole.OWNER && (
          <Paper elevation={0} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {categoryLabels[activeTab]} Permissions
              </Typography>
            </Box>
            
            <FormGroup>
              {permissionsByCategory[activeTab].map(permission => {
                const isDefault = defaultRolePermissions.includes(permission.id);
                const isChecked = isPermissionChecked(permission.id);
                const isModified = isCustomized(permission.id);
                
                if (compactView && !isDefault && !additionalPermissions.includes(permission.id)) {
                  return null; // Skip permissions that aren't default or added in compact view
                }
                
                return (
                  <Box 
                    key={permission.id} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      py: 1,
                      bgcolor: isModified ? 'action.hover' : 'transparent'
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox 
                          checked={isChecked}
                          onChange={() => !readOnly && handleTogglePermission(permission.id)}
                          disabled={readOnly}
                          color={isModified ? "secondary" : "primary"}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">
                            {getPermissionLabel(permission.id)}
                          </Typography>
                          
                          {isDefault && (
                            <Chip 
                              label="Default" 
                              size="small" 
                              color="default" 
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                          
                          {isModified && (
                            <Chip 
                              label={isDefault ? "Restricted" : "Added"} 
                              size="small" 
                              color={isDefault ? "error" : "success"} 
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                    />
                    
                    <Tooltip title={permission.description}>
                      <IconButton size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
            </FormGroup>
            
            {compactView && (
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={() => setCompactView(false)}
                >
                  Show all permissions
                </Button>
              </Box>
            )}
          </Paper>
        )}
        
        {/* Display only for Admin/Owner */}
        {(teamMember.organizationRole === OrganizationRole.ORG_ADMIN || teamMember.organizationRole === OrganizationRole.OWNER) && (
          <Alert severity="info">
            {teamMember.organizationRole === OrganizationRole.OWNER 
              ? "Organization owners have all permissions across all teams." 
              : "Organization admins have all permissions across all teams."
            } To modify permissions, please change the user's role first.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to get a human-readable permission label
function getPermissionLabel(permissionId: string): string {
  // Convert from snake_case to Title Case with spaces
  return permissionId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to get role descriptions for dual-role architecture
function getOrganizationRoleDescription(role: OrganizationRole): string {
  switch (role) {
    case OrganizationRole.OWNER:
      return 'Owns the organization and has full access to all features, teams, and settings. Can transfer ownership and delete the organization.';
    case OrganizationRole.ORG_ADMIN:
      return 'Has full access to all organization features including user management, all teams, and organization settings. Cannot transfer ownership or delete the organization.';
    case OrganizationRole.MEMBER:
      return 'Team member within the organization structure. Gets specific team roles and permissions based on team assignments.';
    case OrganizationRole.VIEWER:
      return 'Non-team member role for executives/leadership. Has access to analytics, tokens, and audit logs only.';
    default:
      return '';
  }
}

function getTeamRoleDescription(role: TeamRole): string {
  switch (role) {
    case TeamRole.TEAM_ADMIN:
      return 'Team leader with admin privileges for this specific team. Can manage team members and all team content.';
    case TeamRole.EDITOR:
      return 'Senior team member who can handle most tasks except adding team members. Can create, edit, and publish content.';
    case TeamRole.CONTRIBUTOR:
      return 'Team member with access to AI generation and limited analytics. Can create content but may need approval for publishing.';
    case TeamRole.OBSERVER:
      return 'Learning role that can see everything but cannot perform tasks. Ideal for new team members or stakeholders.';
    default:
      return '';
  }
} 
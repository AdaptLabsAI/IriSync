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
  Switch, 
  Select, 
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  IconButton,
  Snackbar
} from '@mui/material';
import AdminGuard from '@/components/admin/AdminGuard';
import useApi from '@/hooks/useApi';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import { ENTERPRISE_FEATURES } from '@/types/todo';

// Feature interface based on systemSettingsSchema
interface FeatureToggle {
  enabled: boolean;
  restrictByRole: boolean;
  allowedRoles: string[];
  restrictBySubscription: boolean;
  allowedSubscriptions: string[];
  description?: string;
}

// Feature mapping with descriptions
const featureDescriptions: Record<string, string> = {
  // Core social media features
  'connect_accounts': 'Connect and manage social media accounts',
  'post_scheduling': 'Schedule posts for future publishing',
  'basic_analytics': 'View basic engagement metrics and statistics',
  'content_calendar': 'Visual content calendar for planning',
  'media_library': 'Store and organize media files',
  'team_collaboration': 'Collaborate with team members on content',
  'notifications': 'Receive notifications for important updates',
  'basic_reporting': 'Generate basic performance reports',
  
  // AI-powered features (token-based)
  'ai_content_generation': 'Generate content using AI (uses tokens)',
  'ai_caption_writing': 'AI-powered caption writing (uses tokens)',
  'ai_hashtag_suggestions': 'Smart hashtag recommendations (uses tokens)',
  'smart_scheduling': 'AI-optimized posting times (uses tokens)',
  'sentiment_analysis': 'AI sentiment analysis of content and mentions (uses tokens)',
  'competitive_analysis': 'AI-powered competitor analysis (uses tokens)',
  'brand_guidelines': 'AI-enforced brand consistency (uses tokens)',
  'content_curation': 'AI-powered content discovery and curation (uses tokens)',
  'design_studio': 'In-app design tools with AI assistance (uses tokens)',
  'social_listening': 'AI-powered brand monitoring and mention analysis (uses tokens)',
  
  // Advanced features
  'bulk_operations': 'Perform bulk operations on multiple posts',
  'advanced_analytics': 'Detailed analytics with custom metrics',
  'custom_reporting': 'Create custom reports and dashboards',
  'white_label': 'White-label branding options',
  'api_access': 'Full API access for integrations',
  'webhook_support': 'Real-time webhook notifications',
  'sso_integration': 'Single Sign-On integration',
  'advanced_permissions': 'Granular role-based permissions',
  'audit_logs': 'Comprehensive audit trail',
  'data_export': 'Export all data in various formats',
  'priority_support': '24/7 priority customer support',
  'dedicated_manager': 'Dedicated account manager',
  
  // Platform-specific features
  'instagram_stories': 'Instagram Stories scheduling and analytics',
  'tiktok_integration': 'TikTok content management',
  'linkedin_company': 'LinkedIn Company Page management',
  'youtube_management': 'YouTube video and channel management',
  'pinterest_boards': 'Pinterest board and pin management',
  
  // Automation features
  'auto_responses': 'AI-powered automated responses (uses tokens)',
  'auto_posting': 'Automated posting based on triggers',
  'workflow_automation': 'Custom workflow automation',
  'rss_integration': 'RSS feed content automation',
  
  // Enterprise features
  'multi_brand': 'Multi-brand account management',
  'enterprise_security': 'Enhanced security features',
  'custom_integrations': 'Custom API integrations',
  'onboarding_support': 'Dedicated onboarding assistance',
  'training_sessions': 'Team training and workshops'
};

// Available subscription tiers
const subscriptionTiers = ['creator', 'influencer', 'enterprise'];

// Available roles
const availableRoles = ['user', 'admin', 'account_manager', 'content_creator', 'analyst', 'super_admin'];

export default function AdminFeatureTogglesPage() {
  // State
  const [features, setFeatures] = useState<Record<string, FeatureToggle>>({});
  const [newFeatureDialogOpen, setNewFeatureDialogOpen] = useState(false);
  const [newFeatureKey, setNewFeatureKey] = useState('');
  const [newFeatureDescription, setNewFeatureDescription] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<FeatureToggle>({
    enabled: true,
    restrictByRole: false,
    allowedRoles: [],
    restrictBySubscription: true,
    allowedSubscriptions: []
  });

  // API hook for system settings
  const { 
    data: systemData, 
    isLoading, 
    error, 
    refetch,
    patch 
  } = useApi<any>('/api/admin/system?section=settings');

  // Load features from system settings
  useEffect(() => {
    if (systemData?.settings?.features) {
      setFeatures(systemData.settings.features);
    }
  }, [systemData]);

  // Handle feature toggle change
  const handleToggleChange = async (featureKey: string, tier: string) => {
    try {
      const updatedFeature = { ...features[featureKey] };
      
      if (updatedFeature.restrictBySubscription) {
        // Update allowed subscriptions
        if (updatedFeature.allowedSubscriptions.includes(tier)) {
          updatedFeature.allowedSubscriptions = updatedFeature.allowedSubscriptions.filter(t => t !== tier);
        } else {
          updatedFeature.allowedSubscriptions = [...updatedFeature.allowedSubscriptions, tier];
        }
      } else {
        // Toggle global enabled state
        updatedFeature.enabled = !updatedFeature.enabled;
      }
      
      // Create updated features object
      const updatedFeatures = {
        ...features,
        [featureKey]: updatedFeature
      };
      
      // Update in state immediately for responsive UI
      setFeatures(updatedFeatures);
      
      // Save to server
      await patch({ 
        settings: { 
          features: { 
            [featureKey]: updatedFeature 
          } 
        } 
      });
      
      setSnackbar({
        open: true,
        message: 'Feature updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating feature:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update feature',
        severity: 'error'
      });
      // Restore original state
      refetch();
    }
  };

  // Add new feature
  const handleAddFeature = async () => {
    if (!newFeatureKey) return;
    
    try {
      const newFeature: FeatureToggle = {
        enabled: true,
        restrictByRole: false,
        allowedRoles: [],
        restrictBySubscription: true,
        allowedSubscriptions: ['enterprise'],
        description: newFeatureDescription || 'No description'
      };
      
      // Update in state
      setFeatures(prev => ({
        ...prev,
        [newFeatureKey]: newFeature
      }));
      
      // Save to server
      await patch({ 
        settings: { 
          features: { 
            [newFeatureKey]: newFeature 
          } 
        } 
      });
      
      setSnackbar({
        open: true,
        message: 'Feature added successfully',
        severity: 'success'
      });
      
      // Reset form
      setNewFeatureKey('');
      setNewFeatureDescription('');
      setNewFeatureDialogOpen(false);
    } catch (error) {
      console.error('Error adding feature:', error);
      setSnackbar({
        open: true,
        message: 'Failed to add feature',
        severity: 'error'
      });
    }
  };

  // Open edit dialog
  const handleEditFeature = (featureKey: string) => {
    setEditingFeature(featureKey);
    setEditFormData({
      ...features[featureKey]
    });
    setEditDialogOpen(true);
  };

  // Save edited feature
  const handleSaveEdit = async () => {
    if (!editingFeature) return;
    
    try {
      // Update in state
      setFeatures(prev => ({
        ...prev,
        [editingFeature]: editFormData
      }));
      
      // Save to server
      await patch({ 
        settings: { 
          features: { 
            [editingFeature]: editFormData 
          } 
        } 
      });
      
      setSnackbar({
        open: true,
        message: 'Feature updated successfully',
        severity: 'success'
      });
      
      // Close dialog
      setEditDialogOpen(false);
      setEditingFeature(null);
    } catch (error) {
      console.error('Error updating feature:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update feature',
        severity: 'error'
      });
    }
  };

  // Handle form field changes in edit dialog
  const handleEditFormChange = (field: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle role selection in edit dialog
  const handleRoleChange = (role: string) => {
    setEditFormData(prev => {
      const roles = [...prev.allowedRoles];
      if (roles.includes(role)) {
        return {
          ...prev,
          allowedRoles: roles.filter(r => r !== role)
        };
      } else {
        return {
          ...prev,
          allowedRoles: [...roles, role]
        };
      }
    });
  };

  // Handle subscription tier selection in edit dialog
  const handleTierChange = (tier: string) => {
    setEditFormData(prev => {
      const tiers = [...prev.allowedSubscriptions];
      if (tiers.includes(tier)) {
        return {
          ...prev,
          allowedSubscriptions: tiers.filter(t => t !== tier)
        };
      } else {
        return {
          ...prev,
          allowedSubscriptions: [...tiers, tier]
        };
      }
    });
  };

  return (
    <AdminGuard>
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Feature Toggles
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setNewFeatureDialogOpen(true)}
          >
            Add Feature
          </Button>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Enable or disable features for each subscription tier and role. Changes take effect immediately.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error.message || 'Failed to load feature toggles'}
          </Alert>
        )}
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Feature</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Creator</TableCell>
                  <TableCell>Influencer</TableCell>
                  <TableCell>Enterprise</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(features).map(([key, feature]) => (
                  <TableRow key={key}>
                    <TableCell>
                      {key}
                      {feature.restrictByRole && (
                        <Chip
                          size="small"
                          label={`${feature.allowedRoles.length} role(s)`}
                          color="secondary"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {feature.description || featureDescriptions[key] || 'No description'}
                    </TableCell>
                    {feature.restrictBySubscription ? (
                      // Subscription-based toggles
                      subscriptionTiers.map(tier => (
                        <TableCell key={tier}>
                          <Switch
                            checked={feature.allowedSubscriptions.includes(tier)}
                            onChange={() => handleToggleChange(key, tier)}
                          />
                        </TableCell>
                      ))
                    ) : (
                      // Global toggle
                      <>
                        <TableCell colSpan={3} align="center">
                          <Switch
                            checked={feature.enabled}
                            onChange={() => handleToggleChange(key, '')}
                          />
                          <Typography variant="caption" display="block">
                            Global toggle (affects all tiers)
                          </Typography>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Button size="small" onClick={() => handleEditFeature(key)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {Object.keys(features).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No features configured. Click &quot;Add Feature&quot; to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        )}
        
        {/* Add New Feature Dialog */}
        <Dialog open={newFeatureDialogOpen} onClose={() => setNewFeatureDialogOpen(false)}>
          <DialogTitle>Add New Feature</DialogTitle>
          <DialogContent sx={{ width: 500, maxWidth: '100%' }}>
            <TextField
              label="Feature Key"
              fullWidth
              value={newFeatureKey}
              onChange={(e) => setNewFeatureKey(e.target.value)}
              sx={{ mt: 2, mb: 2 }}
              helperText="Use snake_case, e.g. custom_feature"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newFeatureDescription}
              onChange={(e) => setNewFeatureDescription(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewFeatureDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleAddFeature}
              disabled={!newFeatureKey}
            >
              Add Feature
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Edit Feature Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
          <DialogTitle>Edit Feature: {editingFeature}</DialogTitle>
          <DialogContent sx={{ width: 500, maxWidth: '100%' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={editFormData.enabled}
                  onChange={(e) => handleEditFormChange('enabled', e.target.checked)}
                />
              }
              label="Enabled"
              sx={{ mb: 2, mt: 2, display: 'block' }}
            />
            
            <Typography variant="subtitle2" gutterBottom>
              Description
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={editFormData.description || ''}
              onChange={(e) => handleEditFormChange('description', e.target.value)}
              sx={{ mb: 3 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={editFormData.restrictBySubscription}
                  onChange={(e) => handleEditFormChange('restrictBySubscription', e.target.checked)}
                />
              }
              label="Restrict by Subscription Tier"
              sx={{ mb: 2, display: 'block' }}
            />
            
            {editFormData.restrictBySubscription && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Available for:
                </Typography>
                {subscriptionTiers.map(tier => (
                  <FormControlLabel
                    key={tier}
                    control={
                      <Checkbox
                        checked={editFormData.allowedSubscriptions.includes(tier)}
                        onChange={() => handleTierChange(tier)}
                      />
                    }
                    label={tier.charAt(0).toUpperCase() + tier.slice(1)}
                  />
                ))}
              </Box>
            )}
            
            <FormControlLabel
              control={
                <Switch
                  checked={editFormData.restrictByRole}
                  onChange={(e) => handleEditFormChange('restrictByRole', e.target.checked)}
                />
              }
              label="Restrict by Role"
              sx={{ mb: 2, display: 'block' }}
            />
            
            {editFormData.restrictByRole && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Available for roles:
                </Typography>
                {availableRoles.map(role => (
                  <FormControlLabel
                    key={role}
                    control={
                      <Checkbox
                        checked={editFormData.allowedRoles.includes(role)}
                        onChange={() => handleRoleChange(role)}
                      />
                    }
                    label={role.replace('_', ' ')}
                  />
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleSaveEdit}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          <Alert
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            severity={snackbar.severity}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </AdminGuard>
  );
} 
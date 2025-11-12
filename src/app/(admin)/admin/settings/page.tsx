'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Divider, 
  Alert, 
  Button,
  CircularProgress,
  Switch,
  FormControlLabel,
  TextField,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack
} from '@mui/material';
import AdminGuard from '@/components/admin/AdminGuard';
import useApi from '@/hooks/useApi';

// System Settings
const SystemSettings = () => {
  const { 
    data: systemSettings, 
    isLoading, 
    error,
    refetch,
    patch 
  } = useApi<any>('/api/admin/settings/system');

  const [formValues, setFormValues] = useState({
    cacheEnabled: true,
    cacheDuration: 3600,
    loggingLevel: 'info',
    mediaStorageProvider: 'default',
    maxUploadSize: 10
  });

  // Update form values when data is loaded
  React.useEffect(() => {
    if (systemSettings) {
      setFormValues({
        cacheEnabled: systemSettings.cacheEnabled ?? true,
        cacheDuration: systemSettings.cacheDuration ?? 3600,
        loggingLevel: systemSettings.loggingLevel ?? 'info',
        mediaStorageProvider: systemSettings.mediaStorageProvider ?? 'default',
        maxUploadSize: systemSettings.maxUploadSize ?? 10
      });
    }
  }, [systemSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormValues({
      ...formValues,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
  };
  
  const handleSave = async () => {
    try {
      await patch(formValues);
    } catch (error) {
      console.error('Error saving system settings:', error);
    }
  };

  return (
    <Box>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
        >
          Error loading system settings: {error.message || 'Failed to load settings'}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            API: /api/admin/settings/system
          </Typography>
          <Button 
            color="inherit" 
            size="small" 
            onClick={() => refetch()}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Alert>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
            System Settings
          </Typography>
          <Typography paragraph>
            Configure application-wide settings, including performance optimization, caching, and data storage options.
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '280px' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Caching</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValues.cacheEnabled}
                      onChange={handleInputChange}
                      name="cacheEnabled"
                    />
                  }
                  label="Enable Caching"
                />
                <TextField
                  fullWidth
                  label="Cache Duration (seconds)"
                  name="cacheDuration"
                  type="number"
                  value={formValues.cacheDuration}
                  onChange={handleInputChange}
                  sx={{ mt: 2 }}
                  disabled={!formValues.cacheEnabled}
                />
              </Paper>
            </Box>
            
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '280px' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Logging</Typography>
                <FormControl fullWidth>
                  <InputLabel>Logging Level</InputLabel>
                  <Select
                    name="loggingLevel"
                    value={formValues.loggingLevel}
                    label="Logging Level"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="debug">Debug</MenuItem>
                    <MenuItem value="info">Info</MenuItem>
                    <MenuItem value="warn">Warning</MenuItem>
                    <MenuItem value="error">Error</MenuItem>
                  </Select>
                </FormControl>
              </Paper>
            </Box>
            
            <Box sx={{ width: '100%' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Media Storage</Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Storage Provider</InputLabel>
                  <Select
                    name="mediaStorageProvider"
                    value={formValues.mediaStorageProvider}
                    label="Storage Provider"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="default">Default (Local)</MenuItem>
                    <MenuItem value="s3">Amazon S3</MenuItem>
                    <MenuItem value="gcs">Google Cloud Storage</MenuItem>
                    <MenuItem value="azure">Azure Blob Storage</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="Max Upload Size (MB)"
                  name="maxUploadSize"
                  type="number"
                  value={formValues.maxUploadSize}
                  onChange={handleInputChange}
                />
              </Paper>
            </Box>
          </Box>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              onClick={handleSave}
              disabled={isLoading}
            >
              Save Changes
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Security Settings
const SecuritySettings = () => {
  const { 
    data: securitySettings, 
    isLoading, 
    error,
    refetch,
    patch 
  } = useApi<any>('/api/admin/settings/security');

  const [formValues, setFormValues] = useState({
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: true,
    mfaEnabled: false,
    mfaRequired: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5
  });

  // Update form values when data is loaded
  React.useEffect(() => {
    if (securitySettings) {
      setFormValues({
        passwordMinLength: securitySettings.passwordMinLength ?? 8,
        passwordRequireUppercase: securitySettings.passwordRequireUppercase ?? true,
        passwordRequireNumber: securitySettings.passwordRequireNumber ?? true,
        passwordRequireSpecial: securitySettings.passwordRequireSpecial ?? true,
        mfaEnabled: securitySettings.mfaEnabled ?? false,
        mfaRequired: securitySettings.mfaRequired ?? false,
        sessionTimeout: securitySettings.sessionTimeout ?? 60,
        maxLoginAttempts: securitySettings.maxLoginAttempts ?? 5
      });
    }
  }, [securitySettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormValues({
      ...formValues,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSave = async () => {
    try {
      await patch(formValues);
    } catch (error) {
      console.error('Error saving security settings:', error);
    }
  };

  return (
    <Box>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
        >
          Error loading security settings: {error.message || 'Failed to load settings'}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            API: /api/admin/settings/security
          </Typography>
          <Button 
            color="inherit" 
            size="small" 
            onClick={() => refetch()}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Alert>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
            Security Settings
          </Typography>
          <Typography paragraph>
            Configure security-related settings such as authentication methods, password policies, and access controls.
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '280px' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Password Policy</Typography>
                <TextField
                  fullWidth
                  label="Minimum Length"
                  name="passwordMinLength"
                  type="number"
                  value={formValues.passwordMinLength}
                  onChange={handleInputChange}
                  sx={{ mb: 2 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValues.passwordRequireUppercase}
                      onChange={handleInputChange}
                      name="passwordRequireUppercase"
                    />
                  }
                  label="Require Uppercase"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValues.passwordRequireNumber}
                      onChange={handleInputChange}
                      name="passwordRequireNumber"
                    />
                  }
                  label="Require Number"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValues.passwordRequireSpecial}
                      onChange={handleInputChange}
                      name="passwordRequireSpecial"
                    />
                  }
                  label="Require Special Character"
                />
              </Paper>
            </Box>
            
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '280px' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Multi-Factor Authentication</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValues.mfaEnabled}
                      onChange={handleInputChange}
                      name="mfaEnabled"
                    />
                  }
                  label="Enable MFA"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValues.mfaRequired}
                      onChange={handleInputChange}
                      name="mfaRequired"
                      disabled={!formValues.mfaEnabled}
                    />
                  }
                  label="Require MFA for All Users"
                />
              </Paper>
            </Box>
            
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '280px' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Session Settings</Typography>
                <TextField
                  fullWidth
                  label="Session Timeout (minutes)"
                  name="sessionTimeout"
                  type="number"
                  value={formValues.sessionTimeout}
                  onChange={handleInputChange}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="Max Login Attempts"
                  name="maxLoginAttempts"
                  type="number"
                  value={formValues.maxLoginAttempts}
                  onChange={handleInputChange}
                />
              </Paper>
            </Box>
          </Box>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              onClick={handleSave}
              disabled={isLoading}
            >
              Save Changes
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Notification Settings
const NotificationSettings = () => {
  const { 
    data: notificationSettings, 
    isLoading, 
    error,
    refetch,
    patch 
  } = useApi<any>('/api/admin/settings/notifications');

  const [formValues, setFormValues] = useState({
    emailNotificationsEnabled: true,
    emailFromName: 'IriSync',
    emailFromAddress: 'notifications@irisync.io',
    adminAlertEmails: '',
    notifyOnNewUser: true,
    notifyOnUserDelete: true,
    notifyOnContentPublish: true,
    notifyOnApiError: true
  });

  // Update form values when data is loaded
  React.useEffect(() => {
    if (notificationSettings) {
      setFormValues({
        emailNotificationsEnabled: notificationSettings.emailNotificationsEnabled ?? true,
        emailFromName: notificationSettings.emailFromName ?? 'IriSync',
        emailFromAddress: notificationSettings.emailFromAddress ?? 'notifications@irisync.io',
        adminAlertEmails: notificationSettings.adminAlertEmails ?? '',
        notifyOnNewUser: notificationSettings.notifyOnNewUser ?? true,
        notifyOnUserDelete: notificationSettings.notifyOnUserDelete ?? true,
        notifyOnContentPublish: notificationSettings.notifyOnContentPublish ?? true,
        notifyOnApiError: notificationSettings.notifyOnApiError ?? true
      });
    }
  }, [notificationSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormValues({
      ...formValues,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSave = async () => {
    try {
      await patch(formValues);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  return (
    <Box>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
        >
          Error loading notification settings: {error.message || 'Failed to load settings'}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            API: /api/admin/settings/notifications
          </Typography>
          <Button 
            color="inherit" 
            size="small" 
            onClick={() => refetch()}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Alert>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
            Notification Settings
          </Typography>
          <Typography paragraph>
            Configure system notifications, email templates, and alerts for administrators and users.
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '280px' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Email Configuration</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValues.emailNotificationsEnabled}
                      onChange={handleInputChange}
                      name="emailNotificationsEnabled"
                    />
                  }
                  label="Enable Email Notifications"
                />
                
                <TextField
                  fullWidth
                  label="From Name"
                  name="emailFromName"
                  value={formValues.emailFromName}
                  onChange={handleInputChange}
                  sx={{ mt: 2 }}
                  disabled={!formValues.emailNotificationsEnabled}
                />
                
                <TextField
                  fullWidth
                  label="From Email Address"
                  name="emailFromAddress"
                  value={formValues.emailFromAddress}
                  onChange={handleInputChange}
                  sx={{ mt: 2 }}
                  disabled={!formValues.emailNotificationsEnabled}
                />
                
                <TextField
                  fullWidth
                  label="Admin Alert Emails (comma separated)"
                  name="adminAlertEmails"
                  value={formValues.adminAlertEmails}
                  onChange={handleInputChange}
                  sx={{ mt: 2 }}
                  disabled={!formValues.emailNotificationsEnabled}
                />
              </Paper>
            </Box>
            
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '280px' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Notification Triggers</Typography>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formValues.notifyOnNewUser}
                        onChange={handleInputChange}
                        name="notifyOnNewUser"
                        disabled={!formValues.emailNotificationsEnabled}
                      />
                    }
                    label="Notify on New User Registration"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formValues.notifyOnUserDelete}
                        onChange={handleInputChange}
                        name="notifyOnUserDelete"
                        disabled={!formValues.emailNotificationsEnabled}
                      />
                    }
                    label="Notify on User Deletion"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formValues.notifyOnContentPublish}
                        onChange={handleInputChange}
                        name="notifyOnContentPublish"
                        disabled={!formValues.emailNotificationsEnabled}
                      />
                    }
                    label="Notify on Content Publication"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formValues.notifyOnApiError}
                        onChange={handleInputChange}
                        name="notifyOnApiError"
                        disabled={!formValues.emailNotificationsEnabled}
                      />
                    }
                    label="Notify on API Errors"
                  />
                </Stack>
              </Paper>
            </Box>
          </Box>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              onClick={handleSave}
              disabled={isLoading}
            >
              Save Changes
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Integration Settings 
const IntegrationSettings = () => {
  const { 
    data: integrationSettings, 
    isLoading, 
    error,
    refetch,
    patch 
  } = useApi<any>('/api/admin/settings/integrations');

  const [formValues, setFormValues] = useState({
    googleAnalyticsId: '',
    facebookPixelId: '',
    hubspotEnabled: false,
    hubspotApiKey: '',
    slackWebhookUrl: '',
    openaiApiKey: ''
  });

  // Update form values when data is loaded
  React.useEffect(() => {
    if (integrationSettings) {
      setFormValues({
        googleAnalyticsId: integrationSettings.googleAnalyticsId ?? '',
        facebookPixelId: integrationSettings.facebookPixelId ?? '',
        hubspotEnabled: integrationSettings.hubspotEnabled ?? false,
        hubspotApiKey: integrationSettings.hubspotApiKey ?? '',
        slackWebhookUrl: integrationSettings.slackWebhookUrl ?? '',
        openaiApiKey: integrationSettings.openaiApiKey ?? ''
      });
    }
  }, [integrationSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormValues({
      ...formValues,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSave = async () => {
    try {
      await patch(formValues);
    } catch (error) {
      console.error('Error saving integration settings:', error);
    }
  };

  return (
    <Box>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
        >
          Error loading integration settings: {error.message || 'Failed to load settings'}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            API: /api/admin/settings/integrations
          </Typography>
          <Button 
            color="inherit" 
            size="small" 
            onClick={() => refetch()}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Alert>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
            Integration Settings
          </Typography>
          <Typography paragraph>
            Configure third-party integrations and APIs, including authentication providers, analytics services, and external tools.
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '280px' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Analytics Integrations</Typography>
                <TextField
                  fullWidth
                  label="Google Analytics ID"
                  name="googleAnalyticsId"
                  value={formValues.googleAnalyticsId}
                  onChange={handleInputChange}
                  sx={{ mb: 2 }}
                  placeholder="UA-XXXXXXXXX-X or G-XXXXXXXXXX"
                />
                
                <TextField
                  fullWidth
                  label="Facebook Pixel ID"
                  name="facebookPixelId"
                  value={formValues.facebookPixelId}
                  onChange={handleInputChange}
                  placeholder="XXXXXXXXXXXXXXXXXX"
                />
              </Paper>
            </Box>
            
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '280px' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>CRM Integration</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValues.hubspotEnabled}
                      onChange={handleInputChange}
                      name="hubspotEnabled"
                    />
                  }
                  label="Enable HubSpot Integration"
                />
                
                <TextField
                  fullWidth
                  label="HubSpot API Key"
                  name="hubspotApiKey"
                  value={formValues.hubspotApiKey}
                  onChange={handleInputChange}
                  sx={{ mt: 2 }}
                  disabled={!formValues.hubspotEnabled}
                  type="password"
                />
              </Paper>
            </Box>
            
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '280px' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Notifications</Typography>
                <TextField
                  fullWidth
                  label="Slack Webhook URL"
                  name="slackWebhookUrl"
                  value={formValues.slackWebhookUrl}
                  onChange={handleInputChange}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </Paper>
            </Box>
            
            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '280px' }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>AI Services</Typography>
                <TextField
                  fullWidth
                  label="OpenAI API Key"
                  name="openaiApiKey"
                  value={formValues.openaiApiKey}
                  onChange={handleInputChange}
                  type="password"
                />
              </Paper>
            </Box>
          </Box>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              onClick={handleSave}
              disabled={isLoading}
            >
              Save Changes
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <AdminGuard>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">Admin Settings</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Configure system-wide settings and preferences
        </Typography>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="admin settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="System" {...a11yProps(0)} />
            <Tab label="Security" {...a11yProps(1)} />
            <Tab label="Notifications" {...a11yProps(2)} />
            <Tab label="Integrations" {...a11yProps(3)} />
          </Tabs>
        </Box>
        
        <TabPanel value={activeTab} index={0}>
          <SystemSettings />
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <SecuritySettings />
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <NotificationSettings />
        </TabPanel>
        
        <TabPanel value={activeTab} index={3}>
          <IntegrationSettings />
        </TabPanel>
      </Paper>
    </AdminGuard>
  );
} 
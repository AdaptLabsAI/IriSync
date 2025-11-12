import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Settings as SettingsIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface CRMConnection {
  id: string;
  provider: 'hubspot' | 'salesforce' | 'zoho' | 'pipedrive' | 'dynamics' | 'sugarcrm';
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync?: Date;
  syncStatus?: {
    contactsCount: number;
    leadsCount: number;
    dealsCount: number;
    lastSyncTime: Date;
    errors?: string[];
  };
  config?: {
    apiUrl?: string;
    instanceUrl?: string;
    portalId?: string;
    orgId?: string;
  };
}

interface CRMConnectionManagerProps {
  connections: CRMConnection[];
  onConnect: (provider: string, config: any) => Promise<void>;
  onDisconnect: (connectionId: string) => Promise<void>;
  onSync: (connectionId: string) => Promise<void>;
  onUpdateConfig: (connectionId: string, config: any) => Promise<void>;
  loading?: boolean;
}

const CRM_PROVIDERS = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Connect your HubSpot CRM to sync contacts and deals',
    logo: '/icons/hubspot.svg',
    color: '#ff7a59',
    fields: [
      { key: 'portalId', label: 'Portal ID', required: true },
      { key: 'apiKey', label: 'API Key', required: true, type: 'password' }
    ]
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Integrate with Salesforce to manage leads and opportunities',
    logo: '/icons/salesforce.svg',
    color: '#00a1e0',
    fields: [
      { key: 'instanceUrl', label: 'Instance URL', required: true },
      { key: 'clientId', label: 'Client ID', required: true },
      { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' }
    ]
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    description: 'Connect Zoho CRM for comprehensive customer management',
    logo: '/icons/zoho.svg',
    color: '#c83c3c',
    fields: [
      { key: 'orgId', label: 'Organization ID', required: true },
      { key: 'clientId', label: 'Client ID', required: true },
      { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' }
    ]
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Sync with Pipedrive for sales pipeline management',
    logo: '/icons/pipedrive.svg',
    color: '#1a73e8',
    fields: [
      { key: 'apiToken', label: 'API Token', required: true, type: 'password' },
      { key: 'companyDomain', label: 'Company Domain', required: true }
    ]
  },
  {
    id: 'dynamics',
    name: 'Microsoft Dynamics',
    description: 'Integrate with Microsoft Dynamics 365',
    logo: '/icons/dynamics.svg',
    color: '#0078d4',
    fields: [
      { key: 'tenantId', label: 'Tenant ID', required: true },
      { key: 'clientId', label: 'Client ID', required: true },
      { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' }
    ]
  },
  {
    id: 'sugarcrm',
    name: 'SugarCRM',
    description: 'Connect SugarCRM for customer relationship management',
    logo: '/icons/sugarcrm.svg',
    color: '#e61718',
    fields: [
      { key: 'baseUrl', label: 'Base URL', required: true },
      { key: 'username', label: 'Username', required: true },
      { key: 'password', label: 'Password', required: true, type: 'password' }
    ]
  }
];

export const CRMConnectionManager: React.FC<CRMConnectionManagerProps> = ({
  connections,
  onConnect,
  onDisconnect,
  onSync,
  onUpdateConfig,
  loading = false
}) => {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<CRMConnection | null>(null);
  const [syncingConnections, setSyncingConnections] = useState<Set<string>>(new Set());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'syncing':
        return <CircularProgress size={20} />;
      default:
        return <WarningIcon sx={{ color: 'warning.main' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'error':
        return 'error';
      case 'syncing':
        return 'info';
      default:
        return 'warning';
    }
  };

  const handleConnect = async () => {
    if (!selectedProvider) return;

    try {
      await onConnect(selectedProvider, configValues);
      setConnectDialogOpen(false);
      setSelectedProvider('');
      setConfigValues({});
    } catch (error) {
      console.error('Failed to connect CRM:', error);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncingConnections(prev => new Set(prev).add(connectionId));
    try {
      await onSync(connectionId);
    } catch (error) {
      console.error('Failed to sync CRM:', error);
    } finally {
      setSyncingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const handleConfigUpdate = async () => {
    if (!editingConnection) return;

    try {
      await onUpdateConfig(editingConnection.id, configValues);
      setConfigDialogOpen(false);
      setEditingConnection(null);
      setConfigValues({});
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const openConfigDialog = (connection: CRMConnection) => {
    setEditingConnection(connection);
    setConfigValues(connection.config || {});
    setConfigDialogOpen(true);
  };

  const getProviderInfo = (providerId: string) => {
    return CRM_PROVIDERS.find(p => p.id === providerId);
  };

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.floor((date.getTime() - Date.now()) / (1000 * 60)),
      'minute'
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          CRM Connections
        </Typography>
        <Button
          variant="contained"
          onClick={() => setConnectDialogOpen(true)}
          disabled={loading}
        >
          Connect CRM
        </Button>
      </Box>

      {connections.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              No CRM connections configured
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Connect your CRM to automatically sync contacts and track social media engagement
            </Typography>
            <Button
              variant="contained"
              onClick={() => setConnectDialogOpen(true)}
            >
              Connect Your First CRM
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {connections.map((connection) => {
            const provider = getProviderInfo(connection.provider);
            const isSyncing = syncingConnections.has(connection.id);

            return (
              <Box key={connection.id} sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          backgroundColor: provider?.color || 'grey.300',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}
                      >
                        <Typography variant="h6" color="white">
                          {provider?.name.charAt(0) || 'C'}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">{provider?.name || connection.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(isSyncing ? 'syncing' : connection.status)}
                          <Chip
                            label={isSyncing ? 'Syncing' : connection.status}
                            size="small"
                            color={getStatusColor(isSyncing ? 'syncing' : connection.status) as any}
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Sync Now">
                          <IconButton
                            size="small"
                            onClick={() => handleSync(connection.id)}
                            disabled={isSyncing || connection.status !== 'connected'}
                          >
                            {isSyncing ? <CircularProgress size={16} /> : <SyncIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Settings">
                          <IconButton
                            size="small"
                            onClick={() => openConfigDialog(connection)}
                          >
                            <SettingsIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {connection.syncStatus && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Last sync: {formatLastSync(connection.syncStatus.lastSyncTime)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Box sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Contacts</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {connection.syncStatus.contactsCount.toLocaleString()}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Leads</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {connection.syncStatus.leadsCount.toLocaleString()}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Deals</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {connection.syncStatus.dealsCount.toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {connection.syncStatus?.errors && connection.syncStatus.errors.length > 0 && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          {connection.syncStatus.errors.length} sync error(s) detected
                        </Typography>
                      </Alert>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => onDisconnect(connection.id)}
                      >
                        Disconnect
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleSync(connection.id)}
                        disabled={isSyncing || connection.status !== 'connected'}
                        startIcon={isSyncing ? <CircularProgress size={16} /> : <RefreshIcon />}
                      >
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Connect CRM Dialog */}
      <Dialog open={connectDialogOpen} onClose={() => setConnectDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Connect CRM</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Select CRM Provider</InputLabel>
              <Select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                label="Select CRM Provider"
              >
                {CRM_PROVIDERS.map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 0.5,
                          backgroundColor: provider.color,
                          mr: 2
                        }}
                      />
                      {provider.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedProvider && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {getProviderInfo(selectedProvider)?.description}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {getProviderInfo(selectedProvider)?.fields.map((field) => (
                  <Box key={field.key} sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
                    <TextField
                      fullWidth
                      label={field.label}
                      type={field.type || 'text'}
                      required={field.required}
                      value={configValues[field.key] || ''}
                      onChange={(e) => setConfigValues(prev => ({
                        ...prev,
                        [field.key]: e.target.value
                      }))}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConnect}
            variant="contained"
            disabled={!selectedProvider || loading}
          >
            Connect
          </Button>
        </DialogActions>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Update Configuration</DialogTitle>
        <DialogContent>
          {editingConnection && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {getProviderInfo(editingConnection.provider)?.fields.map((field) => (
                <Box key={field.key} sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label={field.label}
                    type={field.type || 'text'}
                    required={field.required}
                    value={configValues[field.key] || ''}
                    onChange={(e) => setConfigValues(prev => ({
                      ...prev,
                      [field.key]: e.target.value
                    }))}
                  />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfigUpdate}
            variant="contained"
            disabled={loading}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert, 
  Stack,
  Card,
  CardContent,
  Tab,
  Tabs,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  LinearProgress,
  Button,
  Tooltip,
  IconButton,
} from '@mui/material';
import AdminGuard from '@/components/admin/AdminGuard';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import StorageIcon from '@mui/icons-material/Storage';
import ApiIcon from '@mui/icons-material/Api';
import SecurityIcon from '@mui/icons-material/Security';
import CloudIcon from '@mui/icons-material/Cloud';
import DnsIcon from '@mui/icons-material/Dns';
import RestoreIcon from '@mui/icons-material/Restore';
import GroupIcon from '@mui/icons-material/Group';
import { format, formatDistanceToNow } from 'date-fns';

// Types for system status and metrics
type StatusType = 'operational' | 'degraded' | 'outage' | 'maintenance';

interface ServiceStatus {
  id: string;
  name: string;
  status: StatusType;
  description: string;
  lastUpdated: Date;
  responseTime?: number;
  uptime?: number;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  affectedServices: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
  updates: {
    timestamp: Date;
    status: string;
    message: string;
  }[];
}

interface SystemStats {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  contentCount: {
    posts: number;
    media: number;
    knowledge: number;
  };
  apiUsage: {
    total: number;
    byEndpoint: Record<string, number>;
  };
  systemHealth: {
    uptime: number;
    memoryUsage: number;
    timestamp: string;
  };
}

interface SystemStatusResponse {
  services: ServiceStatus[];
  incidents: Incident[];
  lastUpdated: Date;
  isSampleData?: boolean;
}

// Platform Health Page Component
function PlatformHealthPage() {
  const [currentTab, setCurrentTab] = useState(0);
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Map service IDs to icons
  const serviceIcons: Record<string, React.ElementType> = {
    'api': ApiIcon,
    'webapp': DeviceHubIcon,
    'database': StorageIcon,
    'auth': SecurityIcon,
    'storage': CloudIcon,
    'ml-services': DnsIcon
  };

  // Fetch initial data
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchSystemStatus(),
          fetchSystemStats()
        ]);
      } catch (err) {
        setError('Failed to load platform health data. Please try again later.');
        console.error('Error fetching platform health data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  // Fetch system status
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system-status');
      if (!response.ok) throw new Error('Failed to fetch system status');
      
      const data = await response.json();
      
      // Process dates from strings to Date objects
      const processedData: SystemStatusResponse = {
        ...data,
        lastUpdated: new Date(data.lastUpdated),
        services: (data.services || []).map((service: any) => ({
          ...service,
          lastUpdated: new Date(service.lastUpdated)
        })),
        incidents: (data.incidents || []).map((incident: any) => ({
          ...incident,
          createdAt: new Date(incident.createdAt),
          updatedAt: new Date(incident.updatedAt),
          resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt) : null,
          updates: (incident.updates || []).map((update: any) => ({
            ...update,
            timestamp: new Date(update.timestamp)
          }))
        }))
      };
      
      setSystemStatus(processedData);
      return processedData;
    } catch (err) {
      console.error('Error fetching system status:', err);
      throw err;
    }
  };

  // Fetch system stats
  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/system?section=stats');
      if (!response.ok) throw new Error('Failed to fetch system stats');
      
      const data = await response.json();
      setSystemStats(data.stats);
      return data.stats;
    } catch (err) {
      console.error('Error fetching system stats:', err);
      throw err;
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchSystemStatus(),
        fetchSystemStats()
      ]);
    } catch (err) {
      setError('Failed to refresh data. Please try again later.');
      console.error('Error refreshing data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Helper function to format dates
  const formatDate = (date: Date) => {
    return format(date, 'MMM d, yyyy h:mm a');
  };

  // Helper function to get status color
  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'operational':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'outage':
        return 'error';
      case 'maintenance':
        return 'info';
      default:
        return 'default';
    }
  };

  // Helper function to get status icon
  const getStatusIcon = (status: StatusType) => {
    switch (status) {
      case 'operational':
        return <CheckCircleIcon color="success" />;
      case 'degraded':
        return <WarningIcon color="warning" />;
      case 'outage':
        return <ErrorIcon color="error" />;
      case 'maintenance':
        return <AccessTimeIcon color="info" />;
      default:
        return null;
    }
  };

  // Helper function to get status text
  const getStatusText = (status: StatusType) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded Performance';
      case 'outage':
        return 'Service Outage';
      case 'maintenance':
        return 'Maintenance';
      default:
        return status;
    }
  };

  // Helper function to get incident status color
  const getIncidentStatusColor = (status: string) => {
    switch (status) {
      case 'investigating':
        return 'error';
      case 'identified':
        return 'warning';
      case 'monitoring':
        return 'info';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  // Calculate overall system status
  const calculateOverallStatus = (): StatusType => {
    if (!systemStatus?.services || systemStatus.services.length === 0) return 'operational';
    
    if (systemStatus.services.some(service => service.status === 'outage')) {
      return 'outage';
    } else if (systemStatus.services.some(service => service.status === 'degraded')) {
      return 'degraded';
    } else if (systemStatus.services.some(service => service.status === 'maintenance')) {
      return 'maintenance';
    } else {
      return 'operational';
    }
  };

  // Get active incidents
  const getActiveIncidents = () => {
    return systemStatus?.incidents?.filter(incident => incident.status !== 'resolved') || [];
  };

  // Get resolved incidents
  const getResolvedIncidents = () => {
    return systemStatus?.incidents?.filter(incident => incident.status === 'resolved') || [];
  };

  // Seconds to human readable time
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
      <Typography variant="h4" gutterBottom>
        Platform Health & Monitoring
      </Typography>
          <Typography variant="body1" color="text.secondary">
        View real-time system health, API uptime, error rates, and other platform metrics.
      </Typography>
        </div>
        <Tooltip title="Refresh data">
          <IconButton onClick={handleRefresh} disabled={loading || refreshing}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {(loading && !refreshing) ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* System Status Summary */}
          <Paper sx={{ mb: 4 }}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getStatusIcon(calculateOverallStatus())}
                <Typography variant="h5" sx={{ ml: 1 }}>
                  System Status: {getStatusText(calculateOverallStatus())}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {/* Overall System Health */}
                <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '240px' }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>System Uptime</Typography>
                      <Typography variant="h3" color="text.primary">
                        {systemStats?.systemHealth?.uptime 
                          ? formatUptime(systemStats.systemHealth.uptime)
                          : 'N/A'}
                      </Typography>
                      {systemStats?.systemHealth && (
                        <Typography variant="caption" color="text.secondary">
                          Last updated: {formatDistanceToNow(new Date(systemStats.systemHealth.timestamp))} ago
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>

                {/* Memory Usage */}
                <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '240px' }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Memory Usage</Typography>
                      <Typography variant="h3" color="text.primary">
                        {systemStats?.systemHealth?.memoryUsage 
                          ? `${systemStats.systemHealth.memoryUsage.toFixed(2)} MB`
                          : 'N/A'}
                      </Typography>
                      {systemStats?.systemHealth && (
                        <Typography variant="caption" color="text.secondary">
                          Current server memory allocation
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>

                {/* Active Users */}
                <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '240px' }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Active Users</Typography>
                      <Stack direction="row" spacing={3} justifyContent="center">
                        <Box textAlign="center">
                          <Typography variant="h4" color="text.primary">
                            {systemStats?.activeUsers?.daily || 0}
                          </Typography>
                          <Typography variant="caption">Today</Typography>
                        </Box>
                        <Box textAlign="center">
                          <Typography variant="h4" color="text.primary">
                            {systemStats?.activeUsers?.weekly || 0}
                          </Typography>
                          <Typography variant="caption">This Week</Typography>
                        </Box>
                        <Box textAlign="center">
                          <Typography variant="h4" color="text.primary">
                            {systemStats?.activeUsers?.monthly || 0}
                          </Typography>
                          <Typography variant="caption">This Month</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Tabs */}
          <Paper sx={{ mb: 4 }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Services" />
              <Tab label="Incidents" />
              <Tab label="API Usage" />
              <Tab label="Content Stats" />
            </Tabs>

            {/* Services Tab */}
            {currentTab === 0 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Service Status</Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {systemStatus?.services.map((service) => {
                    const ServiceIcon = serviceIcons[service.id] || DeviceHubIcon;
                    
                    return (
                      <Box 
                        key={service.id} 
                        sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '240px' }}
                      >
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ServiceIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">{service.name}</Typography>
                              </Box>
                              <Chip 
                                label={getStatusText(service.status)} 
                                color={getStatusColor(service.status)}
                                size="small"
                              />
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {service.description}
                            </Typography>
                            
                            {service.responseTime !== undefined && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" display="block" gutterBottom>
                                  Response Time: {service.responseTime}ms
                                </Typography>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={Math.min(100, (200 - service.responseTime) / 2)} 
                                  color={service.responseTime > 200 ? "warning" : "success"}
                                  sx={{ height: 6, borderRadius: 1 }}
                                />
                              </Box>
                            )}
                            
                            {service.uptime !== undefined && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" display="block">
                                  Uptime: {service.uptime.toFixed(2)}%
                                </Typography>
                              </Box>
                            )}
                            
                            <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                              Last updated: {formatDate(service.lastUpdated)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Incidents Tab */}
            {currentTab === 1 && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>Active Incidents</Typography>
                  
                  {getActiveIncidents().length === 0 ? (
                    <Alert severity="success">No active incidents at this time.</Alert>
                  ) : (
                    <Stack spacing={2}>
                      {getActiveIncidents().map((incident) => (
                        <Card key={incident.id} variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="h6">{incident.title}</Typography>
                              <Chip 
                                label={incident.status} 
                                color={getIncidentStatusColor(incident.status)} 
                                size="small"
                              />
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {incident.description}
                            </Typography>
                            
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2">Affected Services:</Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                {incident.affectedServices.map(serviceId => {
                                  const service = systemStatus?.services.find(s => s.id === serviceId);
                                  return (
                                    <Chip 
                                      key={serviceId}
                                      label={service?.name || serviceId}
                                      size="small"
                                      variant="outlined"
                                    />
                                  );
                                })}
                              </Box>
                            </Box>
                            
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2">Updates:</Typography>
                              <Stack spacing={1} sx={{ mt: 1 }}>
                                {incident.updates.map((update, index) => (
                                  <Box key={index} sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                      <Typography variant="caption" fontWeight="bold">
                                        {update.status}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatDate(update.timestamp)}
                                      </Typography>
                                    </Box>
                                    <Typography variant="body2">{update.message}</Typography>
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                              <Typography variant="caption" color="text.secondary">
                                Created: {formatDate(incident.createdAt)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Updated: {formatDate(incident.updatedAt)}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Box>
                
                <Divider sx={{ my: 4 }} />
                
                <Box>
                  <Typography variant="h6" gutterBottom>Recent Resolved Incidents</Typography>
                  
                  {getResolvedIncidents().length === 0 ? (
                    <Alert severity="info">No resolved incidents in the recent history.</Alert>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Title</TableCell>
                            <TableCell>Affected Services</TableCell>
                            <TableCell>Resolved At</TableCell>
                            <TableCell>Duration</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getResolvedIncidents().map((incident) => (
                            <TableRow key={incident.id}>
                              <TableCell>{incident.title}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {incident.affectedServices.map(serviceId => {
                                    const service = systemStatus?.services.find(s => s.id === serviceId);
                                    return (
                                      <Chip 
                                        key={serviceId}
                                        label={service?.name || serviceId}
                                        size="small"
                                        variant="outlined"
                                      />
                                    );
                                  })}
                                </Box>
                              </TableCell>
                              <TableCell>
                                {incident.resolvedAt ? formatDate(incident.resolvedAt) : 'N/A'}
                              </TableCell>
                              <TableCell>
                                {incident.resolvedAt 
                                  ? formatDistanceToNow(new Date(incident.createdAt), { addSuffix: false })
                                  : 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Box>
            )}

            {/* API Usage Tab */}
            {currentTab === 2 && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>API Usage (Last 24 Hours)</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <Card sx={{ width: '100%', maxWidth: 400 }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Total API Requests</Typography>
                        <Typography variant="h2" sx={{ my: 2 }}>
                          {systemStats?.apiUsage?.total?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Past 24 hours
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  
                  <Typography variant="subtitle1" gutterBottom>Requests by Endpoint</Typography>
                  
                  {systemStats?.apiUsage?.byEndpoint && Object.keys(systemStats.apiUsage.byEndpoint).length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Endpoint</TableCell>
                            <TableCell align="right">Requests</TableCell>
                            <TableCell align="right">Percentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(systemStats.apiUsage.byEndpoint)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .map(([endpoint, count]) => (
                              <TableRow key={endpoint}>
                                <TableCell component="th" scope="row">
                                  {endpoint}
                                </TableCell>
                                <TableCell align="right">{count as number}</TableCell>
                                <TableCell align="right">
                                  {((count as number) / systemStats.apiUsage.total * 100).toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">No API usage data available.</Alert>
                  )}
                </Box>
              </Box>
            )}

            {/* Content Stats Tab */}
            {currentTab === 3 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Content Statistics</Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '240px' }}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="text.secondary">Posts</Typography>
                        <Typography variant="h2" sx={{ my: 2 }}>
                          {systemStats?.contentCount?.posts?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total posts across all users
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  
                  <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '240px' }}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="text.secondary">Media Items</Typography>
                        <Typography variant="h2" sx={{ my: 2 }}>
                          {systemStats?.contentCount?.media?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total uploaded media files
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  
                  <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '240px' }}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="text.secondary">Knowledge Articles</Typography>
                        <Typography variant="h2" sx={{ my: 2 }}>
                          {systemStats?.contentCount?.knowledge?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total knowledge base articles
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>

          {systemStatus?.isSampleData && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Note: Some sample data is being displayed. Connect real data sources in production.
            </Alert>
          )}

          {refreshing && (
            <LinearProgress sx={{ mt: 2 }} />
          )}

          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Last updated: {systemStatus?.lastUpdated ? formatDate(systemStatus.lastUpdated) : 'N/A'}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}

export default function AdminSystemStatusPage() {
  return (
    <AdminGuard>
      <PlatformHealthPage />
    </AdminGuard>
  );
} 
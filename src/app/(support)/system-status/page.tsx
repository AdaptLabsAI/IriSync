'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  Breadcrumbs,
  Link as MuiLink,
  Card,
  CardContent,
  Divider,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  useTheme
} from '@mui/material';
import Link from 'next/link';
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
import RefreshIcon from '@mui/icons-material/Refresh';
import Grid from '@/components/ui/grid';

// System component status
type StatusType = 'operational' | 'degraded' | 'outage' | 'maintenance';

interface ServiceStatus {
  id: string;
  name: string;
  status: StatusType;
  description: string;
  lastUpdated: Date;
  responseTime?: number;
  uptime?: number;
  icon?: React.ElementType;
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

// Helper function to get status chip
const getStatusChip = (status: StatusType) => {
  const statusConfig = {
    operational: { label: 'Operational', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
    degraded: { label: 'Degraded', color: 'warning', icon: <WarningIcon fontSize="small" /> },
    outage: { label: 'Outage', color: 'error', icon: <ErrorIcon fontSize="small" /> },
    maintenance: { label: 'Maintenance', color: 'info', icon: <AccessTimeIcon fontSize="small" /> }
  };
  
  const config = statusConfig[status];
  
  return (
    <Chip 
      label={config.label} 
      color={config.color as any} 
      size="small" 
      icon={config.icon}
      sx={{ fontWeight: 500 }}
    />
  );
};

// Format date helper
const formatDate = (date: Date) => {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Fix ServiceStatus interface to mark icon as optional
interface ServiceStatus {
  id: string;
  name: string;
  status: StatusType;
  description: string;
  lastUpdated: Date;
  responseTime?: number;
  uptime?: number;
  icon?: React.ElementType;
}

// Replace all instances of <service.icon> with direct createElement calls
// When rendering in Chip components or other places

// For the Chip icon prop, modify the getStatusIcon function to always return a ReactElement or undefined, not null
const getStatusIcon = (status: StatusType): React.ReactElement | undefined => {
  switch (status) {
    case 'operational':
      return <CheckCircleIcon fontSize="small" />;
    case 'degraded':
      return <WarningIcon fontSize="small" />;
    case 'outage':
      return <ErrorIcon fontSize="small" />;
    case 'maintenance':
      return <AccessTimeIcon fontSize="small" />;
    default:
      return undefined;
  }
};

function SystemStatusContent() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    const fetchSystemStatus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/system-status');
        if (response.ok) {
          const data = await response.json();
          setServices(data.services || []);
          setIncidents(data.incidents || []);
        } else {
          setError('Failed to fetch system status');
          setServices([]);
          setIncidents([]);
        }
      } catch (error) {
        console.error('Error fetching system status:', error);
        setError('Unable to fetch system status');
        setServices([]);
        setIncidents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSystemStatus();
  }, []);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Get active incidents
  const activeIncidents = incidents.filter(
    incident => incident.status !== 'resolved'
  );
  
  // Get past incidents
  const pastIncidents = incidents.filter(
    incident => incident.status === 'resolved'
  );
  
  // Helper function to get incident status chip
  const getIncidentStatusChip = (status: string) => {
    const statusConfig = {
      investigating: { label: 'Investigating', color: 'error' },
      identified: { label: 'Identified', color: 'warning' },
      monitoring: { label: 'Monitoring', color: 'info' },
      resolved: { label: 'Resolved', color: 'success' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    
    return (
      <Chip 
        label={config.label} 
        color={config.color as any} 
        size="small"
        sx={{ fontWeight: 500 }}
      />
    );
  };
  
  // Calculate overall system status
  const getOverallStatus = (): StatusType => {
    if (services.some(service => service.status === 'outage')) {
      return 'outage';
    }
    if (services.some(service => service.status === 'degraded')) {
      return 'degraded';
    }
    if (services.some(service => service.status === 'maintenance')) {
      return 'maintenance';
    }
    return 'operational';
  };
  
  const overallStatus = getOverallStatus();
  
  // Check if there are any ongoing issues
  const hasActiveIncidents = incidents.some(incident => incident.status !== 'resolved');
  const hasNonOperationalComponents = services.some(service => service.status !== 'operational');
  
  // Status display helpers
  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'operational':
        return '#00C957'; // Green
      case 'degraded':
        return '#FFA500'; // Orange
      case 'outage':
        return '#FF4136'; // Red
      case 'maintenance':
        return '#0074D9'; // Blue
      default:
        return 'grey';
    }
  };
  
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
  
  const getIncidentStatusColor = (status: string) => {
    switch (status) {
      case 'investigating':
        return '#FF4136'; // Red
      case 'identified':
        return '#FFA500'; // Orange
      case 'monitoring':
        return '#0074D9'; // Blue
      case 'resolved':
        return '#00C957'; // Green
      default:
        return 'grey';
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/system-status');
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
        setIncidents(data.incidents || []);
      }
    } catch (error) {
      console.error("Error refreshing system status:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header & Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <Typography color="text.primary">System Status</Typography>
        </Breadcrumbs>
        
        <Typography variant="h3" component="h1" gutterBottom>
          System Status
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Current operational status of IriSync services
        </Typography>
      </Box>
      
      {/* Loading state */}
      {isLoading ? (
        <Box sx={{ width: '100%', mb: 4 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            Loading status information...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Overall Status */}
          <Paper
            sx={{
              p: 4,
              mb: 4,
              borderTop: 5,
              borderColor: 
                overallStatus === 'operational' ? 'success.main' :
                overallStatus === 'degraded' ? 'warning.main' :
                overallStatus === 'outage' ? 'error.main' : 'info.main',
            }}
          >
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h4" component="h2">
                System Status:
              </Typography>
              <Box ml={2}>
                {getStatusChip(overallStatus)}
              </Box>
            </Box>
            
            <Typography variant="body1">
              {overallStatus === 'operational' && 
                'All systems are operational. No issues have been reported.'
              }
              {overallStatus === 'degraded' && 
                'Some systems are experiencing performance issues. Our team is working on a resolution.'
              }
              {overallStatus === 'outage' && 
                'We are currently experiencing service outages. Our team is working to restore service as quickly as possible.'
              }
              {overallStatus === 'maintenance' && 
                'Scheduled maintenance is in progress. Some services may be temporarily unavailable.'
              }
            </Typography>
            
            <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
              Last updated: {formatDate(new Date(2025, 4, 9, 8, 30))} (America/New_York)
            </Typography>
          </Paper>
          
          {/* Active Incidents */}
          {activeIncidents.length > 0 && (
            <Box mb={4}>
              <Typography variant="h5" component="h2" gutterBottom>
                Active Incidents
              </Typography>
              
              {activeIncidents.map((incident) => (
                <Paper key={incident.id} sx={{ p: 3, mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" component="h3">
                      {incident.title}
                    </Typography>
                    {getIncidentStatusChip(incident.status)}
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Affected services:
                    </Typography>
                    <Box display="flex" gap={1} mt={0.5}>
                      {incident.affectedServices.map(serviceId => {
                        const service = services.find(s => s.id === serviceId);
                        return service ? (
                          <Chip 
                            key={serviceId}
                            label={service.name}
                            size="small"
                          />
                        ) : null;
                      })}
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Updates:
                  </Typography>
                  
                  {incident.updates.map((update, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box display="flex" alignItems="center" mb={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(update.timestamp)}
                        </Typography>
                        <Box ml={1}>
                          {getIncidentStatusChip(update.status)}
                        </Box>
                      </Box>
                      <Typography variant="body2">
                        {update.message}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              ))}
            </Box>
          )}
          
          {/* Services Status */}
          <Box mb={6}>
            <Typography variant="h5" component="h2" gutterBottom>
              Service Status
            </Typography>
            
            <Grid container spacing={3}>
              {services.map((service) => (
                <Grid key={service.id} item xs={12} sm={6} md={4}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Box display="flex" alignItems="center">
                          <Typography variant="h6" component="h3">
                            {service.name}
                          </Typography>
                        </Box>
                        <Chip
                          label={getStatusText(service.status)}
                          color={
                            service.status === 'operational' ? 'success' :
                            service.status === 'degraded' ? 'warning' :
                            service.status === 'outage' ? 'error' : 'info'
                          }
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {service.description}
                      </Typography>              
                      {service.responseTime && (
                        <Box mt={2}>
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
                      
                      {service.uptime && (
                        <Box mt={2}>
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
                </Grid>
              ))}
            </Grid>
          </Box>
          
          {/* Past Incidents */}
          {pastIncidents.length > 0 && (
            <Box mb={4}>
              <Typography variant="h5" component="h2" gutterBottom>
                Past Incidents
              </Typography>
              
              <Paper sx={{ p: 0 }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Incident</TableCell>
                        <TableCell>Affected Services</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pastIncidents.map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell>{formatDate(incident.createdAt)}</TableCell>
                          <TableCell>{incident.title}</TableCell>
                          <TableCell>
                            <Box display="flex" gap={0.5} flexWrap="wrap">
                              {incident.affectedServices.map(serviceId => {
                                const service = services.find(s => s.id === serviceId);
                                return service ? (
                                  <Chip 
                                    key={serviceId}
                                    label={service.name}
                                    size="small"
                                    variant="outlined"
                                  />
                                ) : null;
                              })}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {getIncidentStatusChip(incident.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}
          
          {/* Information Card */}
          <Alert severity="info" sx={{ mb: 4 }}>
            <Typography variant="subtitle2">Need help?</Typography>
            <Typography variant="body2">
              If you are experiencing issues with IriSync that are not reflected on this status page, 
              please contact support at <MuiLink href="mailto:support@irisync.com">support@irisync.com</MuiLink> or 
              visit our <Link href="/support">Support Center</Link>.
            </Typography>
          </Alert>
          
          {/* Overall Status */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {!hasActiveIncidents && !hasNonOperationalComponents ? (
                  <>
                    <CheckCircleIcon sx={{ color: '#00C957', mr: 2, fontSize: 28 }} />
                    <Typography variant="h5">All Systems Operational</Typography>
                  </>
                ) : (
                  <>
                    <WarningIcon sx={{ color: '#FFA500', mr: 2, fontSize: 28 }} />
                    <Typography variant="h5">Some Systems Experiencing Issues</Typography>
                  </>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Last updated: {formatDate(new Date(2025, 4, 9, 8, 30))}
              </Typography>
            </Box>
          </Paper>
          
          {/* Active Incidents */}
          {hasActiveIncidents && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Active Incidents
              </Typography>
              {incidents
                .filter(incident => incident.status !== 'resolved')
                .map((incident) => (
                  <Paper key={incident.id} sx={{ p: 3, mb: 2, border: '1px solid', borderColor: getIncidentStatusColor(incident.status), borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {incident.title}
                      </Typography>
                      <Chip
                        label={incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                        sx={{
                          bgcolor: `${getIncidentStatusColor(incident.status)}20`,
                          color: getIncidentStatusColor(incident.status)
                        }}
                      />
                    </Box>
                    <Typography variant="body1" paragraph>
                      {incident.description}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Affected Components:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {incident.affectedServices.map(serviceId => {
                          const service = services.find(s => s.id === serviceId);
                          return service ? (
                            <Chip
                              key={serviceId}
                              label={service.name}
                              size="small"
                            />
                          ) : null;
                        })}
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Updates:
                    </Typography>
                    {incident.updates.map((update, index) => (
                      <Box key={index} sx={{ mb: 2, pl: 2, borderLeft: '2px solid', borderColor: getIncidentStatusColor(update.status) }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="subtitle2">
                            {update.status.charAt(0).toUpperCase() + update.status.slice(1)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(update.timestamp)}
                          </Typography>
                        </Box>
                        <Typography variant="body2">
                          {update.message}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                ))}
            </Box>
          )}
          
          {/* Components Status */}
          <Box sx={{ mb: 6 }}>
            <Typography variant="h5" gutterBottom>
              Components Status
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Last Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id} hover>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {service.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(service.status)}
                          color={
                            service.status === 'operational' ? 'success' :
                            service.status === 'degraded' ? 'warning' :
                            service.status === 'outage' ? 'error' : 'info'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{service.description}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(service.lastUpdated)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          
          {/* Past Incidents */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Past Incidents
            </Typography>
            {incidents
              .filter(incident => incident.status === 'resolved')
              .map((incident) => (
                <Paper key={incident.id} sx={{ p: 3, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      {incident.title}
                    </Typography>
                    <Chip
                      label="Resolved"
                      sx={{
                        bgcolor: `${getIncidentStatusColor('resolved')}20`,
                        color: getIncidentStatusColor('resolved')
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Started: {formatDate(incident.createdAt)}
                    </Typography>
                    {incident.resolvedAt && (
                      <Typography variant="body2" color="text.secondary">
                        Resolved: {formatDate(incident.resolvedAt)}
                      </Typography>
                    )}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ mb: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                      {incident.updates[incident.updates.length - 1]?.message || 'No details available'}
                    </Typography>
                  </Box>
                </Paper>
              ))}
          </Box>
          
          {/* Subscription */}
          <Paper sx={{ p: 4, bgcolor: theme.palette.primary.light, color: theme.palette.primary.contrastText }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={8}>
                <Typography variant="h5" gutterBottom>
                  Subscribe to Status Updates
                </Typography>
                <Typography variant="body1">
                  Get notified about system incidents and maintenance windows via email or SMS.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
                <Button
                  variant="contained"
                  color="secondary"
                  sx={{ color: '#fff', bgcolor: theme.palette.primary.dark }}
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Subscribe'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Container>
  );
}

// Wrap with MainLayout
export default function SystemStatusPage() {
  return (
    <SystemStatusContent />
  );
} 
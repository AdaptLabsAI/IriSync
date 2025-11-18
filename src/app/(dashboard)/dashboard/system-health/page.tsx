/**
 * System Health Dashboard Page
 * Displays real-time system health and performance metrics
 * Admin-only page
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudIcon from '@mui/icons-material/Cloud';
import PaymentIcon from '@mui/icons-material/Payment';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ShareIcon from '@mui/icons-material/Share';
import ServiceStatusCard from '@/components/system-health/ServiceStatusCard';
import { SystemHealthResponse } from '@/lib/features/system/models/health';
import { tokens } from '@/styles/tokens';

export default function SystemHealthPage() {
  const [healthData, setHealthData] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch system health
  const fetchSystemHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/system/health');

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch system health');
      }

      const data = await response.json();
      setHealthData(data.data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSystemHealth();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  // Get overall status config
  const getOverallStatusConfig = (status: string) => {
    switch (status) {
      case 'operational':
        return {
          color: tokens.colors.state.success,
          bgcolor: tokens.colors.accent.teal + '15',
          label: 'All Systems Operational',
        };
      case 'degraded':
        return {
          color: tokens.colors.state.warning,
          bgcolor: tokens.colors.accent.orange + '15',
          label: 'Some Systems Degraded',
        };
      case 'down':
        return {
          color: tokens.colors.state.error,
          bgcolor: tokens.colors.accent.red + '15',
          label: 'System Issues Detected',
        };
      default:
        return {
          color: tokens.colors.gray[500],
          bgcolor: tokens.colors.gray[100],
          label: 'Status Unknown',
        };
    }
  };

  // Render loading state
  if (loading && !healthData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
        <Button onClick={fetchSystemHealth} sx={{ mt: 2 }} variant="contained">
          Retry
        </Button>
      </Box>
    );
  }

  if (!healthData) {
    return (
      <Box>
        <Alert severity="info">
          <AlertTitle>No Data</AlertTitle>
          Unable to load system health data.
        </Alert>
      </Box>
    );
  }

  const overallConfig = getOverallStatusConfig(healthData.overall);

  return (
    <Box>
      {/* Page Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            System Health
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor the health and performance of IriSync services
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={fetchSystemHealth}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Overall Status Banner */}
      <Card
        sx={{
          mb: 3,
          bgcolor: overallConfig.bgcolor,
          border: `1px solid ${overallConfig.color}30`,
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={600} color={overallConfig.color}>
                {overallConfig.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last updated: {new Date(healthData.lastUpdated).toLocaleString()}
              </Typography>
            </Box>

            <Chip
              label={healthData.overall.toUpperCase()}
              sx={{
                bgcolor: overallConfig.color,
                color: 'white',
                fontWeight: 700,
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* System Metrics Overview */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Uptime (24h)
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {healthData.metrics.uptime.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Avg Response Time
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {healthData.metrics.avgResponseTime.toFixed(0)}ms
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Error Rate
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {healthData.metrics.errorRate.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Active Users
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {healthData.metrics.activeUsers.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Core Services */}
      <Typography variant="h6" fontWeight={600} mb={2}>
        Core Services
      </Typography>

      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} lg={4}>
          <ServiceStatusCard
            name="Firebase"
            health={healthData.services.firebase}
            icon={<CloudIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <ServiceStatusCard
            name="Stripe"
            health={healthData.services.stripe}
            icon={<PaymentIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <ServiceStatusCard
            name="OpenAI"
            health={healthData.services.openai}
            icon={<SmartToyIcon />}
          />
        </Grid>
      </Grid>

      {/* Social Platform Integrations */}
      <Typography variant="h6" fontWeight={600} mb={2}>
        Social Platform Integrations
      </Typography>

      <Grid container spacing={2}>
        {Object.entries(healthData.services.socialPlatforms).map(([platform, health]) => (
          <Grid item xs={12} sm={6} lg={4} key={platform}>
            <ServiceStatusCard
              name={platform.charAt(0).toUpperCase() + platform.slice(1)}
              health={health}
              icon={<ShareIcon />}
            />
          </Grid>
        ))}
      </Grid>

      {/* Footer note */}
      <Alert severity="info" sx={{ mt: 4 }}>
        <AlertTitle>Auto-Refresh</AlertTitle>
        This page automatically refreshes every 30 seconds to provide real-time system status.
      </Alert>
    </Box>
  );
}

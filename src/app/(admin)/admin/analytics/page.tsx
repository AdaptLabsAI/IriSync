'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Card, 
  CardContent,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import AdminGuard from '@/components/admin/AdminGuard';

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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
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
    id: `analytics-tab-${index}`,
    'aria-controls': `analytics-tabpanel-${index}`,
  };
}

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/system?section=stats');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      setStats(data.stats);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <AdminGuard>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          View system-wide, user, and content analytics. Use filters to drill down into specific metrics.
        </Typography>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : stats ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Paper sx={{ p: 3, textAlign: 'center', flex: '1 1 calc(33.33% - 16px)', minWidth: '250px' }}>
              <Typography variant="h6">Total Users (Monthly Active)</Typography>
              <Typography variant="h3">{stats.activeUsers?.monthly ?? '-'}</Typography>
              <Typography variant="caption" color="text.secondary">Monthly Active</Typography>
            </Paper>
            <Paper sx={{ p: 3, textAlign: 'center', flex: '1 1 calc(33.33% - 16px)', minWidth: '250px' }}>
              <Typography variant="h6">Active Content (Posts)</Typography>
              <Typography variant="h3">{stats.contentCount?.posts ?? '-'}</Typography>
              <Typography variant="caption" color="text.secondary">Current</Typography>
            </Paper>
            <Paper sx={{ p: 3, textAlign: 'center', flex: '1 1 calc(33.33% - 16px)', minWidth: '250px' }}>
              <Typography variant="h6">API Usage (24h)</Typography>
              <Typography variant="h3" color="success.main">{stats.apiUsage?.total ?? '-'}</Typography>
              <Typography variant="caption" color="text.secondary">API Calls (last 24h)</Typography>
            </Paper>
          </Box>
        ) : null}
      </Box>
    </AdminGuard>
  );
} 
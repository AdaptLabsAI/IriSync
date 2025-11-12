'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress, 
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Divider,
  LinearProgress
} from '@mui/material';
import Grid from '@/components/ui/grid';
import AdminGuard from '@/components/admin/AdminGuard';
import SupportTicketAnalytics from '../tickets/analytics';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { InfoOutlined, GetApp, CalendarToday } from '@mui/icons-material';
import { 
  PieChart, Pie, Cell, BarChart, Bar, Area, AreaChart 
} from 'recharts';
import { IconButton, Tooltip as MuiTooltip } from '@mui/material';

// Trending card component
const TrendCard = ({ title, value, previousValue, icon, isTime = false }: { 
  title: string, 
  value: number, 
  previousValue: number, 
  icon: React.ReactNode,
  isTime?: boolean 
}) => {
  const diff = value - previousValue;
  const percent = previousValue ? Math.round((diff / previousValue) * 100) : 0;
  const isPositive = diff > 0;
  const isNeutral = diff === 0;
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
              {isTime ? `${value} min` : value}
            </Typography>
          </Box>
          <Box sx={{ 
            backgroundColor: 'action.hover',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </Box>
        </Box>
        
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
          {isNeutral ? (
            <Typography variant="body2" color="text.secondary">No change</Typography>
          ) : (
            <>
              {isPositive ? (
                <TrendingUpIcon color={isTime ? "error" : "success"} fontSize="small" />
              ) : (
                <TrendingDownIcon color={isTime ? "success" : "error"} fontSize="small" />
              )}
              <Typography 
                variant="body2" 
                color={isPositive 
                  ? (isTime ? "error.main" : "success.main") 
                  : (isTime ? "success.main" : "error.main")
                }
                sx={{ ml: 0.5 }}
              >
                {isPositive ? '+' : ''}{percent}% {isTime ? (isPositive ? 'slower' : 'faster') : ''}
              </Typography>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// Enhanced Analytics Dashboard component
const SupportTicketStatsDashboard = () => {
  const [timeFrame, setTimeFrame] = React.useState('month');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);
  const [prevPeriodData, setPrevPeriodData] = React.useState<any>(null);
  const [showComparison, setShowComparison] = React.useState(true);

  // Color constants
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const STATUS_COLORS = {
    open: '#f44336',
    pending: '#ff9800',
    closed: '#4caf50',
    converted: '#2196f3'
  };

  // Fetch analytics data
  React.useEffect(() => {
    fetchData();
  }, [timeFrame]);

  const fetchData = async () => {
      setLoading(true);
      setError(null);
    try {
      // Fetch main period data
      const response = await fetch(`/api/support/tickets/analytics?timeFrame=${timeFrame}${showComparison ? '&compareTo=previous' : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const result = await response.json();
      setData(result);
      
      // Set previous period data if available
      if (result.changes) {
        // Create derived previous period data
        const prev = { ...result };
        delete prev.changes;
        
        Object.keys(result.changes).forEach(key => {
          if (typeof result[key] === 'number') {
            const changePercent = result.changes[key];
            const prevValue = changePercent === 0 
              ? result[key] 
              : Math.round(result[key] / (1 + (changePercent / 100)));
            prev[key] = prevValue;
          }
        });
        
        setPrevPeriodData(prev);
      } else {
        setPrevPeriodData(null);
      }
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      setError(error.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
  // Get change indicator (↑ or ↓) and color based on value and metric
  const getChangeIndicator = (value: number, metric: string) => {
    // For time-based metrics, lower is better
    const isTimeBased = metric.includes('Time');
    const isPositive = isTimeBased ? value < 0 : value > 0;
    
    const color = isPositive ? '#4caf50' : value === 0 ? '#757575' : '#f44336';
    const indicator = value === 0 ? '' : (isPositive ? '↑' : '↓');
    
    return { color, indicator };
  };

  // Format percentage change for display
  const formatChange = (value: number, metric: string) => {
    if (!value && value !== 0) return '';
    
    const { color, indicator } = getChangeIndicator(value, metric);
    return (
      <Typography variant="body2" sx={{ color, display: 'inline' }}>
        {indicator} {Math.abs(value)}%
      </Typography>
    );
  };

  // Create statistic card component
  const StatCard = ({ title, value, prevValue, change, metric, icon }: any) => {
    const formattedValue = metric.includes('Time') ? `${value} min` : value;
    
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="h6" component="div" color="text.secondary">
              {title}
            </Typography>
            {icon}
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h4" component="div">
              {formattedValue}
            </Typography>
            {change !== undefined && (
              <Typography variant="body2" color="text.secondary">
                vs previous: {formatChange(change, metric)}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Skip rendering if still loading initial data
  if (loading && !data) {
    return (
      <AdminGuard>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
        </Box>
      </AdminGuard>
    );
  }

  // Show error state
  if (error) {
    return (
      <AdminGuard>
        <Box sx={{ p: 3 }}>
          <Typography color="error" variant="h6">Error: {error}</Typography>
        </Box>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Support Ticket Statistics</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Time Period</InputLabel>
              <Select
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value)}
                label="Time Period"
                size="small"
              >
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
                <MenuItem value="quarter">Last Quarter</MenuItem>
                <MenuItem value="year">Last Year</MenuItem>
                <MenuItem value="all">All Time</MenuItem>
              </Select>
            </FormControl>
            <IconButton 
              onClick={() => setShowComparison(!showComparison)}
              color={showComparison ? "primary" : "default"}
            >
              <MuiTooltip title="Toggle comparison with previous period">
                <CalendarToday />
              </MuiTooltip>
            </IconButton>
          </Box>
        </Box>

        {/* Main Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <StatCard 
              title="Total Tickets" 
              value={data?.total || 0} 
              change={data?.changes?.total}
              metric="total"
              icon={<InfoOutlined color="primary" />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <StatCard 
              title="Open Tickets" 
              value={data?.open || 0}
              change={data?.changes?.open}
              metric="open"
              icon={<InfoOutlined sx={{ color: STATUS_COLORS.open }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <StatCard 
              title="Closed Tickets" 
              value={data?.closed || 0}
              change={data?.changes?.closed}
              metric="closed"
              icon={<InfoOutlined sx={{ color: STATUS_COLORS.closed }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <StatCard 
              title="Avg Response Time" 
              value={data?.avgResponseTime || 0}
              change={data?.changes?.avgResponseTime}
              metric="avgResponseTime"
              icon={<InfoOutlined color="secondary" />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <StatCard 
              title="Avg Resolution Time" 
              value={data?.avgCloseTime || 0}
              change={data?.changes?.avgCloseTime}
              metric="avgCloseTime"
              icon={<InfoOutlined color="secondary" />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <StatCard 
              title="Satisfaction" 
              value={data?.avgSatisfaction ? data.avgSatisfaction.toFixed(1) : 'N/A'}
              change={data?.changes?.avgSatisfaction}
              metric="avgSatisfaction"
              icon={<InfoOutlined sx={{ color: '#FFD700' }} />}
            />
          </Grid>
        </Grid>

        {/* Charts Row 1 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Tickets by Status */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Tickets by Status</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.byStatus ? Object.entries(data.byStatus).map(([key, value]) => ({ name: key, value })) : []}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data?.byStatus && Object.keys(data.byStatus).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Tickets by Priority */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Tickets by Priority</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.byPriority ? Object.entries(data.byPriority).map(([key, value]) => ({ name: key, value })) : []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {data?.byPriority && Object.keys(data.byPriority).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Charts Row 2 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Response Time Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Response Time Distribution</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.responseTimeDistribution ? 
                      Object.entries(data.responseTimeDistribution).map(([key, value]) => ({ name: key, value })) : 
                      []
                    }
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2196f3" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Satisfaction Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Satisfaction Distribution</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.satisfaction ? 
                        Object.entries(data.satisfaction).map(([key, value]) => ({ name: key, value })) : 
                        []
                      }
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => (percent * 100).toFixed(0) + '%'}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data?.satisfaction && Object.keys(data.satisfaction).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Charts Row 3 */}
        <Grid container spacing={3}>
          {/* Tickets by Time of Day */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Tickets by Time of Day</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.byTimeOfDay ? 
                      Object.entries(data.byTimeOfDay).map(([key, value]) => ({ name: key, value })) : 
                      []
                    }
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
              </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Tickets by Day of Week */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Tickets by Day of Week</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.byDayOfWeek ? 
                      Object.entries(data.byDayOfWeek).map(([key, value]) => ({ name: key, value })) : 
                      []
                    }
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                    <Bar dataKey="value" fill="#2196f3" />
                  </BarChart>
              </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Full Analytics Component */}
            <Box sx={{ mt: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Detailed Analytics</Typography>
              <SupportTicketAnalytics />
          </Paper>
            </Box>
      </Box>
    </AdminGuard>
  );
};

export default SupportTicketStatsDashboard; 
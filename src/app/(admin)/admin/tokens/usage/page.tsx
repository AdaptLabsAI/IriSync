'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid as MuiGrid, 
  Card, 
  CardContent,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  IconButton,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import AdminGuard from '@/components/admin/AdminGuard';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import useApi from '@/hooks/useApi';
import { format } from 'date-fns';

// Create a properly typed Grid wrapper component for MUI v7
interface GridProps {
  item?: boolean;
  container?: boolean;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  spacing?: number;
  alignItems?: string;
  justifyContent?: string;
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  children?: React.ReactNode;
  sx?: any;
  key?: string | number;
}

const Grid = (props: GridProps) => <MuiGrid {...props} />;

// Charts colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];
const SUBSCRIPTION_COLORS = {
  'creator': '#00C49F',
  'influencer': '#0088FE',
  'enterprise': '#8884d8',
  'none': '#FFBB28',
  'unknown': '#FF8042'
};

interface TokenStats {
  total: number;
  totalTokensUsed: number;
  byTaskType: Record<string, number>;
  bySubscriptionTier: Record<string, number>;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  byDay: Record<string, number>;
  topUsers: Array<{userId: string; tokenCount: number, tier: string}>;
  usageHistory: Array<{date: string; count: number}>;
  freeOperations: number;
  paidOperations: number;
  successCount: number;
  failureCount: number;
}

function TokenUsagePage() {
  // State
  const [period, setPeriod] = useState('month');
  const [refreshing, setRefreshing] = useState(false);
  
  // API call
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useApi<{ stats: TokenStats }>(`/api/admin/tokens/stats?period=${period}`);
  
  // Format data for charts
  const taskTypeData = data?.stats?.byTaskType 
    ? Object.entries(data.stats.byTaskType)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    : [];
  
  const subscriptionData = data?.stats?.bySubscriptionTier
    ? Object.entries(data.stats.bySubscriptionTier)
        .map(([name, value]) => ({ name, value }))
    : [];
  
  const usageHistoryData = data?.stats?.usageHistory || [];
  
  const freeVsPaidData = data?.stats
    ? [
        { name: 'Free Operations', value: data.stats.freeOperations },
        { name: 'Paid Operations', value: data.stats.paidOperations }
      ]
    : [];
  
  const successRateData = data?.stats
    ? [
        { name: 'Success', value: data.stats.successCount },
        { name: 'Failure', value: data.stats.failureCount }
      ]
    : [];
  
  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  
  // Handle period change
  const handlePeriodChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setPeriod(event.target.value as string);
  };
  
  // Handle export
  const handleExportCSV = () => {
    if (!data?.stats) return;
    
    // Prepare data
    const taskTypeCSV = Object.entries(data.stats.byTaskType)
      .map(([type, count]) => `${type},${count}`)
      .join('\n');
    
    const topUsersCSV = data.stats.topUsers
      .map(user => `${user.userId},${user.tier},${user.tokenCount}`)
      .join('\n');
    
    const csv = `Token Usage Statistics (${period})\n\n` +
      `Total Operations,${data.stats.total}\n` +
      `Total Tokens Used,${data.stats.totalTokensUsed}\n` +
      `Free Operations,${data.stats.freeOperations}\n` +
      `Paid Operations,${data.stats.paidOperations}\n` +
      `Success Rate,${(data.stats.successCount / data.stats.total * 100).toFixed(2)}%\n\n` +
      `Task Type Distribution\n` +
      `Type,Count\n${taskTypeCSV}\n\n` +
      `Top Users\n` +
      `User ID,Subscription Tier,Token Count\n${topUsersCSV}\n`;
    
    // Create and download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `token-usage-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          AI Token Usage Statistics
        </Typography>
        
        <Box display="flex" gap={2}>
          <FormControl variant="outlined" size="small" style={{ minWidth: 150 }}>
            <InputLabel id="period-select-label">Time Period</InputLabel>
            <Select
              labelId="period-select-label"
              id="period-select"
              value={period}
              onChange={handlePeriodChange as any}
              label="Time Period"
            >
              <MenuItem value="day">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            disabled={isLoading || !data}
          >
            Export
          </Button>
          
          <IconButton 
            onClick={handleRefresh} 
            disabled={isLoading || refreshing}
            color="primary"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load token usage statistics: {error.message || "Unknown error"}
        </Alert>
      )}
      
      {isLoading ? (
        <Box display="flex" justifyContent="center" my={5}>
          <CircularProgress />
        </Box>
      ) : data?.stats ? (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Operations
                  </Typography>
                  <Typography variant="h4">
                    {data.stats.total.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Tokens Used
                  </Typography>
                  <Typography variant="h4">
                    {data.stats.totalTokensUsed.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Free vs Paid Operations
                  </Typography>
                  <Typography variant="h4">
                    {data.stats.paidOperations.toLocaleString()} / {data.stats.freeOperations.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Paid / Free
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Success Rate
                  </Typography>
                  <Typography variant="h4">
                    {((data.stats.successCount / data.stats.total) * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {data.stats.successCount.toLocaleString()} successful operations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Charts Row 1 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Task Type Distribution
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={taskTypeData.slice(0, 10)} // Top 10 for readability
                      margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Operations" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Usage by Subscription Tier
                </Typography>
                <Box height={300} display="flex" alignItems="center" justifyContent="center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subscriptionData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {subscriptionData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={SUBSCRIPTION_COLORS[entry.name as keyof typeof SUBSCRIPTION_COLORS] || COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Charts Row 2 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Usage Over Time
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={usageHistoryData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        name="Operations" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Free vs Paid Operations
                    </Typography>
                    <Box height={140} display="flex" alignItems="center" justifyContent="center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={freeVsPaidData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={50}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell fill="#00C49F" /> {/* Free */}
                            <Cell fill="#FF8042" /> {/* Paid */}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Success Rate
                    </Typography>
                    <Box height={140} display="flex" alignItems="center" justifyContent="center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={successRateData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={50}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell fill="#00C49F" /> {/* Success */}
                            <Cell fill="#FF8042" /> {/* Failure */}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Top Users Table */}
          <Paper sx={{ p: 2, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Top Token Users
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User ID</TableCell>
                    <TableCell>Subscription Tier</TableCell>
                    <TableCell align="right">Token Count</TableCell>
                    <TableCell align="right">% of Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.stats.topUsers.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>{user.userId}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.tier} 
                          size="small" 
                          sx={{ 
                            bgcolor: SUBSCRIPTION_COLORS[user.tier as keyof typeof SUBSCRIPTION_COLORS] || COLORS[0],
                            color: 'white'
                          }} 
                        />
                      </TableCell>
                      <TableCell align="right">{user.tokenCount.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        {((user.tokenCount / data.stats.totalTokensUsed) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          No token usage data available for the selected period.
        </Alert>
      )}
    </Box>
  );
}

export default function AdminTokenUsagePage() {
  return (
    <AdminGuard>
      <TokenUsagePage />
    </AdminGuard>
  );
} 
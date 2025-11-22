import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  ThumbUp,
  Visibility,
  Share,
  MoreVert as MoreIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  overview: {
    totalEngagement: number;
    totalReach: number;
    totalImpressions: number;
    totalFollowers: number;
    periodChange: {
      engagement: number;
      reach: number;
      impressions: number;
      followers: number;
    };
  };
  platforms: Array<{
    name: string;
    engagement: number;
    reach: number;
    impressions: number;
    followers: number;
    posts: number;
    color: string;
    growth: number;
  }>;
  engagementTrends: Array<{
    date: string;
    engagement: number;
    reach: number;
    impressions: number;
  }>;
  topContent: Array<{
    id: string;
    platform: string;
    content: string;
    engagement: number;
    reach: number;
    date: string;
  }>;
  audienceInsights: {
    demographics: Array<{
      label: string;
      value: number;
      color: string;
    }>;
    locations: Array<{
      country: string;
      percentage: number;
    }>;
    interests: Array<{
      category: string;
      percentage: number;
    }>;
  };
}

interface UnifiedAnalyticsDashboardProps {
  data: AnalyticsData;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onExport?: (format: 'pdf' | 'csv' | 'xlsx') => void;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const UnifiedAnalyticsDashboard: React.FC<UnifiedAnalyticsDashboardProps> = ({
  data,
  loading = false,
  error,
  onRefresh,
  onExport,
  dateRange
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
  };

  const MetricCard: React.FC<{
    title: string;
    value: number;
    change: number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, change, icon, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ color: color }}>
            {icon}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {change >= 0 ? (
              <TrendingUp sx={{ color: 'success.main', fontSize: 20, mr: 0.5 }} />
            ) : (
              <TrendingDown sx={{ color: 'error.main', fontSize: 20, mr: 0.5 }} />
            )}
            <Typography 
              variant="body2" 
              sx={{ 
                color: change >= 0 ? 'success.main' : 'error.main',
                fontWeight: 600
              }}
            >
              {formatPercentage(change)}
            </Typography>
          </Box>
        </Box>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
          {formatNumber(value)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </Card>
  );

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    onExport?.(format);
    handleExportClose();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={onRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={handleExportClick}>
            <DownloadIcon />
          </IconButton>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportClose}
          >
            <MenuItem onClick={() => handleExport('pdf')}>Export as PDF</MenuItem>
            <MenuItem onClick={() => handleExport('csv')}>Export as CSV</MenuItem>
            <MenuItem onClick={() => handleExport('xlsx')}>Export as Excel</MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Overview Metrics */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '250px' }}>
          <MetricCard
            title="Total Engagement"
            value={data.overview.totalEngagement}
            change={data.overview.periodChange.engagement}
            icon={<ThumbUp />}
            color={theme.palette.primary.main}
          />
        </Box>
        <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '250px' }}>
          <MetricCard
            title="Total Reach"
            value={data.overview.totalReach}
            change={data.overview.periodChange.reach}
            icon={<Visibility />}
            color={theme.palette.success.main}
          />
        </Box>
        <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '250px' }}>
          <MetricCard
            title="Total Impressions"
            value={data.overview.totalImpressions}
            change={data.overview.periodChange.impressions}
            icon={<Share />}
            color={theme.palette.warning.main}
          />
        </Box>
        <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '250px' }}>
          <MetricCard
            title="Total Followers"
            value={data.overview.totalFollowers}
            change={data.overview.periodChange.followers}
            icon={<People />}
            color={theme.palette.info.main}
          />
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Engagement Trends" />
          <Tab label="Platform Performance" />
          <Tab label="Top Content" />
          <Tab label="Audience Insights" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Engagement Trends Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={data.engagementTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stackId="1"
                  stroke={theme.palette.primary.main}
                  fill={theme.palette.primary.main}
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="reach"
                  stackId="1"
                  stroke={theme.palette.success.main}
                  fill={theme.palette.success.main}
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  stackId="1"
                  stroke={theme.palette.warning.main}
                  fill={theme.palette.warning.main}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 calc(66.67% - 12px)', minWidth: '400px' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Platform Performance Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.platforms}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="engagement" fill={theme.palette.primary.main} />
                    <Bar dataKey="reach" fill={theme.palette.success.main} />
                    <Bar dataKey="impressions" fill={theme.palette.warning.main} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 calc(33.33% - 12px)', minWidth: '300px' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Platform Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={data.platforms}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="engagement"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.platforms.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Top Performing Content
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.topContent.map((content, index) => (
                <Box
                  key={content.id}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      {content.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {content.platform} • {content.date}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" color="primary">
                      {formatNumber(content.engagement)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      engagements
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '300px' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Demographics
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.audienceInsights.demographics}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.audienceInsights.demographics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '300px' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Top Locations
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {data.audienceInsights.locations.map((location, index) => (
                    <Box
                      key={location.country}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1
                      }}
                    >
                      <Typography variant="body2">{location.country}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {location.percentage}%
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '300px' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Interests
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {data.audienceInsights.interests.map((interest, index) => (
                    <Box
                      key={interest.category}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1
                      }}
                    >
                      <Typography variant="body2">{interest.category}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {interest.percentage}%
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}
    </Box>
  );
}; 
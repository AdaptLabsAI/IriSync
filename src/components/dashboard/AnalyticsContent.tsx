'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  Grid,
  Card,
  CardContent,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  Favorite as FavoriteIcon,
  Comment as CommentIcon,
  Visibility as VisibilityIcon,
  Bookmark as BookmarkIcon,
  GetApp as DownloadIcon,
  Psychology as AIIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { tokens } from '@/styles/tokens';

// Sample data for Growth Trends
const growthData = [
  { date: '01-04', followers: 21600, engagement: 11800, reach: 36500 },
  { date: '08-04', followers: 22100, engagement: 12200, reach: 38200 },
  { date: '15-04', followers: 22800, engagement: 13500, reach: 41800 },
  { date: '22-04', followers: 23200, engagement: 14200, reach: 43200 },
  { date: '29-04', followers: 23600, engagement: 14800, reach: 44800 },
  { date: '05-05', followers: 23800, engagement: 15400, reach: 45600 },
];

// Sample data for Content Type Performance
const contentTypeData = [
  { name: 'Link', value: 9.5, color: '#F7B731' },
  { name: 'Carousels', value: 5.8, color: '#3867D6' },
  { name: 'Images', value: 4.6, color: '#0FB9B1' },
  { name: 'Videos', value: 3.2, color: '#FA8231' },
  { name: 'Text', value: 2.7, color: '#8854D0' },
];

// Sample data for Audience Demographics
const ageData = [
  { age: '18-24', value: 21, color: '#8854D0' },
  { age: '25-34', value: 12, color: '#FA8231' },
  { age: '35-44', value: 17, color: '#0FB9B1' },
  { age: '45-54', value: 35, color: '#3867D6' },
  { age: '55-64', value: 6, color: '#F7B731' },
  { age: '65+', value: 2, color: '#FC427B' },
];

// Sample data for Competitive Benchmarking
const competitorData = [
  { name: 'My Account', followers: '23,800', engagement: '15,400', engagementRate: '3.2%', isYou: true },
  { name: 'Competitor A', followers: '35,200', engagement: '18,500', engagementRate: '2.8%', isYou: false },
  { name: 'Competitor B', followers: '19,600', engagement: '12,800', engagementRate: '3.4%', isYou: false },
  { name: 'Competitor C', followers: '28,400', engagement: '16,200', engagementRate: '3.0%', isYou: false },
  { name: 'Competitor D', followers: '25,700', engagement: '13,700', engagementRate: '2.9%', isYou: false },
];

/**
 * Analytics Content Component
 *
 * Comprehensive analytics dashboard showing:
 * - Key performance indicators (KPIs)
 * - Growth trends over time
 * - Content type performance
 * - Competitive benchmarking
 * - Audience demographics
 * - Platform-specific metrics
 */
export default function AnalyticsContent() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedContentTab, setSelectedContentTab] = useState<string>('Engagement');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('Last 30 days');

  const platforms = [
    'All',
    'Instagram',
    'Facebook',
    'Twitter',
    'LinkedIn',
    'TikTok',
    'YouTube'
  ];

  const contentTabs = ['Engagement', 'Clicks', 'Shares'];
  const dateRanges = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Custom'];

  // KPI data
  const kpis = [
    {
      label: 'Followers',
      value: '23.8k',
      change: '+12%',
      trend: 'up',
      icon: PeopleIcon,
      color: 'primary'
    },
    {
      label: 'Likes',
      value: '45.2k',
      change: '+8%',
      trend: 'up',
      icon: FavoriteIcon,
      color: 'error'
    },
    {
      label: 'Comments',
      value: '3.4k',
      change: '-3%',
      trend: 'down',
      icon: CommentIcon,
      color: 'info'
    },
    {
      label: 'Reach',
      value: '67.5k',
      change: '+15%',
      trend: 'up',
      icon: VisibilityIcon,
      color: 'warning'
    },
    {
      label: 'Saves',
      value: '5.2k',
      change: '+20%',
      trend: 'up',
      icon: BookmarkIcon,
      color: 'success'
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 600,
                fontSize: tokens.typography.fontSize.h1,
                color: tokens.colors.text.primary
              }}
            >
              Analytics
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: tokens.colors.text.secondary,
                fontSize: tokens.typography.fontSize.body
              }}
            >
              Track your social media performance and insights
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<AIIcon />}
              sx={{
                textTransform: 'none',
                borderColor: tokens.colors.primary.main,
                color: tokens.colors.primary.main,
                '&:hover': {
                  borderColor: tokens.colors.primary.dark,
                  bgcolor: tokens.colors.primary.fade10
                }
              }}
            >
              Get AI Summary
            </Button>
            <Button
              variant="primary"
              startIcon={<DownloadIcon />}
              sx={{
                bgcolor: tokens.colors.primary.main,
                '&:hover': { bgcolor: tokens.colors.primary.dark },
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: tokens.borderRadius.md,
                boxShadow: tokens.shadows.md,
              }}
            >
              Export Data
            </Button>
          </Stack>
        </Stack>

        {/* Platform Filters */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {platforms.map((platform) => (
            <Chip
              key={platform}
              label={platform}
              onClick={() => setSelectedPlatform(platform)}
              color={selectedPlatform === platform ? 'primary' : 'default'}
              sx={{
                bgcolor: selectedPlatform === platform ? tokens.colors.primary.main : 'default',
                color: selectedPlatform === platform ? 'white' : 'default',
                '&:hover': {
                  bgcolor: selectedPlatform === platform ? tokens.colors.primary.dark : 'default',
                }
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpis.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={2.4} key={index}>
            <Card sx={{
              height: '100%',
              borderRadius: tokens.borderRadius.md,
              boxShadow: tokens.shadows.md,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: tokens.shadows.lg,
              },
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: `${kpi.color}.light`,
                      color: `${kpi.color}.dark`,
                      width: 40,
                      height: 40
                    }}
                  >
                    <kpi.icon fontSize="small" />
                  </Avatar>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    {kpi.trend === 'up' ? (
                      <TrendingUpIcon fontSize="small" color="success" />
                    ) : (
                      <TrendingDownIcon fontSize="small" color="error" />
                    )}
                    <Typography
                      variant="caption"
                      color={kpi.trend === 'up' ? 'success.main' : 'error.main'}
                      fontWeight="medium"
                    >
                      {kpi.change}
                    </Typography>
                  </Stack>
                </Stack>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {kpi.value}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {kpi.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Growth Trends Chart */}
      <Paper sx={{
        p: 3,
        mb: 4,
        borderRadius: tokens.borderRadius.md,
        boxShadow: tokens.shadows.md,
      }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Growth Trends
        </Typography>
        <Box sx={{ height: 400, mt: 3 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Line type="monotone" dataKey="followers" stroke="#3867D6" strokeWidth={2} />
              <Line type="monotone" dataKey="engagement" stroke="#FA8231" strokeWidth={2} />
              <Line type="monotone" dataKey="reach" stroke="#0FB9B1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <Stack direction="row" justifyContent="flex-end" spacing={3} sx={{ mt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 16, height: 3, bgcolor: '#3867D6', borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Followers
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 16, height: 3, bgcolor: '#FA8231', borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Engagement
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 16, height: 3, bgcolor: '#0FB9B1', borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Reach
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      {/* Performance Overview & Content Type Performance */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Performance Overview */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{
            p: 3,
            height: '100%',
            borderRadius: tokens.borderRadius.md,
            boxShadow: tokens.shadows.md,
          }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Instagram Performance Overview
            </Typography>

            {/* Date Range Selector */}
            <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
              {dateRanges.map((range) => (
                <Chip
                  key={range}
                  label={range}
                  onClick={() => setSelectedDateRange(range)}
                  size="sm"
                  sx={{
                    bgcolor: selectedDateRange === range ? tokens.colors.primary.main : 'default',
                    color: selectedDateRange === range ? 'white' : 'default',
                    '&:hover': {
                      bgcolor: selectedDateRange === range ? tokens.colors.primary.dark : 'default',
                    }
                  }}
                />
              ))}
            </Stack>

            <Stack spacing={2}>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Total Posts
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    127
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Total Engagement
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    48.6k
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Avg. Engagement Rate
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    5.2%
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Content Type Performance */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{
            p: 3,
            height: '100%',
            borderRadius: tokens.borderRadius.md,
            boxShadow: tokens.shadows.md,
          }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Content Type Performance
            </Typography>

            {/* Content Type Tabs */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              {contentTabs.map((tab) => (
                <Button
                  key={tab}
                  onClick={() => setSelectedContentTab(tab)}
                  sx={{
                    textTransform: 'none',
                    color: selectedContentTab === tab ? tokens.colors.primary.main : 'text.secondary',
                    borderBottom: selectedContentTab === tab ? 2 : 0,
                    borderColor: tokens.colors.primary.main,
                    borderRadius: 0,
                    pb: 1,
                    fontWeight: selectedContentTab === tab ? 600 : 400
                  }}
                >
                  {tab}
                </Button>
              ))}
            </Stack>

            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contentTypeData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {contentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Competitive Benchmarking */}
      <Paper sx={{
        p: 3,
        mb: 4,
        borderRadius: tokens.borderRadius.md,
        boxShadow: tokens.shadows.md,
      }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Competitive Benchmarking
        </Typography>
        <Divider sx={{ my: 2 }} />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">
                    COMPETITOR
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">
                    FOLLOWERS
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">
                    ENGAGEMENT
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">
                    ENGAGEMENT RATE
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {competitorData.map((competitor, index) => (
                <TableRow
                  key={index}
                  sx={{
                    bgcolor: competitor.isYou ? 'success.lighter' : 'transparent',
                    '&:hover': { bgcolor: competitor.isYou ? 'success.lighter' : 'action.hover' }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={competitor.isYou ? 'bold' : 'regular'}>
                      {competitor.name}
                      {competitor.isYou && (
                        <Chip label="You" size="small" color="success" sx={{ ml: 1, height: 20 }} />
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{competitor.followers}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{competitor.engagement}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {competitor.engagementRate}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Audience Demographics */}
      <Paper sx={{
        p: 3,
        mb: 4,
        borderRadius: tokens.borderRadius.md,
        boxShadow: tokens.shadows.md,
      }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Audience Demographics
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={4}>
          <Grid item xs={12} md={7}>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="age" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <Stack spacing={2} sx={{ pt: 2 }}>
              {ageData.map((item, index) => (
                <Stack key={index} direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: 1,
                      bgcolor: item.color
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    {item.age}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {item.value}%
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

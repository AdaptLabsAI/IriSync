'use client';

import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Grid,
  Paper,
  LinearProgress,
  Tooltip
} from '@mui/material';
import { format } from 'date-fns';

// Types
type TopPost = {
  id: string;
  title: string;
  platform: string;
  engagement: number;
  reach: number;
  date: string;
};

type EngagementByType = {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
};

type PerformanceMetricsProps = {
  data: {
    topPosts: TopPost[];
    engagementByType: EngagementByType;
  };
};

export default function PerformanceMetrics({ data }: PerformanceMetricsProps) {
  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Calculate total engagement for percentage calculations
  const totalEngagement = Object.values(data.engagementByType).reduce(
    (sum, value) => sum + value,
    0
  );

  // Get percentage of total engagement
  const getPercentage = (value: number): number => {
    return (value / totalEngagement) * 100;
  };

  // Platform badge color mapping
  const platformColors: Record<string, string> = {
    Instagram: '#E1306C',
    Twitter: '#1DA1F2',
    LinkedIn: '#0077B5',
    Facebook: '#3b5998',
    YouTube: '#FF0000',
    TikTok: '#000000',
    Pinterest: '#E60023',
  };

  return (
    <Grid container spacing={3}>
      {/* Top Performing Posts */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Top Performing Posts
        </Typography>
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell align="right">Engagement</TableCell>
                <TableCell align="right">Reach</TableCell>
                <TableCell align="right">Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.topPosts.map((post) => (
                <TableRow key={post.id} hover>
                  <TableCell>
                    <Tooltip title={post.title}>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 250,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {post.title}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={post.platform}
                      size="sm"
                      sx={{
                        backgroundColor: platformColors[post.platform] || '#673ab7',
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '0.7rem'
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">{formatNumber(post.engagement)}</TableCell>
                  <TableCell align="right">{formatNumber(post.reach)}</TableCell>
                  <TableCell align="right">
                    {format(new Date(post.date), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>

      {/* Engagement By Type */}
      <Grid item xs={12} sx={{ mt: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Engagement By Type
        </Typography>
        <Box>
          {Object.entries(data.engagementByType).map(([type, value]) => (
            <Box key={type} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {type}
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatNumber(value)} ({getPercentage(value).toFixed(1)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getPercentage(value)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: (theme) => theme.palette.grey[100],
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                  }
                }}
              />
            </Box>
          ))}
        </Box>
      </Grid>
    </Grid>
  );
} 
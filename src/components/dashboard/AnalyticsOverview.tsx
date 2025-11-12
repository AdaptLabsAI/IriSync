'use client';

import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  useTheme
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import CampaignIcon from '@mui/icons-material/Campaign';

type OverviewData = {
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

type AnalyticsOverviewProps = {
  data: OverviewData;
};

export default function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  const theme = useTheme();
  
  // Format large numbers with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Format percentage
  const formatPercentage = (num: number): string => {
    return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;
  };
  
  // Define metrics cards with their icons and data
  const metrics = [
    {
      label: 'Total Engagement',
      value: formatNumber(data.totalEngagement),
      change: data.periodChange.engagement,
      icon: <ThumbUpIcon />,
      color: theme.palette.primary.main
    },
    {
      label: 'Total Reach',
      value: formatNumber(data.totalReach),
      change: data.periodChange.reach,
      icon: <VisibilityIcon />,
      color: theme.palette.success.main
    },
    {
      label: 'Total Impressions',
      value: formatNumber(data.totalImpressions),
      change: data.periodChange.impressions,
      icon: <CampaignIcon />,
      color: theme.palette.warning.main
    },
    {
      label: 'Total Followers',
      value: formatNumber(data.totalFollowers),
      change: data.periodChange.followers,
      icon: <PeopleAltIcon />,
      color: theme.palette.info.main
    }
  ];
  
  return (
    <Grid container spacing={3}>
      {metrics.map((metric, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Paper 
            sx={{ 
              p: 2, 
              height: '100%',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 3
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box 
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: `${metric.color}15`,
                  color: metric.color,
                  mr: 1.5
                }}
              >
                {metric.icon}
              </Box>
              <Typography 
                variant="subtitle2" 
                color="text.secondary"
              >
                {metric.label}
              </Typography>
            </Box>
            
            <Typography variant="h4" component="div" sx={{ mb: 1, fontWeight: 600 }}>
              {metric.value}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {metric.change > 0 ? (
                <TrendingUpIcon 
                  sx={{ 
                    fontSize: 16, 
                    color: 'success.main', 
                    mr: 0.5 
                  }} 
                />
              ) : (
                <TrendingDownIcon 
                  sx={{ 
                    fontSize: 16, 
                    color: 'error.main', 
                    mr: 0.5 
                  }} 
                />
              )}
              <Typography 
                variant="body2"
                color={metric.change > 0 ? 'success.main' : 'error.main'}
              >
                {formatPercentage(metric.change)} since last month
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
} 
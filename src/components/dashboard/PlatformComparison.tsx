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
  LinearProgress,
  Chip,
  Avatar,
  Tooltip
} from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FacebookIcon from '@mui/icons-material/Facebook';
import YouTubeIcon from '@mui/icons-material/YouTube';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

type Platform = {
  name: string;
  followers: number;
  engagement: number;
  reach: number;
  impressions: number;
  growth: number;
};

type PlatformComparisonProps = {
  platforms: Platform[];
};

export default function PlatformComparison({ platforms }: PlatformComparisonProps) {
  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Platform icon mapping
  const getPlatformIcon = (platformName: string) => {
    switch (platformName.toLowerCase()) {
      case 'instagram':
        return <InstagramIcon />;
      case 'twitter':
        return <TwitterIcon />;
      case 'linkedin':
        return <LinkedInIcon />;
      case 'facebook':
        return <FacebookIcon />;
      case 'youtube':
        return <YouTubeIcon />;
      default:
        return null;
    }
  };

  // Platform color mapping
  const getPlatformColor = (platformName: string): string => {
    switch (platformName.toLowerCase()) {
      case 'instagram':
        return '#E1306C';
      case 'twitter':
        return '#1DA1F2';
      case 'linkedin':
        return '#0077B5';
      case 'facebook':
        return '#3b5998';
      case 'youtube':
        return '#FF0000';
      case 'tiktok':
        return '#000000';
      case 'pinterest':
        return '#E60023';
      default:
        return '#673ab7';
    }
  };

  // Get highest engagement rate for progress bars
  const maxEngagement = Math.max(
    ...platforms.map(platform => platform.engagement),
    6
  );

  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Platform</TableCell>
              <TableCell align="right">Followers</TableCell>
              <TableCell align="right">Engagement</TableCell>
              <TableCell align="right">Growth</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {platforms.map((platform) => (
              <TableRow key={platform.name} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        width: 30,
                        height: 30,
                        backgroundColor: `${getPlatformColor(platform.name)}15`,
                        color: getPlatformColor(platform.name),
                        mr: 1,
                      }}
                    >
                      {getPlatformIcon(platform.name)}
                    </Avatar>
                    <Typography variant="body2" fontWeight="medium">
                      {platform.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  {formatNumber(platform.followers)}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(platform.engagement / maxEngagement) * 100}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: (theme) => theme.palette.grey[100],
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            backgroundColor: getPlatformColor(platform.name),
                          }
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ minWidth: 35 }}
                    >
                      {platform.engagement}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`${platform.growth}% growth in followers`}>
                    <Chip
                      size="small"
                      icon={<ArrowUpwardIcon style={{ fontSize: 12 }} />}
                      label={`${platform.growth}%`}
                      sx={{
                        backgroundColor: (theme) => theme.palette.success.light,
                        color: (theme) => theme.palette.success.dark,
                        fontWeight: 500,
                        fontSize: '0.7rem',
                        height: 20,
                        '& .MuiChip-icon': {
                          color: 'inherit'
                        }
                      }}
                    />
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 
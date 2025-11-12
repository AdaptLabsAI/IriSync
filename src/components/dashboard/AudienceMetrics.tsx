'use client';

import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Grid,
  LinearProgress,
  useTheme
} from '@mui/material';

type Demographics = {
  ageGroups: Array<{ group: string; percentage: number }>;
  genderSplit: Array<{ gender: string; percentage: number }>;
  topLocations: Array<{ location: string; percentage: number }>;
};

type AudienceData = {
  demographics: Demographics;
  growthRate: number;
  activeHours: Array<{ hour: number; value: number }>;
};

type AudienceMetricsProps = {
  data: AudienceData;
};

export default function AudienceMetrics({ data }: AudienceMetricsProps) {
  const theme = useTheme();

  // Generate the active hours chart
  const renderActiveHoursChart = () => {
    const maxValue = Math.max(...data.activeHours.map(hour => hour.value));
    
    return (
      <Box sx={{ height: 100, display: 'flex', alignItems: 'flex-end', mt: 2 }}>
        {data.activeHours.map((hourData) => (
          <Box
            key={hourData.hour}
            sx={{
              height: `${(hourData.value / maxValue) * 100}%`,
              width: '100%',
              mx: 0.2,
              backgroundColor: theme.palette.primary.main,
              borderRadius: '4px 4px 0 0',
              position: 'relative',
              '&:hover': {
                opacity: 0.8,
              },
              '&:hover::after': {
                content: `"${hourData.value}%"`,
                position: 'absolute',
                top: '-25px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '2px 5px',
                borderRadius: 1,
                fontSize: '0.7rem',
                whiteSpace: 'nowrap',
              }
            }}
          >
            {(hourData.hour === 8 || hourData.hour === 12 || hourData.hour === 16 || hourData.hour === 20) && (
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                }}
              >
                {hourData.hour > 12 ? `${hourData.hour - 12}pm` : `${hourData.hour}am`}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box>
      {/* Demographics Section */}
      <Typography variant="subtitle2" gutterBottom>
        Demographics
      </Typography>
      {data.demographics && data.demographics.ageGroups && data.demographics.ageGroups.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Age Distribution
          </Typography>
          {data.demographics.ageGroups.map((ageGroup) => (
            <Box key={ageGroup.group} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption">{ageGroup.group}</Typography>
                <Typography variant="caption" fontWeight="medium">
                  {ageGroup.percentage}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={ageGroup.percentage}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: (theme) => theme.palette.grey[100],
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                  }
                }}
              />
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No demographic data available.
        </Typography>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Gender Split
        </Typography>
        <Grid container spacing={1}>
          {data.demographics.genderSplit.map((genderData) => (
            <Grid item xs={4} key={genderData.gender}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 1,
                  borderRadius: 1,
                  backgroundColor: (theme) => theme.palette.grey[50],
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  {genderData.percentage}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {genderData.gender}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Top Locations
        </Typography>
        {data.demographics.topLocations.slice(0, 3).map((location) => (
          <Box key={location.location} sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption">{location.location}</Typography>
              <Typography variant="caption" fontWeight="medium">
                {location.percentage}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={location.percentage}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: (theme) => theme.palette.grey[100],
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: (theme) => theme.palette.info.main,
                }
              }}
            />
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Active Hours */}
      <Typography variant="subtitle2" gutterBottom>
        Active Hours
      </Typography>
      <Typography variant="caption" color="text.secondary">
        When your audience is most active
      </Typography>
      {renderActiveHoursChart()}
    </Box>
  );
} 
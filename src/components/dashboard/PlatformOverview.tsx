'use client';

import { 
  Box, 
  Stack, 
  Typography, 
  LinearProgress,
  Divider
} from '@mui/material';

type Platform = {
  name: string;
  followers: number;
  engagement: number;
  color: string;
  progress: number;
};

type PlatformOverviewProps = {
  platforms: Platform[];
};

export default function PlatformOverview({ platforms }: PlatformOverviewProps) {
  return (
    <Stack spacing={3}>
      {platforms.map((platform, index) => (
        <Box key={platform.name}>
          {index > 0 && <Divider sx={{ my: 2 }} />}
          
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="subtitle2">{platform.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {platform.engagement}% engagement
              </Typography>
            </Box>
            
            <LinearProgress 
              variant="determinate" 
              value={platform.progress} 
              sx={{ 
                height: 8, 
                borderRadius: 1,
                bgcolor: 'grey.100',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: platform.color,
                },
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="body2" color="text.secondary">Followers</Typography>
            <Typography variant="body2" fontWeight="medium">
              {platform.followers.toLocaleString()}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
} 
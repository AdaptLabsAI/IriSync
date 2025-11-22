'use client';

import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ActivityFeed from './ActivityFeed';

// Activity data type from ActivityFeed component
type ActivityType = 
  | 'post_created'
  | 'post_published'
  | 'media_uploaded'
  | 'post_scheduled'
  | 'engagement_received'
  | 'comment_received'
  | 'new_follower'
  | 'message_received';

type Activity = {
  id: string;
  type: ActivityType;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  content: string;
  platform?: string;
  additionalInfo?: string;
  isNew?: boolean;
};

type ActivityWidgetProps = {
  activities: Activity[];
  isLoading?: boolean;
  onRefresh?: () => void;
};

export default function ActivityWidget({ 
  activities, 
  isLoading = false,
  onRefresh 
}: ActivityWidgetProps) {
  const [filter, setFilter] = React.useState<string>('all');

  const handleFilterChange = (event: SelectChangeEvent) => {
    setFilter(event.target.value);
  };

  // Filter activities based on selected filter
  const filteredActivities = React.useMemo(() => {
    if (filter === 'all') return activities;
    
    return activities.filter(activity => {
      switch (filter) {
        case 'posts':
          return ['post_created', 'post_published', 'post_scheduled'].includes(activity.type);
        case 'media':
          return activity.type === 'media_uploaded';
        case 'engagement':
          return ['engagement_received', 'comment_received', 'new_follower', 'message_received'].includes(activity.type);
        default:
          return true;
      }
    });
  }, [activities, filter]);

  return (
    <Paper sx={{ height: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Recent Activity</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControl size="sm" sx={{ minWidth: 120, mr: 1 }}>
            <Select
              value={filter}
              onChange={handleFilterChange}
              variant="outlined"
              displayEmpty
              sx={{ 
                fontSize: '0.875rem',
                '& .MuiSelect-select': { 
                  py: 0.5 
                } 
              }}
            >
              <MenuItem value="all">All Activity</MenuItem>
              <MenuItem value="posts">Posts</MenuItem>
              <MenuItem value="media">Media</MenuItem>
              <MenuItem value="engagement">Engagement</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh activities">
            <IconButton 
              size="sm" 
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={20} thickness={4} />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Divider />
      
      <Box sx={{ p: 2, height: 'calc(100% - 56px)', overflow: 'auto' }}>
        {activities.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No recent activities to display
            </Typography>
          </Box>
        ) : (
          <ActivityFeed 
            activities={filteredActivities} 
            showViewAll={true} 
          />
        )}
      </Box>
    </Paper>
  );
} 
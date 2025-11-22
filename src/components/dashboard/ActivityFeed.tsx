'use client';

import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Divider,
  Chip,
  useTheme,
  Button
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CommentIcon from '@mui/icons-material/Comment';
import PeopleIcon from '@mui/icons-material/People';
import ForumIcon from '@mui/icons-material/Forum';

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

type ActivityFeedProps = {
  activities: Activity[];
  showViewAll?: boolean;
};

export default function ActivityFeed({ activities, showViewAll = true }: ActivityFeedProps) {
  const theme = useTheme();

  // Get icon based on activity type
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'post_created':
        return <ContentCopyIcon />;
      case 'post_published':
        return <SendIcon />;
      case 'media_uploaded':
        return <ImageIcon />;
      case 'post_scheduled':
        return <ScheduleIcon />;
      case 'engagement_received':
        return <FavoriteIcon />;
      case 'comment_received':
        return <CommentIcon />;
      case 'new_follower':
        return <PeopleIcon />;
      case 'message_received':
        return <ForumIcon />;
      default:
        return <ContentCopyIcon />;
    }
  };

  // Get color based on activity type
  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'post_created':
        return theme.palette.info.main;
      case 'post_published':
        return theme.palette.success.main;
      case 'media_uploaded':
        return theme.palette.warning.main;
      case 'post_scheduled':
        return theme.palette.info.dark;
      case 'engagement_received':
        return '#e91e63'; // pink
      case 'comment_received':
        return theme.palette.secondary.main;
      case 'new_follower':
        return theme.palette.success.dark;
      case 'message_received':
        return theme.palette.primary.main;
      default:
        return theme.palette.primary.main;
    }
  };

  // Get activity title based on activity type
  const getActivityTitle = (activity: Activity) => {
    switch (activity.type) {
      case 'post_created':
        return 'Created post';
      case 'post_published':
        return `Published to ${activity.platform}`;
      case 'media_uploaded':
        return 'Uploaded media';
      case 'post_scheduled':
        return `Scheduled for ${activity.platform}`;
      case 'engagement_received':
        return `Received likes on ${activity.platform}`;
      case 'comment_received':
        return `New comment on ${activity.platform}`;
      case 'new_follower':
        return `New follower on ${activity.platform}`;
      case 'message_received':
        return `Message from ${activity.platform}`;
      default:
        return 'Activity';
    }
  };

  return (
    <Box>
      <List disablePadding>
        {activities.map((activity, index) => (
          <React.Fragment key={activity.id}>
            <ListItem 
              alignItems="flex-start" 
              sx={{ 
                py: 1.5,
                px: 0,
                position: 'relative',
                ...(activity.isNew && {
                  backgroundColor: `${theme.palette.primary.main}08`,
                  borderRadius: 1,
                  px: 1.5,
                  mx: -1.5
                })
              }}
            >
              <ListItemAvatar>
                <Avatar 
                  src={activity.user.avatar}
                  sx={{ 
                    bgcolor: `${getActivityColor(activity.type)}15`,
                    color: getActivityColor(activity.type)
                  }}
                >
                  {getActivityIcon(activity.type)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" component="span">
                      {activity.user.name}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </Typography>
                    {activity.isNew && (
                      <Chip
                        label="New"
                        size="sm"
                        sx={{
                          ml: 1,
                          height: 18,
                          fontSize: '0.625rem',
                          backgroundColor: theme.palette.primary.main,
                          color: 'white'
                        }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography 
                      variant="body2" 
                      color="text.primary" 
                      component="span"
                      display="block"
                    >
                      {getActivityTitle(activity)}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      component="span"
                      sx={{ 
                        display: 'block', 
                        mt: 0.5,
                        color: 'text.secondary',
                        fontSize: '0.875rem'
                      }}
                    >
                      {activity.content}
                    </Typography>
                    {activity.additionalInfo && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        {activity.additionalInfo}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
            {index < activities.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
      
      {showViewAll && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button 
            variant="ghost" 
            size="sm" 
            color="primary"
            href="/dashboard/activities"
          >
            View All Activities
          </Button>
        </Box>
      )}
    </Box>
  );
} 
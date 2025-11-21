'use client';

import React from 'react';
import { 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Chip, 
  Typography, 
  Divider, 
  Box 
} from '@mui/material';
import { format } from 'date-fns';

interface CalendarPost {
  id: string;
  title: string;
  platform: string;
  scheduledFor: Date;
  status: 'ready' | 'draft';
  content: string;
}

interface UpcomingPostsListProps {
  posts: CalendarPost[];
}

export default function UpcomingPostsList({ posts }: UpcomingPostsListProps) {
  // Sort posts by date (closest first)
  const sortedPosts = [...posts].sort((a, b) => 
    a.scheduledFor.getTime() - b.scheduledFor.getTime()
  );

  // Get platform icon and color
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return '📘'; // Simple emoji as placeholder for real icon components
      case 'instagram':
        return '📸';
      case 'twitter':
        return '🐦';
      case 'linkedin':
        return '💼';
      case 'pinterest':
        return '📌';
      default:
        return '📱';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return '#3b5998';
      case 'instagram':
        return '#e1306c';
      case 'twitter':
        return '#1da1f2';
      case 'linkedin':
        return '#0077b5';
      case 'pinterest':
        return '#e60023';
      default:
        return '#9e9e9e';
    }
  };

  // Format date to show day and time
  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if the date is today
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${format(date, 'h:mm a')}`;
    }
    
    // Check if the date is tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    }
    
    // For other dates
    return format(date, 'MMM d, h:mm a');
  };

  return (
    <List sx={{ width: '100%', maxHeight: '500px', overflow: 'auto' }}>
      {sortedPosts.map((post, index) => (
        <React.Fragment key={post.id}>
          <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
            <ListItemAvatar>
              <Avatar 
                sx={{ 
                  bgcolor: getPlatformColor(post.platform),
                  fontSize: '1.2rem'
                }}
              >
                {getPlatformIcon(post.platform)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography
                  variant="subtitle2"
                  component="div"
                  sx={{ 
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {post.title}
                </Typography>
              }
              secondary={
                <React.Fragment>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{ display: 'block' }}
                  >
                    {formatDate(post.scheduledFor)}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={post.platform}
                      size="small"
                      sx={{ 
                        bgcolor: `${getPlatformColor(post.platform)}20`,
                        color: getPlatformColor(post.platform),
                        mr: 0.5
                      }}
                    />
                    <Chip
                      label={post.status}
                      size="small"
                      sx={{ 
                        bgcolor: post.status === 'ready' ? 'success.light' : 'grey.300',
                        color: post.status === 'ready' ? 'success.dark' : 'text.secondary'
                      }}
                    />
                  </Box>
                </React.Fragment>
              }
            />
          </ListItem>
          {index < sortedPosts.length - 1 && <Divider variant="inset" component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
} 
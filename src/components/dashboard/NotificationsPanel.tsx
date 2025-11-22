'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Badge,
  Chip,
  Tooltip,
  Button
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { formatDistanceToNow } from 'date-fns';

// Define notification priority types
type NotificationPriority = 'high' | 'medium' | 'low';

// Define notification type
type Notification = {
  id: string;
  title: string;
  message: string;
  time: string; // ISO string
  read: boolean;
  priority: NotificationPriority;
};

type NotificationsPanelProps = {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
};

export default function NotificationsPanel({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll
}: NotificationsPanelProps) {
  const [tabValue, setTabValue] = useState(0);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Filter notifications based on tab
  const filteredNotifications = React.useMemo(() => {
    if (tabValue === 0) return notifications;
    if (tabValue === 1) return notifications.filter(notification => !notification.read);
    return [];
  }, [notifications, tabValue]);
  
  // Count unread notifications
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  // Get icon based on priority
  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'high':
        return <WarningIcon color="error" />;
      case 'medium':
        return <InfoIcon color="warning" />;
      case 'low':
        return <CheckCircleIcon color="success" />;
      default:
        return <InfoIcon />;
    }
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Badge badgeContent={unreadCount} color="error" sx={{ mr: 1.5 }}>
            <NotificationsIcon color="action" />
          </Badge>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        <Box>
          <Tooltip title="Clear all notifications">
            <IconButton 
              size="sm" 
              onClick={onClearAll}
              disabled={notifications.length === 0}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab 
            label="All" 
            id="notifications-tab-0"
            aria-controls="notifications-tabpanel-0"
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" component="span">Unread</Typography>
                {unreadCount > 0 && (
                  <Chip 
                    label={unreadCount} 
                    color="error" 
                    size="sm"
                    sx={{ 
                      ml: 1, 
                      height: 18, 
                      minWidth: 18, 
                      fontSize: '0.625rem',
                      '& .MuiChip-label': { px: 0.5 }
                    }}
                  />
                )}
              </Box>
            }
            id="notifications-tab-1"
            aria-controls="notifications-tabpanel-1"
          />
        </Tabs>
      </Box>
      
      {/* Notifications List */}
      <Box
        role="tabpanel"
        id={`notifications-tabpanel-${tabValue}`}
        aria-labelledby={`notifications-tab-${tabValue}`}
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {filteredNotifications.length > 0 ? (
          <List disablePadding>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    py: 1.5,
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    }
                  }}
                  secondaryAction={
                    <Box>
                      <Tooltip title="Delete notification">
                        <IconButton 
                          edge="end" 
                          size="sm"
                          onClick={() => onDelete?.(notification.id)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getPriorityIcon(notification.priority)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body2" 
                        fontWeight={notification.read ? 'normal' : 'medium'}
                      >
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.875rem', 
                            display: 'block', 
                            mb: 0.5 
                          }}
                        >
                          {notification.message}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          component="div"
                        >
                          {formatDistanceToNow(new Date(notification.time), { 
                            addSuffix: true 
                          })}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredNotifications.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexGrow: 1,
              p: 3
            }}
          >
            <NotificationsIcon 
              sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} 
            />
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {tabValue === 0 
                ? "You don't have any notifications" 
                : "You don't have any unread notifications"}
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            justifyContent: 'space-between',
            borderTop: 1,
            borderColor: 'divider'
          }}
        >
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onMarkAllAsRead}
            disabled={!filteredNotifications.some(n => !n.read)}
          >
            Mark all as read
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            endIcon={<MoreHorizIcon />}
            href="/dashboard/notifications"
          >
            View all
          </Button>
        </Box>
      )}
    </Paper>
  );
} 
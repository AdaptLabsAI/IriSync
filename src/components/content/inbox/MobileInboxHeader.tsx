import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Badge, 
  Box,
  useTheme,
  useMediaQuery 
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Notifications as NotificationsIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';

interface MobileInboxHeaderProps {
  unreadCount: number;
  onMenuToggle: () => void;
  onSearchToggle: () => void;
  onFilterToggle: () => void;
  onNotificationsToggle: () => void;
  title?: string;
}

export const MobileInboxHeader: React.FC<MobileInboxHeaderProps> = ({
  unreadCount,
  onMenuToggle,
  onSearchToggle,
  onFilterToggle,
  onNotificationsToggle,
  title = "Social Inbox"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) {
    return null; // Only render on mobile
  }

  return (
    <AppBar 
      position="sticky" 
      elevation={1}
      sx={{ 
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important', px: 2 }}>
        <IconButton
          edge="start"
          onClick={onMenuToggle}
          aria-label="menu"
          sx={{ mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {unreadCount > 0 && (
            <Typography variant="caption" color="primary">
              {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        <IconButton onClick={onSearchToggle} aria-label="search">
          <SearchIcon />
        </IconButton>

        <IconButton onClick={onFilterToggle} aria-label="filter">
          <FilterIcon />
        </IconButton>

        <IconButton onClick={onNotificationsToggle} aria-label="notifications">
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}; 
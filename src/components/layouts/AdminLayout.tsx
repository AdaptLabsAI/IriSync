'use client';

import React, { ReactNode, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  Divider, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuItem, 
  Badge, 
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Description as DocumentationIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  Article as ArticleIcon,
  BugReport as BugReportIcon,
  SupportAgent as SupportAgentIcon,
  Storage as StorageIcon,
  AccountCircle as AccountCircleIcon,
  WorkspacePremium as SubscriptionIcon,
  RateReview as TestimonialsIcon,
  BusinessCenter as CareersIcon,
  Subject as KnowledgeIcon,
  Map as RoadmapIcon,
  Security as RolesIcon,
  Assessment as AuditLogsIcon
} from '@mui/icons-material';

interface AdminLayoutProps {
  children: ReactNode;
}

const drawerWidth = 260;

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const pathname = usePathname();
  
  // State for responsive drawer
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // State for user menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<null | HTMLElement>(null);
  
  // Handle drawer toggle for mobile
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  // Handle user menu open/close
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle notifications menu open/close
  const handleNotificationsOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(event.currentTarget);
  };
  
  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
  };
  
  // Handle logout
  const handleLogout = () => {
    router.push('/logout');
  };
  
  // Navigation items with hierarchy
  const navigationItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/admin/dashboard',
      active: pathname === '/admin/dashboard'
    },
    { 
      text: 'Analytics', 
      icon: <AnalyticsIcon />, 
      path: '/admin/analytics',
      active: pathname === '/admin/analytics'
    },
    { 
      text: 'System Status', 
      icon: <StorageIcon />, 
      path: '/admin/system-status',
      active: pathname === '/admin/system-status'
    },
    { divider: true },
    { 
      text: 'Users', 
      icon: <PeopleIcon />, 
      path: '/admin/users',
      active: pathname === '/admin/users' || pathname === '/admin/users/bulk-ops'
    },
    { 
      text: 'Roles', 
      icon: <RolesIcon />, 
      path: '/admin/roles',
      active: pathname === '/admin/roles'
    },
    { 
      text: 'Audit Logs', 
      icon: <AuditLogsIcon />, 
      path: '/admin/audit-logs',
      active: pathname === '/admin/audit-logs'
    },
    { divider: true },
    { 
      text: 'Support', 
      icon: <SupportAgentIcon />, 
      path: '/admin/support/tickets',
      active: pathname === '/admin/support/tickets' || pathname === '/admin/support/stats'
    },
    { 
      text: 'Knowledge Base', 
      icon: <KnowledgeIcon />, 
      path: '/admin/knowledge-base',
      active: pathname === '/admin/knowledge-base' || pathname === '/admin/knowledge-base/categories'
    },
    { 
      text: 'Documentation', 
      icon: <DocumentationIcon />, 
      path: '/admin/documentation',
      active: pathname === '/admin/documentation' || pathname?.startsWith('/admin/documentation/')
    },
    { divider: true },
    { 
      text: 'Blog', 
      icon: <ArticleIcon />, 
      path: '/admin/blog',
      active: pathname === '/admin/blog'
    },
    { 
      text: 'Roadmap', 
      icon: <RoadmapIcon />, 
      path: '/admin/roadmap',
      active: pathname === '/admin/roadmap'
    },
    { 
      text: 'Testimonials', 
      icon: <TestimonialsIcon />, 
      path: '/admin/testimonials',
      active: pathname === '/admin/testimonials'
    },
    { 
      text: 'Careers', 
      icon: <CareersIcon />, 
      path: '/admin/careers',
      active: pathname === '/admin/careers'
    },
    { divider: true },
    { 
      text: 'Settings', 
      icon: <SettingsIcon />, 
      path: '/admin/settings',
      active: pathname === '/admin/settings' || pathname?.startsWith('/admin/settings/')
    },
  ];
  
  const drawer = (
    <Box>
      <Toolbar sx={{ justifyContent: 'center' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
          IriSync Admin
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems.map((item, index) => (
          item.divider ? (
            <Divider key={`divider-${index}`} sx={{ my: 1 }} />
          ) : (
            <ListItem key={item.text} disablePadding>
              <ListItemButton 
                component={Link} 
                href={item.path || '#'}
                selected={item.active}
              >
                <ListItemIcon sx={{ color: item.active ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )
        ))}
      </List>
    </Box>
  );
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton 
              color="inherit" 
              onClick={handleNotificationsOpen}
              size="large"
            >
              <Badge badgeContent={4} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {/* User Menu */}
          <Tooltip title="Account">
            <IconButton
              onClick={handleUserMenuOpen}
              size="large"
              color="inherit"
              sx={{ ml: 1 }}
            >
              <Avatar sx={{ width: 32, height: 32 }}>A</Avatar>
            </IconButton>
          </Tooltip>
          
          {/* User Menu Items */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => router.push('/admin/profile')}>
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => router.push('/admin/settings')}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
          
          {/* Notifications Menu */}
          <Menu
            anchorEl={notificationsAnchorEl}
            open={Boolean(notificationsAnchorEl)}
            onClose={handleNotificationsClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            sx={{ 
              '& .MuiPaper-root': { 
                width: 320,
                maxHeight: 400
              } 
            }}
          >
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Notifications
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleNotificationsClose}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" fontWeight="medium">
                  New support ticket
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  User reported an issue with publishing content
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }} color="text.disabled">
                  5 minutes ago
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleNotificationsClose}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" fontWeight="medium">
                  System alert
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Storage usage above 80%
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }} color="text.disabled">
                  1 hour ago
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleNotificationsClose}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" fontWeight="medium">
                  New user registered
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Enterprise tier: Acme Corporation
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }} color="text.disabled">
                  1 day ago
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => router.push('/admin/notifications')}>
              <Typography variant="body2" color="primary" sx={{ width: '100%', textAlign: 'center' }}>
                View all notifications
              </Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Drawer - Mobile (temporary) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Drawer - Desktop (permanent) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
        open
      >
        {drawer}
      </Drawer>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar /> {/* Empty toolbar for spacing */}
        {children}
      </Box>
    </Box>
  );
};

export default AdminLayout;

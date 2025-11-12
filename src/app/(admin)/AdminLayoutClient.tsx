'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  AppBar, 
  IconButton, 
  Typography, 
  Divider, 
  useMediaQuery, 
  useTheme 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ArticleIcon from '@mui/icons-material/Article';
import WorkIcon from '@mui/icons-material/Work';
import LogoutIcon from '@mui/icons-material/Logout';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import TokenIcon from '@mui/icons-material/Token';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DRAWER_WIDTH = 240;

const navItems = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: <DashboardIcon /> },
  { name: 'Users', path: '/admin/users', icon: <PeopleIcon /> },
  { name: 'Knowledge Base', path: '/admin/knowledge', icon: <ArticleIcon /> },
  { name: 'Careers', path: '/admin/careers', icon: <WorkIcon /> },
  { name: 'Testimonials', path: '/admin/testimonials', icon: <FormatQuoteIcon /> },
  { name: 'Analytics', path: '/admin/analytics', icon: <AnalyticsIcon /> },
  { name: 'Token Usage', path: '/admin/tokens/usage', icon: <TokenIcon /> },
  { name: 'Settings', path: '/admin/settings', icon: <SettingsIcon /> },
];

const AdminSidebar = ({ 
  mobileOpen, 
  handleDrawerToggle,
  container
}: { 
  mobileOpen: boolean, 
  handleDrawerToggle: () => void,
  container?: () => HTMLElement
}) => {
  const pathname = usePathname();

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          IriSync Admin
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => {
          // Check if the current path starts with this item's path
          const isActive = pathname?.startsWith(item.path) || false;
          
          return (
            <ListItem key={item.name} disablePadding>
              <ListItemButton 
                component={Link} 
                href={item.path}
                selected={isActive}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/auth/logout">
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      aria-label="admin navigation"
    >
      {/* Mobile drawer */}
      <Drawer
        container={container}
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box 
      component="div" 
      sx={{ 
        display: 'flex',
        minHeight: '100vh',
      }}
    >
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
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
          <Typography variant="h6" noWrap component="div">
            Admin Panel
          </Typography>
        </Toolbar>
      </AppBar>
      
      <AdminSidebar 
        mobileOpen={mobileOpen} 
        handleDrawerToggle={handleDrawerToggle}
      />
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          mt: '64px', // Height of AppBar
        }}
      >
        {children}
      </Box>
    </Box>
  );
} 
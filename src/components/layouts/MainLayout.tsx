'use client';

import React, { ReactNode } from 'react';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MenuIcon from '@mui/icons-material/Menu';

// Navigation items
const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Features & Pricing', path: '/features-pricing' },
  { name: 'Blog', path: '/blog' },
  { name: 'About', path: '/about' },
  { name: 'Documentation', path: '/documentation' },
  { name: 'Support', path: '/support' },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const pathname = usePathname();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Mobile drawer content
  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2, color: 'primary.main', fontWeight: 'bold' }}>
        IriSync
      </Typography>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton 
              component={Link} 
              href={item.path}
              sx={{ 
                textAlign: 'center',
                bgcolor: pathname === item.path ? 'primary.light' : 'transparent',
                color: pathname === item.path ? 'primary.main' : 'text.primary',
              }}
            >
              <ListItemText primary={item.name} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton 
            component={Link} 
            href="/auth/login"
            sx={{ 
              textAlign: 'center',
              fontWeight: 'medium',
            }}
          >
            <ListItemText primary="Log In" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar component="nav" position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            {/* Logo */}
            <Typography
              variant="h6"
              component={Link}
              href="/"
              sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                fontWeight: 'bold',
                textDecoration: 'none',
                color: 'primary.main'
              }}
            >
              IriSync
            </Typography>

            {/* Desktop Navigation */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
              {navItems.map((item) => (
                <Button 
                  key={item.name}
                  component={Link}
                  href={item.path}
                  sx={{ 
                    color: pathname === item.path ? 'primary.main' : 'text.primary',
                    fontWeight: pathname === item.path ? 'medium' : 'regular',
                    mx: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  {item.name}
                </Button>
              ))}
              <Button 
                variant="primary" 
                color="primary"
                component={Link}
                href="/auth/login"
                sx={{ ml: 2 }}
              >
                Log In
              </Button>
            </Box>

            {/* Mobile menu button */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="end"
              onClick={handleDrawerToggle}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 240 
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>

      {/* Footer */}
      <Box 
        component="footer" 
        sx={{ 
          py: 4, 
          mt: 'auto',
          backgroundColor: 'grey.100',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} IriSync. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

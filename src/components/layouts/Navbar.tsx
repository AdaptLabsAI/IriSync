'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Container,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Tooltip
} from '@mui/material';
import { Menu as MenuIcon, Notifications, Search } from '@mui/icons-material';
import { OrganizationSwitcher } from '../ui/OrganizationSwitcher';
import { tokens } from '@/styles/tokens';

// Navigation links
const navLinks = [
  { title: 'Home', path: '/' },
  { title: 'Integrations', path: '/integrations' },
  { title: 'Pricing', path: '/pricing' },
  { title: 'Careers', path: '/careers' },
  { title: 'Blog', path: '/blog' }
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  return (
    <AppBar position="sticky" color="default" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ height: 64, justifyContent: 'space-between' }}>
          {/* Logo */}
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: tokens.typography.fontWeight.semibold,
              color: 'primary.main',
              textDecoration: 'none'
            }}
          >
            IriSync
          </Typography>

          {/* Mobile Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="lg"
              aria-label="menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {navLinks.map((link) => (
                <MenuItem 
                  key={link.title} 
                  onClick={handleCloseNavMenu}
                  component={Link}
                  href={link.path}
                  selected={pathname === link.path}
                >
                  <Typography textAlign="center">{link.title}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Mobile Logo */}
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontWeight: tokens.typography.fontWeight.semibold,
              color: 'primary.main',
              textDecoration: 'none',
            }}
          >
            IriSync
          </Typography>

          {/* Desktop Nav Links */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, ml: 2 }}>
            {navLinks.map((link) => (
              <Button
                key={link.title}
                component={Link}
                href={link.path}
                sx={{ 
                  my: 2, 
                  color: pathname === link.path ? 'primary.main' : 'text.primary',
                  display: 'block',
                  fontWeight: pathname === link.path ? 700 : 400,
                  mx: 1
                }}
              >
                {link.title}
              </Button>
            ))}
          </Box>

          {/* Right Side - User Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Organization Switcher - Only show if logged in */}
            {session?.user && <OrganizationSwitcher />}
            
            {/* Search */}
            <Tooltip title="Search">
              <IconButton sx={{ ml: 1 }}>
                <Search />
              </IconButton>
            </Tooltip>

            {/* Notifications - Only show if logged in */}
            {session?.user && (
              <Tooltip title="Notifications">
                <IconButton sx={{ ml: 1 }}>
                  <Notifications />
                </IconButton>
              </Tooltip>
            )}

            {/* User Menu or Sign In */}
            {session?.user ? (
              <>
                <Tooltip title="Account settings">
                  <IconButton onClick={handleOpenUserMenu} sx={{ ml: 1 }}>
                    <Avatar 
                      alt={session.user.name || 'User'} 
                      src={session.user.image || '/images/default-avatar.png'}
                      sx={{ width: 32, height: 32 }}
                    />
                  </IconButton>
                </Tooltip>
                <Menu
                  sx={{ mt: '45px' }}
                  id="menu-appbar"
                  anchorEl={anchorElUser}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorElUser)}
                  onClose={handleCloseUserMenu}
                >
                  <MenuItem component={Link} href="/dashboard" onClick={handleCloseUserMenu}>
                    <Typography textAlign="center">Dashboard</Typography>
                  </MenuItem>
                  <MenuItem component={Link} href="/dashboard/settings/profile" onClick={handleCloseUserMenu}>
                    <Typography textAlign="center">Profile</Typography>
                  </MenuItem>
                  <MenuItem component={Link} href="/dashboard/settings" onClick={handleCloseUserMenu}>
                    <Typography textAlign="center">Settings</Typography>
                  </MenuItem>
                  <Divider />
                  <MenuItem component={Link} href="/auth/logout" onClick={handleCloseUserMenu}>
                    <Typography textAlign="center">Logout</Typography>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button 
                  component={Link} 
                  href="/auth/login" 
                  sx={{ ml: 1 }}
                >
                  Log in
                </Button>
                <Button 
                  component={Link}
                  href="/auth/register"
                  variant="contained" 
                  sx={{ ml: 1 }}
                >
                  Sign up
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
} 
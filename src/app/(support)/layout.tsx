'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Button,
  Container,
  Typography,
  Divider,
  Paper
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Check if user is authenticated and if they are an admin
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthenticated(!!user);
      
      // Check if user is admin
      if (user && firestore) {
        try {
          const userRef = doc(firestore, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const role = userData.role || 'user';
            setIsAdmin(role === 'admin' || role === 'super_admin');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Define support navigation links
  const supportLinks = [
    { name: 'Support Home', href: '/support' },
    { name: 'FAQs', href: '/support/faq' },
    { name: 'Community Forum', href: '/support/forum' },
    { name: 'Documentation', href: '/documentation' },
    { name: 'Roadmap', href: '/roadmap' },
    { name: 'System Status', href: '/system-status' }
  ];
  
  return (
    <>
      {/* Support navigation bar */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Home/Dashboard link */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                component={Link}
                href="/"
                color="primary"
                startIcon={<HomeIcon />}
                sx={{ my: 1 }}
              >
                Home
              </Button>
              
              {isAuthenticated && (
                <Button
                  component={Link}
                  href="/dashboard"
                  color="primary"
                  startIcon={<DashboardIcon />}
                  sx={{ my: 1 }}
                >
                  Dashboard
                </Button>
              )}
              
              {isAdmin && (
                <Button
                  component={Link}
                  href="/admin/dashboard"
                  color="secondary"
                  startIcon={<AdminPanelSettingsIcon />}
                  sx={{ my: 1 }}
                >
                  Admin
                </Button>
              )}
            </Box>
            
            {/* Support links */}
            <Box sx={{ overflowX: 'auto', flexGrow: 1 }}>
              <Box sx={{ display: 'flex', py: 1, justifyContent: 'center' }}>
                {supportLinks.map((link) => (
                  <Button
                    key={link.name}
                    component={Link}
                    href={link.href}
                    color={pathname === link.href ? 'primary' : 'inherit'}
                    sx={{
                      mx: 1,
                      fontWeight: pathname === link.href ? 'medium' : 'regular',
                      borderBottom: pathname === link.href ? '2px solid' : 'none',
                      borderColor: 'primary.main',
                      borderRadius: 0,
                      pb: 0.5
                    }}
                  >
                    {link.name}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>
      
      {/* Main content */}
      {children}
    </>
  );
} 
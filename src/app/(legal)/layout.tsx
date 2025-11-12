'use client';

import React from 'react';
import {
  Box, 
  Container, 
  Toolbar, 
  AppBar, 
  Button, 
  Typography
} from '@mui/material';
import Link from 'next/link';
import MainLayout from '@/components/layouts/MainLayout';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Legal pages use the main layout but add a consistent header with links to other legal pages
  return (
    <MainLayout>
      <Box component="div" sx={{ 
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}>
        <Container maxWidth="lg">
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 1,
            gap: 4
          }}>
            <Button 
              component={Link} 
              href="/terms" 
              variant="text" 
              color="inherit"
              size="small"
            >
              Terms of Service
            </Button>
            <Button 
              component={Link} 
              href="/privacy" 
              variant="text" 
              color="inherit"
              size="small"
            >
              Privacy Policy
            </Button>
            <Button 
              component={Link} 
              href="/cookies" 
              variant="text" 
              color="inherit"
              size="small"
            >
              Cookie Policy
            </Button>
          </Box>
        </Container>
      </Box>
      {children}
    </MainLayout>
  );
} 
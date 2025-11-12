import React, { ReactNode } from 'react';
import { Box, Container, Typography, Paper, Grid, Stack } from '@mui/material';
import Link from 'next/link';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'grey.50',
      display: 'flex'
    }}>
      {/* Left side - Branding */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '1',
          background: 'linear-gradient(to bottom right, #3793ff, #9c27b0)',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          p: 8
        }}
      >
        <Stack spacing={6} sx={{ maxWidth: 'md' }}>
          <Typography variant="h2">IriSync</Typography>
          <Typography variant="h5" textAlign="center">
            Streamline your social media management with AI-powered tools
          </Typography>
        </Stack>
      </Box>

      {/* Right side - Auth Form */}
      <Box 
        sx={{
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 8
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 'md' }}>
          <Stack spacing={8} sx={{ width: '100%' }}>
            <Box>
              <Link href="/" passHref style={{ textDecoration: 'none' }}>
                <Typography 
                  variant="h4" 
                  color="primary"
                  sx={{ display: { xs: 'block', md: 'none' }, cursor: 'pointer' }}
                >
                  IriSync
                </Typography>
              </Link>
              <Typography variant="h4" sx={{ mt: 4 }}>{title}</Typography>
              {subtitle && (
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            
            <Paper 
              elevation={2} 
              sx={{ 
                width: '100%', 
                bgcolor: 'white', 
                borderRadius: 1, 
                p: 4 
              }}
            >
              {children}
            </Paper>
            
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                © {new Date().getFullYear()} IriSync. All rights reserved.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;

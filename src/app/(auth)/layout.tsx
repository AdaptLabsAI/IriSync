import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication | IriSync',
  description: 'Secure authentication for IriSync platform',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        backgroundImage: 'linear-gradient(45deg, #f3f4f6 25%, transparent 25%, transparent 75%, #f3f4f6 75%, #f3f4f6), linear-gradient(45deg, #f3f4f6 25%, transparent 25%, transparent 75%, #f3f4f6 75%, #f3f4f6)',
        backgroundSize: '60px 60px',
        backgroundPosition: '0 0, 30px 30px',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            backgroundColor: 'white',
          }}
        >
          {children}
        </Paper>
      </Container>
    </Box>
  );
} 
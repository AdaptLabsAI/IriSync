'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box, Typography } from '@mui/material';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to profile page
    router.replace('/dashboard/settings/profile');
  }, [router]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <CircularProgress size={40} sx={{ mb: 2 }} />
      <Typography variant="h6">Redirecting to profile settings...</Typography>
    </Box>
  );
} 
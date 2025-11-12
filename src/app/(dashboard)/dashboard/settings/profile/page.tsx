'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Box, Typography, Container, Paper, CircularProgress, Divider } from '@mui/material';
import ProfileForm from '@/components/settings/ProfileForm';
import AccountSettings from '@/components/settings/AccountSettings';
import ProfileRoleInfo from '@/components/settings/ProfileRoleInfo';

export default function ProfileSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 10 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 5, md: 8 } }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 5, textAlign: { xs: 'center', md: 'left' } }}>
          <Typography
            variant="h4"
            fontWeight={700}
            gutterBottom
            sx={{
    background: 'linear-gradient(90deg, #22c55e, #16a34a)',


              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
            }}
          >
            Profile Settings
          </Typography>
          <Typography variant="body1" color="text.secondary" maxWidth="sm" mx={{ xs: 'auto', md: 0 }}>
            Manage your personal information, account preferences, and system access in one place.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 3, md: 4 },
          }}
        >
          {/* Personal Information */}
          <Paper
            elevation={3}
            sx={{
              flex: { md: '1 1 60%' },
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="h6" fontWeight={600} mb={2}>
              Personal Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ProfileForm />
          </Paper>

          {/* Account Settings & User Access */}
          <Box
            sx={{
              flex: { md: '1 1 40%' },
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <Paper
              elevation={3}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 4,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="h6" fontWeight={600} mb={2}>
                Account Settings
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <AccountSettings />
            </Paper>

            <Paper
              elevation={3}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 4,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="h6" fontWeight={600} mb={2}>
                User Access
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <ProfileRoleInfo />
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

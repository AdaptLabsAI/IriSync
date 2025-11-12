'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Box,
  Typography, 
  Chip,
  Button,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material';
import { AdminPanelSettings, Security } from '@mui/icons-material';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase';

const ProfileRoleInfo = () => {
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          setLoading(false);
          return;
        }

        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || 'user');
        } else {
          setUserRole('user');
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError('Failed to load user role information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isSuperAdmin = userRole === 'super_admin';
  const isOrgAdmin = userRole === 'org_admin';

  const getRoleColor = () => {
    switch(userRole) {
      case 'super_admin':
        return 'error';
      case 'admin':
        return 'warning';
      case 'org_admin':
        return 'info';
      case 'premium':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRoleLabel = () => {
    switch(userRole) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'premium':
        return 'Premium User';
      default:
        return 'Standard User';
    }
  };

  const handleAdminDashboard = () => {
    router.push('/admin/dashboard');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">Account Type</Typography>
          <Box display="flex" alignItems="center" mt={1}>
            <Chip 
              label={getRoleLabel()} 
              color={getRoleColor() as any}
              size="small"
              icon={isSuperAdmin || isAdmin ? <Security fontSize="small" /> : undefined}
            />
          </Box>
        </Box>

        {isAdmin && (
          <Box mt={2}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AdminPanelSettings />}
              onClick={handleAdminDashboard}
              fullWidth
            >
              Access Admin Dashboard
            </Button>
          </Box>
        )}

        {!isAdmin && (
          <Typography variant="body2" color="text.secondary">
            Admin access is required to access additional system features and settings.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default ProfileRoleInfo; 
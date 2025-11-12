'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Box, 
  Button, 
  Typography, 
  Divider, 
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Alert,
  Chip
} from '@mui/material';
import { LockOutlined, PasswordOutlined } from '@mui/icons-material';
import { updatePassword, getAuth, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { format } from 'date-fns';
import { ReferralSection } from './ReferralSection';

interface UserData {
  user: {
    email: string;
    createdAt: any;
    lastSignIn?: any;
  };
}

const AccountSettings = () => {
  const { data: session } = useSession();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);

  // Fetch user data from API for accurate information
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (session?.user?.id) {
      fetchUserData();
    }
  }, [session?.user?.id]);

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }

      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setSuccess('Password successfully updated');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setPasswordDialogOpen(false);
    } catch (err: any) {
      console.error('Error updating password:', err);
      if (err.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('Please log in again before changing your password');
      } else {
        setError(err.message || 'Failed to update password');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'Unknown';
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp
      if (dateValue && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      }
      // Handle Firebase Auth metadata string dates
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      }
      // Handle regular Date objects
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      // Handle timestamp numbers
      else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      }
      else {
        return 'Unknown';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      // Format the date properly
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateValue);
      return 'Unknown';
    }
  };

  const getAccountCreationDate = () => {
    // First try userData from API
    if (userData?.user.createdAt) {
      return formatDate(userData.user.createdAt);
    }
    
    // Fallback to Firebase Auth metadata
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user?.metadata?.creationTime) {
      return formatDate(user.metadata.creationTime);
    }
    
    return 'Unknown';
  };

  const getLastSignInDate = () => {
    // First try userData from API
    if (userData?.user.lastSignIn) {
      return formatDate(userData.user.lastSignIn);
    }
    
    // Fallback to Firebase Auth metadata
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user?.metadata?.lastSignInTime) {
      return formatDate(user.metadata.lastSignInTime);
    }
    
    return 'Unknown';
  };

  const getEmailAddress = () => {
    // Try multiple sources for email
    return userData?.user.email || 
           session?.user?.email || 
           getAuth().currentUser?.email || 
           'N/A';
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">Email Address</Typography>
          <Typography>{getEmailAddress()}</Typography>
        </Box>
        
        <Divider />
        
        <Box>
          <Typography variant="subtitle2" color="text.secondary">Account Created</Typography>
          <Typography>{getAccountCreationDate()}</Typography>
        </Box>
        
        <Divider />
        
        <Box>
          <Typography variant="subtitle2" color="text.secondary">Last Sign In</Typography>
          <Typography>{getLastSignInDate()}</Typography>
        </Box>
        
        <Divider />
        
        <Box>
          <Typography variant="subtitle2" color="text.secondary">Password</Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<LockOutlined />}
            onClick={() => setPasswordDialogOpen(true)}
          >
            Change Password
          </Button>
        </Box>
      </Stack>
      
      {/* Referral Program Section */}
      <Divider sx={{ my: 4 }} />
      <ReferralSection />
      
      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
        <DialogTitle>Change Your Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your current password and a new password to update your credentials.
          </DialogContentText>
          
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Current Password"
              type="password"
              fullWidth
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <TextField
              label="New Password"
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              helperText="Password must be at least 8 characters"
            />
            <TextField
              label="Confirm New Password"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleResetPassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            color="primary"
            variant="contained"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountSettings; 
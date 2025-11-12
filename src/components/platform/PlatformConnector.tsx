import React, { useState } from 'react';
import { PlatformType } from '../../lib/platforms/client';
import axios from 'axios';
import { 
  Button, 
  Box, 
  Spinner, 
  Alert,
} from '../../components/ui/mui-components';
import {
  Modal,
  TextField,
  MenuItem,
  Typography,
  CircularProgress,
  Stack,
  Select as MuiSelect,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useSession } from 'next-auth/react';

// Platform options with display names and icons
const platformOptions = [
  { value: PlatformType.FACEBOOK, label: 'Facebook', icon: '📘' },
  { value: PlatformType.INSTAGRAM, label: 'Instagram', icon: '📸' },
  { value: PlatformType.TWITTER, label: 'Twitter', icon: '🐦' },
  { value: PlatformType.LINKEDIN, label: 'LinkedIn', icon: '💼' },
  { value: PlatformType.YOUTUBE, label: 'YouTube', icon: '📹' },
  { value: PlatformType.TIKTOK, label: 'TikTok', icon: '🎵' },
  { value: PlatformType.PINTEREST, label: 'Pinterest', icon: '📌' },
  { value: PlatformType.REDDIT, label: 'Reddit', icon: '👽' },
  { value: PlatformType.MASTODON, label: 'Mastodon', icon: '🐘' },
  { value: PlatformType.THREADS, label: 'Threads', icon: '🧵' }
];

interface PlatformConnectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (platform: PlatformType) => void;
}

export const PlatformConnector: React.FC<PlatformConnectorProps> = ({ 
  isOpen, 
  onClose,
  onSuccess
}) => {
  const { data: session } = useSession();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | ''>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle platform selection
  const handlePlatformChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedPlatform(event.target.value as PlatformType);
    setError(null);
  };
  
  // Connect to the selected platform
  const connectPlatform = async () => {
    if (!selectedPlatform) {
      setError('Please select a platform to connect');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Call API to initiate OAuth flow
      const response = await axios.post('/api/platforms/connect', {
        platform: selectedPlatform
      });
      
      // Store connection ID in session storage for the callback
      sessionStorage.setItem('platformConnectionId', response.data.connectionId);
      
      // Redirect to authorization URL
      window.location.href = response.data.authUrl;
      
    } catch (error: any) {
      console.error('Error connecting platform:', error);
      
      // Handle account limit errors specially
      if (error.response?.data?.error === 'Account limit reached') {
        setError(`${error.response.data.message} Please upgrade your plan to connect more accounts.`);
      } else {
        setError(error.response?.data?.error || 'Failed to connect platform');
      }
      
      setIsConnecting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Connect a Social Platform</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Typography variant="body1" sx={{ mb: 2 }}>Select a platform to connect:</Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="platform-select-label">Select platform</InputLabel>
          <MuiSelect
            labelId="platform-select-label"
            value={selectedPlatform}
            onChange={handlePlatformChange as any}
            label="Select platform"
          >
            {platformOptions.map(platform => (
              <MenuItem key={platform.value} value={platform.value}>
                {platform.icon} {platform.label}
              </MenuItem>
            ))}
          </MuiSelect>
        </FormControl>
        
        {isConnecting && (
          <Stack direction="column" alignItems="center" spacing={1} sx={{ mt: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              You&apos;ll be redirected to authorize access...
            </Typography>
          </Stack>
        )}
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Connecting a platform will allow IriSync to post content and retrieve analytics on your behalf.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={isConnecting}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={connectPlatform} 
          disabled={!selectedPlatform || isConnecting}
          startIcon={isConnecting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isConnecting ? 'Connecting...' : 'Connect Platform'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Callback handler component for OAuth returns
export const PlatformConnectorCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Completing platform connection...');
  
  React.useEffect(() => {
    const completeConnection = async () => {
      try {
        // Check if there's a connection in progress
        const connectionId = sessionStorage.getItem('platformConnectionId');
        if (!connectionId) {
          setStatus('error');
          setMessage('No connection in progress');
          return;
        }
        
        // Connection was successful
        setStatus('success');
        setMessage('Platform connected successfully!');
        
        // Clear connection ID
        sessionStorage.removeItem('platformConnectionId');
        
        // Redirect back to dashboard after a delay
        setTimeout(() => {
          window.location.href = '/dashboard/settings/connections';
        }, 2000);
        
      } catch (error) {
        console.error('Error completing connection:', error);
        setStatus('error');
        setMessage('Failed to complete platform connection');
      }
    };
    
    completeConnection();
  }, []);
  
  return (
    <Stack direction="column" alignItems="center" justifyContent="center" sx={{ height: '100vh' }}>
      {status === 'loading' && <CircularProgress size={60} sx={{ mb: 2 }} />}
      {status === 'success' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      {status === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      
      <Typography>
        {status === 'loading' ? 'Please wait...' : 'Redirecting back to dashboard...'}
      </Typography>
    </Stack>
  );
}; 
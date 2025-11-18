'use client';

import { useEffect, useState } from 'react';
import { getFirebaseClientAuth } from '@/lib/core/firebase/client';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Box, Button, Typography, Alert, CircularProgress, Stack, IconButton, List, ListItem, ListItemText, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { tokens } from '@/styles/tokens';

// Group providers by category
const PROVIDERS = [
  // Social Media Platforms
  { type: 'twitter', label: 'Twitter', category: 'social' },
  { type: 'facebook', label: 'Facebook', category: 'social' },
  { type: 'instagram', label: 'Instagram', category: 'social' },
  { type: 'linkedin', label: 'LinkedIn', category: 'social' },
  { type: 'mastodon', label: 'Mastodon', category: 'social' },
  { type: 'pinterest', label: 'Pinterest', category: 'social' },
  { type: 'reddit', label: 'Reddit', category: 'social' },
  { type: 'threads', label: 'Threads', category: 'social' },
  { type: 'tiktok', label: 'TikTok', category: 'social' },
  { type: 'youtube', label: 'YouTube', category: 'social' },
  
  // CRM Platforms
  { type: 'hubspot', label: 'HubSpot', category: 'crm' },
  { type: 'salesforce', label: 'Salesforce', category: 'crm' },
  { type: 'zoho', label: 'Zoho CRM', category: 'crm' },
  { type: 'pipedrive', label: 'Pipedrive', category: 'crm' },
  { type: 'dynamics', label: 'Microsoft Dynamics', category: 'crm' },
  { type: 'sugarcrm', label: 'SugarCRM', category: 'crm' },
  
  // Design & Asset Platforms
  { type: 'canva', label: 'Canva', category: 'design' },
  { type: 'adobe-express', label: 'Adobe Express', category: 'design' },
  { type: 'google-drive', label: 'Google Drive', category: 'design' },
  { type: 'dropbox', label: 'Dropbox', category: 'design' },
  { type: 'onedrive', label: 'Microsoft OneDrive', category: 'design' },
  
  // Content Organization Platforms
  { type: 'notion', label: 'Notion', category: 'content' },
  { type: 'airtable', label: 'Airtable', category: 'content' },
  
  // Workflow Integrations
  { type: 'slack', label: 'Slack', category: 'workflow' },
  { type: 'teams', label: 'Microsoft Teams', category: 'workflow' },
  { type: 'asana', label: 'Asana', category: 'workflow' },
  { type: 'trello', label: 'Trello', category: 'workflow' },
  { type: 'zapier', label: 'Zapier', category: 'workflow' },
  { type: 'make', label: 'Make (Integromat)', category: 'workflow' },
];

export default function ConnectionsPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [connections, setConnections] = useState<{ type: string; name: string; status: string; details?: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  // Active category for filtering providers
  const [activeCategory, setActiveCategory] = useState<string>('social');

  // Monitor Firebase Auth state
  useEffect(() => {
    const auth = getFirebaseClientAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchConnections(currentUser);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchConnections = async (currentUser: FirebaseUser) => {
    setLoading(true);
    setError('');
    try {
      // Get Firebase ID token for authentication
      const idToken = await currentUser.getIdToken();

      const res = await fetch('/api/settings/connections', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load connections');
      setConnections(data.connections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (type: string) => {
    if (!user) {
      setError('Please log in to connect platforms');
      return;
    }

    setConnecting(type);
    setError('');
    setSuccess('');
    try {
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();

      // Redirect to OAuth flow with Firebase token
      window.location.href = `/api/settings/connections/oauth?provider=${type}&token=${idToken}`;
    } catch (err) {
      setError('Failed to start OAuth flow.');
    } finally {
      setConnecting(null);
    }
  };

  const handleRemove = async (type: string) => {
    if (!user) {
      setError('Please log in to remove connections');
      return;
    }

    setRemoving(type);
    setError('');
    setSuccess('');
    try {
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();

      const res = await fetch('/api/settings/connections', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect');
      setSuccess('Connection removed!');
      if (user) fetchConnections(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setRemoving(null);
    }
  };

  // Get unique categories
  const categories = Array.from(new Set(PROVIDERS.map(provider => provider.category)));

  // Filter providers by active category
  const filteredProviders = PROVIDERS.filter(provider => provider.category === activeCategory);

  return (
    <Box className="container mx-auto py-6 max-w-xl">
      <Typography
        variant="h4"
        mb={2}
        sx={{
          fontWeight: 600,
          fontSize: tokens.typography.fontSize.h1,
          color: tokens.colors.text.primary,
        }}
      >
        Connections
      </Typography>
      <Typography
        mb={4}
        sx={{
          color: tokens.colors.text.secondary,
          fontSize: tokens.typography.fontSize.body,
        }}
      >
        Manage your social media and third-party integrations.
      </Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          {/* Category tabs */}
          <Box sx={{ mb: 3, display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
            {categories.map(category => (
              <Button
                key={category}
                variant={activeCategory === category ? "contained" : "outlined"}
                onClick={() => setActiveCategory(category)}
                sx={{
                  textTransform: 'capitalize',
                  ...(activeCategory === category && {
                    bgcolor: tokens.colors.primary.main,
                    '&:hover': { bgcolor: tokens.colors.primary.dark },
                    borderRadius: tokens.borderRadius.md,
                  }),
                  ...activeCategory !== category && {
                    borderColor: tokens.colors.primary.main,
                    color: tokens.colors.primary.main,
                  }
                }}
              >
                {category}
              </Button>
            ))}
          </Box>
          
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" mb={2}>
            {activeCategory === 'social' ? 'Social Media Platforms' : 
             activeCategory === 'crm' ? 'CRM Systems' :
             activeCategory === 'design' ? 'Design & Asset Platforms' :
             activeCategory === 'content' ? 'Content Organization' :
             'Workflow Tools'}
          </Typography>
          <List>
            {filteredProviders.map(provider => {
              const conn = connections.find(c => c.type === provider.type);
              return (
                <ListItem key={provider.type} secondaryAction={
                  conn ? (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => handleRemove(provider.type)}
                      disabled={removing === provider.type}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={() => handleConnect(provider.type)}
                      disabled={connecting === provider.type}
                      sx={{
                        bgcolor: tokens.colors.primary.main,
                        '&:hover': { bgcolor: tokens.colors.primary.dark },
                        borderRadius: tokens.borderRadius.md,
                        boxShadow: tokens.shadows.md,
                      }}
                    >
                      Connect
                    </Button>
                  )
                }>
                  <ListItemText
                    primary={provider.label}
                    secondary={conn ? `Connected as ${conn.name} (${conn.status})` : 'Not connected'}
                  />
                </ListItem>
              );
            })}
          </List>
        </>
      )}
    </Box>
  );
} 
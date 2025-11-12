'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Box, Button, Typography, Alert, CircularProgress, Stack, IconButton, List, ListItem, ListItemText, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

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
  const { data: session } = useSession();
  const [connections, setConnections] = useState<{ type: string; name: string; status: string; details?: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  // Active category for filtering providers
  const [activeCategory, setActiveCategory] = useState<string>('social');

  const fetchConnections = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/settings/connections');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load connections');
      setConnections(data.connections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConnections(); }, []);

  const handleConnect = async (type: string) => {
    setConnecting(type);
    setError('');
    setSuccess('');
    try {
      // Redirect to OAuth flow
      window.location.href = `/api/settings/connections/oauth?provider=${type}`;
    } catch (err) {
      setError('Failed to start OAuth flow.');
    } finally {
      setConnecting(null);
    }
  };

  const handleRemove = async (type: string) => {
    setRemoving(type);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect');
      setSuccess('Connection removed!');
      fetchConnections();
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
      <Typography variant="h4" fontWeight={700} mb={2}>Connections</Typography>
      <Typography color="text.secondary" mb={4}>Manage your social media and third-party integrations.</Typography>
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
                sx={{ textTransform: 'capitalize' }}
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
                      color="primary"
                      onClick={() => handleConnect(provider.type)}
                      disabled={connecting === provider.type}
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
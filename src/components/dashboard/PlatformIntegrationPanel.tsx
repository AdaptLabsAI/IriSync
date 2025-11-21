'use client';

import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper, Divider, Chip, Button, Alert } from '@mui/material';
import Grid from '@/components/ui/grid';
import { useRouter } from 'next/navigation';

// Platform type definitions (imported from PlatformConnectButton)
type SocialPlatform = 
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'pinterest'
  | 'youtube'
  | 'reddit'
  | 'mastodon'
  | 'tiktok'
  | 'threads'
  | 'other';

type CrmPlatform = 
  | 'hubspot'
  | 'salesforce'
  | 'zoho'
  | 'pipedrive'
  | 'dynamics'
  | 'sugarcrm';

type DesignPlatform =
  | 'canva'
  | 'adobe-express'
  | 'google-drive'
  | 'dropbox'
  | 'onedrive';

type ContentPlatform =
  | 'notion'
  | 'airtable';

type WorkflowPlatform =
  | 'slack'
  | 'teams'
  | 'asana'
  | 'trello'
  | 'zapier'
  | 'make';

type PlatformType = 
  | SocialPlatform 
  | CrmPlatform 
  | DesignPlatform 
  | ContentPlatform
  | WorkflowPlatform;

// Implementation status for each platform
const PLATFORM_IMPLEMENTATION_STATUS: Record<string, 'complete' | 'partial' | 'planned'> = {
  // Social platforms
  'facebook': 'complete',
  'tiktok': 'complete',
  'instagram': 'partial',
  'twitter': 'partial',
  'linkedin': 'partial',
  'pinterest': 'partial',
  'youtube': 'partial',
  'reddit': 'partial',
  'mastodon': 'partial',
  'threads': 'partial',
  
  // CRM platforms
  'hubspot': 'planned',
  'salesforce': 'planned',
  'zoho': 'planned',
  'pipedrive': 'planned',
  'dynamics': 'planned',
  'sugarcrm': 'planned',
  
  // Design platforms
  'canva': 'partial',
  'adobe-express': 'partial',
  'google-drive': 'partial',
  'dropbox': 'partial',
  'onedrive': 'partial',
  
  // Content platforms
  'notion': 'planned',
  'airtable': 'planned',
  
  // Workflow platforms
  'slack': 'planned',
  'teams': 'planned',
  'asana': 'planned',
  'trello': 'planned',
  'zapier': 'planned',
  'make': 'planned'
};

// Platform information
interface PlatformInfo {
  id: string;
  name: string;
  description: string;
  category: 'social' | 'crm' | 'design' | 'content' | 'workflow';
  icon: string;
  color: string;
}

const PLATFORMS: PlatformInfo[] = [
  // Social platforms
  { id: 'facebook', name: 'Facebook', description: 'Connect and manage Facebook pages', category: 'social', icon: '/icons/facebook.svg', color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', description: 'Share photos and videos', category: 'social', icon: '/icons/instagram.svg', color: '#E1306C' },
  { id: 'twitter', name: 'Twitter', description: 'Share updates and engage with followers', category: 'social', icon: '/icons/twitter.svg', color: '#1DA1F2' },
  { id: 'linkedin', name: 'LinkedIn', description: 'Professional network', category: 'social', icon: '/icons/linkedin.svg', color: '#0A66C2' },
  { id: 'pinterest', name: 'Pinterest', description: 'Share visual content', category: 'social', icon: '/icons/pinterest.svg', color: '#E60023' },
  { id: 'youtube', name: 'YouTube', description: 'Video content platform', category: 'social', icon: '/icons/youtube.svg', color: '#FF0000' },
  { id: 'reddit', name: 'Reddit', description: 'Community-driven content', category: 'social', icon: '/icons/reddit.svg', color: '#FF4500' },
  { id: 'mastodon', name: 'Mastodon', description: 'Decentralized social network', category: 'social', icon: '/icons/mastodon.svg', color: '#6364FF' },
  { id: 'tiktok', name: 'TikTok', description: 'Short-form videos', category: 'social', icon: '/icons/tiktok.svg', color: '#000000' },
  { id: 'threads', name: 'Threads', description: 'Text-based conversations', category: 'social', icon: '/icons/threads.svg', color: '#000000' },
  
  // CRM platforms
  { id: 'hubspot', name: 'HubSpot', description: 'Customer relationship management', category: 'crm', icon: '/icons/hubspot.svg', color: '#FF7A59' },
  { id: 'salesforce', name: 'Salesforce', description: 'Cloud-based CRM solution', category: 'crm', icon: '/icons/salesforce.svg', color: '#00A1E0' },
  { id: 'zoho', name: 'Zoho CRM', description: 'Sales and marketing solution', category: 'crm', icon: '/icons/zoho.svg', color: '#E62F2D' },
  { id: 'pipedrive', name: 'Pipedrive', description: 'Sales pipeline management', category: 'crm', icon: '/icons/pipedrive.svg', color: '#26A69A' },
  { id: 'dynamics', name: 'Microsoft Dynamics', description: 'Business applications', category: 'crm', icon: '/icons/dynamics.svg', color: '#002050' },
  { id: 'sugarcrm', name: 'SugarCRM', description: 'Customer experience platform', category: 'crm', icon: '/icons/sugarcrm.svg', color: '#E61718' },
  
  // Design platforms
  { id: 'canva', name: 'Canva', description: 'Graphic design platform', category: 'design', icon: '/icons/canva.svg', color: '#00C4CC' },
  { id: 'adobe-express', name: 'Adobe Express', description: 'Quick graphic design', category: 'design', icon: '/icons/adobe-express.svg', color: '#FF3366' },
  { id: 'google-drive', name: 'Google Drive', description: 'File storage and sharing', category: 'design', icon: '/icons/google-drive.svg', color: '#4285F4' },
  { id: 'dropbox', name: 'Dropbox', description: 'File hosting service', category: 'design', icon: '/icons/dropbox.svg', color: '#0061FF' },
  { id: 'onedrive', name: 'Microsoft OneDrive', description: 'File hosting service', category: 'design', icon: '/icons/onedrive.svg', color: '#0078D4' },
  
  // Content platforms
  { id: 'notion', name: 'Notion', description: 'All-in-one workspace', category: 'content', icon: '/icons/notion.svg', color: '#000000' },
  { id: 'airtable', name: 'Airtable', description: 'Database-spreadsheet hybrid', category: 'content', icon: '/icons/airtable.svg', color: '#F82B60' },
  
  // Workflow platforms
  { id: 'slack', name: 'Slack', description: 'Business communication platform', category: 'workflow', icon: '/icons/slack.svg', color: '#4A154B' },
  { id: 'teams', name: 'Microsoft Teams', description: 'Team collaboration platform', category: 'workflow', icon: '/icons/teams.svg', color: '#6264A7' },
  { id: 'asana', name: 'Asana', description: 'Work management platform', category: 'workflow', icon: '/icons/asana.svg', color: '#F06A6A' },
  { id: 'trello', name: 'Trello', description: 'Project management tool', category: 'workflow', icon: '/icons/trello.svg', color: '#0079BF' },
  { id: 'zapier', name: 'Zapier', description: 'Automation for business', category: 'workflow', icon: '/icons/zapier.svg', color: '#FF4A00' },
  { id: 'make', name: 'Make', description: 'Visual workflow automation', category: 'workflow', icon: '/icons/make.svg', color: '#3A36DB' },
];

// Status labels
const StatusLabels: Record<string, { label: string, color: string }> = {
  'complete': { label: 'Ready', color: 'success' },
  'partial': { label: 'Beta', color: 'warning' },
  'planned': { label: 'Coming Soon', color: 'info' },
};

interface PlatformCardProps {
  platform: PlatformInfo;
  onConnect: (platformId: string) => void;
}

const PlatformCard: React.FC<PlatformCardProps> = ({ platform, onConnect }) => {
  const status = PLATFORM_IMPLEMENTATION_STATUS[platform.id] || 'planned';
  const statusInfo = StatusLabels[status];
  
  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        opacity: status === 'planned' ? 0.7 : 1,
      }}
    >
      <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
        <Chip
          size="sm"
          label={statusInfo.label}
          color={statusInfo.color as any}
        />
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box 
          sx={{ 
            width: 40, 
            height: 40, 
            background: `${platform.color}22`, 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 1
          }}
        >
          {platform.name.charAt(0)}
        </Box>
        <Typography variant="h6">{platform.name}</Typography>
      </Box>
      
      <Typography variant="body2" sx={{ mb: 2, flex: 1 }}>
        {platform.description}
      </Typography>
      
      <Button 
        variant="outlined" 
        fullWidth
        disabled={status === 'planned'}
        onClick={() => onConnect(platform.id)}
      >
        Connect
      </Button>
    </Paper>
  );
};

export default function PlatformIntegrationPanel() {
  const [activeTab, setActiveTab] = useState<string>('social');
  const router = useRouter();
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };
  
  const handleConnect = (platformId: string) => {
    router.push(`/settings/connections?platform=${platformId}`);
  };
  
  const categories = [
    { value: 'social', label: 'Social Media' },
    { value: 'crm', label: 'CRM Systems' },
    { value: 'design', label: 'Design & Assets' },
    { value: 'content', label: 'Content Platforms' },
    { value: 'workflow', label: 'Workflow Tools' },
  ];
  
  // Get platforms for current category
  const filteredPlatforms = PLATFORMS.filter(p => p.category === activeTab);
  
  // Calculate implementation stats
  const categoryStats = categories.map(category => {
    const platformsInCategory = PLATFORMS.filter(p => p.category === category.value);
    const complete = platformsInCategory.filter(p => PLATFORM_IMPLEMENTATION_STATUS[p.id] === 'complete').length;
    const partial = platformsInCategory.filter(p => PLATFORM_IMPLEMENTATION_STATUS[p.id] === 'partial').length;
    const planned = platformsInCategory.filter(p => PLATFORM_IMPLEMENTATION_STATUS[p.id] === 'planned').length;
    
    return {
      ...category,
      stats: { complete, partial, planned, total: platformsInCategory.length }
    };
  });
  
  const currentStats = categoryStats.find(c => c.value === activeTab)?.stats;
  
  return (
    <Box>
      <Typography variant="h5" mb={3}>Platform Integrations</Typography>
      
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        variant="scrollable" 
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        {categories.map(category => (
          <Tab 
            key={category.value} 
            value={category.value} 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {category.label}
                {category.value === activeTab && (
                  <Chip 
                    size="sm" 
                    label={`${currentStats?.complete || 0}/${currentStats?.total || 0}`} 
                    sx={{ ml: 1, height: 20 }} 
                  />
                )}
              </Box>
            } 
          />
        ))}
      </Tabs>
      
      {/* Implementation status summary */}
      {currentStats && (
        <Box sx={{ mb: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Implementation Status</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip color="success" size="sm" label={`Ready: ${currentStats.complete}`} />
              <Chip color="warning" size="sm" label={`Beta: ${currentStats.partial}`} />
              <Chip color="info" size="sm" label={`Coming Soon: ${currentStats.planned}`} />
            </Box>
          </Paper>
        </Box>
      )}
      
      {activeTab === 'crm' && currentStats?.complete === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          CRM integrations are currently in development. All platforms listed are planned features coming soon.
        </Alert>
      )}
      
      {activeTab === 'workflow' && currentStats?.complete === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Workflow integrations are currently in development. All platforms listed are planned features coming soon.
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {filteredPlatforms.map(platform => (
          <Grid item xs={12} sm={6} md={4} key={platform.id}>
            <PlatformCard 
              platform={platform} 
              onConnect={handleConnect}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
} 
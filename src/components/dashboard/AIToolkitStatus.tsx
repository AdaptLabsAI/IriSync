'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, LinearProgress, Chip, Alert, Button } from '@mui/material';
import Grid from '@/components/ui/grid';
import { useRouter } from 'next/navigation';

// AI toolkit tools and their implementation status
interface AITool {
  id: string;
  name: string;
  description: string;
  status: 'complete' | 'partial' | 'planned';
  usageCount?: number;
  tier: 'creator' | 'influencer' | 'enterprise' | 'all';
}

const AI_TOOLS: AITool[] = [
  {
    id: 'content-generator',
    name: 'Content Generator',
    description: 'Generate social media posts, captions, and hashtags',
    status: 'complete',
    tier: 'all'
  },
  {
    id: 'content-analyzer',
    name: 'Content Analyzer',
    description: 'Analyze content sentiment, category, and engagement potential',
    status: 'complete',
    tier: 'all'
  },
  {
    id: 'media-analyzer',
    name: 'Media Analyzer',
    description: 'Analyze images for content, generate alt text, and detect inappropriate content',
    status: 'complete',
    tier: 'all'
  },
  {
    id: 'schedule-optimizer',
    name: 'Schedule Optimizer',
    description: 'Suggest optimal posting times based on audience engagement patterns',
    status: 'partial',
    tier: 'influencer'
  },
  {
    id: 'response-assistant',
    name: 'Response Assistant',
    description: 'Generate response suggestions for comments and messages',
    status: 'partial',
    tier: 'enterprise'
  },
  {
    id: 'brand-voice',
    name: 'Brand Voice Analyzer',
    description: 'Analyze and maintain consistent brand voice across all content',
    status: 'planned',
    tier: 'enterprise'
  },
  {
    id: 'audience-insights',
    name: 'Audience Insights',
    description: 'Generate insights about your audience based on engagement data',
    status: 'planned',
    tier: 'influencer'
  }
];

// Status labels
const StatusLabels: Record<string, { label: string, color: string }> = {
  'complete': { label: 'Available', color: 'success' },
  'partial': { label: 'Beta', color: 'warning' },
  'planned': { label: 'Coming Soon', color: 'info' },
};

interface AIUsageStats {
  used: number;
  total: number;
  tools: Record<string, number>;
}

export default function AIToolkitStatus() {
  const [usageStats, setUsageStats] = useState<AIUsageStats>({
    used: 37,
    total: 100,
    tools: {
      'content-generator': 20,
      'content-analyzer': 12,
      'media-analyzer': 5,
      'schedule-optimizer': 0,
      'response-assistant': 0,
      'brand-voice': 0,
      'audience-insights': 0
    }
  });
  const [userTier] = useState<'creator' | 'influencer' | 'enterprise'>('creator');
  const router = useRouter();
  
  // Filtering tools based on user tier
  const availableTools = AI_TOOLS.filter(tool => 
    tool.tier === 'all' || tool.tier === userTier
  );
  
  // Tools with usage data
  const toolsWithUsage = availableTools.map(tool => ({
    ...tool,
    usageCount: usageStats.tools[tool.id] || 0
  }));
  
  // Implementation stats
  const completeCount = availableTools.filter(t => t.status === 'complete').length;
  const partialCount = availableTools.filter(t => t.status === 'partial').length;
  const plannedCount = availableTools.filter(t => t.status === 'planned').length;
  
  const handleToolClick = (toolId: string) => {
    // Navigate to the toolkit page for the specified tool
    router.push(`/dashboard/ai-toolkit/${toolId}`);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">AI Toolkit</Typography>
        <Button variant="outlined" size="sm" onClick={() => router.push('/dashboard/ai-toolkit')}>
          View All Tools
        </Button>
      </Box>
      
      {/* Usage stats */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>AI Usage This Month</Typography>
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">
              {usageStats.used} / {usageStats.total} tokens
            </Typography>
            <Typography variant="body2">
              {Math.round((usageStats.used / usageStats.total) * 100)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={(usageStats.used / usageStats.total) * 100}
            sx={{ height: 8, borderRadius: 2 }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
          <Chip color="success" size="sm" label={`Available: ${completeCount}`} />
          <Chip color="warning" size="sm" label={`Beta: ${partialCount}`} />
          <Chip color="info" size="sm" label={`Coming Soon: ${plannedCount}`} />
        </Box>
      </Paper>
      
      {/* Display upgrade notice for creator tier */}
      {userTier === 'creator' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Upgrade to Influencer or Enterprise tier to access additional AI tools and increase your monthly token allowance.
        </Alert>
      )}
      
      {/* Tools grid */}
      <Grid container spacing={2}>
        {toolsWithUsage.map(tool => (
          <Grid item xs={12} sm={6} key={tool.id}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                display: 'flex', 
                flexDirection: 'column',
                height: '100%',
                position: 'relative',
                opacity: tool.status === 'planned' ? 0.7 : 1,
                cursor: tool.status !== 'planned' ? 'pointer' : 'default'
              }}
              onClick={() => tool.status !== 'planned' && handleToolClick(tool.id)}
            >
              <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                <Chip
                  size="sm"
                  label={StatusLabels[tool.status].label}
                  color={StatusLabels[tool.status].color as any}
                />
              </Box>
              
              <Typography variant="h6" sx={{ mb: 1 }}>{tool.name}</Typography>
              
              <Typography variant="body2" sx={{ mb: 2, flex: 1 }}>
                {tool.description}
              </Typography>
              
              {tool.status !== 'planned' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Used {tool.usageCount} time{tool.usageCount !== 1 ? 's' : ''} this month
                  </Typography>
                  
                  {tool.tier !== 'all' && tool.tier !== userTier && (
                    <Chip size="sm" label={`${tool.tier} tier`} color="secondary" />
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
} 
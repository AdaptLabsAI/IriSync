'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import SmartContentCreator from '../../../../../components/content/SmartContentCreator';
import { SocialAccount, PlatformType } from '../../../../../lib/features/platforms/client';

export default function SmartCreatorPage() {
  // Mock data for demo - in real app, this would come from context/API
  const mockAccounts: SocialAccount[] = [
    {
      id: '1',
      platformId: 'demo-twitter-id',
      platformType: PlatformType.TWITTER,
      name: 'Demo Twitter',
      username: '@demo',
      profileImage: '',
      isConnected: true,
      followerCount: 1000,
      metrics: {
        engagement: 3.5,
        growth: 2.1,
        reachPerPost: 500
      }
    }
  ];

  const handleSubmit = async (contentData: any) => {
    console.log('Content submitted:', contentData);
    // In real app, this would submit to your API
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Smart Content Creator
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create engaging social media content with AI assistance. Just describe your idea and let our AI generate optimized posts for your platforms.
          </Typography>
        </Box>

        {/* Smart Content Creator Component */}
        <SmartContentCreator 
          accounts={mockAccounts}
          onSubmit={handleSubmit}
        />
      </Box>
    </Container>
  );
} 
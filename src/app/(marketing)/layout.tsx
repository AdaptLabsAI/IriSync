import React from 'react';
import type { Metadata } from 'next';
import { Box, Container } from '@mui/material';
import Navbar from '@/components/ui/navigation/Navbar';
import Footer from '@/components/ui/navigation/Footer';

export const metadata: Metadata = {
  title: {
    template: '%s | IriSync',
    default: 'IriSync - AI-Powered Social Media Management',
  },
  description: 'Unified platform for social media content management with AI-powered tools',
  keywords: ['social media management', 'AI content', 'analytics', 'scheduling'],
  authors: [{ name: 'IriSync Team' }],
  openGraph: {
    title: 'IriSync - AI-Powered Social Media Management',
    description: 'Streamline your content, analyze engagement, and grow your audience.',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'IriSync',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IriSync',
    description: 'AI-Powered Social Media Management Platform',
    site: '@irisync',
    creator: '@irisync',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box 
      component="div"
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Navbar />
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </Box>
      
      {/* Footer */}
      <Footer />
    </Box>
  );
} 
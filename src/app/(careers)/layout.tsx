import React from 'react';
import type { Metadata } from 'next';
import { Box } from '@mui/material';
import { Inter } from 'next/font/google';
import Navbar from '@/components/ui/navigation/Navbar';
import Footer from '@/components/ui/navigation/Footer';

// Load Inter font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: '%s | IriSync Careers',
    default: 'Careers at IriSync - Join Our Team',
  },
  description: 'Explore career opportunities at IriSync and join our team of innovators.',
  keywords: ['careers', 'jobs', 'hiring', 'tech jobs', 'social media careers'],
  authors: [{ name: 'IriSync Team' }],
  openGraph: {
    title: 'Careers at IriSync - Join Our Team',
    description: 'Explore career opportunities at IriSync and join our team of innovators.',
    url: `${process.env.NEXT_PUBLIC_APP_URL}/careers`,
    siteName: 'IriSync Careers',
    locale: 'en_US',
    type: 'website',
  },
};

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box 
      component="div" 
      className={inter.className}
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